<script setup lang="ts">
const { t } = useI18n()
const cpfChars = useCpfGroup('power')

function labelFor(uuid: string): string {
  const k = `sett.${uuid}`
  const fb = t(k)
  return fb === k ? uuid : fb
}
</script>

<template>
  <SettingsPanel group="power" :cpf-chars="cpfChars">
    <ul v-if="cpfChars.length" class="b-list">
      <li v-for="ch in cpfChars" :key="ch.characteristic.uuid" class="b-row">
        <span v-if="typeof ch.formattedValue === 'boolean'" class="b-row__label">{{ labelFor(ch.characteristic.uuid) }}</span>
        <CkSquareToggle
          v-if="typeof ch.formattedValue === 'boolean'"
          :model-value="Boolean(ch.formattedValue)"
          :aria-label="labelFor(ch.characteristic.uuid)"
          @update:model-value="ch.formattedValue = $event"
        />
        <TheSetting v-else :cha="ch" />
      </li>
    </ul>
    <p v-else class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.b-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.b-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 22px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.b-row:last-child {
  border-bottom: none;
}

.b-row__label {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
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
