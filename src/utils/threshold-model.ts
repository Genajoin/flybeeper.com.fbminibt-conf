/**
 * Tone-threshold model for the sound emulator: XCTracer-style ON/OFF pairs
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
 * `vario < sink_on`. The model adds one memory bit (XCTracer's toneIsOn): once
 * on, the sound turns off only inside [SinkOff … ClimbOffEff]. With
 * ClimbOff = ClimbOn and SinkOff = SinkOn the memory has nothing to hold.
 *
 * Two deliberate departures from the firmware's trend logic (owner's call):
 *  - "weakening" needs the reading to sit more than WEAKENING_MARGIN_CM below
 *    the average, not just below it. Any steady descent puts the reading under
 *    the lagging EMA, so the firmware rule fires on every slow fade and the
 *    early exit swallows the ClimbOff hold entirely;
 *  - hyst = 0 switches the trend logic off (pure XCTracer). The firmware
 *    replaces hyst ≤ 0 with 25 instead.
 * With margin 0 and hyst > 0 decide() is still exactly the firmware rule when
 * OFF = ON (see the test).
 */

/** All values in cm/s, as on the wire. */
export interface ThresholdParams {
  climbOn: number
  climbOff: number
  sinkOn: number
  sinkOff: number
  /** Trend hysteresis on the climb side. 0 = no trend logic (pure XCTracer). */
  hyst: number
}

export interface ModelState {
  /** Firmware's `vario_avg`: the EMA scaled by 10. */
  emaX10: number
  toneOn: boolean
}

export const FIRMWARE_TICK_MS = 40

export function emaStep(emaX10: number, varioCm: number): number {
  return Math.trunc(emaX10 * 9 / 10) + varioCm
}

export function emaValue(emaX10: number): number {
  return Math.trunc(emaX10 / 10)
}

/**
 * How far below its average the vario must be for the climb to count as
 * weakening, cm/s. The firmware EMA (9/10 per 40 ms tick) lags a steady
 * descent by ≈ 0.36 s × rate: 0.2 m/s per second (the demo, a slowly fading
 * thermal) lags 6–7 cm/s, 0.5 m/s per second 17–18, a thermal dropping out at
 * 1–2 m/s per second 35–72. 15 cm/s sits at ≈ 0.45 m/s per second: twice the
 * demo's rate, so a slow fade keeps the ClimbOff hold and a real drop-out
 * still exits early.
 */
export const WEAKENING_MARGIN_CM = 15

/**
 * Climb is weakening: the reading is clearly (more than `margin`) below its
 * average and the average itself is still above ClimbOn. With margin 0 this
 * is the firmware's `is_climb_decrease`. Never true with hyst = 0.
 */
export function isWeakening(p: ThresholdParams, varioCm: number, emaCm: number, margin = WEAKENING_MARGIN_CM): boolean {
  return p.hyst > 0 && emaCm - varioCm > margin && emaCm > p.climbOn
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
  | 'sink-hold' // on, held by memory between SinkOn and SinkOff (sniffer window)
  | 'quiet' // off, inside the silent window
  | 'quiet-early' // off because the climb is weakening (early exit)
  | 'quiet-memory' // off, inside a memory zone entered from the silent side

/**
 * One decision, as the firmware takes it in a pause. Returns the new on/off
 * state and why.
 */
export function decide(p: ThresholdParams, toneOn: boolean, varioCm: number, emaCm: number, margin = WEAKENING_MARGIN_CM): { toneOn: boolean, reason: Reason } {
  const weakening = isWeakening(p, varioCm, emaCm, margin)
  const { climbOnEff, climbOffEff } = effectiveThresholds(p, weakening)
  if (varioCm > climbOnEff)
    return { toneOn: true, reason: 'climb' }
  if (varioCm < p.sinkOn)
    return { toneOn: true, reason: 'sink' }
  if (toneOn) {
    const inQuietWindow = varioCm >= p.sinkOff && varioCm <= climbOffEff
    if (!inQuietWindow)
      return { toneOn: true, reason: varioCm < p.sinkOff ? 'sink-hold' : 'climb-hold' }
  }
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
