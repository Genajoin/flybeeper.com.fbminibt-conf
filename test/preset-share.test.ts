import { describe, expect, it } from 'vitest'
import { buildShareUrl, decodePreset, encodePreset, readPresetFromUrl } from '../src/utils/preset-share'

describe('preset-share codec', () => {
  it('round-trips a settings bag', () => {
    const settings = {
      '67f82d94-2b2a-4123-81c9-058e460c3d01': 2,
      '512d6d89-7a6f-461c-983e-902b68d40f56': [-1400, -800, -100, 0, 5, 20, 100, 200, 300, 450, 1200, 2000],
      'daadb8a9-a566-450e-97d0-990a0c8487dd': true,
    }
    const fragment = encodePreset(settings, 'Aggressive thermal')
    const decoded = decodePreset(fragment)
    expect(decoded).not.toBeNull()
    expect(decoded?.name).toBe('Aggressive thermal')
    expect(decoded?.settings).toEqual(settings)
    expect(decoded?.bytes).toBe(fragment.length)
  })

  it('returns null for invalid base64', () => {
    expect(decodePreset('not-a-real-base64-####')).toBeNull()
  })

  it('returns null for non-object payloads', () => {
    const fragment = encodePreset({} as never, 'empty')
    // Manually flip the payload to a string
    const bad = btoa('"not an object"').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
    expect(decodePreset(bad)).toBeNull()
    // Empty {} is still valid (empty settings bag)
    expect(decodePreset(fragment)).not.toBeNull()
  })

  it('rejects payloads with object-valued settings entries', () => {
    const bad = btoa(JSON.stringify({ name: 'x', settings: { foo: { nested: 1 } } }))
      .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
    expect(decodePreset(bad)).toBeNull()
  })

  it('readPresetFromUrl parses a #preset= hash', () => {
    const settings = { '67f82d94-2b2a-4123-81c9-058e460c3d01': 3 }
    const fragment = encodePreset(settings, '')
    const decoded = readPresetFromUrl(`#preset=${fragment}`)
    expect(decoded?.settings).toEqual(settings)
  })

  it('readPresetFromUrl returns null when the hash does not match', () => {
    expect(readPresetFromUrl('#other=xyz')).toBeNull()
    expect(readPresetFromUrl('')).toBeNull()
  })

  it('buildShareUrl strips any existing hash / query', () => {
    const url = buildShareUrl('https://example.com/foo#stale', { x: 1 }, 'n')
    expect(url.startsWith('https://example.com/foo#preset=')).toBe(true)
  })
})
