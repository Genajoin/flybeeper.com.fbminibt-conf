import { computed, ref, watch } from 'vue'
import type { Router } from 'vue-router'
import log from 'loglevel'
import { SmpTransport, bootloaderInfo, hex, imageStateRead, osInfo } from '~/lib/smp'
import { ensureLocaleMessages, i18n } from '~/modules/i18n'
import { useFirmwareFlash } from '~/composables/useFirmwareFlash'
import { DEMO_SETTINGS } from '~/composables/useDemoSnapshot'
import { useSettingsStore } from '~/stores/settings'
import { useSharedPresetStore } from '~/stores/shared-preset'
import type { BleCharacteristicImpl as BleCharacteristic } from '~/utils/BleCharacteristic'
import { normalizeUuid } from '~/utils/BleCharacteristic'
import { gattOp } from '~/utils/gattQueue'
import { CURVE_COLUMNS } from '~/utils/curve-units'
import { getSessionLog } from '~/utils/sessionLog'
import type { DiagCharacteristic, DiagnosticsReport } from '~/utils/diagnostics'
import { DIAGNOSTICS_SCHEMA } from '~/utils/diagnostics'
import type { DeviceInfo, DeviceRecord } from '~/utils/sessionJournal'
import {
  beginDevice,
  currentDevice,
  isoNow,
  journal,
  journalRev,
  markDeviceChanged,
  putCharacteristic,
  recordAction,
  recordEvent,
  recordSample,
  setFirmware,
} from '~/utils/sessionJournal'

/**
 * Diagnostics collection, in two parts.
 *
 * `startSessionJournal()` runs from app start (modules/session-journal.ts):
 * it logs what the pilot does, keeps the last known state of every
 * characteristic the app has seen, and samples battery / pressure while a
 * device is connected — all into the in-memory journal. That is what lets the
 * pilot reproduce a problem anywhere in the configurator and only then open
 * /diagnostics.
 *
 * `useDiagnostics()` is the page side: it builds the report from the journal
 * and reads from the device ONLY what the journal does not have yet on the
 * current link. Nothing collected earlier is thrown away.
 */

const DIS_SERVICE = '0000180a-0000-1000-8000-00805f9b34fb'
const DIS = {
  systemId: '00002a23-0000-1000-8000-00805f9b34fb',
  model: '00002a24-0000-1000-8000-00805f9b34fb',
  serial: '00002a25-0000-1000-8000-00805f9b34fb',
  firmwareRevision: '00002a26-0000-1000-8000-00805f9b34fb',
  hardwareRevision: '00002a27-0000-1000-8000-00805f9b34fb',
  softwareRevision: '00002a28-0000-1000-8000-00805f9b34fb',
  manufacturer: '00002a29-0000-1000-8000-00805f9b34fb',
  pnpId: '00002a50-0000-1000-8000-00805f9b34fb',
} as const
type DisField = Exclude<keyof DeviceInfo, 'name'>
const BINARY_DIS: DisField[] = ['systemId', 'pnpId']

const BAT_PCT_UUID = '00002a19-0000-1000-8000-00805f9b34fb'
const BAT_V_UUID = 'b0c889e8-16d2-45ef-b615-387f6bca2370'
const PRESSURE_UUID = '00002a6d-0000-1000-8000-00805f9b34fb'
const TEMP_UUID = '00002a6e-0000-1000-8000-00805f9b34fb'
const VARIO_UUIDS = [
  'b4df8385-16d2-4037-b2ed-2e14e1f4fa27', // vario by pressure
  '830ff7a0-367a-40e7-9038-4f00bda31f84', // vario by altitude
]
/** Sampled on every tick: initialised (and battery notifications started) once per link. */
const SAMPLED_UUIDS = [BAT_V_UUID, BAT_PCT_UUID, PRESSURE_UUID, TEMP_UUID]

