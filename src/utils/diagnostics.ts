/**
 * Diagnostics report — the shape and its text renderings.
 *
 * Pure on purpose: collection (BLE, SMP, sampling) lives in
 * composables/useDiagnostics.ts; everything here turns a collected report into
 * the JSON file, the copy-paste text and the mailto: link, and is unit-tested
 * without a device.
 *
 * Support reads these, so every label here is English regardless of the page
 * language. Only the lines addressed to the pilot inside the email (the
 * "describe the problem" prompt, the "attach the file" request) come in
 * localised, from the caller.
 */

export const DIAGNOSTICS_SCHEMA = 'flybeeper-diagnostics/1'

export interface DiagCharacteristic {
  service: string
  uuid: string
  /** Human label (English), or the UUID when the app has none. */
  name: string
  /** Decoded value as the app understands it — JSON-safe. */
  value: unknown
  /** Value in human units, ready to print. */
  display: string
  unit: string
  /** Raw bytes as hex, when the characteristic was readable. */
  raw: string | null
  props: string
  error?: string
  /** When the value was last seen, and how: read here, notified, or written by the user. */
  at?: string
  source?: 'read' | 'notify' | 'write'
}

export interface DiagSlot {
  image: number
  slot: number
  version: string
  hash: string
  active: boolean
  confirmed: boolean
  pending: boolean
  bootable: boolean
  permanent: boolean
}

export interface DiagSample {
  /** ISO timestamp. */
  t: string
  /** BLE name of the device the sample came from. */
  device: string | null
  connected: boolean
  batteryPct: number | null
  batteryV: number | null
  pressurePa: number | null
  varioMs: number | null
  temperatureC: number | null
  /** Round-trip of one GATT read — a proxy for link quality (RSSI is not exposed to web pages on a live connection). */
  readLatencyMs: number | null
}

export interface DiagEvent {
  t: string
  event: string
}

/** Something the pilot did in the configurator (connect, edit, apply, simulator…). */
export interface DiagAction {
  t: string
  kind: string
  msg: string
  /** Coalescing key — repeated actions on one control inside a short window fold into one entry. */
  key?: string
  /** How many actions were folded into this entry. */
  n?: number
  /** Numeric value of the action (slider position…), and its spread over the folded burst. */
  value?: number
  min?: number
  max?: number
  unit?: string
  /** Time of the last folded action; `t` stays the start of the burst. */
  until?: string
}

/**
 * Append an action, folding a burst on the same control (a slider drag, a
 * held simulator knob) into its latest value instead of flooding the log.
 */
export function pushAction(list: DiagAction[], a: DiagAction, coalesceMs: number, max: number): void {
  const last = list[list.length - 1]
  if (a.key && last?.key === a.key && Date.parse(a.t) - Date.parse(last.until ?? last.t) <= coalesceMs) {
    last.msg = a.msg
    last.until = a.t
    last.n = (last.n ?? 1) + 1
    if (typeof a.value === 'number') {
      last.value = a.value
      last.min = Math.min(last.min ?? a.value, a.value)
      last.max = Math.max(last.max ?? a.value, a.value)
    }
    return
  }
  list.push(typeof a.value === 'number' ? { ...a, min: a.value, max: a.value } : { ...a })
  if (list.length > max)
    list.splice(0, list.length - max)
}

