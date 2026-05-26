<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()
</script>

<template>
  <PairingWizard v-if="!bt.isConnected" />

  <section v-else class="terminal-page">
    <header class="terminal-page__head">
      <p class="terminal-page__eyebrow">
        {{ t('button.terminal') }}
      </p>
      <h1 class="terminal-page__title">
        {{ bt.dis.modelNumberString.value || '—' }}
      </h1>
      <p class="terminal-page__meta">
        {{ bt.dis.manufacturerNameString.value }} · fw {{ bt.dis.firmwareRevisionString.value || '—' }}
      </p>
    </header>

    <Suspense>
      <TheTerminal />
      <template #fallback>
        <div class="terminal-page__loading">
          <span class="terminal-page__spinner i-carbon-fade animate-spin" aria-hidden="true" />
          <span>{{ t('msg.fetching') }}…</span>
        </div>
      </template>
    </Suspense>
  </section>
</template>

<style scoped>
.terminal-page {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-lg);
}

.terminal-page__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
  text-align: left;
}

.terminal-page__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-signal);
  margin: 0;
}

.terminal-page__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h1);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  margin: 0;
}

.terminal-page__meta {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
}

.terminal-page__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-sm);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  padding: var(--ck-s-xl);
}

.terminal-page__spinner {
  width: 24px;
  height: 24px;
}
</style>