const SERVICE_NAMES: Record<string, string> = {
  '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
  '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
  [DIS_SERVICE]: 'Device Information',
  '0000180f-0000-1000-8000-00805f9b34fb': 'Battery',
  '0000181a-0000-1000-8000-00805f9b34fb': 'Environmental Sensing',
  '00001819-0000-1000-8000-00805f9b34fb': 'Location and Navigation',
  '00001815-0000-1000-8000-00805f9b34fb': 'Automation IO',
  '904baf04-5814-11ee-8c99-0242ac120000': 'FlyBeeper Settings',
  '8d53dc1d-1db7-4cd3-868b-8a527460aa84': 'MCUmgr SMP',
}

/** SMP is a command channel, not state: listed, never read or subscribed by the journal. */
const SMP_SERVICE = '8d53dc1d-1db7-4cd3-868b-8a527460aa84'

/** Standard GATT characteristics the locale files do not name. */
const STANDARD_NAMES: Record<string, string> = {
  '00002a67-0000-1000-8000-00805f9b34fb': 'Location and Speed',
  '00002a6a-0000-1000-8000-00805f9b34fb': 'LN Feature',
  '00002a6b-0000-1000-8000-00805f9b34fb': 'Position Quality',
  '00002a05-0000-1000-8000-00805f9b34fb': 'Service Changed',
  // FBminiBT firmware appends three read-only dummies to the settings service
  // to dodge a Zephyr UUID bug (FlyBeeperBT/src/settings.c). Not settings.
  '00000001-0000-1000-8000-00805f9b34fb': 'Firmware placeholder (not a setting)',
  '00000002-0000-1000-8000-00805f9b34fb': 'Firmware placeholder (not a setting)',
  '00000003-0000-1000-8000-00805f9b34fb': 'Firmware placeholder (not a setting)',
  'da2e7828-fbce-4e01-ae9e-261174997c48': 'SMP (firmware update channel)',
}

/** Sampling period. Slow enough to add no noticeable GATT load. */
export const SAMPLE_PERIOD_MS = 15_000

// --- formatting helpers ------------------------------------------------------

function dvHex(v: unknown): string | null {
  if (!(v instanceof DataView))
    return null
  return hex(new Uint8Array(v.buffer, v.byteOffset, v.byteLength))
}

function cleanUnit(unit: string | undefined | null): string {
  if (!unit || unit === 'unit less' || unit.startsWith('Unknown Unit'))
    return ''
  return unit
}

function fmtScalar(v: number): string {
  // 0.35 not 0.35000000000000003 — CPF exponents are applied in floating point.
  return String(Number(v.toFixed(6)))
}

function errText(e: unknown): string {
  if (e instanceof DOMException)
    return `${e.name}: ${e.message}`
  return e instanceof Error ? e.message : String(e)
}

/** Value + unit for a human; curve arrays get the table editor's units. */
export function displayValue(uuid: string, value: unknown, unit: string): { display: string, unit: string } {
  const curve = CURVE_COLUMNS.find(c => c.uuid === uuid)
  if (curve && Array.isArray(value)) {
    const shown = value.map(n => typeof n === 'number' ? (n / curve.scale).toFixed(curve.decimals) : String(n))
    return { display: `[${shown.join(', ')}] ${curve.unit}`, unit: curve.unit }
  }
  if (value === null || value === undefined)
    return { display: 'no value', unit }
  if (typeof value === 'boolean')
    return { display: value ? 'on' : 'off', unit: '' }
  const suffix = unit ? ` ${unit}` : ''
  if (typeof value === 'number')
    return { display: `${fmtScalar(value)}${suffix}`, unit }
  if (Array.isArray(value))
    return { display: `[${value.map(n => typeof n === 'number' ? fmtScalar(n) : String(n)).join(', ')}]${suffix}`, unit }
  if (value instanceof DataView)
    return { display: `0x${dvHex(value)}`, unit: '' }
  if (typeof value === 'string')
    return { display: `${value}${suffix}`, unit }
  try {
    return { display: JSON.stringify(value), unit }
  }
  catch {
    return { display: String(value), unit }
  }
}

