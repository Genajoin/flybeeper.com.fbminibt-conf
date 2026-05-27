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
 *
 * **QR-friendly compaction**: every UUID we ship with is mapped to a 2-char
 * code (e.g. `_a`, `_b`); the JSON payload becomes `[name, {code: value}]`
 * instead of `{name, settings: {UUID: value}}`. Unknown keys (e.g. third-
 * party UUIDs the device exposes that we don't track) fall through as-is
 * so the codec is lossless. The `_`-prefix on codes guarantees no clash
 * with UUIDs (which contain `-`) or arbitrary user keys.
 */

export interface EncodedPreset {
  name: string
  settings: SettingsLocal
  /** Approximate byte size of the encoded fragment (excluding the `#preset=` prefix). */
  bytes: number
}

// All UUIDs the configurator owns. Order is load-bearing — codes are
// allocated by index, so do NOT reorder or remove entries (append-only).
// New UUIDs go at the end to keep older shared URLs decodable.
const SHARE_UUIDS = [
  // audio (0–7)
  '67f82d94-2b2a-4123-81c9-058e460c3d01',
  'fcb14ed9-06e7-4a9e-b311-6eee676a2f48',
  '1673f137-66c1-4ff0-8db3-69b9ed7c33e0',
  'b713f438-42fe-46fe-b052-371a3b9e433a',
  '8a78979b-1425-4160-b34b-ac5aadddeb21',
  '0e984fe9-534c-4f13-969c-58ce03d33527',
  'e88b07e7-9035-4afa-9fe8-206ddc34de61',
  '7e035080-7417-4393-959a-58505ef9cf4a',
  // curves (8–11)
  '512d6d89-7a6f-461c-983e-902b68d40f56',
  '8c090502-81c4-4d29-8d10-6db20607ace9',
  '9c3b62c0-e227-4f1a-8342-7e647015555d',
  '98c16914-00ad-47ba-b625-148f0baaec47',
  // behaviour (12–14)
  'daadb8a9-a566-450e-97d0-990a0c8487dd',
  'a37e549a-f501-4e77-9c3d-291c85542471',
  '86591053-2856-4f25-a35c-b753f0deea8f',
  // uart (15–16)
  '84ccd3d4-a262-45e6-b616-d4a4ae7c0d5b',
  '113bb48c-7e3f-4580-a561-acf6c9eb42a5',
  // power (17–18)
  'd9eec180-344e-41e3-8c18-adf312dce8bb',
  '9a560750-0bca-4d0c-a1fc-21bbc574d5a6',
  // simulator (19)
  '904baf04-5814-11ee-8c99-0242ac120002',
]

const CODE_ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function indexToCode(i: number): string {
  if (i < CODE_ALPHA.length)
    return `_${CODE_ALPHA[i]}`
  const a = Math.floor(i / CODE_ALPHA.length)
  const b = i % CODE_ALPHA.length
  return `_${CODE_ALPHA[a]}${CODE_ALPHA[b]}`
}

const UUID_TO_CODE = new Map<string, string>(SHARE_UUIDS.map((u, i) => [u, indexToCode(i)]))
const CODE_TO_UUID = new Map<string, string>(
  [...UUID_TO_CODE].map(([u, c]) => [c, u]),
)

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

function isValidValue(v: unknown): boolean {
  if (v === null || v === undefined)
    return true
  if (typeof v === 'boolean' || typeof v === 'string')
    return true
  if (typeof v === 'number' && Number.isFinite(v))
    return true
  if (Array.isArray(v) && v.every(n => typeof n === 'number' && Number.isFinite(n)))
    return true
  return false
}

/**
 * Encode a settings bag (and optional name) into a `#preset=…` fragment string.
 * Returns just the encoded portion, not including the `#preset=` prefix.
 */
export function encodePreset(settings: SettingsLocal, name = ''): string {
  const compact: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(settings)) {
    if (v === undefined)
      continue
    const code = UUID_TO_CODE.get(k)
    compact[code ?? k] = v
  }
  // Array form skips JSON object overhead ("n"/"s" keys and quotes).
  const payload = JSON.stringify([name, compact])
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

  // Two accepted shapes: array `[name, settings]` (current) and legacy
  // object `{name, settings}` (kept so older bookmarks don't break — even
  // though we haven't shipped one publicly yet).
  let name = ''
  let rawSettings: unknown = null
  if (Array.isArray(parsed)) {
    if (parsed.length < 2)
      return null
    name = typeof parsed[0] === 'string' ? parsed[0] : ''
    rawSettings = parsed[1]
  }
  else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    name = typeof obj.name === 'string' ? obj.name : ''
    rawSettings = obj.settings
  }
  else {
    return null
  }

  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings))
    return null

  const settings: SettingsLocal = {}
  for (const [k, v] of Object.entries(rawSettings as Record<string, unknown>)) {
    if (!isValidValue(v))
      return null
    const uuid = CODE_TO_UUID.get(k) ?? k
    settings[uuid] = v
  }

  return {
    name,
    settings,
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
