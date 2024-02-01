// BleCharacteristic.ts

export interface BleCharacteristic {
  characteristic: BluetoothRemoteGATTCharacteristic
  descriptors: BluetoothRemoteGATTDescriptor[]
  userFormatDescriptor: string | null
  presentationFormatDescriptor: {
    format: number
    exponent: number
    unit: string
    namespace: number
    description?: string
  } | null
  getValue: () => Promise<any>
}

export class BleCharacteristicImpl implements BleCharacteristic {
  characteristic: BluetoothRemoteGATTCharacteristic
  descriptors: BluetoothRemoteGATTDescriptor[]
  userFormatDescriptor: string | null = null
  presentationFormatDescriptor: {
    format: number
    exponent: number
    unit: string
    namespace: number
    description?: string
  } | null = null

  constructor(characteristic: BluetoothRemoteGATTCharacteristic) {
    this.characteristic = characteristic
    this.initialize()
  }

  async getUserFormatDescriptor(): Promise<void> {
    if (!this.userFormatDescriptor && this.descriptors) {
      const userFormatDescriptor = this.descriptors.find(
        descriptor => descriptor.uuid === '00002901-0000-1000-8000-00805f9b34fb',
      )

      if (userFormatDescriptor) {
        const val = await userFormatDescriptor.readValue()
        const enc = new TextDecoder('utf-8')
        this.userFormatDescriptor = enc.decode(val.buffer)
        console.log('Characteristic User Format Descriptor:', this.userFormatDescriptor)
      }
      else {
        console.log('Characteristic User Format Descriptor не найден.')
      }
    }
  }

  private getUnitString(unitCode: number): string {
    switch (unitCode) {
      case 0x2700: return 'unit less'
      case 0x2712: return 'm/s'
      case 0x2724: return 'Pa'
      case 0x27A6: return 'km/h'
      // Добавьте другие соответствия по необходимости
      default: return `Unknown Unit (${unitCode.toString(16)})`
    }
  }

  async readPresentationFormatDescriptor(): Promise<void> {
    if (!this.descriptors)
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

      console.log('Characteristic Presentation Format Descriptor:', this.presentationFormatDescriptor)
    }
    else {
      console.log('Characteristic Presentation Format Descriptor не найден.')
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

  formatValue(value): any {
    const presentationFormat = this.presentationFormatDescriptor
    if (presentationFormat) {
      const format = presentationFormat.format
      const exponent = presentationFormat.exponent

      switch (format) {
        case 0x08: // uint8
          return exponent ? new DataView(value.buffer).getUint8(0) * 10 ** exponent : new DataView(value.buffer).getUint8(0)

        case 0x09: // uint16
          return exponent ? new DataView(value.buffer).getUint16(0, true) * 10 ** exponent : new DataView(value.buffer).getUint16(0, true)

        case 0x0A: // uint24
          return exponent
            ? (
                (new DataView(value.buffer).getUint8(0) << 16)
                | (new DataView(value.buffer).getUint8(1) << 8)
                | new DataView(value.buffer).getUint8(2)
              ) * 10 ** exponent
            : (
                (new DataView(value.buffer).getUint8(0) << 16)
                | (new DataView(value.buffer).getUint8(1) << 8)
                | new DataView(value.buffer).getUint8(2)
              )

        case 0x0C: // uint32
          return exponent ? new DataView(value.buffer).getUint32(0, true) * 10 ** exponent : new DataView(value.buffer).getUint32(0, true)

        case 0x0E: // uint64
          return exponent ? Number(new DataView(value.buffer).getBigUint64(0, true)) * 10 ** exponent : Number(new DataView(value.buffer).getBigUint64(0, true))

        case 0x10: // sint8
          return exponent ? new DataView(value.buffer).getInt8(0) * 10 ** exponent : new DataView(value.buffer).getInt8(0)

        case 0x11: // sint16
          return exponent ? new DataView(value.buffer).getInt16(0, true) * 10 ** exponent : new DataView(value.buffer).getInt16(0, true)

        case 0x13: // sint24
          return exponent
            ? (
                (new DataView(value.buffer).getInt8(0) << 16)
                | (new DataView(value.buffer).getUint8(1) << 8)
                | new DataView(value.buffer).getUint8(2)
              ) * 10 ** exponent
            : (
                (new DataView(value.buffer).getInt8(0) << 16)
                | (new DataView(value.buffer).getUint8(1) << 8)
                | new DataView(value.buffer).getUint8(2)
              )

        case 0x14: // sint32
          return exponent ? new DataView(value.buffer).getInt32(0, true) * 10 ** exponent : new DataView(value.buffer).getInt32(0, true)

        case 0x16: // sint64
          return exponent ? Number(new DataView(value.buffer).getBigInt64(0, true)) * 10 ** exponent : Number(new DataView(value.buffer).getBigInt64(0, true))

        case 0x17: // float32
          return exponent ? new DataView(value.buffer).getFloat32(0, true) * 10 ** exponent : new DataView(value.buffer).getFloat32(0, true)

        case 0x18: // float64
          return exponent ? new DataView(value.buffer).getFloat64(0, true) * 10 ** exponent : new DataView(value.buffer).getFloat64(0, true)

        case 0x19: // sfloat
          return exponent ? this.decodeSFloat(new DataView(value.buffer).getUint16(0, true)) * 10 ** exponent : this.decodeSFloat(new DataView(value.buffer).getUint16(0, true))

        case 0x1A: // float
          return exponent ? this.decodeFloat(new DataView(value.buffer).getUint32(0, true)) * 10 ** exponent : this.decodeFloat(new DataView(value.buffer).getUint32(0, true))

        case 0x1B: // duint16
          return exponent ? new DataView(value.buffer).getUint16(0, true) / 65536 * 10 ** exponent : new DataView(value.buffer).getUint16(0, true) / 65536

        case 0x25: // utf8s
          return new TextDecoder('utf-8').decode(value.buffer)

        case 0x26: // utf16s
          return new TextDecoder('utf-16').decode(value.buffer)

        default:
          console.error(`Unsupported value format: ${format}`)
          return value
      }
    }
    else {
      console.error('Presentation format descriptor is missing.')
      return value
    }
  }

  async getValue(): Promise<any> {
    try {
      const value = await this.characteristic.readValue()
      return this.formatValue(value)
    }
    catch (error) {
      console.error('Error reading value:', error)
      return null
    }
  }

  private async getDescriptors(): Promise<any> {
    try {
      this.descriptors = await this.characteristic.getDescriptors()
    }
    catch (error) {
      console.error('Error getting descriptors:', error)
    }
  }

  private async initialize(): Promise<void> {
    await this.getDescriptors()
    await this.getUserFormatDescriptor()
    await this.readPresentationFormatDescriptor()
  }
}
