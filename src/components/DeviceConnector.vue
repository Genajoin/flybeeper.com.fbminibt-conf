<template>
  <div>
<!--    <button @click="connectToDevice" :disabled="isConnecting || isConnected">Connect</button>-->
<!--    <button @click="disconnectDevice" :disabled="isDisconnecting || !isConnected">Disconnect</button>-->
    <!-- Проверка наличия модуля Bluetooth -->
    <div v-if="!bleAvailable">
      <p>Your device not support Bluetooth.</p>
      <p>To use certain features, you may need a Bluetooth enabled device.</p>
    </div>
    <div v-else>
    <a @click="connectToDevice" :disabled="isConnecting || isConnected" class="button-link" :class="{ 'disabled': isConnecting || isConnected }">Connect</a>
    <a @click="disconnectDevice"
       :disabled="isDisconnecting || !isConnected"
       class="button-link red"
       :class="{ 'disabled': isDisconnecting || !isConnected }"
    >
      Disconnect
    </a>
    <p v-if="isConnecting">Connecting...</p>
    <p v-if="isDisconnecting">Disconnecting...</p>
    <p v-if="isConnected">Device {{devName}} is connected. Battery level {{battLevel}}%.</p>
    <div v-if="isConnected && lastVer">FW ver: {{firmwareRevision}} (last FW is <a href="/update">{{lastVer.version}}</a>)</div>
    <p v-else>Device is disconnected.</p>
    <CharacteristicForm v-if="isConnected" @updateCharacteristic="handleCharacteristicUpdate"
                        :fbSettings="fbSettings"
                        :defaultSettings="defaultSettings"
                        :log2Settings="log2Settings"
                        :lin2Settings="lin2Settings"
                        :firmwareRevision="firmwareRevision"
    />
    <!-- Компонент с ползунком для Simulate Vario -->
    <div v-if="isConnected">
      <label for="simulateVario">Simulate Vario: </label>
      <input
          type="number"
          :min="-2000"
          :max="2000"
          :step="10"
          v-model="simulateVario"
      /> cm/s. 0 - simulation off. <div v-if="isVolumeOff && simulateVario" class="redMarked">Please set volume more than 1 to hear the simulation.</div>
    </div>
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
  feature_bits: 110,
};
const defaultConf =         {
  buzzer_volume: 1,
  climb_tone_on_threshold_cm: 20,
  climb_tone_off_threshold_cm: 30,
  sink_tone_on_threshold_cm:-250,
  sink_tone_off_threshold_cm:-270,
  buzzer_vario_dots: [-2000, -1200, -300, -20, 0, 20, 100, 200, 300, 450, 1200, 2000],
  buzzer_frequency_dots: [200, 280, 370, 398, 400, 472, 760, 1120, 1480, 2020, 4720, 6000],
  buzzer_cycle_dots: [850, 750, 725, 748, 664, 596, 428, 323, 264, 211, 122, 100],
  buzzer_duty_dots: [100, 90, 41, 53, 40, 41, 43, 46, 49, 54, 78, 90],
  buzzer_simulate_vario_value:0,
  uart_protocols:1,
  silent_on_ground:false,
  ble_never_sleep:false,
  led_blinky_by_vario:false,
  hid_keyboard_off:false,
};
const log2Conf =         {
  buzzer_volume: 1,
  climb_tone_on_threshold_cm: 20,
  climb_tone_off_threshold_cm: 30,
  sink_tone_on_threshold_cm:-250,
  sink_tone_off_threshold_cm:-270,
  buzzer_vario_dots: [-1200, -300, -51, -50, 0, 10, 100, 250, 425, 600, 800, 1000],
  buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 920, 1380, 1600, 1780, 1880, 2000],
  buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 552, 483, 412, 322, 241, 150],
  buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
  buzzer_simulate_vario_value:0,
  uart_protocols:1,
  silent_on_ground:false,
  ble_never_sleep:false,
  led_blinky_by_vario:false,
  hid_keyboard_off:false,
};
const lin2Conf =         {
  buzzer_volume: 1,
  climb_tone_on_threshold_cm: 20,
  climb_tone_off_threshold_cm: 30,
  sink_tone_on_threshold_cm:-250,
  sink_tone_off_threshold_cm:-270,
  buzzer_vario_dots: [-1000, -300, -51, -50, 0, 10, 116, 267, 424, 600, 800, 1000],
  buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 550, 763, 985, 1234, 1517, 2000],
  buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 552, 483, 412, 322, 241, 150],
  buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
  buzzer_simulate_vario_value:0,
  uart_protocols:1,
  silent_on_ground:false,
  ble_never_sleep:false,
  led_blinky_by_vario:false,
  hid_keyboard_off:false,
};

