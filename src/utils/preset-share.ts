import type { SettingsLocal } from '~/stores/settings'

/**
 * URL-fragment preset codec.
 *
 * Encodes `SettingsLocal` (Record<UUID, value>) as base64-url JSON suitable
 * for sharing via `#preset=…`. Static-hosting safe: the fragment never
 * reaches the server.
 *
 * Decoder is permissive — anything that parses as a plain object of
 * primitives / number-arrays / booleans is accepted. The Apply step
 * walks the keys and only writes UUIDs that match a known characteristic.
 */

export interface EncodedPreset {
  name: string
  settings: SettingsLocal
  /** Approximate byte size of the encoded fragment (excluding the `#preset=` prefix). */
  bytes: number
}

function toBase64Url(s: string): string {
  // btoa exists in the browser and in Node ≥16 — the codec is always run
  // in those environments (vitest uses jsdom, vite-ssg runs Node).
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(escape(atob(b64)))
  }
  catch {
    return ''
  }
}

/**
 * Encode a settings bag (and optional name) into a `#preset=…` fragment string.
 * Returns just the encoded portion, not including the `#preset=` prefix.
 */
export function encodePreset(settings: SettingsLocal, name = ''): string {
  const payload = JSON.stringify({ name, settings })
  return toBase64Url(payload)
}

/**
 * Decode a fragment value. Returns null on any failure (bad base64, non-JSON,
 * non-object payload, missing settings). Caller is responsible for validating
 * the UUIDs against the live characteristic list.
 */
export function decodePreset(fragment: string): EncodedPreset | null {
  if (!fragment)
    return null
  const json = fromBase64Url(fragment)
  if (!json)
    return null
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  }
  catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object')
    return null
  const obj = parsed as Record<string, unknown>
  const settings = obj.settings
  if (!settings || typeof settings !== 'object')
    return null
  const name = typeof obj.name === 'string' ? obj.name : ''
  // light validation: every value must be a primitive or a finite-number array.
  for (const [, v] of Object.entries(settings as Record<string, unknown>)) {
    if (v === null || v === undefined)
      continue
    if (typeof v === 'boolean' || typeof v === 'string')
      continue
    if (typeof v === 'number' && Number.isFinite(v))
      continue
    if (Array.isArray(v) && v.every(n => typeof n === 'number' && Number.isFinite(n)))
      continue
    // Unknown shape — reject.
    return null
  }
  return {
    name,
    settings: settings as SettingsLocal,
    bytes: new Blob([fragment]).size,
  }
}

/** Parse `window.location.hash` and return the decoded preset (or null). */
export function readPresetFromUrl(hash: string): EncodedPreset | null {
  const m = hash.match(/^#preset=(.+)$/)
  if (!m)
    return null
  return decodePreset(m[1])
}

/** Build a full share URL: `<location.origin><pathname>#preset=…`. */
export function buildShareUrl(base: string, settings: SettingsLocal, name = ''): string {
  return `${base.replace(/[#?].*$/, '')}#preset=${encodePreset(settings, name)}`
}
