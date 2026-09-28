/**
 * Ring buffer of what the app logged in this tab — the diagnostics report
 * attaches it, so a user's email carries the BLE / OTA errors that happened
 * before they opened /diagnostics, not only the ones after.
 *
 * Filled from the loglevel method factory (modules/logs.ts), which sees every
 * message at the enabled level: warn + error on production, everything with
 * `?debug=1`. Lives in memory only — a reload starts a fresh session, which is
 * also the scope the report claims.
 */
export interface SessionLogEntry {
  /** ISO timestamp. */
  t: string
  level: string
  msg: string
}

const MAX_ENTRIES = 300
const MAX_MSG_LENGTH = 500

const entries: SessionLogEntry[] = []

function stringify(arg: unknown): string {
  if (arg instanceof Error)
    return arg.name && !arg.message.startsWith(arg.name) ? `${arg.name}: ${arg.message}` : arg.message
  if (typeof arg === 'string')
    return arg
  try {
    return JSON.stringify(arg)
  }
  catch {
    return String(arg)
  }
}

export function recordLog(level: string, args: unknown[]): void {
  let msg = args.map(stringify).join(' ')
  if (msg.length > MAX_MSG_LENGTH)
    msg = `${msg.slice(0, MAX_MSG_LENGTH)}…`
  entries.push({ t: new Date().toISOString(), level, msg })
  if (entries.length > MAX_ENTRIES)
    entries.splice(0, entries.length - MAX_ENTRIES)
}

export function getSessionLog(): SessionLogEntry[] {
  return entries.slice()
}

export function clearSessionLog(): void {
  entries.length = 0
}
