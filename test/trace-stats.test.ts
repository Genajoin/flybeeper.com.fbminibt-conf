import { describe, expect, it } from 'vitest'
import { formatSpanSec, traceStats } from '../src/utils/traceStats'

describe('traceStats', () => {
  it('needs at least two points to have an extent', () => {
    expect(traceStats([])).toBeNull()
    expect(traceStats([{ t: 0, v: 1 }])).toBeNull()
  })

  it('reports min/max, window length in seconds and sample count', () => {
    const s = traceStats([
      { t: 1000, v: -0.5 },
      { t: 2000, v: 2.25 },
      { t: 31000, v: 0.75 },
    ])
    expect(s).toEqual({ min: -0.5, max: 2.25, spanSec: 30, count: 3 })
  })

  it('survives a flat trace and non-finite samples', () => {
    expect(traceStats([{ t: 0, v: 7 }, { t: 500, v: 7 }])).toEqual({ min: 7, max: 7, spanSec: 0.5, count: 2 })
    expect(traceStats([{ t: 0, v: Number.NaN }, { t: 500, v: Number.NaN }])).toBeNull()
    expect(traceStats([{ t: 0, v: Number.NaN }, { t: 500, v: 3 }])).toEqual({ min: 3, max: 3, spanSec: 0.5, count: 2 })
  })

  it('never reports a negative window (timestamps out of order)', () => {
    expect(traceStats([{ t: 900, v: 1 }, { t: 100, v: 2 }])?.spanSec).toBe(0)
  })

  it('formats the window: one decimal while short, whole seconds later', () => {
    expect(formatSpanSec(2.34)).toBe('2.3')
    expect(formatSpanSec(9.96)).toBe('10.0')
    expect(formatSpanSec(29.7)).toBe('30')
  })
})