export interface DiagnosticsReport {
  schema: typeof DIAGNOSTICS_SCHEMA
  generatedAt: string
  app: {
    build: string
    buildDate: string
    url: string
    locale: string
    standalone: boolean
  }
  /** What the pilot typed into "describe the problem". */
  problem: string
  env: {
    userAgent: string
    platform: string | null
    languages: string[]
    bleAvailable: boolean
    bleUnavailableReason: string | null
    getDevicesSupported: boolean
  }
  device: {
    /** BLE advertising name — `{MODEL}.{last 4 hex of the hardware id}`. */
    name: string | null
    model: string | null
    manufacturer: string | null
    serial: string | null
    hardwareRevision: string | null
    firmwareRevision: string | null
    softwareRevision: string | null
    systemId: string | null
    pnpId: string | null
  } | null
  firmware: {
    slots: DiagSlot[]
    bootloader: Record<string, unknown> | null
    osInfo: string | null
    error: string | null
  } | null
  /** When the report's device was first and last connected in this session. */
  deviceSeen: { first: string, last: string } | null
  /** Other devices connected earlier in this browser session (BLE names). */
  otherDevices: string[]
  characteristics: DiagCharacteristic[]
  incompleteChars: string[]
  actions: DiagAction[]
  samples: DiagSample[]
  events: DiagEvent[]
  errors: {
    connect: string | null
    firmwareUpdate: string | null
  }
  log: { t: string, level: string, msg: string }[]
  /** Fields the page tried to read and could not, for the support engineer. */
  unavailable: string[]
}

/** Characteristics support asks about first; surfaced in the summary. */
export const KEY_SETTINGS: { uuid: string, label: string }[] = [
  { uuid: 'd9eec180-344e-41e3-8c18-adf312dce8bb', label: 'ble_never_sleep' },
  { uuid: 'daadb8a9-a566-450e-97d0-990a0c8487dd', label: 'silent_on_ground' },
  { uuid: '67f82d94-2b2a-4123-81c9-058e460c3d01', label: 'volume' },
  { uuid: '9a560750-0bca-4d0c-a1fc-21bbc574d5a6', label: 'power_off_timeout' },
]

export interface Trend {
  first: number
  last: number
  /** Change per hour; null when the span is too short to mean anything. */
  perHour: number | null
  spanMin: number
  n: number
}

/** Below this the per-hour figure is noise from ADC jitter, not a rate. */
const MIN_TREND_SPAN_MIN = 5

export function trend(samples: DiagSample[], key: 'batteryPct' | 'batteryV'): Trend | null {
  const pts = samples
    .filter(s => typeof s[key] === 'number')
    .map(s => ({ t: Date.parse(s.t), v: s[key] as number }))
  if (!pts.length)
    return null
  const first = pts[0]
  const last = pts[pts.length - 1]
  const spanMin = (last.t - first.t) / 60_000
  if (pts.length < 2 || spanMin < MIN_TREND_SPAN_MIN)
    return { first: first.v, last: last.v, perHour: null, spanMin, n: pts.length }
  // Least squares over all points — two endpoints alone swing with ADC noise.
  const t0 = first.t
  const xs = pts.map(p => (p.t - t0) / 3_600_000)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = pts.reduce((a, p) => a + p.v, 0) / pts.length
  let num = 0
  let den = 0
  xs.forEach((x, i) => {
    num += (x - mx) * (pts[i].v - my)
    den += (x - mx) ** 2
  })
  return { first: first.v, last: last.v, perHour: den ? num / den : null, spanMin, n: pts.length }
}

function fmtNum(v: number, decimals: number): string {
  return Number.isInteger(v) && decimals === 0 ? String(v) : v.toFixed(decimals)
}

export function formatTrend(tr: Trend | null, unit: string, decimals: number): string | null {
  if (!tr)
    return null
  const now = `${fmtNum(tr.last, decimals)} ${unit}`
  if (tr.perHour === null)
    return tr.n > 1 ? `${now} (${tr.n} samples over ${tr.spanMin.toFixed(1)} min — too short for a rate)` : now
  const sign = tr.perHour > 0 ? '+' : ''
  return `${now} (${fmtNum(tr.first, decimals)} → ${fmtNum(tr.last, decimals)} over ${tr.spanMin.toFixed(0)} min, ${sign}${tr.perHour.toFixed(decimals + 1)} ${unit}/h)`
}

function deviceTitle(r: DiagnosticsReport): string {
  const d = r.device
  if (!d)
    return 'no device'
  const model = d.model || d.name || 'device'
  const id = d.serial || d.name
  return id && id !== model ? `${model} ${id}` : model
}

