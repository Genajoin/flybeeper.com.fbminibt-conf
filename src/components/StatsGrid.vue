<script setup lang="ts">
import { computed, onMounted } from 'vue'

const bt = useBluetoothStore()
const { t } = useI18n()

// Map standard BLE UUIDs to dashboard cells.
const ALT_UUID = '00002a6c-0000-1000-8000-00805f9b34fb'
const PRESS_UUID = '00002a6d-0000-1000-8000-00805f9b34fb'
const TEMP_UUID = '00002a6e-0000-1000-8000-00805f9b34fb'
const BAT_UUID = 'b0c889e8-16d2-45ef-b615-387f6bca2370' // battery voltage
const BAT_LVL_UUID = '00002a19-0000-1000-8000-00805f9b34fb'

function chValue(uuid: string): number | null {
  const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
  const v = ch?.formattedValue
  return typeof v === 'number' ? v : null
}

const alt = computed(() => chValue(ALT_UUID))
const press = computed(() => chValue(PRESS_UUID))
const temp = computed(() => chValue(TEMP_UUID))
const bat = computed(() => chValue(BAT_UUID) ?? chValue(BAT_LVL_UUID))

function fmt(v: number | null, digits = 1): string {
  return v === null ? '—' : v.toFixed(digits)
}

const cells = computed(() => [
  { l: t('dashboard.alt'), v: fmt(alt.value, 0), u: 'M' },
  { l: t('dashboard.press'), v: fmt(press.value !== null ? press.value / 100 : null, 1), u: 'HPA' },
  { l: t('dashboard.temp'), v: fmt(temp.value, 0), u: '°C' },
  { l: t('dashboard.bat'), v: fmt(bat.value, 2), u: 'V' },
])

onMounted(async () => {
  const want = [ALT_UUID, PRESS_UUID, TEMP_UUID, BAT_UUID, BAT_LVL_UUID]
  for (const uuid of want) {
    const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
    if (ch && !ch.isNotified && !ch.isBlockNotify && ch.characteristic.properties.notify) {
      try {
        await ch.initialize()
        await ch.subscribeToNotifications()
      }
      catch {
        // best-effort
      }
    }
  }
})
</script>

<template>
  <div class="stats">
    <div
      v-for="(s, i) in cells"
      :key="s.l"
      class="stats__cell"
      :class="{
        'stats__cell--bordr': i % 2 === 0,
        'stats__cell--bordb': i < 2,
      }"
    >
      <CkEyebrow color="var(--ck-dim)">
        {{ s.l }}
      </CkEyebrow>
      <div class="stats__value-row">
        <span class="stats__value">{{ s.v }}</span>
        <span class="stats__unit">{{ s.u }}</span>
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
}

.stats__cell--bordr {
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
}

.stats__cell--bordb {
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.stats__value-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
}

.stats__value {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 28px;
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
