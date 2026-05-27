<script setup lang="ts">
import { useInstallPrompt } from '~/composables/useInstallPrompt'

const SHOWN_KEY = 'fb:install-toast-shown-v1'
const { canInstall, install } = useInstallPrompt()
const saved = useSavedDevicesStore()
const { t } = useI18n()

const dismissed = ref(false)
const everSeenPair = ref(false)

if (typeof window !== 'undefined') {
  dismissed.value = window.localStorage.getItem(SHOWN_KEY) === '1'
}

// Track the 0→1 transition: only show the toast the first time the user
// completes a pairing. Subsequent pairings don't re-prompt.
watch(() => saved.devices.length, (n, prev) => {
  if (prev === 0 && n >= 1)
    everSeenPair.value = true
}, { immediate: true })

const show = computed(() => everSeenPair.value && canInstall.value && !dismissed.value)

function dismiss() {
  dismissed.value = true
  if (typeof window !== 'undefined')
    window.localStorage.setItem(SHOWN_KEY, '1')
}

async function accept() {
  await install()
  dismiss()
}
</script>

<template>
  <Transition name="toast">
    <div v-if="show" class="toast" role="status" aria-live="polite">
      <div class="toast__icon">
        <Icon name="install" :size="22" stroke="var(--ck-on-signal)" />
      </div>
      <div class="toast__body">
        <CkEyebrow color="var(--ck-signal)">
          {{ t('install.eyebrow') }}
        </CkEyebrow>
        <div class="toast__title">
          {{ t('install.title') }}
        </div>
      </div>
      <button class="toast__cta" type="button" @click="accept">
        {{ t('install.cta') }}
      </button>
      <button class="toast__close" type="button" :aria-label="t('local.dismiss')" @click="dismiss">
        <Icon name="close" :size="14" stroke="var(--ck-paper)" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  background: var(--ck-ink);
  color: var(--ck-paper);
  font-family: var(--ck-font-body);
  border-top: var(--ck-stroke-rule) solid var(--ck-signal);
}

.toast__icon {
  width: 38px;
  height: 38px;
  background: var(--ck-signal);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast__body {
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
  margin-top: 3px;
}

.toast__cta {
  padding: 8px 14px;
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border: none;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  cursor: pointer;
  border-radius: 0;
}

.toast__close {
  background: transparent;
  border: none;
  color: var(--ck-paper);
  cursor: pointer;
  padding: 0 4px;
  opacity: 0.7;
}

.toast__close:hover {
  opacity: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.toast-enter-from,
.toast-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
