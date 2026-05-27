<script setup lang="ts">
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
}>()

const sim = useSimulation()
const { t } = useI18n()

type CurveKey = 'frequency' | 'cycle' | 'duty'
type ThresholdKey = 'climb-start' | 'sink-start'
type TabKey = CurveKey | ThresholdKey

interface CurveDef {
  key: CurveKey
  field: keyof iVarioCurves
  unit: string
  min: number
  max: number
  step: number
  color: string
  ticks: number
}

const VARIO_RANGE = { min: -2000, max: 2000, step: 5 }

const curveDefs: Record<CurveKey, CurveDef> = {
  frequency: { key: 'frequency', field: 'buzzer_frequency_dots', unit: 'Hz', min: 0, max: 6000, step: 5, color: '#0aa0e0', ticks: 6 },
  cycle: { key: 'cycle', field: 'buzzer_cycle_dots', unit: 'ms', min: 0, max: 1000, step: 5, color: '#9b5cff', ticks: 5 },
  duty: { key: 'duty', field: 'buzzer_duty_dots', unit: '%', min: 0, max: 100, step: 1, color: '#22c577', ticks: 5 },
}

const CURVE_ORDER: CurveKey[] = ['frequency', 'cycle', 'duty']
const THRESHOLD_ORDER: ThresholdKey[] = ['climb-start', 'sink-start']
const TAB_ORDER: TabKey[] = [...CURVE_ORDER, ...THRESHOLD_ORDER]

// Literal hex (not CSS vars): SVG presentation attributes don't reliably
// resolve var() across engines. With hex we can just pass line.color to
// :fill / :stroke on the SVG element and trust it. Matches --ck-signal at
// the time of writing.
const thresholdMeta: Record<ThresholdKey, { color: string, label: string }> = {
  'climb-start': { color: '#ff6a00', label: 'CLIMB-ON' },
  'sink-start': { color: '#e08a00', label: 'SINK-ON' },
}

const activeTab = ref<TabKey>('frequency')

const isThresholdTab = computed<boolean>(() =>
  activeTab.value === 'climb-start' || activeTab.value === 'sink-start',
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
const zoomLevel = ref(1)
const zoomCenterCmS = ref(0)

const visibleRangeCmS = computed(() => baseRangeCmS.value / zoomLevel.value)
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

function setZoom(level: number) {
  zoomLevel.value = level
  if (level === 1) {
    zoomCenterCmS.value = baseCenterCmS.value
    return
  }
  const half = baseRangeCmS.value / level / 2
  zoomCenterCmS.value = Math.min(
    Math.max(zoomCenterCmS.value || baseCenterCmS.value, baseMinCmS.value + half),
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
  const t = (value - curve.min) / (curve.max - curve.min || 1)
  return yForNormalised(clamp(t, 0, 1))
}
function curveValueForY(curve: CurveDef, y: number): number {
  return curve.min + normalisedForY(y) * (curve.max - curve.min)
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
    const value = d.min + t * (d.max - d.min)
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
/**
 * Filled rectangle showing the silent zone (climb-on / sink-on dead-band)
 * — visible only when both thresholds are loaded and they don't collapse
 * onto a single point. Drawn beneath the curves so it doesn't muddy them.
 */
const deadBandRect = computed<{ x: number, width: number } | null>(() => {
  if (typeof props.climbOn !== 'number' || typeof props.sinkOn !== 'number')
    return null
  if (props.climbOn <= props.sinkOn)
    return null
  const xLo = xForCmS(props.sinkOn)
  const xHi = xForCmS(props.climbOn)
  return { x: xLo, width: xHi - xLo }
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

/* ---------------------------------------------------------------- grid */
const gridXLines = computed(() => xTicks.value.map(t => t.x))
const gridYLines = computed(() => yTicks.value.map(t => t.y))

function tabColor(key: TabKey): string {
  if (key === 'climb-start' || key === 'sink-start')
    return thresholdMeta[key].color
  return curveDefs[key].color
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
    const cmS = state.thresholdKind === 'climb-start' ? props.climbOn : props.sinkOn
    if (typeof cmS === 'number')
      return { value: `${fmtMsPrecise(cmS)} m/s`, color: thresholdMeta[state.thresholdKind].color }
  }
  return null
})
</script>

<template>
  <div class="editor">
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
      :viewBox="`0 0 ${VB_W} ${VB_H}`"
      preserveAspectRatio="xMidYMid meet"
      @pointerdown="onSvgPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
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

      <!-- Dead-band rectangle: the silent zone between sink-on and climb-on.
           Renders only when both thresholds are known and sink-on < climb-on
           (collapsed thresholds → no dead band). Makes the silent region
           visually obvious before the user even reads the threshold values. -->
      <rect
        v-if="deadBandRect"
        :x="deadBandRect.x"
        :y="PAD_TOP"
        :width="deadBandRect.width"
        :height="plotH"
        class="editor__deadband"
      />

      <!-- Threshold verticals: only climb-on / sink-on. Climb-off and
           sink-off are legacy fields exposed in the settings list only.
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
            :x="line.x - 22"
            :y="PAD_TOP + 16"
            :width="44"
            :height="16"
            :fill="line.color"
            :opacity="line.active ? 1 : 0.95"
            rx="2"
          />
          <text
            :x="line.x"
            :y="PAD_TOP + 27"
            text-anchor="middle"
            class="editor__threshold-label"
            :class="{ 'editor__threshold-label--active': line.active }"
          >
            {{ line.label }}
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
  cursor: grab;
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

.editor__svg:active {
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

.editor__deadband {
  fill: var(--ck-ink);
  opacity: 0.06;
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
}

.editor__handle--dragging {
  filter: drop-shadow(0 0 4px var(--ck-signal));
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