function jsonSafe(value: unknown): unknown {
  if (value instanceof DataView)
    return dvHex(value)
  if (value === undefined)
    return null
  try {
    return JSON.parse(JSON.stringify(value))
  }
  catch {
    return String(value)
  }
}

/** English label for support, whatever language the UI is in. */
function englishLabel(uuid: string): string | null {
  const { t, te } = i18n.global
  for (const key of [`sett.${uuid}`, `param.${uuid}`]) {
    if (te(key, 'en'))
      return t(key, {}, { locale: 'en' })
  }
  return STANDARD_NAMES[uuid] ?? null
}

function labelFor(uuid: string): string {
  return englishLabel(uuid) ?? uuid
}

// --- characteristic snapshots (no I/O) ---------------------------------------

function hasValue(ch: BleCharacteristic): boolean {
  return ch.value instanceof DataView || (ch.formattedValue !== null && ch.formattedValue !== undefined)
}

function describeChar(ch: BleCharacteristic, seen?: { at: string, source: 'read' | 'notify' | 'write' }): DiagCharacteristic {
  const c = ch.characteristic
  const uuid = c.uuid
  const service = normalizeUuid(c.service.uuid)
  const p = c.properties
  const props = [
    p?.read && 'read',
    p?.write && 'write',
    p?.writeWithoutResponse && 'writeNoRsp',
    p?.notify && 'notify',
    p?.indicate && 'indicate',
  ].filter(Boolean).join(',')
  const { display, unit } = displayValue(uuid, ch.formattedValue, cleanUnit(ch.presentationFormatDescriptor?.unit))
  const cud = ch.userFormatDescriptor
  const label = englishLabel(uuid)
  const error = ch.initError ? errText(ch.initError) : undefined
  return {
    service: `${SERVICE_NAMES[service] ?? 'Service'} (${service})`,
    uuid,
    name: label && cud && cud !== label ? `${label} [${cud}]` : (label ?? cud ?? uuid),
    value: jsonSafe(ch.formattedValue),
    display: hasValue(ch)
      ? display
      : isChannel(ch) ? 'data channel — not read' : (p?.read ? 'not read yet' : 'notify only, no value yet'),
    unit,
    raw: dvHex(ch.value),
    props,
    ...(error ? { error } : {}),
    ...(seen && hasValue(ch) ? seen : {}),
  }
}

function charsOf(bt: ReturnType<typeof useBluetoothStore>): BleCharacteristic[] {
  return (bt.bleCharacteristics as BleCharacteristic[])
    .filter(c => normalizeUuid(c.characteristic.service.uuid) !== DIS_SERVICE)
}

/**
 * Data channels, not state: SMP (firmware update) and the FANET packet stream.
 * The FANET one declares READ but has no read handler in the firmware
 * (FBFANET/src/fanet/fanet.c), so reading it only ever yields "GATT operation
 * not permitted". Listed in the report, never read or subscribed.
 */
const CHANNEL_UUIDS = new Set([
  'da2e7828-fbce-4e01-ae9e-261174997c48', // SMP
  'fec81438-cb89-4c37-93d0-badfced4376e', // FANET channel
])

function isChannel(ch: BleCharacteristic): boolean {
  return normalizeUuid(ch.characteristic.service.uuid) === SMP_SERVICE || CHANNEL_UUIDS.has(ch.characteristic.uuid)
}

/**
 * Copy what the app currently holds into the journal — memory only, no GATT
 * traffic. A value keeps its timestamp while it stays the same, so `at` means
 * "first seen with this value", and a characteristic that lost its value
 * keeps the last one the journal saw.
 */
