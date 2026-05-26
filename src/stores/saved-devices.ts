import { defineStore } from 'pinia'
import { get as idbGet, set as idbSet } from 'idb-keyval'

/**
 * Saved devices registry (DECISIONS.md §5).
 *
 * The browser's own `navigator.bluetooth.getDevices()` is a permission-coupled
 * list that triggers a location prompt on Android the moment we observe it, and
 * its IDs are opaque/regenerated per origin. We keep our own registry instead:
 * the user explicitly pairs once, we remember the device by `id` + `name` and
 * offer a one-tap reconnect on the next visit (the browser still holds the
 * pairing permission; the chooser comes up only when a new device is added).
 *
 * autoConnect is a per-device hint the connect flow respects on app boot.
 */

const IDB_KEY = 'fb:saved-devices:v1'

export interface SavedDevice {
  id: string
  name: string
  nickname: string | null
  lastSeenAt: number
  lastFirmware: string | null
  autoConnect: boolean
}

export const useSavedDevicesStore = defineStore('savedDevicesStore', {
  state: () => ({
    devices: [] as SavedDevice[],
    hydrated: false,
  }),
  getters: {
    byId: state => (id: string) => state.devices.find(d => d.id === id) ?? null,
    autoConnectDevice: state => state.devices.find(d => d.autoConnect) ?? null,
    sortedByLastSeen: state => [...state.devices].sort((a, b) => b.lastSeenAt - a.lastSeenAt),
  },
  actions: {
    async hydrate(): Promise<void> {
      if (this.hydrated)
        return
      const stored = await idbGet<SavedDevice[]>(IDB_KEY)
      if (stored)
        this.devices = stored
      this.hydrated = true
    },

    async persist(): Promise<void> {
      await idbSet(IDB_KEY, this.devices)
    },

    /**
     * Upsert from a successful connect. Preserves nickname / autoConnect if the
     * device was already saved; bumps lastSeenAt and updates firmware on every
     * call.
     */
    remember(input: { id: string, name: string, firmware?: string | null }): void {
      const existing = this.devices.find(d => d.id === input.id)
      if (existing) {
        existing.name = input.name || existing.name
        existing.lastSeenAt = Date.now()
        if (input.firmware !== undefined)
          existing.lastFirmware = input.firmware
        return
      }
      this.devices.push({
        id: input.id,
        name: input.name,
        nickname: null,
        lastSeenAt: Date.now(),
        lastFirmware: input.firmware ?? null,
        autoConnect: false,
      })
    },

    setNickname(id: string, nickname: string | null): void {
      const dev = this.devices.find(d => d.id === id)
      if (!dev)
        return
      dev.nickname = nickname && nickname.trim() ? nickname.trim() : null
    },

    /**
     * Flip autoConnect for the named device. Only one device can be the
     * auto-connect target — turning it on clears the flag on the others.
     */
    setAutoConnect(id: string, value: boolean): void {
      for (const dev of this.devices)
        dev.autoConnect = dev.id === id ? value : false
    },

    forget(id: string): void {
      this.devices = this.devices.filter(d => d.id !== id)
    },

    clear(): void {
      this.devices = []
    },
  },
})

export default useSavedDevicesStore
