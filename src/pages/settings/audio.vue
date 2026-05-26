<script setup lang="ts">
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const settings = useSettingsStore()
const { t } = useI18n()
const fields = SETTINGS_GROUPS.audio
const cpfChars = useCpfGroup('audio')

const local = computed(() => settings.local)
const showLegacy = computed(() => local.value !== null)
const showCpf = computed(() => cpfChars.value.length > 0)
</script>

<template>
  <SettingsPanel group="audio" :fields="fields" :cpf-chars="cpfChars">
    <template v-if="showLegacy && local">
      <div class="row">
        <label for="buzzer_volume">{{ t('sett.buzz-vol') }}</label>
        <input
          id="buzzer_volume"
          v-model.number="local.buzzer_volume"
          type="number"
          min="0"
          max="3"
          class="input input--narrow"
        >
      </div>
      <div class="row">
        <label for="climb_on">{{ t('sett.climb-on') }}</label>
        <input
          id="climb_on"
          v-model.number="local.climb_tone_on_threshold_cm"
          type="number"
          min="-2000"
          max="2000"
          step="5"
          class="input"
        >
      </div>
      <div class="row">
        <label for="climb_off">{{ t('sett.climb-off') }}</label>
        <input
          id="climb_off"
          v-model.number="local.climb_tone_off_threshold_cm"
          type="number"
          min="-2000"
          max="2000"
          step="5"
          class="input"
        >
      </div>
      <div class="row">
        <label for="sink_on">{{ t('sett.sink-on') }}</label>
        <input
          id="sink_on"
          v-model.number="local.sink_tone_on_threshold_cm"
          type="number"
          min="-2000"
          max="2000"
          step="5"
          class="input"
        >
      </div>
      <div class="row">
        <label for="sink_off">{{ t('sett.sink-off') }}</label>
        <input
          id="sink_off"
          v-model.number="local.sink_tone_off_threshold_cm"
          type="number"
          min="-2000"
          max="2000"
          step="5"
          class="input"
        >
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

.input {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-body);
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  background: var(--ck-paper);
  color: var(--ck-ink);
  width: 10ch;
  text-align: right;
}

.input--narrow {
  width: 6ch;
}

.input:focus {
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
