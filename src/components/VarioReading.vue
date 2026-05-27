<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'

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

// Sparkline path over the live vario trace (last 30 s).
const SVG_W = 300
const SVG_H = 80
const sparkPath = computed(() => {
  const s = samples.value
  if (s.length < 2)
    return ''
  const t0 = s[0].t
  const tN = s[s.length - 1].t
  const span = Math.max(tN - t0, 1)
  let lo = Infinity
  let hi = -Infinity
  for (const p of s) {
    if (p.v < lo)
      lo = p.v
    if (p.v > hi)
      hi = p.v
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
    lo = -1
    hi = 1
  }
  const pad = (hi - lo) * 0.12
  lo -= pad
  hi += pad
  const yScale = SVG_H / (hi - lo)
  return s.map((p, i) => {
    const x = ((p.t - t0) / span) * SVG_W
    const y = SVG_H - (p.v - lo) * yScale
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const zeroY = computed(() => {
  const s = samples.value
  if (s.length < 2)
    return SVG_H / 2
  let lo = Infinity
  let hi = -Infinity
  for (const p of s) {
    if (p.v < lo)
      lo = p.v
    if (p.v > hi)
      hi = p.v
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi)
    return SVG_H / 2
  const pad = (hi - lo) * 0.12
  lo -= pad
  hi += pad
  return SVG_H - (0 - lo) * (SVG_H / (hi - lo))
})
</script>

<template>
  <div class="vario">
    <svg
      v-if="sparkPath"
      class="vario__spark"
      :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line :x1="0" :y1="zeroY" :x2="SVG_W" :y2="zeroY" class="vario__spark-zero" />
      <path :d="sparkPath" class="vario__spark-path" />
    </svg>
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
  </div>
</template>

<style scoped>
.vario {
  padding: 20px 24px;
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
