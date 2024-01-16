<script setup>
import { nextTick, onMounted, ref } from 'vue'

const props = defineProps(['settings'])

const curveInfo = [
  { key: 'buzzer_vario_dots', label: 'Vario,cm/s', humanLabel: 'Buzzer Vario', min: -2000, max: 2000, color: '#005500', lineWidth: 2 },
  { key: 'buzzer_frequency_dots', label: 'Frequency,Hz', humanLabel: 'Buzzer Frequency', min: 0, max: 6000, color: '#00FF00', lineWidth: 3 },
  { key: 'buzzer_cycle_dots', label: 'Cycle,ms', humanLabel: 'Buzzer Cycle', min: 0, max: 850, color: '#FF5500', lineWidth: 2.2 },
  { key: 'buzzer_duty_dots', label: 'Duty%', humanLabel: 'Buzzer Duty', min: 0, max: 100, color: '#0055FF', lineWidth: 1.4 },
]

const canvasRef = ref()
const xOffset = 10
const yOffset = 10
let isDarkMode = false
let sett = null

onMounted(async () => {
  isDarkMode = isDark.value
  sett = props.settings
  await redraw()
})

async function redraw() {
  await nextTick()
  const ctx = canvasRef.value.getContext('2d')
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  drawThresholds(canvasRef.value, sett.climb_tone_on_threshold_cm, sett.climb_tone_off_threshold_cm, sett.sink_tone_on_threshold_cm, sett.sink_tone_off_threshold_cm, sett.curves.buzzer_vario_dots,
  )
  drawCurves(canvasRef.value, sett.curves)
}

const _isDarkFunc = useDark({
  onChanged(dark) {
    isDarkMode = dark
    redraw()
  },
})

function updateCurves(newSettings) {
  sett = newSettings
  redraw()
}
defineExpose({ updateCurves })

function scaleX(x, minX, xRange, canvasWidth) {
  return ((x - minX) / xRange) * canvasWidth
}

function scaleY(y, minY, yRange, canvasHeight) {
  return canvasHeight - ((y - minY) / yRange) * canvasHeight
}

function drawCurves(canvas, newCurves) {
  const ctx = canvas.getContext('2d')
  const xWidth = canvas.width - xOffset * 2
  const yHeight = canvas.height - yOffset * 2

  drawGrid(ctx, xOffset, yOffset, xWidth, yHeight, 11)

  // Draw curves
  const xPoints = newCurves.buzzer_vario_dots
  curveInfo.forEach((curve, index) => {
    if (curve.key !== 'buzzer_vario_dots') {
      const yPoints = newCurves[curve.key]
      drawCurve(ctx, xPoints, yPoints, curve, xWidth, yHeight, xOffset, yOffset)
      drawScaleY(ctx, yPoints, xWidth, yHeight, curve, (index - 2) * 80, xOffset, yOffset)
    }
  })

  drawScaleX(ctx, newCurves.buzzer_vario_dots, xWidth, yHeight, curveInfo[0], xOffset, yOffset)
}

function drawCurve(ctx, xPoints, yPoints, curve, canvasWidth, canvasHeight, xOffset, yOffset) {
  const minX = Math.min(...xPoints)
  const maxX = Math.max(...xPoints)
  const xRange = maxX - minX

  const minY = Math.min(...yPoints)
  const maxY = Math.max(...yPoints)
  const yRange = maxY - minY

  ctx.beginPath()
  ctx.moveTo(scaleX(xPoints[0], minX, xRange, canvasWidth) + xOffset, scaleY(yPoints[0], minY, yRange, canvasHeight) + yOffset)

  for (let i = 1; i < yPoints.length; i++)
    ctx.lineTo(scaleX(xPoints[i], minX, xRange, canvasWidth) + xOffset, scaleY(yPoints[i], minY, yRange, canvasHeight) + yOffset)

  ctx.strokeStyle = curve.color
  ctx.lineWidth = curve.lineWidth
  ctx.stroke()
}

