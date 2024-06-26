// BleCharacteristic.ts

import log from 'loglevel'

export interface LogEntry {
  timestamp: number // Метка времени
  value: any // Значение
}

export interface BleCharacteristic {
  characteristic: BluetoothRemoteGATTCharacteristic
  descriptors: BluetoothRemoteGATTDescriptor[]
  value: any
  formattedValue: any
  userFormatDescriptor: string | null
  isBlockNotify: boolean
  isNotified: boolean
  isInitialized: boolean
  entryArray: LogEntry[]
  presentationFormatDescriptor: {
    format: number
    exponent: number
    unit: string
    namespace: number
    description?: string
  } | null
  getValue: () => Promise<any>
  subscribeToNotifications: () => Promise<void>
  unsubscribeFromNotifications: () => Promise<void>
  setFormattedValue: () => Promise<void>
  initialize: () => Promise<void>
  subscribe: (callback: (value: any) => void) => void
  unsubscribe: (callback: (value: any) => void) => void
}

export class BleCharacteristicImpl implements BleCharacteristic {
  characteristic: BluetoothRemoteGATTCharacteristic
  descriptors: BluetoothRemoteGATTDescriptor[] = []
  value: any = null
  formattedValue: any = null
  userFormatDescriptor: string | null = null
  isBlockNotify: boolean = false
  isNotified: boolean = false
  isInitialized: boolean = false
  entryArray: LogEntry[] = []
  presentationFormatDescriptor: {
    format: number
    exponent: number
    unit: string
    namespace: number
    description?: string
  } | null = null

  // Список подписчиков
  private subscribers: ((value: any) => void)[] = []

  constructor(characteristic: BluetoothRemoteGATTCharacteristic) {
    this.characteristic = characteristic
  }

  private onNotification = async (event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    this.value = characteristic.value
    this.formattedValue = this.formatValue(characteristic.value)
    if (!this.isBlockNotify) {
      this.notifySubscribers(this.formattedValue)
      this.entryArray.push({ timestamp: Date.now(), value: this.formattedValue })
      // log.debug('new val ', this.formattedValue)
    }
  }

  async subscribeToNotifications(): Promise<void> {
    if (this.isNotified || !this.characteristic.properties.notify)
      return

    await this.characteristic.startNotifications()
    log.debug('start notify', this.characteristic.uuid)
    this.characteristic.addEventListener('characteristicvaluechanged', this.onNotification)
    this.isNotified = true
  }

  async unsubscribeFromNotifications(): Promise<void> {
    if (!this.characteristic.properties.notify) {
      // Характеристика не поддерживает уведомления, нечего отписываться
      return
    }

    this.characteristic.removeEventListener('characteristicvaluechanged', this.onNotification)

    this.isNotified = false
    log.debug('stop notify', this.characteristic.uuid)
    await this.characteristic.stopNotifications()
  }

  // Метод для добавления подписчика
  public subscribe(callback: (value: any) => void) {
    this.subscribers.push(callback)
  }

  // Метод для удаления подписчика
  public unsubscribe(callback: (value: any) => void) {
    const index = this.subscribers.indexOf(callback)
    if (index !== -1)
      this.subscribers.splice(index, 1)
  }

  // Метод для оповещения всех подписчиков об изменении значения
  private notifySubscribers(value: any) {
    this.subscribers.forEach((callback) => {
      callback(value)
    })
  }

  async getUserFormatDescriptor(): Promise<void> {
    if (!this.userFormatDescriptor) {
      if (this.descriptors.length) {
        const userFormatDescriptor = this.descriptors.find(
          descriptor => descriptor.uuid === '00002901-0000-1000-8000-00805f9b34fb',
        )

        if (userFormatDescriptor) {
          const val = await userFormatDescriptor.readValue()
          const enc = new TextDecoder('utf-8')
          this.userFormatDescriptor = enc.decode(val.buffer)
          log.debug('Characteristic User Format Descriptor:', this.userFormatDescriptor)
        }
        else {
          log.debug('Characteristic User Format Descriptor не найден.')
          this.userFormatDescriptor = this.getUserFormatDescriptorByUUID()
        }
      }
      else {
        this.userFormatDescriptor = this.getUserFormatDescriptorByUUID()
      }
    }
  }

  private getUserFormatDescriptorByUUID() {
    switch (this.characteristic.uuid) {
      case '00002a6d-0000-1000-8000-00805f9b34fb': // pressure
        return 'Pressure, Pa'
      case '00002a19-0000-1000-8000-00805f9b34fb': // battery
        return 'Battery level, %'
      case '00002a6e-0000-1000-8000-00805f9b34fb': // temperature
        return 'Temperature, °C'
      case '00002a6c-0000-1000-8000-00805f9b34fb': // elevation
        return 'Elevation, m'
      default:
        return null
    }
  }

