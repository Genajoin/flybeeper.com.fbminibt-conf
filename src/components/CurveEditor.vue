<script setup lang="ts">
import type { iVarioCurves } from '~/stores/bluetooth'

const props = defineProps<{
  /**
   * Optional explicit curves source. When supplied (and non-null) the editor
   * mutates this object directly — used by the CPF firmware path where we
   * adapt four 12-element BleCharacteristic arrays into one iVarioCurves shape.
   * When omitted, the editor falls back to settingsStore.local.curves.
   *
   * vario values are still expected in cm/s here (we display m/s but keep the
   * device's native unit internally to avoid roundtrip drift).
   */
  curvesOverride?: iVarioCurves | null
  /** Thresholds in cm/s for the magenta/orange verticals. */
  climbOn?: number
  climbOff?: number
  sinkOn?: number
  sinkOff?: number
}>()

const settings = useSettingsStore()

type CurveKey = 'vario' | 'frequency' | 'cycle' | 'duty'

interface CurveDef {
  key: CurveKey
  field: keyof iVarioCurves | null
  unit: string
  min: number
  max: number
  step: number
  color: string
  /** Tick count for the Y axis when this curve is active. */
  ticks: number
}

// Fixed Y-ranges per curve so the visual scale stays stable as the user drags
// one point to an extreme. The device's value clamps still come from min/max
// of the active curve. Vario also lives here as the X axis range.
const curveDefs: Record<CurveKey, CurveDef> = {
  vario: { key: 'vario', field: 'buzzer_vario_dots', unit: 'm/s', min: -2000, max: 2000, step: 5, color: 'var(--ck-signal)', ticks: 9 },
  frequency: { key: 'frequency', field: 'buzzer_frequency_dots', unit: 'Hz', min: 0, max: 6000, step: 5, color: '#0aa0e0', ticks: 7 },
  cycle: { key: 'cycle', field: 'buzzer_cycle_dots', unit: 'ms', min: 0, max: 1000, step: 5, color: '#9b5cff', ticks: 6 },
  duty: { key: 'duty', field: 'buzzer_duty_dots', unit: '%', min: 0, max: 100, step: 1, color: '#22c577', ticks: 6 },
}

const activeCurve = ref<CurveKey>('frequency')
const def = computed(() => curveDefs[activeCurve.value])

const curves = computed<iVarioCurves | null>(() =>
  props.curvesOverride ?? settings.local?.curves ?? null,
)

const VB_W = 720
const VB_H = 400
const PAD_LEFT = 60
const PAD_RIGHT = 60
const PAD_TOP = 24
const PAD_BOTTOM = 44
const plotW = VB_W - PAD_LEFT - PAD_RIGHT
const plotH = VB_H - PAD_TOP - PAD_BOTTOM

/* ---------------------------------------------------------------- zoom + pan
 * zoomLevel = 1   → full vario range visible (-20…+20 m/s)
 * zoomLevel = 2   → half (e.g. -10…+10 m/s)
 * zoomCenterCmS   → midpoint of the visible window in cm/s
 *
 * Pan via drag-on-empty-space; handle drags edit the curve instead.
 */
const ZOOM_PRESETS = [1, 2, 4]
const zoomLevel = ref(1)
const zoomCenterCmS = ref(0)

const visibleHalfCmS = computed(() => {
  const fullHalf = (curveDefs.vario.max - curveDefs.vario.min) / 2
  return fullHalf / zoomLevel.value
})

const viewMinCmS = computed(() => {
  // Clamp pan so the window stays inside the global vario range.
  const halfWindow = visibleHalfCmS.value
  const clampedCenter = Math.min(
    Math.max(zoomCenterCmS.value, curveDefs.vario.min + halfWindow),
    curveDefs.vario.max - halfWindow,
  )
  return clampedCenter - halfWindow
})
const viewMaxCmS = computed(() => viewMinCmS.value + visibleHalfCmS.value * 2)
const viewRangeCmS = computed(() => viewMaxCmS.value - viewMinCmS.value || 1)

