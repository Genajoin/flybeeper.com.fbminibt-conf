import type { SettingsLocal } from '~/stores/settings'

/**
 * Value ranges the device firmware enforces for the four tone tables.
 *
 * `checkAndResetTables()` (DEVICE/FbFANET/firmware/FBFANET/src/buzzer/buzzer.c)
 * runs on every completed array write. If ANY element of ANY of the four
 * curves is out of range it resets ALL FOUR tables to factory defaults — and
 * it does so silently: the GATT write itself is ACKed, only the read-back
 * shows the factory curve. That is what surfaces as "device did not accept
 * the value" in `BleCharacteristic.setFormattedValue`.
 *
 * The Mini's firmware (DEVICE/FbBT/.../buzzer.c) has the very same check
 * commented out, so presets exported from a Mini can legitimately hold values
 * no other device accepts — negative frequencies used as "silence" around
 * zero being the one seen in the field. Such a file must still import: the
 * offending values are pulled to the nearest accepted value and the user is
 * told how many were touched. Dropping the curve, or the whole file, would
 * lose settings a pilot spent a season tuning.
 *
 * Only the curves are listed. Scalars are clamped device-side
 * (`fb_settings_clamp_locked`) without the all-or-nothing reset, so they
 * cannot take a neighbouring setting down with them.
 */
export interface ValueLimit {
  min: number
  max: number
  /** Unit shown to the user in the import note and the write error. */
  unit: string
}

export const VARIO_DOTS_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
export const FREQ_DOTS_UUID = '8c090502-81c4-4d29-8d10-6db20607ace9'
export const CYCLE_DOTS_UUID = '9c3b62c0-e227-4f1a-8342-7e647015555d'
export const DUTY_DOTS_UUID = '98c16914-00ad-47ba-b625-148f0baaec47'

export const CURVE_LIMITS: Record<string, ValueLimit> = {
  [VARIO_DOTS_UUID]: { min: -2000, max: 2000, unit: 'cm/s' },
  [FREQ_DOTS_UUID]: { min: 100, max: 6000, unit: 'Hz' },
  [CYCLE_DOTS_UUID]: { min: 10, max: 2000, unit: 'ms' },
  [DUTY_DOTS_UUID]: { min: 1, max: 100, unit: '%' },
}

export function limitFor(uuid: string): ValueLimit | null {
  return CURVE_LIMITS[uuid] ?? null
}

/** How many entries of `value` the firmware would reject. 0 for anything unlimited. */
export function outOfRangeCount(uuid: string, value: unknown): number {
  const limit = limitFor(uuid)
  if (!limit)
    return 0
  const list = Array.isArray(value) ? value : [value]
  let n = 0
  for (const v of list) {
    if (typeof v === 'number' && Number.isFinite(v) && (v < limit.min || v > limit.max))
      n++
  }
  return n
}

/**
 * Pull one setting into range. Returns the original reference when nothing
 * had to move, so callers can cheaply tell "untouched" from "repaired".
 */
export function clampSettingValue(uuid: string, value: unknown): { value: unknown, adjusted: number } {
  const limit = limitFor(uuid)
  if (!limit || !Array.isArray(value))
    return { value, adjusted: 0 }
  let adjusted = 0
  const out = value.map((v) => {
    if (typeof v !== 'number' || !Number.isFinite(v))
      return v
    const c = Math.min(limit.max, Math.max(limit.min, v))
    if (c !== v)
      adjusted++
    return c
  })
  return adjusted ? { value: out, adjusted } : { value, adjusted: 0 }
}

export interface ClampReport {
  settings: SettingsLocal
  /** Total number of individual values pulled into range. */
  adjusted: number
  /** Per-characteristic counts, for the "what exactly was touched" note. */
  byUuid: Record<string, number>
}

/**
 * Clamp a whole preset bag. Values outside the accepted range are repaired,
 * never dropped — see the file comment for why old Mini presets depend on it.
 */
export function clampSettings(settings: SettingsLocal): ClampReport {
  const out: SettingsLocal = {}
  const byUuid: Record<string, number> = {}
  let adjusted = 0
  for (const [uuid, value] of Object.entries(settings)) {
    const res = clampSettingValue(uuid, value)
    out[uuid] = res.value
    if (res.adjusted) {
      byUuid[uuid] = res.adjusted
      adjusted += res.adjusted
    }
  }
  return { settings: out, adjusted, byUuid }
}
