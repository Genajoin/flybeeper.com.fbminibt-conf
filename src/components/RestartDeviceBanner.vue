<script setup lang="ts">
const settings = useSettingsStore()
const bt = useBluetoothStore()
const { t } = useI18n()

const dismissed = ref(false)

// Visible while a write that mutated a RESTART_REQUIRED field hasn't been
// followed by a disconnect. The flag is cleared in bluetoothStore.onDisconnected
// (treated as proxy for power-cycle). Local dismiss is a per-session escape
// hatch — it resets the next time the flag toggles back to false→true.
const show = computed(() => settings.restartPending && !dismissed.value)

watch(() => settings.restartPending, (now) => {
  if (now)
    dismissed.value = false
})

// Also reset dismissal on reconnect — fresh connection, fresh banner if the
// device reports the unchanged value (user didn't actually reboot).
watch(() => bt.isConnected, (now) => {
  if (now)
    dismissed.value = false
})
</script>

<template>
  <Transition name="restart">
    <div v-if="show" class="restart" role="status" aria-live="polite">
      <span class="restart__msg">{{ t('sett.restart-device') }}</span>
      <button
        class="restart__close"
        :aria-label="t('local.dismiss')"
        @click="dismissed = true"
      >
        ×
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.restart {
  position: sticky;
  top: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-md);
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-bg-deep);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
  font-weight: 600;
  border-bottom: var(--ck-stroke-rule) dashed var(--ck-signal);
}

.restart__msg {
  text-align: left;
}

.restart__close {
  background: transparent;
  border: none;
  color: var(--ck-ink);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 var(--ck-s-xs);
}

.restart__close:hover {
  opacity: 0.7;
}

.restart-enter-active,
.restart-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.restart-enter-from,
.restart-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
