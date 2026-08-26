<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'
import { formatSpanSec, sparkGeometry, traceStats } from '~/utils/traceStats'

/**
 * Live vario reading. Prefers the native vario characteristic; if the
 * device only exposes pressure, derives vario as the time derivative of
 * barometric altitude over a ~1.2 s sliding window.
 *
 * Uses the per-char subscriber pattern (ch.subscribe(cb)) — pushing into a
 * local ref — because writing back to ch.formattedValue inside the GATT
 * notification handler does NOT propagate through Vue reactivity (the
 * handler closes over the raw instance, not the Pinia proxy).
 */

const bt = useBluetoothStore()
const { t } = useI18n()

const VARIO_UUIDS = [
  'b4df8385-16d2-4037-b2ed-2e14e1f4fa27', // vario by pressure
  '830ff7a0-367a-40e7-9038-4f00bda31f84', // vario by altitude
]
const PRESS_UUID = '00002a6d-0000-1000-8000-00805f9b34fb'

const variousChar = computed(() =>
  bt.bleCharacteristics.find(c => VARIO_UUIDS.includes(c.characteristic.uuid)) as BleCharacteristic | undefined,
)
const pressureChar = computed(() =>
  bt.bleCharacteristics.find(c => c.characteristic.uuid === PRESS_UUID) as BleCharacteristic | undefined,
)

const liveVario = ref<number | null>(null)
const livePressure = ref<number | null>(null)

// Subscribe lifecycle: when the resolved char changes, unsubscribe from
// the old instance and subscribe to the new one. immediate so first connect
// (or hot-reload) sets things up without a navigation away/back.
let varioCb: ((v: unknown) => void) | null = null
let pressCb: ((v: unknown) => void) | null = null
let lastVario: BleCharacteristic | null = null
let lastPressure: BleCharacteristic | null = null

watch(variousChar, async (next) => {
  if (lastVario && varioCb)
    lastVario.unsubscribe(varioCb)
  lastVario = next ?? null
  if (!next)
    return
  varioCb = (v) => {
    liveVario.value = typeof v === 'number' ? v : null
  }
  next.subscribe(varioCb)
  if (!next.isNotified && !next.isBlockNotify) {
    try {
      await next.initialize()
      await next.subscribeToNotifications()
    }
    catch { /* best-effort */ }
  }
  // Seed from current snapshot in case we connected before mounting.
  if (typeof next.formattedValue === 'number')
    liveVario.value = next.formattedValue
}, { immediate: true })

watch(pressureChar, async (next) => {
  if (lastPressure && pressCb)
    lastPressure.unsubscribe(pressCb)
  lastPressure = next ?? null
  if (!next)
    return
  pressCb = (v) => {
    livePressure.value = typeof v === 'number' ? v : null
  }
  next.subscribe(pressCb)
  if (!next.isNotified && !next.isBlockNotify) {
    try {
      await next.initialize()
      await next.subscribeToNotifications()
    }
    catch { /* best-effort */ }
  }
  if (typeof next.formattedValue === 'number')
    livePressure.value = next.formattedValue
}, { immediate: true })

onBeforeUnmount(() => {
  if (lastVario && varioCb)
    lastVario.unsubscribe(varioCb)
  if (lastPressure && pressCb)
    lastPressure.unsubscribe(pressCb)
})

// Barometric altitude from pressure (ISA, sea-level 1013.25 hPa).
function altFromPressurePa(pa: number): number {
  return 44330 * (1 - (pa / 101325) ** (1 / 5.255))
}

interface Sample { t: number, h: number, v: number }
const HISTORY_MS = 30000 // 30 s of trace
const DERIV_WINDOW_MS = 1200
const samples = ref<Sample[]>([])

// On each pressure update, push a new sample with the derived altitude.
// The vario sparkline trace uses the value column from these samples.
watch(livePressure, (pa) => {
  if (typeof pa !== 'number')
    return
  const now = performance.now()
  const h = altFromPressurePa(pa)
  // Provisional vario: derivative against the oldest in-window sample.
  let v = 0
  const cutoff = now - DERIV_WINDOW_MS
  const anchor = samples.value.find(s => s.t >= cutoff) ?? samples.value[0]
  if (anchor) {
    const dt = (now - anchor.t) / 1000
    if (dt > 0.2)
      v = (h - anchor.h) / dt
  }
  samples.value.push({ t: now, h, v })
  // Trim trace to HISTORY_MS.
  while (samples.value.length && now - samples.value[0].t > HISTORY_MS)
    samples.value.shift()
})

const derivedVario = computed<number | null>(() => {
  const s = samples.value
  if (s.length < 2)
    return null
  return s[s.length - 1].v
})

const value = computed<number | null>(() => {
  if (typeof liveVario.value === 'number')
    return liveVario.value
  return derivedVario.value
})

// Keep sign and magnitude as separate atoms so the tabular-nums column for
// the magnitude doesn't shift sideways every time the polarity flips ("+"
// and "−" have different widths in most display fonts).
const signLabel = computed(() => {
  const v = value.value
  if (v === null)
    return ''
  if (v > 0)
    return '+'
  if (v < 0)
    return '−'
  return ''
})

const magnitudeLabel = computed(() => {
  const v = value.value
  if (v === null)
    return '—'
  return Math.abs(v).toFixed(2)
})

const MIN = -5
const MAX = 10

