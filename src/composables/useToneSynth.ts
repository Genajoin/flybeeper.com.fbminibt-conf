import type { Ref } from 'vue'

/**
 * Web Audio tone synthesizer composable (DECISIONS.md §★2, §★4.1).
 *
 * Approximates the FBminiBT's piezo buzzer in the browser so the user can
 * preview curve edits without connecting hardware. A single square-wave
 * OscillatorNode feeds a GainNode that is gated on/off in a PWM-like
 * pattern matching the device's cycleMs/dutyPercent parameters.
 *
 * The AudioContext is created lazily on the first user gesture — browsers
 * refuse to construct it otherwise. SSR is handled by short-circuiting all
 * actions when `window` is undefined.
 *
 * Not a Pinia store — each using component gets its own context. Cleanup
 * is wired through `onScopeDispose`.
 */

export interface ToneParams {
  /** pitch in Hz */
  frequencyHz: number
  /** length of one on+off period in ms */
  cycleMs: number
  /** 0..100 — fraction of cycle the tone is on */
  dutyPercent: number
  /** 0..1 — final gain */
  volume: number
}

export interface VarioCurvesShape {
  buzzer_vario_dots: number[]
  buzzer_frequency_dots: number[]
  buzzer_cycle_dots: number[]
  buzzer_duty_dots: number[]
}

export interface UseToneSynth {
  /** True once AudioContext is created (requires a user gesture first). */
  isReady: Readonly<Ref<boolean>>
  /** True while a tone is currently playing. */
  isPlaying: Readonly<Ref<boolean>>
  /** Last error, if any. */
  error: Readonly<Ref<Error | null>>

  /** Ensure the AudioContext exists. Must be called from a user-gesture handler the first time. Safe to call repeatedly. */
  ensureContext: () => Promise<void>

  /** Start playing a tone with given params. Cancels any previous tone. Pure setter — no debouncing here. */
  play: (params: ToneParams) => void

  /** Silence the tone immediately. */
  stop: () => void

  /**
   * Convenience: interpolate the curve at varioCmS, then play.
   * varioCmS — Int16 in cm/s (matches device units; e.g. +200 = +2 m/s climb).
   * Returns the resolved ToneParams (for UI display / debug).
   */
  playForVario: (varioCmS: number, curves: VarioCurvesShape, volume: number) => ToneParams | null

  /**
   * Install a provider that is consulted at every scheduled cycle boundary
   * to compute the next cycle's params. Used to model the device's
   * "smooth frequency change = OFF" mode: params are locked for the duration
   * of the current cycle and only refreshed at the next cycle's start, so
   * moving the slider produces a step in the audible frequency at the cycle
   * boundary instead of a continuous glide.
   *
   * Pass `null` to revert to the continuous (smooth=ON) behaviour where the
   * cached params are used until `play()` is called again.
   */
  setParamsProvider: (provider: (() => ToneParams | null) | null) => void
}

/**
 * How many seconds of cycles to schedule ahead in smooth=ON mode.
 * Bigger horizon = fewer scheduling ticks, smoother under CPU pressure.
 */
const SCHEDULE_HORIZON_SMOOTH_S = 2
const SCHEDULE_INTERVAL_SMOOTH_MS = 500

/**
 * In smooth=OFF mode (paramsProvider set) we want snapshots to be taken as
 * close to actual playback time as possible — so we pre-schedule only a
 * short window ahead and refresh frequently. The trade-off is more timer
 * work for ~400 ms of latency between slider move and audible step.
 */
const SCHEDULE_HORIZON_STEP_S = 0.4
const SCHEDULE_INTERVAL_STEP_MS = 120

/** Smallest sensible cycle (ms) — avoids runaway scheduling. */
const MIN_CYCLE_MS = 10

function interpolateCurve(
  xs: number[],
  ys: number[],
  x: number,
): number {
  const n = xs.length
  if (x <= xs[0])
    return ys[0]
  if (x >= xs[n - 1])
    return ys[n - 1]
  for (let i = 1; i < n; i++) {
    if (x <= xs[i]) {
      const x0 = xs[i - 1]
      const x1 = xs[i]
      const y0 = ys[i - 1]
      const y1 = ys[i]
      const span = x1 - x0
      if (span === 0)
        return y0
      const t = (x - x0) / span
      return y0 + (y1 - y0) * t
    }
  }
  return ys[n - 1]
}