export function mailSubject(r: DiagnosticsReport): string {
  const d = r.device
  if (!d)
    return 'FlyBeeper diagnostics'
  const parts = [d.model || d.name || 'device']
  if (d.serial)
    parts.push(`S/N ${d.serial}`)
  if (d.name && d.name !== d.model)
    parts.push(d.name)
  if (d.firmwareRevision)
    parts.push(`FW ${d.firmwareRevision}`)
  return `FlyBeeper diagnostics: ${parts.join(' · ')}`
}

function activeSlot(r: DiagnosticsReport): DiagSlot | undefined {
  return r.firmware?.slots.find(s => s.active)
}

function charById(r: DiagnosticsReport, uuid: string): DiagCharacteristic | undefined {
  return r.characteristics.find(c => c.uuid === uuid)
}

/**
 * Short summary, most useful first — the email body is built from this and
 * trimmed from the bottom when the mailto: link gets too long.
 */
export function summaryLines(r: DiagnosticsReport): string[] {
  const lines: string[] = []
  const d = r.device
  if (d) {
    lines.push(`Device: ${deviceTitle(r)}`)
    if (d.name)
      lines.push(`BLE name: ${d.name}`)
    lines.push(`Model: ${d.model ?? '—'} · Manufacturer: ${d.manufacturer ?? '—'}`)
    lines.push(`Serial: ${d.serial ?? 'not provided'}`)
    lines.push(`Board revision: ${d.hardwareRevision ?? 'not provided'}`)
    lines.push(`Firmware: ${d.firmwareRevision ?? '—'}${d.softwareRevision ? ` · SW ${d.softwareRevision}` : ''}`)
    const act = activeSlot(r)
    if (act)
      lines.push(`Running image: ${act.version === '0.0.0' ? '0.0.0 (build sets no MCUboot version — see Firmware above)' : act.version} ${act.confirmed ? 'confirmed' : 'NOT confirmed'} (slot ${act.slot})`)
    const pending = r.firmware?.slots.find(s => s.pending)
    if (pending)
      lines.push(`Pending image: ${pending.version} (slot ${pending.slot})`)
    if (r.firmware?.bootloader)
      lines.push(`Bootloader: ${String(r.firmware.bootloader.bootloader)}${'mode' in r.firmware.bootloader ? ` mode ${String(r.firmware.bootloader.mode)}` : ''}`)
    const pct = formatTrend(trend(r.samples, 'batteryPct'), '%', 0)
    const volts = formatTrend(trend(r.samples, 'batteryV'), 'V', 2)
    if (pct)
      lines.push(`Battery: ${pct}`)
    if (volts)
      lines.push(`Battery voltage: ${volts}`)
    for (const k of KEY_SETTINGS) {
      const c = charById(r, k.uuid)
      if (c)
        lines.push(`${k.label}: ${c.display}`)
      // Absent is an answer too: FBminiBT firmware, for one, does not expose
      // ble_never_sleep at all — support should not have to ask.
      else if (r.characteristics.length)
        lines.push(`${k.label}: not exposed by this firmware`)
    }
    if (r.incompleteChars.length)
      lines.push(`Unreadable settings: ${r.incompleteChars.length}`)
  }
  else {
    lines.push('Device: not connected')
  }
  const errCount = r.log.filter(l => l.level === 'error').length
  const warnCount = r.log.filter(l => l.level === 'warn').length
  if (r.errors.connect)
    lines.push(`Connect error: ${r.errors.connect}`)
  if (r.errors.firmwareUpdate)
    lines.push(`Firmware update error: ${r.errors.firmwareUpdate}`)
  if (errCount || warnCount)
    lines.push(`Session log: ${errCount} error(s), ${warnCount} warning(s)`)
  if (r.actions.length)
    lines.push(`User actions logged: ${r.actions.length} (last: ${r.actions[r.actions.length - 1].msg})`)
  lines.push(`Configurator: ${r.app.build} (${r.app.buildDate})`)
  lines.push(`Browser: ${r.env.userAgent}`)
  lines.push(`Report time: ${r.generatedAt}`)
  return lines
}

