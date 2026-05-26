<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()

const dismissed = ref(false)

const show = computed(() =>
  bt.hasConnectedThisSession && !bt.isConnected && !dismissed.value,
)

// Reset the dismissal whenever the user reconnects so the next disconnect
// surfaces the banner again.
watch(() => bt.isConnected, (now) => {
  if (now)
    dismissed.value = false
})
</script>

<template>
  <Transition name="banner">
    <div v-if="show" class="banner" role="status" aria-live="polite">
      <span class="banner__msg">{{ t('local.disconnected-banner') }}</span>
      <button
        class="banner__close"
        :aria-label="t('local.dismiss')"
        @click="dismissed = true"
      >
        ×
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.banner {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-md);
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
  font-weight: 600;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.banner__msg {
  text-align: left;
}

.banner__close {
  background: transparent;
  border: none;
  color: var(--ck-on-signal);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 var(--ck-s-xs);
}

.banner__close:hover {
  opacity: 0.8;
}

.banner-enter-active,
.banner-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.banner-enter-from,
.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
