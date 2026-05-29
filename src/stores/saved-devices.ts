import { defineStore } from 'pinia'
import { get as idbGet, set as idbSet } from 'idb-keyval'

/**
 * Saved devices registry.
 *
 * This is our own human-facing layer over the browser's Web Bluetooth
 * permission list: the user pairs once, we remember the device by `id` +
 * `name` (+ nickname, last-seen, firmware) and render it on the next visit.
 *
 * The actual chooser-less reconnect is driven by the browser's
 * `navigator.bluetooth.getDevices()` — it returns every device the origin was
 * granted, without a picker and without scanning (so no Android location
 * prompt). We match our saved `id` against that list and connect directly;
 * see `bluetooth.ts > connectToSavedDevice`. The picker only ever appears to
 * add a NEW device, or as a fallback when a saved one is no longer in the
 * permission list (revoked / cleared site data / different profile).
 *
 * `autoConnect` is a per-device hint `bluetooth.ts > tryAutoConnect` reads on
 * app boot to reconnect the flagged device silently.
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
      // IndexedDB calls structuredClone under the hood and that chokes on
      // Pinia's reactive Proxy wrapper (DataCloneError on the Array). Round-
      // tripping through JSON peels every Proxy/Symbol off — our data is
      // plain JSON-safe primitives so we don't lose anything.
      await idbSet(IDB_KEY, JSON.parse(JSON.stringify(this.devices)))
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
