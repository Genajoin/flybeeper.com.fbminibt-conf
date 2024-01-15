<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLocationStore } from '~/stores/location'

const { t } = useI18n()
const bt = useBluetoothStore()
const calculateAltitudeP = ref<number | null>(null)
const calculateEAS = ref<number | null>(null)
const loc = useLocationStore()

onMounted(() => {
  loc.startWatchingSpeed()
})

onBeforeUnmount(() => {
  loc.stopWatchingSpeed()
})

watchEffect(() => {
  calculateAltitudeP.value = bt.ess.pressure.characteristic && bt.ess.pressure.value !== null ? 44330.0 * (1.0 - (bt.ess.pressure.value / 101325.0) ** 0.1903) : null
  calculateEAS.value = bt.lns.tas.value != null ? bt.getEAS(bt.lns.tas.value, bt.ess.pressure.value, bt.ess.temperature.value) : null
})
</script>

<template>
  <div class="container">
    <template v-if="bt.isConnected">
      <div v-if="bt.lns.tas.characteristic" class="cell">
        <div text-sm opacity-50>
          {{ t('param.speed-tas') }}
        </div>
        <div text-4xl>
          {{ bt.lns.tas.value !== null ? bt.lns.tas.value : '--' }}
        </div>
      </div>
      <div v-if="bt.lns.ias.characteristic" class="cell">
        <div text-sm opacity-50>
          {{ t('param.speed-ias') }}
        </div>
        <div text-4xl>
          {{ bt.lns.ias.value !== null ? bt.lns.ias.value : '--' }}
        </div>
      </div>
      <div v-if="bt.lns.tas.characteristic" class="cell">
        <div text-sm opacity-50>
          {{ t('param.speed-eas') }}
        </div>
        <div text-4xl>
          {{ calculateEAS !== null ? calculateEAS : '--' }}
        </div>
      </div>

      <div v-if="bt.ess.pressure.characteristic" class="cell">
        <div text-sm opacity-50>
          {{ t('param.altitude-p') }}
        </div>
        <div text-4xl>
          {{ calculateAltitudeP !== null ? calculateAltitudeP.toFixed(1) : '--' }}
        </div>
      </div>
      <div v-if="bt.ess.pressure.characteristic" class="cell">
        <div text-sm opacity-50>
          {{ t('param.pressure') }}
        </div>
        <div text-4xl>
          {{ bt.ess.pressure.value !== null ? bt.ess.pressure.value : '--' }}
        </div>
      </div>
      <div v-if="bt.ess.temperature.characteristic" class="cell">
        <div text-sm opacity-50>
          {{ t('param.temperature') }}
        </div>
        <div text-4xl>
          {{ bt.ess.temperature.value !== null ? bt.ess.temperature.value : '--' }}
        </div>
      </div>
      <div v-if="bt.bas.batteryLevel.characteristic" class="cell">
        <div text-sm opacity-50>
          {{ t('param.battery-level') }}
        </div>
        <div text-4xl :class="{ 'text-red-600': bt.bas.batteryLevel.value !== null && bt.bas.batteryLevel.value < 10 }">
          {{ bt.bas.batteryLevel.value !== null ? bt.bas.batteryLevel.value : '--' }}
        </div>
      </div>
    </template>

    <DeviceConnector v-else />

    <template v-if="loc.error === null">
      <div class="cell">
        <div text-sm opacity-50>
          {{ t('param.speed-g') }}
        </div>
        <div text-4xl>
          {{ loc.speed !== null ? loc.speed.toFixed(1) : '--' }}
        </div>
      </div>
      <div class="cell">
        <div text-sm opacity-50>
          {{ t('param.heading') }}
        </div>
        <div text-4xl>
          {{ loc.heading !== null ? loc.heading.toFixed(0) : '--' }}
        </div>
      </div>
      <div class="cell">
        <div text-sm opacity-50>
          {{ t('param.altitude-g') }}
        </div>
        <div text-4xl>
          {{ loc.altitude !== null ? loc.altitude.toFixed(1) : '--' }}
        </div>
      </div>
      <div class="cell">
        <div text-sm opacity-50>
          {{ t('param.accuracy') }}
        </div>
        <div text-2xl>
          horiz {{ loc.accuracy !== null ? loc.accuracy.toFixed(1) : '--' }}
        </div>
        <div text-2xl>
          vert {{ loc.altitudeAccuracy !== null ? loc.altitudeAccuracy.toFixed(1) : '--' }}
        </div>
      </div>
      <div class="cell">
        <div text-sm opacity-50>
          {{ t('param.position') }}
        </div>
        <div text-2xl>
          {{ loc.latitude !== null ? loc.latitude.toFixed(5) : '--' }},
        </div>
        <div text-2xl>
          {{ loc.longitude !== null ? loc.longitude.toFixed(5) : '--' }}
        </div>
      </div>
    </template>
  </div>
  <div v-if="bt.isConnected">
    {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  margin-left: auto;
  margin-right: auto;
}

.cell {
  width: 45%; /* Ширина ячейки */
  margin: 2%; /* Расстояние между ячейками */
  text-align: center;
  background-color: #e0e0e0;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
/* Модификация для темы "dark" */
.dark .cell {
  background-color: #343a40; /* Темный фон */
  color: #ffffff; /* Белый цвет текста */
}

@media (min-width: 768px) {
  /* В альбомной ориентации - 4 ячейки в строке */
  .cell {
    width: 45%; /* Ширина ячейки */
  }
}

@media (min-width: 1024px) {
  /* В пейзажной ориентации - 4 ячейки в строке */
  .cell {
    width: 22.5%; /* Ширина ячейки */
  }
}
</style>
