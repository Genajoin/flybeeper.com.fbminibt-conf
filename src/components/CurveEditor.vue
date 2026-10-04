<script setup lang="ts">
import type { ZoneKind } from '~/utils/threshold-model'
import { SIM_SPAN_CMS } from '~/composables/useCurveZoom'
import {
  CURVE_LIMITS,
  CYCLE_DOTS_UUID,
  DUTY_DOTS_UUID,
  FREQ_DOTS_UUID,
  VARIO_DOTS_UUID,
} from '~/utils/setting-limits'

export interface iVarioCurves {
  buzzer_vario_dots: number[]
  buzzer_frequency_dots: number[]
  buzzer_cycle_dots: number[]
  buzzer_duty_dots: number[]
}

const props = defineProps<{
  /**
   * Curves source. The editor mutates the arrays in-place so the host page's
   * dirty tracking (SettingsPanel + BleCharacteristic.formattedValue) picks
   * up the change without any extra plumbing.
   *
   * Vario values are kept in cm/s (matches the device's native unit) and only
   * rendered as m/s on the axis.
   */
  curvesOverride?: iVarioCurves | null
  /** Start-of-climb and start-of-sink thresholds, in cm/s. */
  climbOn?: number
  sinkOn?: number
}>()

const emit = defineEmits<{
  (e: 'update:climbOn', valueCmS: number): void
  (e: 'update:sinkOn', valueCmS: number): void
  (e: 'update:climbOff', valueCmS: number): void
  (e: 'update:sinkOff', valueCmS: number): void
}>()

const sim = useSimulation()
const { t } = useI18n()

type CurveKey = 'frequency' | 'cycle' | 'duty'
type ThresholdKey = 'climb-start' | 'climb-off' | 'sink-start' | 'sink-off'
type TabKey = CurveKey | ThresholdKey

interface CurveDef {
  key: CurveKey
  field: keyof iVarioCurves
  uuid: string
  unit: string
  /** Y-axis range the chart is drawn against — unchanged by the limits. */
  axisMin: number
  axisMax: number
  /**
   * Range a dragged handle is clamped to: the firmware's accepted range,
   * narrowed to what the axis can show. A frequency point below 100 Hz makes
   * the device reject and factory-reset ALL FOUR tone tables, so the editor
   * must not be able to produce one in the first place.
   */
  min: number
  max: number
  step: number
  color: string
  ticks: number
}

const VARIO_RANGE = { min: CURVE_LIMITS[VARIO_DOTS_UUID].min, max: CURVE_LIMITS[VARIO_DOTS_UUID].max, step: 5 }

function withDeviceLimits(def: Omit<CurveDef, 'min' | 'max'>): CurveDef {
  const limit = CURVE_LIMITS[def.uuid]
  return {
    ...def,
    min: Math.max(limit.min, def.axisMin),
    max: Math.min(limit.max, def.axisMax),
  }
}

const curveDefs: Record<CurveKey, CurveDef> = {
  frequency: withDeviceLimits({ key: 'frequency', field: 'buzzer_frequency_dots', uuid: FREQ_DOTS_UUID, unit: 'Hz', axisMin: 0, axisMax: 6000, step: 5, color: '#0aa0e0', ticks: 6 }),
  cycle: withDeviceLimits({ key: 'cycle', field: 'buzzer_cycle_dots', uuid: CYCLE_DOTS_UUID, unit: 'ms', axisMin: 0, axisMax: 1000, step: 5, color: '#9b5cff', ticks: 5 }),
  duty: withDeviceLimits({ key: 'duty', field: 'buzzer_duty_dots', uuid: DUTY_DOTS_UUID, unit: '%', axisMin: 0, axisMax: 100, step: 1, color: '#22c577', ticks: 5 }),
}

const CURVE_ORDER: CurveKey[] = ['frequency', 'cycle', 'duty']
const THRESHOLD_ORDER: ThresholdKey[] = ['climb-start', 'climb-off', 'sink-start', 'sink-off']
const TAB_ORDER: TabKey[] = [...CURVE_ORDER, ...THRESHOLD_ORDER]

// Literal hex (not CSS vars): SVG presentation attributes don't reliably
// resolve var() across engines. With hex we can just pass line.color to
// :fill / :stroke on the SVG element and trust it. Matches --ck-signal at
// the time of writing.
// `level` staggers the value chips vertically so close thresholds (climb-on
// at +0.10 next to sink-off at +0.05) don't print on top of each other.
const thresholdMeta: Record<ThresholdKey, { color: string, label: string, level: number }> = {
  'climb-start': { color: '#ff6a00', label: 'C-ON', level: 0 },
  'sink-start': { color: '#e08a00', label: 'S-ON', level: 1 },
  'climb-off': { color: '#ffa766', label: 'C-OFF', level: 2 },
  'sink-off': { color: '#5cc3ef', label: 'S-OFF', level: 3 },
}

const activeTab = ref<TabKey>('frequency')

const isThresholdTab = computed<boolean>(() =>
  (THRESHOLD_ORDER as TabKey[]).includes(activeTab.value),
)

// Visual fall-back curve for axes / ticks when a threshold tab is active —
// we keep showing the frequency Y-axis as a sensible default rather than
// blanking the chart.
const activeCurve = computed<CurveKey>(() =>
  isThresholdTab.value ? 'frequency' : (activeTab.value as CurveKey),
)
const def = computed(() => curveDefs[activeCurve.value])
const curves = computed<iVarioCurves | null>(() => props.curvesOverride ?? null)