const frac = computed(() => {
  const v = value.value
  if (v === null)
    return 0.333
  return Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN)))
})

const zeroPct = computed(() => ((0 - MIN) / (MAX - MIN)) * 100)
const fracPct = computed(() => frac.value * 100)
const barLeft = computed(() => Math.min(fracPct.value, zeroPct.value))
const barRight = computed(() => 100 - Math.max(fracPct.value, zeroPct.value))

// Sparkline geometry over the live vario trace (last 30 s): path plus where
// the extremes sit, so the marker dots land on the drawn line.
const spark = computed(() => sparkGeometry(samples.value, 0.12))

// Scale of that sparkline, pinned to three corners of the block: max
// top-right, min bottom-right, window length bottom-left. Without them the
// trace has no axes — it auto-fits its own extremes, so a 0.2 m/s ripple and a
// 4 m/s dive draw the same shape.
function signed(v: number): string {
  const s = v.toFixed(2)
  return v > 0 ? `+${s}` : s.replace('-', '−')
}

const corners = computed<{ min: string, max: string, span: string } | null>(() => {
  const st = traceStats(samples.value)
  if (!st)
    return null
  return {
    min: `${t('dashboard.trace-min')} ${signed(st.min)}`,
    max: `${t('dashboard.trace-max')} ${signed(st.max)}`,
    span: `${t('dashboard.trace-span')} ${formatSpanSec(st.spanSec)}`,
  }
})
</script>

<template>
  <div class="vario">
    <svg
      v-if="spark"
      class="vario__spark"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line v-if="spark.zeroY !== null" :x1="0" :y1="spark.zeroY" :x2="100" :y2="spark.zeroY" class="vario__spark-zero" />
      <path :d="spark.path" class="vario__spark-path" />
    </svg>
    <!-- Dots as positioned elements, not <circle>: the svg is stretched by
         preserveAspectRatio="none", which would squash a circle into an
         ellipse. -->
    <template v-if="spark">
      <i class="vario__dot vario__dot--max" :style="{ left: `${spark.max.x}%`, top: `${spark.max.y}%` }" />
      <i class="vario__dot vario__dot--min" :style="{ left: `${spark.min.x}%`, top: `${spark.min.y}%` }" />
    </template>
    <CkEyebrow block>
      {{ t('dashboard.vario') }}
    </CkEyebrow>
    <div class="vario__readout">
      <span class="vario__sign">{{ signLabel }}</span>
      <span class="vario__num">{{ magnitudeLabel }}</span>
      <span class="vario__unit">M/S</span>
    </div>
    <div class="vario__bar">
      <div class="vario__bar-fill" :style="{ left: `${barLeft}%`, right: `${barRight}%` }" />
      <div class="vario__bar-zero" :style="{ left: `${zeroPct}%` }" />
    </div>
    <div class="vario__axis">
      <span>−5</span><span>0</span><span>+10</span>
    </div>
    <template v-if="corners">
      <span class="vario__corner vario__corner--tr">{{ corners.max }}</span>
      <span class="vario__corner vario__corner--br">{{ corners.min }}</span>
      <span class="vario__corner vario__corner--bl">{{ corners.span }}</span>
    </template>
  </div>
</template>

<style scoped>
.vario {
  /* Bottom padding leaves a band for the corner numbers under the −5/0/+10
     axis, so they sit on the rule that closes the block. */
  padding: 20px 24px 18px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  position: relative;
}

.vario__spark {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.18;
}

.vario__dot {
  position: absolute;
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.75;
}

.vario__dot--max {
  background: var(--ck-signal);
}

.vario__dot--min {
  background: var(--ck-cold);
}

.vario__spark-path {
  fill: none;
  stroke: var(--ck-signal);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.vario__spark-zero {
  stroke: var(--ck-ink);
  stroke-width: 0.5;
  stroke-dasharray: 2 2;
  vector-effect: non-scaling-stroke;
  opacity: 0.6;
}

.vario__readout {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 6px;
  position: relative;
}

.vario__sign {
  font-family: var(--ck-font-display);
  font-size: 56px;
  font-weight: 800;
  color: var(--ck-ink);
  line-height: 0.85;
  width: 0.55em;
  display: inline-block;
  text-align: right;
  letter-spacing: -1px;
}

.vario__num {
  font-family: var(--ck-font-display);
  font-size: 72px;
  font-weight: 800;
  letter-spacing: -3px;
  color: var(--ck-ink);
  line-height: 0.85;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

.vario__unit {
  color: var(--ck-dim);
  font-family: var(--ck-font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
}

.vario__bar {
  margin-top: 12px;
  position: relative;
  height: 10px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.vario__bar-fill {
  position: absolute;
  top: -1px;
  bottom: -1px;
  background: var(--ck-signal);
}

.vario__bar-zero {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  background: var(--ck-ink);
}

.vario__corner {
  position: absolute;
  font-family: var(--ck-font-mono);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  color: var(--ck-dim);
  letter-spacing: 0.3px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.vario__corner--tr {
  top: 5px;
  right: 6px;
}

.vario__corner--br {
  bottom: 5px;
  right: 6px;
}

.vario__corner--bl {
  bottom: 5px;
  left: 6px;
}

.vario__axis {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-family: var(--ck-font-mono);
  font-size: 9px;
  color: var(--ck-dim);
  letter-spacing: 1px;
  position: relative;
}
</style>
