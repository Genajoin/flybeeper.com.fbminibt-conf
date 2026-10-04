import { describe, expect, it } from 'vitest'
import { soundParams } from '../src/utils/threshold-model'
import { TRIGGER_PRESETS, TRIGGER_PRESET_KEYS, matchTriggerPreset, needsNewFirmware } from '../src/utils/trigger-presets'

const cm = (v: number) => Math.round(v * 100)

describe('trigger presets', () => {
  it('factory is the firmware defaults and runs on the current firmware', () => {
    expect(TRIGGER_PRESETS.factory).toEqual({ climbOn: 0.05, climbOff: 0.3, sinkOn: -2.5, sinkOff: -2.7, hyst: 0.25, average: 0.1 })
    expect(needsNewFirmware(TRIGGER_PRESETS.factory)).toBe(false)
    expect(needsNewFirmware(TRIGGER_PRESETS.sharp)).toBe(false)
  })

  it('presets relying on holds or early exit 0 are flagged', () => {
    for (const k of ['flatland', 'mountain', 'sniffer', 'always'] as const)
      expect(needsNewFirmware(TRIGGER_PRESETS[k])).toBe(true)
  })

  it('every preset matches itself and nothing else', () => {
    for (const k of TRIGGER_PRESET_KEYS)
      expect(matchTriggerPreset(TRIGGER_PRESETS[k])).toBe(k)
  })

  it('a changed value is custom; a missing characteristic does not count against', () => {
    expect(matchTriggerPreset({ ...TRIGGER_PRESETS.sharp, average: 0.2 })).toBeNull()
    const { average: _, ...noAvg } = TRIGGER_PRESETS.mountain
    expect(matchTriggerPreset(noAvg)).toBe('mountain')
    expect(matchTriggerPreset({})).toBeNull()
  })

  it('every preset reads back in the sound model as written (holds on the right side)', () => {
    for (const k of TRIGGER_PRESET_KEYS) {
      const p = TRIGGER_PRESETS[k]
      const m = soundParams(cm(p.climbOn), cm(p.climbOff), cm(p.sinkOn), cm(p.sinkOff), cm(p.hyst))
      expect(m.climbOff).toBe(Math.min(cm(p.climbOff), cm(p.climbOn)))
      expect(m.sinkOff).toBe(Math.max(cm(p.sinkOff), cm(p.sinkOn)))
    }
  })
})
