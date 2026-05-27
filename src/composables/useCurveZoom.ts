/**
 * Module-scope zoom state for the curve editor on /settings/audio.
 *
 * Shared so siblings on the page (SimulatorControls) can adapt to the
 * current zoom — at 10× the slider drops to 0.01 m/s granularity to let
 * the user nudge the simulator across the narrow dead-band around zero.
 */
const zoomLevel = ref(1)

export function useCurveZoom() {
  return { zoomLevel }
}
