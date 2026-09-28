import { describe, expect, it } from 'vitest'
import type { DiagAction, DiagSample, DiagnosticsReport } from '../src/utils/diagnostics'
import {
  DIAGNOSTICS_SCHEMA,
  MAILTO_MAX_LENGTH,
  actionLine,
  batteryTraceSummary,
  disconnectsWithBattery,
  mailSubject,
  mailtoUrl,
  pushAction,
  reportFileName,
  reportText,
  summaryLines,
  trend,
  voltageRate,
} from '../src/utils/diagnostics'

function sample(minute: number, batteryV: number | null, batteryPct: number | null = null): DiagSample {
  return {
    t: new Date(Date.UTC(2026, 8, 28, 10, minute)).toISOString(),
    device: 'FBSV.9BFC',
    connected: true,
    batteryPct,
    batteryV,
    pressurePa: 95000,
    varioMs: 0.1,
    temperatureC: 21,
    readLatencyMs: 40,
  }
}

function report(overrides: Partial<DiagnosticsReport> = {}): DiagnosticsReport {
  return {
    schema: DIAGNOSTICS_SCHEMA,
    generatedAt: '2026-09-28T10:30:00.000Z',
    app: { build: 'f981ed7', buildDate: '2026-09-28', url: 'https://config.flybeeper.com/diagnostics', locale: 'en', standalone: false },
    problem: '',
    env: {
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/140',
      platform: 'Android',
      languages: ['en'],
      bleAvailable: true,
      bleUnavailableReason: null,
      getDevicesSupported: true,
    },
    device: {
      name: 'FBSV.9BFC',
      model: 'fbsv',
      manufacturer: 'FlyBeeper',
      serial: '0B00000000000001',
      hardwareRevision: '10',
      firmwareRevision: '0.29.1',
      softwareRevision: null,
      systemId: null,
      pnpId: null,
    },
    firmware: {
      slots: [
        { image: 0, slot: 0, version: '0.29.1', hash: 'ab'.repeat(32), active: true, confirmed: true, pending: false, bootable: true, permanent: false },
        { image: 0, slot: 1, version: '0.28.3', hash: 'cd'.repeat(32), active: false, confirmed: false, pending: false, bootable: true, permanent: false },
      ],
      bootloader: { bootloader: 'MCUboot', mode: 3 },
      osInfo: null,
      error: null,
    },
    deviceSeen: { first: '2026-09-28T10:00:00.000Z', last: '2026-09-28T10:00:00.000Z' },
    otherDevices: [],
    actions: [],
    characteristics: [
      {
        service: 'FlyBeeper Settings (904baf04-5814-11ee-8c99-0242ac120000)',
        uuid: 'd9eec180-344e-41e3-8c18-adf312dce8bb',
        name: 'Bluetooth never sleep',
        value: true,
        display: 'on',
        unit: '',
        raw: '01',
        props: 'read,write',
      },
    ],
    incompleteChars: [],
    samples: [],
    batteryTrace: [],
    events: [],
    errors: { connect: null, firmwareUpdate: null },
    log: [],
    unavailable: [],
    ...overrides,
  }
}

describe('trend', () => {
  it('fits a per-hour rate once the span is long enough', () => {
    const s = [0, 10, 20, 30].map(m => sample(m, 3.7 - m * 0.001))
    const tr = trend(s, 'batteryV')!
    expect(tr.n).toBe(4)
    expect(tr.spanMin).toBe(30)
    expect(tr.perHour).toBeCloseTo(-0.06, 5)
  })

  it('refuses a rate over a span too short to mean anything', () => {
    const tr = trend([sample(0, 3.7), sample(1, 3.69)], 'batteryV')!
    expect(tr.perHour).toBeNull()
    expect(tr.last).toBe(3.69)
  })

  it('returns null when the device never reported the value', () => {
    expect(trend([sample(0, null)], 'batteryV')).toBeNull()
  })
})

