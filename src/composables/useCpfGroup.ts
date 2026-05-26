import type { BleCharacteristic } from '~/utils/BleCharacteristic'
import { CPF_UUID_TO_GROUP, type SettingsGroupKey } from '~/composables/useSettingsGroups'

/**
 * Collects CPF characteristics belonging to a settings group from the live
 * bluetoothStore.bleCharacteristics list. Returns a reactive list that
 * updates as characteristics arrive (CPF descriptors are read async).
 *
 * Calls .initialize() on each characteristic the first time it shows up so
 * formattedValue and presentationFormatDescriptor are populated. SettingsPanel
 * snapshots the initial value as soon as it's available for dirty tracking.
 */
export function useCpfGroup(group: SettingsGroupKey) {
  const bt = useBluetoothStore()
  const initialized = new WeakSet<BleCharacteristic>()

  const chars = computed<BleCharacteristic[]>(() => {
    return (bt.bleCharacteristics as BleCharacteristic[]).filter(
      ch => CPF_UUID_TO_GROUP[ch.characteristic.uuid] === group,
    )
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
        // Some characteristics don't expose CPF descriptors — they'll just
        // never become visible. Not a fatal error for the panel.
      }
    }
  }, { immediate: true })

  return chars
}
