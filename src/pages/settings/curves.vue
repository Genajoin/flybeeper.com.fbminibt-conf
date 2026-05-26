<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep'

interface iVarioCurves {
  buzzer_vario_dots: number[]
  buzzer_frequency_dots: number[]
  buzzer_cycle_dots: number[]
  buzzer_duty_dots: number[]
}

const { t } = useI18n()
const cpfChars = useCpfGroup('curves')

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
  return {
    buzzer_vario_dots: m[CPF_VARIO_UUID].formattedValue as number[],
    buzzer_frequency_dots: m[CPF_FREQ_UUID].formattedValue as number[],
    buzzer_cycle_dots: m[CPF_CYCLE_UUID].formattedValue as number[],
    buzzer_duty_dots: m[CPF_DUTY_UUID].formattedValue as number[],
  }
})

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

const climbOn = computed(() => cpfThreshold(CPF_CLIMB_ON_UUID))
const climbOff = computed(() => cpfThreshold(CPF_CLIMB_OFF_UUID))
const sinkOn = computed(() => cpfThreshold(CPF_SINK_ON_UUID))
const sinkOff = computed(() => cpfThreshold(CPF_SINK_OFF_UUID))

const presets = {
  'sensitive': {
    buzzer_vario_dots: [-1400, -800, -100, 0, 5, 20, 100, 200, 300, 450, 1200, 2000],
    buzzer_frequency_dots: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
    buzzer_cycle_dots: [850, 790, 725, 750, 665, 595, 430, 325, 265, 210, 120, 100],
    buzzer_duty_dots: [100, 98, 95, 38, 40, 41, 43, 46, 49, 54, 78, 90],
  },
  'aggressive': {
    buzzer_vario_dots: [-1000, -300, -55, -50, 0, 10, 100, 250, 425, 600, 800, 1000],
    buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 920, 1380, 1600, 1780, 1880, 2000],
    buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 550, 485, 410, 320, 240, 150],
    buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
  },
  'silent-gnd': {
    buzzer_vario_dots: [-1000, -300, -55, -50, 0, 10, 115, 265, 425, 600, 800, 1000],
    buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 550, 765, 985, 1235, 1520, 2000],
    buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 550, 485, 410, 320, 240, 150],
    buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
  },
} satisfies Record<string, iVarioCurves>

const activePreset = ref<keyof typeof presets | 'custom'>('custom')

function applyPreset(name: keyof typeof presets) {
  const next = cloneDeep(presets[name])
  if (cpfReady.value) {
    const m = cpfByUuid.value
    m[CPF_VARIO_UUID].formattedValue = next.buzzer_vario_dots
    m[CPF_FREQ_UUID].formattedValue = next.buzzer_frequency_dots
    m[CPF_CYCLE_UUID].formattedValue = next.buzzer_cycle_dots
    m[CPF_DUTY_UUID].formattedValue = next.buzzer_duty_dots
  }
  activePreset.value = name
}

const presetOptions = [
  { label: 'SENSITIVE', value: 'sensitive' as const },
  { label: 'AGGRESSIVE', value: 'aggressive' as const },
  { label: 'SILENT GND', value: 'silent-gnd' as const },
  { label: 'CUSTOM*', value: 'custom' as const },
]

function selectPreset(v: 'sensitive' | 'aggressive' | 'silent-gnd' | 'custom') {
  if (v === 'custom') {
    activePreset.value = 'custom'
    return
  }
  applyPreset(v)
}
</script>

<template>
  <SettingsPanel group="curves" :cpf-chars="cpfChars">
    <div class="curves-block">
      <div class="curves-block__head">
        <CkEyebrow>{{ t('sett.group-curves') }} · 12 PTS</CkEyebrow>
        <CkEyebrow color="var(--ck-signal)">
          ● DRAG TO HEAR
        </CkEyebrow>
      </div>
      <div class="curves-block__chart">
        <CurveEditor
          v-if="cpfReady"
          :curves-override="cpfCurves"
          :climb-on="climbOn"
          :climb-off="climbOff"
          :sink-on="sinkOn"
          :sink-off="sinkOff"
        />
        <p v-else class="empty">
          {{ t('msg.fetching') }}…
        </p>
      </div>
      <CkSegmentedControl
        class="curves-block__presets"
        :model-value="activePreset"
        :options="presetOptions"
        :aria-label="t('sett.group-curves')"
        @update:model-value="selectPreset"
      />
    </div>

    <div class="curves-sim">
      <SimulatorControls />
    </div>
  </SettingsPanel>
</template>

<style scoped>
.curves-block {
  padding: 18px 22px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.curves-block__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}

.curves-block__chart {
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  padding: 6px;
  background: var(--ck-paper);
}

.curves-block__presets {
  display: flex;
  margin-top: 12px;
}

.curves-sim {
  padding: 18px 22px;
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
