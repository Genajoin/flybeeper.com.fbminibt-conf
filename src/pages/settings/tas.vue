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