const VB_W = 720
const VB_H = 400
const PAD_LEFT = 8
const PAD_RIGHT = 8
const PAD_TOP = 14
const PAD_BOTTOM = 22
const plotW = VB_W - PAD_LEFT - PAD_RIGHT
const plotH = VB_H - PAD_TOP - PAD_BOTTOM

/* ---------------------------------------------------------------- adaptive X */
const DATA_PAD_CMS = 50

const dataMinCmS = computed<number>(() => {
  const xs = curves.value?.buzzer_vario_dots
  if (!xs?.length)
    return -500
  return Math.min(...xs)
})
const dataMaxCmS = computed<number>(() => {
  const xs = curves.value?.buzzer_vario_dots
  if (!xs?.length)
    return 500
  return Math.max(...xs)
})

const baseMinCmS = computed(() => dataMinCmS.value - DATA_PAD_CMS)
const baseMaxCmS = computed(() => dataMaxCmS.value + DATA_PAD_CMS)
const baseRangeCmS = computed(() => Math.max(baseMaxCmS.value - baseMinCmS.value, 100))
const baseCenterCmS = computed(() => (baseMinCmS.value + baseMaxCmS.value) / 2)

// 10× is the high end (fine-tune around zero); 4× was too coarse for the
// dead-band region just past the climb-on / sink-on thresholds.
const ZOOM_PRESETS = [1, 2, 10]
const { zoomLevel, viewWindowCmS } = useCurveZoom()
const zoomCenterCmS = ref(0)

// Zoomed in, the window is the simulator slider's span divided by the zoom,
// so the slider under the chart covers exactly what the chart shows.
const visibleRangeCmS = computed(() => zoomLevel.value === 1
  ? baseRangeCmS.value
  : Math.min(SIM_SPAN_CMS / zoomLevel.value, baseRangeCmS.value))
const visibleHalfCmS = computed(() => visibleRangeCmS.value / 2)

const viewMinCmS = computed(() => {
  if (zoomLevel.value === 1)
    return baseMinCmS.value
  const half = visibleHalfCmS.value
  const lo = baseMinCmS.value + half
  const hi = baseMaxCmS.value - half
  const c0 = zoomCenterCmS.value
  const c = c0 < lo || c0 > hi ? baseCenterCmS.value : c0
  return c - half
})
const viewMaxCmS = computed(() => viewMinCmS.value + visibleRangeCmS.value)
const viewRangeCmS = computed(() => viewMaxCmS.value - viewMinCmS.value || 1)

watchEffect(() => {
  viewWindowCmS.value = zoomLevel.value === 1 ? null : { min: viewMinCmS.value, max: viewMaxCmS.value }
})
onBeforeUnmount(() => {
  viewWindowCmS.value = null
})

function setZoom(level: number) {
  const fromOverview = zoomLevel.value === 1 && level > 1
  zoomLevel.value = level
  if (level === 1) {
    zoomCenterCmS.value = baseCenterCmS.value
    return
  }
  // Zooming in from the overview lands on the simulator position (0 when idle):
  // the thresholds and the live overlay all sit around there.
  if (fromOverview)
    zoomCenterCmS.value = sim.previewCmS.value
  const half = visibleHalfCmS.value
  zoomCenterCmS.value = Math.min(
    Math.max(zoomCenterCmS.value, baseMinCmS.value + half),
    baseMaxCmS.value - half,
  )
}

/* ---------------------------------------------------------------- math */
function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}
function snap(v: number, step: number) {
  return Math.round(v / step) * step
}
function xForCmS(cmS: number): number {
  return PAD_LEFT + ((cmS - viewMinCmS.value) / viewRangeCmS.value) * plotW
}
function cmSForX(x: number): number {
  const t = (x - PAD_LEFT) / plotW
  return viewMinCmS.value + t * viewRangeCmS.value
}
function yForNormalised(t: number): number {
  return PAD_TOP + plotH - t * plotH
}
function normalisedForY(y: number): number {
  return clamp((PAD_TOP + plotH - y) / plotH, 0, 1)
}
function yForCurveValue(curve: CurveDef, value: number): number {
  const t = (value - curve.axisMin) / (curve.axisMax - curve.axisMin || 1)
  return yForNormalised(clamp(t, 0, 1))
}
function curveValueForY(curve: CurveDef, y: number): number {
  return curve.axisMin + normalisedForY(y) * (curve.axisMax - curve.axisMin)
}

/* ---------------------------------------------------------------- render */
function pathForCurve(key: CurveKey): string {
  if (!curves.value)
    return ''
  const xs = curves.value.buzzer_vario_dots
  const ys = curves.value[curveDefs[key].field] as number[]
  if (xs.length === 0)
    return ''
  return xs.map((vx, i) => `${i === 0 ? 'M' : 'L'} ${xForCmS(vx)} ${yForCurveValue(curveDefs[key], ys[i])}`).join(' ')
}

/* ---------------------------------------------------------------- axis labels */
/** Compact label used on grid ticks where precision past 1 m/s is just noise. */
function fmtMs(cmS: number): string {
  const ms = cmS / 100
  const abs = Math.abs(ms)
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : ''
  if (abs < 1)
    return `${sign}${abs.toFixed(1)}`
  return `${sign}${abs.toFixed(0)}`
}

/**
 * Precise label for the watermark / threshold chip / drag readouts — always
 * shows two decimal places so a 0.05 m/s nudge is visible (the device's
 * native resolution is cm/s, i.e. 0.01 m/s).
 */
function fmtMsPrecise(cmS: number): string {
  const ms = cmS / 100
  const abs = Math.abs(ms)
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : ''
  return `${sign}${abs.toFixed(2)}`
}

