import { defineStore } from 'pinia'

interface BtCh {
  characteristic: object | null
  value: number | string | null
}

interface iESS {
  temperature: BtCh
  pressure: BtCh
}

interface iLNS {
  tas: BtCh
  ias: BtCh
}

interface iDIS {
  modelNumberString: BtCh
  manufacturerNameString: BtCh
  firmwareRevisionString: BtCh
}

interface iBAS {
  batteryLevel: BtCh
}

interface iAIOS {
  digital: BtCh
}

interface iVarioCurves {
  buzzer_vario_dots
  buzzer_frequency_dots
  buzzer_cycle_dots
  buzzer_duty_dots
}

interface iFbMiniBtSettings {
  buzzer_volume: number
  climb_tone_on_threshold_cm: number
  climb_tone_off_threshold_cm: number
  sink_tone_off_threshold_cm: number
  sink_tone_on_threshold_cm: number
  curves: iVarioCurves
  buzzer_simulate_vario_value: number
  uart_protocols: number
  silent_on_ground: boolean
  ble_never_sleep: boolean
  led_blinky_by_vario: boolean
  hid_keyboard_off: boolean
}

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
}

export const useBluetoothStore = defineStore('bluetoothStore', {
  state: () => ({
    bleAvailable: 'bluetooth' in navigator,
    device: null,
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    devName: '',

    settings: {} as iFbMiniBtSettings,

    ess: { temperature: { characteristic: null, value: null }, pressure: { characteristic: null, value: null } } as iESS,
    lns: { tas: { characteristic: null, value: null }, ias: { characteristic: null, value: null } } as iLNS,
    aios: { digital: { characteristic: null, value: null } } as iAIOS,
    bas: { batteryLevel: { characteristic: null, value: null } } as iBAS,
    dis: {
      modelNumberString: { characteristic: null, value: null },
      manufacturerNameString: { characteristic: null, value: null },
      firmwareRevisionString: { characteristic: null, value: null },
    } as iDIS,
    fss: {
      miniBtSettings: { characteristic: null, value: null } as BtCh,
      miniBtSimulation: { characteristic: null, value: null } as BtCh,
    },
  }),
  actions: {
    async toggleConnectionBT() {
      if (this.isConnected && !this.isDisconnecting)
        await this.disconnectDevice()
      else if (!this.isConnected || this.isDisconnecting)
        await this.connectToDevice()
    },
    async connectToDevice() {
      if (!this.bleAvailable || this.isConnected || this.isConnecting)
        return
      if (!('bluetooth' in navigator))
        return
      try {
        this.isConnecting = true

        this.device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: 'FB' }],
          optionalServices: [
            'location_and_navigation',
            'environmental_sensing',
            'battery_service',
            'device_information',
            '904baf04-5814-11ee-8c99-0242ac120000',
          ],
        })
        this.device.addEventListener('gattserverdisconnected', this.onDisconnected)
        const server = await this.device.gatt.connect()
        this.devName = this.device.name

        // Получение списка сервисов
        const services = await server.getPrimaryServices()

        // Поиск нужных сервисов по UUID
        const BAS = services.find(service => service.uuid === '0000180f-0000-1000-8000-00805f9b34fb') // battery_service
        const DIS = services.find(service => service.uuid === '0000180a-0000-1000-8000-00805f9b34fb') // device_information
        const ESS = services.find(service => service.uuid === '0000181a-0000-1000-8000-00805f9b34fb') // environmental_sensing
        const LNS = services.find(service => service.uuid === '00001819-0000-1000-8000-00805f9b34fb') // location_and_navigation
        const FSS = services.find(service => service.uuid === '904baf04-5814-11ee-8c99-0242ac120000') // FlyBeeper settings service

        // Чтение данных после успешного подключения

        // Battery Service
        if (BAS) {
          const characteristics = await BAS.getCharacteristics()
          this.bas.batteryLevel.characteristic = characteristics.find(ch => ch.uuid === '00002a19-0000-1000-8000-00805f9b34fb')
          if (this.bas.batteryLevel.characteristic) {
            const value = await this.bas.batteryLevel.characteristic.readValue()
            this.bas.batteryLevel.value = value.getUint8(0)
          }
        }

        // Device Information Service
        if (DIS) {
          const characteristics = await DIS.getCharacteristics()

          this.dis.firmwareRevisionString.characteristic = characteristics.find(ch => ch.uuid === '00002a26-0000-1000-8000-00805f9b34fb')
          if (this.dis.firmwareRevisionString.characteristic) {
            const val = await this.dis.firmwareRevisionString.characteristic.readValue()
            const enc = new TextDecoder('utf-8')
            this.dis.firmwareRevisionString.value = enc.decode(val.buffer)
          }

          this.dis.modelNumberString.characteristic = characteristics.find(ch => ch.uuid === '00002a24-0000-1000-8000-00805f9b34fb')
          if (this.dis.modelNumberString.characteristic) {
            const val = await this.dis.modelNumberString.characteristic.readValue()
            const enc = new TextDecoder('utf-8')
            this.dis.modelNumberString.value = enc.decode(val.buffer)
          }

          this.dis.manufacturerNameString.characteristic = characteristics.find(ch => ch.uuid === '00002a29-0000-1000-8000-00805f9b34fb')
          if (this.dis.manufacturerNameString.characteristic) {
            const val = await this.dis.manufacturerNameString.characteristic.readValue()
            const enc = new TextDecoder('utf-8')
            this.dis.manufacturerNameString.value = enc.decode(val.buffer)
          }
        }

        // FlyBeeper settings service
        if (FSS) {
          const characteristics = await FSS.getCharacteristics()
          this.fss.miniBtSettings.characteristic = characteristics.find(ch => ch.uuid === '904baf04-5814-11ee-8c99-0242ac120001')
          this.fss.miniBtSimulation.characteristic = characteristics.find(ch => ch.uuid === '904baf04-5814-11ee-8c99-0242ac120002')
          await this.readSettings()
        }

        // Environmental Sensing Service
        if (ESS) {
          const characteristics = await ESS.getCharacteristics()

          this.ess.pressure.characteristic = characteristics.find(ch => ch.uuid === '00002a6d-0000-1000-8000-00805f9b34fb') // pressure
          if (this.ess.pressure.characteristic) {
            await this.ess.pressure.characteristic.startNotifications()
            this.ess.pressure.characteristic.addEventListener('characteristicvaluechanged', this.handlePressureNotifications)
          }

          this.ess.temperature.characteristic = characteristics.find(ch => ch.uuid === '00002a6e-0000-1000-8000-00805f9b34fb') // temperature
          if (this.ess.temperature.characteristic) {
            await this.ess.temperature.characteristic.startNotifications()
            this.ess.temperature.characteristic.addEventListener('characteristicvaluechanged', this.handleTemperatureNotifications)
          }
        }

        // Location and Navigation Service
        if (LNS) {
          const characteristics = await LNS.getCharacteristics()

          this.lns.tas.characteristic = characteristics.find(ch => ch.uuid === '234337bf-f931-4d2d-a13c-07e2f06a0249')
          if (this.lns.tas.characteristic) {
            await this.lns.tas.characteristic.startNotifications()
            this.lns.tas.characteristic.addEventListener('characteristicvaluechanged', this.handleTasNotifications)
          }

          this.lns.ias.characteristic = characteristics.find(ch => ch.uuid === '234337bf-f931-4d2d-a13c-07e2f06a0248')
          if (this.lns.ias.characteristic) {
            await this.lns.ias.characteristic.startNotifications()
            this.lns.ias.characteristic.addEventListener('characteristicvaluechanged', this.handleIasNotifications)
          }
        }
        this.isConnected = true
        this.isConnecting = false
      }
      catch (error) {
        // console.error('Error connecting to the device:', error);
        this.isConnecting = false
      }
    },
    async disconnectDevice() {
      if (!this.isConnected || this.isDisconnecting)
        return

      if (this.ess.pressure.characteristic) {
        try {
          await this.ess.pressure.characteristic.stopNotifications()
          this.ess.pressure.characteristic.removeEventListener('characteristicvaluechanged', this.handlePressureNotifications)
        }
        catch (error) {
          // console.log(`Argh! ${error}`)
        }
      }
      if (this.ess.temperature.characteristic) {
        try {
          await this.ess.temperature.characteristic.stopNotifications()
          this.ess.temperature.characteristic.removeEventListener('characteristicvaluechanged', this.handleTemperatureNotifications)
        }
        catch (error) {
          // console.log(`Argh! ${error}`)
        }
      }
      if (this.lns.tas.characteristic) {
        try {
          await this.lns.tas.characteristic.stopNotifications()
          this.lns.tas.characteristic.removeEventListener('characteristicvaluechanged', this.handleTasNotifications)
        }
        catch (error) {
          // console.log(`Argh! ${error}`)
        }
      }
      if (this.lns.ias.characteristic) {
        try {
          await this.lns.ias.characteristic.stopNotifications()
          this.lns.ias.characteristic.removeEventListener('characteristicvaluechanged', this.handleIasNotifications)
        }
        catch (error) {
          // console.log(`Argh! ${error}`)
        }
      }
      try {
        this.isDisconnecting = true
        await this.device.gatt.disconnect()
        this.isConnected = false
        this.isDisconnecting = false
      }
      catch (error) {
        // console.error('Error disconnecting from the device:', error)
        this.isDisconnecting = false
      }
    },
    onDisconnected() {
      // Обработка отключения
      this.isConnected = false
      this.isDisconnecting = false
      this.device = null

      this.lns.tas = { characteristic: null, value: null }
      this.lns.ias = { characteristic: null, value: null }
      this.ess.pressure = { characteristic: null, value: null }
      this.ess.temperature = { characteristic: null, value: null }
      this.bas.batteryLevel = { characteristic: null, value: null }
      this.dis.firmwareRevisionString = { characteristic: null, value: null }
      this.fss.miniBtSettings = { characteristic: null, value: null }
      this.fss.miniBtSimulation = { characteristic: null, value: null }
      this.settings = {} as iFbMiniBtSettings
    },
    handlePressureNotifications(event) {
      const value = event.target.value
      const p = value.getUint32(0, true)
      this.ess.pressure.value = p / 10
    },
    handleTemperatureNotifications(event) {
      this.ess.temperature.value = event.target.value.getInt16(0, true) / 100
    },
    handleTasNotifications(event) {
      this.lns.tas.value = event.target.value.getInt16(0, true) / 10
    },
    handleIasNotifications(event) {
      this.lns.ias.value = event.target.value.getInt16(0, true) / 10
    },
    getEAS(v, p, t): null | number {
      if (v == null || p == null || t == null)
        return null
      const M = 0.02895
      const T = 273.15 + t
      const rho = M * p / 8.31447 / T
      const phi = rho / 1.225
      return ((v * Math.sqrt(phi) * 10) | 0) / 10
    },

    async readSettings() {
      if (!this.dis.manufacturerNameString.characteristic && this.dis.manufacturerNameString.value !== 'FlyBeeper')
        return
      if (!this.dis.modelNumberString.characteristic && !this.dis.modelNumberString.value)
        return
      switch (this.dis.modelNumberString.value) {
        case 'FBminiBT':
          await this.readMiniBtSettings()
          break
        case 'FbTAS':
          break
        case 'FbPs1':
          break
        case 'FbRc4':
          break
      }
    },

    async readMiniBtSettings() {
      if (!this.fss.miniBtSettings.characteristic)
        return
      const data = await this.fss.miniBtSettings.characteristic.readValue()

      // Распарсите каждое значение
      const buzzer_volume = data.getInt16(indexes.buzzer_volume, true)
      const climb_tone_on_threshold_cm = data.getInt16(indexes.climb_tone_on_threshold_cm, true)
      const climb_tone_off_threshold_cm = data.getInt16(indexes.climb_tone_off_threshold_cm, true)
      const sink_tone_off_threshold_cm = data.getInt16(indexes.sink_tone_off_threshold_cm, true)
      const sink_tone_on_threshold_cm = data.getInt16(indexes.sink_tone_on_threshold_cm, true)

      // Распарсите массивы значений
      const buzzer_vario_dots = []
      const buzzer_frequency_dots = []
      const buzzer_cycle_dots = []
      const buzzer_duty_dots = []

      for (let i = 0; i < 12; i++) {
        buzzer_vario_dots[i] = data.getInt16(indexes.buzzer_vario_dots + i * 2, true)
        buzzer_frequency_dots[i] = data.getInt16(indexes.buzzer_frequency_dots + i * 2, true)
        buzzer_cycle_dots[i] = data.getInt16(indexes.buzzer_cycle_dots + i * 2, true)
        buzzer_duty_dots[i] = data.getInt16(indexes.buzzer_duty_dots + i * 2, true)
      }

      const buzzer_simulate_vario_value = data.getInt16(indexes.buzzer_simulate_vario_value, true)
      const uart_protocols = data.getInt16(indexes.uart_protocols, true)

      const feature_bits = this.dis.firmwareRevisionString.value > '0.13' ? data.getUint8(indexes.feature_bits) : 0

      const silent_on_ground = feature_bits ? (feature_bits & 0b1) > 0 : false
      const ble_never_sleep = feature_bits ? (feature_bits & 0b10) > 0 : false
      const led_blinky_by_vario = feature_bits ? (feature_bits & 0b100) > 0 : false
      const hid_keyboard_off = feature_bits ? (feature_bits & 0b1000) > 0 : false

      const curves = {
        buzzer_vario_dots,
        buzzer_frequency_dots,
        buzzer_cycle_dots,
        buzzer_duty_dots,
      } as iVarioCurves

      // Создайте объект fb_settings
      this.settings = {
        buzzer_volume,
        climb_tone_on_threshold_cm,
        climb_tone_off_threshold_cm,
        sink_tone_off_threshold_cm,
        sink_tone_on_threshold_cm,
        curves,
        buzzer_simulate_vario_value,
        uart_protocols,
        silent_on_ground,
        ble_never_sleep,
        led_blinky_by_vario,
        hid_keyboard_off,
      } as iFbMiniBtSettings
    },

    async writeMiniBtSettings(settings: iFbMiniBtSettings) {
      if (!this.fss.miniBtSettings.characteristic)
        return

      const bufferSize = this.dis.firmwareRevisionString.value > '0.13' ? 111 : 110
      // новый ArrayBuffer для записи данных
      const buffer = new ArrayBuffer(bufferSize) // Размер буфера зависит от структуры fb_settings

      //  DataView для записи данных в буфер
      const view = new DataView(buffer)

      //  буфер данными из fbSettings
      view.setInt16(indexes.buzzer_volume, settings.buzzer_volume, true)
      view.setInt16(indexes.climb_tone_on_threshold_cm, settings.climb_tone_on_threshold_cm, true)
      view.setInt16(indexes.climb_tone_off_threshold_cm, settings.climb_tone_off_threshold_cm, true)
      view.setInt16(indexes.sink_tone_off_threshold_cm, settings.sink_tone_off_threshold_cm, true)
      view.setInt16(indexes.sink_tone_on_threshold_cm, settings.sink_tone_on_threshold_cm, true)
      // заполнять буфер для остальных значений
      for (let i = 0; i < 12; i++) {
        view.setInt16(indexes.buzzer_vario_dots + i * 2, settings.curves.buzzer_vario_dots[i], true)
        view.setInt16(indexes.buzzer_frequency_dots + i * 2, settings.curves.buzzer_frequency_dots[i], true)
        view.setInt16(indexes.buzzer_cycle_dots + i * 2, settings.curves.buzzer_cycle_dots[i], true)
        view.setInt16(indexes.buzzer_duty_dots + i * 2, settings.curves.buzzer_duty_dots[i], true)
      }
      view.setInt16(indexes.buzzer_simulate_vario_value, settings.buzzer_simulate_vario_value, true)
      view.setInt16(indexes.uart_protocols, settings.uart_protocols, true)

      if (this.dis.firmwareRevisionString.value > '0.13') {
        const feature_bits = settings.silent_on_ground
          | this.settings.ble_never_sleep << 1
          | this.settings.led_blinky_by_vario << 2
          | settings.hid_keyboard_off << 3
        view.setUint8(indexes.feature_bits, feature_bits)
      }

      //  буфер в характеристику
      this.fss.miniBtSettings.characteristic.writeValue(buffer)
        .then(() => this.settings = settings)
    },

    async SendSimulationVarioValue(value) {
      if (!this.fss.miniBtSimulation.characteristic)
        return

      const buffer = new ArrayBuffer(2)
      const view = new DataView(buffer)
      view.setInt16(0, value, true)
      this.fss.miniBtSimulation.characteristic.writeValue(buffer)
    },

  },
})

export default useBluetoothStore
