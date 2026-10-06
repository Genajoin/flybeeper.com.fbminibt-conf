/**
 * Tone-threshold model for the sound emulator: ON/OFF threshold pairs
 * with memory, combined with the FlyBeeper trend hysteresis on the climb side.
 *
 * Pure functions, no Vue — unit-tested in test/threshold-model.test.ts.
 *
 * Firmware reference (FbFANET buzzer.c, buzzer_play_vario_thread_cb), what the
 * model mirrors:
 *  - the loop ticks every 40 ms and updates the EMA on EVERY tick:
 *    `vario_avg = vario_avg * 9 / 10 + vario_cm` (C integer division), the
 *    average itself is `vario_avg / 10`;
 *  - the sound decision is taken only while the buzzer is NOT in a tone phase
 *    (pause between beeps, or silence) — a beep that already started always
 *    plays to its end;
 *  - comparisons are strict for turning on (`vario > climb_th`,
 *    `vario < sink_on`).
 *
 * The firmware is stateless: the sound is on iff `vario > climb_th` or
 * `vario < sink_on`. The model adds one memory bit (which tone is playing): once
 * on, the sound turns off only inside [SinkOff … ClimbOffEff]. With
 * ClimbOff = ClimbOn and SinkOff = SinkOn the memory has nothing to hold.
 *
 * The trend logic is the firmware's own: any reading below the average counts
 * as weakening, so with hyst > 0 every fade of a climb ends at ClimbOn + hyst —
 * earlier than ClimbOn, to make up for the smoothing lag (owner's design). It
 * overrides the ClimbOff hold on a fade: the two pull opposite ways, and the
 * pilot picks one — hyst > 0 to go silent early, hyst = 0 for the classic
 * hold down to ClimbOff. The one departure: hyst = 0 really switches the trend
 * off; the firmware replaces hyst ≤ 0 with 25. With OFF = ON and hyst > 0
 * decide() is exactly the firmware rule (see the test).
 */

/** All values in cm/s, as on the wire. */
export interface ThresholdParams {
  climbOn: number
  climbOff: number
  sinkOn: number
  sinkOff: number
  /** Trend hysteresis on the climb side. 0 = no trend logic (plain ON/OFF pairs). */
  hyst: number
}

export interface ModelState {
  /** Firmware's `vario_avg`: the EMA scaled by 10. */
  emaX10: number
  toneOn: boolean
}

export const FIRMWARE_TICK_MS = 40

/**
 * Firmware's vario averaging (ess.c update_average): an EMA on every 16 ms
 * pressure sample with alpha = 16 / vario_average_ms. One emulator tick of
 * `dtMs` folds those samples in. The firmware falls back to 100 ms outside
 * 16…10000 ms. The emulator runs the simulated value through it too, as
 * the device's simulator is meant to (today's buzzer.c still takes the
 * simulated value as is).
 */
export const PRESSURE_SAMPLE_MS = 16
export const DEFAULT_AVERAGE_MS = 100

export function averageStep(avgCm: number, inputCm: number, averageMs: number, dtMs = FIRMWARE_TICK_MS): number {
  const period = averageMs >= PRESSURE_SAMPLE_MS && averageMs <= 10000 ? averageMs : DEFAULT_AVERAGE_MS
  const keep = (1 - PRESSURE_SAMPLE_MS / period) ** (dtMs / PRESSURE_SAMPLE_MS)
  return inputCm + (avgCm - inputCm) * keep
}

export function emaStep(emaX10: number, varioCm: number): number {
  return Math.trunc(emaX10 * 9 / 10) + varioCm
}

export function emaValue(emaX10: number): number {
  return Math.trunc(emaX10 / 10)
}

/**
 * Climb is weakening: the reading is below its average and the average itself
 * is still above ClimbOn — the firmware's `is_climb_decrease`. Never true with
 * hyst = 0.
 */
export function isWeakening(p: ThresholdParams, varioCm: number, emaCm: number): boolean {
  return p.hyst > 0 && varioCm < emaCm && emaCm > p.climbOn
}

/** Thresholds in effect right now, given the trend. */
export function effectiveThresholds(p: ThresholdParams, weakening: boolean) {
  const early = p.climbOn + p.hyst
  return {
    /** Sound turns on above this (strict). */
    climbOnEff: weakening ? early : p.climbOn,
    /** Sound, if on, turns off at or below this. */
    climbOffEff: weakening ? early : p.climbOff,
  }
}