function setZoom(level: number) {
  zoomLevel.value = level
  // Re-clamp the center to the new bounds.
  const halfWindow = (curveDefs.vario.max - curveDefs.vario.min) / 2 / level
  zoomCenterCmS.value = Math.min(
    Math.max(zoomCenterCmS.value, curveDefs.vario.min + halfWindow),
    curveDefs.vario.max - halfWindow,
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

/* ---------------------------------------------------------------- curves render */
const CURVE_ORDER: CurveKey[] = ['frequency', 'cycle', 'duty']

function pathForCurve(key: CurveKey): string {
  if (!curves.value)
    return ''
  const xs = curves.value.buzzer_vario_dots
  const ys = curves.value[curveDefs[key].field!] as number[]
  if (xs.length === 0)
    return ''
  return xs.map((vx, i) => `${i === 0 ? 'M' : 'L'} ${xForCmS(vx)} ${yForCurveValue(curveDefs[key], ys[i])}`).join(' ')
}

/* ---------------------------------------------------------------- axis labels */
function fmtMs(cmS: number): string {
  const ms = cmS / 100
  const abs = Math.abs(ms)
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : ''
  return `${sign}${abs.toFixed(abs < 1 ? 1 : 0)}`
}

const xTicks = computed(() => {
  // Choose roughly 9 ticks across the visible range, snapped to nice m/s.
  const niceSteps = [50, 100, 200, 500, 1000]
  const targetStep = viewRangeCmS.value / 8
  const stepCmS = niceSteps.find(s => s >= targetStep) ?? niceSteps[niceSteps.length - 1]
  const first = Math.ceil(viewMinCmS.value / stepCmS) * stepCmS
  const out: { x: number, label: string }[] = []
  for (let v = first; v <= viewMaxCmS.value; v += stepCmS)
    out.push({ x: xForCmS(v), label: fmtMs(v) })
  return out
})

const yTicks = computed(() => {
  // No Y axis on the vario tab — its handles sit on the horizontal midline
  // so a Y scale would be misleading (a -2000…2000 cm/s scale dressed as
  // a Y-axis was what testers correctly flagged as confusing).
  if (activeCurve.value === 'vario')
    return []
  const d = def.value
  const out: { y: number, label: string }[] = []
  for (let i = 0; i <= d.ticks - 1; i++) {
    const t = i / (d.ticks - 1)
    const value = d.min + t * (d.max - d.min)
    out.push({ y: yForNormalised(t), label: value.toFixed(0) })
  }
  return out
})

const thresholdLines = computed(() => {
  const climbOn = props.climbOn ?? settings.local?.climb_tone_on_threshold_cm
  const climbOff = props.climbOff ?? settings.local?.climb_tone_off_threshold_cm
  const sinkOn = props.sinkOn ?? settings.local?.sink_tone_on_threshold_cm
  const sinkOff = props.sinkOff ?? settings.local?.sink_tone_off_threshold_cm
  const t = [
    { v: climbOn, label: 'climb-on', color: 'var(--ck-signal)' },
    { v: climbOff, label: 'climb-off', color: 'var(--ck-dim)' },
    { v: sinkOn, label: 'sink-on', color: 'var(--ck-signal)' },
    { v: sinkOff, label: 'sink-off', color: 'var(--ck-dim)' },
  ]
  return t.filter(item => typeof item.v === 'number').map(item => ({
    x: xForCmS(item.v as number),
    label: item.label,
    color: item.color,
  }))
})

/* ---------------------------------------------------------------- interaction */
const svgRef = ref<SVGSVGElement | null>(null)

type Mode = 'idle' | 'drag-handle' | 'pan'
const interaction = ref<{
  mode: Mode
  handleIndex: number
  panStartX: number
  panStartCenter: number
}>({ mode: 'idle', handleIndex: -1, panStartX: 0, panStartCenter: 0 })

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
  interaction.value = { mode: 'drag-handle', handleIndex: i, panStartX: 0, panStartCenter: 0 }
  ;(evt.target as Element).setPointerCapture(evt.pointerId)
}

function onSvgPointerDown(evt: PointerEvent) {
  // Empty-space press → pan.
  if (interaction.value.mode !== 'idle')
    return
  if (zoomLevel.value === 1)
    return // nothing to pan at 1x
  const local = pointerToViewbox(evt)
  if (!local)
    return
  interaction.value = {
    mode: 'pan',
    handleIndex: -1,
    panStartX: local.x,
    panStartCenter: zoomCenterCmS.value,
  }
  ;(evt.currentTarget as Element).setPointerCapture(evt.pointerId)
}

function onPointerMove(evt: PointerEvent) {
  const state = interaction.value
  if (state.mode === 'idle' || !curves.value)
    return
  const local = pointerToViewbox(evt)
  if (!local)
    return

  if (state.mode === 'drag-handle') {
    const i = state.handleIndex
    if (activeCurve.value === 'vario') {
      let next = cmSForX(local.x)
      next = snap(next, curveDefs.vario.step)
      next = clamp(next, curveDefs.vario.min, curveDefs.vario.max)
      curves.value.buzzer_vario_dots[i] = next
    }
    else {
      const d = def.value
      let next = curveValueForY(d, local.y)
      next = snap(next, d.step)
      next = clamp(next, d.min, d.max)
      const field = d.field!
      ;(curves.value[field] as number[])[i] = next
    }
    return
  }

  if (state.mode === 'pan') {
    const deltaX = local.x - state.panStartX
    const deltaCmS = -(deltaX / plotW) * viewRangeCmS.value
    zoomCenterCmS.value = state.panStartCenter + deltaCmS
    // Re-clamp via setter.
    setZoom(zoomLevel.value)
  }
}

function onPointerUp(evt: PointerEvent) {
  if (interaction.value.mode === 'idle')
    return
  const target = evt.target as Element
  target.releasePointerCapture?.(evt.pointerId)
  interaction.value = { mode: 'idle', handleIndex: -1, panStartX: 0, panStartCenter: 0 }
}

/* ---------------------------------------------------------------- grid */
const gridXLines = computed(() => xTicks.value.map(t => t.x))
const gridYLines = computed(() => yTicks.value.map(t => t.y))
</script>

<template>
  <div class="editor">
    <div class="editor__bar">
      <div class="editor__tabs" role="tablist">
        <button
          v-for="key in (['frequency', 'cycle', 'duty', 'vario'] as CurveKey[])"
          :key="key"
          class="editor__tab"
          :class="{ 'editor__tab--active': activeCurve === key }"
          :style="{ '--tab-color': curveDefs[key].color }"
          :aria-selected="activeCurve === key"
          role="tab"
          @click="activeCurve = key"
        >
          <span class="editor__tab-dot" />
          {{ key }}
        </button>
      </div>

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
      <!-- Plot frame -->
      <rect
        :x="PAD_LEFT" :y="PAD_TOP" :width="plotW" :height="plotH"
        class="editor__frame"
      />

      <!-- Grid -->
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

      <!-- Threshold verticals -->
      <g class="editor__thresholds">
        <line
          v-for="(line, i) in thresholdLines"
          :key="`thr-${i}`"
          :x1="line.x" :y1="PAD_TOP" :x2="line.x" :y2="PAD_TOP + plotH"
          :stroke="line.color"
          stroke-dasharray="4 4"
        />
      </g>

      <!-- Non-active curves: drawn faded behind the active one -->
      <g class="editor__overlays">
        <path
          v-for="key in CURVE_ORDER.filter(k => k !== activeCurve)"
          :key="key"
          :d="pathForCurve(key)"
          fill="none"
          :stroke="curveDefs[key].color"
          stroke-width="1.5"
          stroke-linejoin="round"
          opacity="0.35"
        />
      </g>

      <!-- Active curve (full opacity) -->
      <path
        v-if="activeCurve !== 'vario'"
        :d="pathForCurve(activeCurve)"
        fill="none"
        :stroke="def.color"
        stroke-width="2.5"
        stroke-linejoin="round"
      />

      <!-- X-axis labels (m/s) -->
      <g class="editor__axis editor__axis--x">
        <text
          v-for="(tick, i) in xTicks"
          :key="`xt-${i}`"
          :x="tick.x"
          :y="PAD_TOP + plotH + 18"
          text-anchor="middle"
        >
          {{ tick.label }}
        </text>
        <text
          :x="VB_W - PAD_RIGHT"
          :y="PAD_TOP + plotH + 34"
          text-anchor="end"
          class="editor__axis-unit"
        >
          vario, m/s
        </text>
      </g>

      <!-- Y-axis labels (units of the active curve) -->
      <g v-if="activeCurve !== 'vario'" class="editor__axis editor__axis--y">
        <text
          v-for="(tick, i) in yTicks"
          :key="`yt-${i}`"
          :x="PAD_LEFT - 6"
          :y="tick.y + 3"
          text-anchor="end"
        >
          {{ tick.label }}
        </text>
        <text
          :x="PAD_LEFT"
          :y="PAD_TOP - 8"
          text-anchor="start"
          class="editor__axis-unit"
        >
          {{ activeCurve }}, {{ def.unit }}
        </text>
      </g>

      <!-- Draggable handles -->
      <template v-if="curves">
        <g v-if="activeCurve === 'vario'">
          <circle
            v-for="(_, i) in curves.buzzer_vario_dots"
            :key="i"
            :cx="xForCmS(curves.buzzer_vario_dots[i])"
            :cy="PAD_TOP + plotH / 2"
            r="7"
            class="editor__handle"
            :class="{ 'editor__handle--dragging': interaction.mode === 'drag-handle' && interaction.handleIndex === i }"
            :fill="curveDefs.vario.color"
            @pointerdown="onHandlePointerDown($event, i)"
          />
        </g>
        <g v-else>
          <circle
            v-for="(_, i) in curves.buzzer_vario_dots"
            :key="i"
            :cx="xForCmS(curves.buzzer_vario_dots[i])"
            :cy="yForCurveValue(def, (curves[def.field!] as number[])[i])"
            r="7"
            class="editor__handle"
            :class="{ 'editor__handle--dragging': interaction.mode === 'drag-handle' && interaction.handleIndex === i }"
            :fill="def.color"
            @pointerdown="onHandlePointerDown($event, i)"
          />
        </g>
      </template>
    </svg>

    <div class="editor__legend">
      <span
        v-for="key in (['frequency', 'cycle', 'duty', 'vario'] as CurveKey[])"
        :key="key"
        class="editor__legend-item"
        :class="{ 'editor__legend-item--active': key === activeCurve }"
      >
        <span class="editor__legend-swatch" :style="{ background: curveDefs[key].color }" />
        {{ key }}, {{ curveDefs[key].unit }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-sm);
  width: 100%;
}

