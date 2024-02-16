import { defineStore } from 'pinia'
import log from 'loglevel'
import { BleCharacteristicImpl } from '~/utils/BleCharacteristic'

interface BtCh {
  characteristic: object | null
  value: number | string | null
}

interface iDIS {
  modelNumberString: BtCh
  manufacturerNameString: BtCh
  firmwareRevisionString: BtCh
}

interface iVarioCurves {
  buzzer_vario_dots
  buzzer_frequency_dots
  buzzer_cycle_dots
  buzzer_duty_dots
}

export interface iFbMiniBtSettings {
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
    device: null as BluetoothDevice,
    isConnected: false,
    isConnecting: false,
    isFetching: false,
    isDisconnecting: false,
    devName: '',
    characteristicsData: {},
    subscribedCharacteristics: [],
    bleCharacteristics: [] as BleCharacteristicImpl[],
    settings: {} as iFbMiniBtSettings,

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
            'automation_io',
            '904baf04-5814-11ee-8c99-0242ac120000',
          ],
        })
        this.devName = this.device.name
        log.info('Connecting to', this.devName)

        const server = await this.device.gatt.connect()

        // Получение списка сервисов
        const services = await server.getPrimaryServices()
        this.isConnecting = false
        this.isFetching = true
        log.info('fetching')
        // Проход по сервисам
        for (const service of services) {
          log.debug('SERVICE', service.uuid)
          // Получение характеристик сервиса
          const characteristics = await service.getCharacteristics()
          // Проверка, есть ли подписка на изменение для каждой характеристики
          for (const ch of characteristics) {
            log.debug('characteristic', ch.uuid)
            const bleCharacteristic = new BleCharacteristicImpl(ch)
            // await bleCharacteristic.initialize()
            await bleCharacteristic.subscribeToNotifications()
            this.bleCharacteristics.push(bleCharacteristic)
          }
        }

        // Чтение данных после успешного подключения
        this.bleCharacteristics.filter(c => c.characteristic.service.uuid === '0000180a-0000-1000-8000-00805f9b34fb')
          .forEach(ch => ch.presentationFormatDescriptor = { format: 0x19, exponent: 0, unit: '', namespace: 1 })

        // Device Information Service
        const fwRev = this.bleCharacteristics.find(ch => ch.characteristic.uuid === '00002a26-0000-1000-8000-00805f9b34fb')
        if (fwRev)
          this.dis.firmwareRevisionString.value = await fwRev.getFormattedValue()

        const modNum = this.bleCharacteristics.find(ch => ch.characteristic.uuid === '00002a24-0000-1000-8000-00805f9b34fb')
        if (modNum)
          this.dis.modelNumberString.value = await modNum.getFormattedValue()

        const manName = this.bleCharacteristics.find(ch => ch.characteristic.uuid === '00002a29-0000-1000-8000-00805f9b34fb')
        if (manName)
          this.dis.manufacturerNameString.value = await manName.getFormattedValue()

        // FlyBeeper settings service
        const FSS = services.find(service => service.uuid === '904baf04-5814-11ee-8c99-0242ac120000') // FlyBeeper settings service
        if (FSS && Number.parseFloat(this.dis.firmwareRevisionString.value as string) <= 0.15) {
          const characteristics = await FSS.getCharacteristics()

          this.fss.miniBtSettings.characteristic = characteristics.find(ch => ch.uuid === '904baf04-5814-11ee-8c99-0242ac120001')
          this.fss.miniBtSimulation.characteristic = characteristics.find(ch => ch.uuid === '904baf04-5814-11ee-8c99-0242ac120002')
          await this.readSettings()
        }

        this.device.addEventListener('gattserverdisconnected', this.onDisconnected)
        for (const c of this.bleCharacteristics.filter(c => c.characteristic.properties.notify)) {
          await c.initialize()
          await c.subscribeToNotifications()
        }
        this.isConnected = true
      }
      catch (error) {
        log.error('Error connecting to the device:', error)
        this.isConnected = true
        await this.disconnectDevice()
        this.isConnecting = false
      }
      this.isFetching = false
    },
    async disconnectDevice() {
      if (!this.isConnected || this.isDisconnecting)
        return

      // Проход по характеристикам
      for (const ch of this.bleCharacteristics)
        await ch.unsubscribeFromNotifications()

      try {
        this.isDisconnecting = true
        this.isConnected = false
        await this.device.gatt.disconnect()
        // this.device.removeEventListener('gattserverdisconnected', this.onDisconnected)
      }
      catch (error) {
        log.error('Error disconnecting from the device:', error)
      }
      this.isDisconnecting = false
    },
    onDisconnected() {
      // Обработка отключения
      this.isConnected = false
      this.isDisconnecting = false
      this.device = {}
      this.dis.firmwareRevisionString = { characteristic: null, value: null }
      this.fss.miniBtSettings = { characteristic: null, value: null }
      this.fss.miniBtSimulation = { characteristic: null, value: null }
      this.settings = {} as iFbMiniBtSettings
      this.subscribedCharacteristics = []
      this.characteristicsData = {}
      this.bleCharacteristics = []
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