export type Reason =
  | 'climb' // above the climb-on threshold
  | 'sink' // below the sink-on threshold
  | 'climb-hold' // on, held by memory between ClimbOff and ClimbOn
  | 'sink-hold' // on, held by memory between SinkOn and SinkOff (after-sink window)
  | 'quiet' // off, inside the silent window
  | 'quiet-early' // off because the climb is weakening (early exit)
  | 'quiet-memory' // off, inside a memory zone entered from the silent side

export type ToneSide = 'climb' | 'sink'

/** Which tone a decision left playing, or null when silent. */
export function toneSide(reason: Reason, toneOn: boolean): ToneSide | null {
  if (!toneOn)
    return null
  return reason === 'sink' || reason === 'sink-hold' ? 'sink' : 'climb'
}

/**
 * One decision, as the firmware takes it in a pause. `prev` is the tone that
 * is playing (null = silent): each hold keeps only its own tone — the climb
 * tone holds down to ClimbOff, the sink tone up to SinkOff — so a climb tone
 * falling past ClimbOff stops even where the sink hold would begin.
 */
export function decide(p: ThresholdParams, prev: ToneSide | null, varioCm: number, emaCm: number): { toneOn: boolean, reason: Reason } {
  const weakening = isWeakening(p, varioCm, emaCm)
  const { climbOnEff, climbOffEff } = effectiveThresholds(p, weakening)
  if (varioCm > climbOnEff)
    return { toneOn: true, reason: 'climb' }
  if (varioCm < p.sinkOn)
    return { toneOn: true, reason: 'sink' }
  if (prev === 'climb' && varioCm > climbOffEff)
    return { toneOn: true, reason: 'climb-hold' }
  if (prev === 'sink' && varioCm < p.sinkOff)
    return { toneOn: true, reason: 'sink-hold' }
  if (weakening && varioCm > p.climbOff)
    return { toneOn: false, reason: 'quiet-early' }
  if ((varioCm > p.climbOff && varioCm <= p.climbOn) || (varioCm >= p.sinkOn && varioCm < p.sinkOff))
    return { toneOn: false, reason: 'quiet-memory' }
  return { toneOn: false, reason: 'quiet' }
}

export type ZoneKind = 'sink' | 'sink-memory' | 'quiet' | 'climb-memory' | 'early-exit' | 'climb'

export interface Zone {
  kind: ZoneKind
  /** cm/s; ±Infinity at the open ends. */
  from: number
  to: number
}

/** Static zones along the vario axis, left to right. Empty ones are dropped. */
export function zonesFor(p: ThresholdParams): Zone[] {
  const early = p.climbOn + p.hyst
  const zones: Zone[] = [
    { kind: 'sink', from: -Infinity, to: p.sinkOn },
    { kind: 'sink-memory', from: p.sinkOn, to: p.sinkOff },
    { kind: 'quiet', from: p.sinkOff, to: p.climbOff },
    { kind: 'climb-memory', from: p.climbOff, to: p.climbOn },
    { kind: 'early-exit', from: p.climbOn, to: early },
    { kind: 'climb', from: early, to: Infinity },
  ]
  return zones.filter(z => z.to > z.from)
}

/**
 * Firmware's current behaviour expressed in the model: no memory, the OFF
 * thresholds collapse onto the ON ones. Firmware resets hyst ≤ 0 to 25.
 */
export function firmwareParams(climbOn: number, sinkOn: number, hyst: number): ThresholdParams {
  return { climbOn, climbOff: climbOn, sinkOn, sinkOff: sinkOn, hyst: hyst > 0 ? hyst : 25 }
}

/**
 * The device's sound settings as the model reads them. ClimbOff / SinkOff
 * only widen a memory window, so a value on the wrong side of its ON partner
 * (the old firmware defaults are +0.30 above climb-on and −2.70 below
 * sink-on) means "no hold" — the same as the firmware today, which ignores
 * both fields.
 */
export function soundParams(climbOn: number, climbOff: number | null, sinkOn: number, sinkOff: number | null, hyst: number): ThresholdParams {
  const cf = climbOff === null || climbOff > climbOn ? climbOn : climbOff
  let sf = sinkOff === null || sinkOff < sinkOn ? sinkOn : sinkOff
  sf = Math.min(sf, Math.max(cf, sinkOn))
  // hyst = 0 means "no early exit" here, unlike the firmware (see header).
  return { climbOn, climbOff: Math.max(cf, sf), sinkOn, sinkOff: sf, hyst: Math.max(0, hyst) }
}
