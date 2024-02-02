<script setup>
import cloneDeep from 'lodash/cloneDeep'

const bt = useBluetoothStore()
const { t } = useI18n()

const defaultConf = {
  buzzer_vario_dots: [-1400, -800, -100, 0, 5, 20, 100, 200, 300, 450, 1200, 2000],
  buzzer_frequency_dots: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
  buzzer_cycle_dots: [850, 790, 725, 750, 665, 595, 430, 325, 265, 210, 120, 100],
  buzzer_duty_dots: [100, 98, 95, 38, 40, 41, 43, 46, 49, 54, 78, 90],
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

const firmwareRevision = computed(() => {
  return (bt.dis.firmwareRevisionString) ? bt.dis.firmwareRevisionString.value : '0.0'
})

const formValues = ref(cloneDeep(bt.settings))
const originalValues = ref(cloneDeep(bt.settings))
const tableChanged = ref(false)
const simulateVario = ref(0)

let simulateVarioTimeout = null
let simulateInProgress = false

watch(() => bt.settings, (newSettings) => {
  originalValues.value = cloneDeep(newSettings)
  formValues.value = cloneDeep(newSettings)
  tableChanged.value = false
}, { deep: true })

const theCurvesRef = ref()

watch(() => formValues, () => {
  theCurvesRef.value.updateCurves(formValues.value)
  tableChanged.value = JSON.stringify(formValues.value) !== JSON.stringify(originalValues.value)
}, { deep: true })

// Обработчик изменения значения Simulate Vario
watch(simulateVario, (newValue) => {
  if (!simulateInProgress || !newValue) {
    simulateInProgress = true
    if (simulateVarioTimeout)
      clearTimeout(simulateVarioTimeout)

    const delay = 300 // Миллисекунды
    // Отправляем значение на устройство после задержки
    simulateVarioTimeout = setTimeout(async () => {
      await bt.SendSimulationVarioValue(newValue)
      simulateInProgress = false
    }, delay)
  }
})

async function updateCharacteristic() {
  // await bt.writeMiniBtSettings(formValues.value)
  for (const characteristic of bt.bleCharacteristics.filter(c => c.characteristic.service.uuid === '904baf04-5814-11ee-8c99-0242ac120000'))
    await characteristic.setFormattedValue()
}

function resetToDefault() {
  formValues.value.curves = cloneDeep(defaultConf)
}

function resetToLog2() {
  formValues.value.curves = cloneDeep(log2Conf)
}

function resetToLin2() {
  formValues.value.curves = cloneDeep(lin2Conf)
}

// Функция для скачивания JSON
function downloadJson() {
  const jsonString = JSON.stringify(formValues.value)
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
      formValues.value = JSON.parse(e.target.result)
    }
    reader.readAsText(file)
    fileUploadInput.value.value = ''
  }
}
// const settings = ref()

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
function getHeaderbyUUID(uuid) {
  switch (uuid) {
    case '8c090502-81c4-4d29-8d10-6db20607ace9':
      return 'Freq'
    case '9c3b62c0-e227-4f1a-8342-7e647015555d':
      return 'Cycle'
    case '98c16914-00ad-47ba-b625-148f0baaec47':
      return 'Duty'
    case '512d6d89-7a6f-461c-983e-902b68d40f56':
      return 'Vario'
    default:
      return 'undef'
  }
}
</script>

