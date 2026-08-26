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

/** A point on the sparkline, in percent of the plotting box (0..100). */
export interface SparkPoint { x: number, y: number }

export interface SparkGeometry {
  /** Path for a `0 0 100 100` viewBox drawn with preserveAspectRatio="none". */
  path: string
  /** Where the lowest / highest sample sits, for the marker dots. */
  min: SparkPoint
  max: SparkPoint
  /** Y of the zero line, or null when zero is outside the plotted range. */
  zeroY: number | null
}

/**
 * Geometry of the sparkline in ONE pass: the path and the coordinates of the
 * extremes, computed against the same scale. Both callers used to build the
 * path themselves; the marker dots have to land exactly on the drawn line, so
 * the padding and the scaling now live in a single place.
 *
 * `padFrac` is headroom above and below the data, as a fraction of its span —
 * without it a trace touching its own extremes would be clipped by the box.
 */
export function sparkGeometry(trace: readonly TracePoint[], padFrac = 0.15): SparkGeometry | null {
  if (trace.length < 2)
    return null
  let lo = Number.POSITIVE_INFINITY
  let hi = Number.NEGATIVE_INFINITY
  let loI = 0
  let hiI = 0
  for (let i = 0; i < trace.length; i++) {
    const v = trace[i].v
    if (!Number.isFinite(v))
      continue
    if (v < lo) {
      lo = v
      loI = i
    }
    if (v > hi) {
      hi = v
      hiI = i
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi))
    return null
  // A flat trace has no span to scale by — give it one so it draws mid-box.
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  else {
    const pad = (hi - lo) * padFrac
    lo -= pad
    hi += pad
  }
  const t0 = trace[0].t
  const span = Math.max(trace[trace.length - 1].t - t0, 1)
  const x = (i: number) => ((trace[i].t - t0) / span) * 100
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100
  const path = trace
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')
  return {
    path,
    min: { x: x(loI), y: y(trace[loI].v) },
    max: { x: x(hiI), y: y(trace[hiI].v) },
    zeroY: lo <= 0 && hi >= 0 ? y(0) : null,
  }
}
