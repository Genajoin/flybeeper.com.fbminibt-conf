<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import useBluetoothStore from '~/stores/bluetooth'
import useLocationStore from '~/stores/location'

const { t } = useI18n()
const bt = useBluetoothStore()
const gps = useLocationStore()
const log = ref<string>('')

watchEffect(() => {
  logData2()
})

onMounted(() => {
  gps.startWatchingSpeed()
  logData()
})

onBeforeUnmount(() => {
  gps.stopWatchingSpeed()
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
  const timestamp = getTimestamp()
  log.value = `${timestamp};${bt.ess.pressure.value}\n${log.value}`
}

function logData() {
  log.value = 'Timestamp;Pressure'
}

function saveProtocolToFile() {
  const blob = new Blob([log.value], { type: 'text/plain' })
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
  logData()
}
</script>

<template>
  <DeviceConnector v-if="!bt.isConnected" />
  <div v-if="bt.isConnected || gps.error === null">
    <button btn m="3 t8" @click="saveProtocolToFile">
      {{ t('msg.save-protocol') }}
    </button>
    <button btn m="3 t8" @click="clearProtocol">
      {{ t('msg.clear-protocol') }}
    </button>
    <div mx-auto max-w-full w-120>
      <pre text-left>{{ log }}</pre>
    </div>
    <noSleep />
  </div>
</template>
