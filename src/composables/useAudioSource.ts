import { useStorage } from '@vueuse/core'
import { useBluetoothStore } from '~/stores/bluetooth'

/**
 * Where the live tone preview comes from (DECISIONS.md §★3).
 *
 * - `device`: ask the variometer to play (SendSimulationVarioValue). Audible only when connected.
 * - `browser`: play locally via Web Audio (useToneSynth). Works offline, instant feedback for curve editing.
 * - `off`: silent — slider is a numeric tweak only.
 *
 * Persisted in localStorage so the user's last choice survives reloads. A
 * remembered `device` only counts while a device is connected: without one the
 * preview plays in the browser, so a link opened on a phone with no vario (an
 * article, a shared preset) is never silent. The choice comes back by itself
 * once the device connects.
 */

export type AudioSource = 'device' | 'browser' | 'off'

const STORAGE_KEY = 'fb:audio-source-v1'

export function useAudioSource() {
  // Default to `browser`: works offline, gives instant feedback for curve
  // editing, and avoids surprising the user with silence if they happen to
  // open the page before pairing. If they explicitly switch to `device` it
  // gets persisted and survives reloads.
  const stored = useStorage<AudioSource>(STORAGE_KEY, 'browser')
  const bt = useBluetoothStore()
  const deviceAvailable = computed(() => bt.isConnected)
  const source = computed<AudioSource>({
    get: () => (stored.value === 'device' && !deviceAvailable.value ? 'browser' : stored.value),
    set: (v) => {
      stored.value = v
    },
  })
  return { source, deviceAvailable }
}
