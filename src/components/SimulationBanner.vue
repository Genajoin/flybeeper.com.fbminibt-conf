<script setup lang="ts">
const { isActive, valueMs, stop } = useSimulation()
const bt = useBluetoothStore()
const { t } = useI18n()

// Only surface the banner while connected. If the device disappears mid-sim,
// the value is moot anyway (we just remember it locally for the next session).
const show = computed(() => bt.isConnected && isActive.value)
</script>

<template>
  <Transition name="sim">
    <div v-if="show" class="sim" role="status" aria-live="polite">
      <span class="sim__msg">
        {{ t('audio.simulation-active', { value: valueMs.toFixed(1) }) }}
      </span>
      <button class="sim__stop" @click="stop">
        {{ t('audio.stop-simulation') }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.sim {
  position: sticky;
  top: 0;
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-md);
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-ink);
  color: var(--ck-paper);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  font-weight: 600;
  letter-spacing: var(--ck-track-eyebrow);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-signal);
}

.sim__msg {
  text-align: left;
  text-transform: uppercase;
}

.sim__stop {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
  font-weight: 700;
  padding: var(--ck-s-xs) var(--ck-s-sm);
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border: none;
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: var(--ck-track-eyebrow);
}

.sim__stop:hover {
  background: var(--ck-paper);
  color: var(--ck-ink);
}

.sim-enter-active,
.sim-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.sim-enter-from,
.sim-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
