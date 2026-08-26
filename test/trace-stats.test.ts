import { describe, expect, it } from 'vitest'
import { formatSpanSec, sparkGeometry, traceStats } from '../src/utils/traceStats'

describe('traceStats', () => {
  it('needs at least two points to have an extent', () => {
    expect(traceStats([])).toBeNull()
    expect(traceStats([{ t: 0, v: 1 }])).toBeNull()
  })

  it('reports min/max and the window length in seconds', () => {
    const s = traceStats([
      { t: 1000, v: -0.5 },
      { t: 2000, v: 2.25 },
      { t: 31000, v: 0.75 },
    ])
    expect(s).toEqual({ min: -0.5, max: 2.25, spanSec: 30 })
  })

  it('survives a flat trace and non-finite samples', () => {
    expect(traceStats([{ t: 0, v: 7 }, { t: 500, v: 7 }])).toEqual({ min: 7, max: 7, spanSec: 0.5 })
    expect(traceStats([{ t: 0, v: Number.NaN }, { t: 500, v: Number.NaN }])).toBeNull()
    expect(traceStats([{ t: 0, v: Number.NaN }, { t: 500, v: 3 }])).toEqual({ min: 3, max: 3, spanSec: 0.5 })
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

describe('sparkGeometry', () => {
  const trace = [
    { t: 0, v: 0 },
    { t: 1000, v: 2 },
    { t: 2000, v: -1 },
  ]

  it('needs two points, same as traceStats', () => {
    expect(sparkGeometry([{ t: 0, v: 1 }])).toBeNull()
  })

  it('puts the marker dots on the drawn line', () => {
    const g = sparkGeometry(trace, 0)!
    // No padding: the extremes land on the top and bottom edges of the box,
    // at the x of the sample they belong to.
    expect(g.max).toEqual({ x: 50, y: 0 })
    expect(g.min).toEqual({ x: 100, y: 100 })
    expect(g.path).toBe('M0.0,66.7 L50.0,0.0 L100.0,100.0')
  })

  it('padding pulls the extremes off the edges but keeps them on the path', () => {
    const g = sparkGeometry(trace, 0.15)!
    expect(g.max.y).toBeCloseTo(11.5, 1)
    expect(g.min.y).toBeCloseTo(88.5, 1)
    expect(g.path.startsWith(`M0.0,`)).toBe(true)
    expect(g.path).toContain(`L50.0,${g.max.y.toFixed(1)}`)
    expect(g.path).toContain(`L100.0,${g.min.y.toFixed(1)}`)
  })

  it('reports the zero line only while zero is inside the plotted range', () => {
    expect(sparkGeometry(trace, 0)!.zeroY).toBeCloseTo(66.7, 1)
    expect(sparkGeometry([{ t: 0, v: 5 }, { t: 1000, v: 9 }], 0)!.zeroY).toBeNull()
  })

  it('draws a flat trace mid-box instead of dividing by zero', () => {
    const g = sparkGeometry([{ t: 0, v: 3 }, { t: 1000, v: 3 }])!
    expect(g.path).toBe('M0.0,50.0 L100.0,50.0')
    expect(g.min).toEqual({ x: 0, y: 50 })
    expect(g.max).toEqual({ x: 0, y: 50 })
  })
})
