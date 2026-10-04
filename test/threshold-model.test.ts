import { describe, expect, it } from 'vitest'
import type { ThresholdParams, ToneSide } from '../src/utils/threshold-model'
import {
  averageStep,
  decide,
  emaStep,
  emaValue,
  firmwareParams,
  soundParams,
  toneSide,
  zonesFor,
} from '../src/utils/threshold-model'

const XCTRACER_DEFAULT: ThresholdParams = { climbOn: 10, climbOff: 5, sinkOn: -70, sinkOff: -60, hyst: 0 }
const HUGO_SNIFFER: ThresholdParams = { climbOn: 10, climbOff: 10, sinkOn: -40, sinkOff: 5, hyst: 0 }

/** The firmware's stateless rule, verbatim from buzzer.c. */
function firmwareSounds(p: ThresholdParams, vario: number, avg: number): boolean {
  const isClimbDecrease = vario < avg && avg > p.climbOn
  const climbTh = !isClimbDecrease ? p.climbOn : p.climbOn + p.hyst
  return vario > climbTh || vario < p.sinkOn
}

/** Owner's check preset "climb_tone_off": hold the climb tone down to −0.4. */
const CLIMB_HOLD: ThresholdParams = { climbOn: 10, climbOff: -40, sinkOn: -250, sinkOff: -180, hyst: 5 }

/** Linear ramp at `ratePerS` m/s per second, one sample per 40 ms tick. */
function ramp(fromCm: number, toCm: number, ratePerS: number): number[] {
  const step = ratePerS * 100 * 0.04 * Math.sign(toCm - fromCm)
  const out: number[] = []
  for (let v = fromCm; step > 0 ? v <= toCm : v >= toCm; v += step)
    out.push(Math.round(v))
  return out
}

/** Vario value at which the tone first went silent. */
function offAt(p: ThresholdParams, trace: number[]): number | undefined {
  const on = run(p, trace)
  const i = on.findIndex((x, k) => k > 0 && on[k - 1] && !x)
  return i < 0 ? undefined : trace[i]
}

/** Feed a vario trace at 40 ms ticks, deciding on every tick. */
function run(p: ThresholdParams, trace: number[]) {
  let ema = trace[0] * 10
  let side: ToneSide | null = null
  return trace.map((v) => {
    ema = emaStep(ema, v)
    const r = decide(p, side, v, emaValue(ema))
    side = toneSide(r.reason, r.toneOn)
    return r.toneOn
  })
}

