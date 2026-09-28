import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import log from 'loglevel'
import { SmpTransport, bootloaderInfo, hex, imageStateRead, osInfo } from '~/lib/smp'
import { ensureLocaleMessages } from '~/modules/i18n'
import { useFirmwareFlash } from '~/composables/useFirmwareFlash'
import type { BleCharacteristicImpl as BleCharacteristic } from '~/utils/BleCharacteristic'
import { normalizeUuid } from '~/utils/BleCharacteristic'
import { gattOp } from '~/utils/gattQueue'
import { CURVE_COLUMNS } from '~/utils/curve-units'
import { getSessionLog } from '~/utils/sessionLog'
import type {
  DiagCharacteristic,
  DiagEvent,
  DiagSample,
  DiagnosticsReport,
} from '~/utils/diagnostics'
import { DIAGNOSTICS_SCHEMA } from '~/utils/diagnostics'

/**
 * Collects everything support needs from the connected device (and the
 * browser) into a DiagnosticsReport for /diagnostics.
 *
 * Component-scoped on purpose: sampling runs only while the page is open, and
 * the samples are "what happened while the pilot had the page open" — which is
 * exactly what the report claims.
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
type DisField = keyof typeof DIS
const BINARY_DIS: DisField[] = ['systemId', 'pnpId']

const BAT_PCT_UUID = '00002a19-0000-1000-8000-00805f9b34fb'
const BAT_V_UUID = 'b0c889e8-16d2-45ef-b615-387f6bca2370'
const PRESSURE_UUID = '00002a6d-0000-1000-8000-00805f9b34fb'
const TEMP_UUID = '00002a6e-0000-1000-8000-00805f9b34fb'
const VARIO_UUIDS = [
  'b4df8385-16d2-4037-b2ed-2e14e1f4fa27', // vario by pressure
  '830ff7a0-367a-40e7-9038-4f00bda31f84', // vario by altitude
]

const SERVICE_NAMES: Record<string, string> = {
  '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
  '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
  [DIS_SERVICE]: 'Device Information',
  '0000180f-0000-1000-8000-00805f9b34fb': 'Battery',
  '0000181a-0000-1000-8000-00805f9b34fb': 'Environmental Sensing',
  '00001819-0000-1000-8000-00805f9b34fb': 'Location and Navigation',
  '00001815-0000-1000-8000-00805f9b34fb': 'Automation IO',
  '904baf04-5814-11ee-8c99-0242ac120000': 'FlyBeeper Settings',
}

/** Standard GATT characteristics the locale files do not name. */
const STANDARD_NAMES: Record<string, string> = {
  '00002a67-0000-1000-8000-00805f9b34fb': 'Location and Speed',
  '00002a6a-0000-1000-8000-00805f9b34fb': 'LN Feature',
  '00002a6b-0000-1000-8000-00805f9b34fb': 'Position Quality',
  '00002a05-0000-1000-8000-00805f9b34fb': 'Service Changed',
}

/** Sampling period. Slow enough to add no noticeable GATT load. */
export const SAMPLE_PERIOD_MS = 15_000
const MAX_SAMPLES = 480 // two hours at 15 s

function isoNow(): string {
  return new Date().toISOString()
}

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