describe('summary and subject', () => {
  it('puts model, serial and firmware into the subject', () => {
    expect(mailSubject(report())).toBe('FlyBeeper diagnostics: fbsv · S/N 0B00000000000001 · FBSV.9BFC · FW 0.29.1')
  })

  it('still produces a subject with no device', () => {
    expect(mailSubject(report({ device: null, firmware: null }))).toBe('FlyBeeper diagnostics')
  })

  it('surfaces ble_never_sleep, the running image and the bootloader', () => {
    const lines = summaryLines(report()).join('\n')
    expect(lines).toContain('ble_never_sleep: on')
    expect(lines).toContain('Running image: 0.29.1 confirmed (slot 0)')
    expect(lines).toContain('Board revision: 10')
    expect(lines).toContain('Bootloader: MCUboot mode 3')
  })

  it('says when a key setting is not exposed by the firmware', () => {
    const lines = summaryLines(report()).join('\n')
    expect(lines).toContain('volume: not exposed by this firmware')
  })

  it('says plainly when no device is connected', () => {
    const lines = summaryLines(report({ device: null, firmware: null, characteristics: [] }))
    expect(lines[0]).toBe('Device: not connected')
    expect(lines.some(l => l.startsWith('Configurator: f981ed7'))).toBe(true)
  })
})

describe('mailto', () => {
  const text = { problemPrompt: 'Describe the problem here:', problem: '', attachRequest: 'Please attach the file.' }

  it('stays under the length limit even with a long session log and many samples', () => {
    const r = report({
      samples: Array.from({ length: 200 }, (_, i) => sample(i, 3.7 - i * 0.001, 90 - i * 0.1)),
      log: Array.from({ length: 300 }, (_, i) => ({ t: '2026-09-28T10:00:00Z', level: 'error', msg: `failure ${i}` })),
      errors: { connect: 'GATT operation failed for unknown reason. '.repeat(10), firmwareUpdate: null },
    })
    const url = mailtoUrl(r, 'flybeeper@alpisto.eu', text)
    expect(url.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH)
    const body = decodeURIComponent(url.split('&body=')[1])
    // The head — prompt and the request to attach the file — always survives.
    expect(body.startsWith('Describe the problem here:')).toBe(true)
    expect(body).toContain('Please attach the file.')
    expect(body).toContain('Device: fbsv 0B00000000000001')
  })

  it('shortens an overlong problem description instead of overflowing', () => {
    const url = mailtoUrl(report(), 'flybeeper@alpisto.eu', { ...text, problem: 'Прибор разряжается в выключенном состоянии. '.repeat(100) })
    expect(url.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH)
    expect(decodeURIComponent(url.split('&body=')[1])).toContain('Please attach the file.')
  })

  it('addresses support with an encoded subject', () => {
    const url = mailtoUrl(report(), 'flybeeper@alpisto.eu', text)
    expect(url.startsWith('mailto:flybeeper@alpisto.eu?subject=FlyBeeper%20diagnostics')).toBe(true)
  })
})

describe('full text and file name', () => {
  it('lists slots, characteristics and the unavailable fields', () => {
    const txt = reportText(report({ problem: 'Drains when off', unavailable: ['Device information: pnpId (not exposed by this firmware)'] }))
    expect(txt).toContain('== Problem (from the user) ==\nDrains when off')
    expect(txt).toContain('image 0 slot 0: 0.29.1 [active, confirmed, bootable]')
    expect(txt).toContain('Bluetooth never sleep (d9eec180-344e-41e3-8c18-adf312dce8bb): on')
    expect(txt).toContain('pnpId (not exposed by this firmware)')
  })

  it('makes a filesystem-safe file name', () => {
    expect(reportFileName(report())).toBe('flybeeper-diagnostics_FBSV.9BFC_2026-09-28T103000Z.json')
  })
})

