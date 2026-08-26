/**
 * Stats for the live traces behind the dashboard sparklines.
 *
 * The sparkline shows the SHAPE of the last ~30 s but says nothing about the
 * scale it was drawn at: every cell auto-fits its own min/max, so a 0.2 Pa
 * wobble and a 40 Pa dive look identical. These numbers spell the axes out —
 * vertical extent (min/max) and horizontal extent (window length) —
 * under the big readout.
 */

export interface TracePoint { t: number, v: number }

export interface TraceStats {
  min: number
  max: number
  /** Window length left→right, seconds (0 when all samples share a timestamp). */
  spanSec: number
}

/** Null when there is nothing to describe yet (a single point has no extent). */
export function traceStats(trace: readonly TracePoint[]): TraceStats | null {
  if (trace.length < 2)
    return null
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const p of trace) {
    if (!Number.isFinite(p.v))
      continue
    if (p.v < min)
      min = p.v
    if (p.v > max)
      max = p.v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max))
    return null
  const span = (trace[trace.length - 1].t - trace[0].t) / 1000
  return { min, max, spanSec: span > 0 ? span : 0 }
}

/** Window length: seconds, one decimal only while it is still short. */
export function formatSpanSec(sec: number): string {
  return sec >= 10 ? sec.toFixed(0) : sec.toFixed(1)
}
