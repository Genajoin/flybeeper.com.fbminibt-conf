<script setup lang="ts">
const bt = useBluetoothStore()
const saved = useSavedDevicesStore()
const { t } = useI18n()

const WIZARD_SEEN_KEY = 'fb:wizard-seen-v1'

// SSR-safe localStorage read.
const wizardSeen = ref(false)
if (typeof window !== 'undefined')
  wizardSeen.value = window.localStorage.getItem(WIZARD_SEEN_KEY) === '1'

// Step 1 (explainer) shows on first-ever visit when no devices are saved yet.
// Returning users skip straight to the connect step; first-pair users see it
// once and then it sticks dismissed.
const showExplainer = computed(() =>
  !wizardSeen.value && saved.devices.length === 0,
)

function dismissExplainer() {
  wizardSeen.value = true
  if (typeof window !== 'undefined')
    window.localStorage.setItem(WIZARD_SEEN_KEY, '1')
}

function connect() {
  // Implicit-dismiss: tapping Connect from the explainer is acceptance.
  if (!wizardSeen.value)
    dismissExplainer()
  bt.connectToRequestDevice()
}
</script>

<template>
  <!-- Web Bluetooth unsupported (e.g. iOS Safari, Firefox). The BluefyBanner
       on the layout level handles the deep-link CTA — here we just describe
       the situation so the page still has shape. -->
  <section v-if="!bt.bleAvailable" class="wizard wizard--unsupported">
    <h2 class="wizard__title">
      {{ t('pair.unsupported-title') }}
    </h2>
    <p class="wizard__body">
      {{ t('pair.unsupported-body') }}
    </p>
  </section>

  <!-- Step 1: one-time explainer -->
  <section v-else-if="showExplainer" class="wizard">
    <h2 class="wizard__title">
      {{ t('pair.explainer-title') }}
    </h2>
    <p class="wizard__body">
      {{ t('pair.explainer-body') }}
    </p>
    <p class="wizard__meta">
      {{ t('pair.explainer-supported') }}
    </p>
    <div class="wizard__actions">
      <button class="wizard__btn wizard__btn--primary" @click="connect">
        {{ t('pair.connect') }}
      </button>
      <button class="wizard__btn wizard__btn--ghost" @click="dismissExplainer">
        {{ t('pair.continue') }}
      </button>
    </div>
  </section>

  <!-- Step 2: connect + saved devices -->
  <section v-else class="wizard">
    <header class="wizard__head">
      <h2 class="wizard__title">
        {{ t('pair.saved-title') }}
      </h2>
      <button
        class="wizard__btn wizard__btn--primary"
        :disabled="bt.isConnecting || bt.isFetching"
        @click="connect"
      >
        {{ saved.devices.length ? t('pair.connect-another') : t('pair.connect') }}
      </button>
    </header>

    <SavedDevicesList />

    <p v-if="bt.errorMessage" class="wizard__error">
      {{ bt.errorMessage }}
    </p>
  </section>
</template>

<style scoped>
.wizard {
  background: var(--ck-paper);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  text-align: left;
  padding: var(--ck-s-lg);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  max-width: 560px;
  margin: var(--ck-s-md) auto;
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
}

.wizard--unsupported {
  border-color: var(--ck-signal);
}

.wizard__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ck-s-md);
  flex-wrap: wrap;
}

.wizard__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h1);
  font-weight: 700;
  margin: 0;
  line-height: var(--ck-line-tight);
}

.wizard__body {
  font-size: var(--ck-fs-body);
  line-height: var(--ck-line-body);
  margin: 0;
}

.wizard__meta {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
  margin: 0;
}

.wizard__actions {
  display: flex;
  gap: var(--ck-s-sm);
  flex-wrap: wrap;
}

.wizard__btn {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  font-weight: 600;
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
}

.wizard__btn:disabled {
  background: var(--ck-bg-deep);
  border-color: var(--ck-grid);
  color: var(--ck-dim);
  cursor: not-allowed;
}

.wizard__btn--primary {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border-color: var(--ck-signal);
}

.wizard__btn--primary:hover:not(:disabled) {
  background: var(--ck-ink);
  border-color: var(--ck-ink);
}

.wizard__btn--ghost {
  border-color: transparent;
}

.wizard__btn--ghost:hover {
  border-color: var(--ck-grid);
}

.wizard__error {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-signal);
  margin: 0;
}
</style>
