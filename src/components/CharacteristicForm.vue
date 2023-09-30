<template>
  <form @submit.prevent="updateCharacteristic">
    <div>
      <!-- Выпадающий список для uart_protocols -->
      <div>
        <label for="uartProtocols">UART Protocol: </label>
        <select id="uartProtocols" v-model="formValues.uart_protocols" @change="handleInputChange">
          <option value="0">Nothing</option>
          <option value="1">PRS</option>
          <option value="2">POV</option>
        </select>
      </div>
      <label for="buzzerVolume">Buzzer Volume: </label>
      <input
          id="buzzerVolume"
          v-model="formValues.buzzer_volume"
          class="input-field"
          type="number"
          min="0"
          max="3"
          @input="handleInputChange"
      />
    </div>
    <div>
      <label for="climbToneOnThresholdCm">Climb Tone On Threshold (cm/s): </label>
      <input
          id="climbToneOnThresholdCm"
          v-model="formValues.climb_tone_on_threshold_cm"
          class="input-field"
          type="number"
          min="-2000"
          max="2000"
          step="5"
          @input="handleInputChange"
      />
    </div>
    <div>
      <label for="climbToneOffThresholdCm">Climb Tone Off Threshold (cm/s): </label>
      <input
          id="climbToneOffThresholdCm"
          class="input-field"
          v-model="formValues.climb_tone_off_threshold_cm"
          type="number"
          min="-2000"
          max="2000"
          step="5"
          @input="handleInputChange"
      />
    </div>
    <div>
      <label for="sinkToneOnThresholdCm">Sink Tone On Threshold (cm/s): </label>
      <input
          id="sinkToneOnThresholdCm"
          v-model="formValues.sink_tone_on_threshold_cm"
          class="input-field"
          type="number"
          min="-2000"
          max="2000"
          step="5"
          @input="handleInputChange"
      />
    </div>
    <div>
      <label for="sinkToneOffThresholdCm">Sink Tone Off Threshold (cm/s): </label>
      <input
          id="sinkToneOffThresholdCm"
          v-model="formValues.sink_tone_off_threshold_cm"
          class="input-field"
          type="number"
          min="-2000"
          max="2000"
          step="5"
          @input="handleInputChange"
      />
    </div>
    <!-- Таблица для массивов настроек -->
    <div class="table-container">
      <table class="responsive-table">
        <thead>
        <tr>
          <th>Vario</th>
          <th>Frequency</th>
          <th>Cycle</th>
          <th>Duty</th>
        </tr>
        </thead>
        <tbody>
        <!-- Массив buzzer_vario_dots -->
        <tr v-for="(value, index) in formValues.buzzer_vario_dots" :key="index">
          <td>
            <input
                class="input-field"
                type="number"
                min="-2000"
                max="2000"
                step="5"
                v-model="formValues.buzzer_vario_dots[index]"
                @input="handleTableChange"
            />
          </td>
          <!-- Массив buzzer_frequency_dots -->
          <td>
            <input
                class="input-field"
                type="number"
                min="100"
                max="6000"
                step="5"
                v-model="formValues.buzzer_frequency_dots[index]"
                @input="handleTableChange"
            />
          </td>
          <!-- Массив buzzer_cycle_dots -->
          <td>
            <input
                class="input-field"
                type="number"
                min="100"
                max="1000"
                step="5"
                v-model="formValues.buzzer_cycle_dots[index]"
                @input="handleTableChange"
            />
          </td>
          <!-- Массив buzzer_duty_dots -->
          <td>
            <input
                class="input-field"
                type="number"
                min="2"
                max="100"
                v-model="formValues.buzzer_duty_dots[index]"
                @input="handleTableChange"
            />
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <a @click="updateCharacteristic" :disabled="!hasUnsavedChanges" class="button-link" :class="{ 'disabled': !hasUnsavedChanges }">Apply</a>
    <a @click="resetToDefault"  class="button-link">Default</a>

  </form>
</template>

<script>
import cloneDeep from 'lodash/cloneDeep';

export default {
  props: {
    fbSettings: Object,
    defaultSettings: Object,
  },
  data() {
    return {
      formValues: {...this.fbSettings},
      originalValues: {...this.fbSettings},
      tableChanged: false,
    };
  },
  computed: {
    hasUnsavedChanges() {
      if (!this.formValues || !this.originalValues)
        return false;
      // Проверьте, есть ли несохраненные изменения в форме

      for (const key in this.formValues) {
        if (this.formValues[key] !== this.originalValues[key]) {
          return true;
        }
      }
      return this.tableChanged;
    },
  },
  watch: {
    fbSettings: {
      handler(newSettings) {
        // Обновляем formValues, когда fbSettings меняется
        this.formValues = {...newSettings};
        // Обновляем originalValues для сравнения изменений
        this.originalValues = {...newSettings};
        this.tableChanged = false;
      },
      deep: true, // Необходимо для отслеживания изменений вложенных свойств
    },
  },
  methods: {
    handleTableChange() {
      this.tableChanged = true;
    },
    handleInputChange() {
      // Обработчик изменений в инпутах, вызывается при каждом вводе
      // Здесь вы можете добавить логику, чтобы обновлять this.formValues
    },
    updateCharacteristic() {
      // Вызывается при нажатии на кнопку "Apply"
      // Отправьте уведомление родительскому компоненту
      this.$emit("updateCharacteristic", this.formValues);

      // Обновите оригинальные значения для дальнейшего сравнения
      this.originalValues = {...this.formValues};
    },
    resetToDefault(){
      this.formValues = cloneDeep(this.defaultSettings);
    }
  },
};
</script>

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