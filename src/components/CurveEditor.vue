<script setup lang="ts">
import type { iVarioCurves } from '~/stores/bluetooth'

const props = defineProps<{
  /**
   * Optional explicit curves source. When supplied (and non-null) the editor
   * mutates this object directly — used by the CPF firmware path where we
   * adapt four 12-element BleCharacteristic arrays into one iVarioCurves shape.
   * When omitted, the editor falls back to settingsStore.local.curves.
   */
  curvesOverride?: iVarioCurves | null
  /** Thresholds for the magenta/orange verticals. */
  climbOn?: number
  climbOff?: number
  sinkOn?: number
  sinkOff?: number
}>()

/**
 * Editing happens against either settingsStore.local.curves (legacy ≤0.15) or
 * an adapter object backed by CPF BleCharacteristics (fw ≥0.15). Threshold
 * lines come from the store on legacy and from props on CPF.
 */
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
}

// vario is the X-axis breakpoint set — its drag moves a point horizontally;
// for the other curves the X stays put and the point moves vertically.
const curveDefs: Record<CurveKey, CurveDef> = {
  vario: { key: 'vario', field: 'buzzer_vario_dots', unit: 'cm/s', min: -2000, max: 2000, step: 5, color: 'var(--ck-signal)' },
  frequency: { key: 'frequency', field: 'buzzer_frequency_dots', unit: 'Hz', min: 100, max: 6000, step: 5, color: 'var(--ck-ink)' },
  cycle: { key: 'cycle', field: 'buzzer_cycle_dots', unit: 'ms', min: 100, max: 1000, step: 5, color: 'var(--ck-ink-dim)' },
  duty: { key: 'duty', field: 'buzzer_duty_dots', unit: '%', min: 2, max: 100, step: 1, color: 'var(--ck-dim)' },
}

const activeCurve = ref<CurveKey>('frequency')
const def = computed(() => curveDefs[activeCurve.value])

const curves = computed<iVarioCurves | null>(() =>
  props.curvesOverride ?? settings.local?.curves ?? null,
)

// Viewport — SVG userspace coordinates, separate from the actual rendered size.
// We size the SVG to its container with `width: 100%` and let viewBox handle
// scaling so drags translate the same on any zoom level.
const VB_W = 600
const VB_H = 340
const PAD_LEFT = 48
const PAD_RIGHT = 16
const PAD_TOP = 16
const PAD_BOTTOM = 36
const plotW = VB_W - PAD_LEFT - PAD_RIGHT
const plotH = VB_H - PAD_TOP - PAD_BOTTOM

const varioMin = computed(() => (curves.value ? Math.min(...curves.value.buzzer_vario_dots) : 0))
const varioMax = computed(() => (curves.value ? Math.max(...curves.value.buzzer_vario_dots) : 0))
const varioRange = computed(() => varioMax.value - varioMin.value || 1)

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function snap(v: number, step: number) {
  return Math.round(v / step) * step
}

function xForVario(vario: number): number {
  return PAD_LEFT + ((vario - varioMin.value) / varioRange.value) * plotW
}

function yForValue(value: number): number {
  const range = def.value.max - def.value.min || 1
  return PAD_TOP + plotH - ((value - def.value.min) / range) * plotH
}

function varioForX(x: number): number {
  const t = clamp((x - PAD_LEFT) / plotW, 0, 1)
  return varioMin.value + t * varioRange.value
}

function valueForY(y: number): number {
  const range = def.value.max - def.value.min
  const t = clamp((PAD_TOP + plotH - y) / plotH, 0, 1)
  return def.value.min + t * range
}

const yValues = computed<number[]>(() => {
  if (!curves.value)
    return []
  if (activeCurve.value === 'vario')
    return curves.value.buzzer_vario_dots
  const field = def.value.field!
  return curves.value[field]
})

const pathD = computed(() => {
  if (!curves.value)
    return ''
  const xs = curves.value.buzzer_vario_dots
  const ys = yValues.value
  if (xs.length === 0 || ys.length === 0)
    return ''
  // For the vario view we plot points along a horizontal line at mid-Y so the
  // user can see breakpoint distribution without the line wobbling.
  if (activeCurve.value === 'vario') {
    const midY = PAD_TOP + plotH / 2
    return xs.map((vx, i) => `${i === 0 ? 'M' : 'L'} ${xForVario(vx)} ${midY}`).join(' ')
  }
  return xs.map((vx, i) => `${i === 0 ? 'M' : 'L'} ${xForVario(vx)} ${yForValue(ys[i])}`).join(' ')
})

const svgRef = ref<SVGSVGElement | null>(null)
const dragIndex = ref<number | null>(null)

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

function onPointerDown(evt: PointerEvent, i: number) {
  evt.preventDefault()
  dragIndex.value = i
  ;(evt.target as Element).setPointerCapture(evt.pointerId)
}

