<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <p class="not-found">
    {{ t('not-found') }}
  </p>
</template>

<style scoped>
.not-found {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h1);
  margin: 0;
  color: var(--ck-ink);
}
</style>

<route lang="yaml">
meta:
  layout: 404
</route>
