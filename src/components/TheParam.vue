<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps(['cha'])
const { t, te } = useI18n()
const MAX_VALUES = 1000 // Максимальное количество хранимых значений
const lastUpdated = ref(null)
const isNotified = ref(false)
let storedValues = JSON.parse(localStorage.getItem(props.cha.characteristic.uuid)) || []

const backgroundSVG = ref('')
const storageName = props.cha.characteristic.service.device.id + props.cha.characteristic.uuid

onMounted(() => {
  watch(
    () => props.cha?.formattedValue,
    (newValue) => {
      if (!newValue)
        return // Проверка на наличие значения formattedValue
      const timeStamp = new Date()
      lastUpdated.value = timeStamp.toLocaleTimeString()
      storedValues.push({ v: newValue, t: timeStamp.valueOf() })
      storedValues = storedValues.slice(-MAX_VALUES)
      localStorage.setItem(storageName, JSON.stringify(storedValues))

      backgroundSVG.value = generateSVGContent(storedValues, 300, 100)
      isNotified.value = props.cha.isNotified
    },
    { immediate: true }, // Первоначальное выполнение обработчика сразу после монтирования компонента
  )
})

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

function getTranslation(cha) {
  return te(`param.${cha.characteristic.uuid}`)
    ? t(`param.${cha.characteristic.uuid}`)
    : cha.userFormatDescriptor || cha.characteristic.uuid
}
async function notifyOff(ch) {
  if (ch.isNotified) {
    await ch.unsubscribeFromNotifications()
    isNotified.value = ch.isNotified
  }
  else {
    await ch.subscribeToNotifications()
    isNotified.value = ch.isNotified
  }
}
</script>

<template>
  <div v-if="cha" class="cell" @click="notifyOff(cha)">
    <div class="background">
      <svg class="graph" :class="[isDark ? 'darkTheme' : 'lightTheme']" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">
        <g v-html="backgroundSVG" />
      </svg>
      <div text-sm opacity-50>
        {{ getTranslation(cha) }}
      </div>
      <div v-if="isNotified" text-4xl class="value">
        {{ cha.formattedValue !== null ? cha.formattedValue : "--" }}
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
  fill: #c2dac2;
}

.darkTheme circle {
  fill: darkslategray;
}
</style>