function harvest(bt: ReturnType<typeof useBluetoothStore>, rec: DeviceRecord): void {
  for (const ch of charsOf(bt)) {
    const prev = rec.characteristics.get(ch.characteristic.uuid)
    if (!hasValue(ch)) {
      if (!prev)
        putCharacteristic(rec, describeChar(ch))
      continue
    }
    const raw = dvHex(ch.value)
    const same = prev?.at && prev.raw === raw && JSON.stringify(prev.value) === JSON.stringify(jsonSafe(ch.formattedValue))
    if (same)
      continue
    putCharacteristic(rec, describeChar(ch, { at: isoNow(), source: ch.isNotified ? 'notify' : 'read' }))
  }
  rec.incompleteChars = [...bt.incompleteChars]
  markDeviceChanged()
}

// --- device reads -----------------------------------------------------------

function deviceInfoFromStore(bt: ReturnType<typeof useBluetoothStore>): DeviceInfo {
  return {
    name: bt.devName || null,
    model: (bt.dis.modelNumberString.value as string | null) ?? null,
    manufacturer: (bt.dis.manufacturerNameString.value as string | null) ?? null,
    serial: null,
    hardwareRevision: null,
    firmwareRevision: (bt.dis.firmwareRevisionString.value as string | null) ?? null,
    softwareRevision: null,
    systemId: null,
    pnpId: null,
  }
}

/** Read the Device Information fields the journal is still missing for this device. */
async function readDisGaps(bt: ReturnType<typeof useBluetoothStore>, rec: DeviceRecord): Promise<void> {
  for (const [field, uuid] of Object.entries(DIS) as [DisField, string][]) {
    if (rec.info[field] !== null)
      continue
    const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
    if (!ch || !bt.isConnected)
      continue
    try {
      const dv = await gattOp(`read DIS ${field}`, () => ch.characteristic.readValue())
      const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)
      rec.info[field] = BINARY_DIS.includes(field)
        ? hex(bytes)
        : new TextDecoder().decode(bytes).replace(/\0+$/, '').trim() || null
    }
    catch (e) {
      log.warn(`diagnostics: DIS ${field} read failed`, e)
    }
  }
  markDeviceChanged()
}

function disGaps(bt: ReturnType<typeof useBluetoothStore>, rec: DeviceRecord): string[] {
  const out: string[] = []
  for (const [field, uuid] of Object.entries(DIS) as [DisField, string][]) {
    if (rec.info[field] !== null)
      continue
    const exposed = bt.bleCharacteristics.some(c => c.characteristic.uuid === uuid)
    out.push(`Device information: ${field} (${exposed || !bt.isConnected ? 'could not be read' : 'not exposed by this firmware'})`)
  }
  return out
}

/**
 * Read what this link has not produced yet: characteristics never read or
 * notified since the current connection began. `force` re-reads everything
 * readable (the page's "Read again").
 */
async function readCharGaps(
  bt: ReturnType<typeof useBluetoothStore>,
  rec: DeviceRecord,
  force: boolean,
  onProgress: () => void,
): Promise<void> {
  for (const ch of charsOf(bt)) {
    if (!bt.isConnected)
      break
    const prev = rec.characteristics.get(ch.characteristic.uuid)
    const fresh = prev?.at && prev.at >= rec.linkStart
    const readable = !!ch.characteristic.properties?.read
    // Notify-only characteristics have nothing to read; SMP is read over SMP.
    if ((fresh && !force) || !readable || isChannel(ch)) {
      if (!prev)
        putCharacteristic(rec, describeChar(ch))
      onProgress()
      continue
    }
    try {
      // Non-settings characteristics are not initialised at connect (no CPF
      // yet): initialise once, which also reads the value.
      if (!ch.isInitialized)
        await ch.initialize()
      else
        await ch.getFormattedValue()
    }
    catch (e) {
      log.warn('diagnostics: read failed', ch.characteristic.uuid, e)
    }
    putCharacteristic(rec, describeChar(ch, { at: isoNow(), source: 'read' }))
    onProgress()
  }
  rec.incompleteChars = [...bt.incompleteChars]
}

