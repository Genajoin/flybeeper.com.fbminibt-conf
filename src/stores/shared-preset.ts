import { defineStore } from 'pinia'
import type { SettingsLocal } from '~/stores/settings'
import { clampSettings } from '~/utils/setting-limits'

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
  /**
   * How many individual values `stage()` had to pull into the range the
   * firmware accepts, and which characteristics they belong to. Presets
   * written by the old configurator (and by a Mini, whose firmware never
   * validated the tone tables) routinely carry such values — negative
   * frequencies standing in for silence being the usual case.
   */
  adjusted?: number
  adjustedByUuid?: Record<string, number>
}

export const useSharedPresetStore = defineStore('sharedPresetStore', {
  state: () => ({
    pending: null as StagedPreset | null,
    exportName: '',
    exportBy: '',
  }),
  actions: {
    /**
     * Stage a preset for the import banner — the single funnel both entry
     * points (URL fragment and JSON file) go through, and therefore the right
     * place to make an out-of-range preset importable.
     *
     * Values the firmware would reject are pulled to the nearest accepted
     * value rather than dropped: an old file is usually the only copy of a
     * setup a pilot tuned over a season, and a single bad frequency point
     * would otherwise cost the whole tone table (the device resets all four
     * curves to factory when one value is out of range). The banner reports
     * the count so the change is never silent.
     */
    stage(preset: StagedPreset): void {
      const { settings, adjusted, byUuid } = clampSettings(preset.settings)
      this.pending = adjusted
        ? { ...preset, settings, adjusted, adjustedByUuid: byUuid }
        : preset
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
