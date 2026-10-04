import type { Reason, ThresholdParams } from '~/utils/threshold-model'
import {
  DEFAULT_AVERAGE_MS,
  FIRMWARE_TICK_MS,
  averageStep,
  decide,
  effectiveThresholds,
  emaStep,
  emaValue,
  isWeakening,
  soundParams,
  zonesFor,
} from '~/utils/threshold-model'

/**
 * Sound model state shared by the curve chart (zones, live overlay), the sound
 * panel (status, history, zone list) and SimulatorControls (which runs the
 * emulator). The thresholds are the device's own sound settings — Start
 * climbing/sinking, "tone holds down/up to" and the early-exit hysteresis —
 * edited in the Sound panel or by dragging their lines on the chart.
 *
 * The current firmware ignores the two "holds to" settings; the browser
 * emulator already plays them, so the pilot can hear the idea before it ships.
 */

const CLIMB_ON_UUID = 'fcb14ed9-06e7-4a9e-b311-6eee676a2f48'
const CLIMB_OFF_UUID = '1673f137-66c1-4ff0-8db3-69b9ed7c33e0'
const SINK_ON_UUID = 'b713f438-42fe-46fe-b052-371a3b9e433a'
const SINK_OFF_UUID = '8a78979b-1425-4160-b34b-ac5aadddeb21'
const HYST_UUID = '0e984fe9-534c-4f13-969c-58ce03d33527'
const AVERAGE_UUID = '7e035080-7417-4393-959a-58505ef9cf4a'

export type Scenario = 'demo'

/**
 * Keyframes in [seconds, m/s]; linear in between, looped until stopped (the
 * last frame equals the first). Paced like real air — a vario reading drifts
 * by a few tenths per second, not metres — so the trend logic and the
 * thresholds have time to show what they do.
 */
const SCENARIOS: Record<Scenario, [number, number][]> = {
  // Strong sink (−3 → −1 at 1 m/s per second, it's just the sink tone), then
  // the interesting band −1 … +1 slowly (0.2 m/s per second): the sink tone
  // stopping, the climb tone starting, then the climb fading — where the
  // trend hysteresis cuts it early. Half a second at each end.
  demo: [[0, -3], [0.5, -3], [2.5, -1], [12.5, 1], [13, 1], [23, -1], [25, -3]],
}

/** Seconds in the sniffer window before the panel calls it "stuck". */
export const STUCK_AFTER_S = 5

const live = reactive({
  /** True while an emulator loop is running (SimulatorControls mounted). */
  running: false,
  /** Has the vario moved since the loop started — gates the chart overlay. */
  engaged: false,
  /** The slider (simulated air), before the vario averaging. */
  airCm: 0,
  /** The vario the sound works from: the slider after the averaging. */
  varioCm: 0,
  emaX10: 0,
  toneOn: false,
  reason: 'quiet' as Reason,
  phase: 'idle' as 'idle' | 'sample' | 'pause',
  /** performance.now() when the sound got held by the sink memory, else 0. */
  sinkHoldSince: 0,
  stuckS: 0,
})

/** One emulator tick, for the time-history strip. Values in cm/s. */
export interface HistorySample {
  /** performance.now() */
  t: number
  /** The slider, before the vario averaging. */
  air: number
  /** What the sound works from: the slider after the vario averaging. */
  vario: number
  ema: number
  /** The climb threshold that decides the next switch: OFF line while the tone is on, ON line while silent. */
  climbTh: number
  toneOn: boolean
  weakening: boolean
}

export const HISTORY_S = 20
const HISTORY_LEN = HISTORY_S * 1000 / FIRMWARE_TICK_MS
/** Plain array (not reactive): 25 pushes a second would thrash Vue. */
const history: HistorySample[] = []
/** Bumped a few times a second so the strip redraws. */
const historyVersion = ref(0)

