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

    <CurveEditor />
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
</style>
