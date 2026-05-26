<script setup lang="ts">
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const settings = useSettingsStore()
const { t } = useI18n()
const fields = SETTINGS_GROUPS.uart
const cpfChars = useCpfGroup('uart')

const local = computed(() => settings.local)
const showLegacy = computed(() => local.value !== null)
const showCpf = computed(() => cpfChars.value.length > 0)
</script>

<template>
  <SettingsPanel group="uart" :fields="fields" :cpf-chars="cpfChars">
    <template v-if="showLegacy && local">
      <div class="row">
        <label for="uart_protocols">{{ t('sett.uart') }}</label>
        <select
          id="uart_protocols"
          v-model.number="local.uart_protocols"
          class="select"
        >
          <option :value="0">
            Nothing
          </option>
          <option :value="1">
            PRS
          </option>
          <option :value="2">
            POV
          </option>
        </select>
      </div>
    </template>

    <template v-if="showCpf">
      <TheSetting
        v-for="ch in cpfChars"
        :key="ch.characteristic.uuid"
        :cha="ch"
      />
    </template>

    <p v-if="!showLegacy && !showCpf" class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<route lang="yaml">
meta:
  layout: default
</route>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ck-s-md);
}

.row label {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  color: var(--ck-ink);
}

.select {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-body);
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  background: var(--ck-paper);
  color: var(--ck-ink);
}

.select:focus {
  outline: none;
  border-color: var(--ck-signal);
}

.empty {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
}
</style>
