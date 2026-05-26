import { defineStore } from 'pinia'
import log from 'loglevel'
import { BleCharacteristicImpl } from '~/utils/BleCharacteristic'
import { useSettingsStore } from '~/stores/settings'
import { useSavedDevicesStore } from '~/stores/saved-devices'
import { CPF_RESTART_REQUIRED_UUIDS } from '~/composables/useSettingsGroups'

interface BtCh {
  characteristic: object | null
  value: number | string | null
}

interface iDIS {
  modelNumberString: BtCh
  manufacturerNameString: BtCh
  firmwareRevisionString: BtCh
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
     * DisconnectBanner to distinguish "you just lost the device" from
     * "cold start with hydrated local settings".
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
      miniBtSimulation: { characteristic: null, value: null } as BtCh,
    },
  }),
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

      const services = await server.getPrimaryServices()
      this.isConnecting = false
      this.isFetching = true
      log.info('fetching')
      for (const service of services) {
        log.debug('SERVICE', service.uuid)
        const characteristics = await service.getCharacteristics()
        for (const ch of characteristics) {
          log.debug('characteristic', ch.uuid)
          const bleCharacteristic = new BleCharacteristicImpl(ch)
          this.bleCharacteristics.push(bleCharacteristic)
        }
      }

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

      // FlyBeeper Settings Service — pin the simulation characteristic so
      // useSimulation() can write to it without re-scanning every time.
      const FSS = services.find(service => service.uuid === '904baf04-5814-11ee-8c99-0242ac120000')
      if (FSS) {
        const characteristics = await FSS.getCharacteristics()
        this.fss.miniBtSimulation.characteristic = characteristics.find(ch => ch.uuid === '904baf04-5814-11ee-8c99-0242ac120002')
      }

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected)
      this.isConnected = true
      this.hasConnectedThisSession = true
      this.isFetching = false

      // Eager-initialize every FlyBeeper Settings Service characteristic so
      // panels render without lazy per-visit reads.
      const FSS_UUID = '904baf04-5814-11ee-8c99-0242ac120000'
      Promise.allSettled(
        this.bleCharacteristics
          .filter(c => c.characteristic.service.uuid === FSS_UUID)
          .map(c => c.initialize()),
      ).catch(() => { /* allSettled never rejects */ })

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

      for (const ch of this.bleCharacteristics)
        await ch.unsubscribeFromNotifications()

      try {
        this.isDisconnecting = true
        this.isConnected = false
        await this.device.gatt.disconnect()
      }
      catch (error) {
        log.error('Error disconnecting from the device:', error)
      }
      this.isDisconnecting = false
    },
    onDisconnected() {
      this.isConnected = false
      this.isDisconnecting = false
      this.device = {}
      this.dis.firmwareRevisionString = { characteristic: null, value: null }
      this.fss.miniBtSimulation = { characteristic: null, value: null }
      this.subscribedCharacteristics = []
      this.characteristicsData = {}
      this.bleCharacteristics = []

      useSettingsStore().restartPending = false
    },

    /**
     * Writes a single FSS characteristic. Convenience wrapper used by URL-share
     * preset import: given a UUID and a formatted value, find the char, set the
     * value through its codec, and (if a restart-required UUID) flag the banner.
     */
    async writeCharacteristic(uuid: string, value: unknown): Promise<void> {
      const ch = this.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
      if (!ch)
        return
      ch.formattedValue = value
      await ch.setFormattedValue()
      if (CPF_RESTART_REQUIRED_UUIDS.includes(uuid))
        useSettingsStore().restartPending = true
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
