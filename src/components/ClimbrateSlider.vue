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
}>(), {
  min: -5,
  max: 10,
  step: 0.1,
  snapValues: () => [-2, 0, 0.5, 2, 5],
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

const zeroPct = computed(() => ((0 - props.min) / (props.max - props.min)) * 100)
const sinkBarRightPct = computed(() => 100 - Math.max(frac.value * 100, zeroPct.value))
const climbBarLeftPct = computed(() => Math.min(frac.value * 100, zeroPct.value))

function setFromClientX(clientX: number) {
  const el = trackEl.value
  if (!el)
    return
  const rect = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
  const f = x / rect.width
  let value = props.min + f * (props.max - props.min)
  // snap to step
  value = Math.round(value / props.step) * props.step
  value = Math.max(props.min, Math.min(props.max, value))
  emit('update:modelValue', value)
}

function onPointerDown(e: PointerEvent) {
  emit('pointerdown')
  dragging.value = true;
  (e.target as Element).setPointerCapture?.(e.pointerId)
  setFromClientX(e.clientX)
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

const ticks = [-5, -3, -1, 0, 1, 3, 5, 10]

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
      <div v-for="t in ticks" :key="t" class="climb-slider__tick" :class="{ 'climb-slider__tick--zero': t === 0 }" :style="{ left: `calc(${((t - min) / (max - min)) * 100}% - 0.5px)` }" />
      <div class="climb-slider__thumb" :style="{ left: `calc(${frac * 100}% - 12px)`, borderColor: modelValue >= 0 ? 'var(--ck-ink)' : 'var(--ck-signal)' }" />
    </div>

    <div class="climb-slider__axis">
      <span>−5</span>
      <span>−3</span>
      <span>−1</span>
      <span>0</span>
      <span>+1</span>
      <span>+3</span>
      <span>+6</span>
      <span>+10 M/S</span>
    </div>

    <div class="climb-slider__snaps">
      <span class="climb-slider__snap-label">SNAP</span>
      <button
        v-for="s in snapValues"
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
  pointer-events: none;
}

.climb-slider__axis {
  display: flex;
  justify-content: space-between;
  font-family: var(--ck-font-mono);
  font-size: 9px;
  color: var(--ck-dim);
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
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
