<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep'
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const settings = useSettingsStore()
const { t } = useI18n()
const fields = SETTINGS_GROUPS.curves

const local = computed(() => settings.local)

// Snap presets — sourced from the legacy CharacteristicForm and CharacteristicForm15
// preset constants (which target the same struct layout). The draggable SVG
// editor (Phase 4.2) will keep using these presets.
const presets = {
  default: {
    buzzer_vario_dots: [-1400, -800, -100, 0, 5, 20, 100, 200, 300, 450, 1200, 2000],
    buzzer_frequency_dots: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
    buzzer_cycle_dots: [850, 790, 725, 750, 665, 595, 430, 325, 265, 210, 120, 100],
    buzzer_duty_dots: [100, 98, 95, 38, 40, 41, 43, 46, 49, 54, 78, 90],
  },
  log: {
    buzzer_vario_dots: [-1000, -300, -55, -50, 0, 10, 100, 250, 425, 600, 800, 1000],
    buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 920, 1380, 1600, 1780, 1880, 2000],
    buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 550, 485, 410, 320, 240, 150],
    buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
  },
  lin: {
    buzzer_vario_dots: [-1000, -300, -55, -50, 0, 10, 115, 265, 425, 600, 800, 1000],
    buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 550, 765, 985, 1235, 1520, 2000],
    buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 550, 485, 410, 320, 240, 150],
    buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
  },
}

function applyPreset(name: keyof typeof presets) {
  if (!local.value)
    return
  local.value.curves = cloneDeep(presets[name])
}
</script>

<template>
  <SettingsPanel v-if="local && local.curves" group="curves" :fields="fields">
    <div class="presets">
      <button class="preset-btn" @click="applyPreset('default')">
        {{ t('sett.def') }}
      </button>
      <button class="preset-btn" @click="applyPreset('log')">
        {{ t('sett.log') }}
      </button>
      <button class="preset-btn" @click="applyPreset('lin') ">
        {{ t('sett.lin') }}
      </button>
    </div>

    <!-- Numeric grid placeholder. Replaced by a draggable SVG editor in Phase 4.2. -->
    <div class="curves-grid">
      <table>
        <thead>
          <tr>
            <th>{{ t('sett.vario') }}</th>
            <th>{{ t('sett.freq') }}</th>
            <th>{{ t('sett.cycle') }}</th>
            <th>{{ t('sett.duty') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(_, i) in local.curves.buzzer_vario_dots" :key="i">
            <td>
              <input
                v-model.number="local.curves.buzzer_vario_dots[i]"
                type="number"
                min="-2000"
                max="2000"
                step="5"
                class="input"
              >
            </td>
            <td>
              <input
                v-model.number="local.curves.buzzer_frequency_dots[i]"
                type="number"
                min="100"
                max="6000"
                step="5"
                class="input"
              >
            </td>
            <td>
              <input
                v-model.number="local.curves.buzzer_cycle_dots[i]"
                type="number"
                min="100"
                max="1000"
                step="5"
                class="input"
              >
            </td>
            <td>
              <input
                v-model.number="local.curves.buzzer_duty_dots[i]"
                type="number"
                min="2"
                max="100"
                class="input"
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </SettingsPanel>
</template>

<route lang="yaml">
meta:
  layout: default
</route>

<style scoped>
.presets {
  display: flex;
  gap: var(--ck-s-sm);
  flex-wrap: wrap;
}

.preset-btn {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  padding: var(--ck-s-xs) var(--ck-s-sm);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-pill);
  cursor: pointer;
}

.preset-btn:hover {
  border-color: var(--ck-ink);
}

.curves-grid {
  overflow-x: auto;
}

table {
  margin: 0 auto;
  border-collapse: collapse;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
}

th {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
  padding: var(--ck-s-xs);
  border-bottom: var(--ck-stroke-hair) dashed var(--ck-grid);
}

td {
  padding: 2px;
}

.input {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  padding: 2px 4px;
  border: var(--ck-stroke-hair) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  background: var(--ck-paper);
  color: var(--ck-ink);
  width: 7ch;
  text-align: right;
}

.input:focus {
  outline: none;
  border-color: var(--ck-signal);
}
</style>
