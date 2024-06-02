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
const subscribers: Map<string, Function> = new Map()

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
      log.debug(`Одписка от характеристики ${characteristic.characteristic.uuid}`)
    }
  })
  loc.stopWatchingSpeed()
})

// Определение функции-подписчика
function subscriberFunction(characteristic: BleCharacteristicImpl) {
  return (newValue: any) => {
    if (pause.value)
      return
    // log.debug(`Значение характеристики ${characteristic.characteristic.uuid} изменено:`, newValue);
    const logEntry = `${getTimestamp()};${characteristic.userFormatDescriptor || characteristic.characteristic.uuid};${newValue}`

    logArray.value = logArray.value.slice(-36)
    logArray.value.push(logEntry)
  }
}

function getTimestampFromValue(timestamp: number) {
  const date = new Date(timestamp)
  const hours = (`0${date.getHours()}`).slice(-2)
  const minutes = (`0${date.getMinutes()}`).slice(-2)
  const seconds = (`0${date.getSeconds()}`).slice(-2)
  const milliseconds = (`00${date.getMilliseconds()}`).slice(-3)
  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

function getTimestamp() {
  return getTimestampFromValue(new Date().valueOf())
}

watch(() => loc.speed, (newValue) => {
  logArray.value.push(`${getTimestamp()};GNSS speed, km/h;${newValue}`)
})
watch(() => loc.accuracy, (newValue) => {
  logArray.value.push(`${getTimestamp()};GNSS accuracy, m;${newValue}`)
})
watch(() => loc.heading, (newValue) => {
  logArray.value.push(`${getTimestamp()};GNSS heading, °;${newValue}`)
})
watch(() => loc.altitude, (newValue) => {
  logArray.value.push(`${getTimestamp()};GNSS altitude, m;${newValue}`)
})

async function saveProtocolToFile() {
  const allEntries = chas.flatMap((ch) => {
    return ch.entryArray.map(entry => ({
      timestamp: entry.timestamp,
      value: entry.value,
      descriptor: ch.userFormatDescriptor || ch.characteristic.uuid,
    }))
  })
  const allLocs = loc.locParams.flatMap((p) => {
    return p.entryArray.map(entry => ({
      timestamp: entry.timestamp,
      value: entry.value,
      descriptor: p.description,
    }))
  })
  const merged = [...allEntries, ...allLocs]
  const sortedEntries = merged.sort((a, b) => a.timestamp - b.timestamp)
  const stringEntries = sortedEntries.map((entry) => {
    const timestamp = getTimestampFromValue(entry.timestamp)
    return `${timestamp};${entry.descriptor};${entry.value}`
  })
  const joinedString = stringEntries.join('\n')
  const blob = new Blob([joinedString], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const timestamp = getTimestamp()
  a.download = `protocol-${timestamp}.txt`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function clearProtocol() {
  logArray.value = []
  chas.forEach(ch => ch.entryArray = [])
  loc.locParams.forEach(p => p.entryArray = [])
}

function togglePause() {
  pause.value = !pause.value
}
</script>

<template>
  <button btn m="3 t0" @click="saveProtocolToFile">
    {{ t('msg.save-protocol') }}
  </button>
  <button btn m="3 t0" @click="clearProtocol">
    {{ t('msg.clear-protocol') }}
  </button>
  <button btn m="3 t0" @click="togglePause">
    {{ pause ? t('msg.resume') : t('msg.pause') }}
  </button>
  <div mx-auto max-w-full w-120>
    <pre text="left sm">{{ logArray.join('\n') }}</pre>
  </div>
  <noSleep />
</template>
