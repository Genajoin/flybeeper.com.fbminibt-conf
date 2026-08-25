import { defineStore } from 'pinia'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { CPF_UUID_TO_GROUP } from '~/composables/useSettingsGroups'

/**
 * Keys that are settings. `local` used to accumulate non-UUID junk — most
 * notably `buzzer_simulate_vario_value`, written by useSimulation on every
 * slider move. The device snapshot can never contain such a key, so `diff()`
 * reported it as changed forever: the reconnect dialog popped on EVERY
 * connect with a phantom entry that no write could ever satisfy.
 */
function isSettingKey(key: string): boolean {
  return key in CPF_UUID_TO_GROUP
}

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
      // Compare settings only, and only where we actually know the device
      // value — a key missing from the snapshot means the read failed, not
      // that the user changed something.
      for (const key in state.local) {
        if (!isSettingKey(key) || state.lastDeviceSnapshot[key] === undefined)
          continue
        if (JSON.stringify(state.local[key]) !== JSON.stringify(state.lastDeviceSnapshot[key]))
          return true
      }
      return false
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
      this.pruneLocal()
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

    /**
     * Apply a partial preset on top of the current local values.
     *
     * File imports are partial by nature — an old ≤0.15 dump has no
     * `climb-off` / `sink-off` / UART-duplication entries at all — so
     * replacing the whole bag would silently reset every key the file
     * happens not to mention back to the factory demo value.
     */
    mergeLocal(patch: SettingsLocal): void {
      this.local = { ...(this.local ?? {}), ...cloneJson(patch) }
      this.pushHistory('local')
    },

    /**
     * Settings whose local value differs from the reference (device) value.
     *
     * Only real setting keys, and only keys the reference actually knows —
     * `reference[key] === undefined` means "we could not read it off the
     * device", which is a read failure to fix, not a change to apply. Listing
     * those produced the "08 fields changed / ↔ —" dialog that no Apply could
     * ever clear.
     */
    diff(other?: SettingsLocal): SettingsDiffEntry[] {
      const reference = other ?? this.lastDeviceSnapshot
      if (!this.local || !reference)
        return []
      const out: SettingsDiffEntry[] = []
      for (const key in this.local) {
        if (!isSettingKey(key) || reference[key] === undefined)
          continue
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

    /**
     * Declare the whole local state as matching the device.
     *
     * DANGEROUS unless every field really was written — this is what used to
     * be called unconditionally after Apply, so a write that silently did
     * nothing still ended up marked as synced. Prefer markSyncedKeys() with
     * the keys that were actually confirmed on the wire.
     */
    markSynced(): void {
      if (!this.local)
        return
      this.lastDeviceSnapshot = cloneJson(this.local)
      this.lastSyncedAt = Date.now()
    },

    /**
     * Record that exactly these keys are now confirmed to hold the local
     * value on the device. Keys that failed to write keep their old snapshot
     * value, so they stay visibly dirty instead of silently "applied".
     */
    markSyncedKeys(keys: string[]): void {
      if (!this.local || !keys.length)
        return
      const snap: SettingsLocal = { ...(this.lastDeviceSnapshot ?? {}) }
      for (const key of keys)
        snap[key] = cloneJson(this.local[key])
      this.lastDeviceSnapshot = snap
      this.lastSyncedAt = Date.now()
    },

    /**
     * Drop keys that are not settings (legacy junk such as
     * `buzzer_simulate_vario_value` persisted by older builds). Runs on load
     * so an old IDB slot cannot keep the reconnect dialog permanently armed.
     */
    pruneLocal(): void {
      if (!this.local)
        return
      const cleaned: SettingsLocal = {}
      let dropped = 0
      for (const key in this.local) {
        if (isSettingKey(key))
          cleaned[key] = this.local[key]
        else
          dropped++
      }
      if (dropped)
        this.local = cleaned
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
