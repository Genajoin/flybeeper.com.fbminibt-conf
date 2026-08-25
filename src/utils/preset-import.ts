import type { SettingsLocal } from '~/stores/settings'
import { CPF_UUID_TO_GROUP } from '~/composables/useSettingsGroups'

/**
 * Preset **file** importer — the read side of `useSharePreset().downloadJson()`.
 *
 * Three shapes are accepted, because three of them exist in the wild:
 *
 * 1. `v2` — what this app exports today:
 *      `{ name, by, settings: { "<uuid>": value } }`
 *    A bare bag (`{ "<uuid>": value }`) is accepted too, for hand-edited files.
 *
 * 2. `cpf-list` — the v1 configurator, firmware ≥0.15 path
 *    (`CharacteristicForm15.vue > downloadJson`):
 *      `[{ uuid, name, value }, …]`
 *    Values are CPF-formatted, so scalars line up with `SettingsLocal` as-is.
 *    Two entries in files found in the field do not, and are repaired by
 *    `repairCpfValue()` — see its comment. Real-world files also carry junk
 *    entries for the Generic Attribute services
 *    (`00000001-0000-1000-8000-00805f9b34fb` with `value: {}`); they are
 *    dropped by the UUID whitelist below.
 *
 * 3. `legacy-struct` — the v1 configurator, firmware ≤0.15 path
 *    (`CharacteristicForm.vue > downloadJson`): a dump of `iFbMiniBtSettings`
 *    keyed by field name, with the four curves nested under `curves`.
 *    Raw struct values throughout: the four thresholds are Int16 cm/s where
 *    the CPF UI wants m/s (exponent -2), so they are divided by 100. The
 *    curves are NOT touched — format 0x1B bypasses the CPF exponent, so
 *    `SettingsLocal` stores vario breakpoints as raw cm/s too, and the write
 *    path (`BleCharacteristic.convertFormattedValueToDataView`) pushes them
 *    to the wire with a bare `setInt16`.
 *
 * Unknown keys are dropped rather than fatal: an old file is expected to be
 * a partial match, and a single unrecognised entry must not lose the rest.
 */

export type PresetFileFormat = 'v2' | 'cpf-list' | 'legacy-struct'

export interface ImportedPreset {
  name: string
  by: string
  settings: SettingsLocal
  format: PresetFileFormat
  /** Entries that were parsed but not imported (unknown UUID, junk, bad value). */
  skipped: number
  /** Byte size of the source file, for the import banner's stats line. */
  bytes: number
}

/** `iFbMiniBtSettings` field name → CPF characteristic UUID (fw ≤0.15 dumps). */
const LEGACY_FIELD_TO_UUID: Record<string, string> = {
  buzzer_volume: '67f82d94-2b2a-4123-81c9-058e460c3d01',
  climb_tone_on_threshold_cm: 'fcb14ed9-06e7-4a9e-b311-6eee676a2f48',
  climb_tone_off_threshold_cm: '1673f137-66c1-4ff0-8db3-69b9ed7c33e0',
  sink_tone_on_threshold_cm: 'b713f438-42fe-46fe-b052-371a3b9e433a',
  sink_tone_off_threshold_cm: '8a78979b-1425-4160-b34b-ac5aadddeb21',
  uart_protocols: '84ccd3d4-a262-45e6-b616-d4a4ae7c0d5b',
  silent_on_ground: 'daadb8a9-a566-450e-97d0-990a0c8487dd',
  ble_never_sleep: 'd9eec180-344e-41e3-8c18-adf312dce8bb',
  led_blinky_by_vario: 'a37e549a-f501-4e77-9c3d-291c85542471',
  hid_keyboard_off: '86591053-2856-4f25-a35c-b753f0deea8f',
  // curves.* — nested one level deeper in the dump
  buzzer_vario_dots: '512d6d89-7a6f-461c-983e-902b68d40f56',
  buzzer_frequency_dots: '8c090502-81c4-4d29-8d10-6db20607ace9',
  buzzer_cycle_dots: '9c3b62c0-e227-4f1a-8342-7e647015555d',
  buzzer_duty_dots: '98c16914-00ad-47ba-b625-148f0baaec47',
}

/**
 * Scalars stored as Int16 cm/s in the ≤0.15 struct but held in m/s by
 * `SettingsLocal` (CPF exponent -2). Only these get the /100.
 *
 * Deliberately excludes the vario breakpoint curve: it is format 0x1B, which
 * bypasses the exponent on both read and write, so cm/s is what the store
 * and the wire both expect.
 */
