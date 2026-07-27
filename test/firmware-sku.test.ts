import { describe, expect, it } from 'vitest'
import { resolveSku } from '../src/composables/useFirmwareUpdate'
import { DEVICE_CATALOG } from '../src/composables/useDeviceCatalog'

describe('resolveSku — DIS model number → catalog SKU', () => {
  it('resolves the FANET Vario by the model it reports', () => {
    // The device answers 'FBFV' on DIS 0x2A24; the catalog SKU matches it, so
    // no per-device mapping is needed for the update indicator to work.
    expect(resolveSku('FBFV')).toBe('fbfv')
    expect(resolveSku('fbfv')).toBe('fbfv')
  })

  it('does not confuse FBFV with the FANET radio', () => {
    expect(resolveSku('FBFANET')).toBe('fbfanet')
    expect(resolveSku('FBFANET rev4')).toBe('fbfanet')
  })

  it('still resolves every other shipped model', () => {
    expect(resolveSku('FBminiBT')).toBe('fbminibt')
    expect(resolveSku('FBTAS')).toBe('fbtas')
    expect(resolveSku('FBRC4')).toBe('fbrc4')
    expect(resolveSku('FBSV')).toBe('fbsv')
    expect(resolveSku('FBPS1')).toBe('fbps1')
  })

  it('returns null for an unknown model instead of guessing', () => {
    expect(resolveSku('SOMETHING-ELSE')).toBeNull()
    expect(resolveSku(null)).toBeNull()
    expect(resolveSku('')).toBeNull()
  })

  it('every catalog SKU resolves to itself', () => {
    for (const device of DEVICE_CATALOG)
      expect(resolveSku(device.sku)).toBe(device.sku)
  })
})