function onPointerMove(evt: PointerEvent) {
  if (dragIndex.value === null || !curves.value)
    return
  const local = pointerToViewbox(evt)
  if (!local)
    return
  const i = dragIndex.value
  if (activeCurve.value === 'vario') {
    let next = varioForX(local.x)
    next = snap(next, def.value.step)
    next = clamp(next, def.value.min, def.value.max)
    curves.value.buzzer_vario_dots[i] = next
  }
  else {
    let next = valueForY(local.y)
    next = snap(next, def.value.step)
    next = clamp(next, def.value.min, def.value.max)
    const field = def.value.field!
    curves.value[field][i] = next
  }
}

function onPointerUp(evt: PointerEvent) {
  if (dragIndex.value === null)
    return
  const target = evt.target as Element
  target.releasePointerCapture?.(evt.pointerId)
  dragIndex.value = null
}

// Vertical threshold markers (audit §7). Prefer explicit props (CPF firmware
// adapts m/s values to cm/s before passing), fall back to settingsStore.local
// for the legacy ≤0.15 path.
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
    x: xForVario(item.v as number),
    label: item.label,
    color: item.color,
  }))
})

// Grid lines — divide plot area into 10 cols × 8 rows for visual chunking.
const gridCols = computed(() => {
  const cols = 10
  return Array.from({ length: cols + 1 }, (_, i) => PAD_LEFT + (plotW * i) / cols)
})
const gridRows = computed(() => {
  const rows = 8
  return Array.from({ length: rows + 1 }, (_, i) => PAD_TOP + (plotH * i) / rows)
})
</script>

<template>
  <div class="editor">
    <div class="editor__tabs" role="tablist">
      <button
        v-for="key in (['vario', 'frequency', 'cycle', 'duty'] as CurveKey[])"
        :key="key"
        class="editor__tab"
        :class="{ 'editor__tab--active': activeCurve === key }"
        :aria-selected="activeCurve === key"
        role="tab"
        @click="activeCurve = key"
      >
        {{ key }}
      </button>
    </div>

    <svg
      ref="svgRef"
      class="editor__svg"
      :viewBox="`0 0 ${VB_W} ${VB_H}`"
      preserveAspectRatio="xMidYMid meet"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <!-- Grid -->
      <g class="editor__grid">
        <line
          v-for="(x, i) in gridCols"
          :key="`gx-${i}`"
          :x1="x" :y1="PAD_TOP" :x2="x" :y2="PAD_TOP + plotH"
        />
        <line
          v-for="(y, i) in gridRows"
          :key="`gy-${i}`"
          :x1="PAD_LEFT" :y1="y" :x2="PAD_LEFT + plotW" :y2="y"
        />
      </g>

      <!-- Threshold markers -->
      <g class="editor__thresholds">
        <line
          v-for="(line, i) in thresholdLines"
          :key="`thr-${i}`"
          :x1="line.x" :y1="PAD_TOP" :x2="line.x" :y2="PAD_TOP + plotH"
          :stroke="line.color"
          stroke-dasharray="4 4"
        />
      </g>

      <!-- Active curve path -->
      <path
        :d="pathD"
        fill="none"
        :stroke="def.color"
        stroke-width="2"
        stroke-linejoin="round"
      />

      <!-- Draggable points -->
      <template v-if="curves">
        <circle
          v-for="(_, i) in curves.buzzer_vario_dots"
          :key="i"
          :cx="xForVario(curves.buzzer_vario_dots[i])"
          :cy="activeCurve === 'vario'
            ? PAD_TOP + plotH / 2
            : yForValue(yValues[i])"
          r="7"
          class="editor__handle"
          :class="{ 'editor__handle--dragging': dragIndex === i }"
          :fill="def.color"
          @pointerdown.prevent="onPointerDown($event, i)"
        />
      </template>

      <!-- Axis labels -->
      <text :x="PAD_LEFT" :y="PAD_TOP + plotH + 22" class="editor__axis-label">
        vario {{ varioMin }}…{{ varioMax }} cm/s
      </text>
      <text :x="PAD_LEFT" :y="PAD_TOP - 4" class="editor__axis-label">
        {{ activeCurve }}: {{ def.min }}…{{ def.max }} {{ def.unit }}
      </text>
    </svg>

    <div class="editor__readout">
      <span v-for="(v, i) in yValues" :key="i" class="editor__chip">
        {{ v }}
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

.editor__tabs {
  display: flex;
  gap: var(--ck-s-xs);
  flex-wrap: wrap;
}

.editor__tab {
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

.editor__svg {
  width: 100%;
  height: auto;
  max-height: 60vh;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  touch-action: none;
}

.editor__grid line {
  stroke: var(--ck-grid);
  stroke-width: 0.5;
}

.editor__thresholds line {
  stroke-width: 1.2;
  opacity: 0.6;
}

.editor__handle {
  cursor: grab;
  transition: r var(--ck-dur-toggle) var(--ck-ease);
}

.editor__handle--dragging {
  cursor: grabbing;
  r: 9;
  filter: drop-shadow(0 0 4px var(--ck-signal));
}

.editor__axis-label {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  fill: var(--ck-dim);
}

.editor__readout {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.editor__chip {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  padding: 2px 6px;
  background: var(--ck-bg-deep);
  border: var(--ck-stroke-hair) dashed var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  color: var(--ck-ink-dim);
  min-width: 4ch;
  text-align: center;
}
</style>
