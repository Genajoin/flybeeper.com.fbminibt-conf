<template>
  <div>
    <button @click="connectToDevice" :disabled="isConnecting || isConnected">Connect</button>
    <button @click="disconnectDevice" :disabled="isDisconnecting || !isConnected">Disconnect</button>
    <p v-if="isConnecting">Connecting...</p>
    <p v-if="isDisconnecting">Disconnecting...</p>
    <p v-if="isConnected">Device is connected. Battery level {{battLevel}}%</p>
    <p v-else>Device is disconnected.</p>
    <CharacteristicForm v-if="isConnected" :fbSettings="fbSettings" @updateCharacteristic="handleCharacteristicUpdate" />
    <!-- Компонент с ползунком для Simulate Vario -->
    <div v-if="isConnected">
      <label for="simulateVario">Simulate Vario: </label>
      <input
          type="number"
          :min="-2000"
          :max="2000"
          :step="10"
          v-model="simulateVario"
      /> cm/s. 0 - simulation off. <div v-if="isVolumeOff && simulateVario" class="red">Please set volume more than 1 to hear the simulation.</div>
    </div>
  </div>
</template>

<script>
import CharacteristicForm from "./CharacteristicForm.vue";

// Индекс начала чтения каждого значения в буфере данных
const indexes = {
  buzzer_volume: 0,
  climb_tone_on_threshold_cm: 2,
  climb_tone_off_threshold_cm: 4,
  sink_tone_off_threshold_cm: 6,
  sink_tone_on_threshold_cm: 8,
  buzzer_vario_dots: 10,
  buzzer_frequency_dots: 34,
  buzzer_cycle_dots: 58,
  buzzer_duty_dots: 82,
  buzzer_simulate_vario_value: 106,
  uart_protocols: 108,
};