/** Scenario playback drives the simulator slider through this ref. */
const driveMs = ref<number | null>(null)
const activeScenario = ref<Scenario | null>(null)
let scenarioTimer: ReturnType<typeof setInterval> | null = null

export function useThresholdLab() {
  const bt = useBluetoothStore()
  const settings = useSettingsStore()

  function readCmS(uuid: string): number | null {
    const v = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)?.formattedValue
      ?? settings.local?.[uuid]
    return typeof v === 'number' ? Math.round(v * 100) : null
  }

  /** Vario averaging, ms ("Vario averaging time", seconds on the wire). */
  const averageMs = computed(() => {
    const v = bt.bleCharacteristics.find(c => c.characteristic.uuid === AVERAGE_UUID)?.formattedValue
      ?? settings.local?.[AVERAGE_UUID]
    return typeof v === 'number' ? Math.round(v * 1000) : DEFAULT_AVERAGE_MS
  })

  /** The sound settings from the Sound panel, ordered for the model. */
  const params = computed<ThresholdParams>(() => soundParams(
    readCmS(CLIMB_ON_UUID) ?? 5,
    readCmS(CLIMB_OFF_UUID),
    readCmS(SINK_ON_UUID) ?? -250,
    readCmS(SINK_OFF_UUID),
    readCmS(HYST_UUID) ?? 25,
  ))

  const zones = computed(() => zonesFor(params.value))

  const emaCm = computed(() => emaValue(live.emaX10))
  const weakening = computed(() => isWeakening(params.value, live.varioCm, emaCm.value))
  /**
   * The silent window in effect right now: with the sound on it is where the
   * sound would stop; with the sound off, where it stays off.
   */
  const quietWindow = computed(() => {
    const p = params.value
    const eff = effectiveThresholds(p, weakening.value)
    return live.toneOn
      ? { from: p.sinkOff, to: eff.climbOffEff }
      : { from: p.sinkOn, to: eff.climbOnEff }
  })

  function stopScenario() {
    if (scenarioTimer)
      clearInterval(scenarioTimer)
    scenarioTimer = null
    activeScenario.value = null
  }

  function runScenario(name: Scenario) {
    stopScenario()
    const frames = SCENARIOS[name]
    const t0 = performance.now()
    activeScenario.value = name
    scenarioTimer = setInterval(() => {
      const t = ((performance.now() - t0) / 1000) % frames[frames.length - 1][0]
      let i = 1
      while (frames[i][0] < t)
        i++
      const [ta, va] = frames[i - 1]
      const [tb, vb] = frames[i]
      driveMs.value = Math.round((va + (vb - va) * (t - ta) / (tb - ta)) * 100) / 100
    }, 1000 / 60)
  }

  return {
    params,
    averageMs,
    zones,
    live: readonly(live),
    emaCm,
    weakening,
    quietWindow,
    driveMs: readonly(driveMs),
    history,
    historyVersion: readonly(historyVersion),
    activeScenario: readonly(activeScenario),
    runScenario,
    stopScenario,
  }
}

export interface EmulatorIo {
  /** Current simulated vario, cm/s. */
  varioCm: () => number
  /** Tone params at a vario value, or null when the curves aren't loaded. */
  toneAt: (cmS: number) => { frequencyHz: number, cycleMs: number, dutyPercent: number } | null
  /**
   * Run the slider through the vario averaging, as a real sensor reading is.
   * False for the device source: the firmware simulator bypasses it.
   */
  averaged: () => boolean
  /** Firmware "smooth frequency change": retune during a beep. */
  smooth: () => boolean
  toneOn: (frequencyHz: number) => void
  toneOff: () => void
  setFrequency: (frequencyHz: number) => void
}

/**
 * Port of the firmware buzzer loop (buzzer_play_vario_thread_cb +
 * sample/pause work handlers) driven by the lab thresholds. Ticks every 40 ms,
 * updates the EMA every tick, decides only outside a beep, and times each beep
 * and pause from the vario at the moment the phase starts — exactly as the
 * device does. Returns a stop function.
 */
