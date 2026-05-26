<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()
</script>

<template>
  <PairingWizard v-if="!bt.isConnected" />

  <section v-else class="terminal-page">
    <PageHeader
      breadcrumb-to="/cockpit"
      :breadcrumb-label="t('dashboard.back-dashboard')"
      :eyebrow="t('button.terminal')"
      :title="bt.dis.modelNumberString.value || '—'"
      :sub="`${bt.dis.manufacturerNameString.value} · fw ${bt.dis.firmwareRevisionString.value || '—'}`"
    />

    <Suspense>
      <TheTerminal />
      <template #fallback>
        <div class="terminal-page__loading">
          <span>{{ t('msg.fetching') }}…</span>
        </div>
      </template>
    </Suspense>
  </section>
</template>

<style scoped>
.terminal-page {
  background: var(--ck-bg);
  color: var(--ck-ink);
  display: flex;
  flex-direction: column;
}

.terminal-page__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  padding: var(--ck-s-xl);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}
</style>
