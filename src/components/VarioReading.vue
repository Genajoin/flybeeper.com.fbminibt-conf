<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'

/**
 * Live vario reading. Subscribes to the vario-by-pressure characteristic
 * and renders a Narrow display of the current value plus a centered bar
 * indicator over the −5…+10 m/s range.
 */

const bt = useBluetoothStore()
const { t } = useI18n()

const VARIO_UUIDS = [
  'b4df8385-16d2-4037-b2ed-2e14e1f4fa27', // vario by pressure
  '830ff7a0-367a-40e7-9038-4f00bda31f84', // vario by altitude
]

const variousChar = computed(() =>
  bt.bleCharacteristics.find(c => VARIO_UUIDS.includes(c.characteristic.uuid)),
)

const value = computed<number | null>(() => {
  const v = variousChar.value?.formattedValue
  return typeof v === 'number' ? v : null
})

const display = computed(() => {
  const v = value.value
  if (v === null)
    return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(1)
})

const MIN = -5
const MAX = 10

const frac = computed(() => {
  const v = value.value
  if (v === null)
    return 0.333 // zero at ~ (0 - -5)/15 = 0.333
  return Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN)))
})

const zeroPct = computed(() => ((0 - MIN) / (MAX - MIN)) * 100)
const fracPct = computed(() => frac.value * 100)
const barLeft = computed(() => Math.min(fracPct.value, zeroPct.value))
const barRight = computed(() => 100 - Math.max(fracPct.value, zeroPct.value))

onMounted(async () => {
  const c = variousChar.value
  if (c && !c.isNotified && !c.isBlockNotify) {
    await c.initialize()
    await c.subscribeToNotifications()
  }
})

onBeforeUnmount(async () => {
  // Leave subscriptions live — other panels may share.
})
</script>

<template>
  <div class="vario">
    <CkEyebrow block>
      {{ t('dashboard.vario') }}
    </CkEyebrow>
    <div class="vario__readout">
      <span class="vario__num">{{ display }}</span>
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
}

.vario__readout {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 6px;
}

.vario__num {
  font-family: var(--ck-font-display);
  font-size: 88px;
  font-weight: 800;
  letter-spacing: -4px;
  color: var(--ck-ink);
  line-height: 0.85;
  font-variant-numeric: tabular-nums;
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
}
</style>