describe('user action log', () => {
  const at = (sec: number) => new Date(Date.UTC(2026, 8, 28, 10, 0, sec)).toISOString()

  it('keeps the range and duration of a simulator drag', () => {
    const list: DiagAction[] = []
    const vals = [0.5, 2, 4.2, 1, -3.1, 0]
    vals.forEach((v, i) => pushAction(list, { t: at(i), kind: 'simulator', msg: `device plays simulated vario: ${v} m/s`, key: 'sim:device', value: v, unit: 'm/s' }, 3000, 100))
    expect(list).toHaveLength(1)
    expect(actionLine(list[0])).toBe(`${at(0)} [simulator] device plays simulated vario: 0 m/s (×6, range -3.10 … 4.20 m/s, 5 s, until 10:00:05)`)
  })

  it('does not fold device and browser playback together', () => {
    const list: DiagAction[] = []
    pushAction(list, { t: at(0), kind: 'simulator', msg: 'device', key: 'sim:device', value: 1 }, 3000, 100)
    pushAction(list, { t: at(1), kind: 'audio', msg: 'sound preview source: browser' }, 3000, 100)
    pushAction(list, { t: at(2), kind: 'simulator', msg: 'browser', key: 'sim:browser', value: 2 }, 3000, 100)
    expect(list.map(a => a.msg)).toEqual(['device', 'sound preview source: browser', 'browser'])
  })

  it('folds a slider drag into one entry with the final value', () => {
    const list: DiagAction[] = []
    for (const [sec, v] of [[0, 20], [1, 40], [2, 60]] as const)
      pushAction(list, { t: at(sec), kind: 'edit', msg: `Buzzer Volume → ${v}`, key: 'e:vol' }, 3000, 100)
    expect(list).toHaveLength(1)
    expect(list[0].msg).toBe('Buzzer Volume → 60')
    expect(list[0].n).toBe(3)
  })

  it('keeps separate entries for different controls and for pauses', () => {
    const list: DiagAction[] = []
    pushAction(list, { t: at(0), kind: 'edit', msg: 'a', key: 'e:a' }, 3000, 100)
    pushAction(list, { t: at(1), kind: 'edit', msg: 'b', key: 'e:b' }, 3000, 100)
    pushAction(list, { t: at(10), kind: 'edit', msg: 'b2', key: 'e:b' }, 3000, 100)
    pushAction(list, { t: at(11), kind: 'connect', msg: 'disconnect' }, 3000, 100)
    pushAction(list, { t: at(11), kind: 'connect', msg: 'disconnect' }, 3000, 100)
    expect(list.map(a => a.msg)).toEqual(['a', 'b', 'b2', 'disconnect', 'disconnect'])
  })

  it('drops the oldest entries past the cap', () => {
    const list: DiagAction[] = []
    for (let i = 0; i < 5; i++)
      pushAction(list, { t: at(i), kind: 'navigate', msg: `open /${i}` }, 3000, 3)
    expect(list.map(a => a.msg)).toEqual(['open /2', 'open /3', 'open /4'])
  })

  it('prints the actions in the report and counts them in the summary', () => {
    const r = report({
      actions: [
        { t: at(0), kind: 'simulator', msg: 'simulator vario 2.00 m/s (sent to the device)', key: 'sim', n: 12 },
        { t: at(5), kind: 'write', msg: 'Buzzer Volume = 3 — written to the device' },
      ],
    })
    const txt = reportText(r)
    expect(txt).toContain('[simulator] simulator vario 2.00 m/s (sent to the device) (×12)')
    expect(summaryLines(r).join('\n')).toContain('User actions logged: 2 (last: Buzzer Volume = 3 — written to the device)')
  })
})

describe('fast battery trace', () => {
  const at = (sec: number) => new Date(Date.UTC(2026, 8, 28, 10, 0, sec)).toISOString()
  // USB pulled at 0 s: VDD sags 10 mV every 3 s, the link drops at 30 s.
  const trace = Array.from({ length: 10 }, (_, i) => ({ t: at(i * 3), device: 'FBSV.9BFC', mV: 3600 - i * 10, pct: null }))
  const events = [{ t: at(30), event: 'disconnected' }]

  it('measures the voltage slope in mV per minute', () => {
    expect(voltageRate(trace)).toBeCloseTo(-200, 5)
  })

  it('needs two voltage readings for a rate', () => {
    expect(voltageRate(trace.slice(0, 1))).toBeNull()
    expect(voltageRate([{ t: at(0), device: null, mV: null, pct: 80 }, { t: at(3), device: null, mV: null, pct: 79 }])).toBeNull()
  })

  it('names the last reading before each disconnect', () => {
    const [d] = disconnectsWithBattery({ events, batteryTrace: trace })
    expect(d.last?.mV).toBe(3510)
    expect(d.agoSec).toBe(3)
  })

  it('shows the drop in the summary and the timeline in the text', () => {
    const r = report({ batteryTrace: trace, events })
    const lines = summaryLines(r).join('\n')
    expect(lines).toContain('Disconnected 10:00:30: last reading 3510 mV 3 s before')
    expect(batteryTraceSummary(trace)).toContain('min 3510 mV, max 3600 mV')
    const txt = reportText(r)
    expect(txt).toContain(`${at(27)} 3510 mV\n${at(30)} ** disconnected`)
  })
})
