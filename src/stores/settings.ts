import { defineStore } from 'pinia'
import { get as idbGet, set as idbSet } from 'idb-keyval'

/**
 * Local-first settings store.
 *
 * After the legacy ≤0.15 codec was removed, `local` is a loose
 * `Record<string, unknown>` keyed by FlyBeeper Settings Service
 * characteristic UUID. The CPF panel layer owns the source-of-truth
 * (via `BleCharacteristic.formattedValue`); this store is the durable
 * mirror for offline editing and URL-share preset import.
 *
 * IDB key is bumped to `:v2` so stale legacy struct payloads don't get
 * misread as UUID-keyed records.
 */

const IDB_KEY_SETTINGS = 'fb:settings:v2'
const IDB_KEY_HISTORY = 'fb:settings:history:v2'
const IDB_KEY_SNAPSHOT = 'fb:settings:device-snapshot:v2'
const HISTORY_LIMIT = 50

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
      const [stored, snapshot, history] = await Promise.all([
        idbGet<SettingsLocal | null>(IDB_KEY_SETTINGS),
        idbGet<SettingsLocal | null>(IDB_KEY_SNAPSHOT),
        idbGet<SettingsHistoryEntry[]>(IDB_KEY_HISTORY),
      ])
      if (stored)
        this.local = stored
      if (snapshot)
        this.lastDeviceSnapshot = snapshot
      if (history)
        this.history = history
      this.hydrated = true
    },

    async persist(): Promise<void> {
      const stripProxy = <T>(v: T): T => v === null || v === undefined ? v : JSON.parse(JSON.stringify(v))
      await Promise.all([
        idbSet(IDB_KEY_SETTINGS, stripProxy(this.local)),
        idbSet(IDB_KEY_SNAPSHOT, stripProxy(this.lastDeviceSnapshot)),
        idbSet(IDB_KEY_HISTORY, stripProxy(this.history)),
      ])
    },

    pushHistory(source: 'local' | 'device', settings?: SettingsLocal): void {
      const snap = settings ?? this.local
      if (!snap)
        return
      this.history.unshift({
        ts: Date.now(),
        source,
        settings: structuredClone(snap),
      })
      if (this.history.length > HISTORY_LIMIT)
        this.history.length = HISTORY_LIMIT
    },

    applyDeviceSnapshot(snap: SettingsLocal): void {
      this.lastDeviceSnapshot = structuredClone(snap)
      this.lastSyncedAt = Date.now()
      if (!this.local)
        this.local = structuredClone(snap)
      this.pushHistory('device', snap)
    },

    updateLocal(patch: SettingsLocal): void {
      if (!this.local)
        this.local = {}
      this.local = { ...this.local, ...patch }
      this.pushHistory('local')
    },

    replaceLocal(next: SettingsLocal): void {
      this.local = structuredClone(next)
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
      this.local = structuredClone(entry.settings)
      this.pushHistory('local')
      return true
    },

    markSynced(): void {
      if (!this.local)
        return
      this.lastDeviceSnapshot = structuredClone(this.local)
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
        patch[k] = structuredClone(this.lastDeviceSnapshot[k])
      this.local = { ...this.local, ...patch }
      this.pushHistory('local')
    },
  },
})

export default useSettingsStore
