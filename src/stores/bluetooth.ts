import { defineStore } from 'pinia'
import log from 'loglevel'
import { BleCharacteristicImpl } from '~/utils/BleCharacteristic'
import { useSettingsStore } from '~/stores/settings'
import { useSavedDevicesStore } from '~/stores/saved-devices'
import { RESTART_REQUIRED_FIELDS } from '~/composables/useSettingsGroups'

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
    isSubscribed: false,
    /**
     * True once this session has reached a successful connect. Used by
     * DisconnectBanner to distinguish "you just lost the device" (true
     * + !isConnected) from "cold start with hydrated local settings"
     * (false + !isConnected). Resets to false on page reload by virtue
     * of being plain Pinia state.
     */
    hasConnectedThisSession: false,
    devName: '',
    errorMessage: '',
    characteristicsData: {},
    subscribedCharacteristics: [],
    bleCharacteristics: [] as BleCharacteristicImpl[],

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
  getters: {
    /**
     * Backward-compat surface — settings now live in useSettingsStore
     * (local-first, persisted to IDB, survives disconnect). Reading
     * `bt.settings` returns the live local copy; null until the device
     * has been read or the store has been hydrated from IDB.
     *
     * Phase 4 will migrate the settings UI to read settingsStore.local
     * directly and this getter will be removed.
     */
    settings(): iFbMiniBtSettings | null {
      return useSettingsStore().local
    },
  },
  actions: {
    async toggleConnectionBT() {
      if (this.isConnected && !this.isDisconnecting)
        await this.disconnectDevice()
      else if (!this.isConnected || this.isDisconnecting)
        await this.connectToRequestDevice()
    },

    async connectToDevice(device) {
      if (!this.bleAvailable || this.isConnected || this.isConnecting)
        return

      this.errorMessage = ''
      this.isConnecting = true
      this.device = device
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
          // await bleCharacteristic.subscribeToNotifications()
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
      this.isConnected = true
      this.hasConnectedThisSession = true
      this.isFetching = false

      // Remember the device in our own registry (DECISIONS.md §5).
      // The browser keeps its own permission grant but its IDs are opaque
      // and `getDevices()` triggers an Android location prompt — we never
      // touch it. Saved-devices UI works off this list instead.
      if (this.device.id && this.device.name) {
        useSavedDevicesStore().remember({
          id: this.device.id,
          name: this.device.name,
          firmware: (this.dis.firmwareRevisionString.value as string | null) ?? null,
        })
      }
    },

    async connectToRequestDevice() {
      if (!this.bleAvailable || this.isConnected || this.isConnecting)
        return
      this.errorMessage = ''

      navigator.bluetooth.requestDevice({
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
        .then(device => this.connectToDevice(device))
        .catch((error) => {
          // User dismissed the chooser — not an error, just nothing to do.
          // (Audit §4.1: don't paint the page red when the user just changed
          // their mind.)
          if (error && (error as DOMException).name === 'NotFoundError') {
            log.debug('Device chooser dismissed by user')
            this.isConnecting = false
            this.isFetching = false
            return
          }
          log.error('Error connecting to the device:', error)
          this.errorMessage = error instanceof Error ? error.message : String(error)
          this.isConnecting = false
          this.isFetching = false
        })
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
      // Обработка отключения. Settings больше НЕ обнуляем — они живут в
      // useSettingsStore (local-first, IDB-backed) и должны переживать
      // disconnect. См. DECISIONS.md §★ State model.
      this.isConnected = false
      this.isDisconnecting = false
      this.device = {}
      this.dis.firmwareRevisionString = { characteristic: null, value: null }
      this.fss.miniBtSettings = { characteristic: null, value: null }
      this.fss.miniBtSimulation = { characteristic: null, value: null }
      this.subscribedCharacteristics = []
      this.characteristicsData = {}
      this.bleCharacteristics = []

      // Restart banner: a disconnect is our proxy for "the user power-cycled
      // the device", so clear the pending flag. If they actually just lost
      // signal and reconnect with the change still un-applied, the next write
      // will set the flag again.
      useSettingsStore().restartPending = false
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

      const parsed: iFbMiniBtSettings = {
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
      }

      // Push to settings store: updates lastDeviceSnapshot for diff,
      // seeds local on first read, leaves local untouched on subsequent
      // reads (preserves user's in-flight edits — see DECISIONS §★1).
      useSettingsStore().applyDeviceSnapshot(parsed)
    },

    async writeMiniBtSettings(settings: iFbMiniBtSettings) {
      if (!this.fss.miniBtSettings.characteristic)
        return

      // Diff-write skip (audit §4.4): the ≤0.15 codec is monolithic — the
      // device accepts only the whole struct — so the optimisation is binary,
      // not field-level. If nothing changed vs the last known device state,
      // don't waste a BLE round-trip or a flash-write cycle.
      const settingsStore = useSettingsStore()
      if (
        settingsStore.lastDeviceSnapshot
        && JSON.stringify(settings) === JSON.stringify(settingsStore.lastDeviceSnapshot)
      ) {
        log.debug('writeMiniBtSettings: no diff vs device, skipping')
        return
      }

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
        const feature_bits = Number(settings.silent_on_ground)
          | Number(settings.ble_never_sleep) << 1
          | Number(settings.led_blinky_by_vario) << 2
          | Number(settings.hid_keyboard_off) << 3
        view.setUint8(indexes.feature_bits, feature_bits)
      }

      // Detect restart-required diff BEFORE markSynced wipes the diff signal
      // (audit §7). If hid_keyboard_off (or any other RESTART_REQUIRED field)
      // changed during this write, the user must power-cycle the device for
      // the change to take effect — RestartDeviceBanner watches this flag.
      const restartNeeded = RESTART_REQUIRED_FIELDS.some((k) => {
        const prev = settingsStore.lastDeviceSnapshot?.[k]
        const next = settings[k]
        return prev !== undefined && prev !== next
      })

      //  буфер в характеристику
      this.fss.miniBtSettings.characteristic.writeValue(buffer)
        .then(() => {
          settingsStore.replaceLocal(settings)
          settingsStore.markSynced()
          if (restartNeeded)
            settingsStore.restartPending = true
        })
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
