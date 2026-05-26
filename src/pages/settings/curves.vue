<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep'
import type { iVarioCurves } from '~/stores/bluetooth'
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const settings = useSettingsStore()
const { t } = useI18n()
const fields = SETTINGS_GROUPS.curves
const cpfChars = useCpfGroup('curves')

const local = computed(() => settings.local)

// CPF firmware exposes each of the four curves as its own 12-element
// characteristic. Adapt them into one iVarioCurves view so the editor can
// stay format-agnostic. Mutations write back to ch.formattedValue in place;
// SettingsPanel picks up the diff via its initial-value snapshot.
const CPF_VARIO_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
const CPF_FREQ_UUID = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CPF_CYCLE_UUID = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const CPF_DUTY_UUID = '98c16914-00ad-47ba-b625-148f0baaec47'

const cpfByUuid = computed(() => Object.fromEntries(
  cpfChars.value.map(ch => [ch.characteristic.uuid, ch]),
))

const cpfReady = computed(() => {
  const m = cpfByUuid.value
  return Boolean(m[CPF_VARIO_UUID]?.formattedValue
    && m[CPF_FREQ_UUID]?.formattedValue
    && m[CPF_CYCLE_UUID]?.formattedValue
    && m[CPF_DUTY_UUID]?.formattedValue)
})

const cpfCurves = computed<iVarioCurves | null>(() => {
  if (!cpfReady.value)
    return null
  const m = cpfByUuid.value
  // 12-element array characteristics (format 0x1B) bypass the CPF exponent
  // and surface raw Int16 — i.e. vario stays in cm/s, freq/cycle/duty stay
  // as device-native units (see BleCharacteristic.formatValueByFormat).
  // We pass them through unchanged; only the scalar threshold/simulator
  // characteristics apply the exponent (and arrive in m/s).
  return {
    buzzer_vario_dots: m[CPF_VARIO_UUID].formattedValue as number[],
    buzzer_frequency_dots: m[CPF_FREQ_UUID].formattedValue as number[],
    buzzer_cycle_dots: m[CPF_CYCLE_UUID].formattedValue as number[],
    buzzer_duty_dots: m[CPF_DUTY_UUID].formattedValue as number[],
  }
})

const showLegacy = computed(() => local.value !== null)
const showCpf = computed(() => cpfReady.value)

// Thresholds for the editor — legacy fields (cm/s) directly, or look them up
// from the CPF audio-group characteristics (m/s) and convert.
const CPF_CLIMB_ON_UUID = 'fcb14ed9-06e7-4a9e-b311-6eee676a2f48'
const CPF_CLIMB_OFF_UUID = '1673f137-66c1-4ff0-8db3-69b9ed7c33e0'
const CPF_SINK_ON_UUID = 'b713f438-42fe-46fe-b052-371a3b9e433a'
const CPF_SINK_OFF_UUID = '8a78979b-1425-4160-b34b-ac5aadddeb21'

const bt = useBluetoothStore()
function cpfThreshold(uuid: string): number | undefined {
  const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
  const v = ch?.formattedValue
  return typeof v === 'number' ? v * 100 : undefined
}

const climbOn = computed(() => local.value?.climb_tone_on_threshold_cm ?? cpfThreshold(CPF_CLIMB_ON_UUID))
const climbOff = computed(() => local.value?.climb_tone_off_threshold_cm ?? cpfThreshold(CPF_CLIMB_OFF_UUID))
const sinkOn = computed(() => local.value?.sink_tone_on_threshold_cm ?? cpfThreshold(CPF_SINK_ON_UUID))
const sinkOff = computed(() => local.value?.sink_tone_off_threshold_cm ?? cpfThreshold(CPF_SINK_OFF_UUID))

// Snap presets — sourced from the legacy presets (same shape works for both
// firmware paths since we normalize to cm/s internally).
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
} satisfies Record<string, iVarioCurves>

function applyPreset(name: keyof typeof presets) {
  const next = cloneDeep(presets[name])
  if (showLegacy.value && local.value) {
    local.value.curves = next
    return
  }
  if (showCpf.value) {
    const m = cpfByUuid.value
    // Preset arrays are already cm/s — CPF 0x1B arrays don't apply exponent,
    // so write them through as-is. See note in cpfCurves above.
    m[CPF_VARIO_UUID].formattedValue = next.buzzer_vario_dots
    m[CPF_FREQ_UUID].formattedValue = next.buzzer_frequency_dots
    m[CPF_CYCLE_UUID].formattedValue = next.buzzer_cycle_dots
    m[CPF_DUTY_UUID].formattedValue = next.buzzer_duty_dots
  }
}
</script>

<template>
  <SettingsPanel group="curves" :fields="fields" :cpf-chars="cpfChars">
    <div v-if="showLegacy || showCpf" class="presets">
      <button class="preset-btn" @click="applyPreset('default')">
        {{ t('sett.def') }}
      </button>
      <button class="preset-btn" @click="applyPreset('log')">
        {{ t('sett.log') }}
      </button>
      <button class="preset-btn" @click="applyPreset('lin')">
        {{ t('sett.lin') }}
      </button>
    </div>

    <CurveEditor
      v-if="showLegacy && local && local.curves"
      :climb-on="climbOn"
      :climb-off="climbOff"
      :sink-on="sinkOn"
      :sink-off="sinkOff"
    />

    <CurveEditor
      v-else-if="showCpf"
      :curves-override="cpfCurves"
      :climb-on="climbOn"
      :climb-off="climbOff"
      :sink-on="sinkOn"
      :sink-off="sinkOff"
    />

    <p v-else class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

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

.empty {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
  text-align: center;
}
</style>
