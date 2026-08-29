import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CURVE_LIMITS,
  clampSettingValue,
  clampSettings,
  outOfRangeCount,
} from '../src/utils/setting-limits'
import { DeviceRejectedWriteError, describeWriteError, outOfRangeDetail } from '../src/utils/write-errors'
import { parsePresetJson } from '../src/utils/preset-import'

const VARIO_DOTS = '512d6d89-7a6f-461c-983e-902b68d40f56'
const FREQ_DOTS = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CYCLE_DOTS = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const DUTY_DOTS = '98c16914-00ad-47ba-b625-148f0baaec47'
const VOLUME = '67f82d94-2b2a-4123-81c9-058e460c3d01'
const SILENT = 'daadb8a9-a566-450e-97d0-990a0c8487dd'

describe('setting-limits: clamping', () => {
  it('mirrors the ranges the firmware enforces', () => {
    expect(CURVE_LIMITS[FREQ_DOTS]).toEqual({ min: 100, max: 6000, unit: 'Hz' })
    expect(CURVE_LIMITS[CYCLE_DOTS]).toEqual({ min: 10, max: 2000, unit: 'ms' })
    expect(CURVE_LIMITS[DUTY_DOTS]).toEqual({ min: 1, max: 100, unit: '%' })
    expect(CURVE_LIMITS[VARIO_DOTS]).toEqual({ min: -2000, max: 2000, unit: 'cm/s' })
  })

  it('pulls out-of-range curve points to the nearest accepted value', () => {
    const res = clampSettingValue(FREQ_DOTS, [-700, -700, 400, 6500, 2020])
    expect(res.value).toEqual([100, 100, 400, 6000, 2020])
    expect(res.adjusted).toBe(3)
  })

  it('leaves a valid curve untouched, by reference', () => {
    const dots = [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000]
    const res = clampSettingValue(FREQ_DOTS, dots)
    expect(res.adjusted).toBe(0)
    expect(res.value).toBe(dots)
  })

  it('ignores settings without a declared range', () => {
    const res = clampSettings({ [VOLUME]: 99, [SILENT]: true })
    expect(res.adjusted).toBe(0)
    expect(res.settings).toEqual({ [VOLUME]: 99, [SILENT]: true })
  })

  it('reports per-characteristic counts', () => {
    const res = clampSettings({
      [FREQ_DOTS]: [-700, -700, 400],
      [DUTY_DOTS]: [0, 50, 200],
      [CYCLE_DOTS]: [5, 500],
    })
    expect(res.adjusted).toBe(5)
    expect(res.byUuid).toEqual({ [FREQ_DOTS]: 2, [DUTY_DOTS]: 2, [CYCLE_DOTS]: 1 })
    expect(res.settings[DUTY_DOTS]).toEqual([1, 50, 100])
    expect(res.settings[CYCLE_DOTS]).toEqual([10, 500])
  })

  it('counts what the firmware would reject', () => {
    expect(outOfRangeCount(FREQ_DOTS, [-700, -700, -700, -700, -700, 470])).toBe(5)
    expect(outOfRangeCount(VOLUME, 99)).toBe(0)
  })
})

describe('setting-limits: staged import', () => {
  it('repairs a Mini preset with negative frequencies instead of dropping it', async () => {
    setActivePinia(createPinia())
    const { useSharedPresetStore } = await import('../src/stores/shared-preset')
    const shared = useSharedPresetStore()

    // Real file from a Mini (firmware 0.24.3-4): its buzzer check is commented
    // out, so −700 Hz "silence" points were accepted there and rejected by
    // every device that does validate.
    const path = resolve(process.cwd(), 'test/fixtures/mini-negative-frequency.json')
    const preset = parsePresetJson(readFileSync(path, 'utf8'))
    expect(preset).not.toBeNull()
    expect(preset!.settings[FREQ_DOTS]).toContain(-700)

    shared.stage({ name: preset!.name, bytes: preset!.bytes, settings: preset!.settings, source: 'file' })

    const staged = shared.pending!
    expect(staged.settings[FREQ_DOTS]).toEqual([100, 100, 100, 100, 100, 470, 760, 1120, 1480, 2020, 4720, 6000])
    expect(staged.adjusted).toBe(5)
    expect(staged.adjustedByUuid).toEqual({ [FREQ_DOTS]: 5 })
    // Everything else survives — the point of repairing rather than dropping.
    expect(staged.settings[VOLUME]).toBe(2)
    expect(staged.settings[CYCLE_DOTS]).toEqual([600, 500, 400, 300, 250, 595, 430, 325, 265, 210, 120, 100])
  })

  it('stages a valid preset unchanged', async () => {
    setActivePinia(createPinia())
    const { useSharedPresetStore } = await import('../src/stores/shared-preset')
    const shared = useSharedPresetStore()
    shared.stage({ name: 'ok', bytes: 10, settings: { [VOLUME]: 2 }, source: 'url' })
    expect(shared.pending!.adjusted).toBeUndefined()
  })
})

describe('write errors', () => {
  const t = vi.fn((key: string, named?: Record<string, unknown>) =>
    named ? `${key}|${JSON.stringify(named)}` : key,
  )

  it('explains an out-of-range rejection instead of dumping hex', () => {
    const detail = outOfRangeDetail(FREQ_DOTS, [-700, -700, -700, -700, -700, 470])
    expect(detail).toEqual({ count: 5, min: 100, max: 6000, unit: 'Hz' })

    const err = new DeviceRejectedWriteError(FREQ_DOTS, '44fd', 'c800', detail)
    const msg = describeWriteError(err, t)
    expect(msg).toContain('sett.write-out-of-range')
    expect(msg).toContain('"count":5')
    expect(msg).toContain('"min":100')
    // The hex is still there for the log, just not for the user.
    expect(err.message).toContain('44fd')
  })

  it('falls back to a plain rejection when the value was in range', () => {
    const err = new DeviceRejectedWriteError(VOLUME, '02', '03', null)
    expect(describeWriteError(err, t)).toContain('sett.write-rejected')
  })

  it('passes unrelated errors through', () => {
    expect(describeWriteError(new Error('disconnected'), t)).toBe('disconnected')
  })
})