const xTicks = computed(() => {
  const niceSteps = [25, 50, 100, 200, 500, 1000]
  const targetStep = viewRangeCmS.value / 5
  const stepCmS = niceSteps.find(s => s >= targetStep) ?? niceSteps[niceSteps.length - 1]
  const first = Math.ceil(viewMinCmS.value / stepCmS) * stepCmS
  const out: { x: number, cmS: number, label: string }[] = []
  for (let v = first; v <= viewMaxCmS.value; v += stepCmS)
    out.push({ x: xForCmS(v), cmS: v, label: fmtMs(v) })
  return out
})

const yTicks = computed(() => {
  const d = def.value
  const out: { y: number, label: string }[] = []
  for (let i = 0; i <= d.ticks - 1; i++) {
    const t = i / (d.ticks - 1)
    const value = d.axisMin + t * (d.axisMax - d.axisMin)
    out.push({ y: yForNormalised(t), label: value.toFixed(0) })
  }
  return out
})

/**
 * Vertical "play head" at the simulator's current vario position. Reads
 * the shared `previewCmS` so it tracks the slider whichever audio source
 * is selected (device sim characteristic OR in-browser synth). Drawn under
 * the curves and below the handles so the user can still grab any point
 * while the cursor is live.
 */
const cursorX = computed(() => {
  const cmS = sim.previewCmS.value
  if (cmS === 0)
    return null
  return xForCmS(cmS)
})

/**
 * Both thresholds are always rendered as faint dashed verticals. The one
 * matching the active tab is drawn brighter + has a draggable triangle on
 * the top edge of the plot.
 */
/* ---------------------------------------------------------------- threshold lab */
// Zones and the live sound state come from the threshold lab (emulator only —
// see useThresholdLab). They replace the old flat dead-band rectangle: the
// silent zone is one of the zones.
const lab = useThresholdLab()

const ZONE_FILL: Record<ZoneKind, string> = {
  'sink': 'url(#cz-sink)',
  'sink-memory': 'url(#cz-sink-memory)',
  'quiet': 'url(#cz-quiet)',
  'climb-memory': 'url(#cz-climb-memory)',
  'early-exit': 'url(#cz-early)',
  'climb': 'url(#cz-climb)',
}

function clipX(cmS: number): number {
  return clamp(xForCmS(cmS), PAD_LEFT, PAD_LEFT + plotW)
}

const zoneRects = computed(() => lab.zones.value
  .map(z => ({ kind: z.kind, x: clipX(z.from), w: clipX(z.to) - clipX(z.from) }))
  .filter(r => r.w > 0))

/** The early-exit edge (ClimbOn + trend hysteresis), a thin non-draggable line. */
const labLines = computed(() => {
  const p = lab.params.value
  const out: { key: string, x: number, label: string, color: string }[] = []
  if (p.hyst > 0)
    out.push({ key: 'early', x: xForCmS(p.climbOn + p.hyst), label: `C+H ${fmtMsPrecise(p.climbOn + p.hyst)}`, color: '#c2410c' })
  return out.filter(l => l.x >= PAD_LEFT && l.x <= PAD_LEFT + plotW)
})

/**
 * Live overlay while the emulator runs: the silent window in effect right now
 * (it moves with the trend), the EMA and an arrow from the EMA to the current
 * reading — its length is how fast the vario is moving.
 */
const liveOverlay = computed(() => {
  const l = lab.live
  if (!l.running || !l.engaged)
    return null
  const w = lab.quietWindow.value
  const xLo = clipX(w.from)
  const xHi = clipX(w.to)
  // Edge labels: with the tone on, the window is where it would stop; with
  // the tone off, crossing an edge starts it.
  const edges = [
    { x: xForCmS(w.to), anchor: 'start', label: l.toneOn ? `OFF ≤ ${fmtMsPrecise(w.to)}` : `ON > ${fmtMsPrecise(w.to)}` },
    { x: xForCmS(w.from), anchor: 'end', label: l.toneOn ? `OFF ≥ ${fmtMsPrecise(w.from)}` : `ON < ${fmtMsPrecise(w.from)}` },
  ].filter(e => e.x >= PAD_LEFT && e.x <= PAD_LEFT + plotW)
  return {
    toneOn: l.toneOn,
    win: { x: xLo, w: Math.max(xHi - xLo, 0) },
    edges,
    emaX: xForCmS(lab.emaCm.value),
    curX: xForCmS(l.varioCm),
    weakening: lab.weakening.value,
  }
})

const thresholdLines = computed(() => {
  const out: { x: number, kind: ThresholdKey, color: string, active: boolean, label: string }[] = []
  if (typeof props.climbOn === 'number') {
    out.push({
      x: xForCmS(props.climbOn),
      kind: 'climb-start',
      color: thresholdMeta['climb-start'].color,
      active: activeTab.value === 'climb-start',
      label: fmtMsPrecise(props.climbOn),
    })
  }
  if (typeof props.sinkOn === 'number') {
    out.push({
      x: xForCmS(props.sinkOn),
      kind: 'sink-start',
      color: thresholdMeta['sink-start'].color,
      active: activeTab.value === 'sink-start',
      label: fmtMsPrecise(props.sinkOn),
    })
  }
  // ClimbOff / SinkOff as the sound model reads them. While they coincide with their ON partner they are drawn only when their
  // tab is open, so the default chart stays as uncluttered as before.
  const p = lab.params.value
  const offs: [ThresholdKey, number, number][] = [['climb-off', p.climbOff, p.climbOn], ['sink-off', p.sinkOff, p.sinkOn]]
  for (const [kind, value, partner] of offs) {
    if (value === partner && activeTab.value !== kind)
      continue
    out.push({ x: xForCmS(value), kind, color: thresholdMeta[kind].color, active: activeTab.value === kind, label: fmtMsPrecise(value) })
  }
  return out
})

