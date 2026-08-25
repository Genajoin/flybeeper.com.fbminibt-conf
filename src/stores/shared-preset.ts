import { defineStore } from 'pinia'
import type { SettingsLocal } from '~/stores/settings'

/**
 * Staged preset import (Phase G).
 *
 * Two entry points feed the same staging slot:
 * - the app reads `window.location.hash` on boot and decodes `#preset=…`;
 * - the JSON import button parses a picked file (`utils/preset-import`).
 *
 * PresetImportBanner watches `pending` and surfaces an Apply / Discard prompt
 * either way, so a preset is never applied without the user seeing it first.
 */

export interface StagedPreset {
  name: string
  bytes: number
  settings: SettingsLocal
  /**
   * Where the staged preset came from. `url` is the `#preset=` fragment;
   * `file` is a JSON picked through the import button. The banner labels
   * the two differently, and only the URL case has a fragment to strip.
   */
  source?: 'url' | 'file'
  /** File imports only: which of the three known shapes was recognised. */
  format?: string
  /** File imports only: entries parsed but not importable. */
  skipped?: number
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
