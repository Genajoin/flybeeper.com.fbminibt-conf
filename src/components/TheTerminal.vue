<script setup lang="ts">
import log from 'loglevel'
import { onBeforeUnmount, onMounted, ref } from 'vue'

// import type { BleCharacteristic } from '~/utils/BleCharacteristic'

const { t } = useI18n()
const bt = useBluetoothStore()
const loc = useLocationStore()
const logString = ref<string>('')
const header = ref<string>('')
const chas = bt.bleCharacteristics.filter(c => c.characteristic.properties.notify)
const subscribers: Map<string, Function> = new Map()

onMounted(async () => {
  chas.filter(c => c.isNotified).forEach((c) => {
    const subscriber = subscriberFunction()
    c.subscribe(subscriber)
    subscribers.set(c.characteristic.uuid, subscriber)
    log.debug(`Подписка на характеристику ${c.characteristic.uuid}`)
  })
  loc.startWatchingSpeed()
  getHeader()
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

chas.filter(c => !c.isInitialized).forEach(c => c.initialize())

// Определение функции-подписчика
function subscriberFunction() {
  return () => {
    logData2()
    // log.debug(`Значение характеристики ${characteristic.characteristic.uuid} изменено:`, newValue);
  }
}

function getTimestamp() {
  return new Date().toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}

function logData2() {
  let logEntry = getTimestamp()
  const list = chas.filter(c => c.isNotified)
  // Проход по всем значениям в characteristics
  for (const c of list)
    logEntry += `;${c.formattedValue}`

  // Добавление значений из loc
  logEntry += `;${loc.speed || ''};${loc.heading || ''};${loc.altitude || ''};${loc.accuracy || ''}`

  // Добавление к строке лога
  logString.value = `${logString.value}${logEntry}\n`
}

function getHeader() {
  const _header = ['Timestamp']

  const list = chas.filter(c => c.isNotified)
  for (const c of list)
    _header.push(`${t(`param.${c.characteristic.uuid}`)}`)

  // Добавление значений из loc в заголовок
  _header.push(t('param.speed-g'))
  _header.push(t('param.heading'))
  _header.push(t('param.altitude-g'))
  _header.push(t('param.accuracy'))

  // Преобразование заголовка в строку
  header.value = `${_header.join(';')}`
}

watch(() => chas.filter(c => c.isNotified).length, () => {
  getHeader()
  logString.value = `${logString.value}\n${header.value}`
})

function saveProtocolToFile() {
  const blob = new Blob([header.value, '\n', logString.value], { type: 'text/plain' })
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
  logString.value = ''
  getHeader()
}
</script>

<template>
  <button btn m="3 t8" @click="saveProtocolToFile">
    {{ t('msg.save-protocol') }}
  </button>
  <button btn m="3 t8" @click="clearProtocol">
    {{ t('msg.clear-protocol') }}
  </button>
  <div mx-auto max-w-full w-120>
    <pre text-left>{{ header }}</pre>
    <pre text-left>{{ logString }}</pre>
  </div>
  <noSleep />
</template>

<style scoped>

</style>
