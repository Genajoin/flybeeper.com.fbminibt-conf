import type { Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Reason, ThresholdParams } from '~/utils/threshold-model'
import {
  FIRMWARE_TICK_MS,
  HUGO_SNIFFER,
  XCTRACER_DEFAULT,
  decide,
  effectiveThresholds,
  emaStep,
  emaValue,
  firmwareParams,
  isWeakening,
  normalizeParams,
  zonesFor,
} from '~/utils/threshold-model'

/**
 * Threshold lab: the sound emulator's ClimbOn/ClimbOff/SinkOn/SinkOff + trend
 * hysteresis, shared by the curve chart (zones, live overlay), the lab panel
 * (fields, presets, status) and SimulatorControls (which runs the emulator).
 *
 * Emulator only. Nothing here is written to the device: the firmware does not
 * use ClimbOff/SinkOff yet, and the device's own climb_tone_off/sink_tone_off
 * characteristics mean something else. While `linked`, the lab mirrors the
 * device's current ClimbOn/SinkOn/hysteresis (= today's firmware behaviour);
 * the first edit detaches it into a local experiment kept in localStorage.
 */

const CLIMB_ON_UUID = 'fcb14ed9-06e7-4a9e-b311-6eee676a2f48'
const SINK_ON_UUID = 'b713f438-42fe-46fe-b052-371a3b9e433a'
const HYST_UUID = '0e984fe9-534c-4f13-969c-58ce03d33527'

export type LabPreset = 'flybeeper' | 'xctracer' | 'hugo' | 'custom'
export type Scenario = 'weakening' | 'sink-exit'

interface Stored {
  linked: boolean
  params: ThresholdParams
}

/**
 * Keyframes in [seconds, m/s]; linear in between. Paced like real air — a
 * vario reading drifts by a few tenths per second, not metres — so the trend
 * logic and the thresholds have time to show what they do.
 */
const SCENARIOS: Record<Scenario, [number, number][]> = {
  // Thermal builds to +2, holds, then fades out into −1 m/s sink
  // (−0.2 m/s per second): the trend hysteresis cuts the climb tone early.
  'weakening': [[0, 0], [5, 2], [11, 2], [26, -1], [31, -1]],
  // Out of a −2.5 m/s sink up into +1 m/s climb (+0.175 m/s per second):
  // where the sink tone stops and the climb tone starts.
  'sink-exit': [[0, -2.5], [4, -2.5], [24, 1], [29, 1]],
}

/** Seconds in the sniffer window before the panel calls it "stuck". */
export const STUCK_AFTER_S = 5

let stored: Ref<Stored> | null = null

const live = reactive({
  /** True while an emulator loop is running (SimulatorControls mounted). */
  running: false,
  /** Has the vario moved since the loop started — gates the chart overlay. */
  engaged: false,
  varioCm: 0,
  emaX10: 0,
  toneOn: false,
  reason: 'quiet' as Reason,
  phase: 'idle' as 'idle' | 'sample' | 'pause',
  /** performance.now() when the sound got held by the sink memory, else 0. */
  sinkHoldSince: 0,
  stuckS: 0,
})

/** Scenario playback drives the simulator slider through this ref. */
const driveMs = ref<number | null>(null)
const activeScenario = ref<Scenario | null>(null)
let scenarioTimer: ReturnType<typeof setInterval> | null = null

export function useThresholdLab() {
  const bt = useBluetoothStore()
  const settings = useSettingsStore()

  if (!stored)
    stored = useStorage<Stored>('fb:threshold-lab-v1', { linked: true, params: { ...XCTRACER_DEFAULT } }, undefined, { mergeDefaults: true })
  const st = stored

  function readCmS(uuid: string): number | null {
    const v = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)?.formattedValue
      ?? settings.local?.[uuid]
    return typeof v === 'number' ? Math.round(v * 100) : null
  }

  const deviceParams = computed<ThresholdParams>(() =>
    firmwareParams(readCmS(CLIMB_ON_UUID) ?? 5, readCmS(SINK_ON_UUID) ?? -250, readCmS(HYST_UUID) ?? 25),
  )

  const linked = computed(() => st.value.linked)
  const params = computed<ThresholdParams>(() => st.value.linked ? deviceParams.value : st.value.params)

  const preset = computed<LabPreset>(() => {
    if (st.value.linked)
      return 'flybeeper'
    const same = (a: ThresholdParams, b: ThresholdParams) =>
      a.climbOn === b.climbOn && a.climbOff === b.climbOff && a.sinkOn === b.sinkOn && a.sinkOff === b.sinkOff && a.hyst === b.hyst
    if (same(st.value.params, XCTRACER_DEFAULT))
      return 'xctracer'
    if (same(st.value.params, HUGO_SNIFFER))
      return 'hugo'
    return 'custom'
  })

  function selectPreset(p: LabPreset) {
    if (p === 'flybeeper')
      st.value = { ...st.value, linked: true }
    else if (p === 'xctracer')
      st.value = { linked: false, params: { ...XCTRACER_DEFAULT } }
    else if (p === 'hugo')
      st.value = { linked: false, params: { ...HUGO_SNIFFER } }
    else if (st.value.linked)
      st.value = { linked: false, params: { ...deviceParams.value } }
  }

  /** Edit one value (cm/s). Detaches from the device on the first edit. */
  function setParam(key: keyof ThresholdParams, cmS: number) {
    const base = st.value.linked ? deviceParams.value : st.value.params
    st.value = { linked: false, params: normalizeParams({ ...base, [key]: Math.round(cmS) }, key) }
  }

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
      const t = (performance.now() - t0) / 1000
      const last = frames[frames.length - 1]
      if (t >= last[0]) {
        driveMs.value = last[1]
        stopScenario()
        return
      }
      let i = 1
      while (frames[i][0] < t)
        i++
      const [ta, va] = frames[i - 1]
      const [tb, vb] = frames[i]
      driveMs.value = Math.round((va + (vb - va) * (t - ta) / (tb - ta)) * 100) / 100
    }, 1000 / 60)
  }

  return {
    linked,
    params,
    deviceParams,
    preset,
    selectPreset,
    setParam,
    zones,
    live: readonly(live),
    emaCm,
    weakening,
    quietWindow,
    driveMs: readonly(driveMs),
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
    const v = Math.round(io.varioCm())
    if (v !== live.varioCm)
      live.engaged = true
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

    const held = live.toneOn && live.reason === 'sink-hold'
    if (!held)
      live.sinkHoldSince = 0
    else if (!live.sinkHoldSince)
      live.sinkHoldSince = performance.now()
    live.stuckS = live.sinkHoldSince ? Math.floor((performance.now() - live.sinkHoldSince) / 1000) : 0
  }

  live.running = true
  live.engaged = false
  live.varioCm = Math.round(io.varioCm())
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
