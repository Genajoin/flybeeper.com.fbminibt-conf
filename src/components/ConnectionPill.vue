<script setup lang="ts">
import { computed } from 'vue'

/**
 * Single OFFLINE/ONLINE pill rendered in PageHeader's right strip slot.
 * Replaces what used to be a separate "OFFLINE" static text + an explicit
 * CONNECT/DISCONNECT button — one tap on the pill toggles the connection
 * (and on iOS / unsupported browsers the pill stays disabled but visible
 * so the state is still legible).
 */
const bt = useBluetoothStore()
const { t } = useI18n()

const busy = computed(() => bt.isConnecting || bt.isFetching)

const label = computed(() => {
  if (busy.value)
    return t('dashboard.connecting-eyebrow')
  return bt.isConnected ? t('dashboard.synced') : t('dashboard.offline-eyebrow')
})

function onClick() {
  if (busy.value) {
    bt.cancelConnect()
    return
  }
  if (bt.isConnected) {
    bt.disconnectDevice()
    return
  }
  bt.connectToRequestDevice()
}
</script>

<template>
  <button
    type="button"
    class="pill"
    :class="{
      'pill--on': bt.isConnected,
      'pill--off': !bt.isConnected && !busy,
      'pill--busy': busy,
    }"
    :disabled="!bt.bleAvailable && !bt.isConnected"
    @click="onClick"
  >
    <span class="pill__text">{{ label }}</span>
    <CkDots v-if="busy" />
  </button>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-paper);
  cursor: pointer;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  border-radius: 0;
  white-space: nowrap;
}

.pill:hover:not(:disabled) {
  background: var(--ck-bg-deep);
}

.pill:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* ONLINE state is the one we want to call attention to — orange so the
 * user sees at a glance that the device is live. OFFLINE is the resting
 * state, so it stays in the regular ink colour and doesn't compete with
 * other UI. Busy stays orange while the connection attempt is in flight. */
.pill--on,
.pill--busy {
  color: var(--ck-signal);
}

.pill--off {
  color: var(--ck-ink);
}
</style>
