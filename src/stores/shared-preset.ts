import { defineStore } from 'pinia'
import type { SettingsLocal } from '~/stores/settings'

/**
 * Staged URL-fragment preset import (Phase G).
 *
 * The app reads `window.location.hash` on boot. If it matches `#preset=…`,
 * the codec decodes it and stashes the result here. PresetImportBanner
 * watches `pending` and surfaces an Apply / Discard prompt.
 */

export interface StagedPreset {
  name: string
  bytes: number
  settings: SettingsLocal
}

export const useSharedPresetStore = defineStore('sharedPresetStore', {
  state: () => ({
    pending: null as StagedPreset | null,
    exportName: '',
    exportBy: '',
  }),
  actions: {
    stage(preset: StagedPreset): void {
      this.pending = preset
    },
    clear(): void {
      this.pending = null
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#preset=')) {
        // strip the fragment so a refresh doesn't re-import
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      }
    },
  },
})

export default useSharedPresetStore
