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