export default {
  data() {
    return {
      device: null,
      settService: null,
      battService:null,
      devInfoService: null,
      settCharacteristic: null,
      simuCharacteristic:null,
      isConnecting: false,
      isDisconnecting: false,
      isConnected: false,
      fbSettings: null,
      defaultSettings: null,
      log2Settings: null,
      lin2Settings: null,
      simulateVarioTimeout: null,
      simulateInProgress: false,
      simulateVario: 0, // Значение Simulate Vario
      battLevel: 101,
      firmwareRevision: '',
      devName: '',
      lastVer: null,
      bleAvailable: "bluetooth" in navigator,
      silentOnGround: false,
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
  async beforeMount() {
    try {
      const response = await fetch('/download/update.conf');

      if (!response.ok) {
        throw new Error('Не удалось загрузить JSON-файл');
      }
      const jsonData = await response.json();

      this.lastVer = this.findLatestVersion(jsonData);

    } catch (error) {
      console.error('Ошибка при загрузке JSON-файла:', error);
    }
  },
  watch:{
    simulateVario(newValue) {
      // Обработчик изменения значения Simulate Vario
      if (this.simulateInProgress) return;
      this.simulateInProgress = true;
      const delay = 300; // Миллисекунды
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
    findLatestVersion(dataArray) {
      let latestVersion = null;

      dataArray.forEach((item) => {
        const verFloat = parseFloat(item.version);
        const version = isNaN(verFloat) ? 0 : verFloat;
        if ( !latestVersion || (version > latestVersion.version)) {
          latestVersion = item;
          latestVersion.version = version;
        }
      });

      return latestVersion;
    },
    async connectToDevice() {
      if (this.isConnected || this.isConnecting) {
        return;
      }
      try {
        this.isConnecting = true;
        this.device = await navigator.bluetooth.requestDevice({
          filters: [{ name: 'FBminiBT' }],
          optionalServices: ['904baf04-5814-11ee-8c99-0242ac120000', 'battery_service', 'device_information']
        });
        this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
        await this.device.gatt.connect();
        this.devName = this.device.name;
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

        this.battService = await this.device.gatt.getPrimaryService('battery_service');
        const battCharacteristic = await this.battService.getCharacteristic(0x2a19);
        const value = await battCharacteristic.readValue();
        this.battLevel = value.getUint8(0);

        this.devInfoService = await this.device.gatt.getPrimaryService('device_information');
        const devInfoFirmwareRevisionCharacteristic = await  this.devInfoService.getCharacteristic(0x2a26);
        const revisionValue = await devInfoFirmwareRevisionCharacteristic.readValue();
        let enc = new TextDecoder("utf-8");
        this.firmwareRevision = enc.decode(revisionValue.buffer);

        await this.parseData(data);
      } catch (error) {
        console.error('Error reading characteristic data:', error);
      }
    },
    async writeCharacteristicData() {
      try {
        if (this.settCharacteristic) {
          const bufferSize = this.firmwareRevision > '0.13' ? 111 : 110;
          // Создайте новый ArrayBuffer для записи данных
          const buffer = new ArrayBuffer(bufferSize); // Размер буфера зависит от структуры fb_settings

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

          if (this.firmwareRevision > '0.13') {
            const feature_bits = this.fbSettings.silent_on_ground
                | this.fbSettings.ble_never_sleep << 1
                | this.fbSettings.led_blinky_by_vario << 2
                | this.fbSettings.hid_keyboard_off << 3;
            view.setUint8(indexes.feature_bits, feature_bits);
          }

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

        const feature_bits = this.firmwareRevision > '0.13' ? data.getUint8(indexes.feature_bits) : 0;

        const silent_on_ground = feature_bits ? (feature_bits & 0b1) > 0 : false;
        const ble_never_sleep = feature_bits ? (feature_bits & 0b10) > 0 : false;
        const led_blinky_by_vario = feature_bits ? (feature_bits & 0b100) > 0 : false;
        const hid_keyboard_off = feature_bits ? (feature_bits & 0b1000) > 0 : false;

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
          silent_on_ground,
          ble_never_sleep,
          led_blinky_by_vario,
          hid_keyboard_off,
        };

        this.fbSettings = fbSettings;
        this.defaultSettings = defaultConf;
        this.log2Settings = log2Conf;
        this.lin2Settings = lin2Conf;
        console.log('Parsed Data:', this.fbSettings);
      } catch (error) {
        console.error('Error parsing characteristic data:', error);
      }
    },
  },
};
</script>


<style scoped>
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

.button-link.red {
  background-color: red;
}

.button-link.disabled {
  cursor: not-allowed;
  background-color: grey;
  opacity: 0.6;
}

.redMarked {
  color: red;
}
</style>