async function readFirmware(bt: ReturnType<typeof useBluetoothStore>, rec: DeviceRecord): Promise<void> {
  if (bt.isFlashing)
    return
  let transport: SmpTransport | null = null
  try {
    transport = new SmpTransport(await bt.getSmpCharacteristic(), { timeoutMs: 8000 })
    await transport.start()
    const slots = await imageStateRead(transport)
    const boot = await bootloaderInfo(transport)
    const os = await osInfo(transport)
    setFirmware(rec, {
      slots: slots.map(s => ({
        image: s.image,
        slot: s.slot,
        version: s.version,
        hash: hex(s.hash),
        active: s.active,
        confirmed: s.confirmed,
        pending: s.pending,
        bootable: s.bootable,
        permanent: s.permanent,
      })),
      bootloader: boot,
      osInfo: os,
      error: null,
    })
  }
  catch (e) {
    log.warn('diagnostics: SMP image list failed', e)
    // Keep slots from an earlier successful read; only note the failure.
    if (rec.firmware)
      rec.firmware.error = errText(e)
    else
      setFirmware(rec, { slots: [], bootloader: null, osInfo: null, error: errText(e) })
  }
  finally {
    await transport?.stop()
  }
}

// --- sampling ----------------------------------------------------------------

function findChar(bt: ReturnType<typeof useBluetoothStore>, uuid: string): BleCharacteristic | undefined {
  return bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid) as BleCharacteristic | undefined
}

/**
 * Initialise the sampled characteristics and start battery notifications —
 * the same thing DeviceInfoStrip does. Vario notifications are NOT started
 * here: they stream several times a second, so the journal only records vario
 * while a view that shows it has them running.
 */
async function prepareSampling(bt: ReturnType<typeof useBluetoothStore>): Promise<void> {
  for (const uuid of SAMPLED_UUIDS) {
    const ch = findChar(bt, uuid)
    if (!ch || !bt.isConnected)
      continue
    try {
      if (!ch.isInitialized)
        await ch.initialize()
      const isBattery = uuid === BAT_V_UUID || uuid === BAT_PCT_UUID
      if (isBattery && !ch.isNotified && !ch.isBlockNotify && ch.characteristic.properties?.notify)
        await ch.subscribeToNotifications()
    }
    catch { /* best effort — samples show null for it */ }
  }
}

async function readNumber(bt: ReturnType<typeof useBluetoothStore>, uuid: string, timing?: { ms: number | null }): Promise<number | null> {
  const ch = findChar(bt, uuid)
  if (!ch)
    return null
  if (ch.characteristic.properties?.read && ch.isInitialized) {
    const started = performance.now()
    try {
      await ch.getFormattedValue()
      if (timing && timing.ms === null)
        timing.ms = Math.round(performance.now() - started)
    }
    catch { /* keep the last notified value */ }
  }
  return typeof ch.formattedValue === 'number' ? Number(ch.formattedValue.toFixed(4)) : null
}

let sampling = false
async function takeSample(bt: ReturnType<typeof useBluetoothStore>): Promise<void> {
  // Never compete with a firmware upload or the connect-time fetch for the radio.
  if (sampling || !bt.isConnected || bt.isFlashing || bt.isFetching)
    return
  sampling = true
  try {
    const timing = { ms: null as number | null }
    const batteryV = await readNumber(bt, BAT_V_UUID, timing)
    const batteryPct = await readNumber(bt, BAT_PCT_UUID, timing)
    const pressurePa = await readNumber(bt, PRESSURE_UUID, timing)
    const temperatureC = await readNumber(bt, TEMP_UUID)
    let varioMs: number | null = null
    for (const u of VARIO_UUIDS) {
      const v = findChar(bt, u)?.formattedValue
      if (typeof v === 'number') {
        varioMs = Number(v.toFixed(2))
        break
      }
    }
    recordSample({
      t: isoNow(),
      device: bt.devName || null,
      connected: bt.isConnected,
      batteryPct,
      batteryV,
      pressurePa,
      varioMs,
      temperatureC,
      readLatencyMs: timing.ms,
    })
    const rec = currentDevice()
    if (rec && bt.isConnected)
      harvest(bt, rec)
  }
  finally {
    sampling = false
  }
}

