<script setup lang="ts">
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const settings = useSettingsStore()
const { t } = useI18n()
const fields = SETTINGS_GROUPS.uart

const local = computed(() => settings.local)
</script>

<template>
  <SettingsPanel v-if="local" group="uart" :fields="fields">
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
</style>
