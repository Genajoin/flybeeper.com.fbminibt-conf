<script setup lang="ts">
import log from 'loglevel'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic.js'

const props = defineProps<{ cha: BleCharacteristic }>()
const { t, te } = useI18n()
const ch = props.cha

const MAX_VALUES = 300
const SVG_W = 300
const SVG_H = 100

const lastValue = ref<string | number | null>('--')
const lastUpdated = ref('')
const isNotified = ref(false)
const sparklinePath = ref('')

const storageName = ch.characteristic.service.device.id + props.cha.characteristic.uuid
let storedValues: { v: number, t: number }[] = JSON.parse(localStorage.getItem(storageName) ?? '[]')

// Long readouts (hex dumps, multi-field strings) get a smaller font so they
// don't overflow the card. Cheaper than reflow-on-content via JS.
const valueClass = computed(() =>
  typeof lastValue.value === 'string' && lastValue.value.length > 10
    ? 'cell__value cell__value--small'
    : 'cell__value',
)

onMounted(() => {
  ch.subscribe(subscriberFunction)
  log.debug(`Подписка на характеристику ${ch.characteristic.uuid}`)
  isNotified.value = ch.isNotified && !ch.isBlockNotify
  lastValue.value = ch.formattedValue
})

onBeforeUnmount(() => {
  ch.unsubscribe(subscriberFunction)
  log.debug(`Отписка от характеристики ${ch.characteristic.uuid}`)
  localStorage.setItem(storageName, JSON.stringify(storedValues))
})

function subscriberFunction(newValue: any) {
  lastValue.value = newValue instanceof DataView
    ? `0x${Array.from(new Uint8Array(newValue.buffer)).map(b => b.toString(16).padStart(2, '0')).join('')}`
    : newValue
  isNotified.value = ch.isNotified && !ch.isBlockNotify
  if (newValue === null)
    return
  if (typeof newValue !== 'number')
    return
  const timeStamp = new Date()
  lastUpdated.value = timeStamp.toLocaleTimeString()
  storedValues.push({ v: newValue, t: timeStamp.valueOf() })
  storedValues = storedValues.slice(-MAX_VALUES)
  sparklinePath.value = buildPath(storedValues)
}

function buildPath(values: { v: number }[]) {
  if (values.length < 2)
    return ''
  const min = Math.min(...values.map(p => p.v))
  const max = Math.max(...values.map(p => p.v))
  const dx = SVG_W / (values.length - 1)
  const range = max - min || 1
  const dy = SVG_H / range
  let d = ''
  for (let i = 0; i < values.length; i++) {
    const x = i * dx
    const y = SVG_H - (values[i].v - min) * dy
    if (!Number.isFinite(x) || !Number.isFinite(y))
      continue
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `
  }
  return d.trim()
}

function getTranslation() {
  return te(`param.${ch.characteristic.uuid}`)
    ? t(`param.${ch.characteristic.uuid}`)
    : ch.userFormatDescriptor || ch.characteristic.uuid
}

async function notifyOff() {
  ch.isBlockNotify = !ch.isBlockNotify
  if (ch.isBlockNotify)
    await ch.unsubscribeFromNotifications()
  else
    await ch.subscribeToNotifications()
  isNotified.value = ch.isNotified && !ch.isBlockNotify
}
</script>

<template>
  <button
    class="cell"
    :class="{ 'cell--paused': !isNotified }"
    type="button"
    :title="lastUpdated"
    @click="notifyOff()"
  >
    <svg
      class="cell__sparkline"
      viewBox="0 0 300 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path :d="sparklinePath" />
    </svg>

    <span class="cell__label">{{ getTranslation() }}</span>
    <span :class="valueClass">{{ lastValue !== null ? lastValue : '--' }}</span>
    <span v-if="!isNotified" class="cell__paused-tag">paused</span>
  </button>
</template>

<style scoped>
.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ck-s-xs);
  padding: var(--ck-s-md);
  background: var(--ck-paper);
  border: var(--ck-stroke-hair) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  text-align: left;
  font-family: var(--ck-font-body);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--ck-dur-toggle) var(--ck-ease);
}

.cell:hover {
  border-color: var(--ck-ink-dim);
}

.cell--paused {
  border-style: dashed;
  color: var(--ck-dim);
}

.cell__sparkline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: var(--ck-grid);
  stroke-width: 1.5;
  pointer-events: none;
}

.cell__label {
  position: relative;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.cell__value {
  position: relative;
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-display);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

.cell__value--small {
  font-size: var(--ck-fs-body);
  font-family: var(--ck-font-mono);
}

.cell__paused-tag {
  position: absolute;
  top: var(--ck-s-xs);
  right: var(--ck-s-xs);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-micro);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-signal);
}
</style>
