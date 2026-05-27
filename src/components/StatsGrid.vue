<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'

const bt = useBluetoothStore()
const { t } = useI18n()

// Map standard BLE UUIDs to dashboard cells.
const ALT_UUID = '00002a6c-0000-1000-8000-00805f9b34fb'
const PRESS_UUID = '00002a6d-0000-1000-8000-00805f9b34fb'
const TEMP_UUID = '00002a6e-0000-1000-8000-00805f9b34fb'
const BAT_UUID = 'b0c889e8-16d2-45ef-b615-387f6bca2370'
const BAT_LVL_UUID = '00002a19-0000-1000-8000-00805f9b34fb'

const WANT_UUIDS = [ALT_UUID, PRESS_UUID, TEMP_UUID, BAT_UUID, BAT_LVL_UUID]

interface CellState {
  /** Live value pushed by the GATT notification subscriber. */
  value: number | null
  /** Short trace for the per-cell sparkline (~30 s @ ≤1 Hz). */
  trace: { t: number, v: number }[]
}

const HISTORY_MS = 30000
const cells = ref<Record<string, CellState>>(
  Object.fromEntries(WANT_UUIDS.map(u => [u, { value: null, trace: [] }])),
)

const subs = new Map<string, { ch: BleCharacteristic, cb: (v: unknown) => void }>()

function pushTrace(uuid: string, v: number) {
  const c = cells.value[uuid]
  const now = performance.now()
  c.value = v
  c.trace.push({ t: now, v })
  while (c.trace.length && now - c.trace[0].t > HISTORY_MS)
    c.trace.shift()
}

async function attach(ch: BleCharacteristic) {
  const uuid = ch.characteristic.uuid
  if (subs.has(uuid))
    return
  const cb = (v: unknown) => {
    if (typeof v === 'number')
      pushTrace(uuid, v)
  }
  ch.subscribe(cb)
  subs.set(uuid, { ch, cb })
  if (!ch.isNotified && !ch.isBlockNotify && ch.characteristic.properties?.notify) {
    try {
      await ch.initialize()
      await ch.subscribeToNotifications()
    }
    catch { /* best-effort */ }
  }
  if (typeof ch.formattedValue === 'number')
    pushTrace(uuid, ch.formattedValue)
}

function detach(uuid: string) {
  const s = subs.get(uuid)
  if (!s)
    return
  s.ch.unsubscribe(s.cb)
  subs.delete(uuid)
}

// Resolve each wanted UUID to a live BleCharacteristic (or undefined).
// A getter over the raw bleCharacteristics array doesn't fire when the store
// pushes new chars onto it (same array reference) — using a computed that
// runs .find() per UUID registers per-element deps via the proxy, so the
// computed re-evaluates whenever the store adds, replaces, or removes a
// characteristic. This is the same pattern VarioReading uses.
const wantedChars = computed<(BleCharacteristic | undefined)[]>(() =>
  WANT_UUIDS.map(
    u => bt.bleCharacteristics.find(c => c.characteristic.uuid === u) as BleCharacteristic | undefined,
  ),
)

watch(wantedChars, (chars) => {
  for (let i = 0; i < WANT_UUIDS.length; i++) {
    const uuid = WANT_UUIDS[i]
    const ch = chars[i]
    const existing = subs.get(uuid)
    if (ch) {
      // Reconnect can produce a new BleCharacteristic instance for the same
      // UUID; detach the stale subscriber before re-attaching.
      if (existing && existing.ch !== ch) {
        existing.ch.unsubscribe(existing.cb)
        subs.delete(uuid)
      }
      void attach(ch)
    }
    else if (existing) {
      detach(uuid)
    }
  }
}, { immediate: true })

onBeforeUnmount(() => {
  for (const uuid of [...subs.keys()])
    detach(uuid)
})

// Barometric altitude from pressure (ISA, sea-level 1013.25 hPa).
function altFromPressurePa(pa: number): number {
  return 44330 * (1 - (pa / 101325) ** (1 / 5.255))
}

const altDirect = computed(() => cells.value[ALT_UUID].value)
const pressPa = computed(() => cells.value[PRESS_UUID].value)
const alt = computed(() => {
  if (altDirect.value !== null)
    return altDirect.value
  if (pressPa.value !== null)
    return altFromPressurePa(pressPa.value)
  return null
})
const temp = computed(() => cells.value[TEMP_UUID].value)
const bat = computed(() => cells.value[BAT_UUID].value ?? cells.value[BAT_LVL_UUID].value)

function fmt(v: number | null, digits = 1): string {
  return v === null ? '—' : v.toFixed(digits)
}

// Sparkline path builder shared by every cell.
const SVG_W = 200
const SVG_H = 60
function buildSparkPath(trace: { t: number, v: number }[]): string {
  if (trace.length < 2)
    return ''
  const t0 = trace[0].t
  const tN = trace[trace.length - 1].t
  const span = Math.max(tN - t0, 1)
  let lo = Infinity
  let hi = -Infinity
  for (const p of trace) {
    if (p.v < lo)
      lo = p.v
    if (p.v > hi)
      hi = p.v
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.15
  lo -= pad
  hi += pad
  const yScale = SVG_H / (hi - lo)
  return trace.map((p, i) => {
    const x = ((p.t - t0) / span) * SVG_W
    const y = SVG_H - (p.v - lo) * yScale
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

const cellViews = computed(() => [
  {
    label: t('dashboard.alt'),
    value: fmt(alt.value, 0),
    unit: 'M',
    trace: cells.value[ALT_UUID].trace.length > 1
      ? cells.value[ALT_UUID].trace
      : cells.value[PRESS_UUID].trace.map(p => ({ t: p.t, v: altFromPressurePa(p.v) })),
  },
  {
    label: t('dashboard.press'),
    value: fmt(pressPa.value, 1),
    unit: 'PA',
    trace: cells.value[PRESS_UUID].trace,
  },
  {
    label: t('dashboard.temp'),
    value: fmt(temp.value, 0),
    unit: '°C',
    trace: cells.value[TEMP_UUID].trace,
  },
  {
    label: t('dashboard.bat'),
    value: fmt(bat.value, 2),
    unit: 'V',
    trace: cells.value[BAT_UUID].trace.length > 1 ? cells.value[BAT_UUID].trace : cells.value[BAT_LVL_UUID].trace,
  },
].map(c => ({ ...c, path: buildSparkPath(c.trace) })))
</script>

<template>
  <div class="stats">
    <div
      v-for="(s, i) in cellViews"
      :key="s.label"
      class="stats__cell"
      :class="{
        'stats__cell--bordr': i % 2 === 0,
        'stats__cell--bordb': i < 2,
      }"
    >
      <svg
        v-if="s.path"
        class="stats__spark"
        :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path :d="s.path" />
      </svg>
      <CkEyebrow color="var(--ck-dim)">
        {{ s.label }}
      </CkEyebrow>
      <div class="stats__value-row">
        <span class="stats__value">{{ s.value }}</span>
        <span class="stats__unit">{{ s.unit }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.stats__cell {
  background: var(--ck-paper);
  padding: 12px 16px;
  position: relative;
  overflow: hidden;
}

.stats__cell--bordr {
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
}

.stats__cell--bordb {
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.stats__spark {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.16;
}

.stats__spark path {
  fill: none;
  stroke: var(--ck-signal);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.stats__value-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
  position: relative;
}

.stats__value {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 26px;
  letter-spacing: -0.8px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stats__unit {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
  font-weight: 700;
  letter-spacing: 1px;
}
</style>
