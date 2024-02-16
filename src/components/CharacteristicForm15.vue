<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep'
import { computed, onMounted, ref, watch } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'

const bt = useBluetoothStore()
const { t, te } = useI18n()

const defaultConf = {
  buzzer_vario_dots: [-1400, -800, -100, 0, 5, 20, 100, 200, 300, 450, 1200, 2000],
  buzzer_frequency_dots: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
  buzzer_cycle_dots: [850, 790, 725, 750, 665, 595, 430, 325, 265, 210, 120, 100],
  buzzer_duty_dots: [100, 98, 95, 10, 40, 41, 43, 46, 49, 54, 78, 90],
}

const log2Conf = {
  buzzer_vario_dots: [-1000, -300, -55, -50, 0, 10, 100, 250, 425, 600, 800, 1000],
  buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 920, 1380, 1600, 1780, 1880, 2000],
  buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 550, 485, 410, 320, 240, 150],
  buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
}
const lin2Conf = {
  buzzer_vario_dots: [-1000, -300, -55, -50, 0, 10, 115, 265, 425, 600, 800, 1000],
  buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 550, 765, 985, 1235, 1520, 2000],
  buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 550, 485, 410, 320, 240, 150],
  buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
}

const tableChanged = ref(false)

const chas = bt.bleCharacteristics
  .filter(c => c.characteristic.service.uuid === '904baf04-5814-11ee-8c99-0242ac120000') as BleCharacteristic[]

for (const c of chas.filter(c => !c.isInitialized))
  c.initialize()

const buzzer_volume = computed(() => bt.bleCharacteristics
  .find(c => c.characteristic.uuid === '67f82d94-2b2a-4123-81c9-058e460c3d01'))
const simulator_value = computed(() => bt.bleCharacteristics
  .find(c => c.characteristic.uuid === '904baf04-5814-11ee-8c99-0242ac120002'))
const cha_in_table = computed(() => chas
  .filter(c => c.presentationFormatDescriptor && c.presentationFormatDescriptor.format === 0x1B))

let simulateVarioTimeout = null
let simulateInProgress = false

const theCurvesRef = ref()

onMounted(async () => {
  // Обработчик изменения значения Simulate Vario
  const simulCh = bt.bleCharacteristics
    .find(c => c.characteristic.uuid === '904baf04-5814-11ee-8c99-0242ac120002')
  if (simulCh !== undefined) {
    watch(() => simulCh.formattedValue, (newValue) => {
      if (!simulateInProgress || !newValue) {
        simulateInProgress = true
        if (simulateVarioTimeout)
          clearTimeout(simulateVarioTimeout)

        const delay = 200 // Миллисекунды
        // Отправляем значение на устройство после задержки
        simulateVarioTimeout = setTimeout(async () => {
          await bt.bleCharacteristics
            .find(c => c.characteristic.uuid === '904baf04-5814-11ee-8c99-0242ac120002')
            .setFormattedValue()
          simulateInProgress = false
        }, delay)
      }
    })
  }
})

async function updateCharacteristic() {
  for (const characteristic of chas)
    await characteristic.setFormattedValue()
  tableChanged.value = false
}

function resetValue(uuid, value) {
  chas.find(c => c.characteristic.uuid === uuid)
    .formattedValue = cloneDeep(value)
}

function resetTo(conf) {
  resetValue('512d6d89-7a6f-461c-983e-902b68d40f56', conf.buzzer_vario_dots)
  resetValue('8c090502-81c4-4d29-8d10-6db20607ace9', conf.buzzer_frequency_dots)
  resetValue('9c3b62c0-e227-4f1a-8342-7e647015555d', conf.buzzer_cycle_dots)
  resetValue('98c16914-00ad-47ba-b625-148f0baaec47', conf.buzzer_duty_dots)
  theCurvesRef.value.updateCurves(bt.bleCharacteristics
    .filter(c => c.characteristic.service.uuid === '904baf04-5814-11ee-8c99-0242ac120000'))
  tableChanged.value = true
}
function resetToDefault() {
  resetTo(defaultConf)
}

function resetToLog2() {
  resetTo(log2Conf)
}

function resetToLin2() {
  resetTo(lin2Conf)
}

// Функция для скачивания JSON
function downloadJson() {
  const exportObj = chas.map((cha) => {
    return {
      uuid: cha.characteristic.uuid,
      name: cha.userFormatDescriptor,
      value: cha.formattedValue,
    }
  })
  const jsonString = JSON.stringify(exportObj)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'FBminiBT-settings.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const fileUploadInput = ref()
// Функция для загрузки JSON из файла
function uploadJson(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const importObj = JSON.parse(e.target.result)
      importObj.forEach((importedCharacteristic) => {
        const characteristic = bt.bleCharacteristics.find(c => c.characteristic.uuid === importedCharacteristic.uuid)

        if (characteristic) {
          characteristic.formattedValue = importedCharacteristic.value
          handleInputChange()
        }
      })
    }
    reader.readAsText(file)
    fileUploadInput.value.value = ''
  }
}

