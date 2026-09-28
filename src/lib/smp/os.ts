import { SmpGroup, SmpOp, SmpOsCmd } from './codec'
import type { SmpTransport } from './transport'

/** OS management (SMP group 0): reset, echo, transport parameters. */

export interface McumgrParams {
  /** Largest SMP frame the device can reassemble. */
  bufSize: number
  bufCount: number
}

/**
 * Ask the device how big an SMP frame it can take. Optional on the device side
 * (CONFIG_MCUMGR_GRP_OS_MCUMGR_PARAMS) — returns null when unsupported, and the
 * caller falls back to a conservative chunk size.
 */
export async function mcumgrParams(t: SmpTransport, signal?: AbortSignal): Promise<McumgrParams | null> {
  try {
    const rsp = await t.request(SmpOp.Read, SmpGroup.Os, SmpOsCmd.McumgrParams, {}, { signal, timeoutMs: 5000 })
    const bufSize = rsp.buf_size
    const bufCount = rsp.buf_count
    if (typeof bufSize !== 'number' || typeof bufCount !== 'number')
      return null
    return { bufSize, bufCount }
  }
  catch {
    return null
  }
}

/**
 * Reboot the device. The link drops as a result, so a missing response is the
 * normal outcome rather than a failure — only a rejection before the reboot
 * (non-zero rc) is worth reporting, and that arrives fast.
 */
export async function osReset(t: SmpTransport, signal?: AbortSignal): Promise<void> {
  try {
    await t.request(SmpOp.Write, SmpGroup.Os, SmpOsCmd.Reset, {}, { signal, timeoutMs: 3000 })
  }
  catch (error) {
    if (signal?.aborted)
      throw error
    // Timed out / link torn down mid-reboot — the device is on its way down.
  }
}

/**
 * `uname`-style description of the running image (OS group, command 7), e.g.
 * `Zephyr unknown 3.7.0 … nrf52832 …` for format `a`. Optional on the device
 * side (CONFIG_MCUMGR_GRP_OS_INFO) — null when unsupported or on any error,
 * because a diagnostics caller wants "not available", not an exception.
 */
export async function osInfo(t: SmpTransport, format = 'a', signal?: AbortSignal): Promise<string | null> {
  try {
    const rsp = await t.request(SmpOp.Read, SmpGroup.Os, SmpOsCmd.Info, { format }, { signal, timeoutMs: 5000 })
    return typeof rsp.output === 'string' ? rsp.output : null
  }
  catch {
    return null
  }
}

/**
 * Which bootloader the device runs and, for MCUboot, in what mode (OS group,
 * command 8). Returns the raw response map — the fields differ between
 * bootloaders — or null when unsupported (CONFIG_MCUMGR_GRP_OS_BOOTLOADER_INFO).
 * MCUboot does not report its own version through this command.
 */
export async function bootloaderInfo(t: SmpTransport, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
  try {
    const rsp = await t.request(SmpOp.Read, SmpGroup.Os, SmpOsCmd.BootloaderInfo, {}, { signal, timeoutMs: 5000 })
    if (typeof rsp.bootloader !== 'string')
      return null
    const info: Record<string, unknown> = { ...rsp }
    if (rsp.bootloader === 'MCUboot') {
      // Swap mode (0 single, 3 swap-using-move, …) and the downgrade guard.
      try {
        const mode = await t.request(SmpOp.Read, SmpGroup.Os, SmpOsCmd.BootloaderInfo, { query: 'mode' }, { signal, timeoutMs: 5000 })
        Object.assign(info, mode)
      }
      catch { /* mode query unsupported — the name alone is still useful */ }
    }
    return info
  }
  catch {
    return null
  }
}
