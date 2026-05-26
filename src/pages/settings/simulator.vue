<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="sim-panel">
    <header class="sim-panel__head">
      <p class="sim-panel__eyebrow">
        {{ t('sett.group-simulator') }}
      </p>
      <p class="sim-panel__desc">
        {{ t('sett.group-simulator-desc') }}
      </p>
    </header>

    <SimulatorControls />
  </section>
</template>

<style scoped>
.sim-panel {
  background: var(--ck-paper);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  padding: var(--ck-s-lg);
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
  text-align: left;
}

.sim-panel__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
}

.sim-panel__eyebrow {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h1);
  font-weight: 700;
  margin: 0;
  line-height: var(--ck-line-tight);
  text-transform: uppercase;
}

.sim-panel__desc {
  font-size: var(--ck-fs-body);
  color: var(--ck-ink-dim);
  margin: 0;
  line-height: var(--ck-line-body);
}
</style>
