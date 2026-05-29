import type { BleCharacteristic, LogEntry } from '~/utils/BleCharacteristic'
import { CPF_UUID_TO_GROUP, type SettingsGroupKey } from '~/composables/useSettingsGroups'
import { DEMO_SETTINGS, VIRTUAL_CPF_FORMAT } from '~/composables/useDemoSnapshot'

/**
 * Module-level cache of virtual chars by UUID. A page may remount or two
 * pages may consume the same UUID (curves <-> audio cross-binding); we must
 * return the same instance so SettingsPanel's dirty-check sees a stable
 * identity across renders.
 *
 * The virtual char ALWAYS owns the value (reads/writes settingsStore.local),
 * regardless of whether a device is connected. When a real BLE characteristic
 * for the same UUID exists (i.e. fw exposes it), we splice its CPF
 * presentation descriptor onto the virtual so widgets pick up the device's
 * actual format/exponent/unit instead of the static VIRTUAL_CPF_FORMAT
 * fallback. The real char is otherwise only used by writeCharacteristic()
 * in bluetoothStore for the actual GATT write on Apply.
 */
const virtualByUuid = new Map<string, BleCharacteristic>()

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
      // DEMO_SETTINGS keeps the UI alive for UUIDs that haven't been
      // touched yet (e.g. a CPF char the device never wrote to local
      // because applyDeviceSnapshot ran with local already populated).
      return settings.local?.[uuid] ?? DEMO_SETTINGS[uuid] ?? null
    },
    set formattedValue(v: unknown) {
      // Single source of truth: edits go to settings.local. The actual
      // GATT write happens later via bt.writeCharacteristic on Apply.
      if (!settings.local)
        settings.local = {}
      settings.local[uuid] = v as never
    },
    async getValue() { return null },
    async subscribeToNotifications() { /* virtual: no-op */ },
    async unsubscribeFromNotifications() { /* virtual: no-op */ },
    async setFormattedValue() { /* writes routed via bt.writeCharacteristic */ },
    async initialize() { /* presentationFormatDescriptor is preset */ },
    subscribe() { /* virtual: no-op */ },
    unsubscribe() { /* virtual: no-op */ },
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
 * Returns the virtual chars for `group`. Always virtual — they read/write
 * `settings.local` so the user's intent stays put across BLE connects.
 *
 * On a real device we still hide UUIDs the firmware doesn't expose (e.g.
 * fbfanetvario lacks hid_keyboard_off — showing it as an editable toggle
 * would be a lie). Offline we surface every UUID in the group so demo
 * mode + URL-share import are exercise-able without hardware.
 *
 * As a side effect, when a connected device exposes a real char, we copy
 * its `presentationFormatDescriptor` onto the cached virtual char so
 * widget format/exponent/unit reflect the actual firmware, not the
 * VIRTUAL_CPF_FORMAT fallback.
 */
export function useCpfGroup(group: SettingsGroupKey) {
  const bt = useBluetoothStore()

  const chars = computed<BleCharacteristic[]>(() => {
    const realByUuid = new Map(
      (bt.bleCharacteristics as BleCharacteristic[])
        .filter(ch => CPF_UUID_TO_GROUP[ch.characteristic.uuid] === group)
        .map(ch => [ch.characteristic.uuid, ch]),
    )

    // Did the device expose ANY CPF characteristic at all? If a connect
    // succeeded but zero CPF chars landed (e.g. iOS Bluefy returned an
    // incomplete service list), discovery failed — fall back to virtual
    // chars so the page isn't blank, exactly like offline.
    const anyCpfPresent = (bt.bleCharacteristics as BleCharacteristic[])
      .some(ch => CPF_UUID_TO_GROUP[ch.characteristic.uuid])

    // Connected: only UUIDs the firmware exports (real char present).
    // Connected but discovery failed (no CPF at all): every known UUID, as
    // virtual chars, so the user still sees + edits settings.
    // Offline / pre-pair: every UUID known for this group, so demo mode +
    // preset-import work without hardware.
    const surfaceUuids = bt.isConnected && anyCpfPresent
      ? Array.from(realByUuid.keys())
      : (UUIDS_BY_GROUP[group] ?? [])

    const out: BleCharacteristic[] = []
    for (const uuid of surfaceUuids) {
      const v = getOrCreateVirtualChar(uuid)
      if (!v)
        continue
      const real = realByUuid.get(uuid)
      if (real?.presentationFormatDescriptor)
        v.presentationFormatDescriptor = real.presentationFormatDescriptor
      out.push(v)
    }
    return out
  })

  return chars
}
