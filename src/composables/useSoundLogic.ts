import { computed } from 'vue'
import { compareFwVersions } from '~/utils/firmwareVersion'

/** First firmware with the climb / sink holds and hyst = 0 switching the early exit off. */
export const SOUND_HOLDS_FW = '0.30.0'

/**
 * Which sound logic the connected device runs. Before 0.30.0 the firmware
 * ignores Climb OFF / Sink OFF and replaces an early exit of 0 with 0.25;
 * the simulator then plays what that device would, and the Sound page says
 * why. Without a device (or with an unknown version) it is the current logic.
 */
export function useSoundLogic() {
  const bt = useBluetoothStore()
  const fw = useFirmwareUpdate()
  const legacy = computed(() => Boolean(bt.isConnected && fw.current.value
    && compareFwVersions(fw.current.value, SOUND_HOLDS_FW) < 0))
  return { legacy, current: fw.current, updatePath: fw.updatePath }
}
