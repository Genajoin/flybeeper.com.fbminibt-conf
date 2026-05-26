<script setup lang="ts">
const { t } = useI18n()

const DISMISS_KEY = 'fb:bluefy-banner-dismissed-v1'

const dismissed = ref(false)

// iOS Safari = (iPhone | iPad | iPod) UA AND no `navigator.bluetooth`.
// On Bluefy itself navigator.bluetooth is present, so the banner stays hidden.
const isIosSafariWithoutBluetooth = computed(() => {
  if (typeof navigator === 'undefined')
    return false
  if ('bluetooth' in navigator)
    return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
})

const show = computed(() => isIosSafariWithoutBluetooth.value && !dismissed.value)

const bluefyHref = computed(() => {
  if (typeof window === 'undefined')
    return 'bluefy://'
  return `bluefy://open?url=${encodeURIComponent(window.location.href)}`
})

onMounted(() => {
  if (typeof window === 'undefined')
    return
  dismissed.value = window.localStorage.getItem(DISMISS_KEY) === '1'
})

function dismiss() {
  dismissed.value = true
  if (typeof window !== 'undefined')
    window.localStorage.setItem(DISMISS_KEY, '1')
}
</script>

<template>
  <Transition name="bluefy">
    <div v-if="show" class="bluefy" role="status" aria-live="polite">
      <span class="bluefy__msg">{{ t('pair.ios-banner-body') }}</span>
      <a class="bluefy__cta" :href="bluefyHref">{{ t('pair.open-bluefy') }}</a>
      <button
        class="bluefy__close"
        :aria-label="t('local.dismiss')"
        @click="dismiss"
      >
        ×
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.bluefy {
  position: sticky;
  top: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-sm);
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-ink);
  color: var(--ck-paper);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-signal);
}

.bluefy__msg {
  text-align: left;
  flex: 1;
}

.bluefy__cta {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  font-weight: 700;
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border-radius: var(--ck-radius-soft);
  text-decoration: none;
  white-space: nowrap;
}

.bluefy__cta:hover {
  background: var(--ck-paper);
  color: var(--ck-ink);
}

.bluefy__close {
  background: transparent;
  border: none;
  color: var(--ck-paper);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 var(--ck-s-xs);
}

.bluefy__close:hover {
  opacity: 0.8;
}

.bluefy-enter-active,
.bluefy-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.bluefy-enter-from,
.bluefy-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
