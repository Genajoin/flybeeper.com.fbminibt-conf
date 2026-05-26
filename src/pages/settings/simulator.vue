<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="sim-panel">
    <PageHeader
      breadcrumb-to="/settings"
      :breadcrumb-label="t('dashboard.back-dashboard')"
      :eyebrow="t('sett.group-simulator')"
      :title="t('sett.group-simulator-desc')"
    />

    <div class="sim-panel__body">
      <SimulatorControls />
    </div>
  </section>
</template>

<style scoped>
.sim-panel {
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.sim-panel__body {
  padding: 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}
</style>