<template>
  <template v-if="formValues !== {}">
    <div m-auto max-w-320 flex flex-wrap justify-center>
      <div max-w-full min-w-340px flex-1 text-right>
        <!--        <template v-if="firmwareRevision >= '0.151'"> -->
        <div
          v-for="cha in bt.bleCharacteristics
            .filter(c => c.characteristic.service.uuid === '904baf04-5814-11ee-8c99-0242ac120000')
            .filter(c =>
              c.presentationFormatDescriptor
              && c.presentationFormatDescriptor.format > 0
              && c.presentationFormatDescriptor.format !== 0x1B)
            .sort((a, b) => a.presentationFormatDescriptor.format - b.presentationFormatDescriptor.format)"
          :key="cha.characteristic.uuid"
        >
          <label :for="cha.characteristic.uuid">{{ cha.userFormatDescriptor }}: </label>
          <input
            :id="cha.characteristic.uuid"
            v-model="cha.formattedValue"
            class="input-field"
            :type="getTypeFromPresentationFormat(cha.presentationFormatDescriptor)"
          >
        </div>
        <!--        </template> -->
        <template v-if="firmwareRevision < '0.15'">
          <div v-if="firmwareRevision >= '0.14'">
            <label for="silentOnGround">{{ t('sett.silent') }}: </label>
            <input
              id="silentOnGround"
              v-model="formValues.silent_on_ground"
              type="checkbox"
            >
          </div>
          <div v-if="firmwareRevision > '0.99'">
            <label for="ble_never_sleep">{{ t('sett.bt-never-sleep') }}: </label>
            <input
              id="ble_never_sleep"
              v-model="formValues.ble_never_sleep"
              type="checkbox"
            >
          </div>
          <div v-if="firmwareRevision >= '0.14'">
            <label for="led_blinky_by_vario">{{ t('sett.led-vario') }}: </label>
            <input
              id="led_blinky_by_vario"
              v-model="formValues.led_blinky_by_vario"
              type="checkbox"
            >
          </div>
          <div v-if="firmwareRevision >= '0.15'">
            <label for="hid_keyboard_off">{{ t('sett.hid-off') }}: </label>
            <input
              id="hid_keyboard_off"
              v-model="formValues.hid_keyboard_off"
              type="checkbox"
            >
            <label v-if="originalValues.hid_keyboard_off !== formValues.hid_keyboard_off" for="hid_keyboard_off" pl-2 text-red-600> {{ t('sett.restart-device') }}</label>
          </div>
          <div>
            <!-- Выпадающий список для uart_protocols -->
            <div>
              <label for="uartProtocols">{{ t('sett.uart') }}: </label>
              <select id="uartProtocols" v-model="formValues.uart_protocols">
                <option value="0">
                  Nothing
                </option>
                <option value="1">
                  PRS
                </option>
                <option value="2">
                  POV
                </option>
              </select>
            </div>
            <label for="buzzerVolume">{{ t('sett.buzz-vol') }}: </label>
            <input
              id="buzzerVolume"
              v-model="formValues.buzzer_volume"
              class="input-field"
              type="number"
              min="0"
              max="3"
            >
          </div>
          <div>
            <label for="climbToneOnThresholdCm">{{ t('sett.climb-on') }}: </label>
            <input
              id="climbToneOnThresholdCm"
              v-model="formValues.climb_tone_on_threshold_cm"
              class="input-field"
              type="number"
              min="-2000"
              max="2000"
              step="5"
            >
          </div>
          <div>
            <label for="climbToneOffThresholdCm">{{ t('sett.climb-off') }}: </label>
            <input
              id="climbToneOffThresholdCm"
              v-model="formValues.climb_tone_off_threshold_cm"
              class="input-field"
              type="number"
              min="-2000"
              max="2000"
              step="5"
            >
          </div>
          <div>
            <label for="sinkToneOnThresholdCm">{{ t('sett.sink-on') }}: </label>
            <input
              id="sinkToneOnThresholdCm"
              v-model="formValues.sink_tone_on_threshold_cm"
              class="input-field"
              type="number"
              min="-2000"
              max="2000"
              step="5"
            >
          </div>
          <div>
            <label for="sinkToneOffThresholdCm">{{ t('sett.sink-off') }}: </label>
            <input
              id="sinkToneOffThresholdCm"
              v-model="formValues.sink_tone_off_threshold_cm"
              class="input-field"
              type="number"
              min="-2000"
              max="2000"
              step="5"
            >
          </div>
        </template>
      </div>
      <!-- Таблица для массивов настроек -->
      <template v-if="firmwareRevision >= '0.15'">
        <div flex flex-1 justify-center p-4 text-center>
          <div
            v-for="cha in bt.bleCharacteristics
              .filter(c => c.characteristic.service.uuid === '904baf04-5814-11ee-8c99-0242ac120000')
              .filter(c => c.presentationFormatDescriptor
                && c.presentationFormatDescriptor.format === 0x1B)
              .sort((a, b) => a.presentationFormatDescriptor.format - b.presentationFormatDescriptor.format)" :key="cha.characteristic.uuid"
          >
            <div>{{ getHeaderbyUUID(cha.characteristic.uuid) }}</div>
            <div v-for="(value, index) in cha.formattedValue" :key="index">
              <input
                :id="`${cha.characteristic.uuid}-${index}`"
                v-model="cha.formattedValue[index]"
                class="input-field"
                type="number"
                step="5"
              >
            </div>
          </div>
        </div>
        <div flex flex-1 justify-center>
          <TheCurves ref="theCurvesRef" :settings="formValues" />
        </div>
      </template>
      <template v-else-if="formValues.curves !== {}">
        <div flex flex-1 justify-center>
          <table>
            <thead>
              <tr>
                <th>{{ t('sett.vario') }}</th>
                <th>{{ t('sett.freq') }}</th>
                <th>{{ t('sett.cycle') }}</th>
                <th>{{ t('sett.duty') }}</th>
              </tr>
            </thead>
            <tbody>
              <!-- Массив buzzer_vario_dots -->
              <tr v-for="(value, index) in formValues.curves.buzzer_vario_dots" :key="index">
                <td>
                  <input
                    v-model="formValues.curves.buzzer_vario_dots[index]"
                    class="input-field"
                    type="number"
                    min="-2000"
                    max="2000"
                    step="5"
                  >
                </td>
                <!-- Массив buzzer_frequency_dots -->
                <td>
                  <input
                    v-model="formValues.curves.buzzer_frequency_dots[index]"
                    class="input-field"
                    type="number"
                    min="100"
                    max="6000"
                    step="5"
                  >
                </td>
                <!-- Массив buzzer_cycle_dots -->
                <td>
                  <input
                    v-model="formValues.curves.buzzer_cycle_dots[index]"
                    class="input-field"
                    type="number"
                    min="100"
                    max="1000"
                    step="5"
                  >
                </td>
                <!-- Массив buzzer_duty_dots -->
                <td>
                  <input
                    v-model="formValues.curves.buzzer_duty_dots[index]"
                    class="input-field"
                    type="number"
                    min="2"
                    max="100"
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div flex flex-1 justify-center>
          <TheCurves ref="theCurvesRef" :settings="formValues" />
        </div>
      </template>
    </div>
    <div text-center>
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

    <div flex justify-center p-4 text-center>
      <label for="simulate_vario" pr-2>{{ t('sett.sim-label1') }}: </label>
      <input
        id="simulate_vario"
        v-model="simulateVario"
        type="number"
        :min="-2000"
        :max="2000"
        :step="10"
      >
      <div :class="{ 'text-red-600': simulateVario === 0 }">
        {{ t('sett.sim-label2') }}
      </div>
    </div>
    <div v-if="bt.settings.buzzer_volume === 0 && simulateVario" text-red-600>
      {{ t('sett.sim-label3') }}
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
</template>

<style>
#canvasContainer {
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* CSS для адаптивной таблицы */
.table-container {
  overflow-x: auto;
}

.responsive-table {
  display: flex;
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  justify-content: center;
}

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

.button-link {
  background-color: green;
  color: white;
  cursor: pointer;
  padding: 10px 20px;
  margin-right: 10px;
  text-decoration: none;
  display: inline-block;
  border-radius: 5px;
  margin-top: 10px;
  transition: background-color 0.3s ease;
}

.button-link.disabled {
  cursor: not-allowed;
  background-color: grey;
  opacity: 0.6;
}
</style>