// --- the app-wide journal ----------------------------------------------------

function patchSummary(patch: Record<string, unknown>): { key: string, text: string }[] {
  return Object.entries(patch).map(([uuid, v]) => ({
    key: uuid,
    text: `${labelFor(uuid)} → ${displayValue(uuid, v, '').display}`,
  }))
}

let started = false

/**
 * Start collecting for this browser session. Client only; idempotent.
 */
export function startSessionJournal(router: Router): void {
  if (started || typeof window === 'undefined')
    return
  started = true
  void ensureLocaleMessages('en')

  const bt = useBluetoothStore()
  const settings = useSettingsStore()
  const shared = useSharedPresetStore()

  bt.$onAction(({ name, args, after, onError }) => {
    switch (name) {
      case 'connectToRequestDevice':
        recordAction('connect', 'open the device chooser')
        break
      case 'connectToSavedDevice':
        recordAction('connect', 'reconnect to a saved device')
        break
      case 'repickDevice':
        recordAction('connect', 'pick the device again (stale GATT cache)')
        break
      case 'disconnectDevice':
        recordAction('connect', 'disconnect')
        break
      case 'cancelConnect':
        recordAction('connect', 'cancel connecting')
        break
      case 'connectToDevice':
        recordEvent(`connecting to ${(args[0] as BluetoothDevice | undefined)?.name ?? 'device'}`)
        break
      case 'onDisconnected': {
        // Runs BEFORE the store wipes its characteristics — last chance to
        // keep what the link had.
        const rec = currentDevice()
        if (rec)
          harvest(bt, rec)
        recordEvent(bt.isFlashing ? 'disconnected (firmware update reboot)' : 'disconnected')
        break
      }
      case 'writeCharacteristic': {
        const [uuid, value] = args as [string, unknown]
        const unit = cleanUnit(findChar(bt, uuid)?.presentationFormatDescriptor?.unit)
        const what = `${labelFor(uuid)} = ${displayValue(uuid, value, unit).display}`
        after(() => {
          recordAction('write', `${what} — written to the device`, `w:${uuid}`)
          const ch = findChar(bt, uuid)
          const rec = currentDevice()
          if (ch && rec)
            putCharacteristic(rec, describeChar(ch, { at: isoNow(), source: 'write' }))
        })
        onError(e => recordAction('write', `${what} — FAILED: ${errText(e)}`))
        break
      }
      case 'SendSimulationVarioValue':
        recordAction('simulator', `device simulator vario ${(Number(args[0]) / 100).toFixed(2)} m/s`, 'sim')
        break
    }
  })

  // Settings panels edit `settings.local` directly (useCpfGroup), not through
  // an action, so edits are caught by diffing against a baseline. Store
  // actions — slot switches on connect, the device snapshot, presets — move
  // the baseline instead of counting as the pilot's edits; the ones that are
  // the pilot's own are logged by name below.
  let baseline: Record<string, string> = {}
  let inSettingsAction = 0
  const flatten = (local: Record<string, unknown> | null | undefined) =>
    Object.fromEntries(Object.entries(local ?? {}).map(([k, v]) => [k, JSON.stringify(v)]))
  baseline = flatten(settings.local)
  watch(() => settings.local, (local, prev) => {
    const next = flatten(local)
    // Panels mutate the object in place; a new object means the store swapped
    // the whole bag (hydrate, slot switch) — even from inside an async action
    // whose start predates this subscription.
    if (!inSettingsAction && local === prev) {
      for (const [k, v] of Object.entries(next)) {
        if (baseline[k] !== v)
          recordAction('edit', `${patchSummary({ [k]: local?.[k] })[0].text} (not applied yet)`, `e:${k}`)
      }
    }
    baseline = next
  }, { deep: true, flush: 'sync' })

  settings.$onAction(({ name, args, after, onError }) => {
    inSettingsAction++
    const done = () => {
      inSettingsAction--
      baseline = flatten(settings.local)
    }
    after(done)
    onError(done)
    switch (name) {
      case 'updateLocal':
        for (const p of patchSummary(args[0] as Record<string, unknown>))
          recordAction('edit', `${p.text} (not applied yet)`, `e:${p.key}`)
        break
      case 'mergeLocal':
        recordAction('settings', `preset merged into local settings (${Object.keys(args[0] as object).length} values)`)
        break
      case 'replaceLocal':
        // The first-visit demo seed goes through here too — say so, it is not the pilot.
        recordAction('settings', JSON.stringify(args[0]) === JSON.stringify(DEMO_SETTINGS)
          ? 'demo settings loaded (first visit in this browser)'
          : `local settings replaced (${Object.keys(args[0] as object).length} values)`)
        break
      case 'revertTo':
        recordAction('settings', 'restored settings from history')
        break
      case 'revertGroup':
        recordAction('settings', `reverted ${(args[0] as string[]).length} setting(s) to the device values`)
        break
    }
  })

  shared.$onAction(({ name, args }) => {
    if (name === 'stage')
      recordAction('preset', `opened a preset link (${Object.keys((args[0] as { settings?: object }).settings ?? {}).length} settings)`)
    else if (name === 'clear')
      recordAction('preset', 'preset link dismissed')
  })

  router.afterEach((to, from) => {
    if (to.path !== from.path)
      recordAction('navigate', `open ${to.path}`)
  })

  // A connection is "ready" once the settings fetch is over.
  watch(() => bt.isConnected && !bt.isFetching, async (ready) => {
    if (!ready)
      return
    const key = bt.devName || String(bt.dis.modelNumberString.value ?? 'device')
    const rec = beginDevice(key, deviceInfoFromStore(bt))
    recordEvent(`connected ${key}${bt.dis.firmwareRevisionString.value ? ` (FW ${bt.dis.firmwareRevisionString.value})` : ''}`)
    if (bt.incompleteChars.length)
      recordEvent(`${bt.incompleteChars.length} setting(s) came back without a value`)
    harvest(bt, rec)
    await readDisGaps(bt, rec)
    await prepareSampling(bt)
    await takeSample(bt)
  })

  watch(() => bt.errorMessage, (msg) => {
    if (msg)
      recordEvent(`connect error: ${msg}`)
  })
  watch(() => bt.staleGattCache, (stale) => {
    if (stale)
      recordEvent('settings service missing after reconnect — stale GATT cache')
  })

  setInterval(() => void takeSample(bt), SAMPLE_PERIOD_MS)
}

