/**
 * Module-scope zoom state for the curve editor on /settings/audio.
 *
 * Shared so the simulator slider (SimulatorControls) shows the same vario
 * window as the chart: at 1× the chart spans the whole curve and the slider
 * the flyable −5…+10 m/s; zoomed in, both span the chart's visible window,
 * which is the slider span divided by the zoom (2× = 7.5 m/s, 10× = 1.5 m/s).
 */

/** Simulator slider span at 1×, m/s. */
export const SIM_MIN_MS = -5
export const SIM_MAX_MS = 10
export const SIM_SPAN_CMS = (SIM_MAX_MS - SIM_MIN_MS) * 100

const zoomLevel = ref(1)
/** Chart's visible vario window in cm/s while zoomed in; null at 1×. */
const viewWindowCmS = ref<{ min: number, max: number } | null>(null)

export function useCurveZoom() {
  return { zoomLevel, viewWindowCmS }
}
