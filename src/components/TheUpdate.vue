<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <article class="update-doc">
    <p class="update-doc__step">
      <a class="update-doc__link" href="https://www.nordicsemi.com/Products/Development-tools/nrf-connect-for-mobile">
        nRF Connect for Mobile
      </a>
      — {{ t('update.descr') }}
    </p>
    <p class="update-doc__step">
      {{ t('update.descr2') }} —
      <a class="update-doc__link" href="https://www.nordicsemi.com/Products/Development-tools/nRF-Connect-Device-Manager">
        nRF Connect Device Manager
      </a>
    </p>
  </article>
</template>

<style scoped>
.update-doc {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
  padding: var(--ck-s-lg);
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  text-align: left;
}

.update-doc__step {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  line-height: var(--ck-line-body);
  color: var(--ck-ink);
  margin: 0;
}

.update-doc__link {
  color: var(--ck-signal);
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid var(--ck-signal);
}

.update-doc__link:hover {
  color: var(--ck-ink);
  border-bottom-color: var(--ck-ink);
}
</style>
