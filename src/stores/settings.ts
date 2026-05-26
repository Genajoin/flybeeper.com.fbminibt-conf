import { defineStore } from 'pinia'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import type { iFbMiniBtSettings } from '~/stores/bluetooth'

/**
 * Local-first settings store (DECISIONS.md §★ State model).
 *
 * - `local` is the source of truth — survives device disconnect, persists in IDB.
 * - `lastDeviceSnapshot` is the last known device state, used to compute diffs
 *   on reconnect ("apply local changes to device?").
 * - `history` keeps capped change snapshots so the user can revert to a previous
 *   state ("revert to N minutes ago").
 *
 * The bluetoothStore reads from the device and calls `applyDeviceSnapshot()`;
 * the UI mutates via `updateLocal()`. The two are decoupled — disconnect does
 * NOT clear `local`.
 */

const IDB_KEY_SETTINGS = 'fb:settings:v1'
const IDB_KEY_HISTORY = 'fb:settings:history:v1'
const IDB_KEY_SNAPSHOT = 'fb:settings:device-snapshot:v1'
const HISTORY_LIMIT = 50

export interface SettingsHistoryEntry {
  ts: number
  source: 'local' | 'device'
  settings: iFbMiniBtSettings
}

export interface SettingsDiffEntry {
  key: keyof iFbMiniBtSettings
  local: unknown
  device: unknown
}

export const useSettingsStore = defineStore('settingsStore', {
  state: () => ({
    local: null as iFbMiniBtSettings | null,
    lastDeviceSnapshot: null as iFbMiniBtSettings | null,
    lastSyncedAt: null as number | null,
    history: [] as SettingsHistoryEntry[],
    hydrated: false,
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
    /** Load persisted state from IndexedDB. Idempotent. */
    async hydrate(): Promise<void> {
      if (this.hydrated)
        return
      const [stored, snapshot, history] = await Promise.all([
        idbGet<iFbMiniBtSettings | null>(IDB_KEY_SETTINGS),
        idbGet<iFbMiniBtSettings | null>(IDB_KEY_SNAPSHOT),
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

    /** Write current state to IndexedDB. Called automatically on mutation (debounced). */
    async persist(): Promise<void> {
      await Promise.all([
        idbSet(IDB_KEY_SETTINGS, this.local),
        idbSet(IDB_KEY_SNAPSHOT, this.lastDeviceSnapshot),
        idbSet(IDB_KEY_HISTORY, this.history),
      ])
    },

    /** Push a snapshot onto history, evicting oldest beyond HISTORY_LIMIT. */
    pushHistory(source: 'local' | 'device', settings?: iFbMiniBtSettings): void {
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

    /**
     * Called by bluetoothStore when the device's settings have been read.
     * Updates the device snapshot and seeds `local` if it's the first read.
     */
    applyDeviceSnapshot(snap: iFbMiniBtSettings): void {
      this.lastDeviceSnapshot = structuredClone(snap)
      this.lastSyncedAt = Date.now()
      if (!this.local)
        this.local = structuredClone(snap)
      this.pushHistory('device', snap)
    },

    /** UI-driven update of one or more fields. Pushes a history entry. */
    updateLocal(patch: Partial<iFbMiniBtSettings>): void {
      if (!this.local)
        return
      this.local = { ...this.local, ...patch }
      this.pushHistory('local')
    },

    /** Replace local wholesale (e.g. importing a preset). */
    replaceLocal(next: iFbMiniBtSettings): void {
      this.local = structuredClone(next)
      this.pushHistory('local')
    },

    /** Compute diff between `local` and a device snapshot (or current snapshot). */
    diff(other?: iFbMiniBtSettings): SettingsDiffEntry[] {
      const reference = other ?? this.lastDeviceSnapshot
      if (!this.local || !reference)
        return []
      const out: SettingsDiffEntry[] = []
      for (const key in this.local) {
        const k = key as keyof iFbMiniBtSettings
        if (JSON.stringify(this.local[k]) !== JSON.stringify(reference[k])) {
          out.push({ key: k, local: this.local[k], device: reference[k] })
        }
      }
      return out
    },

    /** Restore `local` to a previous history snapshot by timestamp. */
    revertTo(ts: number): boolean {
      const entry = this.history.find(e => e.ts === ts)
      if (!entry)
        return false
      this.local = structuredClone(entry.settings)
      this.pushHistory('local')
      return true
    },

    /** Mark `local` as in sync with the device (call after successful write). */
    markSynced(): void {
      if (!this.local)
        return
      this.lastDeviceSnapshot = structuredClone(this.local)
      this.lastSyncedAt = Date.now()
    },
  },
})

export default useSettingsStore
