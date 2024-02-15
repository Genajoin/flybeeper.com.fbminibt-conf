<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'

const { t } = useI18n()
const bt = useBluetoothStore()
const loc = useLocationStore()
const log = ref<string>('')
const header = ref<string>('')

watchEffect(() => {
  logData2()
})

onMounted(async () => {
  loc.startWatchingSpeed()
  getHeader()
})

onBeforeUnmount(async () => {
  loc.stopWatchingSpeed()
})

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
  const list = bt.bleCharacteristics.filter(c => c.characteristic.properties.notify && c.isNotified)
  // Проход по всем значениям в characteristics
  for (const c of list)
    logEntry += `;${c.formattedValue}`

  // Добавление значений из loc
  logEntry += `;${loc.speed || ''};${loc.heading || ''};${loc.altitude || ''};${loc.accuracy || ''}`

  // Добавление к строке лога
  log.value = `${log.value}${logEntry}\n`
}

function getHeader() {
  const _header = ['Timestamp']

  const list = bt.bleCharacteristics.filter(c => c.characteristic.properties.notify && c.isNotified)
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

watch(() => bt.bleCharacteristics.filter(c => c.characteristic.properties.notify && c.isNotified).length, () => {
  getHeader()
  log.value = `${log.value}\n${header.value}`
})

function saveProtocolToFile() {
  const blob = new Blob([header.value, '\n', log.value], { type: 'text/plain' })
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
  log.value = ''
  getHeader()
}
</script>

<template>
  <DeviceConnector v-if="!bt.isConnected" />
  <div v-if="bt.isConnected || loc.error === null">
    <button btn m="3 t8" @click="saveProtocolToFile">
      {{ t('msg.save-protocol') }}
    </button>
    <button btn m="3 t8" @click="clearProtocol">
      {{ t('msg.clear-protocol') }}
    </button>
    <div mx-auto max-w-full w-120>
      <pre text-left>{{ header }}</pre>
      <pre text-left>{{ log }}</pre>
    </div>
    <noSleep />
  </div>
</template>
