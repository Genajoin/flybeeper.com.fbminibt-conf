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
    <!-- Добавьте аналогичные инпуты для остальных параметров -->
    <button @click="updateCharacteristic" :disabled="!hasUnsavedChanges">Apply</button>
  </form>
</template>

<script>
export default {
  props: {
    fbSettings: Object,
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
    // Рекурсивная функция для проверки наличия несохраненных изменений
    hasUnsavedChangesRec(obj1, obj2) {
      for (const key in obj1) {
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
          // Если ключ представляет объект в обоих объектах, вызываем рекурсивную проверку
          if (this.hasUnsavedChangesRec(obj1[key], obj2[key])) {
            return true;
          }
        } else if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
          // Если ключ представляет массив в обоих объектах, сравниваем массивы
          if (!this.arraysAreEqual(obj1[key], obj2[key])) {
            return true;
          }
        } else if (obj1[key] !== obj2[key]) {
          // В противном случае, сравниваем значения
          return true;
        }
      }
      return false;
    },

    // Функция для сравнения массивов
    arraysAreEqual(arr1, arr2) {
      if (arr1.length !== arr2.length) {
        return false;
      }
      for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
          return false;
        }
      }
      return true;
    },
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
</style>