/* ---------------------------------------------------------------- interaction */
const svgRef = ref<SVGSVGElement | null>(null)

type Mode = 'idle' | 'drag-handle' | 'pan' | 'drag-threshold'
const interaction = ref<{
  mode: Mode
  handleIndex: number
  thresholdKind: ThresholdKey | null
  panStartX: number
  panStartCenter: number
}>({ mode: 'idle', handleIndex: -1, thresholdKind: null, panStartX: 0, panStartCenter: 0 })

function pointerToViewbox(evt: PointerEvent): { x: number, y: number } | null {
  const svg = svgRef.value
  if (!svg)
    return null
  const pt = svg.createSVGPoint()
  pt.x = evt.clientX
  pt.y = evt.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm)
    return null
  const local = pt.matrixTransform(ctm.inverse())
  return { x: local.x, y: local.y }
}

function onHandlePointerDown(evt: PointerEvent, i: number) {
  evt.preventDefault()
  evt.stopPropagation()
  interaction.value = { mode: 'drag-handle', handleIndex: i, thresholdKind: null, panStartX: 0, panStartCenter: 0 }
  ;(evt.target as Element).setPointerCapture(evt.pointerId)
}

function onThresholdPointerDown(evt: PointerEvent, kind: ThresholdKey) {
  evt.preventDefault()
  evt.stopPropagation()
  interaction.value = { mode: 'drag-threshold', handleIndex: -1, thresholdKind: kind, panStartX: 0, panStartCenter: 0 }
  ;(evt.target as Element).setPointerCapture(evt.pointerId)
}

function onSvgPointerDown(evt: PointerEvent) {
  if (interaction.value.mode !== 'idle')
    return
  if (zoomLevel.value === 1)
    return
  const local = pointerToViewbox(evt)
  if (!local)
    return
  interaction.value = {
    mode: 'pan',
    handleIndex: -1,
    thresholdKind: null,
    panStartX: local.x,
    panStartCenter: zoomCenterCmS.value || baseCenterCmS.value,
  }
  ;(evt.currentTarget as Element).setPointerCapture(evt.pointerId)
}

function onPointerMove(evt: PointerEvent) {
  const state = interaction.value
  if (state.mode === 'idle')
    return
  const local = pointerToViewbox(evt)
  if (!local)
    return

  if (state.mode === 'drag-handle' && curves.value) {
    const i = state.handleIndex
    const xs = curves.value.buzzer_vario_dots
    const xLo = i > 0 ? xs[i - 1] : VARIO_RANGE.min
    const xHi = i < xs.length - 1 ? xs[i + 1] : VARIO_RANGE.max
    let nx = cmSForX(local.x)
    nx = snap(nx, VARIO_RANGE.step)
    nx = clamp(nx, xLo, xHi)
    xs[i] = nx

    const d = def.value
    let ny = curveValueForY(d, local.y)
    ny = snap(ny, d.step)
    ny = clamp(ny, d.min, d.max)
    ;(curves.value[d.field] as number[])[i] = ny
    return
  }

  if (state.mode === 'drag-threshold') {
    let next = cmSForX(local.x)
    next = snap(next, VARIO_RANGE.step)
    next = clamp(next, VARIO_RANGE.min, VARIO_RANGE.max)
    // The only hard rule is sink-on ≤ climb-on; either threshold may sit on
    // either side of zero (top pilots routinely set climb-on to -0.2 m/s,
    // and the two can collapse onto a single point to effectively disable
    // the dead-band).
    if (state.thresholdKind === 'climb-start') {
      if (typeof props.sinkOn === 'number')
        next = Math.max(next, props.sinkOn)
      emit('update:climbOn', next)
    }
    else if (state.thresholdKind === 'sink-start') {
      if (typeof props.climbOn === 'number')
        next = Math.min(next, props.climbOn)
      emit('update:sinkOn', next)
    }
    // "Holds to" thresholds stay inside their window: climb-off between
    // sink-off and climb-on, sink-off between sink-on and climb-off.
    else if (state.thresholdKind === 'climb-off') {
      const p = lab.params.value
      emit('update:climbOff', clamp(next, p.sinkOff, p.climbOn))
    }
    else if (state.thresholdKind === 'sink-off') {
      const p = lab.params.value
      emit('update:sinkOff', clamp(next, p.sinkOn, p.climbOff))
    }
    return
  }

  if (state.mode === 'pan') {
    const deltaX = local.x - state.panStartX
    const deltaCmS = -(deltaX / plotW) * viewRangeCmS.value
    zoomCenterCmS.value = state.panStartCenter + deltaCmS
    setZoom(zoomLevel.value)
  }
}

function onPointerUp(evt: PointerEvent) {
  if (interaction.value.mode === 'idle')
    return
  const target = evt.target as Element
  target.releasePointerCapture?.(evt.pointerId)
  interaction.value = { mode: 'idle', handleIndex: -1, thresholdKind: null, panStartX: 0, panStartCenter: 0 }
}

/* Hover / tap tooltip for the zone under the pointer. */
const editorRef = ref<HTMLElement | null>(null)
const tip = ref<{ left: number, top: number, kind: ZoneKind } | null>(null)
let tipTimer: ReturnType<typeof setTimeout> | null = null
let tapStart: { x: number, y: number } | null = null

