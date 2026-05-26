<script setup lang="ts">
const bt = useBluetoothStore()
const saved = useSavedDevicesStore()
const { t } = useI18n()

const WIZARD_SEEN_KEY = 'fb:wizard-seen-v1'

const wizardSeen = ref(false)
if (typeof window !== 'undefined')
  wizardSeen.value = window.localStorage.getItem(WIZARD_SEEN_KEY) === '1'

const showExplainer = computed(() =>
  !wizardSeen.value && saved.devices.length === 0,
)
const showConnect = computed(() =>
  wizardSeen.value && saved.devices.length === 0,
)

function dismissExplainer() {
  wizardSeen.value = true
  if (typeof window !== 'undefined')
    window.localStorage.setItem(WIZARD_SEEN_KEY, '1')
}

function connect() {
  if (!wizardSeen.value)
    dismissExplainer()
  bt.connectToRequestDevice()
}

const bullets = computed(() => [
  { t: t('pair.explainer-bullet-1-title'), d: t('pair.explainer-bullet-1-desc') },
  { t: t('pair.explainer-bullet-2-title'), d: t('pair.explainer-bullet-2-desc') },
  { t: t('pair.explainer-bullet-3-title'), d: t('pair.explainer-bullet-3-desc') },
  { t: t('pair.explainer-bullet-4-title'), d: t('pair.explainer-bullet-4-desc') },
])
</script>

<template>
  <!-- iOS / Firefox / unsupported browser -->
  <section v-if="!bt.bleAvailable" class="wizard">
    <PageHeader
      :eyebrow="t('pair.ios-eyebrow')"
      :title="t('pair.unsupported-title')"
      :sub="t('pair.unsupported-body')"
    />
  </section>

  <!-- Step 1: 4-bullet explainer (first-ever visit) -->
  <section v-else-if="showExplainer" class="wizard">
    <PageHeader breadcrumb-label="FB · MINI-BT" right="01 / 02">
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('pair.step1-eyebrow') }}
        </CkEyebrow>
        <h1 class="wizard__display">
          {{ t('pair.step1-title-line1') }}<br>{{ t('pair.step1-title-line2') }}<br>{{ t('pair.step1-title-line3') }}
        </h1>
      </template>
    </PageHeader>

    <div class="wizard__bullets">
      <div v-for="(b, i) in bullets" :key="i" class="wizard__bullet">
        <span class="wizard__bullet-num">0{{ i + 1 }}</span>
        <div class="wizard__bullet-text">
          <div class="wizard__bullet-title">
            {{ b.t }}
          </div>
          <div class="wizard__bullet-desc">
            {{ b.d }}
          </div>
        </div>
      </div>
    </div>

    <div class="wizard__cta-row">
      <CkCTA kind="signal" @click="connect">
        {{ t('pair.continue') }}
      </CkCTA>
    </div>
  </section>

  <!-- Step 2: power-on + connect (explainer dismissed, no saved devices) -->
  <section v-else-if="showConnect" class="wizard">
    <PageHeader breadcrumb-label="← BACK" right="02 / 02">
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('pair.step2-eyebrow') }}
        </CkEyebrow>
        <h1 class="wizard__display wizard__display--md">
          {{ t('pair.step2-title-line1') }}<br>{{ t('pair.step2-title-line2') }}
        </h1>
        <p class="wizard__sub">
          {{ t('pair.step2-sub') }}
        </p>
      </template>
    </PageHeader>

    <div class="wizard__connect">
      <div class="wizard__frame wizard__frame--1" />
      <div class="wizard__frame wizard__frame--2" />
      <div class="wizard__frame wizard__frame--3" />
      <DeviceTopdown :scale="0.7" :show-callouts="false" />
    </div>

    <div class="wizard__cta-row">
      <CkCTA kind="signal" :disabled="bt.isConnecting || bt.isFetching" @click="connect">
        {{ t('pair.step2-cta') }}
      </CkCTA>
      <div class="wizard__meta">
        <span>{{ t('pair.step2-meta-left') }}</span>
        <span>{{ t('pair.step2-meta-right') }}</span>
      </div>
    </div>

    <p v-if="bt.errorMessage" class="wizard__error">
      {{ bt.errorMessage }}
    </p>
  </section>

  <!-- Step 3: list of saved devices -->
  <section v-else class="wizard">
    <PageHeader breadcrumb-label="SAVED" :right="`${saved.devices.length} PAIRED`">
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('pair.saved-eyebrow') }}
        </CkEyebrow>
        <h1 class="wizard__display wizard__display--md">
          {{ t('pair.saved-count', { count: saved.devices.length }) }}
        </h1>
        <div class="wizard__scanning">
          <span class="wizard__scan-dot" />
          <span>{{ t('pair.saved-scanning', { count: saved.devices.length }) }}</span>
        </div>
      </template>
    </PageHeader>

    <SavedDevicesList />

    <button class="wizard__pair-new" type="button" :disabled="bt.isConnecting || bt.isFetching" @click="connect">
      {{ t('pair.pair-new') }}
    </button>

    <p v-if="bt.errorMessage" class="wizard__error">
      {{ bt.errorMessage }}
    </p>

    <InvertedFooter />
  </section>
