<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="update">
    <PageHeader
      breadcrumb-to="/"
      breadcrumb-label="← BACK"
      right="/UPDATE"
    >
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('update.eyebrow') }}
        </CkEyebrow>
        <h1 class="update__display">
          {{ t('update.title-line1') }}<br>{{ t('update.title-line2') }}
        </h1>
        <p class="update__intro">
          {{ t('update.intro') }}
        </p>
      </template>
    </PageHeader>

    <TheUpdate />
  </section>
</template>

<style scoped>
.update {
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.update__display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 34px;
  letter-spacing: -1.5px;
  line-height: 0.95;
  margin: 8px 0;
  text-transform: uppercase;
}

.update__intro {
  font-size: 13px;
  color: var(--ck-dim);
  line-height: 1.5;
  max-width: 540px;
  margin: 0;
}

@media (min-width: 960px) {
  .update__display {
    font-size: 64px;
  }
}
</style>
