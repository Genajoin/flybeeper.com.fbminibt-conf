<script setup lang="ts">
import log from 'loglevel'
import { describeWriteError } from '~/utils/write-errors'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t, te } = useI18n()

/**
 * Human label for a characteristic. `sett.<uuid>` labels already exist in
 * every locale — the dialog just wasn't using them, so it listed raw UUIDs
 * and left the user guessing which setting was in conflict.
 */
function keyLabel(key: string): string {
  return te(`sett.${key}`) ? t(`sett.${key}`) : key
}

const open = ref(false)
const seenForConnection = ref(false)

watch(() => bt.isConnected, (now) => {
  if (!now)
    seenForConnection.value = false
})

watch(() => settings.lastSyncedAt, (newTs, oldTs) => {
  if (!newTs || newTs === oldTs)
    return
  if (!settings.hasUnsyncedChanges || seenForConnection.value)
    return
  open.value = true
  seenForConnection.value = true
})

const diffEntries = computed(() => settings.diff())

function formatValue(v: unknown): string {
  if (v === null || v === undefined)
    return '—'
  if (typeof v === 'boolean')
    return v ? '✓' : '✗'
  if (Array.isArray(v))
    return `[${v.join(', ')}]`
  if (typeof v === 'object')
    return JSON.stringify(v)
  return String(v)
}

const isApplying = ref(false)
const applyErrors = ref<{ key: string, message: string }[]>([])

async function applyLocal() {
  if (!settings.local || !bt.isConnected)
    return
  isApplying.value = true
  applyErrors.value = []
  const written: string[] = []
  const failed: { key: string, message: string }[] = []
  try {
    // Snapshot: diffEntries is a computed over the store and shrinks as
    // writes are confirmed.
    for (const entry of [...diffEntries.value]) {
      try {
        await bt.writeCharacteristic(entry.key, entry.local)
        written.push(entry.key)
      }
      catch (err) {
        log.error('apply failed', entry.key, err)
        failed.push({ key: entry.key, message: describeWriteError(err, t) })
      }
    }
    // Only confirmed writes count. Closing the dialog on failures — as the
    // unconditional markSynced() used to do — is what made the device look
    // updated while it kept the old values, then re-raised the same dialog
    // on the next connect.
    settings.markSyncedKeys(written)
    applyErrors.value = failed
    if (!failed.length)
      open.value = false
  }
  finally {
    isApplying.value = false
  }
}

function discardLocal() {
  if (settings.lastDeviceSnapshot)
    settings.replaceLocal(settings.lastDeviceSnapshot)
  open.value = false
}

function dismiss() {
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reconnect-diff-title"
        @click.self="dismiss"
      >
        <div class="modal-sheet">
          <div class="modal-strip">
            <button class="modal-crumb" type="button" @click="dismiss">
              ← BACK
            </button>
            <span class="modal-strip__spacer" />
            <span class="modal-title-eyebrow">UNSAVED CHANGES</span>
            <span class="modal-strip__count">
              {{ String(diffEntries.length).padStart(2, '0') }} {{ t('local.changes-count', { count: diffEntries.length }).split(' ').slice(1).join(' ').toUpperCase() }}
            </span>
          </div>

          <div class="modal-head">
            <CkEyebrow color="var(--ck-signal)" block>
              {{ t('local.reconnect-diff-title') }}
            </CkEyebrow>
            <h2 id="reconnect-diff-title" class="modal-display">
              {{ t('local.reconnect-diff-body') }}
            </h2>
          </div>

          <ul class="modal-diff">
            <li v-for="entry in diffEntries" :key="entry.key" class="modal-diff__row">
              <span class="modal-diff__key" :title="entry.key">{{ keyLabel(entry.key) }}</span>
              <span class="modal-diff__values">
                <span class="modal-diff__local">{{ formatValue(entry.local) }}</span>
                <span class="modal-diff__arrow">↔</span>
                <span class="modal-diff__device">{{ formatValue(entry.device) }}</span>
              </span>
            </li>
          </ul>

          <div v-if="applyErrors.length" class="modal-errors" role="alert">
            <span class="modal-errors__head">{{ t('sett.apply-failed', { count: applyErrors.length }) }}</span>
            <code v-for="e in applyErrors" :key="e.key" class="modal-errors__row">{{ e.message }}</code>
          </div>

          <div class="modal-actions">
            <button class="modal-btn modal-btn--signal" type="button" :disabled="isApplying || !bt.isConnected" @click="applyLocal">
              {{ t('local.apply-local') }}
            </button>
            <button class="modal-btn" type="button" @click="discardLocal">
              {{ t('local.discard-local') }}
            </button>
            <button class="modal-btn" type="button" @click="dismiss">
              {{ t('local.decide-later') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--ck-font-body);
}

.modal-sheet {
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  width: 100%;
  height: 100%;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
}

.modal-strip {
  display: flex;
  align-items: stretch;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.modal-crumb {
  padding: 10px 18px;
  background: transparent;
  border: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  cursor: pointer;
}

.modal-strip__spacer {
  flex: 1;
}

.modal-title-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 10px 18px;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}

.modal-strip__count {
  display: inline-flex;
  align-items: center;
  padding: 10px 18px;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  color: var(--ck-signal);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
}

.modal-head {
  padding: 20px 22px 14px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.modal-display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 28px;
  letter-spacing: -1px;
  line-height: 0.95;
  margin: 6px 0 0;
  text-transform: uppercase;
}

.modal-diff {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
}

.modal-diff__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 12px 22px;
  border-bottom: var(--ck-stroke-hair) dashed var(--ck-ink);
  font-size: var(--ck-fs-meta);
}

.modal-diff__key {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
}

.modal-diff__values {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--ck-font-mono);
  font-size: 12px;
  text-align: right;
}

.modal-diff__local {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 14px;
  color: var(--ck-ink);
}

.modal-diff__arrow {
  color: var(--ck-dim);
}

.modal-diff__device {
  color: var(--ck-dim);
}

.modal-errors {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  border-top: var(--ck-stroke-rule) solid var(--ck-signal);
  background: var(--ck-bg-deep);
}

.modal-errors__head {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-signal);
}

.modal-errors__row {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
  word-break: break-word;
}

.modal-actions {
  display: flex;
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
}

.modal-btn {
  flex: 1;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  padding: 16px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  cursor: pointer;
  border-radius: 0;
}

.modal-btn:first-child {
  border-left: none;
}

.modal-btn:hover {
  background: var(--ck-bg-deep);
}

.modal-btn--signal {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.modal-btn--signal:hover {
  filter: brightness(1.05);
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--ck-dur-panel) var(--ck-ease);
}

.modal-enter-active .modal-sheet,
.modal-leave-active .modal-sheet {
  transition: transform var(--ck-dur-panel) var(--ck-ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-sheet,
.modal-leave-to .modal-sheet {
  transform: translateY(20px);
}

@media (min-width: 720px) {
  .modal-overlay {
    padding: var(--ck-s-md);
  }
  .modal-sheet {
    max-width: 640px;
    max-height: 80vh;
    width: 100%;
    height: auto;
  }
}
</style>