function section(title: string, body: string[]): string {
  return [`== ${title} ==`, ...body, ''].join('\n')
}

/** One action as a report line; a folded burst shows its count, spread and end time. */
export function actionLine(a: DiagAction): string {
  const extra: string[] = []
  if (a.n && a.n > 1)
    extra.push(`×${a.n}`)
  if (typeof a.min === 'number' && typeof a.max === 'number' && a.min !== a.max)
    extra.push(`range ${fmtNum(a.min, 2)} … ${fmtNum(a.max, 2)}${a.unit ? ` ${a.unit}` : ''}`)
  if (a.until) {
    const sec = Math.round((Date.parse(a.until) - Date.parse(a.t)) / 1000)
    if (sec >= 1)
      extra.push(`${sec} s, until ${a.until.slice(11, 19)}`)
  }
  return `${a.t} [${a.kind}] ${a.msg}${extra.length ? ` (${extra.join(', ')})` : ''}`
}

/** Full plain-text report — what "Copy" puts on the clipboard. */
export function reportText(r: DiagnosticsReport): string {
  const out: string[] = []
  out.push(`FlyBeeper diagnostics · ${r.generatedAt}`, '')
  if (r.problem.trim())
    out.push(section('Problem (from the user)', [r.problem.trim()]))
  out.push(section('Summary', summaryLines(r)))

  if (r.device) {
    const d = r.device
    out.push(section('Device information', [
      `BLE name: ${d.name ?? '—'}`,
      `Model: ${d.model ?? '—'}`,
      `Manufacturer: ${d.manufacturer ?? '—'}`,
      `Serial number: ${d.serial ?? 'not provided'}`,
      `Hardware (board) revision: ${d.hardwareRevision ?? 'not provided'}`,
      `Firmware revision: ${d.firmwareRevision ?? '—'}`,
      `Software revision: ${d.softwareRevision ?? 'not provided'}`,
      `System ID: ${d.systemId ?? 'not provided'}`,
      `PnP ID: ${d.pnpId ?? 'not provided'}`,
      ...(r.deviceSeen ? [`Connected in this session: ${r.deviceSeen.first} … ${r.deviceSeen.last}`] : []),
      ...(r.otherDevices.length ? [`Other devices this session: ${r.otherDevices.join(', ')}`] : []),
    ]))
  }

  if (r.firmware) {
    const f = r.firmware
    const body = f.slots.map(s =>
      `image ${s.image} slot ${s.slot}: ${s.version} [${[
        s.active && 'active',
        s.confirmed && 'confirmed',
        s.pending && 'pending',
        s.bootable && 'bootable',
        s.permanent && 'permanent',
      ].filter(Boolean).join(', ')}] hash ${s.hash}`)
    if (!f.slots.length)
      body.push('no slot information')
    body.push(`Bootloader: ${f.bootloader ? JSON.stringify(f.bootloader) : 'not reported'}`)
    body.push(`OS info: ${f.osInfo ?? 'not reported'}`)
    if (f.error)
      body.push(`Error: ${f.error}`)
    out.push(section('Firmware slots (MCUmgr)', body))
  }

  if (r.characteristics.length) {
    let lastService = ''
    const body: string[] = []
    for (const c of r.characteristics) {
      if (c.service !== lastService) {
        body.push(`-- ${c.service}`)
        lastService = c.service
      }
      const label = c.name === c.uuid ? c.uuid : `${c.name} (${c.uuid})`
      const seen = c.at ? ` (${c.source ?? 'seen'} ${c.at.slice(11, 19)})` : ''
      body.push(`${label}: ${c.display}${seen}${c.error ? ` [error: ${c.error}]` : ''}`)
    }
    out.push(section('Characteristics', body))
  }

  if (r.samples.length) {
    out.push(section('Samples', r.samples.map(s => [
      s.t,
      s.connected ? '' : 'DISCONNECTED',
      s.batteryPct !== null ? `bat ${s.batteryPct}%` : '',
      s.batteryV !== null ? `${s.batteryV.toFixed(3)} V` : '',
      s.pressurePa !== null ? `p ${s.pressurePa} Pa` : '',
      s.varioMs !== null ? `vario ${s.varioMs} m/s` : '',
      s.temperatureC !== null ? `${s.temperatureC} °C` : '',
      s.readLatencyMs !== null ? `rtt ${s.readLatencyMs} ms` : '',
    ].filter(Boolean).join(' · '))))
  }

  out.push(section('User actions', r.actions.length
    ? r.actions.map(actionLine)
    : ['none']))

  if (r.events.length)
    out.push(section('Connection events', r.events.map(e => `${e.t} ${e.event}`)))

  if (r.unavailable.length)
    out.push(section('Not available', r.unavailable))

  out.push(section('Session log', r.log.length
    ? r.log.map(l => `${l.t} ${l.level.toUpperCase()} ${l.msg}`)
    : ['empty']))

  out.push(section('Environment', [
    `Configurator: ${r.app.build} (${r.app.buildDate}) ${r.app.url}`,
    `Installed app (PWA): ${r.app.standalone ? 'yes' : 'no'}`,
    `UI language: ${r.app.locale}`,
    `User agent: ${r.env.userAgent}`,
    `Platform: ${r.env.platform ?? '—'}`,
    `Languages: ${r.env.languages.join(', ')}`,
    `Web Bluetooth: ${r.env.bleAvailable ? 'yes' : `no (${r.env.bleUnavailableReason ?? 'unknown'})`}`,
    `getDevices(): ${r.env.getDevicesSupported ? 'yes' : 'no'}`,
  ]))

  return out.join('\n')
}

