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