function getTypeFromPresentationFormat(presentationFormatDescriptor) {
  if (!presentationFormatDescriptor)
    return 'text'
  switch (presentationFormatDescriptor.format) {
    case 0x01: // bit
      return 'checkbox'
    case 0x19: // utf8s
    case 0x1A: // utf16s
      return 'text'
    case 0x1B: // array
      return 'array'
    default:
      return 'number'
  }
}

function getStepByFormatDescriptor(formatDescriptor) {
  if (!formatDescriptor)
    return 1
  if (formatDescriptor.format > 0x01 && formatDescriptor.format < 0x14)
    return 10 ** formatDescriptor.exponent

  return 1
}

function getStepByUUID(uuid) {
  switch (uuid) {
    case '8c090502-81c4-4d29-8d10-6db20607ace9': // freq
      return 10
    case '9c3b62c0-e227-4f1a-8342-7e647015555d': // cycle
      return 10
    case '512d6d89-7a6f-461c-983e-902b68d40f56': // vario
      return 5
    case '98c16914-00ad-47ba-b625-148f0baaec47': // duty
    default:
      return 1
  }
}

function handleInputChange() {
  tableChanged.value = true
  theCurvesRef.value?.updateCurves(chas)
}
function getTranslation(cha) {
  return (te(`sett.${cha.characteristic.uuid}`))
    ? t(`sett.${cha.characteristic.uuid}`)
    : cha.userFormatDescriptor || cha.characteristic.uuid
}
</script>

<template>
  <div m-auto max-w-320 flex flex-wrap justify-center>
    <div max-w-full min-w-340px flex-1 text-right>
      <div
        v-for="cha in chas
          .filter(c => c.presentationFormatDescriptor
            && c.presentationFormatDescriptor.format > 0
            && c.presentationFormatDescriptor.format !== 0x1B)
          .sort((a, b) => {
            // Сначала сортируем по format
            const formatDiff = a.presentationFormatDescriptor.format - b.presentationFormatDescriptor.format;
            if (formatDiff !== 0) {
              return formatDiff;
            }
            // Если format одинаков, сортируем по userFormatDescriptor
            return a.userFormatDescriptor.localeCompare(b.userFormatDescriptor);
          })"
        :key="cha.characteristic.uuid"
      >
        <label :for="cha.characteristic.uuid">{{ getTranslation(cha) }}: </label>
        <input
          :id="cha.characteristic.uuid"
          v-model="cha.formattedValue"
          class="input-field"
          :type="getTypeFromPresentationFormat(cha.presentationFormatDescriptor)"
          :step="getStepByFormatDescriptor(cha.presentationFormatDescriptor)"
          @input="handleInputChange()"
        >
      </div>

      <div
        v-if="buzzer_volume && buzzer_volume.formattedValue === 0
          && simulator_value && simulator_value.formattedValue !== 0.0"
        text-red-600
      >
        {{ t('sett.sim-label3') }}
      </div>
    </div>

    <!-- Таблица для массивов настроек -->

    <div v-if="cha_in_table.length >= 4" flex flex-1 justify-center p-4 text-center>
      <div
        v-for="cha in chas
          .filter(c => c.presentationFormatDescriptor
            && c.presentationFormatDescriptor.format === 0x1B)
          .sort((a, b) => a.presentationFormatDescriptor.format - b.presentationFormatDescriptor.format)" :key="cha.characteristic.uuid"
      >
        <div>{{ t(`sett.${cha.characteristic.uuid}`) }}</div>
        <div v-for="(value, index) in cha.formattedValue" :key="index">
          <input
            :id="`${cha.characteristic.uuid}-${index}`"
            v-model="cha.formattedValue[index]"
            class="input-field"
            type="number"
            :step="getStepByUUID(cha.characteristic.uuid)"
            @input="handleInputChange()"
          >
        </div>
      </div>
    </div>
    <div v-if="cha_in_table.length >= 4" flex flex-1 justify-center>
      <TheCurves
        ref="theCurvesRef" :cha="chas"
      />
    </div>
  </div>

  <div v-if="cha_in_table.length >= 4" text-center>
    <button m-2 btn @click="resetToDefault">
      {{ t('sett.def') }}
    </button>
    <button m-2 btn @click="resetToLog2">
      {{ t('sett.log') }}
    </button>
    <button m-2 btn @click="resetToLin2">
      {{ t('sett.lin') }}
    </button>
  </div>

  <div text-center>
    <button :disabled="!tableChanged" m-2 btn :class="{ disabled: !tableChanged }" @click="updateCharacteristic">
      {{ t('sett.apply') }}
    </button>
    <button m-2 btn @click="downloadJson">
      {{ t('sett.download') }}
    </button>
    <label m-2 btn>{{ t('sett.upload') }}
      <input ref="fileUploadInput" type="file" accept=".json" style="display: none" @change="uploadJson">
    </label>
  </div>
</template>

<style>
.responsive-table th,
.responsive-table td {
  padding: 1px;
  border: 1px solid #ddd;
  text-align: center;
}

/* CSS для ограничения ширины элементов input */
.input-field {
  max-width: 8ch; /* Установите максимальную ширину по вашему усмотрению */
}
</style>