export default {
  data() {
    return {
      device: null,
      settService: null,
      battService:null,
      settCharacteristic: null,
      simuCharacteristic:null,
      isConnecting: false,
      isDisconnecting: false,
      isConnected: false,
      fbSettings: null,
      simulateVarioTimeout: null,
      simulateInProgress: false,
      simulateVario: 0, // Значение Simulate Vario
      battLevel: 101,

    };
  },
  components: {
    CharacteristicForm,
  },
  computed:{
    isVolumeOff() {
      return (this.fbSettings && this.fbSettings.buzzer_volume === 0);
    }
  },
  watch:{
    simulateVario(newValue) {
      // Обработчик изменения значения Simulate Vario
      if (this.simulateInProgress) return;
      this.simulateInProgress = true;
      const delay = 200; // Миллисекунды
      if (this.simulateVarioTimeout)
        clearTimeout(this.simulateVarioTimeout);

      // Отправляем значение на устройство после задержки
      this.simulateVarioTimeout = setTimeout(async () => {
        await this.SendSimulationVarioValue(newValue);
        this.simulateInProgress = false;
      }, delay);
    }
  },
  methods: {

    async connectToDevice() {
      if (this.isConnected || this.isConnecting) {
        return;
      }
      try {
        this.isConnecting = true;
        this.device = await navigator.bluetooth.requestDevice({
          //filters: [{ services: ['904baf04-5814-11ee-8c99-0242ac120000', 'battery_service'] }],
          filters: [{ name: 'FBminiBT' }],
          optionalServices: ['904baf04-5814-11ee-8c99-0242ac120000', 'battery_service']
          //acceptAllDevices: true,
        });
        this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
        await this.device.gatt.connect();
        // Чтение данных после успешного подключения
        await this.readCharacteristicData();
        this.isConnected = true;
        this.isConnecting = false;
      } catch (error) {
        console.error('Error connecting to the device:', error);
        this.isConnecting = false;
      }
    },
    async disconnectDevice() {
      if (!this.isConnected || this.isDisconnecting) {
        return;
      }
      try {
        this.isDisconnecting = true;
        await this.device.gatt.disconnect();
        this.isConnected = false;
        this.isDisconnecting = false;
      } catch (error) {
        console.error('Error disconnecting from the device:', error);
        this.isDisconnecting = false;
      }
    },
    async onDisconnected() {
      this.isConnected = false;
      this.isDisconnecting = false;
      this.battLevel = 101;
    },
    async readCharacteristicData() {
      try {

        this.settService =  await this.device.gatt.getPrimaryService('904baf04-5814-11ee-8c99-0242ac120000');
        this.settCharacteristic = await this.settService.getCharacteristic('904baf04-5814-11ee-8c99-0242ac120001');
        this.simuCharacteristic = await this.settService.getCharacteristic('904baf04-5814-11ee-8c99-0242ac120002');
        const data = await this.settCharacteristic.readValue();

        this.parseData(data);

        this.battService = await this.device.gatt.getPrimaryService('battery_service');
        const battCharacteristic = await this.battService.getCharacteristic(0x2a19);
        const value = await battCharacteristic.readValue();
        this.battLevel = value.getUint8(0);

      } catch (error) {
        console.error('Error reading characteristic data:', error);
      }
    },
    async writeCharacteristicData() {
      try {
        if (this.settCharacteristic) {
          // Создайте новый ArrayBuffer для записи данных
          const buffer = new ArrayBuffer(110); // Размер буфера зависит от структуры fb_settings

          // Создайте DataView для записи данных в буфер
          const view = new DataView(buffer);

          // Заполните буфер данными из fbSettings
          view.setInt16(indexes.buzzer_volume, this.fbSettings.buzzer_volume,true);
          view.setInt16(indexes.climb_tone_on_threshold_cm, this.fbSettings.climb_tone_on_threshold_cm,true);
          view.setInt16(indexes.climb_tone_off_threshold_cm, this.fbSettings.climb_tone_off_threshold_cm,true);
          view.setInt16(indexes.sink_tone_off_threshold_cm, this.fbSettings.sink_tone_off_threshold_cm,true);
          view.setInt16(indexes.sink_tone_on_threshold_cm, this.fbSettings.sink_tone_on_threshold_cm,true);
          // Продолжайте заполнять буфер для остальных значений
          for (let i = 0; i < 12; i++) {
            view.setInt16(indexes.buzzer_vario_dots + i * 2, this.fbSettings.buzzer_vario_dots[i],true);
            view.setInt16(indexes.buzzer_frequency_dots + i * 2, this.fbSettings.buzzer_frequency_dots[i],true);
            view.setInt16(indexes.buzzer_cycle_dots + i * 2, this.fbSettings.buzzer_cycle_dots[i],true);
            view.setInt16(indexes.buzzer_duty_dots + i * 2, this.fbSettings.buzzer_duty_dots[i],true);
          }
          view.setInt16(indexes.buzzer_simulate_vario_value, this.fbSettings.buzzer_simulate_vario_value,true);
          view.setInt16(indexes.uart_protocols, this.fbSettings.uart_protocols,true);

          // Запишите буфер в характеристику
          await this.settCharacteristic.writeValue(buffer);

          console.log('Data written to characteristic:', this.fbSettings);
        }
      } catch (error) {
        console.error('Error writing characteristic data:', error);
      }
    },
    handleCharacteristicUpdate(updatedValues) {
      // Обработчик для обновления данных из формы
      this.fbSettings = updatedValues;
      // Вызовите метод для записи данных в характеристику
      this.writeCharacteristicData();
    },
    async SendSimulationVarioValue(value) {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      view.setInt16(0, value,true);
      await this.simuCharacteristic.writeValue(buffer);
    },
    async parseData(data) {
      try {
        // для вывода данных в HEX формате
        console.log('Data in HEX:', ...Array.from(new Uint8Array(data.buffer)).map(byte => byte.toString(16).padStart(2, '0')));



        // Распарсите каждое значение
        const buzzer_volume = data.getInt16(indexes.buzzer_volume,true);
        const climb_tone_on_threshold_cm = data.getInt16(indexes.climb_tone_on_threshold_cm,true);
        const climb_tone_off_threshold_cm = data.getInt16(indexes.climb_tone_off_threshold_cm,true);
        const sink_tone_off_threshold_cm = data.getInt16(indexes.sink_tone_off_threshold_cm,true);
        const sink_tone_on_threshold_cm = data.getInt16(indexes.sink_tone_on_threshold_cm,true);

        // Распарсите массивы значений
        const buzzer_vario_dots = [];
        const buzzer_frequency_dots = [];
        const buzzer_cycle_dots = [];
        const buzzer_duty_dots = [];

        for (let i = 0; i < 12; i++) {
          buzzer_vario_dots[i] = data.getInt16(indexes.buzzer_vario_dots + i * 2,true);
          buzzer_frequency_dots[i] = data.getInt16(indexes.buzzer_frequency_dots + i * 2,true);
          buzzer_cycle_dots[i] = data.getInt16(indexes.buzzer_cycle_dots + i * 2,true);
          buzzer_duty_dots[i] = data.getInt16(indexes.buzzer_duty_dots + i * 2,true);
        }

        const buzzer_simulate_vario_value = data.getInt16(indexes.buzzer_simulate_vario_value,true);
        const uart_protocols = data.getInt16(indexes.uart_protocols,true);

        // Создайте объект fb_settings
        const fbSettings = {
          buzzer_volume,
          climb_tone_on_threshold_cm,
          climb_tone_off_threshold_cm,
          sink_tone_off_threshold_cm,
          sink_tone_on_threshold_cm,
          buzzer_vario_dots,
          buzzer_frequency_dots,
          buzzer_cycle_dots,
          buzzer_duty_dots,
          buzzer_simulate_vario_value,
          uart_protocols,
        };

        this.fbSettings = fbSettings;
        console.log('Parsed Data:', this.fbSettings);
      } catch (error) {
        console.error('Error parsing characteristic data:', error);
      }
    },
  },
};
</script>
