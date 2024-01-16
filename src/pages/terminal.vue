<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import useBluetoothStore from '~/stores/bluetooth'
import useLocationStore from '~/stores/location'

const { t } = useI18n()
const bt = useBluetoothStore()
const loc = useLocationStore()
const log = ref<string>('')
const calculateAltitudeP = ref<number | null>(null)

watchEffect(() => {
  logData2()
  calculateAltitudeP.value = bt.ess.pressure.characteristic && bt.ess.pressure.value !== null ? ((4433000 * (1.0 - (bt.ess.pressure.value / 101325.0) ** 0.1903)) | 0) / 100 : null
})

onMounted(() => {
  loc.startWatchingSpeed()
  logData()
})

onBeforeUnmount(() => {
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
  const timestamp = getTimestamp()
  log.value = `${timestamp};${bt.ess.pressure.value};${bt.ess.temperature.value};${calculateAltitudeP.value};${loc.speed};${loc.heading};${loc.altitude};${loc.accuracy}\n${log.value}`
}

function logData() {
  log.value = 'Timestamp;Pressure;Temperature;AltitudeP;Speed;Heading;AltitudeG;Accuracy'
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
  <div v-if="bt.isConnected || loc.error === null">
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