  private getUnitString(unitCode: number): string {
    switch (unitCode) {
      case 0x2700: return 'unit less'
      case 0x2712: return 'm/s'
      case 0x2724: return 'Pa'
      case 0x27A6: return 'km/h'
      case 0x2728: return 'V'
      case 0x2703: return 'sec'
      case 0x2761: return 'hour'
      // Добавьте другие соответствия по необходимости
      default: return `Unknown Unit (${unitCode.toString(16)})`
    }
  }

  async readPresentationFormatDescriptor(): Promise<void> {
    if (this.descriptors.length === 0)
      return
    const presentationFormatDescriptor = this.descriptors.find(
      descriptor => descriptor.uuid === '00002904-0000-1000-8000-00805f9b34fb',
    )

    if (presentationFormatDescriptor) {
      const value = await presentationFormatDescriptor.readValue()
      const dataView = new DataView(value.buffer)

      // Распаковка значений CPFD
      const format = dataView.getUint8(0)
      const exponent = dataView.getInt8(1)
      const unitCode = dataView.getUint16(2, true) // Little-endian
      const namespace = dataView.getUint8(4)

      // Декодирование unitCode в строку
      const unit = this.getUnitString(unitCode)

      this.presentationFormatDescriptor = {
        format,
        exponent,
        unit,
        namespace,
      }

      log.debug('Characteristic Presentation Format Descriptor:', this.presentationFormatDescriptor)
    }
    else {
      log.debug('Characteristic Presentation Format Descriptor не найден.')
    }
  }

  // Добавлены функции для декодирования IEEE-11073 форматов SFLOAT и FLOAT
  private decodeSFloat(rawValue: number): number {
    const exponent = rawValue >> 11
    const mantissa = rawValue & 0x7FF

    if (exponent === 0)
      return (-1) ** exponent * (mantissa / 100.0)
    else if (exponent === 0x1F)
      return mantissa ? Number.NaN : Number.POSITIVE_INFINITY
    else
      return (-1) ** exponent * (1 + mantissa / 2048.0) * 2 ** (exponent - 15)
  }

  private decodeFloat(rawValue: number): number {
    const exponent = rawValue >> 23
    const mantissa = rawValue & 0x7FFFFF

    if (exponent === 0)
      return (-1) ** exponent * (mantissa / 2 ** 23)
    else if (exponent === 0xFF)
      return mantissa ? Number.NaN : Number.POSITIVE_INFINITY
    else
      return (-1) ** exponent * (1 + mantissa / 2 ** 23) * 2 ** (exponent - 127)
  }

  private exponentFormat(exponent, value): number {
    switch (exponent) {
      case null:
      case 0:
        return value
      case -1:
        return value / 10
      case -2:
        return value / 100
      case -3:
        return value / 1000
      default:
        return value * 10 ** exponent
    }
  }

  formatValueByFormat(value, format, exponent) {
    const dots = []

    switch (format) {
      case 0x01: // bool
        return value.getUint8(0) === 1
      case 0x04: // uint8
        return this.exponentFormat(exponent, value.getUint8(0))
      case 0x06: // uint16
        return this.exponentFormat(exponent, value.getUint16(0, true))
      case 0x08: // uint32
        return this.exponentFormat(exponent, value.getUint32(0, true))
      case 0x0C: // sint8
        return this.exponentFormat(exponent, value.getInt8(0))
      case 0x0E: // sint16
        return this.exponentFormat(exponent, value.getInt16(0, true))
      case 0x10: // sint32
        return this.exponentFormat(exponent, value.getInt32(0, true))
      case 0x12: // sint64
        return this.exponentFormat(exponent, Number(value.getBigInt64(0, true)))
      case 0x14: // float32
        return this.exponentFormat(exponent, value.getFloat32(0, true))
      case 0x15: // float64
        return this.exponentFormat(exponent, value.getFloat64(0, true))
      case 0x16: // EE 11073-20601 16-bit SFLOAT
        return this.exponentFormat(exponent, this.decodeSFloat(value.getUint16(0, true)))
      case 0x17: // IEEE 11073-20601 32-bit FLOAT
        return this.exponentFormat(exponent, this.decodeFloat(value.getUint32(0, true)))
      case 0x18: // duint16  IEEE 11073-20601 nomenclature code
        return this.exponentFormat(exponent, value.getUint16(0, true) / 65536)
      case 0x19: // utf8s
        return new TextDecoder('utf-8').decode(value.buffer)
      case 0x1A: // utf16s
        return new TextDecoder('utf-16').decode(value.buffer)

      case 0x1B: // struct
        for (let i = 0; i < 12; i++)
          dots[i] = value.getInt16(i * 2, true)

        return dots

      default:
        log.error(`Unsupported value format: ${format}`)
        return value
    }
  }

