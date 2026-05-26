<script setup lang="ts">
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()
const fields = SETTINGS_GROUPS.simulator

const local = computed(() => settings.local)

// Numeric input placeholder. The full draggable slider + ▶ Demo + browser
// audio source toggle live in Phase 4.3 (next commit). Push the simulation
// value to the device on every change for instant audible feedback when
// connected; debounce is handled inside SendSimulationVarioValue.
let pushTimer: ReturnType<typeof setTimeout> | null = null

function onSimChange() {
  if (pushTimer)
    clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    if (bt.isConnected && local.value)
      bt.SendSimulationVarioValue(local.value.buzzer_simulate_vario_value)
  }, 200)
}
</script>

<template>
  <SettingsPanel v-if="local" group="simulator" :fields="fields">
    <div class="row">
      <label for="sim">{{ t('sett.sim-label1') }}</label>
      <input
        id="sim"
        v-model.number="local.buzzer_simulate_vario_value"
        type="number"
        min="-2000"
        max="2000"
        step="10"
        class="input"
        @input="onSimChange"
      >
    </div>
    <p class="hint" :class="{ 'hint--alert': local.buzzer_simulate_vario_value === 0 }">
      {{ t('sett.sim-label2') }}
    </p>
    <p v-if="local.buzzer_volume === 0 && local.buzzer_simulate_vario_value !== 0" class="hint hint--alert">
      {{ t('sett.sim-label3') }}
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

.input:focus {
  outline: none;
  border-color: var(--ck-signal);
}

.hint {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
}

.hint--alert {
  color: var(--ck-signal);
}
</style>