// --- the page side -----------------------------------------------------------

export function useDiagnostics() {
  const bt = useBluetoothStore()
  const flash = useFirmwareFlash()
  const { locale } = useI18n()

  const collecting = ref(false)
  const progress = ref({ done: 0, total: 0 })

  function envBlock(): Pick<DiagnosticsReport, 'app' | 'env'> {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined
    const uaData = (nav as { userAgentData?: { platform?: string } } | undefined)?.userAgentData
    return {
      app: {
        build: __APP_VERSION__,
        buildDate: __BUILD_DATE__,
        url: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '',
        locale: String(locale.value),
        standalone: typeof window !== 'undefined' && !!window.matchMedia?.('(display-mode: standalone)').matches,
      },
      env: {
        userAgent: nav?.userAgent ?? '',
        platform: uaData?.platform ?? nav?.platform ?? null,
        languages: nav?.languages ? [...nav.languages] : [],
        bleAvailable: bt.bleAvailable,
        bleUnavailableReason: bt.bleUnavailableReason,
        getDevicesSupported: typeof nav?.bluetooth?.getDevices === 'function',
      },
    }
  }

  /** Build the report from the journal. Pure read — no device traffic. */
  function build(problem: string): DiagnosticsReport {
    const rec = currentDevice()
    const unavailable: string[] = []
    if (!rec) {
      unavailable.push(bt.isConnected ? 'Device: still connecting' : 'Device: not connected in this session')
    }
    else {
      if (!bt.isConnected)
        unavailable.push(`Device: not connected now — showing the last state seen (${rec.lastConnected})`)
      unavailable.push(...disGaps(bt, rec))
      if (!rec.firmware)
        unavailable.push('Firmware slots: not read yet (connect the device and open this page)')
      else if (rec.firmware.error)
        unavailable.push(`Firmware slots: ${rec.firmware.error}`)
      if (rec.firmware && !rec.firmware.error && !rec.firmware.bootloader)
        unavailable.push('Bootloader: not reported by the device (MCUmgr bootloader info not enabled)')
      const has = (u: string) => rec.characteristics.has(u)
      if (!has(BAT_PCT_UUID) && !has(BAT_V_UUID))
        unavailable.push('Battery: the device exposes neither level nor voltage')
      if (!VARIO_UUIDS.some(has) && !has(PRESSURE_UUID))
        unavailable.push('Vario / pressure: not exposed by this device')
      unavailable.push('Link quality (RSSI): not available to web pages on a live connection — GATT read round-trip is sampled instead')
    }
    return {
      schema: DIAGNOSTICS_SCHEMA,
      generatedAt: isoNow(),
      ...envBlock(),
      problem,
      device: rec ? { ...rec.info } : null,
      deviceSeen: rec ? { first: rec.firstConnected, last: rec.lastConnected } : null,
      otherDevices: [...journal.devices.keys()].filter(k => k !== rec?.key),
      firmware: rec?.firmware
        ? { slots: rec.firmware.slots, bootloader: rec.firmware.bootloader, osInfo: rec.firmware.osInfo, error: rec.firmware.error }
        : null,
      characteristics: rec ? rec.order.map(u => rec.characteristics.get(u)!).filter(Boolean) : [],
      incompleteChars: rec ? [...rec.incompleteChars] : [],
      actions: journal.actions.map(a => ({ ...a })),
      // Samples of the report's device only; a second device would skew the trend.
      samples: journal.samples.filter(s => !rec || s.device === rec.key || s.device === rec.info.name),
      events: journal.events.slice(),
      errors: {
        connect: bt.errorMessage || null,
        firmwareUpdate: flash.error.value,
      },
      log: getSessionLog(),
      unavailable,
    }
  }

  /**
   * Fill the gaps for the connected device: DIS fields not read yet,
   * characteristics without a value on this link, firmware slots if not read
   * on this link. Everything the journal already has stays as it is.
   */
  async function collect(force = false): Promise<void> {
    if (collecting.value || !bt.isConnected || bt.isFetching)
      return
    const rec = currentDevice()
    if (!rec)
      return
    collecting.value = true
    try {
      await ensureLocaleMessages('en')
      const chars = charsOf(bt)
      progress.value = { done: 0, total: chars.length + 2 }
      await readDisGaps(bt, rec)
      progress.value.done++
      await readCharGaps(bt, rec, force, () => progress.value.done++)
      if (force || !rec.firmware || rec.firmware.at < rec.linkStart || rec.firmware.error)
        await readFirmware(bt, rec)
      progress.value.done++
      if (force)
        recordAction('diagnostics', 'read everything again')
      await takeSample(bt)
    }
    catch (e) {
      log.error('diagnostics: collection failed', e)
    }
    finally {
      collecting.value = false
    }
  }

  const rev = computed(() => journalRev.value)
  const samples = computed(() => {
    void journalRev.value
    const rec = currentDevice()
    return journal.samples.filter(s => !rec || s.device === rec.key || s.device === rec.info.name)
  })
  const actionCount = computed(() => {
    void journalRev.value
    return journal.actions.length
  })

  /** The journal has opened the record for the device connected right now. */
  const ready = computed(() => {
    void journalRev.value
    return bt.isConnected && !bt.isFetching && !!currentDevice()
  })

  return { collecting, progress, collect, build, rev, ready, samples, actionCount }
}