export function useToneSynth(): UseToneSynth {
  const isReady = ref(false)
  const isPlaying = ref(false)
  const error = ref<Error | null>(null)

  const hasWindow = typeof window !== 'undefined'

  let ctx: AudioContext | null = null
  let osc: OscillatorNode | null = null
  let gain: GainNode | null = null
  let scheduleTimer: ReturnType<typeof setInterval> | null = null
  /** Next absolute audio-time at which a gain transition has been scheduled. */
  let nextScheduleTime = 0
  /** Currently-playing params (or null if stopped). */
  let current: ToneParams | null = null
  /**
   * Optional cycle-boundary provider — when set, the scheduler asks it for
   * fresh params at the start of every scheduled cycle (firmware-equivalent
   * "smooth frequency change = OFF": params don't glide, they step at the
   * cycle boundary).
   */
  let paramsProvider: (() => ToneParams | null) | null = null

  function clearScheduleTimer(): void {
    if (scheduleTimer !== null) {
      clearInterval(scheduleTimer)
      scheduleTimer = null
    }
  }

  /**
   * Append on/off gain steps from `nextScheduleTime` until we reach the
   * horizon.
   *
   * In smooth=OFF mode the provider is consulted at every phase transition,
   * not just at the cycle start: the silence following each tone phase is
   * computed from the LATEST slider position at the moment the tone ends,
   * and the next tone's frequency + on-duration are computed from the LATEST
   * slider position at the moment the silence ends. So a slider move during
   * the silence phase lands an audible step the instant the next tone starts,
   * not at the next full-cycle boundary.
   */
  function fillSchedule(): void {
    if (!ctx || !gain || !osc || !current)
      return
    const horizonS = paramsProvider ? SCHEDULE_HORIZON_STEP_S : SCHEDULE_HORIZON_SMOOTH_S
    const horizon = ctx.currentTime + horizonS
    let t = Math.max(nextScheduleTime, ctx.currentTime)
    // Safety cap to avoid scheduling millions of events on absurd inputs.
    let guard = 0
    while (t < horizon && guard++ < 2000) {
      // 1. Tone-start snapshot. Determines this cycle's freq + on-duration.
      if (paramsProvider) {
        const fresh = paramsProvider()
        if (fresh)
          current = fresh
      }
      const cycleMsA = Math.max(current.cycleMs, MIN_CYCLE_MS)
      const dutyA = Math.min(Math.max(current.dutyPercent, 0), 100)
      const onS = (cycleMsA * dutyA) / 100 / 1000
      const vol = Math.min(Math.max(current.volume, 0), 1)
      osc.frequency.setValueAtTime(Math.max(current.frequencyHz, 1), t)
      gain.gain.setValueAtTime(vol, t)
      if (onS > 0)
        gain.gain.setValueAtTime(0, t + onS)

      // 2. Silence-start snapshot. The silence's duration is recomputed from
      // whatever the slider says AT THE MOMENT the tone ends, not from the
      // tone-start snapshot. With smooth=OFF this lets the user nudge the
      // slider mid-cycle and hear the result on the next tone phase rather
      // than waiting for the next full cycle.
      if (paramsProvider) {
        const fresh = paramsProvider()
        if (fresh)
          current = fresh
      }
      const cycleMsB = Math.max(current.cycleMs, MIN_CYCLE_MS)
      const dutyB = Math.min(Math.max(current.dutyPercent, 0), 100)
      const offS = (cycleMsB * (100 - dutyB)) / 100 / 1000
      t += onS + offS
    }
    nextScheduleTime = t
  }

  /** Reset the schedule and immediately re-prime it from `ctx.currentTime`. */
  function restartSchedule(): void {
    if (!ctx || !gain)
      return
    gain.gain.cancelScheduledValues(ctx.currentTime)
    // Hold silence until the first scheduled step lands.
    gain.gain.setValueAtTime(0, ctx.currentTime)
    nextScheduleTime = ctx.currentTime
    fillSchedule()
    clearScheduleTimer()
    const intervalMs = paramsProvider ? SCHEDULE_INTERVAL_STEP_MS : SCHEDULE_INTERVAL_SMOOTH_MS
    scheduleTimer = setInterval(fillSchedule, intervalMs)
  }

  async function ensureContext(): Promise<void> {
    if (!hasWindow)
      return
    if (ctx) {
      // Resume if the browser auto-suspended (e.g. tab backgrounded).
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume()
        }
        catch (e) {
          error.value = e instanceof Error ? e : new Error(String(e))
        }
      }
      return
    }
    try {
      const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      if (!Ctor)
        throw new Error('Web Audio API not available')
      ctx = new Ctor()
      osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 440
      gain = ctx.createGain()
      gain.gain.value = 0
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      isReady.value = true
      error.value = null
    }
    catch (e) {
      // Most often: NotAllowedError from missing user gesture.
      ctx = null
      osc = null
      gain = null
      isReady.value = false
      error.value = e instanceof Error ? e : new Error(String(e))
    }
  }

  function play(params: ToneParams): void {
    if (!hasWindow)
      return
    if (!ctx || !osc || !gain) {
      // Try to spin up — if we're not in a gesture this will surface an error.
      void ensureContext().then(() => {
        if (ctx && osc && gain)
          play(params)
      })
      return
    }
    if (ctx.state === 'suspended')
      void ctx.resume()
    current = { ...params }
    const now = ctx.currentTime
    osc.frequency.cancelScheduledValues(now)
    osc.frequency.setValueAtTime(Math.max(params.frequencyHz, 1), now)
    restartSchedule()
    isPlaying.value = true
  }

  function stop(): void {
    if (!hasWindow)
      return
    current = null
    clearScheduleTimer()
    if (ctx && gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
    }
    nextScheduleTime = 0
    isPlaying.value = false
  }

  function playForVario(
    varioCmS: number,
    curves: VarioCurvesShape,
    volume: number,
  ): ToneParams | null {
    const xs = curves.buzzer_vario_dots
    const fs = curves.buzzer_frequency_dots
    const cs = curves.buzzer_cycle_dots
    const ds = curves.buzzer_duty_dots
    if (!xs || !fs || !cs || !ds)
      return null
    const n = xs.length
    if (n < 2 || fs.length !== n || cs.length !== n || ds.length !== n)
      return null
    const params: ToneParams = {
      frequencyHz: interpolateCurve(xs, fs, varioCmS),
      cycleMs: interpolateCurve(xs, cs, varioCmS),
      dutyPercent: interpolateCurve(xs, ds, varioCmS),
      volume: Math.min(Math.max(volume, 0), 1),
    }
    play(params)
    return params
  }

  onScopeDispose(() => {
    stop()
    if (osc) {
      try {
        osc.stop()
      }
      catch {
        // already stopped — ignore
      }
      try {
        osc.disconnect()
      }
      catch {}
      osc = null
    }
    if (gain) {
      try {
        gain.disconnect()
      }
      catch {}
      gain = null
    }
    if (ctx) {
      void ctx.close().catch(() => {})
      ctx = null
    }
    isReady.value = false
  })

  function setParamsProvider(provider: (() => ToneParams | null) | null): void {
    const wasActive = paramsProvider !== null
    paramsProvider = provider
    const nowActive = provider !== null
    // Reset the scheduler tick to the new mode's interval. Skip when nothing
    // is currently playing — the next play() will pick the right interval.
    if (scheduleTimer && wasActive !== nowActive) {
      clearScheduleTimer()
      const intervalMs = nowActive ? SCHEDULE_INTERVAL_STEP_MS : SCHEDULE_INTERVAL_SMOOTH_MS
      scheduleTimer = setInterval(fillSchedule, intervalMs)
    }
  }

  return {
    isReady: readonly(isReady),
    isPlaying: readonly(isPlaying),
    error: readonly(error),
    ensureContext,
    play,
    stop,
    playForVario,
    setParamsProvider,
  }
}