function zoneAt(evt: PointerEvent): ZoneKind | null {
  const local = pointerToViewbox(evt)
  if (!local || local.x < PAD_LEFT || local.x > PAD_LEFT + plotW)
    return null
  const cmS = cmSForX(local.x)
  return lab.zones.value.find(z => cmS >= z.from && cmS < z.to)?.kind ?? null
}

function showTip(evt: PointerEvent) {
  const host = editorRef.value
  const kind = zoneAt(evt)
  if (!host || !kind) {
    tip.value = null
    return
  }
  const r = host.getBoundingClientRect()
  tip.value = { left: evt.clientX - r.left, top: evt.clientY - r.top, kind }
}

function onSvgHover(evt: PointerEvent) {
  if (evt.pointerType !== 'mouse' || interaction.value.mode !== 'idle')
    return
  showTip(evt)
}

function onSvgTapStart(evt: PointerEvent) {
  tapStart = { x: evt.clientX, y: evt.clientY }
}

function onSvgTapEnd(evt: PointerEvent) {
  if (evt.pointerType === 'mouse' || !tapStart)
    return
  const moved = Math.hypot(evt.clientX - tapStart.x, evt.clientY - tapStart.y)
  tapStart = null
  if (moved > 8)
    return
  showTip(evt)
  if (tipTimer)
    clearTimeout(tipTimer)
  tipTimer = setTimeout(() => (tip.value = null), 5000)
}

onBeforeUnmount(() => {
  if (tipTimer)
    clearTimeout(tipTimer)
})

/* ---------------------------------------------------------------- grid */
const gridXLines = computed(() => xTicks.value.map(t => t.x))
const gridYLines = computed(() => yTicks.value.map(t => t.y))

function tabColor(key: TabKey): string {
  if (key in thresholdMeta)
    return thresholdMeta[key as ThresholdKey].color
  return curveDefs[key as CurveKey].color
}

/**
 * Big watermark numbers shown behind the chart while the user is dragging,
 * so the current value is huge and unmissable even on a phone. Y in the
 * top-left, X in the bottom-right; tinted with the active curve / threshold
 * colour. Hidden when idle.
 */
const watermarkY = computed<{ value: string, color: string } | null>(() => {
  const state = interaction.value
  if (state.mode !== 'drag-handle' || !curves.value)
    return null
  const i = state.handleIndex
  const ys = curves.value[def.value.field] as number[]
  if (i < 0 || i >= ys.length)
    return null
  return { value: `${ys[i]} ${def.value.unit}`, color: def.value.color }
})

const watermarkX = computed<{ value: string, color: string } | null>(() => {
  const state = interaction.value
  if (state.mode === 'drag-handle' && curves.value) {
    const i = state.handleIndex
    const xs = curves.value.buzzer_vario_dots
    if (i >= 0 && i < xs.length)
      return { value: `${fmtMsPrecise(xs[i])} m/s`, color: def.value.color }
  }
  if (state.mode === 'drag-threshold' && state.thresholdKind) {
    const p = lab.params.value
    const cmS = { 'climb-start': props.climbOn, 'sink-start': props.sinkOn, 'climb-off': p.climbOff, 'sink-off': p.sinkOff }[state.thresholdKind]
    if (typeof cmS === 'number')
      return { value: `${fmtMsPrecise(cmS)} m/s`, color: thresholdMeta[state.thresholdKind].color }
  }
  return null
})
</script>

