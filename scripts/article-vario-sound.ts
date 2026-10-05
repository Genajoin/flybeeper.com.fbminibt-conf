/**
 * Data for the alpisto.eu article on how the vario decides when to beep:
 * scenario timelines (vario, averages, threshold in effect, tone on/off and
 * every beep with its pitch and length) and configurator links.
 *
 * Runs the same model the configurator's simulator runs (threshold-model.ts,
 * trigger-presets.ts, the firmware buzzer loop of useThresholdLab) on virtual
 * time, so the article plays exactly what the configurator would.
 *
 *   npx tsx scripts/article-vario-sound.ts <out-dir>
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import type { ThresholdParams, ToneSide } from '../src/utils/threshold-model'
import {
  FIRMWARE_TICK_MS,
  averageStep,
  decide,
  effectiveThresholds,
  emaStep,
  emaValue,
  isWeakening,
  soundParams,
  toneSide,
  zonesFor,
} from '../src/utils/threshold-model'
import type { TriggerValues } from '../src/utils/trigger-presets'
import { TRIGGER_PRESETS, TRIGGER_PRESET_KEYS, TRIGGER_UUIDS } from '../src/utils/trigger-presets'
import { encodePreset } from '../src/utils/preset-share'

// Factory tone curves (firmware BUZZER_*_ARRAY_DEFAULT, the DEFAULT preset).
const CURVES = {
  vario: [-1400, -800, -100, 0, 39, 40, 100, 200, 300, 450, 1200, 2000],
  freq: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
  cycle: [850, 790, 725, 350, 150, 595, 430, 325, 265, 210, 120, 100],
  duty: [100, 98, 95, 20, 80, 41, 43, 46, 49, 54, 78, 90],
}
const CURVE_UUIDS = {
  vario: '512d6d89-7a6f-461c-983e-902b68d40f56',
  freq: '8c090502-81c4-4d29-8d10-6db20607ace9',
  cycle: '9c3b62c0-e227-4f1a-8342-7e647015555d',
  duty: '98c16914-00ad-47ba-b625-148f0baaec47',
}

function interp(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0])
    return ys[0]
  const n = xs.length
  if (x >= xs[n - 1])
    return ys[n - 1]
  for (let i = 1; i < n; i++) {
    if (x <= xs[i]) {
      const span = xs[i] - xs[i - 1]
      return span === 0 ? ys[i - 1] : ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / span
    }
  }
  return ys[n - 1]
}

function toneAt(cm: number) {
  return {
    f: interp(CURVES.vario, CURVES.freq, cm),
    cycle: interp(CURVES.vario, CURVES.cycle, cm),
    duty: interp(CURVES.vario, CURVES.duty, cm),
  }
}

/** Piecewise-linear trace: [seconds, m/s] frames. */
type Frames = [number, number][]

function traceAt(frames: Frames, t: number): number {
  if (t <= frames[0][0])
    return frames[0][1]
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i][0]) {
      const [t0, v0] = frames[i - 1]
      const [t1, v1] = frames[i]
      return v0 + (v1 - v0) * (t - t0) / (t1 - t0)
    }
  }
  return frames[frames.length - 1][1]
}

/** Deterministic turbulence: random steps every 0.25–0.7 s. */
function gusts(seed: number, len: number, amp: number): (t: number) => number {
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const steps: [number, number][] = []
  for (let t = 0; t < len; t += 0.25 + rnd() * 0.45)
    steps.push([t, (rnd() * 2 - 1) * amp])
  return (t) => {
    let v = 0
    for (const [ts, a] of steps) {
      if (ts > t)
        break
      v = a
    }
    return v
  }
}

interface Tick { t: number, air: number, v: number, ema: number, th: number, on: boolean, weak: boolean }
interface Beep { t: number, d: number, f: number }

/**
 * Offline port of startBuzzerEmulator (useThresholdLab): 40 ms ticks, vario
 * averaging, the trend EMA on every tick, decisions only outside a beep, beep
 * and pause lengths fixed when each phase starts.
 */