export function startBuzzerEmulator(io: EmulatorIo): () => void {
  const lab = useThresholdLab()
  let phaseTimer: ReturnType<typeof setTimeout> | null = null
  let tickNo = 0
  /** Slider value on the previous tick, and the slider after the vario averaging. */
  let lastAir = 0
  let smoothCm = 0

  function clearPhase() {
    if (phaseTimer)
      clearTimeout(phaseTimer)
    phaseTimer = null
  }

  function startSample() {
    const tone = io.toneAt(live.varioCm)
    const sampleMs = tone ? Math.trunc(tone.cycleMs * tone.dutyPercent / 100) : 0
    if (!tone || sampleMs <= 0) {
      live.phase = 'idle'
      return
    }
    io.toneOn(tone.frequencyHz)
    live.phase = 'sample'
    phaseTimer = setTimeout(startPause, sampleMs)
  }

  function startPause() {
    io.toneOff()
    const tone = io.toneAt(live.varioCm)
    const pauseMs = tone ? Math.trunc(tone.cycleMs * (100 - tone.dutyPercent) / 100) : 0
    if (pauseMs <= 0) {
      // Firmware: no pause scheduled, the next loop tick starts the next beep.
      live.phase = 'idle'
      phaseTimer = null
      return
    }
    live.phase = 'pause'
    phaseTimer = setTimeout(startSample, pauseMs)
  }

  function tick() {
    const air = io.varioCm()
    if (air !== lastAir)
      live.engaged = true
    lastAir = air
    smoothCm = io.averaged() ? averageStep(smoothCm, air, lab.averageMs.value) : air
    const v = Math.round(smoothCm)
    live.airCm = Math.round(air)
    live.varioCm = v
    live.emaX10 = emaStep(live.emaX10, v)

    if (live.phase === 'sample') {
      if (io.smooth()) {
        const tone = io.toneAt(v)
        if (tone)
          io.setFrequency(tone.frequencyHz)
      }
    }
    else {
      const r = decide(lab.params.value, live.toneOn, v, emaValue(live.emaX10))
      live.toneOn = r.toneOn
      live.reason = r.reason
      if (!r.toneOn) {
        clearPhase()
        if (live.phase !== 'idle')
          io.toneOff()
        live.phase = 'idle'
      }
      else if (live.phase === 'idle') {
        startSample()
      }
    }

    const p = lab.params.value
    const ema = emaValue(live.emaX10)
    const weak = isWeakening(p, v, ema)
    const eff = effectiveThresholds(p, weak)
    history.push({ t: performance.now(), air: live.airCm, vario: v, ema, climbTh: live.toneOn ? eff.climbOffEff : eff.climbOnEff, toneOn: live.toneOn, weakening: weak })
    if (history.length > HISTORY_LEN)
      history.splice(0, history.length - HISTORY_LEN)
    if (++tickNo % 3 === 0)
      historyVersion.value++

    const held = live.toneOn && live.reason === 'sink-hold'
    if (!held)
      live.sinkHoldSince = 0
    else if (!live.sinkHoldSince)
      live.sinkHoldSince = performance.now()
    live.stuckS = live.sinkHoldSince ? Math.floor((performance.now() - live.sinkHoldSince) / 1000) : 0
  }

  live.running = true
  live.engaged = false
  history.length = 0
  lastAir = io.varioCm()
  smoothCm = lastAir
  live.varioCm = Math.round(lastAir)
  live.airCm = live.varioCm
  live.emaX10 = live.varioCm * 10
  live.toneOn = false
  live.phase = 'idle'
  const timer = setInterval(tick, FIRMWARE_TICK_MS)

  return () => {
    clearInterval(timer)
    clearPhase()
    io.toneOff()
    live.running = false
    live.engaged = false
    live.toneOn = false
    live.phase = 'idle'
    live.sinkHoldSince = 0
    live.stuckS = 0
  }
}
