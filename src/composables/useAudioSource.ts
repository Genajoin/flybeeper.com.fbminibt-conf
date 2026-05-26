import { useStorage } from '@vueuse/core'

/**
 * Where the live tone preview comes from (DECISIONS.md §★3).
 *
 * - `device`: ask the variometer to play (SendSimulationVarioValue). Audible only when connected.
 * - `browser`: play locally via Web Audio (useToneSynth). Works offline, instant feedback for curve editing.
 * - `off`: silent — slider is a numeric tweak only.
 *
 * Persisted in localStorage so the user's last choice survives reloads.
 */

export type AudioSource = 'device' | 'browser' | 'off'

const STORAGE_KEY = 'fb:audio-source-v1'

export function useAudioSource() {
  const source = useStorage<AudioSource>(STORAGE_KEY, 'device')
  return { source }
}