export function useDiagnostics() {
  const bt = useBluetoothStore()
  const flash = useFirmwareFlash()
  const { t, te, locale } = useI18n()

  const report = shallowRef<DiagnosticsReport | null>(null)
  const collecting = ref(false)
  const progress = ref({ done: 0, total: 0 })
  const samples = ref<DiagSample[]>([])
  const events = ref<DiagEvent[]>([])

  // --- names --------------------------------------------------------------

  function englishLabel(uuid: string): string | null {
    for (const key of [`sett.${uuid}`, `param.${uuid}`]) {
      if (te(key, 'en'))
        return t(key, {}, { locale: 'en' })
    }
    return STANDARD_NAMES[uuid] ?? null
  }

  // --- device information -------------------------------------------------

  async function readDis(): Promise<{ values: Record<DisField, string | null>, missing: string[] }> {
    const values = Object.fromEntries(Object.keys(DIS).map(k => [k, null])) as Record<DisField, string | null>
    const missing: string[] = []
    for (const [field, uuid] of Object.entries(DIS) as [DisField, string][]) {
      const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
      if (!ch) {
        missing.push(`Device information: ${field} (not exposed by this firmware)`)
        continue
      }
      try {
        const dv = await gattOp(`read DIS ${field}`, () => ch.characteristic.readValue())
        const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)
        values[field] = BINARY_DIS.includes(field)
          ? hex(bytes)
          : new TextDecoder().decode(bytes).replace(/\0+$/, '').trim() || null
      }
      catch (e) {
        missing.push(`Device information: ${field} (read failed: ${errText(e)})`)
      }
    }
    // Fall back to what the store read at connect time.
    values.model ??= (bt.dis.modelNumberString.value as string | null) ?? null
    values.firmwareRevision ??= (bt.dis.firmwareRevisionString.value as string | null) ?? null
    values.manufacturer ??= (bt.dis.manufacturerNameString.value as string | null) ?? null
    return { values, missing }
  }

  // --- characteristics ----------------------------------------------------

  async function snapshotChar(ch: BleCharacteristic): Promise<DiagCharacteristic> {
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

    let error: string | undefined
    try {
      // Non-settings characteristics are not initialised at connect (no CPF
      // yet) — do it here; everything readable is re-read so the report shows
      // the device, not what the page cached minutes ago.
      if (!ch.isInitialized)
        await ch.initialize()
      else if (p?.read)
        await ch.getFormattedValue()
      const initError = ch.initError
      if (initError)
        error = errText(initError)
    }
    catch (e) {
      error = errText(e)
    }

    const cpf = ch.presentationFormatDescriptor
    const { display, unit } = displayValue(uuid, ch.formattedValue, cleanUnit(cpf?.unit))
    const cud = ch.userFormatDescriptor
    const label = englishLabel(uuid)
    return {
      service: `${SERVICE_NAMES[service] ?? 'Service'} (${service})`,
      uuid,
      name: label && cud && cud !== label ? `${label} [${cud}]` : (label ?? cud ?? uuid),
      value: jsonSafe(ch.formattedValue),
      display: p?.read || ch.formattedValue !== null ? display : 'not readable (notify only, no value yet)',
      unit,
      raw: dvHex(ch.value),
      props,
      ...(error ? { error } : {}),
    }
  }

  // --- firmware slots over SMP -------------------------------------------

  async function readFirmware(): Promise<DiagnosticsReport['firmware']> {
    if (bt.isFlashing)
      return { slots: [], bootloader: null, osInfo: null, error: 'skipped: a firmware update is running' }
    let transport: SmpTransport | null = null
    try {
      transport = new SmpTransport(await bt.getSmpCharacteristic(), { timeoutMs: 8000 })
      await transport.start()
      const slots = await imageStateRead(transport)
      const boot = await bootloaderInfo(transport)
      const os = await osInfo(transport)
      return {
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
      }
    }
    catch (e) {
      log.warn('diagnostics: SMP image list failed', e)
      return { slots: [], bootloader: null, osInfo: null, error: errText(e) }
    }
    finally {
      await transport?.stop()
    }
  }

  // --- sampling -----------------------------------------------------------

  const findChar = (uuid: string) =>
    bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid) as BleCharacteristic | undefined

  /**
   * Notify-only values (vario) only arrive while notifications are on; start
   * them the same way DeviceInfoStrip does. Left running on unmount — other
   * views subscribe to the same characteristics and stopping them would cut
   * those off.
   */
  async function ensureLive(uuid: string): Promise<void> {
    const ch = findChar(uuid)
    if (!ch)
      return
    try {
      if (!ch.isInitialized)
        await ch.initialize()
      if (!ch.isNotified && !ch.isBlockNotify && ch.characteristic.properties?.notify)
        await ch.subscribeToNotifications()
    }
    catch { /* best effort — the sample shows null for it */ }
  }

  async function readNumber(uuid: string, timing?: { ms: number | null }): Promise<number | null> {
    const ch = findChar(uuid)
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
  async function takeSample(): Promise<void> {
    if (sampling)
      return
    sampling = true
    try {
      if (!bt.isConnected) {
        samples.value.push({
          t: isoNow(),
          connected: false,
          batteryPct: null,
          batteryV: null,
          pressurePa: null,
          varioMs: null,
          temperatureC: null,
          readLatencyMs: null,
        })
      }
      else {
        const timing = { ms: null as number | null }
        const batteryV = await readNumber(BAT_V_UUID, timing)
        const batteryPct = await readNumber(BAT_PCT_UUID, timing)
        const pressurePa = await readNumber(PRESSURE_UUID, timing)
        const temperatureC = await readNumber(TEMP_UUID)
        let varioMs: number | null = null
        for (const u of VARIO_UUIDS) {
          const v = findChar(u)?.formattedValue
          if (typeof v === 'number') {
            varioMs = Number(v.toFixed(2))
            break
          }
        }
        samples.value.push({
          t: isoNow(),
          connected: bt.isConnected,
          batteryPct,
          batteryV,
          pressurePa,
          varioMs,
          temperatureC,
          readLatencyMs: timing.ms,
        })
      }
      if (samples.value.length > MAX_SAMPLES)
        samples.value.splice(0, samples.value.length - MAX_SAMPLES)
    }
    finally {
      sampling = false
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined

  async function startSampling(): Promise<void> {
    for (const u of [BAT_V_UUID, BAT_PCT_UUID, PRESSURE_UUID, TEMP_UUID, ...VARIO_UUIDS])
      await ensureLive(u)
    await takeSample()
  }

  watch(() => bt.isConnected, (on, was) => {
    if (on !== was && was !== undefined)
      events.value.push({ t: isoNow(), event: on ? `connected ${bt.devName}` : 'disconnected' })
    if (on)
      void startSampling()
  }, { immediate: true })

  if (typeof window !== 'undefined') {
    timer = setInterval(() => {
      // Nothing to learn from an idle page without a device.
      if (bt.isConnected || bt.hasConnectedThisSession)
        void takeSample()
    }, SAMPLE_PERIOD_MS)
  }

  onBeforeUnmount(() => clearInterval(timer))

  // --- the report ---------------------------------------------------------

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

  function baseReport(): DiagnosticsReport {
    return {
      schema: DIAGNOSTICS_SCHEMA,
      generatedAt: isoNow(),
      ...envBlock(),
      problem: '',
      device: null,
      firmware: null,
      characteristics: [],
      incompleteChars: [],
      samples: samples.value.slice(),
      events: events.value.slice(),
      errors: {
        connect: bt.errorMessage || null,
        firmwareUpdate: flash.error.value,
      },
      log: getSessionLog(),
      unavailable: [],
    }
  }

  /** Browser-only part — works with no device at all. */
  function collectOffline(): void {
    const r = baseReport()
    if (!bt.isConnected)
      r.unavailable.push('Device: not connected')
    report.value = r
  }

  async function collect(): Promise<void> {
    if (collecting.value)
      return
    if (!bt.isConnected) {
      collectOffline()
      return
    }
    collecting.value = true
    try {
      await ensureLocaleMessages('en')
      const r = baseReport()
      const others = bt.bleCharacteristics.filter(c =>
        normalizeUuid(c.characteristic.service.uuid) !== DIS_SERVICE) as BleCharacteristic[]
      progress.value = { done: 0, total: others.length + 2 }

      const dis = await readDis()
      progress.value.done++
      r.unavailable.push(...dis.missing)
      r.device = { name: bt.devName || null, ...dis.values }

      for (const ch of others) {
        if (!bt.isConnected)
          break
        r.characteristics.push(await snapshotChar(ch))
        progress.value.done++
      }
      r.incompleteChars = [...bt.incompleteChars]

      r.firmware = bt.isConnected ? await readFirmware() : null
      progress.value.done++
      if (r.firmware?.error)
        r.unavailable.push(`Firmware slots: ${r.firmware.error}`)
      if (r.firmware && !r.firmware.bootloader)
        r.unavailable.push('Bootloader: not reported by the device (MCUmgr bootloader info not enabled)')

      const has = (u: string) => r.characteristics.some(c => c.uuid === u)
      if (!has(BAT_PCT_UUID) && !has(BAT_V_UUID))
        r.unavailable.push('Battery: the device exposes neither level nor voltage')
      if (!VARIO_UUIDS.some(has) && !has(PRESSURE_UUID))
        r.unavailable.push('Vario / pressure: not exposed by this device')
      r.unavailable.push('Link quality (RSSI): not available to web pages on a live connection — GATT read round-trip is sampled instead')
      if (!bt.isConnected)
        r.unavailable.push('Device disconnected while the report was being collected — it is partial')

      // Take a fresh sample so the report has a data point from right now.
      await takeSample()
      r.samples = samples.value.slice()
      r.events = events.value.slice()
      r.log = getSessionLog()
      report.value = r
    }
    catch (e) {
      log.error('diagnostics: collection failed', e)
      collectOffline()
    }
    finally {
      collecting.value = false
    }
  }

  /**
   * Latest report with the live parts (samples, log, events) and the
   * pilot's problem text brought up to date — what Copy / Download / Send use.
   */
  function current(problem: string): DiagnosticsReport {
    const r = report.value ?? baseReport()
    return {
      ...r,
      ...envBlock(),
      problem,
      samples: samples.value.slice(),
      events: events.value.slice(),
      log: getSessionLog(),
      errors: {
        connect: bt.errorMessage || r.errors.connect,
        firmwareUpdate: flash.error.value ?? r.errors.firmwareUpdate,
      },
    }
  }

  const sampleCount = computed(() => samples.value.length)

  return { report, collecting, progress, samples, sampleCount, events, collect, collectOffline, current }
}