function drawScaleX(ctx, xPoints, canvasWidth, canvasHeight, curve, xOffset, yOffset) {
  const minX = Math.min(...xPoints)
  const maxX = Math.max(...xPoints)
  const xRange = maxX - minX
  const yLineOffset = 0
  const yTextOffset = 10
  const yLabelOffset = -20
  const divLength = -5
  ctx.fillStyle = isDarkMode ? '#FFF' : '#000'

  for (let i = 0; i < xPoints.length; i++) {
    const x = minX + i * (xRange / (xPoints.length - 1))
    const scaledX = scaleX(x, minX, xRange, canvasWidth)

    ctx.beginPath()
    ctx.moveTo(scaledX + xOffset, canvasHeight + yOffset + yLineOffset + divLength)
    ctx.lineTo(scaledX + xOffset, canvasHeight + yOffset + yLineOffset)
    ctx.strokeStyle = curve.color
    ctx.stroke()

    ctx.fillText(x.toFixed(0), scaledX + xOffset - 11, canvasHeight + yOffset + yTextOffset)
  }
  ctx.beginPath()
  ctx.moveTo(0 + xOffset, canvasHeight + yOffset + yLineOffset)
  ctx.lineTo(canvasWidth + xOffset, canvasHeight + yOffset + yLineOffset)
  ctx.stroke()

  // Название шкалы
  ctx.fillText(curve.label, 15 + xOffset, canvasHeight + yOffset + yLabelOffset)
}

function drawScaleY(ctx, yPoints, canvasWidth, canvasHeight, curve, offset, xOffset, yOffset) {
  const minY = Math.min(...yPoints)
  const maxY = Math.max(...yPoints)
  const yRange = maxY - minY
  ctx.fillStyle = isDarkMode ? '#FFF' : '#000'

  for (let i = 0; i < yPoints.length; i++) {
    const y = minY + i * (yRange / (yPoints.length - 1))
    const scaledY = scaleY(y, minY, yRange, canvasHeight)

    ctx.beginPath()
    ctx.moveTo(canvasWidth / 2 - offset + xOffset, scaledY + yOffset)
    ctx.lineTo(canvasWidth / 2 - offset + xOffset - 10, scaledY + yOffset)
    ctx.stroke()

    ctx.fillText(y.toFixed(0), canvasWidth / 2 - offset + xOffset + 2, scaledY + yOffset)
  }
  ctx.beginPath()
  ctx.moveTo(canvasWidth / 2 - offset + xOffset, 0 + yOffset)
  ctx.lineTo(canvasWidth / 2 - offset + xOffset, canvasHeight + yOffset)
  ctx.stroke()

  // Название шкалы
  ctx.fillText(curve.label, canvasWidth / 2 - offset + xOffset + 2, 10 + yOffset)
}

function drawThresholds(canvas, climbOn, climbOff, sinkOn, sinkOff, xPoints) {
  const ctx = canvas.getContext('2d')
  const xWidth = canvas.width - xOffset * 2
  const yHeight = canvas.height - yOffset * 2
  const minX = Math.min(...xPoints)
  const maxX = Math.max(...xPoints)
  const xRange = maxX - minX

  ctx.beginPath()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#9ab201'

  ctx.moveTo(scaleX(climbOn, minX, xRange, xWidth) + xOffset, yOffset)
  ctx.lineTo(scaleX(climbOn, minX, xRange, xWidth) + xOffset, yHeight + yOffset)
  ctx.stroke()
  ctx.moveTo(scaleX(sinkOn, minX, xRange, xWidth) + xOffset, yOffset)
  ctx.lineTo(scaleX(sinkOn, minX, xRange, xWidth) + xOffset, yHeight + yOffset)
  ctx.stroke()

  ctx.beginPath()
  ctx.strokeStyle = '#e600ff'
  ctx.moveTo(scaleX(climbOff, minX, xRange, xWidth) + xOffset, yOffset)
  ctx.lineTo(scaleX(climbOff, minX, xRange, xWidth) + xOffset, yHeight + yOffset)
  ctx.stroke()
  ctx.moveTo(scaleX(sinkOff, minX, xRange, xWidth) + xOffset, yOffset)
  ctx.lineTo(scaleX(sinkOff, minX, xRange, xWidth) + xOffset, yHeight + yOffset)
  ctx.stroke()
}

function drawGrid(ctx, xOffset, yOffset, canvasWidth, canvasHeight, gridSize) {
  ctx.strokeStyle = '#ddd' // Серый цвет
  ctx.lineWidth = 0.5 // Тонкая линия
  const xStep = canvasWidth / gridSize

  for (let x = xOffset; x < canvasWidth + xStep; x += xStep) {
    ctx.beginPath()
    ctx.moveTo(x, yOffset)
    ctx.lineTo(x, canvasHeight + yOffset)
    ctx.stroke()
  }

  for (let y = yOffset; y <= canvasHeight; y += canvasHeight / gridSize) {
    ctx.beginPath()
    ctx.moveTo(xOffset, y)
    ctx.lineTo(canvasWidth + xOffset, y)
    ctx.stroke()
  }
}
</script>

<template>
  <canvas ref="canvasRef" width="600" height="340" />
</template>

<style>
canvas {
  /*display: block;  Исключить отступы, свойственные строчным элементам */
  max-width: 90vw;
  max-height: 90vh;
}
</style>