.editor__bar {
  display: flex;
  justify-content: space-between;
  gap: var(--ck-s-md);
  flex-wrap: wrap;
}

.editor__tabs,
.editor__zoom {
  display: flex;
  gap: var(--ck-s-xs);
  flex-wrap: wrap;
}

.editor__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-xs);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  padding: var(--ck-s-xs) var(--ck-s-sm);
  background: var(--ck-paper);
  color: var(--ck-ink-dim);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-pill);
  cursor: pointer;
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
  font-size: var(--ck-fs-eyebrow);
  padding: var(--ck-s-xs) var(--ck-s-sm);
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
  stroke-width: 0.5;
  opacity: 0.6;
}

.editor__thresholds line {
  stroke-width: 1.2;
  opacity: 0.6;
}

.editor__handle {
  cursor: grab;
}

.editor__handle--dragging {
  filter: drop-shadow(0 0 4px var(--ck-signal));
}

.editor__axis text {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  fill: var(--ck-ink-dim);
}

.editor__axis-unit {
  font-size: 10px !important;
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  fill: var(--ck-dim) !important;
}

.editor__legend {
  display: flex;
  gap: var(--ck-s-md);
  flex-wrap: wrap;
  justify-content: center;
}

.editor__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-xs);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-micro);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
  opacity: 0.6;
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
</style>