export function reportFileName(r: DiagnosticsReport): string {
  const who = (r.device?.name || r.device?.model || 'no-device').replace(/[^\w.-]+/g, '_')
  const when = r.generatedAt.replace(/:/g, '').replace(/\.\d+Z$/, 'Z')
  return `flybeeper-diagnostics_${who}_${when}.json`
}

/**
 * Practical ceiling for a whole mailto: URL. RFC 6068 sets none, but Outlook
 * on Windows and several webmail handlers cut or refuse links past ~2000
 * characters, and the body is percent-encoded (Cyrillic triples in size).
 */
export const MAILTO_MAX_LENGTH = 1900

export interface MailText {
  /** Localised "describe your problem" header line. */
  problemPrompt: string
  /** What the pilot typed on the page; used instead of the blank line when present. */
  problem: string
  /** Localised request to attach the downloaded JSON file. */
  attachRequest: string
}

export function mailtoUrl(r: DiagnosticsReport, to: string, text: MailText, max = MAILTO_MAX_LENGTH): string {
  const head = [
    text.problemPrompt,
    text.problem.trim() || '\n\n',
    '',
    text.attachRequest,
    '',
    '---',
  ]
  const build = (lines: string[]) =>
    `mailto:${to}?subject=${encodeURIComponent(mailSubject(r))}&body=${encodeURIComponent([...head, ...lines].join('\n'))}`

  const lines = summaryLines(r)
  let url = build(lines)
  // Drop summary lines from the bottom until the link fits. The head (problem +
  // attach request) always stays — the JSON carries everything that is cut.
  while (url.length > max && lines.length) {
    lines.pop()
    url = build(lines.length ? [...lines, '…'] : [])
  }
  // A very long problem description alone can still overflow: shorten it —
  // the pilot's full text stays on the page and in the JSON file.
  while (url.length > max && head[1].length > 40) {
    head[1] = `${head[1].slice(0, Math.floor(head[1].length * 0.8))}…`
    url = build([])
  }
  return url
}
