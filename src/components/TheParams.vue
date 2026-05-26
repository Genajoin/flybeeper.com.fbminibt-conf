<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const { t } = useI18n()
const bt = useBluetoothStore()
const loc = useLocationStore()
const chas = bt.bleCharacteristics.filter(c => c.characteristic.properties.notify)

for (const c of chas)
  await c.initialize()

for (const c of chas.filter(c => !c.isNotified && !c.isBlockNotify))
  await c.subscribeToNotifications()

onMounted(async () => {
  loc.startWatchingSpeed()
})

onBeforeUnmount(async () => {
  loc.stopWatchingSpeed()
})

function fmt(value: number | null, digits: number) {
  return value !== null ? value.toFixed(digits) : '--'
}
</script>

<template>
  <div class="grid">
    <TheParam v-for="cha in chas" :key="cha.characteristic.uuid" :cha="cha" />

    <template v-if="loc.error === null">
      <div class="cell">
        <div class="cell__label">
          {{ t('param.speed-g') }}
        </div>
        <div class="cell__value">
          {{ fmt(loc.speed, 1) }}
        </div>
      </div>

      <div class="cell">
        <div class="cell__label">
          {{ t('param.heading') }}
        </div>
        <div class="cell__value">
          {{ fmt(loc.heading, 0) }}
        </div>
      </div>

      <div class="cell">
        <div class="cell__label">
          {{ t('param.altitude-g') }}
        </div>
        <div class="cell__value">
          {{ fmt(loc.altitude, 1) }}
        </div>
      </div>

      <div class="cell">
        <div class="cell__label">
          {{ t('param.accuracy') }}
        </div>
        <div class="cell__pair">
          <span class="cell__pair-label">horiz</span>
          <span class="cell__pair-value">{{ fmt(loc.accuracy, 1) }}</span>
        </div>
        <div class="cell__pair">
          <span class="cell__pair-label">vert</span>
          <span class="cell__pair-value">{{ fmt(loc.altitudeAccuracy, 1) }}</span>
        </div>
      </div>

      <div class="cell">
        <div class="cell__label">
          {{ t('param.position') }}
        </div>
        <div class="cell__pair">
          <span class="cell__pair-label">lat</span>
          <span class="cell__pair-value">{{ fmt(loc.latitude, 5) }}</span>
        </div>
        <div class="cell__pair">
          <span class="cell__pair-label">lon</span>
          <span class="cell__pair-value">{{ fmt(loc.longitude, 5) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: var(--ck-s-md);
}

.cell {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
  padding: var(--ck-s-md);
  background: var(--ck-paper);
  border: var(--ck-stroke-hair) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  text-align: left;
  font-family: var(--ck-font-body);
}

.cell__label {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.cell__value {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-display);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  font-variant-numeric: tabular-nums;
}

.cell__pair {
  display: flex;
  align-items: baseline;
  gap: var(--ck-s-sm);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-body);
}

.cell__pair-label {
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
  min-width: 2rem;
}

.cell__pair-value {
  color: var(--ck-ink);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
</style>