const LEGACY_CM_PER_S_UUIDS = new Set([
  'fcb14ed9-06e7-4a9e-b311-6eee676a2f48', // climb on
  '1673f137-66c1-4ff0-8db3-69b9ed7c33e0', // climb off
  'b713f438-42fe-46fe-b052-371a3b9e433a', // sink on
  '8a78979b-1425-4160-b34b-ac5aadddeb21', // sink off
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Same value domain the URL codec accepts: primitives and number arrays. */
function isImportableValue(v: unknown): boolean {
  if (typeof v === 'boolean' || typeof v === 'string')
    return true
  if (typeof v === 'number' && Number.isFinite(v))
    return true
  if (Array.isArray(v) && v.length > 0 && v.every(n => typeof n === 'number' && Number.isFinite(n)))
    return true
  return false
}

/**
 * A setting we can actually show. Anything outside `CPF_UUID_TO_GROUP` has no
 * panel to live in and would be pruned on the next store load anyway — that
 * includes the simulator characteristic (`…120002`), which is a live command,
 * not a setting, and must never be restored from a file.
 */
function isKnownSetting(uuid: string): boolean {
  return uuid in CPF_UUID_TO_GROUP
}

/** cm/s → m/s, kept to 2 decimals so 5 → 0.05 and not 0.05000000000000001. */
function cmToM(v: number): number {
  return Math.round(v) / 100
}

const VARIO_DOTS_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
const POWER_OFF_UUID = '9a560750-0bca-4d0c-a1fc-21bbc574d5a6'

/**
 * Two `cpf-list` values in the wild are not on the scale the store keeps.
 *
 * - **Vario breakpoints.** Files exported around 2024-2025 hold them in m/s
 *   (`[-10, -2, -1.99, …]`), while the store — and the wire, via a bare
 *   `setInt16` — wants raw cm/s. Importing them verbatim would truncate the
 *   whole curve to a handful of cm/s and silence the vario. Detected by
 *   shape, not by file date: a raw curve is always integral and spans
 *   hundreds, so a fractional entry, or a whole curve inside ±50, means m/s.
 *   A genuine cm/s curve whose full span is under 0.5 m/s would be
 *   misread — such a curve is not something a vario can be flown with.
 *
 * - **Power-off timeout.** The old characteristic was named
 *   `power_off_timeout_hour` and carried hours; the store keeps seconds.
 *   Anything from 1 to 24 is read as hours (0 means "never", and no one
 *   sets a 24-second power-off).
 */
function repairCpfValue(uuid: string, value: unknown): unknown {
  if (uuid === VARIO_DOTS_UUID && Array.isArray(value)) {
    const dots = value as number[]
    const looksLikeMetres
      = dots.some(v => !Number.isInteger(v))
      || dots.every(v => Math.abs(v) <= 50)
    return looksLikeMetres ? dots.map(v => Math.round(v * 100)) : dots
  }
  if (uuid === POWER_OFF_UUID && typeof value === 'number' && value > 0 && value <= 24)
    return value * 3600
  return value
}

function fromCpfList(list: unknown[]): { settings: SettingsLocal, skipped: number } {
  const settings: SettingsLocal = {}
  let skipped = 0
  for (const entry of list) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      skipped++
      continue
    }
    const { uuid, value } = entry as { uuid?: unknown, value?: unknown }
    if (typeof uuid !== 'string' || !isKnownSetting(uuid) || !isImportableValue(value)) {
      skipped++
      continue
    }
    settings[uuid] = repairCpfValue(uuid, value)
  }
  return { settings, skipped }
}

function fromLegacyStruct(obj: Record<string, unknown>): { settings: SettingsLocal, skipped: number } {
  const settings: SettingsLocal = {}
  let skipped = 0

  const put = (field: string, raw: unknown) => {
    const uuid = LEGACY_FIELD_TO_UUID[field]
    if (!uuid || !isKnownSetting(uuid) || !isImportableValue(raw)) {
      skipped++
      return
    }
    if (LEGACY_CM_PER_S_UUIDS.has(uuid)) {
      settings[uuid] = Array.isArray(raw)
        ? (raw as number[]).map(cmToM)
        : cmToM(raw as number)
      return
    }
    settings[uuid] = raw
  }

  for (const [field, raw] of Object.entries(obj)) {
    if (field === 'curves') {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [cf, cv] of Object.entries(raw as Record<string, unknown>))
          put(cf, cv)
      }
      else {
        skipped++
      }
      continue
    }
    if (!(field in LEGACY_FIELD_TO_UUID)) {
      // buzzer_simulate_vario_value and any future junk land here.
      skipped++
      continue
    }
    put(field, raw)
  }
  return { settings, skipped }
}

function fromBag(bag: Record<string, unknown>): { settings: SettingsLocal, skipped: number } {
  const settings: SettingsLocal = {}
  let skipped = 0
  for (const [k, v] of Object.entries(bag)) {
    if (!isKnownSetting(k) || !isImportableValue(v)) {
      skipped++
      continue
    }
    settings[k] = v
  }
  return { settings, skipped }
}

function looksLikeLegacyStruct(obj: Record<string, unknown>): boolean {
  if ('curves' in obj)
    return true
  return Object.keys(obj).some(k => k in LEGACY_FIELD_TO_UUID)
}

/**
 * Parse a preset file's text. Returns null when the text is not JSON, is not
 * one of the three known shapes, or yields no importable setting at all.
 */
export function parsePresetJson(text: string, fallbackName = ''): ImportedPreset | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object')
    return null

  const bytes = typeof Blob === 'undefined' ? text.length : new Blob([text]).size
  let format: PresetFileFormat
  let name = ''
  let by = ''
  let result: { settings: SettingsLocal, skipped: number }

  if (Array.isArray(parsed)) {
    format = 'cpf-list'
    result = fromCpfList(parsed)
  }
  else {
    const obj = parsed as Record<string, unknown>
    const wrapped = obj.settings
    if (wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped)) {
      format = 'v2'
      name = typeof obj.name === 'string' ? obj.name : ''
      by = typeof obj.by === 'string' ? obj.by : ''
      result = fromBag(wrapped as Record<string, unknown>)
    }
    else if (looksLikeLegacyStruct(obj)) {
      format = 'legacy-struct'
      result = fromLegacyStruct(obj)
    }
    else if (Object.keys(obj).some(k => UUID_RE.test(k))) {
      format = 'v2'
      result = fromBag(obj)
    }
    else {
      return null
    }
  }

  if (Object.keys(result.settings).length === 0)
    return null

  return {
    name: name || fallbackName,
    by,
    settings: result.settings,
    format,
    skipped: result.skipped,
    bytes,
  }
}

/** Strip the directory and the `.json` suffix — used as a fallback preset name. */
export function presetNameFromFilename(filename: string): string {
  return filename.replace(/^.*[\\/]/, '').replace(/\.json$/i, '')
}
