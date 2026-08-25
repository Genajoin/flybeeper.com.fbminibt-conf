import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePresetJson, presetNameFromFilename } from '../src/utils/preset-import'

const VOLUME = '67f82d94-2b2a-4123-81c9-058e460c3d01'
const CLIMB_ON = 'fcb14ed9-06e7-4a9e-b311-6eee676a2f48'
const CLIMB_OFF = '1673f137-66c1-4ff0-8db3-69b9ed7c33e0'
const SINK_ON = 'b713f438-42fe-46fe-b052-371a3b9e433a'
const SINK_OFF = '8a78979b-1425-4160-b34b-ac5aadddeb21'
const VARIO_DOTS = '512d6d89-7a6f-461c-983e-902b68d40f56'
const FREQ_DOTS = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CYCLE_DOTS = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const DUTY_DOTS = '98c16914-00ad-47ba-b625-148f0baaec47'
const SILENT = 'daadb8a9-a566-450e-97d0-990a0c8487dd'
const HID_OFF = '86591053-2856-4f25-a35c-b753f0deea8f'
const NEVER_SLEEP = 'd9eec180-344e-41e3-8c18-adf312dce8bb'
const UART = '84ccd3d4-a262-45e6-b616-d4a4ae7c0d5b'
const SIMULATOR = '904baf04-5814-11ee-8c99-0242ac120002'

describe('preset-import: current (v2) format', () => {
  it('reads the wrapped shape this app exports', () => {
    const text = JSON.stringify({
      name: 'Aggressive thermal',
      by: '@pilot',
      settings: { [VOLUME]: 2, [SILENT]: true, [VARIO_DOTS]: [-10, -2, -1.99, -1.11, -1.08, -0.02, -0.01, 0.3, 1.05, 1.89, 3.49, 10] },
    })
    const p = parsePresetJson(text)
    expect(p).not.toBeNull()
    expect(p?.format).toBe('v2')
    expect(p?.name).toBe('Aggressive thermal')
    expect(p?.by).toBe('@pilot')
    expect(p?.settings[VOLUME]).toBe(2)
    expect(p?.settings[SILENT]).toBe(true)
    expect(p?.skipped).toBe(0)
  })

  it('accepts a bare UUID bag (hand-edited file)', () => {
    const p = parsePresetJson(JSON.stringify({ [VOLUME]: 3 }), 'my-preset')
    expect(p?.format).toBe('v2')
    expect(p?.settings).toEqual({ [VOLUME]: 3 })
    // Falls back to the filename when the file carries no name.
    expect(p?.name).toBe('my-preset')
  })
})

describe('preset-import: old cpf-list format (v1, fw ≥0.15)', () => {
  it('converts a real exported file', () => {
    // jsdom gives import.meta.url an http: scheme, so resolve off the
    // vitest root (= repo root) instead.
    const path = resolve(process.cwd(), 'test/fixtures/old-cpf-list.json')
    const p = parsePresetJson(readFileSync(path, 'utf-8'), 'FBminiBT-mymyser3')
    expect(p).not.toBeNull()
    expect(p?.format).toBe('cpf-list')
    // Values are already CPF-formatted — imported verbatim, no /100.
    expect(p?.settings[VOLUME]).toBe(1)
    expect(p?.settings[CLIMB_ON]).toBe(0.1)
    expect(p?.settings[SINK_ON]).toBe(-2)
    expect(p?.settings[HID_OFF]).toBe(true)
    expect(p?.settings[SILENT]).toBe(false)
    expect(p?.settings[VARIO_DOTS]).toEqual([-10, -2, -1.99, -1.11, -1.08, -0.02, -0.01, 0.3, 1.05, 1.89, 3.49, 10])
    expect(p?.settings[FREQ_DOTS]).toEqual([200, 294, 294, 320, 250, 420, 443, 536, 633, 702, 799, 1060])
  })

  it('drops the Generic Attribute junk entries these files carry', () => {
    const text = JSON.stringify([
      { uuid: '00000001-0000-1000-8000-00805f9b34fb', name: null, value: {} },
      { uuid: '00000002-0000-1000-8000-00805f9b34fb', name: null, value: {} },
      { uuid: VOLUME, name: 'buzzer_volume', value: 1 },
    ])
    const p = parsePresetJson(text)
    expect(Object.keys(p!.settings)).toEqual([VOLUME])
    expect(p?.skipped).toBe(2)
  })

  it('never restores the simulator characteristic', () => {
    const text = JSON.stringify([
      { uuid: SIMULATOR, name: 'vario_simulator_value_cm_s', value: 250 },
      { uuid: VOLUME, name: 'buzzer_volume', value: 1 },
    ])
    const p = parsePresetJson(text)
    expect(p?.settings[SIMULATOR]).toBeUndefined()
    expect(p?.settings[VOLUME]).toBe(1)
  })
})

