<script setup lang="ts">
import log from 'loglevel'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { BleCharacteristicImpl } from '~/utils/BleCharacteristic'

const { t } = useI18n()
const bt = useBluetoothStore()
const loc = useLocationStore()
const pause = ref<boolean>(false)
const logArray = ref<string[]>([])
const chas = bt.bleCharacteristics.filter(c => c.characteristic.properties.notify) as BleCharacteristicImpl[]
const subscribers: Map<string, (v: any) => void> = new Map()

for (const c of chas)
  await c.initialize()

onMounted(async () => {
  if (chas.filter(c => c.isNotified).length === 0) {
    for (const c of chas)
      await c.subscribeToNotifications()
  }
  chas.filter(c => c.isNotified).forEach((c) => {
    const subscriber = subscriberFunction(c)
    c.subscribe(subscriber)
    subscribers.set(c.characteristic.uuid, subscriber)
    log.debug(`Подписка на характеристику ${c.characteristic.uuid}`)
  })
  loc.startWatchingSpeed()
})

onBeforeUnmount(async () => {
  subscribers.forEach((subscriber, characteristicUuid) => {
    const characteristic = chas.find(c => c.characteristic.uuid === characteristicUuid)
    if (characteristic) {
      characteristic.unsubscribe(subscriber)
      log.debug(`Отписка от характеристики ${characteristic.characteristic.uuid}`)
    }
  })
  loc.stopWatchingSpeed()
})

function subscriberFunction(characteristic: BleCharacteristicImpl) {
  return (newValue: any) => {
    if (pause.value)
      return
    const logEntry = `${getTimestamp()};${characteristic.userFormatDescriptor || characteristic.characteristic.uuid};${newValue}`
    logArray.value = logArray.value.slice(-36)
    logArray.value.push(logEntry)
  }
}

function getTimestampFromValue(timestamp: number) {
  const date = new Date(timestamp)
  const hh = (`0${date.getHours()}`).slice(-2)
  const mm = (`0${date.getMinutes()}`).slice(-2)
  const ss = (`0${date.getSeconds()}`).slice(-2)
  const ms = (`00${date.getMilliseconds()}`).slice(-3)
  return `${hh}:${mm}:${ss}.${ms}`
}

function getTimestamp() {
  return getTimestampFromValue(new Date().valueOf())
}

watch(() => loc.speed, v => logArray.value.push(`${getTimestamp()};GNSS speed, km/h;${v}`))
watch(() => loc.accuracy, v => logArray.value.push(`${getTimestamp()};GNSS accuracy, m;${v}`))
watch(() => loc.heading, v => logArray.value.push(`${getTimestamp()};GNSS heading, °;${v}`))
watch(() => loc.altitude, v => logArray.value.push(`${getTimestamp()};GNSS altitude, m;${v}`))

async function saveProtocolToFile() {
  const allEntries = chas.flatMap(ch =>
    ch.entryArray.map(entry => ({
      timestamp: entry.timestamp,
      value: entry.value,
      descriptor: ch.userFormatDescriptor || ch.characteristic.uuid,
    })),
  )
  const allLocs = loc.locParams.flatMap(p =>
    p.entryArray.map(entry => ({
      timestamp: entry.timestamp,
      value: entry.value,
      descriptor: p.description,
    })),
  )
  const merged = [...allEntries, ...allLocs]
  const sorted = merged.sort((a, b) => a.timestamp - b.timestamp)
  const lines = sorted.map(entry => `${getTimestampFromValue(entry.timestamp)};${entry.descriptor};${entry.value}`)
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `protocol-${getTimestamp()}.txt`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function clearProtocol() {
  logArray.value = []
  for (const ch of chas)
    ch.entryArray = []
  for (const p of loc.locParams)
    p.entryArray = []
}

function togglePause() {
  pause.value = !pause.value
}
</script>

<template>
  <section class="terminal">
    <div class="terminal__bar">
      <button class="terminal__btn terminal__btn--primary" type="button" @click="saveProtocolToFile">
        <span class="i-carbon-download" aria-hidden="true" />
        {{ t('msg.save-protocol') }}
      </button>
      <button class="terminal__btn" type="button" @click="clearProtocol">
        <span class="i-carbon-trash-can" aria-hidden="true" />
        {{ t('msg.clear-protocol') }}
      </button>
      <button class="terminal__btn" type="button" @click="togglePause">
        <span class="i-carbon-pause" :class="{ 'i-carbon-play': pause }" aria-hidden="true" />
        {{ pause ? t('msg.resume') : t('msg.pause') }}
      </button>
    </div>

    <pre class="terminal__log" :class="{ 'terminal__log--paused': pause }">{{ logArray.join('\n') }}</pre>

    <noSleep />
  </section>
</template>

<style scoped>
.terminal {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
}

.terminal__bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ck-s-sm);
}

.terminal__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-xs);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  font-weight: 600;
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
}

.terminal__btn:hover {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.terminal__btn--primary {
  background: var(--ck-signal);
  border-color: var(--ck-signal);
  color: var(--ck-on-signal);
}

.terminal__btn--primary:hover {
  background: var(--ck-ink);
  border-color: var(--ck-ink);
}

.terminal__log {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  line-height: 1.4;
  color: var(--ck-ink);
  background: var(--ck-bg-deep);
  border: var(--ck-stroke-hair) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  padding: var(--ck-s-md);
  margin: 0;
  min-height: 24rem;
  max-height: 60vh;
  overflow: auto;
  white-space: pre;
  text-align: left;
}

.terminal__log--paused {
  border-color: var(--ck-signal);
  border-style: dashed;
}
</style>
