import type { BleCharacteristic, LogEntry } from '~/utils/BleCharacteristic'
import { CPF_UUID_TO_GROUP, type SettingsGroupKey } from '~/composables/useSettingsGroups'
import { DEMO_SETTINGS, VIRTUAL_CPF_FORMAT } from '~/composables/useDemoSnapshot'

/**
 * Module-level cache of virtual chars by UUID. A page may re-mount or two
 * pages may consume the same UUID (curves <-> audio cross-binding); we must
 * return the same instance so SettingsPanel's cpfInitial snapshot tracks
 * dirty state across renders.
 */
const virtualByUuid = new Map<string, BleCharacteristic>()

/** Build a virtual BleCharacteristic backed by settingsStore.local[uuid]. */
function createVirtualChar(uuid: string): BleCharacteristic | null {
  const fmt = VIRTUAL_CPF_FORMAT[uuid]
  if (!fmt)
    return null
  const settings = useSettingsStore()
  const ch: BleCharacteristic = {
    characteristic: { uuid } as BluetoothRemoteGATTCharacteristic,
    descriptors: [],
    value: null,
    userFormatDescriptor: null,
    isBlockNotify: false,
    isNotified: false,
    isInitialized: true,
    entryArray: [] as LogEntry[],
    presentationFormatDescriptor: {
      format: fmt.format,
      exponent: fmt.exponent,
      unit: fmt.unit ?? '',
      namespace: 1,
    },
    get formattedValue() {
      // Three-tier fallback: live local value → DEMO snapshot → null.
      // Without the demo fallback, a UUID missing from settings.local (e.g.
      // after disconnect when local was never seeded for that key, or for a
      // CPF char the device never exposed) renders an empty widget and
      // cpfReady on /curves stays false. DEMO_SETTINGS keeps the UI alive.
      return settings.local?.[uuid] ?? DEMO_SETTINGS[uuid] ?? null
    },
    set formattedValue(v: unknown) {
      if (!settings.local)
        settings.local = {}
      settings.local[uuid] = v as never
    },
    async getValue() { return null },
    async subscribeToNotifications() { /* offline no-op */ },
    async unsubscribeFromNotifications() { /* offline no-op */ },
    async setFormattedValue() { /* offline no-op */ },
    async initialize() { /* presentationFormatDescriptor is preset */ },
    subscribe() { /* offline no-op */ },
    unsubscribe() { /* offline no-op */ },
  }
  return ch
}

function getOrCreateVirtualChar(uuid: string): BleCharacteristic | null {
  let ch = virtualByUuid.get(uuid)
  if (!ch) {
    const created = createVirtualChar(uuid)
    if (!created)
      return null
    virtualByUuid.set(uuid, created)
    ch = created
  }
  return ch
}

const UUIDS_BY_GROUP: Record<SettingsGroupKey, string[]> = (() => {
  const acc: Record<string, string[]> = {}
  for (const [uuid, group] of Object.entries(CPF_UUID_TO_GROUP))
    (acc[group] ||= []).push(uuid)
  return acc as Record<SettingsGroupKey, string[]>
})()

/**
 * Collects CPF characteristics belonging to a settings group. When a real
 * BleCharacteristic is present (live connection), it's used directly. When
 * absent (offline / pre-pair / unsupported browser), a memoised virtual char
 * backed by settingsStore.local[uuid] takes its place so SettingsPanel,
 * TheSetting, and CurveEditor work identically in demo mode.
 *
 * Real chars get .initialize() called once to populate CPF descriptors.
 * Virtual chars are pre-initialised (their descriptors come from
 * VIRTUAL_CPF_FORMAT).
 */
export function useCpfGroup(group: SettingsGroupKey) {
  const bt = useBluetoothStore()
  const initialized = new WeakSet<BleCharacteristic>()

  const chars = computed<BleCharacteristic[]>(() => {
    const real = (bt.bleCharacteristics as BleCharacteristic[]).filter(
      ch => CPF_UUID_TO_GROUP[ch.characteristic.uuid] === group,
    )
    // On a real device, surface ONLY the characteristics the firmware
    // actually exports. Padding with virtual chars from VIRTUAL_CPF_FORMAT
    // would inject settings the hardware doesn't support (e.g. fbfanetvario
    // has no hid_keyboard_off / led_blinky_by_vario — the UI must hide them,
    // not show greyed-out toggles).
    //
    // Demo mode (offline AND not in the middle of a connect/fetch) is the
    // only case we backfill virtual chars so the configurator stays usable
    // without hardware.
    if (bt.isConnected || bt.isConnecting || bt.isFetching)
      return real

    const realUuids = new Set(real.map(c => c.characteristic.uuid))
    const virtual: BleCharacteristic[] = []
    for (const uuid of UUIDS_BY_GROUP[group] ?? []) {
      if (realUuids.has(uuid))
        continue
      const v = getOrCreateVirtualChar(uuid)
      if (v)
        virtual.push(v)
    }
    return [...real, ...virtual]
  })

  watch(chars, async (list) => {
    for (const ch of list) {
      if (initialized.has(ch))
        continue
      try {
        await ch.initialize()
        initialized.add(ch)
      }
      catch {
        // CPF descriptors absent on this characteristic — it just stays hidden.
      }
    }
  }, { immediate: true })

  return chars
}
