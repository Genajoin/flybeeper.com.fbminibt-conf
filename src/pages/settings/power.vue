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
      <template v-for="ch in cpfChars" :key="ch.characteristic.uuid">
        <li v-if="typeof ch.formattedValue === 'boolean'" class="b-row">
          <span class="b-row__label">{{ labelFor(ch.characteristic.uuid) }}</span>
          <CkSquareToggle
            :model-value="Boolean(ch.formattedValue)"
            :aria-label="labelFor(ch.characteristic.uuid)"
            @update:model-value="ch.formattedValue = $event"
          />
        </li>
        <li v-else class="b-row b-row--full">
          <TheSetting :cha="ch" />
        </li>
      </template>
    </ul>
    <p v-else class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.b-list {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  align-items: center;
  gap: 16px 28px;
  margin: 0;
  padding: 22px;
  list-style: none;
}

.b-row {
  display: contents;
}

.b-row--full > * {
  /* TheSetting brings its own internal grid + max-width — let it span the
   * whole two-column row instead of trying to splice into the parent grid. */
  grid-column: 1 / -1;
  min-width: 320px;
}

.b-row__label {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
  text-align: right;
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
