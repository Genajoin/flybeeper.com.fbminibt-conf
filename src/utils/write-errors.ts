import { limitFor, outOfRangeCount } from '~/utils/setting-limits'

/** Minimal shape of vue-i18n's `t`, so this module stays component-free. */
type Translate = (key: string, named?: Record<string, unknown>) => string

export interface OutOfRangeDetail {
  count: number
  min: number
  max: number
  unit: string
}

/**
 * A write that the GATT stack accepted but the device did not keep.
 *
 * The technical `message` (hex written vs hex read back) is what lands in the
 * log; the UI renders `describeWriteError()` instead, because a hex dump told
 * a pilot with an old Mini preset exactly nothing about the five −700 Hz
 * points that made the firmware drop his whole tone table.
 */
export class DeviceRejectedWriteError extends Error {
  constructor(
    readonly uuid: string,
    readonly wroteHex: string,
    readonly readHex: string,
    readonly outOfRange: OutOfRangeDetail | null,
  ) {
    super(`${uuid}: device did not accept the value (wrote ${wroteHex}, read back ${readHex})`)
    this.name = 'DeviceRejectedWriteError'
  }
}

/** Out-of-range summary for a value about to be written, or null if it fits. */
export function outOfRangeDetail(uuid: string, value: unknown): OutOfRangeDetail | null {
  const limit = limitFor(uuid)
  if (!limit)
    return null
  const count = outOfRangeCount(uuid, value)
  return count ? { count, min: limit.min, max: limit.max, unit: limit.unit } : null
}

/** Localised setting name, falling back to the raw UUID when untranslated. */
export function settingName(uuid: string, t: Translate): string {
  const key = `sett.${uuid}`
  const name = t(key)
  return name === key ? uuid : name
}

/**
 * Human-readable reason for a failed apply. Out-of-range curve values get the
 * full story — including the reset-to-factory side effect, which is what the
 * user actually sees on the device — everything else falls back to the
 * technical message.
 */
export function describeWriteError(err: unknown, t: Translate): string {
  if (err instanceof DeviceRejectedWriteError) {
    const name = settingName(err.uuid, t)
    if (err.outOfRange) {
      return t('sett.write-out-of-range', {
        name,
        count: err.outOfRange.count,
        min: err.outOfRange.min,
        max: err.outOfRange.max,
        unit: err.outOfRange.unit,
      })
    }
    return t('sett.write-rejected', { name })
  }
  return err instanceof Error ? err.message : String(err)
}
