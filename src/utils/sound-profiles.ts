import type { SettingsLocal } from '~/stores/settings'
import { TRIGGER_UUIDS } from '~/utils/trigger-presets'
import { parsePresetJson } from '~/utils/preset-import'
import { clampSettings } from '~/utils/setting-limits'

/**
 * The pilot's own sound profiles: named settings bags kept in this browser
 * only. A profile holds whatever it was saved with — the four curves, the
 * trigger values, or a whole shared preset — and each picker (curves, "when
 * it sounds") lists and applies only its own part of it.
 */

export const CURVE_PROFILE_UUIDS = [
  '512d6d89-7a6f-461c-983e-902b68d40f56', // vario breakpoints
  '8c090502-81c4-4d29-8d10-6db20607ace9', // frequency
  '9c3b62c0-e227-4f1a-8342-7e647015555d', // cycle
  '98c16914-00ad-47ba-b625-148f0baaec47', // duty
]

export type ProfileScope = 'curves' | 'trigger'

export const SCOPE_UUIDS: Record<ProfileScope, string[]> = {
  curves: CURVE_PROFILE_UUIDS,
  trigger: Object.values(TRIGGER_UUIDS),
}

export interface SoundProfile {
  id: string
  name: string
  /** ms since epoch. */
  savedAt: number
  settings: SettingsLocal
}

/** The scope's part of a bag, or null when the bag has none of it. Curves count only whole. */
export function pickScope(bag: SettingsLocal | null | undefined, scope: ProfileScope): SettingsLocal | null {
  if (!bag)
    return null
  const keys = SCOPE_UUIDS[scope].filter(k => bag[k] !== undefined)
  if (!keys.length || (scope === 'curves' && keys.length < CURVE_PROFILE_UUIDS.length))
    return null
  return Object.fromEntries(keys.map(k => [k, bag[k]]))
}

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number')
    return Math.abs(a - b) < 0.005
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => sameValue(v, b[i]))
  return a === b
}

/** First profile whose scope part equals the current values. */
export function matchProfile(list: SoundProfile[], local: SettingsLocal | null | undefined, scope: ProfileScope): SoundProfile | null {
  if (!local)
    return null
  return list.find((p) => {
    const part = pickScope(p.settings, scope)
    return part !== null && Object.entries(part).every(([k, v]) => sameValue(local[k], v))
  }) ?? null
}

/** "Thermal", "Thermal (2)", … — names stay unique so the list reads unambiguously. */
export function uniqueName(name: string, list: SoundProfile[], exceptId?: string): string {
  const base = name.trim() || 'Profile'
  const taken = new Set(list.filter(p => p.id !== exceptId).map(p => p.name.toLowerCase()))
  if (!taken.has(base.toLowerCase()))
    return base
  for (let i = 2; ; i++) {
    const n = `${base} (${i})`
    if (!taken.has(n.toLowerCase()))
      return n
  }
}

export function newProfileId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** One profile as a preset file — the same shape the share strip downloads and uploads. */
export function profileToJson(p: SoundProfile): string {
  return JSON.stringify({ name: p.name, by: '', settings: p.settings }, null, 2)
}

/** Every profile in one backup file. */
export function profilesToJson(list: SoundProfile[]): string {
  return JSON.stringify({
    profiles: list.map(p => ({ name: p.name, savedAt: p.savedAt, settings: p.settings })),
  }, null, 2)
}

/**
 * Read a backup (`{ profiles: […] }`) or any single preset file the import
 * button understands. Values are pulled into the device's ranges like any
 * other import. Returns [] when nothing in the file is a preset.
 */
export function profilesFromJson(text: string, fallbackName: string): { name: string, savedAt?: number, settings: SettingsLocal }[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch {
    return []
  }
  const bundle = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as { profiles?: unknown }).profiles
    : undefined
  if (Array.isArray(bundle)) {
    const out: { name: string, savedAt?: number, settings: SettingsLocal }[] = []
    for (const entry of bundle) {
      if (!entry || typeof entry !== 'object')
        continue
      const e = entry as { name?: unknown, savedAt?: unknown, settings?: unknown }
      const one = parsePresetJson(JSON.stringify({ name: e.name, settings: e.settings }), fallbackName)
      if (one) {
        out.push({
          name: one.name,
          savedAt: typeof e.savedAt === 'number' ? e.savedAt : undefined,
          settings: clampSettings(one.settings).settings,
        })
      }
    }
    return out
  }
  const one = parsePresetJson(text, fallbackName)
  return one ? [{ name: one.name, settings: clampSettings(one.settings).settings }] : []
}
