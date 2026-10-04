/**
 * Sound trigger presets: WHEN the vario sounds near zero (climb / sink tone
 * thresholds, their holds, the early exit and the vario averaging), as opposed
 * to the curve presets, which set HOW it sounds.
 *
 * Values in device units: thresholds m/s, averaging seconds. Ranges drawn from
 * the manuals of XC Tracer, Flymaster, BlueFly, Digifly, Syride and Flytec
 * (climb tone 0…+0.3, a sniffer from −0.2…−0.5, sink alarm −2…−3 and
 * more damping for rough air).
 */

export const CLIMB_ON_UUID = 'fcb14ed9-06e7-4a9e-b311-6eee676a2f48'
export const CLIMB_OFF_UUID = '1673f137-66c1-4ff0-8db3-69b9ed7c33e0'
export const SINK_ON_UUID = 'b713f438-42fe-46fe-b052-371a3b9e433a'
export const SINK_OFF_UUID = '8a78979b-1425-4160-b34b-ac5aadddeb21'
export const HYST_UUID = '0e984fe9-534c-4f13-969c-58ce03d33527'
export const AVERAGE_UUID = '7e035080-7417-4393-959a-58505ef9cf4a'

export interface TriggerValues {
  climbOn: number
  climbOff: number
  sinkOn: number
  sinkOff: number
  /** Early exit on a weakening climb; 0 = off, the ClimbOff hold works instead. */
  hyst: number
  /** Vario averaging, s. */
  average: number
}

export const TRIGGER_UUIDS: Record<keyof TriggerValues, string> = {
  climbOn: CLIMB_ON_UUID,
  climbOff: CLIMB_OFF_UUID,
  sinkOn: SINK_ON_UUID,
  sinkOff: SINK_OFF_UUID,
  hyst: HYST_UUID,
  average: AVERAGE_UUID,
}

export const TRIGGER_PRESETS = {
  // Firmware defaults (FbFANET settings.h): climb-off above climb-on and
  // sink-off below sink-on mean "no hold".
  factory: { climbOn: 0.05, climbOff: 0.3, sinkOn: -2.5, sinkOff: -2.7, hyst: 0.25, average: 0.1 },
  // Goes quiet the moment the climb fades: active centring, competition.
  sharp: { climbOn: 0.1, climbOff: 0.1, sinkOn: -2, sinkOff: -2, hyst: 0.15, average: 0.1 },
  // Weak broken flatland thermals: keep hearing a weak core.
  flatland: { climbOn: 0.05, climbOff: -0.2, sinkOn: -2.5, sinkOff: -2.5, hyst: 0, average: 0.4 },
  // Strong rough mountain air: fewer false beeps, calmer tone.
  mountain: { climbOn: 0.3, climbOff: 0.1, sinkOn: -3, sinkOff: -2.5, hyst: 0, average: 0.6 },
  // Air rising slower than the glider sinks: a tone from −0.3.
  sniffer: { climbOn: -0.3, climbOff: -0.4, sinkOn: -2.5, sinkOff: -2.5, hyst: 0, average: 0.3 },
  // Almost always sounding: sink tone from −0.4, held after sink up to +0.05.
  always: { climbOn: 0.1, climbOff: 0.1, sinkOn: -0.4, sinkOff: 0.05, hyst: 0, average: 0.3 },
  // Minimum of sound: ridge soaring, acro, beginners.
  quiet: { climbOn: 0.3, climbOff: 0.3, sinkOn: -4, sinkOff: -4, hyst: 0.1, average: 0.5 },
} satisfies Record<string, TriggerValues>

export type TriggerPresetKey = keyof typeof TRIGGER_PRESETS

export const TRIGGER_PRESET_KEYS = Object.keys(TRIGGER_PRESETS) as TriggerPresetKey[]

/** The preset the device's values match, or null. Absent values don't count against. */
export function matchTriggerPreset(cur: Partial<TriggerValues>): TriggerPresetKey | null {
  if (Object.values(cur).every(v => v === undefined))
    return null
  const same = (a: number | undefined, b: number) => a === undefined || Math.abs(a - b) < 0.005
  for (const k of TRIGGER_PRESET_KEYS) {
    const p = TRIGGER_PRESETS[k]
    if ((Object.keys(p) as (keyof TriggerValues)[]).every(f => same(cur[f], p[f])))
      return k
  }
  return null
}
