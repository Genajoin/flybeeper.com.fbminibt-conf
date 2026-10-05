import { describe, expect, it } from 'vitest'
import type { SoundProfile } from '~/utils/sound-profiles'
import { CURVE_PROFILE_UUIDS, matchProfile, pickScope, profileToJson, profilesFromJson, profilesToJson, uniqueName } from '~/utils/sound-profiles'
import { CLIMB_ON_UUID, HYST_UUID, SINK_ON_UUID } from '~/utils/trigger-presets'

const VOLUME = '67f82d94-2b2a-4123-81c9-058e460c3d01'
const curves = Object.fromEntries(CURVE_PROFILE_UUIDS.map((u, i) => [u, Array.from({ length: 12 }, (_, j) => i * 100 + j)]))

function prof(name: string, settings: Record<string, unknown>): SoundProfile {
  return { id: name, name, savedAt: 0, settings }
}

describe('pickScope', () => {
  it('takes only the scope part', () => {
    const bag = { ...curves, [CLIMB_ON_UUID]: 0.1, [VOLUME]: 2 }
    expect(Object.keys(pickScope(bag, 'curves')!)).toEqual(CURVE_PROFILE_UUIDS)
    expect(pickScope(bag, 'trigger')).toEqual({ [CLIMB_ON_UUID]: 0.1 })
  })
  it('needs all four curves', () => {
    const { [CURVE_PROFILE_UUIDS[0]]: _, ...three } = curves
    expect(pickScope(three, 'curves')).toBeNull()
    expect(pickScope({ [VOLUME]: 1 }, 'trigger')).toBeNull()
  })
})

describe('matchProfile', () => {
  const list = [
    prof('a', { [CLIMB_ON_UUID]: 0.1, [SINK_ON_UUID]: -2 }),
    prof('b', { ...curves }),
  ]
  it('matches the scope part with float tolerance, ignoring other keys', () => {
    const local = { ...curves, [CLIMB_ON_UUID]: 0.1000001, [SINK_ON_UUID]: -2, [HYST_UUID]: 0.3 }
    expect(matchProfile(list, local, 'trigger')?.name).toBe('a')
    expect(matchProfile(list, local, 'curves')?.name).toBe('b')
  })
  it('no match when a value differs', () => {
    expect(matchProfile(list, { [CLIMB_ON_UUID]: 0.2, [SINK_ON_UUID]: -2 }, 'trigger')).toBeNull()
    expect(matchProfile(list, null, 'trigger')).toBeNull()
  })
})

describe('uniqueName', () => {
  const list = [prof('Thermal', {}), prof('Thermal (2)', {})]
  it('suffixes taken names, case-insensitively', () => {
    expect(uniqueName('thermal', list)).toBe('thermal (3)')
    expect(uniqueName('  Ridge ', list)).toBe('Ridge')
    expect(uniqueName('Thermal', list, 'Thermal')).toBe('Thermal')
  })
})

describe('jSON round trip', () => {
  it('a single profile reads back as a preset', () => {
    const p = prof('Mine', { [CLIMB_ON_UUID]: 0.1 })
    expect(profilesFromJson(profileToJson(p), 'x')).toEqual([{ name: 'Mine', settings: { [CLIMB_ON_UUID]: 0.1 } }])
  })
  it('a backup reads back every profile', () => {
    const list = [prof('A', { [CLIMB_ON_UUID]: 0.1 }), { ...prof('B', { [SINK_ON_UUID]: -3 }), savedAt: 5 }]
    const back = profilesFromJson(profilesToJson(list), 'x')
    expect(back.map(b => b.name)).toEqual(['A', 'B'])
    expect(back[1].savedAt).toBe(5)
  })
  it('junk gives nothing', () => {
    expect(profilesFromJson('not json', 'x')).toEqual([])
    expect(profilesFromJson('{"profiles":[{"name":"z","settings":{"foo":1}}]}', 'x')).toEqual([])
  })
})
