import {
  CURVE_LIMITS,
  CYCLE_DOTS_UUID,
  DUTY_DOTS_UUID,
  FREQ_DOTS_UUID,
  VARIO_DOTS_UUID,
} from '~/utils/setting-limits'

/**
 * Unit conversion for the numeric (table) curve editor.
 *
 * The pilot types values in familiar units (m/s, Hz, ms, %); the device and
 * the preset JSON keep the firmware's raw integers (vario in cm/s — see
 * 8fae8b7). Raw → display → raw is the identity for every integer the
 * firmware can hold, so flipping between graph and table never drifts.
 *
 * Out-of-range input is repaired to the nearest accepted value rather than
 * refused, matching how preset import treats it (0c8c8d0).
 */
export interface CurveColumn {
  field: 'buzzer_vario_dots' | 'buzzer_frequency_dots' | 'buzzer_cycle_dots' | 'buzzer_duty_dots'
  uuid: string
  /** Unit the user sees. */
  unit: string
  /** raw = display × scale */
  scale: number
  /** Decimals shown in the table (log10 of scale for vario). */
  decimals: number
}

export const CURVE_COLUMNS: CurveColumn[] = [
  { field: 'buzzer_vario_dots', uuid: VARIO_DOTS_UUID, unit: 'm/s', scale: 100, decimals: 2 },
  { field: 'buzzer_frequency_dots', uuid: FREQ_DOTS_UUID, unit: 'Hz', scale: 1, decimals: 0 },
  { field: 'buzzer_cycle_dots', uuid: CYCLE_DOTS_UUID, unit: 'ms', scale: 1, decimals: 0 },
  { field: 'buzzer_duty_dots', uuid: DUTY_DOTS_UUID, unit: '%', scale: 1, decimals: 0 },
]

/** Raw firmware value → text shown in the table cell. */
export function rawToDisplay(raw: number, scale: number, decimals: number): string {
  return (raw / scale).toFixed(decimals)
}

/**
 * Parse what the user typed ("1,5", " -0.35 ", "+2") into a display number.
 * Returns null for anything that is not a finite number.
 */
export function parseDisplay(text: string): number | null {
  const s = text.trim().replace(',', '.').replace(/^−/, '-')
  if (s === '' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))
    return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Display number → raw integer the firmware stores, clamped to `[lo, hi]`.
 * Rounding happens in raw units, so 0.015 m/s becomes 2 cm/s, not 1.
 */
export function displayToRaw(value: number, scale: number, lo: number, hi: number): number {
  const raw = Math.round(value * scale)
  return Math.min(hi, Math.max(lo, raw))
}

/**
 * Accepted raw range for one cell. Vario breakpoints must additionally stay
 * ordered — same rule the graph editor applies while dragging a point.
 */
export function cellRange(col: CurveColumn, values: number[], i: number): { lo: number, hi: number } {
  const limit = CURVE_LIMITS[col.uuid]
  if (col.uuid !== VARIO_DOTS_UUID)
    return { lo: limit.min, hi: limit.max }
  return {
    lo: i > 0 ? values[i - 1] : limit.min,
    hi: i < values.length - 1 ? values[i + 1] : limit.max,
  }
}
