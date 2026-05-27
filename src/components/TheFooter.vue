<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="ftr">
    <nav class="ftr__links">
      <RouterLink class="ftr__link" to="/about">
        {{ t('footer.about') }}
      </RouterLink>
      <RouterLink class="ftr__link" to="/devices">
        {{ t('footer.devices') }}
      </RouterLink>
      <RouterLink class="ftr__link" to="/update">
        {{ t('footer.firmware-update') }}
      </RouterLink>
      <a class="ftr__link ftr__link--ext" href="https://alpisto.eu" target="_blank" rel="noopener">
        {{ t('footer.alpisto') }}
      </a>
    </nav>
  </footer>
</template>

<style scoped>
.ftr {
  background: var(--ck-ink);
  color: var(--ck-paper);
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-body);
}

.ftr__links {
  display: flex;
  flex-wrap: wrap;
}

.ftr__link {
  flex: 1 1 50%;
  min-width: 50%;
  padding: 14px 18px;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-paper);
  text-decoration: none;
  background: var(--ck-ink);
  border-right: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
  border-bottom: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
}

.ftr__link:nth-child(2n) {
  border-right: none;
}

.ftr__link:hover {
  color: var(--ck-signal);
  background: rgba(255, 255, 255, 0.04);
}

@media (min-width: 720px) {
  .ftr__link {
    flex: 1 1 25%;
    min-width: 0;
    border-bottom: none;
  }
  .ftr__link:nth-child(2n) {
    border-right: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
  }
  .ftr__link:last-child {
    border-right: none;
  }
}
</style>