<template>
  <div ref="editorRef" class="editor">
    <div class="editor__bar">
      <div class="editor__tabs" role="tablist">
        <button
          v-for="key in TAB_ORDER"
          :key="key"
          class="editor__tab"
          :class="{ 'editor__tab--active': activeTab === key }"
          :style="{ '--tab-color': tabColor(key) }"
          :aria-selected="activeTab === key"
          role="tab"
          @click="activeTab = key"
        >
          <span class="editor__tab-dot" />
          {{ key }}
        </button>
      </div>

      <div class="editor__ctrl">
        <span v-if="zoomLevel > 1" class="editor__hint">
          {{ t('sett.slide-to-pan') }}
        </span>

        <div class="editor__zoom" role="group" aria-label="Zoom">
          <button
            v-for="level in ZOOM_PRESETS"
            :key="level"
            class="editor__zoom-btn"
            :class="{ 'editor__zoom-btn--active': zoomLevel === level }"
            @click="setZoom(level)"
          >
            {{ level }}×
          </button>
        </div>
      </div>
    </div>

    <svg
      ref="svgRef"
      class="editor__svg"
      :class="{ 'editor__svg--pannable': zoomLevel > 1 }"
      :viewBox="`0 0 ${VB_W} ${VB_H}`"
      preserveAspectRatio="xMidYMid meet"
      @pointerdown="onSvgTapStart($event); onSvgPointerDown($event)"
      @pointermove="onSvgHover($event); onPointerMove($event)"
      @pointerup="onSvgTapEnd($event); onPointerUp($event)"
      @pointercancel="onPointerUp"
      @pointerleave="tip = null"
    >
      <defs>
        <!-- Literal hex, like the threshold colours: SVG paint servers don't
             reliably resolve var(). Solid tints = the tone is decided by the
             vario alone; hatches = memory, the tone depends on where you came
             from; orange hatch = early exit by trend. -->
        <pattern id="cz-sink" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#0aa0e0" opacity="0.13" />
        </pattern>
        <pattern id="cz-climb" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#ff6a00" opacity="0.12" />
        </pattern>
        <pattern id="cz-quiet" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#7a7a7a" opacity="0.08" />
        </pattern>
        <pattern id="cz-sink-memory" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#0aa0e0" opacity="0.05" />
          <rect width="4" height="12" fill="#0aa0e0" opacity="0.28" />
        </pattern>
        <pattern id="cz-climb-memory" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#ff6a00" opacity="0.05" />
          <rect width="4" height="12" fill="#ff6a00" opacity="0.28" />
        </pattern>
        <pattern id="cz-early" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <rect width="12" height="12" fill="#c2410c" opacity="0.06" />
          <rect width="2" height="12" fill="#c2410c" opacity="0.4" />
        </pattern>
        <marker id="cz-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#e30613" />
        </marker>
      </defs>
      <rect
        :x="PAD_LEFT" :y="PAD_TOP" :width="plotW" :height="plotH"
        class="editor__frame"
      />

      <!-- Grid (drawn first so handles + curves layer on top) -->
      <g class="editor__grid">
        <line
          v-for="(x, i) in gridXLines"
          :key="`gx-${i}`"
          :x1="x" :y1="PAD_TOP" :x2="x" :y2="PAD_TOP + plotH"
        />
        <line
          v-for="(y, i) in gridYLines"
          :key="`gy-${i}`"
          :x1="PAD_LEFT" :y1="y" :x2="PAD_LEFT + plotW" :y2="y"
        />
      </g>

      <!-- Big watermark numbers shown during drag — Y in the top-left,
           X in the bottom-right. Drawn before the curves/handles so they
           sit visually behind them. -->
      <text
        v-if="watermarkY"
        :x="PAD_LEFT + 80"
        :y="PAD_TOP + 70"
        text-anchor="start"
        class="editor__watermark editor__watermark--y"
        :fill="watermarkY.color"
      >
        {{ watermarkY.value }}
      </text>
      <text
        v-if="watermarkX"
        :x="PAD_LEFT + plotW - 14"
        :y="PAD_TOP + plotH - 24"
        text-anchor="end"
        class="editor__watermark editor__watermark--x"
        :fill="watermarkX.color"
      >
        {{ watermarkX.value }}
      </text>

      <!-- Threshold-lab zones along the vario axis (beneath the curves). -->
      <g class="editor__zones">
        <rect
          v-for="z in zoneRects"
          :key="`zone-${z.kind}`"
          :x="z.x" :y="PAD_TOP" :width="z.w" :height="plotH"
          :fill="ZONE_FILL[z.kind]"
        />
        <line
          v-for="l in labLines"
          :key="`labl-${l.key}`"
          :x1="l.x" :y1="PAD_TOP" :x2="l.x" :y2="PAD_TOP + plotH"
          :stroke="l.color"
          stroke-dasharray="3 5"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />
        <text
          v-for="(l, i) in labLines"
          :key="`labt-${l.key}`"
          :x="l.x + 3"
          :y="PAD_TOP + plotH - 30 - i * 14"
          class="editor__lab-label"
          :fill="l.color"
        >
          {{ l.label }}
        </text>
      </g>

      <!-- Live emulator overlay: silent window in effect now + EMA → vario
           trend arrow. -->
      <g v-if="liveOverlay" class="editor__live">
        <rect
          :x="liveOverlay.win.x" :y="PAD_TOP + 100" :width="liveOverlay.win.w" :height="plotH - 140"
          class="editor__live-win"
          :class="{ 'editor__live-win--on': liveOverlay.toneOn }"
          vector-effect="non-scaling-stroke"
        />
        <text
          v-for="(e, i) in liveOverlay.edges"
          :key="`edge-${i}`"
          :x="e.anchor === 'start' ? e.x + 4 : e.x - 4"
          :y="PAD_TOP + 116"
          :text-anchor="e.anchor"
          class="editor__live-label"
          :class="{ 'editor__live-label--on': liveOverlay.toneOn }"
        >
          {{ e.label }}
        </text>
        <line
          :x1="liveOverlay.emaX" :y1="PAD_TOP + 130" :x2="liveOverlay.emaX" :y2="PAD_TOP + 158"
          class="editor__live-ema"
          vector-effect="non-scaling-stroke"
        />
        <text :x="liveOverlay.emaX" :y="PAD_TOP + 172" text-anchor="middle" class="editor__live-label">
          {{ t('lab.chart-ema') }}
        </text>
        <line
          v-if="Math.abs(liveOverlay.curX - liveOverlay.emaX) > 3"
          :x1="liveOverlay.emaX" :y1="PAD_TOP + 144" :x2="liveOverlay.curX" :y2="PAD_TOP + 144"
          class="editor__live-trend"
          :class="{ 'editor__live-trend--weak': liveOverlay.weakening }"
          marker-end="url(#cz-arrow)"
          vector-effect="non-scaling-stroke"
        />
      </g>

      <!-- Threshold verticals: climb-on / sink-on (device) and the lab's
           climb-off / sink-off.
           vector-effect pins stroke WIDTH in CSS px so the line stays
           visible on narrow phones; the dasharray is still in SVG units so
           we pick large values (16/10) — on a 360 px screen that lands at
           8/5 CSS px dashes which read clearly. -->
      <g class="editor__thresholds">
        <!-- line.color is a literal hex (#ff6a00 / #e08a00) so SVG
             presentation attributes work directly — no need for :style. -->
        <line
          v-for="line in thresholdLines"
          :key="`thr-${line.kind}`"
          :x1="line.x" :y1="PAD_TOP" :x2="line.x" :y2="PAD_TOP + plotH"
          :stroke="line.color"
          stroke-dasharray="16 10"
          :stroke-width="line.active ? 4 : 2.5"
          opacity="1"
          vector-effect="non-scaling-stroke"
        />
        <!-- Chip sits BELOW the draggable triangle handle (handle occupies
             y = PAD_TOP+2..PAD_TOP+14, so chip starts at PAD_TOP+16). -->
        <g v-for="line in thresholdLines" :key="`thr-chip-${line.kind}`">
          <rect
            :x="line.x - 42"
            :y="PAD_TOP + 16 + thresholdMeta[line.kind].level * 20"
            :width="84"
            :height="16"
            :fill="line.color"
            :opacity="line.active ? 1 : 0.95"
            rx="2"
          />
          <text
            :x="line.x"
            :y="PAD_TOP + 27 + thresholdMeta[line.kind].level * 20"
            text-anchor="middle"
            class="editor__threshold-label"
            :class="{ 'editor__threshold-label--active': line.active }"
          >
            {{ thresholdMeta[line.kind].label }} {{ line.label }}
          </text>
        </g>
      </g>

      <line
        v-if="cursorX !== null"
        class="editor__cursor"
        :x1="cursorX" :y1="PAD_TOP"
        :x2="cursorX" :y2="PAD_TOP + plotH"
      />

      <g class="editor__axis editor__axis--y">
        <text
          v-for="(tick, i) in yTicks"
          :key="`yt-${i}`"
          :x="PAD_LEFT + 3"
          :y="tick.y - 2"
          text-anchor="start"
        >
          {{ tick.label }}
        </text>
      </g>

      <g class="editor__overlays">
        <path
          v-for="key in CURVE_ORDER.filter(k => k !== activeCurve)"
          :key="key"
          :d="pathForCurve(key)"
          fill="none"
          :stroke="curveDefs[key].color"
          stroke-width="2.5"
          stroke-linejoin="round"
          opacity="0.4"
          vector-effect="non-scaling-stroke"
        />
      </g>

      <path
        :d="pathForCurve(activeCurve)"
        fill="none"
        :stroke="def.color"
        stroke-width="4"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />

      <g class="editor__axis editor__axis--x">
        <text
          v-for="(tick, i) in xTicks"
          :key="`xt-${i}`"
          :x="tick.x"
          :y="PAD_TOP + plotH - 4"
          text-anchor="middle"
        >
          {{ tick.label }}
        </text>
      </g>

      <!-- Curve-point handles (only when a curve tab is active). -->
      <template v-if="curves && !isThresholdTab">
        <g>
          <circle
            v-for="(_, i) in curves.buzzer_vario_dots"
            :key="i"
            :cx="xForCmS(curves.buzzer_vario_dots[i])"
            :cy="yForCurveValue(def, (curves[def.field] as number[])[i])"
            r="7"
            class="editor__handle"
            :class="{ 'editor__handle--dragging': interaction.mode === 'drag-handle' && interaction.handleIndex === i }"
            :fill="def.color"
            @pointerdown="onHandlePointerDown($event, i)"
          />
        </g>
      </template>

      <!-- Threshold drag handle for the active threshold tab — a small
           triangle on the top edge of the plot, easy to grab on touch. -->
      <template v-if="isThresholdTab">
        <g v-for="line in thresholdLines.filter(l => l.active)" :key="`th-${line.kind}`">
          <rect
            :x="line.x - 14"
            :y="PAD_TOP - 2"
            :width="28"
            :height="plotH + 4"
            fill="transparent"
            class="editor__threshold-hit"
            @pointerdown="onThresholdPointerDown($event, line.kind)"
          />
          <polygon
            :points="`${line.x - 8},${PAD_TOP + 2} ${line.x + 8},${PAD_TOP + 2} ${line.x},${PAD_TOP + 14}`"
            :fill="line.color"
            class="editor__threshold-knob"
            @pointerdown="onThresholdPointerDown($event, line.kind)"
          />
        </g>
      </template>
    </svg>

    <div
      v-if="tip"
      class="editor__tip"
      :style="{ left: `${tip.left}px`, top: `${tip.top}px` }"
      role="tooltip"
    >
      <LabZoneText :kind="tip.kind" />
    </div>

    <!-- Footer: legend (left) + x-axis label (right) in a single row. -->
    <div class="editor__footer">
      <div class="editor__legend">
        <span
          v-for="key in CURVE_ORDER"
          :key="key"
          class="editor__legend-item"
          :class="{ 'editor__legend-item--active': key === activeCurve }"
        >
          <span class="editor__legend-swatch" :style="{ background: curveDefs[key].color }" />
          {{ key }}, {{ curveDefs[key].unit }}
        </span>
      </div>
      <span class="editor__x-label">VARIO, M/S</span>
    </div>
  </div>
</template>

<style scoped>
.editor {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-sm);
  width: 100%;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Two-row bar by default: tabs on row 1 (they fit on a single line on
   mobile if we keep them compact), controls on row 2 (readout/hint on the
   left, zoom on the right). At ≥720 px they fall back to one inline row. */
.editor__bar {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
}

.editor__ctrl {
  display: flex;
  align-items: center;
  gap: var(--ck-s-sm);
  min-width: 0;
}

.editor__tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.editor__zoom {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

@media (min-width: 720px) {
  .editor__bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--ck-s-md);
    flex-wrap: wrap;
  }
  .editor__tabs {
    flex: 1 1 auto;
  }
  .editor__ctrl {
    flex: 0 0 auto;
  }
}