function simulate(p: ThresholdParams, averageS: number, air: (t: number) => number, lenS: number) {
  const ticks: Tick[] = []
  const beeps: Beep[] = []
  let smooth = air(0) * 100
  let v = Math.round(smooth)
  let emaX10 = v * 10
  let side: ToneSide | null = null
  let phase: 'idle' | 'sample' | 'pause' = 'idle'
  let phaseEnd = 0

  const startSample = (at: number) => {
    const tone = toneAt(v)
    const ms = Math.trunc(tone.cycle * tone.duty / 100)
    if (ms <= 0) {
      phase = 'idle'
      return
    }
    beeps.push({ t: at / 1000, d: ms / 1000, f: Math.round(tone.f) })
    phase = 'sample'
    phaseEnd = at + ms
  }
  const startPause = (at: number) => {
    const tone = toneAt(v)
    const ms = Math.trunc(tone.cycle * (100 - tone.duty) / 100)
    if (ms <= 0) {
      phase = 'idle'
      return
    }
    phase = 'pause'
    phaseEnd = at + ms
  }

  for (let now = 0; now <= lenS * 1000; now += FIRMWARE_TICK_MS) {
    // Phase timers that fell due before this tick, in order.
    // startSample / startPause move phase and phaseEnd on.
    // eslint-disable-next-line no-unmodified-loop-condition
    while (phase !== 'idle' && phaseEnd <= now) {
      if (phase === 'sample')
        startPause(phaseEnd)
      else
        startSample(phaseEnd)
    }
    const a = air(now / 1000) * 100
    smooth = averageStep(smooth, a, averageS * 1000)
    v = Math.round(smooth)
    emaX10 = emaStep(emaX10, v)
    const ema = emaValue(emaX10)
    if (phase !== 'sample') {
      const r = decide(p, side, v, ema)
      side = toneSide(r.reason, r.toneOn)
      if (!r.toneOn)
        phase = 'idle'
      else if (phase === 'idle')
        startSample(now)
    }
    const weak = isWeakening(p, v, ema)
    const eff = effectiveThresholds(p, weak)
    ticks.push({ t: now / 1000, air: Math.round(a), v, ema, th: side === 'climb' ? eff.climbOffEff : eff.climbOnEff, on: side !== null, weak })
  }
  // A beep cut by the end of the clip.
  for (const b of beeps)
    b.d = Math.min(b.d, lenS - b.t)
  return { ticks, beeps }
}

function trigger(v: TriggerValues): ThresholdParams {
  const cm = (x: number) => Math.round(x * 100)
  return soundParams(cm(v.climbOn), cm(v.climbOff), cm(v.sinkOn), cm(v.sinkOff), cm(v.hyst))
}

function settingsFor(v: TriggerValues, withCurves: boolean): Record<string, unknown> {
  const s: Record<string, unknown> = {}
  for (const k of Object.keys(TRIGGER_UUIDS) as (keyof TriggerValues)[])
    s[TRIGGER_UUIDS[k]] = v[k]
  if (withCurves) {
    for (const k of Object.keys(CURVE_UUIDS) as (keyof typeof CURVES)[])
      s[CURVE_UUIDS[k]] = CURVES[k]
  }
  return s
}

const BASE: TriggerValues = TRIGGER_PRESETS.factory

interface Variant { key: string, label: string, values: TriggerValues }
interface Scenario { key: string, lenS: number, air: (t: number) => number, variants: Variant[], range: [number, number] }

const fade: Frames = [[0, -0.8], [1, -0.8], [2.5, 1.5], [5.5, 1.5], [11.5, -0.8], [14, -0.8]]
const afterSink: Frames = [[0, -1], [1, -1], [1.6, -3.2], [3, -3.2], [6, -0.3], [9.5, -0.3], [11, 0.6], [13, 0.6]]
const fromAbove: Frames = [[0, 1], [1.5, 1], [4.5, -0.3], [9.5, -0.3], [11, 0.6], [13, 0.6]]
const weakZero: Frames = [[0, -1.2], [1, -1.2], [3.5, -0.2], [7, -0.1], [9, 0.3], [11, -0.6], [13, -0.6]]
const sweep: Frames = [[0, -3], [0.5, -3], [6.5, 2], [7.5, 2], [13.5, -3], [14, -3]]
const rough = gusts(7, 13, 1.2)

