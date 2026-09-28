import { describe, expect, it } from 'vitest'
import { CURVE_COLUMNS, cellRange, displayToRaw, parseDisplay, rawToDisplay } from '../src/utils/curve-units'

const [VARIO, FREQ, , DUTY] = CURVE_COLUMNS

describe('curve-units', () => {
  it('round-trips every raw vario value without loss', () => {
    for (let raw = -2000; raw <= 2000; raw++) {
      const back = displayToRaw(parseDisplay(rawToDisplay(raw, 100, 2))!, 100, -2000, 2000)
      expect(back).toBe(raw)
    }
  })

  it('shows vario in m/s and stores cm/s', () => {
    expect(rawToDisplay(-1400, VARIO.scale, VARIO.decimals)).toBe('-14.00')
    expect(displayToRaw(0.35, VARIO.scale, -2000, 2000)).toBe(35)
    expect(displayToRaw(0.015, VARIO.scale, -2000, 2000)).toBe(2)
  })

  it('parses comma decimals and unicode minus, rejects garbage', () => {
    expect(parseDisplay('1,5')).toBe(1.5)
    expect(parseDisplay('−0.2')).toBe(-0.2)
    expect(parseDisplay('+2')).toBe(2)
    expect(parseDisplay('abc')).toBeNull()
    expect(parseDisplay('')).toBeNull()
    expect(parseDisplay('1e3')).toBeNull()
  })

  it('repairs out-of-range input to firmware limits', () => {
    const f = cellRange(FREQ, [], 0)
    expect(displayToRaw(50, 1, f.lo, f.hi)).toBe(100)
    expect(displayToRaw(9000, 1, f.lo, f.hi)).toBe(6000)
    const d = cellRange(DUTY, [], 0)
    expect(displayToRaw(0, 1, d.lo, d.hi)).toBe(1)
    expect(displayToRaw(25, VARIO.scale, -2000, 2000)).toBe(2000)
  })

  it('keeps vario breakpoints ordered', () => {
    const xs = [-100, 0, 100]
    expect(cellRange(VARIO, xs, 1)).toEqual({ lo: -100, hi: 100 })
    expect(cellRange(VARIO, xs, 0)).toEqual({ lo: -2000, hi: 0 })
    expect(cellRange(VARIO, xs, 2)).toEqual({ lo: 0, hi: 2000 })
  })
})