.editor__tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ck-font-mono);
  /* clamp so 5 tabs (3 curves + 2 thresholds) fit on a narrow phone */
  font-size: clamp(9px, 2.4vw, 11px);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding: 4px 7px;
  background: var(--ck-paper);
  color: var(--ck-ink-dim);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-pill);
  cursor: pointer;
  min-width: 0;
  white-space: nowrap;
}

.editor__tab--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
  border-color: var(--ck-ink);
}

.editor__tab-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tab-color, currentColor);
}

.editor__zoom-btn {
  font-family: var(--ck-font-mono);
  font-size: clamp(9px, 2.4vw, 11px);
  padding: 4px 8px;
  background: var(--ck-paper);
  color: var(--ck-ink-dim);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
}

.editor__zoom-btn--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
  border-color: var(--ck-ink);
}

.editor__svg {
  width: 100%;
  height: auto;
  max-height: 70vh;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  touch-action: none;
  /* No grab cursor at 1× — at that zoom there is nothing to pan, the only
     interactive bits are the handles / threshold knobs, which set their own
     cursor on :hover. At >1× the SVG becomes pannable and the grab cursor
     applies via the .editor__svg--pannable modifier. */
  display: block;
}

.editor__hint {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ck-signal);
  align-self: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.editor__watermark {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 56px;
  letter-spacing: -2px;
  opacity: 0.18;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.editor__svg--pannable {
  cursor: grab;
}

.editor__svg--pannable:active {
  cursor: grabbing;
}

.editor__frame {
  fill: transparent;
  stroke: var(--ck-grid);
  stroke-width: 1;
}

.editor__grid line {
  stroke: var(--ck-grid);
  /* non-scaling-stroke keeps the line at exactly 1 CSS pixel regardless of
     how small the SVG renders, so on a 360 px mobile screen the grid is
     still visible (otherwise stroke-width=0.5 in SVG units becomes 0.25 CSS
     px and disappears). */
  stroke-width: 1;
  opacity: 0.8;
  vector-effect: non-scaling-stroke;
}

.editor__thresholds line {
  pointer-events: none;
}

.editor__zones,
.editor__live {
  pointer-events: none;
}

.editor__lab-label,
.editor__live-label {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.editor__live-label {
  fill: var(--ck-dim);
}

.editor__live-label--on {
  fill: #e30613;
}

.editor__live-win {
  fill: none;
  stroke: var(--ck-dim);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.editor__live-win--on {
  stroke: #e30613;
}

.editor__live-ema {
  stroke: var(--ck-ink);
  stroke-width: 2;
}

.editor__live-trend {
  stroke: #e30613;
  stroke-width: 3;
}

.editor__live-trend--weak {
  stroke-dasharray: 5 3;
}

.editor__tip {
  position: absolute;
  z-index: 5;
  transform: translate(-50%, 14px);
  width: min(300px, 86vw);
  padding: 10px 12px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  box-shadow: 0 4px 14px rgb(0 0 0 / 18%);
  pointer-events: none;
}

.editor__cursor {
  /* Solid red so the live position cursor reads instantly against curves,
     thresholds and the dead-band band. */
  stroke: #e30613;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
  opacity: 0.9;
}

.editor__handle {
  cursor: grab;
  transition: filter 90ms ease-out;
}

.editor__handle:hover {
  /* Subtle ink-coloured halo on hover so the user can see which point is
     about to grab BEFORE they press. */
  filter: drop-shadow(0 0 2.5px var(--ck-ink));
}

.editor__handle:active {
  cursor: grabbing;
}

.editor__handle--dragging,
.editor__handle--dragging:hover {
  /* Drag state overrides the hover halo with a stronger signal-coloured
     glow — listed after :hover so it wins on the dragged handle. */
  filter: drop-shadow(0 0 4px var(--ck-signal));
  cursor: grabbing;
}

.editor__threshold-knob {
  cursor: ew-resize;
}

.editor__threshold-hit {
  cursor: ew-resize;
}

.editor__axis text {
  font-family: var(--ck-font-mono);
  /* Mobile: 22 SVG units ≈ 11 CSS px when the SVG (720-wide viewBox)
     renders at ~360 px. Desktop drops to 13 so the labels stay compact
     when the chart has plenty of room. */
  font-size: 22px;
  font-weight: 600;
  fill: var(--ck-ink);
  opacity: 0.85;
  pointer-events: none;
}

@media (min-width: 720px) {
  .editor__axis text {
    font-size: 13px;
    font-weight: 500;
  }
}

.editor__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ck-s-sm);
  padding: 0 4px;
  /* No-wrap so the VARIO label stays pinned to the right even on narrow
     screens. Legend items individually shrink and (last resort) ellipsise
     instead of pushing the label onto a new line. */
  flex-wrap: nowrap;
  min-width: 0;
}

.editor__legend {
  display: flex;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.editor__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ck-font-mono);
  font-size: 9px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--ck-dim);
  opacity: 0.6;
  white-space: nowrap;
}

.editor__legend-item--active {
  color: var(--ck-ink);
  opacity: 1;
}

.editor__legend-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.editor__x-label {
  font-family: var(--ck-font-mono);
  font-size: 9px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--ck-dim);
  opacity: 0.85;
  flex-shrink: 0;
  white-space: nowrap;
}

.editor__threshold-label {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  /* var(--ck-ink) flips with theme: near-black in light mode, near-white
     in dark mode. That keeps the digits readable whether they sit on the
     orange chip OR on the page background behind it. */
  fill: var(--ck-ink);
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.editor__threshold-label--active {
  font-size: 12px;
}
</style>
