import { describe, expect, it } from 'vitest'
import type { DiagSample, DiagnosticsReport } from '../src/utils/diagnostics'
import {
  DIAGNOSTICS_SCHEMA,
  MAILTO_MAX_LENGTH,
  mailSubject,
  mailtoUrl,
  reportFileName,
  reportText,
  summaryLines,
  trend,
} from '../src/utils/diagnostics'

function sample(minute: number, batteryV: number | null, batteryPct: number | null = null): DiagSample {
  return {
    t: new Date(Date.UTC(2026, 8, 28, 10, minute)).toISOString(),
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