const SCENARIOS: Scenario[] = [
  {
    key: 'sweep',
    lenS: 14,
    air: t => traceAt(sweep, t),
    range: [-3.4, 2.4],
    variants: [{ key: 'factory', label: 'Factory', values: BASE }],
  },
  {
    key: 'fade',
    lenS: 14,
    air: t => traceAt(fade, t),
    range: [-1.1, 1.8],
    variants: [
      { key: 'plain', label: 'No hold, no early exit', values: { ...BASE, climbOn: 0.1, climbOff: 0.1, hyst: 0 } },
      { key: 'hold', label: 'Hold down to −0.30', values: { ...BASE, climbOn: 0.1, climbOff: -0.3, hyst: 0 } },
      { key: 'early', label: 'Early exit 0.25', values: { ...BASE, climbOn: 0.1, climbOff: 0.1, hyst: 0.25 } },
    ],
  },
  {
    key: 'after-sink',
    lenS: 13,
    air: t => traceAt(afterSink, t),
    range: [-3.5, 0.9],
    variants: [
      { key: 'plain', label: 'Sink tone below −2.50 only', values: { ...BASE, climbOn: 0.1, climbOff: 0.1, hyst: 0 } },
      { key: 'window', label: 'Sink tone held up to +0.05', values: { ...BASE, climbOn: 0.1, climbOff: 0.1, sinkOff: 0.05, hyst: 0 } },
    ],
  },
  {
    key: 'from-above',
    lenS: 13,
    air: t => traceAt(fromAbove, t),
    range: [-0.6, 1.3],
    variants: [
      { key: 'window', label: 'Sink tone held up to +0.05', values: { ...BASE, climbOn: 0.1, climbOff: 0.1, sinkOff: 0.05, hyst: 0 } },
    ],
  },
  {
    key: 'near-zero',
    lenS: 13,
    air: t => traceAt(weakZero, t),
    range: [-1.4, 0.6],
    variants: [
      { key: 'factory', label: 'Climb tone from +0.05', values: BASE },
      { key: 'sniffer', label: 'Tone from −0.30', values: { ...BASE, climbOn: -0.3, climbOff: -0.3, hyst: 0 } },
    ],
  },
  {
    key: 'rough',
    lenS: 13,
    air: t => 0.6 + rough(t),
    range: [-1, 2.2],
    variants: [
      { key: 'fast', label: 'Averaging 0.1 s', values: { ...BASE, hyst: 0, average: 0.1 } },
      { key: 'slow', label: 'Averaging 0.6 s', values: { ...BASE, hyst: 0, average: 0.6 } },
    ],
  },
]

const out = process.argv[2]
if (!out)
  throw new Error('usage: tsx scripts/article-vario-sound.ts <out-dir>')
mkdirSync(out, { recursive: true })

const round2 = (x: number) => Math.round(x * 100) / 100

for (const sc of SCENARIOS) {
  const data = {
    key: sc.key,
    lenS: sc.lenS,
    range: sc.range,
    variants: sc.variants.map((vr) => {
      const p = trigger(vr.values)
      const { ticks, beeps } = simulate(p, vr.values.average, sc.air, sc.lenS)
      return {
        key: vr.key,
        label: vr.label,
        values: vr.values,
        params: p,
        zones: zonesFor(p).map(z => ({ kind: z.kind, from: Number.isFinite(z.from) ? z.from : null, to: Number.isFinite(z.to) ? z.to : null })),
        link: `${encodePreset(settingsFor(vr.values, true), vr.label)}&demo`,
        // Compact columns: t, air, vario, ema, threshold (m/s); on, weak flags.
        t: ticks.map(k => round2(k.t)),
        air: ticks.map(k => k.air / 100),
        v: ticks.map(k => k.v / 100),
        ema: ticks.map(k => k.ema / 100),
        th: ticks.map(k => k.th / 100),
        on: ticks.map(k => (k.on ? 1 : 0)),
        weak: ticks.map(k => (k.weak ? 1 : 0)),
        beeps: beeps.map(b => [round2(b.t), round2(b.d), b.f]),
      }
    }),
  }
  writeFileSync(join(out, `${sc.key}.json`), `${JSON.stringify(data)}\n`)
}

// Step response of the vario averaging: 0 → +2 m/s.
const step = [0.1, 0.3, 0.6, 1.0].map((s) => {
  let x = 0
  const pts: [number, number][] = []
  for (let ms = 0; ms <= 3000; ms += FIRMWARE_TICK_MS) {
    x = averageStep(x, ms < 200 ? 0 : 200, s * 1000)
    pts.push([ms / 1000, round2(x / 100)])
  }
  return { averageS: s, pts }
})
writeFileSync(join(out, 'averaging-step.json'), `${JSON.stringify(step)}\n`)

// The seven presets: values, zones and a configurator link that applies them
// (without touching the pilot's curves) and starts the demo.
const presets = TRIGGER_PRESET_KEYS.map((k) => {
  const v = TRIGGER_PRESETS[k]
  const p = trigger(v)
  return {
    key: k,
    values: v,
    zones: zonesFor(p).map(z => ({ kind: z.kind, from: Number.isFinite(z.from) ? z.from : null, to: Number.isFinite(z.to) ? z.to : null })),
    link: `${encodePreset(settingsFor(v, false), k)}&demo`,
  }
})
writeFileSync(join(out, 'presets.json'), `${JSON.stringify(presets)}\n`)
writeFileSync(join(out, 'curves.json'), `${JSON.stringify({ ...CURVES, link: `${encodePreset(settingsFor(BASE, true), 'Factory')}&demo` })}\n`)
console.log(`wrote ${SCENARIOS.length} scenarios, presets, curves, averaging-step to ${out}`)
