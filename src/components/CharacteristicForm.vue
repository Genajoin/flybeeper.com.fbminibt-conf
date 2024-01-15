<script setup>
import cloneDeep from 'lodash/cloneDeep'

const bt = useBluetoothStore()
const { t } = useI18n()

const defaultConf = {
  buzzer_vario_dots: [-2000, -1200, -300, -20, 0, 20, 100, 200, 300, 450, 1200, 2000],
  buzzer_frequency_dots: [200, 280, 370, 398, 400, 472, 760, 1120, 1480, 2020, 4720, 6000],
  buzzer_cycle_dots: [850, 750, 725, 748, 664, 596, 428, 323, 264, 211, 122, 100],
  buzzer_duty_dots: [100, 90, 41, 53, 40, 41, 43, 46, 49, 54, 78, 90],
}

const log2Conf = {
  buzzer_vario_dots: [-1200, -300, -51, -50, 0, 10, 100, 250, 425, 600, 800, 1000],
  buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 920, 1380, 1600, 1780, 1880, 2000],
  buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 552, 483, 412, 322, 241, 150],
  buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
}
const lin2Conf = {
  buzzer_vario_dots: [-1000, -300, -51, -50, 0, 10, 116, 267, 424, 600, 800, 1000],
  buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 550, 763, 985, 1234, 1517, 2000],
  buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 552, 483, 412, 322, 241, 150],
  buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
}

const firmwareRevision = computed(() => {
  return (bt.dis.firmwareRevisionString.characteristic) ? bt.dis.firmwareRevisionString.value : '0.0'
})

const formValues = ref(cloneDeep(bt.settings))
const originalValues = ref(cloneDeep(bt.settings))
const tableChanged = ref(false)
const simulateVario = ref(0)
let simulateVarioTimeout = null
let simulateInProgress = false

// onMounted(() => {
//   if (bt.settings) {
//     return
//   }
//
//   bt.readSettings()
//     // .then(()=>{
//     //   console.log("readSettings")
//     // })
//     // .catch(e=>console.log(e))
// })

watch(() => bt.settings, (newSettings) => {
  // console.log("change ref settings")
  originalValues.value = cloneDeep(newSettings)
  formValues.value = cloneDeep(newSettings)
  tableChanged.value = false
}, { deep: true })

watch(() => formValues, () => {
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
      // console.log("simul")
      simulateInProgress = false
    }, delay)
  }
})

async function updateCharacteristic() {
  await bt.writeMiniBtSettings(formValues.value)
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
</script>

<template>
  <form m-auto text-left prose @submit.prevent="updateCharacteristic">
    <div v-if="formValues !== {} && firmwareRevision > '0.13'">
      <label for="silentOnGround">{{ t('sett.silent') }}: </label>
      <input
        id="silentOnGround"
        v-model="formValues.silent_on_ground"
        type="checkbox"
      >
    </div>
    <div v-if="formValues !== {} && firmwareRevision > '0.99'">
      <label for="ble_never_sleep">{{ t('sett.bt-never-sleep') }}: </label>
      <input
        id="ble_never_sleep"
        v-model="formValues.ble_never_sleep"
        type="checkbox"
      >
    </div>
    <div v-if="formValues !== {} && firmwareRevision > '0.13'">
      <label for="led_blinky_by_vario">{{ t('sett.led-vario') }}: </label>
      <input
        id="led_blinky_by_vario"
        v-model="formValues.led_blinky_by_vario"
        type="checkbox"
      >
    </div>
    <div v-if="formValues !== {} && firmwareRevision > '0.99'">
      <label for="hid_keyboard_off">{{ t('sett.hid-off') }}: </label>
      <input
        id="hid_keyboard_off"
        v-model="formValues.hid_keyboard_off"
        type="checkbox"
      >
    </div>
    <div v-if="formValues !== {}">
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
    <div v-if="formValues !== {}">
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
    <div v-if="formValues !== {}">
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
    <div v-if="formValues !== {}">
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
    <div v-if="formValues !== {}">
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
    <!-- Таблица для массивов настроек -->
    <div v-if="formValues !== {} && formValues.curves !== {}" class="table-container">
      <table class="responsive-table">
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

    <template v-if="formValues !== {}">
      <div p-4>
        <label for="simulateVario">{{ t('sett.sim-label1') }}: </label>
        <input
          v-model="simulateVario"
          type="number"
          :min="-2000"
          :max="2000"
          :step="10"
        > {{ t('sett.sim-label2') }} <div v-if="bt.settings.buzzer_volume === 0 && simulateVario" text-red-600>
          {{ t('sett.sim-label3') }}
        </div>
      </div>

      <button :disabled="!tableChanged" m-2 btn :class="{ disabled: !tableChanged }" @click="updateCharacteristic">
        {{ t('sett.apply') }}
      </button>
      <button m-2 btn @click="resetToDefault">
        {{ t('sett.def') }}
      </button>
      <button m-2 btn @click="resetToLog2">
        {{ t('sett.log') }}
      </button>
      <button m-2 btn @click="resetToLin2">
        {{ t('sett.lin') }}
      </button>
    </template>
  </form>
</template>

<style>
/* CSS для адаптивной таблицы */
.table-container {
  overflow-x: auto;
}

.responsive-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
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
