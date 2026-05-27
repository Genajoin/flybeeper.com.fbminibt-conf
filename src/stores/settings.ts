import { defineStore } from 'pinia'
import { get as idbGet, set as idbSet } from 'idb-keyval'

// structuredClone() chokes on Pinia reactive proxies ("could not be cloned").
// JSON.parse(JSON.stringify) strips proxies and the resulting plain object is
// safe for IDB writes and history snapshots. Acceptable because every value we
// store here is JSON-serialisable (numbers, booleans, strings, int arrays).
function cloneJson<T>(v: T): T {
  return v === null || v === undefined ? v : JSON.parse(JSON.stringify(v))
}

/**
 * Local-first, per-device settings store.
 *
 * `local` is a loose `Record<string, unknown>` keyed by FlyBeeper Settings
 * Service characteristic UUID. This store is the durable mirror for
 * offline editing and URL-share preset import; `useCpfGroup` reads/writes
 * `local` so the UI shows the user's intent even after the device is
 * connected (BLE writes don't auto-overwrite local — Apply does).
 *
 * IDB storage is keyed by **slot** (typically a `BluetoothDevice.id`), so
 * two physically different devices keep two independent edit histories
 * even within the same SKU. The `__demo__` slot holds the offline /
 * pre-pair scratch state.
 *
 * v3 key bump: v2 was a single global slot — values from a previously
 * paired device would leak onto the next one. v3 entries are slot-keyed
 * and old v2 keys are intentionally left unread.
 */

const SETTINGS_KEY_PREFIX = 'fb:settings:v3:'
const SNAPSHOT_KEY_PREFIX = 'fb:settings:snapshot:v3:'
const HISTORY_KEY_PREFIX = 'fb:settings:history:v3:'
const DEFAULT_SLOT = '__demo__'
const HISTORY_LIMIT = 50

function settingsKey(slot: string) {
  return SETTINGS_KEY_PREFIX + slot
}
function snapshotKey(slot: string) {
  return SNAPSHOT_KEY_PREFIX + slot
}
function historyKey(slot: string) {
  return HISTORY_KEY_PREFIX + slot
}

export type SettingsLocal = Record<string, unknown>

export interface SettingsHistoryEntry {
  ts: number
  source: 'local' | 'device'
  settings: SettingsLocal
}

export interface SettingsDiffEntry {
  key: string
  local: unknown
  device: unknown
}

export const useSettingsStore = defineStore('settingsStore', {
  state: () => ({
    local: null as SettingsLocal | null,
    lastDeviceSnapshot: null as SettingsLocal | null,
    lastSyncedAt: null as number | null,
    history: [] as SettingsHistoryEntry[],
    hydrated: false,
    /**
     * Active IDB slot key. `__demo__` covers offline / pre-pair state;
     * BLE connect calls `loadSlot(device.id)` to swap to the device's
     * own persisted local + snapshot + history.
     */
    currentSlot: DEFAULT_SLOT,
    /**
     * Set true after writing a CPF characteristic listed in
     * CPF_RESTART_REQUIRED_UUIDS. Drives RestartDeviceBanner. Cleared on
     * disconnect (assumed power-cycle). Not persisted.
     */
    restartPending: false,
  }),
  getters: {
    hasLocal: state => state.local !== null,
    hasDeviceSnapshot: state => state.lastDeviceSnapshot !== null,
    hasUnsyncedChanges(state): boolean {
      if (!state.local || !state.lastDeviceSnapshot)
        return false
      return JSON.stringify(state.local) !== JSON.stringify(state.lastDeviceSnapshot)
    },
  },
  actions: {
    async hydrate(): Promise<void> {
      if (this.hydrated)
        return
      await this.loadSlot(DEFAULT_SLOT, { skipPersist: true })
      this.hydrated = true
    },

    async persist(): Promise<void> {
      const slot = this.currentSlot
      await Promise.all([
        idbSet(settingsKey(slot), cloneJson(this.local)),
        idbSet(snapshotKey(slot), cloneJson(this.lastDeviceSnapshot)),
        idbSet(historyKey(slot), cloneJson(this.history)),
      ])
    },

    /**
     * Swap the active slot. Persists the outgoing slot first, then loads
     * the incoming one from IDB. Pass `__demo__` for offline / pre-pair.
     *
     * Called from bluetoothStore on connect (with `device.id`) and on
     * disconnect/cancel (back to `__demo__`). UI components don't need
     * to be aware — they read `local` reactively.
     */
    async loadSlot(slot: string, opts: { skipPersist?: boolean } = {}): Promise<void> {
      if (slot === this.currentSlot && this.hydrated)
        return
      if (!opts.skipPersist && this.hydrated)
        await this.persist()
      const [stored, snapshot, history] = await Promise.all([
        idbGet<SettingsLocal | null>(settingsKey(slot)),
        idbGet<SettingsLocal | null>(snapshotKey(slot)),
        idbGet<SettingsHistoryEntry[]>(historyKey(slot)),
      ])
      this.currentSlot = slot
      this.local = stored ?? null
      this.lastDeviceSnapshot = snapshot ?? null
      this.history = history ?? []
      this.lastSyncedAt = null
      this.restartPending = false
    },

    pushHistory(source: 'local' | 'device', settings?: SettingsLocal): void {
      const snap = settings ?? this.local
      if (!snap)
        return
      this.history.unshift({
        ts: Date.now(),
        source,
        settings: cloneJson(snap),
      })
      if (this.history.length > HISTORY_LIMIT)
        this.history.length = HISTORY_LIMIT
    },

    applyDeviceSnapshot(snap: SettingsLocal): void {
      this.lastDeviceSnapshot = cloneJson(snap)
      this.lastSyncedAt = Date.now()
      if (!this.local)
        this.local = cloneJson(snap)
      this.pushHistory('device', snap)
    },

    updateLocal(patch: SettingsLocal): void {
      if (!this.local)
        this.local = {}
      this.local = { ...this.local, ...patch }
      this.pushHistory('local')
    },

    replaceLocal(next: SettingsLocal): void {
      this.local = cloneJson(next)
      this.pushHistory('local')
    },

    diff(other?: SettingsLocal): SettingsDiffEntry[] {
      const reference = other ?? this.lastDeviceSnapshot
      if (!this.local || !reference)
        return []
      const out: SettingsDiffEntry[] = []
      for (const key in this.local) {
        if (JSON.stringify(this.local[key]) !== JSON.stringify(reference[key])) {
          out.push({ key, local: this.local[key], device: reference[key] })
        }
      }
      return out
    },

    revertTo(ts: number): boolean {
      const entry = this.history.find(e => e.ts === ts)
      if (!entry)
        return false
      this.local = cloneJson(entry.settings)
      this.pushHistory('local')
      return true
    },

    markSynced(): void {
      if (!this.local)
        return
      this.lastDeviceSnapshot = cloneJson(this.local)
      this.lastSyncedAt = Date.now()
    },

    diffGroup(keys: string[]): SettingsDiffEntry[] {
      return this.diff().filter(d => keys.includes(d.key))
    },

    revertGroup(keys: string[]): void {
      if (!this.local || !this.lastDeviceSnapshot)
        return
      const patch: SettingsLocal = {}
      for (const k of keys)
        patch[k] = cloneJson(this.lastDeviceSnapshot[k])
      this.local = { ...this.local, ...patch }
      this.pushHistory('local')
    },
  },
})

export default useSettingsStore