</template>

<style scoped>
.wizard {
  display: flex;
  flex-direction: column;
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  background: var(--ck-bg);
}

.wizard__display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 48px;
  letter-spacing: -2px;
  line-height: 0.92;
  margin: 12px 0 0;
  text-transform: uppercase;
  color: var(--ck-ink);
}

.wizard__display--md {
  font-size: 36px;
  letter-spacing: -1.3px;
  line-height: 0.95;
  margin: 6px 0 8px;
}

.wizard__sub {
  font-family: var(--ck-font-mono);
  font-size: 12px;
  color: var(--ck-dim);
  letter-spacing: 0.5px;
  margin: 6px 0 0;
  line-height: 1.5;
}

.wizard__bullets {
  display: grid;
  grid-template-columns: 1fr;
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
}

.wizard__bullet {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.wizard__bullet-num {
  font-family: var(--ck-font-mono);
  font-size: 24px;
  font-weight: 700;
  color: var(--ck-signal);
  letter-spacing: -1px;
  line-height: 1;
}

.wizard__bullet-text {
  flex: 1;
}

.wizard__bullet-title {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 17px;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: -0.3px;
}

.wizard__bullet-desc {
  font-size: 12px;
  color: var(--ck-dim);
  line-height: 1.5;
}

.wizard__connect {
  position: relative;
  flex: 1;
  min-height: 320px;
  background: var(--ck-paper);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  overflow: hidden;
}

.wizard__frame {
  position: absolute;
  border: 1px solid var(--ck-ink);
  opacity: 0.6;
  pointer-events: none;
}

.wizard__frame--1 {
  width: 180px;
  height: 180px;
}

.wizard__frame--2 {
  width: 226px;
  height: 226px;
  border-style: dashed;
  opacity: 0.42;
}

.wizard__frame--3 {
  width: 272px;
  height: 272px;
  border-style: dashed;
  opacity: 0.24;
}

.wizard__cta-row {
  padding: 14px 22px;
  background: var(--ck-paper);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wizard__meta {
  display: flex;
  justify-content: space-between;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.wizard__pair-new {
  width: 100%;
  padding: 16px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  cursor: pointer;
  background-image: repeating-linear-gradient(
    45deg,
    color-mix(in srgb, var(--ck-ink) 6%, transparent) 0 1px,
    transparent 1px 8px
  );
}

.wizard__pair-new:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wizard__scanning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-ink);
  font-weight: 700;
}

.wizard__scan-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ck-signal);
}

.wizard__error {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-signal);
  padding: 12px 22px;
  margin: 0;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-signal);
}

@media (min-width: 960px) {
  .wizard__bullets {
    grid-template-columns: 1fr 1fr;
  }
  .wizard__bullet:nth-child(odd) {
    border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  }
  .wizard__display {
    font-size: 84px;
  }
  .wizard__frame--1 {
    width: 240px;
    height: 240px;
  }
  .wizard__frame--2 {
    width: 320px;
    height: 320px;
  }
  .wizard__frame--3 {
    width: 400px;
    height: 400px;
  }
}
</style>
