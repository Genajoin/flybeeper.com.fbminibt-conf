<script setup lang="ts">
import { StorageSerializers } from '@vueuse/core'
import cloneDeep from 'lodash.clonedeep'
import isEqual from 'lodash.isequal'
import { recordAction } from '~/utils/sessionJournal'

interface iVarioCurves {
  buzzer_vario_dots: number[]
  buzzer_frequency_dots: number[]
  buzzer_cycle_dots: number[]
  buzzer_duty_dots: number[]
}

const { t } = useI18n()

const audioChars = useCpfGroup('audio')
const curveChars = useCpfGroup('curves')

const allChars = computed(() => [...audioChars.value, ...curveChars.value])

const CPF_VARIO_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
const CPF_FREQ_UUID = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CPF_CYCLE_UUID = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const CPF_DUTY_UUID = '98c16914-00ad-47ba-b625-148f0baaec47'

const cpfByUuid = computed(() => Object.fromEntries(
  curveChars.value.map(ch => [ch.characteristic.uuid, ch]),
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
const CPF_SINK_ON_UUID = 'b713f438-42fe-46fe-b052-371a3b9e433a'
const CPF_CLIMB_OFF_UUID = '1673f137-66c1-4ff0-8db3-69b9ed7c33e0'
const CPF_SINK_OFF_UUID = '8a78979b-1425-4160-b34b-ac5aadddeb21'

function audioThreshold(uuid: string): number | undefined {
  const ch = audioChars.value.find(c => c.characteristic.uuid === uuid)
  const v = ch?.formattedValue
  return typeof v === 'number' ? v * 100 : undefined
}

const climbOn = computed(() => audioThreshold(CPF_CLIMB_ON_UUID))
const sinkOn = computed(() => audioThreshold(CPF_SINK_ON_UUID))

// The chart emits cm/s; underlying BLE char stores m/s, so divide by 100
// when writing back. SettingsPanel picks up the dirty bit via the BleChar's
// formattedValue setter — no extra plumbing needed.
function writeThreshold(uuid: string, valueCmS: number) {
  const ch = audioChars.value.find(c => c.characteristic.uuid === uuid)
  if (ch)
    ch.formattedValue = valueCmS / 100
}

const presets = {
  // Firmware factory default — matches BUZZER_*_ARRAY_DEFAULT in the
  // firmware (FbBT/src/buzzer.h, FbFANET/src/buzzer/buzzer.h). Keep
  // byte-identical so this preset can be used to restore a device to its
  // out-of-box behaviour after manual edits or a misclick on AGGRESSIVE.
  'default': {
    buzzer_vario_dots: [-1400, -800, -100, 0, 39, 40, 100, 200, 300, 450, 1200, 2000],
    buzzer_frequency_dots: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
    buzzer_cycle_dots: [850, 790, 725, 350, 150, 595, 430, 325, 265, 210, 120, 100],
    buzzer_duty_dots: [100, 98, 95, 20, 80, 41, 43, 46, 49, 54, 78, 90],
  },
  'aggressive': {
    buzzer_vario_dots: [-1000, -300, -55, -50, 0, 10, 100, 250, 425, 600, 800, 1000],
    buzzer_frequency_dots: [200, 280, 300, 200, 400, 400, 920, 1380, 1600, 1780, 1880, 2000],
    buzzer_cycle_dots: [100, 100, 500, 800, 600, 600, 550, 485, 410, 320, 240, 150],
    buzzer_duty_dots: [100, 100, 100, 5, 10, 50, 52, 55, 58, 62, 66, 70],
  },
  // Loudest sound the firmware team tuned: climb tones sit around 3.5–3.8 kHz,
  // the piezo's resonance, where it is loudest. From the shared "max-VOLUME"
  // preset link.
  'max-volume': {
    buzzer_vario_dots: [-1400, -100, 0, 40, 40, 100, 200, 300, 450, 600, 1000, 2000],
    buzzer_frequency_dots: [200, 390, 3500, 3530, 3560, 3615, 3665, 3700, 3730, 3760, 4000, 4500],
    buzzer_cycle_dots: [850, 790, 320, 135, 715, 595, 430, 325, 265, 210, 120, 100],
    buzzer_duty_dots: [100, 98, 15, 75, 38, 41, 43, 46, 49, 54, 78, 90],
  },
} satisfies Record<string, iVarioCurves>

// Last-known user-customised curves, kept per browser (survives reloads).
// Captured whenever the user leaves the CUSTOM bucket for a preset, so that
// returning to CUSTOM restores exactly what they had — instead of leaving them
// staring at the preset's curves with the CUSTOM segment lit.
const customSnapshot = useLocalStorage<iVarioCurves | null>('curves-custom', null, { serializer: StorageSerializers.object })

type PresetKey = keyof typeof presets

/**
 * Active preset is derived from the live curves — drag a handle and it
 *  auto-switches to CUSTOM because the shape no longer matches any preset.
 * Curve presets set how the vario sounds; when it sounds (thresholds, holds,
 * averaging) has its own presets in the right column (SoundTriggerPresets).
 */
const activePreset = computed<PresetKey | 'custom'>(() => {
  const c = cpfCurves.value
  if (!c)
    return 'custom'
  for (const [name, p] of Object.entries(presets)) {
    if (isEqual(c, p))
      return name as PresetKey
  }
  return 'custom'
})

function writeCurves(next: iVarioCurves) {
  if (!cpfReady.value)
    return
  const m = cpfByUuid.value
  m[CPF_VARIO_UUID].formattedValue = next.buzzer_vario_dots
  m[CPF_FREQ_UUID].formattedValue = next.buzzer_frequency_dots
  m[CPF_CYCLE_UUID].formattedValue = next.buzzer_cycle_dots
  m[CPF_DUTY_UUID].formattedValue = next.buzzer_duty_dots
}

// Graph or table view of the same curves. Remembered per browser: a pilot who
// prefers typing numbers should not have to flip it on every visit.
const curveView = useLocalStorage<'graph' | 'table'>('curve-view', 'graph')
const viewOptions = computed(() => [
  { label: t('sett.view-graph'), value: 'graph' as const },
  { label: t('sett.view-table'), value: 'table' as const },
])

const presetOptions = [
  { label: 'DEFAULT', value: 'default' as const },
  { label: 'AGGRESSIVE', value: 'aggressive' as const },
  { label: 'MAX VOLUME', value: 'max-volume' as const },
  { label: 'CUSTOM*', value: 'custom' as const },
]

// A saved profile matching the curves lights the profile picker instead of
// CUSTOM: CUSTOM means "values that are nowhere but on the device".
const profiles = useSoundProfiles()
const curveProfile = computed(() => (activePreset.value === 'custom' ? profiles.active('curves') : null))
const segValue = computed<PresetKey | 'custom' | 'profile'>(() => (curveProfile.value ? 'profile' : activePreset.value))

// Leaving own unsaved curves for a preset or a profile: stash them so a later
// CUSTOM click can bring them back.
function stashCustom() {
  if (activePreset.value === 'custom' && !curveProfile.value && cpfCurves.value)
    customSnapshot.value = cloneDeep(cpfCurves.value)
}

function selectPreset(v: PresetKey | 'custom' | 'profile') {
  if (v === 'profile')
    return
  recordAction('settings', `sound preset: ${v.toUpperCase()}`)
  if (v === 'custom') {
    // Restore the user's last custom sound if we have one stashed. If not
    // (first ever click on CUSTOM with no prior edits), leave it alone —
    // it IS the implicit starting point for the user's custom editing.
    if (customSnapshot.value && (curveProfile.value || activePreset.value !== 'custom'))
      writeCurves(cloneDeep(customSnapshot.value))
    return
  }
  stashCustom()
  writeCurves(cloneDeep(presets[v]))
}
</script>

<template>
  <SettingsPanel group="audio" :cpf-chars="allChars">
    <div class="sound">
      <div class="sound__left">
        <div v-if="curveChars.length" class="sound__curves">
          <div class="sound__curves-head">
            <CkEyebrow>{{ t('sett.group-curves') }} · 12 PTS</CkEyebrow>
            <span v-if="curveView === 'graph'" class="sound__curves-hint">{{ t('sett.drag-point-edit') }}</span>
            <CkSegmentedControl
              v-model="curveView"
              class="sound__view"
              :options="viewOptions"
              :aria-label="t('sett.view-toggle')"
            />
          </div>
          <div class="sound__curves-chart">
            <CurveTable
              v-if="cpfReady && cpfCurves && curveView === 'table'"
              :curves="cpfCurves"
              :climb-on="climbOn"
              :sink-on="sinkOn"
              @update:climb-on="writeThreshold(CPF_CLIMB_ON_UUID, $event)"
              @update:sink-on="writeThreshold(CPF_SINK_ON_UUID, $event)"
            />
            <CurveEditor
              v-else-if="cpfReady"
              :curves-override="cpfCurves"
              :climb-on="climbOn"
              :sink-on="sinkOn"
              @update:climb-on="writeThreshold(CPF_CLIMB_ON_UUID, $event)"
              @update:sink-on="writeThreshold(CPF_SINK_ON_UUID, $event)"
              @update:climb-off="writeThreshold(CPF_CLIMB_OFF_UUID, $event)"
              @update:sink-off="writeThreshold(CPF_SINK_OFF_UUID, $event)"
            />
            <p v-else class="empty">
              {{ t('msg.fetching') }}…
            </p>
          </div>
          <div class="sound__presets">
            <CkSegmentedControl
              class="sound__presets-seg"
              :model-value="segValue"
              :options="presetOptions"
              :aria-label="t('sett.group-curves')"
              @update:model-value="selectPreset"
            />
            <SoundProfileMenu v-if="cpfReady" class="sound__profiles" scope="curves" :preset-active="activePreset !== 'custom'" @before-apply="stashCustom" />
          </div>
        </div>

        <div class="sound__sim">
          <SimulatorControls />
        </div>
        <ThresholdLab />
      </div>

      <div class="sound__right">
        <VolumeAndThresholds :chars="audioChars" />
      </div>
    </div>

    <p v-if="audioChars.length === 0 && curveChars.length === 0" class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.sound {
  display: flex;
  flex-direction: column;
}

.sound__left {
  display: flex;
  flex-direction: column;
}

.sound__curves {
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  /* Header/footer get padding; the chart itself goes edge-to-edge so the
     SVG eats the full mobile screen width — every pixel matters at 360 px. */
  padding-top: 18px;
  padding-bottom: 18px;
}

.sound__curves-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--ck-s-sm);
  margin: 0 14px 12px;
  flex-wrap: wrap;
}

.sound__curves-hint {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-signal);
  font-weight: 700;
}

.sound__curves-chart {
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-paper);
}

.sound__view {
  display: flex;
  margin-left: auto;
}

.sound__presets {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 14px 0;
}

.sound__presets-seg {
  display: flex;
}

.sound__sim {
  padding: 18px 22px;
}

.sound__right {
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
}

.empty {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
  padding: 22px;
  text-align: center;
}

@media (min-width: 960px) {
  .sound {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
  }
  .sound__right {
    border-top: none;
    border-left: 1.5px solid var(--ck-ink);
  }
  .sound__sim {
    border-top: var(--ck-stroke-rule) solid var(--ck-ink);
  }
}
</style>
