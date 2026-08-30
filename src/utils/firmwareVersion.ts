/**
 * Firmware version parser/comparator. Both device-reported FW strings
 * (e.g. "0.23.7-0-G41DAB42") and bin filenames (e.g. "0.21.0") are now
 * clean 3-part semver after stripGitDescribe(), so the comparator is a
 * stock tuple compare. Missing patch is coerced to 0.
 */

export function stripGitDescribe(s: string | null | undefined): string {
  if (!s)
    return ''
  // "0.23.7-0-G41DAB42" → "0.23.7"
  const dash = s.indexOf('-')
  return (dash >= 0 ? s.slice(0, dash) : s).trim()
}

export function parseFwVersion(s: string): [number, number, number] | null {
  const clean = stripGitDescribe(s)
  if (!clean)
    return null
  const parts = clean.split('.')
  if (parts.length < 2 || parts.length > 3)
    return null
  const nums = parts.map(p => Number.parseInt(p, 10))
  if (nums.some(n => !Number.isFinite(n)))
    return null
  const [major, minor, patch = 0] = nums
  return [major, minor, patch]
}

export function compareFwVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseFwVersion(a)
  const pb = parseFwVersion(b)
  if (!pa || !pb) {
    if (a === b)
      return 0
    return a < b ? -1 : 1
  }
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i])
      return -1
    if (pa[i] > pb[i])
      return 1
  }
  return 0
}

/**
 * First firmware whose hardware watchdog window (6 s) outlives MCUboot's
 * image check. Older builds arm the nRF52 hardware watchdog with a 0.6 s
 * window, and that watchdog survives the software reset that starts an
 * update: MCUboot feeds it while copying sectors but not while verifying the
 * image (sha256 + RSA over ~200 KB, about 0.6 s), so the device resets right
 * after the swap finishes — and a trial-mode image that has not confirmed
 * itself by then gets rolled back. Measured on FBFV, 30.08.2026.
 */
export const FW_TRIAL_BOOT_SAFE_FROM = '0.28.3'

/**
 * Whether the image must be marked permanent (`confirm: true`) instead of
 * trial (`confirm: false`) for the device currently connected.
 *
 * Permanent is the only mode that survives the watchdog reset on firmware
 * older than FW_TRIAL_BOOT_SAFE_FROM: after the reset MCUboot sees the image
 * already confirmed and boots it instead of reverting. The price is the lost
 * safety net — a permanent image that fails to boot cannot be undone over the
 * air — so it is used only where trial boot cannot work at all. An unknown
 * version is treated as old: every device in the field predates the fix.
 */
export function needsPermanentSwap(currentFw: string | null | undefined): boolean {
  const clean = stripGitDescribe(currentFw)
  if (!clean || !parseFwVersion(clean))
    return true
  return compareFwVersions(clean, FW_TRIAL_BOOT_SAFE_FROM) < 0
}
