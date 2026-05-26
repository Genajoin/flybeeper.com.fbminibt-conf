<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()
</script>

<template>
  <PairingWizard v-if="!bt.isConnected" />

  <section v-else class="cockpit">
    <header class="cockpit__head">
      <p class="cockpit__eyebrow">
        {{ t('button.cockpit') }}
      </p>
      <h1 class="cockpit__title">
        {{ bt.dis.modelNumberString.value || '—' }}
      </h1>
      <p class="cockpit__meta">
        {{ bt.dis.manufacturerNameString.value }} · fw {{ bt.dis.firmwareRevisionString.value || '—' }}
      </p>
    </header>

    <Suspense>
      <TheParams />
      <template #fallback>
        <div class="cockpit__loading">
          <span class="cockpit__spinner i-carbon-fade animate-spin" aria-hidden="true" />
          <span>{{ t('msg.fetching') }}…</span>
        </div>
      </template>
    </Suspense>

    <noSleep />
  </section>
</template>

<style scoped>
.cockpit {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-lg);
}

.cockpit__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
  text-align: left;
}

.cockpit__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-signal);
  margin: 0;
}

.cockpit__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h1);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  margin: 0;
}

.cockpit__meta {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
}

.cockpit__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-sm);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  padding: var(--ck-s-xl);
}

.cockpit__spinner {
  width: 24px;
  height: 24px;
}
</style>
