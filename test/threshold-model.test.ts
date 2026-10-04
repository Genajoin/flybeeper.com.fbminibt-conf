import { describe, expect, it } from 'vitest'
import type { ThresholdParams } from '../src/utils/threshold-model'
import {
  HUGO_SNIFFER,
  XCTRACER_DEFAULT,
  decide,
  emaStep,
  emaValue,
  firmwareParams,
  normalizeParams,
  zonesFor,
} from '../src/utils/threshold-model'

/** The firmware's stateless rule, verbatim from buzzer.c. */
function firmwareSounds(p: ThresholdParams, vario: number, avg: number): boolean {
  const isClimbDecrease = vario < avg && avg > p.climbOn
  const climbTh = !isClimbDecrease ? p.climbOn : p.climbOn + p.hyst
  return vario > climbTh || vario < p.sinkOn
}

/** Feed a vario trace at 40 ms ticks, deciding on every tick. */
function run(p: ThresholdParams, trace: number[]) {
  let ema = trace[0] * 10
  let on = false
  return trace.map((v) => {
    ema = emaStep(ema, v)
    on = decide(p, on, v, emaValue(ema)).toneOn
    return on
  })
}

describe('threshold model', () => {
  it('matches the firmware exactly when OFF = ON', () => {
    const p = firmwareParams(5, -250, 25)
    for (let vario = -400; vario <= 400; vario += 5) {
      for (let avg = -400; avg <= 400; avg += 15) {
        for (const prev of [false, true])
          expect(decide(p, prev, vario, avg).toneOn).toBe(firmwareSounds(p, vario, avg))
      }
    }
  })

  it('firmware treats hysteresis ≤ 0 as the default 25', () => {
    expect(firmwareParams(5, -250, 0).hyst).toBe(25)
  })

  it('the XCTracer preset: climb tone holds between ClimbOff and ClimbOn only when coming from above', () => {
    const p = XCTRACER_DEFAULT
    expect(decide(p, true, 7, 7).toneOn).toBe(true)
    expect(decide(p, false, 7, 7).toneOn).toBe(false)
    expect(decide(p, true, 5, 5).toneOn).toBe(false)
  })

  it('the Hugo sniffer: after a sink the tone holds up to +0.05, from above it is silent', () => {
    const p = HUGO_SNIFFER
    expect(decide(p, true, -20, -20)).toEqual({ toneOn: true, reason: 'sink-hold' })
    expect(decide(p, true, 4, 4).toneOn).toBe(true)
    expect(decide(p, true, 5, 5).toneOn).toBe(false)
    expect(decide(p, false, -20, -20)).toEqual({ toneOn: false, reason: 'quiet-memory' })
  })

  it('the Hugo sniffer: stuck in the window means the tone never stops', () => {
    const trace = [...Array.from({ length: 20 }, () => -150), ...Array.from({ length: 500 }, () => -20)]
    expect(run(HUGO_SNIFFER, trace).at(-1)).toBe(true)
  })

  it('trend hysteresis cuts a fading climb early, a steady one keeps sounding', () => {
    const p: ThresholdParams = { climbOn: 5, climbOff: 5, sinkOn: -250, sinkOff: -250, hyst: 25 }
    const fading = [...Array.from({ length: 30 }, () => 200), ...Array.from({ length: 60 }, (_, i) => 200 - i * 3)]
    const out = run(p, fading)
    const offAt = fading[out.lastIndexOf(true) + 1]
    expect(offAt).toBeGreaterThan(5)
    expect(offAt).toBeLessThanOrEqual(30)
    expect(run(p, Array.from({ length: 50 }, () => 20)).at(-1)).toBe(true)
  })

  it('normalizeParams keeps SinkOn ≤ SinkOff ≤ ClimbOff ≤ ClimbOn', () => {
    const on = normalizeParams({ ...XCTRACER_DEFAULT, climbOn: -80 }, 'climbOn')
    expect(on).toEqual({ climbOn: -80, climbOff: -80, sinkOn: -80, sinkOff: -80, hyst: 0 })
    // OFF thresholds stop at their neighbours, the ON ones stay put.
    expect(normalizeParams({ ...XCTRACER_DEFAULT, climbOff: 50 }, 'climbOff')).toEqual({ ...XCTRACER_DEFAULT, climbOff: 10 })
    expect(normalizeParams({ ...XCTRACER_DEFAULT, climbOff: -500 }, 'climbOff')).toEqual({ ...XCTRACER_DEFAULT, climbOff: -60 })
    expect(normalizeParams({ ...XCTRACER_DEFAULT, sinkOff: 20 }, 'sinkOff')).toEqual({ ...XCTRACER_DEFAULT, sinkOff: 5 })
    expect(normalizeParams({ ...XCTRACER_DEFAULT, hyst: -3 }).hyst).toBe(0)
  })

  it('zones: firmware has sink / quiet / early-exit / climb, Hugo has the sniffer window', () => {
    expect(zonesFor(firmwareParams(5, -250, 25)).map(z => z.kind)).toEqual(['sink', 'quiet', 'early-exit', 'climb'])
    expect(zonesFor(HUGO_SNIFFER).map(z => z.kind)).toEqual(['sink', 'sink-memory', 'quiet', 'climb'])
    expect(zonesFor(XCTRACER_DEFAULT).map(z => z.kind)).toEqual(['sink', 'sink-memory', 'quiet', 'climb-memory', 'climb'])
  })
})
