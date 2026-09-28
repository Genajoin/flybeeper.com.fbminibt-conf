import { ref } from 'vue'
import type {
  DiagAction,
  DiagCharacteristic,
  DiagEvent,
  DiagSample,
  DiagnosticsReport,
} from '~/utils/diagnostics'
import { pushAction } from '~/utils/diagnostics'

/**
 * Everything the diagnostics report knows, accumulated from app start.
 *
 * The pilot is told to reproduce the problem in the configurator first and
 * only then open /diagnostics — so the evidence has to be gathered before the
 * page exists: what they did, what the device said, how the battery moved.
 * And it must survive a disconnect: the bluetooth store wipes its
 * characteristics on every link loss, the journal keeps the last known state.
 *
 * MEMORY ONLY, by agreement with the owner: no localStorage, IndexedDB or
 * cookies. A reload starts a new session; nothing leaves the tab until the
 * pilot presses Send / Download / Copy.
 */

export type DeviceInfo = NonNullable<DiagnosticsReport['device']>
export type FirmwareInfo = NonNullable<DiagnosticsReport['firmware']>

export interface DeviceRecord {
  key: string
  info: DeviceInfo
  /** Keyed by characteristic UUID; the last value seen, however it was seen. */
  characteristics: Map<string, DiagCharacteristic>
  /** Discovery order, so the report lists characteristics the way the device does. */
  order: string[]
  firmware: (FirmwareInfo & { at: string }) | null
  incompleteChars: string[]
  firstConnected: string
  lastConnected: string
  /** Start of the current / latest connection — "read on this link" means at >= this. */
  linkStart: string
}

const MAX_ACTIONS = 1000
const MAX_SAMPLES = 1000 // ~4 h at one sample per 15 s
const MAX_EVENTS = 300
/** Slider drags and held knobs fold into one entry inside this window. */
export const ACTION_COALESCE_MS = 3000

export const journal = {
  actions: [] as DiagAction[],
  events: [] as DiagEvent[],
  samples: [] as DiagSample[],
  devices: new Map<string, DeviceRecord>(),
  /** Key of the device connected now, or connected most recently. */
  currentKey: null as string | null,
  startedAt: new Date().toISOString(),
}

/**
 * Bumped on every change. The journal itself is plain data (it can hold
 * hundreds of entries and is written from BLE callbacks); views that show it
 * read this counter to know when to re-render.
 */
export const journalRev = ref(0)

function touch(): void {
  journalRev.value++
}

export function isoNow(): string {
  return new Date().toISOString()
}

/**
 * Log one thing the pilot did. `key` folds a burst on the same control into
 * one entry; `value` (+ `unit`) keeps the burst's range, so a slider drag
 * reads "×219, range -3.2 … 5.1 m/s" instead of only its final position.
 */
export function recordAction(kind: string, msg: string, key?: string, value?: { v: number, unit?: string }): void {
  pushAction(journal.actions, {
    t: isoNow(),
    kind,
    msg,
    ...(key ? { key } : {}),
    ...(value ? { value: value.v, ...(value.unit ? { unit: value.unit } : {}) } : {}),
  }, ACTION_COALESCE_MS, MAX_ACTIONS)
  touch()
}

export function recordEvent(event: string): void {
  journal.events.push({ t: isoNow(), event })
  if (journal.events.length > MAX_EVENTS)
    journal.events.splice(0, journal.events.length - MAX_EVENTS)
  touch()
}

export function recordSample(s: DiagSample): void {
  journal.samples.push(s)
  if (journal.samples.length > MAX_SAMPLES)
    journal.samples.splice(0, journal.samples.length - MAX_SAMPLES)
  touch()
}

/** Open (or reopen) the record for a device that just connected. */
export function beginDevice(key: string, info: DeviceInfo): DeviceRecord {
  const now = isoNow()
  let rec = journal.devices.get(key)
  if (!rec) {
    rec = {
      key,
      info,
      characteristics: new Map(),
      order: [],
      firmware: null,
      incompleteChars: [],
      firstConnected: now,
      lastConnected: now,
      linkStart: now,
    }
    journal.devices.set(key, rec)
  }
  else {
    // Keep fields the new link has not produced yet — never blank out what we knew.
    for (const [k, v] of Object.entries(info) as [keyof DeviceInfo, string | null][]) {
      if (v !== null)
        rec.info[k] = v
    }
    rec.lastConnected = now
    rec.linkStart = now
  }
  journal.currentKey = key
  touch()
  return rec
}

export function currentDevice(): DeviceRecord | null {
  return journal.currentKey ? journal.devices.get(journal.currentKey) ?? null : null
}

export function putCharacteristic(rec: DeviceRecord, c: DiagCharacteristic): void {
  if (!rec.characteristics.has(c.uuid))
    rec.order.push(c.uuid)
  rec.characteristics.set(c.uuid, c)
  touch()
}

export function setFirmware(rec: DeviceRecord, fw: FirmwareInfo): void {
  rec.firmware = { ...fw, at: isoNow() }
  touch()
}

export function markDeviceChanged(): void {
  touch()
}

/** For tests only. */
export function resetJournal(): void {
  journal.actions.length = 0
  journal.events.length = 0
  journal.samples.length = 0
  journal.devices.clear()
  journal.currentKey = null
  touch()
}
