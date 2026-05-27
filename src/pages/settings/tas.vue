<script setup lang="ts">
const { t } = useI18n()
const cpfChars = useCpfGroup('tas')
</script>

<template>
  <SettingsPanel group="tas" :cpf-chars="cpfChars">
    <div v-if="cpfChars.length" class="t-list">
      <TheSetting
        v-for="ch in cpfChars"
        :key="ch.characteristic.uuid"
        :cha="ch"
      />
    </div>
    <p v-else class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.t-list {
  /* Shared 2-column grid (value | label) so seams from every TheSetting
   * line up — TheSetting is display:contents and drops its <input> +
   * <label> into THIS grid. Left-aligned on mobile, centred on tablet+. */
  display: grid;
  grid-template-columns: max-content max-content;
  align-items: center;
  justify-content: start;
  column-gap: 16px;
  row-gap: 14px;
  padding: 22px;
}

@media (min-width: 720px) {
  .t-list {
    justify-content: center;
  }
}

.empty {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
  padding: 22px;
  text-align: center;
}
</style>
