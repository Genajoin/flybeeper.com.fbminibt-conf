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
  /* TheSetting brings a max-width:480px centred grid for each row;
   * keep the wrapping list as a simple vertical stack with spacing. */
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
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
