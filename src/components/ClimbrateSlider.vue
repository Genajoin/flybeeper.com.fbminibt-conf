<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * Custom climbrate slider built to match design/src/frames.jsx > ClimbrateSimulator.
 * Replaces the native <input type="range"> in SimulatorControls.
 *
 * API stays compatible: v-model:modelValue is m/s (float), snapValues are also m/s.
 */

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
  snapValues?: number[]
  /** Tick marks + axis labels, m/s. Defaults to the 1× set for −5…+10. */
  ticks?: number[]
  /**
   * Outer limits, m/s, when `min`/`max` are only a zoomed window onto them.
   * Dragging past the track's end then keeps pushing the value towards these
   * (the host slides the window after it), like panning. Default: min/max.
   */
  limitMin?: number
  limitMax?: number
}>(), {
  min: -5,
  max: 10,
  step: 0.1,
  snapValues: () => [-2, 0, 0.5, 2, 5],
  ticks: () => [-5, -3, -1, 0, 1, 3, 5, 10],
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: number): void
  (e: 'pointerdown'): void
}>()

const trackEl = ref<HTMLElement | null>(null)
const dragging = ref(false)

const frac = computed(() => {
  const f = (props.modelValue - props.min) / (props.max - props.min)
  return Math.max(0, Math.min(1, f))
})

// Zoomed in, zero can sit outside the window — pin the bar's anchor to the
// nearer edge so the bar never runs off the track.
const zeroPct = computed(() => Math.max(0, Math.min(100, ((0 - props.min) / (props.max - props.min)) * 100)))
const sinkBarRightPct = computed(() => 100 - Math.max(frac.value * 100, zeroPct.value))
const climbBarLeftPct = computed(() => Math.min(frac.value * 100, zeroPct.value))

const lo = computed(() => props.limitMin ?? props.min)
const hi = computed(() => props.limitMax ?? props.max)

function emitValue(raw: number) {
  const value = Math.round(raw / props.step) * props.step
  emit('update:modelValue', Math.max(lo.value, Math.min(hi.value, value)))
}

/** Unrounded drag position, so slow drags past the end still add up. */
let dragRaw = 0
let lastClientX = 0

function setFromClientX(clientX: number) {
  const el = trackEl.value
  if (!el)
    return
  const rect = el.getBoundingClientRect()
  const scale = (props.max - props.min) / rect.width
  if (dragging.value && (clientX > rect.right || clientX < rect.left)) {
    // Past the end: only outward movement counts, and it moves the value on
    // from where it is (the window has followed it), not from the pointer's
    // absolute position — otherwise every event would re-add the whole
    // overshoot and the window would run away.
    const dx = clientX - lastClientX
    const outward = clientX > rect.right ? Math.max(dx, 0) : Math.min(dx, 0)
    const edge = clientX > rect.right ? props.max : props.min
    dragRaw = (clientX > rect.right ? Math.max(dragRaw, edge) : Math.min(dragRaw, edge)) + outward * scale
  }
  else {
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    dragRaw = props.min + x * scale
  }
  lastClientX = clientX
  dragRaw = Math.max(lo.value, Math.min(hi.value, dragRaw))
  emitValue(dragRaw)
}

function onPointerDown(e: PointerEvent) {
  emit('pointerdown')
  dragging.value = false
  lastClientX = e.clientX;
  (e.target as Element).setPointerCapture?.(e.pointerId)
  setFromClientX(e.clientX)
  dragging.value = true
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value)
    return
  setFromClientX(e.clientX)
}

function onPointerUp() {
  dragging.value = false
}

onBeforeUnmount(() => {
  dragging.value = false
})

function tickPct(v: number): number {
  return ((v - props.min) / (props.max - props.min)) * 100
}

function tickLabel(v: number): string {
  if (v === 0)
    return '0'
  const abs = Math.abs(v)
  const digits = Number.isInteger(abs) ? 0 : Number.isInteger(abs * 10) ? 1 : 2
  return `${v > 0 ? '+' : '−'}${abs.toFixed(digits)}`
}

