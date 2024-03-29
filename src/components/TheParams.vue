<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import TheParam from '~/components/TheParam.vue'

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
</script>

<template>
  <div class="container">
    <TheParam v-for="cha in chas" :key="cha" :cha="cha" />
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
