<script setup lang="ts">
const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()

const open = ref(false)
// Prevent re-popping on every device notification within one connection
// session — only the first divergent read triggers; user dismissal sticks
// until disconnect.
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

async function applyLocal() {
  if (!settings.local)
    return
  await bt.writeMiniBtSettings(settings.local)
  open.value = false
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
        <div class="modal-card">
          <h2 id="reconnect-diff-title" class="modal-title">
            {{ t('local.reconnect-diff-title') }}
          </h2>
          <p class="modal-body">
            {{ t('local.reconnect-diff-body') }}
          </p>
          <p class="modal-meta">
            {{ t('local.changes-count', { count: diffEntries.length }) }}
          </p>
          <ul class="modal-diff">
            <li v-for="entry in diffEntries" :key="entry.key" class="modal-diff__row">
              <code class="modal-diff__key">{{ entry.key }}</code>
              <span class="modal-diff__values">
                <span class="modal-diff__local">{{ formatValue(entry.local) }}</span>
                <span class="modal-diff__arrow">↔</span>
                <span class="modal-diff__device">{{ formatValue(entry.device) }}</span>
              </span>
            </li>
          </ul>
          <div class="modal-actions">
            <button class="modal-btn modal-btn--primary" @click="applyLocal">
              {{ t('local.apply-local') }}
            </button>
            <button class="modal-btn" @click="discardLocal">
              {{ t('local.discard-local') }}
            </button>
            <button class="modal-btn modal-btn--ghost" @click="dismiss">
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
  padding: var(--ck-s-md);
}

.modal-card {
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-soft);
  max-width: 560px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: var(--ck-s-lg);
  font-family: var(--ck-font-body);
  text-align: left;
}

.modal-title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h2);
  font-weight: 700;
  margin: 0 0 var(--ck-s-sm) 0;
  line-height: var(--ck-line-tight);
}

.modal-body {
  font-size: var(--ck-fs-body);
  line-height: var(--ck-line-body);
  margin: 0 0 var(--ck-s-sm) 0;
}

.modal-meta {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
  margin: 0 0 var(--ck-s-sm) 0;
}

.modal-diff {
  list-style: none;
  margin: 0 0 var(--ck-s-lg) 0;
  padding: 0;
  border: var(--ck-stroke-hair) dashed var(--ck-grid);
}

.modal-diff__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ck-s-md);
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border-bottom: var(--ck-stroke-hair) dashed var(--ck-grid);
  font-size: var(--ck-fs-meta);
}

.modal-diff__row:last-child {
  border-bottom: none;
}

.modal-diff__key {
  font-family: var(--ck-font-mono);
  color: var(--ck-ink-dim);
}

.modal-diff__values {
  display: flex;
  align-items: center;
  gap: var(--ck-s-xs);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  white-space: nowrap;
  overflow-x: auto;
  max-width: 60%;
}

.modal-diff__local {
  color: var(--ck-signal);
  font-weight: 700;
}

.modal-diff__arrow {
  color: var(--ck-dim);
}

.modal-diff__device {
  color: var(--ck-ink-dim);
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ck-s-sm);
  justify-content: flex-end;
}

.modal-btn {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  font-weight: 600;
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
  transition: background var(--ck-dur-toggle) var(--ck-ease);
}

.modal-btn:hover {
  background: var(--ck-bg-deep);
}

.modal-btn--primary {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border-color: var(--ck-signal);
}

.modal-btn--primary:hover {
  background: var(--ck-ink);
  border-color: var(--ck-ink);
}

.modal-btn--ghost {
  border-color: transparent;
}

.modal-btn--ghost:hover {
  border-color: var(--ck-grid);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--ck-dur-panel) var(--ck-ease);
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform var(--ck-dur-panel) var(--ck-ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.95) translateY(-10px);
}
</style>
