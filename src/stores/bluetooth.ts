import { defineStore } from 'pinia'
import log from 'loglevel'
import { SMP_CHARACTERISTIC_UUID, SMP_SERVICE_UUID } from '~/lib/smp'
import { BleCharacteristicImpl, normalizeUuid } from '~/utils/BleCharacteristic'
import { useSettingsStore } from '~/stores/settings'
import type { SettingsLocal } from '~/stores/settings'
import { useSavedDevicesStore } from '~/stores/saved-devices'
import { CPF_RESTART_REQUIRED_UUIDS } from '~/composables/useSettingsGroups'

// Upper bound on a single gatt.connect(). The chooser-less reconnect /
// auto-connect paths can target a device that is powered off or out of range —
// there gatt.connect() would otherwise hang forever. This turns that into a
// clean, surfaced failure instead of a stuck spinner.
//
// A minute, not the 12 s this used to be: some of our devices advertise slowly
// (long advertising interval, weak link, a busy Android stack that queues the
// connection behind a scan), and on those the connect legitimately takes tens
// of seconds. The old bound cut them off before they ever had a chance and
// reported a timeout for a device that was right there.
const CONNECT_TIMEOUT_MS = 60_000

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise
      .then((v) => {
        clearTimeout(timer)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}

interface BtCh {
  characteristic: BluetoothRemoteGATTCharacteristic | null
  value: number | string | null
}

interface iDIS {
  modelNumberString: BtCh
  manufacturerNameString: BtCh
  firmwareRevisionString: BtCh
}

export const useBluetoothStore = defineStore('bluetoothStore', {
  state: () => ({
    /**
     * SSR-safe defaults: assume Web Bluetooth is unavailable. The state
     * factory must NOT touch globals like `navigator` here — `navigator`
     * is undefined under Node < 21, so `'bluetooth' in navigator` throws
     * a ReferenceError at vite-ssg prerender time. A throw out of the
     * factory leaves the store with partial/empty state — `bt.dis`
     * becomes undefined and any computed that reads it (e.g.
     * pages/settings.vue's `needsFirmwareUpdate`) crashes the SSR pass.
     *
     * The real detection runs client-side in `detectBleAvailability()`
     * (called from `modules/pinia.ts` right after pinia hydrates from
     * the SSR snapshot), where the live navigator + window.isSecureContext
     * are both available. See the action below for what 'insecure' /
     * 'browser' / null mean.
     *
     * The default reason is 'unknown', NOT 'browser': the prerender has not
     * looked at any navigator, so it must not accuse the visitor's browser of
     * anything. On 2026-08-18 a poisoned edge cache stopped a route chunk from
     * loading, hydration never ran, and the frozen snapshot told every visitor
     * "Web Bluetooth not available" on a browser that supports it perfectly —
     * a wrong diagnosis is worse than none. Views branch on `bleBlocked`, so
     * 'unknown' renders the normal UI and only a real detection can say no.
     */
    bleAvailable: false,
    bleUnavailableReason: 'unknown' as 'insecure' | 'browser' | 'unknown' | null,
    device: null as BluetoothDevice | null,
    isConnected: false,
    isConnecting: false,
    isFetching: false,
    /**
     * Progress of the eager FSS initialize() pass. Used by PairingWizard /
     * cockpit / terminal to surface "FETCHING 4 / 12" while the user waits.
     * Reset to 0 / 0 before each connect attempt.
     */
    fetchProgress: 0,
    fetchTotal: 0,
    isDisconnecting: false,
    isSubscribed: false,
    /**
     * A firmware flash is in flight on this connection. The device reboots as
     * the last step, so the disconnect it produces is expected — banners that
     * normally shout "you lost the device" stay quiet while this is true.
     */
    isFlashing: false,
    /**
     * True once this session has reached a successful connect. Used by
     * DisconnectBanner to distinguish "you just lost the device" from
     * "cold start with hydrated local settings".
     */
    hasConnectedThisSession: false,
    /**
     * Monotonic counter incremented on every connectToDevice call. The eager
     * initialize() batch captures the value at start; when its .finally() runs,
     * it bails if connectGen has moved on — that means cancelConnect or another
     * connect has superseded this attempt, so orphan completions must not
     * mutate isFetching / fetchProgress for the live attempt.
     */
    connectGen: 0,
    devName: '',
    /**
     * FSS characteristics that never produced a usable value this session
     * (no CPF and/or no successful read after retries). Settings for these
     * cannot be trusted or written — surfaced so the UI can say so instead
     * of pretending everything is in sync.
     */
    incompleteChars: [] as string[],
    errorMessage: '',
    characteristicsData: {},
    subscribedCharacteristics: [],
    bleCharacteristics: [] as BleCharacteristicImpl[],

    dis: {
      modelNumberString: { characteristic: null, value: null },
      manufacturerNameString: { characteristic: null, value: null },
      firmwareRevisionString: { characteristic: null, value: null },
    } as iDIS,
    fss: {
      miniBtSimulation: { characteristic: null, value: null } as BtCh,
    },
  }),
  getters: {
    /**
     * True only when detection actually ran and came back negative. Guards
     * every "your browser can't do BLE" message, so the prerendered snapshot
     * ('unknown') never shows one. `bleAvailable` alone can't express this —
     * it is false both for "no BLE" and for "not checked yet".
     */
    bleBlocked: (state): boolean =>
      state.bleUnavailableReason === 'browser' || state.bleUnavailableReason === 'insecure',
  },

  actions: {
    /**
     * Re-evaluate Web Bluetooth availability against the live `navigator`
     * and `window`. Required because vite-ssg prerenders every route with
     * no `navigator` / `window` — the SSR snapshot therefore always says
     * `bleAvailable: false, bleUnavailableReason: 'browser'`, and pinia
     * restores that snapshot on the client before the state factory ever
     * runs against the real browser. Call this exactly once at app boot
     * (right after pinia state hydration) so PairingWizard branches on the
     * actual capabilities of the user's browser.
     */
    detectBleAvailability() {
      if (typeof navigator === 'undefined')
        return
      this.bleAvailable = 'bluetooth' in navigator
      this.bleUnavailableReason = this.bleAvailable
        ? null
        : typeof window !== 'undefined' && window.isSecureContext === false
          ? 'insecure'
          : 'browser'
    },

    async toggleConnectionBT() {
      if (this.isConnected && !this.isDisconnecting)
        await this.disconnectDevice()
      else if (!this.isConnected || this.isDisconnecting)
        await this.connectToRequestDevice()
    },

    async connectToDevice(device: BluetoothDevice) {
      if (!this.bleAvailable || this.isConnected || this.isConnecting)
        return

      this.errorMessage = ''
      this.fetchProgress = 0
      this.fetchTotal = 0
      this.incompleteChars = []
      this.isConnecting = true
      this.device = device
      this.devName = device.name ?? ''
      const gen = ++this.connectGen
      log.info('Connecting to', this.devName)

      // Swap the settings slot to this device's own IDB-persisted state
      // BEFORE any CPF read happens. If we have a previous local for it,
      // it survives — otherwise applyDeviceSnapshot below will seed local
      // from what we read off the device.
      if (device.id)
        await useSettingsStore().loadSlot(device.id)

      if (!device.gatt) {
        this.isConnecting = false
        this.errorMessage = 'This device exposes no GATT server'
        return
      }

      try {
        const server = await withTimeout(
          device.gatt.connect(),
          CONNECT_TIMEOUT_MS,
          'Connection timed out — is the device powered on and in range?',
        )

        const FSS_UUID = '904baf04-5814-11ee-8c99-0242ac120000'

        // Service discovery. Desktop Chrome returns everything from the bulk
        // getPrimaryServices(); iOS WebBluetooth shims (Bluefy / WebBLE) often
        // return an incomplete or empty list right after pairing, so we ALSO
        // resolve each known service directly via getPrimaryService(uuid) — the
        // path those shims reliably support — and union the two results, with a
        // few short retries while CoreBluetooth's GATT discovery settles.
        const KNOWN_SERVICE_UUIDS = [
          '0000180a-0000-1000-8000-00805f9b34fb', // device_information
          '0000181a-0000-1000-8000-00805f9b34fb', // environmental_sensing
          '0000180f-0000-1000-8000-00805f9b34fb', // battery_service
          '00001819-0000-1000-8000-00805f9b34fb', // location_and_navigation
          '00001815-0000-1000-8000-00805f9b34fb', // automation_io
          FSS_UUID, // FlyBeeper Settings Service
        ]
        // Key by NORMALIZED uuid: iOS shims return short/uppercase UUIDs, so
        // raw keys would never match KNOWN_SERVICE_UUIDS (all lowercase 128-bit)
        // — the retry loop would spin and the FSS lookup below would miss.
        const servicesByUuid = new Map<string, BluetoothRemoteGATTService>()
        try {
          for (const s of await server.getPrimaryServices())
            servicesByUuid.set(normalizeUuid(s.uuid), s)
        }
        catch (e) {
          log.warn('getPrimaryServices() failed — falling back to per-service lookup', e)
        }
        for (let attempt = 0; attempt < 4; attempt++) {
          const missing = KNOWN_SERVICE_UUIDS.filter(u => !servicesByUuid.has(u))
          if (!missing.length)
            break
          for (const uuid of missing) {
            try {
              const svc = await server.getPrimaryService(uuid)
              if (svc)
                servicesByUuid.set(normalizeUuid(svc.uuid), svc)
            }
            catch { /* absent on this device, or not yet discoverable */ }
          }
          if (KNOWN_SERVICE_UUIDS.every(u => servicesByUuid.has(u)))
            break
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        const services = [...servicesByUuid.values()]

        this.isConnecting = false
        this.isFetching = true
        log.info('fetching')
        for (const service of services) {
          log.debug('SERVICE', service.uuid)
          let characteristics: BluetoothRemoteGATTCharacteristic[] = []
          try {
            characteristics = await service.getCharacteristics()
          }
          catch (e) {
            log.warn('getCharacteristics() failed for', service.uuid, e)
            continue
          }
          for (const ch of characteristics) {
            log.debug('characteristic', ch.uuid)
            const bleCharacteristic = new BleCharacteristicImpl(ch)
            this.bleCharacteristics.push(bleCharacteristic)
          }
        }

        log.info(`discovered ${services.length} services / ${this.bleCharacteristics.length} characteristics`)
        if (!servicesByUuid.has(FSS_UUID))
          log.warn('FSS not discovered — settings fall back to virtual chars')

        this.bleCharacteristics.filter(c => c.characteristic.service.uuid === '0000180a-0000-1000-8000-00805f9b34fb')
          .forEach(ch => ch.presentationFormatDescriptor = { format: 0x19, exponent: 0, unit: '', namespace: 1 })

        // Device Information Service
        const fwRev = this.bleCharacteristics.find(ch => ch.characteristic.uuid === '00002a26-0000-1000-8000-00805f9b34fb')
        if (fwRev)
          this.dis.firmwareRevisionString.value = await fwRev.getFormattedValue()

        const modNum = this.bleCharacteristics.find(ch => ch.characteristic.uuid === '00002a24-0000-1000-8000-00805f9b34fb')
        if (modNum)
          this.dis.modelNumberString.value = await modNum.getFormattedValue()

        const manName = this.bleCharacteristics.find(ch => ch.characteristic.uuid === '00002a29-0000-1000-8000-00805f9b34fb')
        if (manName)
          this.dis.manufacturerNameString.value = await manName.getFormattedValue()

        // FlyBeeper Settings Service — pin the simulation characteristic so
        // useSimulation() can write to it without re-scanning every time.
        const FSS = servicesByUuid.get(FSS_UUID)
        if (FSS) {
          const characteristics = await FSS.getCharacteristics()
          this.fss.miniBtSimulation.characteristic = characteristics.find(ch => normalizeUuid(ch.uuid) === '904baf04-5814-11ee-8c99-0242ac120002') ?? null
        }

        this.device.addEventListener('gattserverdisconnected', this.onDisconnected)

        // Eager-initialize every FlyBeeper Settings Service characteristic so
        // panels render without lazy per-visit reads. Await the batch before
        // flipping isConnected so PairingWizard / cockpit watchers don't race
        // an empty bleCharacteristics list before CPF descriptors land.
        const fssChars = this.bleCharacteristics.filter(c => c.characteristic.service.uuid === FSS_UUID)
        this.fetchTotal = fssChars.length
        // Every GATT call inside initialize() goes through the shared
        // gattQueue, so these run one at a time even though they are started
        // together — a BLE central can only have one request outstanding, and
        // firing ~80 of them at once is what left Android with characteristics
        // that had no CPF and no value (holes in the device snapshot → Apply
        // silently skipped those fields).
        await Promise.allSettled(
          fssChars.map(c => c.initialize().finally(() => {
            if (gen === this.connectGen)
              this.fetchProgress++
          })),
        )
        if (gen !== this.connectGen)
          return

        // Second and third chances for whatever came back incomplete. A
        // characteristic that never yields a value would otherwise stay
        // un-writable for the whole session.
        for (let round = 0; round < 2; round++) {
          const incomplete = fssChars.filter(c => !c.isInitialized)
          if (!incomplete.length)
            break
          log.warn(`retrying ${incomplete.length} incomplete characteristic(s), round ${round + 1}`)
          await new Promise(resolve => setTimeout(resolve, 250))
          for (const c of incomplete)
            await c.initialize().catch(err => log.warn('retry failed', c.characteristic.uuid, err))
          if (gen !== this.connectGen)
            return
        }
        this.incompleteChars = fssChars
          .filter(c => !c.isInitialized)
          .map(c => c.characteristic.uuid)
        if (this.incompleteChars.length)
          log.error('characteristics without a device value:', this.incompleteChars)
        this.isFetching = false
        this.isConnected = true
        // After isConnected, so DisconnectBanner's `hasConnectedThisSession
        // && !isConnected` predicate cannot be true while the FSS fetch is
        // still in flight — otherwise the banner pops on a successful
        // connect during the (multi-second) initial CPF batch.
        this.hasConnectedThisSession = true

        // Build a snapshot of what the device currently has and hand it to
        // the settings store. applyDeviceSnapshot writes it into
        // lastDeviceSnapshot (always) and into local (only if local was
        // empty — preserves any pending preset / offline edits). The
        // settings panel then renders local + lights Apply when it
        // differs.
        const deviceSnap: SettingsLocal = {}
        for (const ch of fssChars) {
          const v = ch.formattedValue
          if (v !== null && v !== undefined)
            deviceSnap[ch.characteristic.uuid] = JSON.parse(JSON.stringify(v))
        }
        useSettingsStore().applyDeviceSnapshot(deviceSnap)

        if (this.device.id && this.device.name) {
          useSavedDevicesStore().remember({
            id: this.device.id,
            name: this.device.name,
            firmware: (this.dis.firmwareRevisionString.value as string | null) ?? null,
          })
        }
      }
      catch (error) {
        log.error('Error during device connect:', error)
        this.errorMessage = error instanceof Error ? error.message : String(error)
        this.connectGen++
        this.isConnecting = false
        this.isFetching = false
        try {
          this.device?.gatt?.disconnect()
        }
        catch { /* device already gone */ }
        this.bleCharacteristics = []
        this.device = null
        this.isConnected = false
      }
    },

    async connectToRequestDevice() {
      // Reached the button before/without hydration running detection? Check
      // now rather than bailing silently — a no-op click is the hardest kind
      // of bug to report.
      if (this.bleUnavailableReason === 'unknown')
        this.detectBleAvailability()
      if (!this.bleAvailable || this.isConnected || this.isConnecting)
        return
      this.errorMessage = ''

      navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'FB' }],
        optionalServices: [
          'location_and_navigation',
          'environmental_sensing',
          'battery_service',
          'device_information',
          'automation_io',
          '904baf04-5814-11ee-8c99-0242ac120000',
          // SMP (MCUmgr) — firmware update over the same connection. It must be
          // listed HERE, at pairing time: Chrome scopes GATT access to the
          // services granted by requestDevice, and a device paired before this
          // line existed will refuse getPrimaryService(SMP) until re-picked.
          SMP_SERVICE_UUID,
        ],
      })
        .then(device => this.connectToDevice(device))
        .catch((error) => {
          if (error && (error as DOMException).name === 'NotFoundError') {
            log.debug('Device chooser dismissed by user')
            this.isConnecting = false
            this.isFetching = false
            return
          }
          log.error('Error connecting to the device:', error)
          this.errorMessage = error instanceof Error ? error.message : String(error)
          this.isConnecting = false
          this.isFetching = false
        })
    },

    /**
     * Direct, chooser-less reconnect to a device the origin was already
     * granted access to. Web Bluetooth's `getDevices()` lists those permitted
     * devices without a picker (and without scanning, so no Android location
     * prompt); we match the saved registry's `id` against them and connect
     * straight through `connectToDevice`.
     *
     * Falls back to the standard picker (`connectToRequestDevice`) when:
     *  - the browser lacks `getDevices` (iOS Bluefy / older shims), or
     *  - the device is no longer in the permission list (revoked, cleared
     *    site data, a different browser profile).
     *
     * This is what makes the "Reconnect" button honest: it targets THIS
     * device, and only surfaces a picker when a direct reconnect is genuinely
     * impossible.
     */
    async connectToSavedDevice(savedId: string) {
      if (!this.bleAvailable || this.isConnected || this.isConnecting)
        return
      this.errorMessage = ''

      if (typeof navigator.bluetooth?.getDevices !== 'function') {
        log.info('getDevices() unsupported — falling back to picker')
        return this.connectToRequestDevice()
      }

      let match: BluetoothDevice | undefined
      try {
        const devices = await navigator.bluetooth.getDevices()
        match = devices.find(d => d.id === savedId)
      }
      catch (error) {
        log.warn('getDevices() failed — falling back to picker', error)
        return this.connectToRequestDevice()
      }

      if (!match) {
        log.info('saved device not in permission list — falling back to picker')
        return this.connectToRequestDevice()
      }

      log.info('direct reconnect to', match.name)
      await this.connectToDevice(match)
    },

    async disconnectDevice() {
      if (!this.isConnected || this.isDisconnecting)
        return

      for (const ch of this.bleCharacteristics)
        await ch.unsubscribeFromNotifications()

      try {
        this.isDisconnecting = true
        this.isConnected = false
        this.device?.gatt?.disconnect()
      }
      catch (error) {
        log.error('Error disconnecting from the device:', error)
      }
      this.isDisconnecting = false
    },

    /**
     * Abort an in-flight connect/fetch. The Chrome device-picker dialog
     * itself can't be dismissed programmatically (user has to hit X), but
     * once gatt.connect has returned we can tear down the link, clear flags,
     * and let the UI revert to demo mode.
     */
    async cancelConnect() {
      if (!this.isConnecting && !this.isFetching)
        return
      // Bump the generation so any in-flight initialize().finally() from the
      // attempt we're aborting won't increment fetchProgress / flip flags on
      // top of the next connectToDevice attempt.
      this.connectGen++
      try {
        this.device?.gatt?.disconnect()
      }
      catch { /* device already gone or never paired */ }
      this.bleCharacteristics = []
      this.device = null
      this.isConnecting = false
      this.isFetching = false
      this.isConnected = false
      this.fetchProgress = 0
      this.fetchTotal = 0
      this.incompleteChars = []
      void useSettingsStore().loadSlot('__demo__')
    },
    onDisconnected() {
      // Detach BEFORE we null out this.device — otherwise the same listener
      // accumulates per reconnect cycle (browser caches BluetoothDevice across
      // getDevices()/requestDevice()), and a single RF blip later fires
      // onDisconnected N times.
      try {
        this.device?.removeEventListener?.('gattserverdisconnected', this.onDisconnected)
      }
      catch { /* device already gone */ }

      // Best-effort unsubscribe so the BleCharacteristicImpl notification
      // callbacks don't fire against a torn-down GATT. The call is async —
      // wrap each invocation in .catch() so a rejected promise doesn't
      // escape (the try/catch around the synchronous call site is useless
      // for that). The implementation already guards against a torn-down
      // GATT, this is the belt to its braces.
      for (const ch of this.bleCharacteristics)
        ch.unsubscribeFromNotifications().catch(() => { /* link gone */ })

      this.isConnected = false
      this.isDisconnecting = false
      this.device = null
      this.dis.firmwareRevisionString = { characteristic: null, value: null }
      this.fss.miniBtSimulation = { characteristic: null, value: null }
      this.subscribedCharacteristics = []
      this.characteristicsData = {}
      this.bleCharacteristics = []
      this.incompleteChars = []

      useSettingsStore().restartPending = false
      // Swap back to demo slot so the panels (still mounted via virtual
      // chars) show a sane offline state instead of stale device data.
      void useSettingsStore().loadSlot('__demo__')
    },

    /**
     * Resolve the SMP (MCUmgr) characteristic on the LIVE connection.
     *
     * Deliberately not part of the connect-time discovery: the SMP service has
     * no CPF descriptors and nothing to show in the settings / terminal UI, so
     * wrapping it in a BleCharacteristicImpl would only pollute those lists.
     * Firmware flashing resolves it on demand and reuses the open link — the
     * device accepts a single connection and plays a melody on every connect,
     * so opening a second one just to flash is both impossible and rude.
     */
    async getSmpCharacteristic(): Promise<BluetoothRemoteGATTCharacteristic> {
      const gatt = this.device?.gatt
      if (!this.isConnected || !gatt?.connected)
        throw new Error('Device is not connected')
      const service = await gatt.getPrimaryService(SMP_SERVICE_UUID)
      return await service.getCharacteristic(SMP_CHARACTERISTIC_UUID)
    },

    /**
     * Writes a single FSS characteristic and confirms it landed on the device.
     *
     * THROWS on every failure — missing characteristic, un-encodable value,
     * rejected or unverified write. Callers must not report success unless
     * this resolves: the previous silent `return` for an unknown UUID (and
     * setFormattedValue's silent no-op) is what let the configurator claim
     * "applied" while the device kept its old settings.
     */
    async writeCharacteristic(uuid: string, value: unknown): Promise<void> {
      const ch = this.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
      if (!ch)
        throw new Error(`${uuid}: characteristic not present on this device`)
      const previous = ch.formattedValue
      ch.formattedValue = value
      try {
        await ch.setFormattedValue()
      }
      catch (err) {
        // Keep the in-memory char honest: it must reflect the device, not the
        // value we failed to write.
        if (ch.formattedValue === value)
          ch.formattedValue = previous
        throw err
      }
      if (CPF_RESTART_REQUIRED_UUIDS.includes(uuid))
        useSettingsStore().restartPending = true
    },

    async SendSimulationVarioValue(value: number) {
      if (!this.fss.miniBtSimulation.characteristic)
        return

      const buffer = new ArrayBuffer(2)
      const view = new DataView(buffer)
      view.setInt16(0, value, true)
      this.fss.miniBtSimulation.characteristic.writeValue(buffer)
    },
  },
})

export default useBluetoothStore
