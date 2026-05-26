<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="update">
    <header class="update__head">
      <p class="update__eyebrow">
        {{ t('button.update') }}
      </p>
      <h1 class="update__title">
        {{ t('update.how-to') }}
      </h1>
    </header>

    <TheUpdate />

    <RouterLink class="update__back" to="/devices">
      <span class="i-carbon-arrow-left" aria-hidden="true" />
      {{ t('intro.device-list') }}
    </RouterLink>
  </section>
</template>

<style scoped>
.update {
  max-width: 44rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-lg);
}

.update__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
  text-align: left;
}

.update__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-signal);
  margin: 0;
}

.update__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-display);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  margin: 0;
}

.update__back {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-xs);
  align-self: flex-start;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
  text-decoration: none;
}

.update__back:hover {
  color: var(--ck-ink);
}
</style>