  formatValueByUUID(val, uuid) {
    switch (uuid) {
      case '00002a6d-0000-1000-8000-00805f9b34fb': // pressure
        return val.getUint32(0, true) / 10
      case '234337bf-f931-4d2d-a13c-07e2f06a0249': // tas
      case '234337bf-f931-4d2d-a13c-07e2f06a0248': // ias
      case 'ed3f945f-061e-45f3-ae59-1b26249ea7f4': // eas
      case '234337bf-f931-4d2d-a13c-07e2f06a0240': // dp
        return val.getInt16(0, true) / 10
      case '00002a19-0000-1000-8000-00805f9b34fb': // battery
      case '00002a56-0000-1000-8000-00805f9b34fb': // buttons
        return val.getUint8(0)
      case '00002a6e-0000-1000-8000-00805f9b34fb': // temperature
      case '00002a6c-0000-1000-8000-00805f9b34fb': // elevation
        return val.getInt16(0, true) / 100
      default:
        return null
    }
  }

  formatValue(value): any {
    const valByUUID = this.formatValueByUUID(value, this.characteristic.uuid)
    if (valByUUID !== null)
      return valByUUID

    if (this.presentationFormatDescriptor) {
      return this.formatValueByFormat(value, this.presentationFormatDescriptor.format, this.presentationFormatDescriptor.exponent)
    }
    else {
      log.warn('Presentation format descriptor is missing.')
      return value
    }
  }

  async getValue(): Promise<any> {
    if (!this.characteristic.properties.read)
      return null
    try {
      this.value = await this.characteristic.readValue()
      return this.value
    }
    catch (error) {
      log.error('Error reading value:', error)
      return null
    }
  }

  async getFormattedValue() {
    this.value = await this.getValue()
    if (this.value !== null) {
      this.formattedValue = this.formatValue(this.value)
      return this.formattedValue
    }
    else {
      return null
    }
  }

  async setFormattedValue() {
    if (this.presentationFormatDescriptor === null || this.formattedValue === null)
      return
    const value = this.convertFormattedValueToDataView(this.formattedValue, this.presentationFormatDescriptor.format, this.presentationFormatDescriptor.exponent)
    if (!this.compareValues(value, this.value)) {
      this.characteristic.writeValue(value)
        .then(() => this.value = value)
    }
  }

  /**
   * Возвращает true если два DataView равны по данным
   * @param value1
   * @param value2
   * @private
   */
  private compareValues(value1: DataView, value2: DataView): boolean {
    if (value1.byteLength !== value2.byteLength)
      return false

    for (let i = 0; i < value1.byteLength; i++) {
      const val1 = value1.getUint8(i)
      const val2 = value2.getUint8(i)
      if (val1 !== val2)
        return false
    }
    return true
  }

  private convertFormattedValueToDataView(_formattedValue: any, format: number, exponent: number): DataView {
    let dataView: DataView

    switch (format) {
      case 0x01: // bool
        dataView = new DataView(new ArrayBuffer(1))
        dataView.setUint8(0, _formattedValue ? 0x01 : 0x00)
        break

      case 0x04: // uint8
        // Преобразовать 8-битное целое значение
        dataView = new DataView(new ArrayBuffer(1))
        dataView.setUint8(0, _formattedValue / (10 ** exponent))
        break

      case 0x0C: // sint8
        // Преобразовать 8-битное целое значение
        dataView = new DataView(new ArrayBuffer(1))
        dataView.setInt8(0, _formattedValue / (10 ** exponent))
        break

      case 0x0E: // sint16
        // Преобразовать 16-битное целое значение
        dataView = new DataView(new ArrayBuffer(2))
        dataView.setInt16(0, _formattedValue / (10 ** exponent), true) // true для little-endian
        break

      case 0x08: // uint32
        // Преобразовать 32-битное беззнаковое значение
        dataView = new DataView(new ArrayBuffer(4))
        dataView.setUint32(0, _formattedValue / (10 ** exponent), true) // true для little-endian
        break

      case 0x1B: // structure (array)
        // Преобразовать _formattedValue как массив int16 в dataView
        if (Array.isArray(_formattedValue) && _formattedValue.every((value: any) => typeof value === 'number')) {
          // Создаем новый буфер, в который будем записывать int16 значения
          const buffer = new ArrayBuffer(_formattedValue.length * 2)
          const view = new DataView(buffer)

          // Записываем каждое значение int16 в буфер
          for (let i = 0; i < _formattedValue.length; i++)
            view.setInt16(i * 2, _formattedValue[i], true) // Little-endian

          dataView = view
        }
        else {
          throw new Error('Invalid Value for structure (array)')
        }
        break

      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    return dataView
  }

  private async getDescriptors(): Promise<any> {
    try {
      this.descriptors = await this.characteristic.getDescriptors()
    }
    catch (error) {
      this.descriptors = []
      log.warn('Descriptors is missing')
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized)
      return
    await this.getDescriptors()
    await this.getUserFormatDescriptor()
    await this.readPresentationFormatDescriptor()
    await this.getFormattedValue()
    this.isInitialized = true
    log.debug('характеристика инициализирована', this.characteristic.uuid)
  }
}