describe('preset-import: legacy struct format (v1, fw ≤0.15)', () => {
  const legacy = {
    buzzer_volume: 2,
    climb_tone_on_threshold_cm: 10,
    climb_tone_off_threshold_cm: 5,
    sink_tone_off_threshold_cm: -100,
    sink_tone_on_threshold_cm: -150,
    curves: {
      buzzer_vario_dots: [-1400, -800, -100, 0, 5, 20, 100, 200, 300, 450, 1200, 2000],
      buzzer_frequency_dots: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
      buzzer_cycle_dots: [850, 790, 725, 750, 665, 595, 430, 325, 265, 210, 120, 100],
      buzzer_duty_dots: [100, 98, 95, 38, 40, 41, 43, 46, 49, 54, 78, 90],
    },
    buzzer_simulate_vario_value: 0,
    uart_protocols: 1,
    silent_on_ground: true,
    ble_never_sleep: false,
    led_blinky_by_vario: false,
    hid_keyboard_off: true,
  }

  it('converts cm/s thresholds and vario breakpoints to m/s', () => {
    const p = parsePresetJson(JSON.stringify(legacy))
    expect(p?.format).toBe('legacy-struct')
    expect(p?.settings[CLIMB_ON]).toBe(0.1)
    expect(p?.settings[CLIMB_OFF]).toBe(0.05)
    expect(p?.settings[SINK_ON]).toBe(-1.5)
    expect(p?.settings[SINK_OFF]).toBe(-1)
    expect(p?.settings[VARIO_DOTS]).toEqual([-14, -8, -1, 0, 0.05, 0.2, 1, 2, 3, 4.5, 12, 20])
  })

  it('leaves Hz / ms / % curves untouched', () => {
    const p = parsePresetJson(JSON.stringify(legacy))
    expect(p?.settings[FREQ_DOTS]).toEqual(legacy.curves.buzzer_frequency_dots)
    expect(p?.settings[CYCLE_DOTS]).toEqual(legacy.curves.buzzer_cycle_dots)
    expect(p?.settings[DUTY_DOTS]).toEqual(legacy.curves.buzzer_duty_dots)
  })

  it('maps the packed feature bits and scalars', () => {
    const p = parsePresetJson(JSON.stringify(legacy))
    expect(p?.settings[VOLUME]).toBe(2)
    expect(p?.settings[UART]).toBe(1)
    expect(p?.settings[SILENT]).toBe(true)
    expect(p?.settings[NEVER_SLEEP]).toBe(false)
    expect(p?.settings[HID_OFF]).toBe(true)
    // buzzer_simulate_vario_value is a live command, not a setting.
    expect(p?.skipped).toBe(1)
  })
})

describe('preset-import: rejection', () => {
  it('returns null for non-JSON', () => {
    expect(parsePresetJson('not json at all')).toBeNull()
  })

  it('returns null for JSON that holds no known setting', () => {
    expect(parsePresetJson(JSON.stringify({ hello: 'world' }))).toBeNull()
    expect(parsePresetJson(JSON.stringify([{ uuid: 'nope', value: 1 }]))).toBeNull()
    expect(parsePresetJson(JSON.stringify({ settings: {} }))).toBeNull()
  })

  it('returns null for a scalar payload', () => {
    expect(parsePresetJson('42')).toBeNull()
    expect(parsePresetJson('"a string"')).toBeNull()
  })
})

describe('presetNameFromFilename', () => {
  it('strips path and extension', () => {
    expect(presetNameFromFilename('FBminiBT-settings.json')).toBe('FBminiBT-settings')
    expect(presetNameFromFilename('/tmp/My Preset.JSON')).toBe('My Preset')
  })
})
