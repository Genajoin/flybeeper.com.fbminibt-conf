import { describe, expect, it } from 'vitest'
import { FW_TRIAL_BOOT_SAFE_FROM, needsPermanentSwap } from '~/utils/firmwareVersion'

describe('needsPermanentSwap — trial boot only where the watchdog allows it', () => {
  it('marks permanent on firmware older than the watchdog fix', () => {
    expect(needsPermanentSwap('0.24.0-0-g1234567')).toBe(true)
    expect(needsPermanentSwap('0.26.0-0-G6DF3410')).toBe(true)
    expect(needsPermanentSwap('0.28.1-0-g9809899')).toBe(true)
    expect(needsPermanentSwap('0.28.2-0-g2c82494')).toBe(true)
  })

  it('keeps trial boot from the fix onwards', () => {
    expect(needsPermanentSwap(`${FW_TRIAL_BOOT_SAFE_FROM}-0-gabcdef0`)).toBe(false)
    expect(needsPermanentSwap('0.28.4')).toBe(false)
    expect(needsPermanentSwap('0.29.0-3-g0000000')).toBe(false)
    expect(needsPermanentSwap('1.0.0')).toBe(false)
  })

  it('treats an unknown version as old', () => {
    expect(needsPermanentSwap(null)).toBe(true)
    expect(needsPermanentSwap(undefined)).toBe(true)
    expect(needsPermanentSwap('')).toBe(true)
    expect(needsPermanentSwap('garbage')).toBe(true)
  })
})