describe('threshold model', () => {
  it('matches the firmware exactly when OFF = ON', () => {
    const p = firmwareParams(5, -250, 25)
    for (let vario = -400; vario <= 400; vario += 5) {
      for (let avg = -400; avg <= 400; avg += 15) {
        for (const prev of [null, 'climb', 'sink'] as const)
          expect(decide(p, prev, vario, avg).toneOn).toBe(firmwareSounds(p, vario, avg))
      }
    }
  })

  it('firmware treats hysteresis ≤ 0 as the default 25', () => {
    expect(firmwareParams(5, -250, 0).hyst).toBe(25)
  })

  it('the XCTracer preset: climb tone holds between ClimbOff and ClimbOn only when coming from above', () => {
    const p = XCTRACER_DEFAULT
    expect(decide(p, 'climb', 7, 7).toneOn).toBe(true)
    expect(decide(p, null, 7, 7).toneOn).toBe(false)
    expect(decide(p, 'climb', 5, 5).toneOn).toBe(false)
  })

  it('the Hugo sniffer: after a sink the tone holds up to +0.05, from above it is silent', () => {
    const p = HUGO_SNIFFER
    expect(decide(p, 'sink', -20, -20)).toEqual({ toneOn: true, reason: 'sink-hold' })
    expect(decide(p, 'sink', 4, 4).toneOn).toBe(true)
    expect(decide(p, 'sink', 5, 5).toneOn).toBe(false)
    expect(decide(p, null, -20, -20)).toEqual({ toneOn: false, reason: 'quiet-memory' })
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

  it('a slow fade (0.2 m/s per second, the demo) already exits early at ClimbOn + hyst', () => {
    const trace = [...Array.from({ length: 25 }, () => 100), ...ramp(100, -100, 0.2)]
    expect(offAt(CLIMB_HOLD, trace)).toBe(15)
  })

  it('early exit beats the ClimbOff hold on a fade; hyst = 0 gives the hold back', () => {
    const trace = [...Array.from({ length: 25 }, () => 100), ...ramp(100, -100, 0.2)]
    expect(offAt({ ...CLIMB_HOLD, hyst: 25 }, trace)).toBe(35)
    expect(offAt({ ...CLIMB_HOLD, hyst: 0 }, trace)).toBe(-40)
  })

  it('a thermal dropping out (2 m/s per second) exits early at ClimbOn + hyst', () => {
    const trace = [...Array.from({ length: 25 }, () => 150), ...ramp(150, -100, 2)]
    const v = offAt(CLIMB_HOLD, trace)!
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThanOrEqual(15)
  })

  it('hyst = 0 switches the trend logic off: even a drop-out holds to ClimbOff', () => {
    const p = { ...CLIMB_HOLD, hyst: 0 }
    const trace = [...Array.from({ length: 25 }, () => 150), ...ramp(150, -100, 2)]
    // 8 cm per tick at this rate: the first sample at or below −0.40.
    const v = offAt(p, trace)!
    expect(v).toBeLessThanOrEqual(-40)
    expect(v).toBeGreaterThan(-48)
    expect(soundParams(10, -40, -250, -180, 0).hyst).toBe(0)
  })

  it('soundParams treats a "holds to" value on the wrong side as no hold', () => {
    // Old firmware defaults: climb_off +0.30 > climb_on, sink_off −2.70 < sink_on.
    expect(soundParams(5, 30, -250, -270, 25)).toEqual(firmwareParams(5, -250, 25))
    expect(soundParams(10, 5, -70, -60, 0)).toEqual({ climbOn: 10, climbOff: 5, sinkOn: -70, sinkOff: -60, hyst: 0 })
    // A sink window reaching over the climb hold is cut at it.
    expect(soundParams(10, 5, -40, 20, 25).sinkOff).toBe(5)
  })

  it('zones: firmware has sink / quiet / early-exit / climb, Hugo has the sniffer window', () => {
    expect(zonesFor(firmwareParams(5, -250, 25)).map(z => z.kind)).toEqual(['sink', 'quiet', 'early-exit', 'climb'])
    expect(zonesFor(HUGO_SNIFFER).map(z => z.kind)).toEqual(['sink', 'sink-memory', 'quiet', 'climb'])
    expect(zonesFor(XCTRACER_DEFAULT).map(z => z.kind)).toEqual(['sink', 'sink-memory', 'quiet', 'climb-memory', 'climb'])
  })

  it('vario averaging: firmware EMA per 16 ms sample, 63 % of a step after one period', () => {
    // 16 ms (the minimum) passes the input straight through.
    expect(averageStep(0, 100, 16)).toBe(100)
    // A step of 100 cm/s with 1 s averaging: after 1 s (25 ticks) ≈ 63 %.
    let v = 0
    for (let i = 0; i < 25; i++)
      v = averageStep(v, 100, 1000)
    expect(v).toBeGreaterThan(60)
    expect(v).toBeLessThan(66)
    // Out of the firmware range: the 100 ms default.
    expect(averageStep(0, 100, 0)).toBeCloseTo(averageStep(0, 100, 100))
  })

  it('each hold keeps only its own tone: meeting holds leave a silent transition', () => {
    // "Always on": climb 0 / hold −0.30, sink −0.60 / hold −0.30.
    const p = soundParams(0, -30, -60, -30, 0)
    const down = run(p, [10, -10, -29, -31, -50, -59, -61])
    expect(down).toEqual([true, true, true, false, false, false, true])
    const up = run(p, [-70, -50, -31, -29, -10, 0, 5])
    expect(up).toEqual([true, true, true, false, false, false, true])
  })
})