// Labels at the very ends hug the track edge instead of hanging off it.
function labelStyle(v: number) {
  const pct = tickPct(v)
  const shift = pct < 3 ? '0' : pct > 90 ? '-100%' : '-50%'
  return { left: `${pct}%`, transform: `translateX(${shift})` }
}

// Every snap within the outer limits: zoomed in, the host's window slides to
// whichever one is picked.
const visibleSnaps = computed(() => props.snapValues.filter(v => v >= lo.value && v <= hi.value))

function snapMatches(v: number): boolean {
  return Math.round(props.modelValue * 10) / 10 === v
}

function applySnap(v: number) {
  emit('update:modelValue', v)
}
</script>

<template>
  <div class="climb-slider">
    <div
      ref="trackEl"
      class="climb-slider__track"
      role="slider"
      tabindex="0"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="modelValue"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="climb-slider__bg" />
      <div class="climb-slider__sink" :style="{ left: `${climbBarLeftPct}%`, right: `${sinkBarRightPct}%` }" />
      <div v-for="t in ticks" :key="t" class="climb-slider__tick" :class="{ 'climb-slider__tick--zero': t === 0 }" :style="{ left: `calc(${tickPct(t)}% - 0.5px)` }" />
      <div class="climb-slider__thumb" :style="{ left: `calc(${frac * 100}% - 12px)`, borderColor: modelValue >= 0 ? 'var(--ck-ink)' : 'var(--ck-signal)' }" />
    </div>

    <div class="climb-slider__axis">
      <span
        v-for="(t, i) in ticks"
        :key="t"
        class="climb-slider__label"
        :style="labelStyle(t)"
      >{{ tickLabel(t) }}{{ i === ticks.length - 1 ? ' M/S' : '' }}</span>
    </div>

    <div class="climb-slider__snaps">
      <span class="climb-slider__snap-label">SNAP</span>
      <button
        v-for="s in visibleSnaps"
        :key="s"
        type="button"
        class="climb-slider__snap"
        :class="{ 'climb-slider__snap--active': snapMatches(s) }"
        @click="applySnap(s)"
      >
        {{ s >= 0 ? '+' : '' }}{{ s }}
      </button>
      <slot name="extra" />
    </div>
  </div>
</template>

<style scoped>
.climb-slider {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.climb-slider__track {
  position: relative;
  height: 28px;
  cursor: pointer;
  touch-action: none;
}

.climb-slider__bg {
  position: absolute;
  left: 0;
  right: 0;
  top: 11px;
  height: 6px;
  background: var(--ck-dim);
  opacity: 0.4;
}

.climb-slider__sink {
  position: absolute;
  top: 11px;
  height: 6px;
  background: var(--ck-signal);
}

.climb-slider__tick {
  position: absolute;
  top: 9px;
  width: 1px;
  height: 10px;
  background: var(--ck-ink);
  opacity: 0.6;
}

.climb-slider__tick--zero {
  height: 14px;
  opacity: 1;
}

.climb-slider__thumb {
  position: absolute;
  top: 1px;
  width: 24px;
  height: 24px;
  background: var(--ck-paper);
  border: 2px solid var(--ck-ink);
  /* Takes the press itself: pinned to an edge (value outside the zoomed
     window) half of it overhangs the track, and that half must grab too. */
  cursor: grab;
}

.climb-slider__axis {
  position: relative;
  height: 12px;
  font-family: var(--ck-font-mono);
  font-size: 9px;
  color: var(--ck-dim);
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
}

.climb-slider__label {
  position: absolute;
  white-space: nowrap;
}

.climb-slider__snaps {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.climb-slider__snap-label {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--ck-dim);
  margin-right: 4px;
}

.climb-slider__snap {
  padding: 5px 10px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 0;
  font-variant-numeric: tabular-nums;
}

.climb-slider__snap--active {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border-color: var(--ck-signal);
}
</style>
