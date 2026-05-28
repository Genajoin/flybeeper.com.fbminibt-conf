import { defineStore } from 'pinia'
import log from 'loglevel'
import { BleCharacteristicImpl } from '~/utils/BleCharacteristic'
import { useSettingsStore } from '~/stores/settings'
import type { SettingsLocal } from '~/stores/settings'
import { useSavedDevicesStore } from '~/stores/saved-devices'
import { CPF_RESTART_REQUIRED_UUIDS } from '~/composables/useSettingsGroups'

interface BtCh {
  characteristic: object | null
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
     */
    bleAvailable: false,
    bleUnavailableReason: 'browser' as 'insecure' | 'browser' | null,
    device: null as BluetoothDevice,
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

    async connectToDevice(device) {
      if (!this.bleAvailable || this.isConnected || this.isConnecting)
        return

      this.errorMessage = ''
      this.fetchProgress = 0
      this.fetchTotal = 0
      this.isConnecting = true
      this.device = device
      this.devName = this.device.name
      const gen = ++this.connectGen
      log.info('Connecting to', this.devName)

      // Swap the settings slot to this device's own IDB-persisted state
      // BEFORE any CPF read happens. If we have a previous local for it,
      // it survives — otherwise applyDeviceSnapshot below will seed local
      // from what we read off the device.
      if (this.device.id)
        await useSettingsStore().loadSlot(this.device.id)

      try {
        const server = await this.device.gatt.connect()

        const services = await server.getPrimaryServices()
        this.isConnecting = false
        this.isFetching = true
        log.info('fetching')
        for (const service of services) {
          log.debug('SERVICE', service.uuid)
          const characteristics = await service.getCharacteristics()
          for (const ch of characteristics) {
            log.debug('characteristic', ch.uuid)
            const bleCharacteristic = new BleCharacteristicImpl(ch)
            this.bleCharacteristics.push(bleCharacteristic)
          }
        }

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
        const FSS = services.find(service => service.uuid === '904baf04-5814-11ee-8c99-0242ac120000')
        if (FSS) {
          const characteristics = await FSS.getCharacteristics()
          this.fss.miniBtSimulation.characteristic = characteristics.find(ch => ch.uuid === '904baf04-5814-11ee-8c99-0242ac120002')
        }

        this.device.addEventListener('gattserverdisconnected', this.onDisconnected)

        // Eager-initialize every FlyBeeper Settings Service characteristic so
        // panels render without lazy per-visit reads. Await the batch before
        // flipping isConnected so PairingWizard / cockpit watchers don't race
        // an empty bleCharacteristics list before CPF descriptors land.
        const FSS_UUID = '904baf04-5814-11ee-8c99-0242ac120000'
        const fssChars = this.bleCharacteristics.filter(c => c.characteristic.service.uuid === FSS_UUID)
        this.fetchTotal = fssChars.length
        await Promise.allSettled(
          fssChars.map(c => c.initialize().finally(() => {
            if (gen === this.connectGen)
              this.fetchProgress++
          })),
        )
        if (gen !== this.connectGen)
          return
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
        this.device = null as unknown as BluetoothDevice
        this.isConnected = false
      }
    },

    async connectToRequestDevice() {
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
    async disconnectDevice() {
      if (!this.isConnected || this.isDisconnecting)
        return

      for (const ch of this.bleCharacteristics)
        await ch.unsubscribeFromNotifications()

      try {
        this.isDisconnecting = true
        this.isConnected = false
        await this.device.gatt.disconnect()
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
      this.device = null as unknown as BluetoothDevice
      this.isConnecting = false
      this.isFetching = false
      this.isConnected = false
      this.fetchProgress = 0
      this.fetchTotal = 0
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
      // callbacks don't fire against a torn-down GATT.
      for (const ch of this.bleCharacteristics) {
        try {
          ch.unsubscribeFromNotifications()
        }
        catch { /* characteristic already invalid */ }
      }

      this.isConnected = false
      this.isDisconnecting = false
      this.device = null as unknown as BluetoothDevice
      this.dis.firmwareRevisionString = { characteristic: null, value: null }
      this.fss.miniBtSimulation = { characteristic: null, value: null }
      this.subscribedCharacteristics = []
      this.characteristicsData = {}
      this.bleCharacteristics = []

      useSettingsStore().restartPending = false
      // Swap back to demo slot so the panels (still mounted via virtual
      // chars) show a sane offline state instead of stale device data.
      void useSettingsStore().loadSlot('__demo__')
    },

    /**
     * Writes a single FSS characteristic. Convenience wrapper used by URL-share
     * preset import: given a UUID and a formatted value, find the char, set the
     * value through its codec, and (if a restart-required UUID) flag the banner.
     */
    async writeCharacteristic(uuid: string, value: unknown): Promise<void> {
      const ch = this.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
      if (!ch)
        return
      ch.formattedValue = value
      await ch.setFormattedValue()
      if (CPF_RESTART_REQUIRED_UUIDS.includes(uuid))
        useSettingsStore().restartPending = true
    },

    async SendSimulationVarioValue(value) {
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
