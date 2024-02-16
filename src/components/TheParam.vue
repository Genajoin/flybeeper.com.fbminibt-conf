<script setup lang="ts">
import log from 'loglevel'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic.js'

const props = defineProps(['cha'])
const { t, te } = useI18n()
const ch = props.cha as BleCharacteristic
const MAX_VALUES = 300 // Максимальное количество хранимых значений
const lastValue = ref('--')
const lastUpdated = ref('')
const isNotified = ref(false)
const backgroundSVG = ref('')
const storageName = ch.characteristic.service.device.id + props.cha.characteristic.uuid
let storedValues = JSON.parse(localStorage.getItem(storageName)) || []
await ch.initialize()

onMounted(async () => {
  // await ch.subscribeToNotifications()
  ch.subscribe(subscriberFunction)
  log.debug(`Подписка на характеристику ${ch.characteristic.uuid}`)
  isNotified.value = ch.isNotified && !ch.isBlockNotify
  lastValue.value = ch.formattedValue
})

onBeforeUnmount(() => {
  ch.unsubscribe(subscriberFunction)
  log.debug(`Одписка от характеристики ${ch.characteristic.uuid}`)
  localStorage.setItem(storageName, JSON.stringify(storedValues))
})

// Определение функции-подписчика
function subscriberFunction(newValue: any) {
  lastValue.value = newValue
  isNotified.value = ch.isNotified && !ch.isBlockNotify
  if (newValue === null)
    return
  const timeStamp = new Date()
  lastUpdated.value = timeStamp.toLocaleTimeString()
  storedValues.push({ v: newValue, t: timeStamp.valueOf() })
  storedValues = storedValues.slice(-MAX_VALUES)
  backgroundSVG.value = generateSVGContent(storedValues, 300, 100)
  // log.info('Значение изменено:', newValue);
}

function generateSVGContent(storedValues, svgWidth, svgHeight) {
  const maxValue = Math.max(...storedValues.map(({ v }) => v)) // Максимальное значение
  const minValue = Math.min(...storedValues.map(({ v }) => v)) // Минимальное значение

  // Определяем коэффициенты масштабирования для отображения точек внутри SVG
  const scaleValueX = svgWidth / (storedValues.length - 1) // Горизонтальное масштабирование
  const scaleValueY = svgHeight / (maxValue - minValue) // Вертикальное масштабирование

  // Создаем пустой SVG-элемент
  let svgContent = ''

  // Формируем элементы точек графика
  for (let i = 0; i < storedValues.length; i++) {
    const { v } = storedValues[i]
    const x = i * scaleValueX // Горизонтальная позиция точки
    const y = svgHeight - (v - minValue) * scaleValueY // Вертикальная позиция точки

    if (!Number.isNaN(x) && !Number.isNaN(y))
      svgContent += `<circle cx="${x}" cy="${y}" r="2" />`
  }

  return svgContent
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
  <div class="cell" @click="notifyOff()">
    <div class="background">
      <svg class="graph" :class="[isDark ? 'darkTheme' : 'lightTheme']" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">
        <g v-html="backgroundSVG" />
      </svg>
      <div text-sm opacity-50>
        {{ getTranslation() }}
      </div>
      <div v-if="isNotified" text-4xl class="value">
        {{ lastValue !== null ? lastValue : "--" }}
      </div>
      <div text="sm right" opacity-50>
        {{ lastUpdated }}
      </div>
    </div>
  </div>
</template>

<style>
.background {
  position: relative;
  width: 100%;
  height: 100%;
}
.value {
  position: relative; /* Делаем блочным для корректного позиционирования */
}
.graph {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.lightTheme circle {
  fill: #ddf5e7;
}

.darkTheme circle {
  fill: darkslategray;
}
</style>
