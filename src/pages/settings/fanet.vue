<script setup lang="ts">
const { t } = useI18n()
const cpfChars = useCpfGroup('fanet')
</script>

<template>
  <SettingsPanel group="fanet" :cpf-chars="cpfChars">
    <div v-if="cpfChars.length" class="f-list">
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
.f-list {
  /* Shared 2-column grid so every TheSetting input lines up under one
   * vertical seam. TheSetting itself is display:contents — its <input>
   * and <label> drop straight into THIS grid.
   * Mobile: pin to the left edge with normal page padding (centring
   * looks awkward on a narrow viewport).
   * Desktop ≥720px: centre the whole block so the seam sits mid-page.
   * Wide ≥960px: split into two field-pairs per row to use the space. */
  display: grid;
  grid-template-columns: max-content max-content;
  align-items: center;
  justify-content: start;
  column-gap: 16px;
  row-gap: 14px;
  padding: 22px;
}

@media (min-width: 720px) {
  .f-list {
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
