<script setup lang="ts">
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()
const { source } = useAudioSource()
const synth = useToneSynth()

const fields = SETTINGS_GROUPS.simulator
const cpfChars = useCpfGroup('simulator')
const local = computed(() => settings.local)

// CPF firmware exposes the simulation value as a separate characteristic
// (904baf04-…0002, m/s units). The legacy ≤0.15 path stores it inside
// buzzer_simulate_vario_value (cm/s). The slider works in m/s either way.
const CPF_SIM_UUID = '904baf04-5814-11ee-8c99-0242ac120002'
const cpfSimChar = computed(() =>
  bt.bleCharacteristics.find(c => c.characteristic.uuid === CPF_SIM_UUID),
)

const SLIDER_MIN_MS = -5
const SLIDER_MAX_MS = 10
const SLIDER_STEP_MS = 0.1

const varioMs = computed<number>({
  get: () => {
    if (local.value)
      return local.value.buzzer_simulate_vario_value / 100
    const cpf = cpfSimChar.value?.formattedValue
    return typeof cpf === 'number' ? cpf : 0
  },
  set: (v: number) => {
    if (local.value)
      local.value.buzzer_simulate_vario_value = Math.round(v * 100)
    else if (cpfSimChar.value)
      cpfSimChar.value.formattedValue = v
  },
})

const presets: { labelKey: string, value: number }[] = [
  { labelKey: 'audio.preset-strong-sink', value: -3 },
  { labelKey: 'audio.preset-zero', value: 0 },
  { labelKey: 'audio.preset-weak-climb', value: 1 },
  { labelKey: 'audio.preset-strong-climb', value: 5 },
]

// CPF curves source for the browser synth (m/s vario in characteristic →
// normalised iVarioCurves shape in cm/s). Mirrors the adapter in curves.vue.
const CPF_VARIO_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
const CPF_FREQ_UUID = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CPF_CYCLE_UUID = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const CPF_DUTY_UUID = '98c16914-00ad-47ba-b625-148f0baaec47'

const synthCurves = computed(() => {
  if (local.value)
    return local.value.curves
  const find = (uuid: string) => bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
  const vario = find(CPF_VARIO_UUID)?.formattedValue as number[] | undefined
  const freq = find(CPF_FREQ_UUID)?.formattedValue as number[] | undefined
  const cycle = find(CPF_CYCLE_UUID)?.formattedValue as number[] | undefined
  const duty = find(CPF_DUTY_UUID)?.formattedValue as number[] | undefined
  if (!vario || !freq || !cycle || !duty)
    return null
  return {
    buzzer_vario_dots: vario.map(v => Math.round(v * 100)),
    buzzer_frequency_dots: freq,
    buzzer_cycle_dots: cycle,
    buzzer_duty_dots: duty,
  }
})

const CPF_VOL_UUID = '67f82d94-2b2a-4123-81c9-058e460c3d01'
const browserVolume = computed(() => {
  const raw = local.value
    ? local.value.buzzer_volume
    : (bt.bleCharacteristics.find(c => c.characteristic.uuid === CPF_VOL_UUID)?.formattedValue as number | undefined) ?? 0
  return Math.min(raw / 3, 1)
})

let deviceDebounceTimer: ReturnType<typeof setTimeout> | null = null

function pushToDevice(cmS: number) {
  if (deviceDebounceTimer)
    clearTimeout(deviceDebounceTimer)
  deviceDebounceTimer = setTimeout(() => {
    if (!bt.isConnected)
      return
    if (local.value) {
      bt.SendSimulationVarioValue(cmS)
    }
    else if (cpfSimChar.value) {
      cpfSimChar.value.formattedValue = cmS / 100
      cpfSimChar.value.setFormattedValue().catch(() => {})
    }
  }, 150)
}

function previewBrowser(cmS: number) {
  const curves = synthCurves.value
  if (!curves) {
    synth.stop()
    return
  }
  if (cmS === 0) {
    synth.stop()
    return
  }
  synth.playForVario(cmS, curves, browserVolume.value)
}

watch(varioMs, (v) => {
  const cmS = Math.round(v * 100)
  if (source.value === 'device')
    pushToDevice(cmS)
  else if (source.value === 'browser')
    previewBrowser(cmS)
})

watch(source, (s) => {
  if (s !== 'browser')
    synth.stop()
})

onUnmounted(() => synth.stop())

const isDemoRunning = ref(false)
const DEMO_START_MS = -2
const DEMO_END_MS = 5
const DEMO_DURATION_MS = 6000
const DEMO_STEPS = 60
let demoTimer: ReturnType<typeof setInterval> | null = null

function startDemo() {
  if (isDemoRunning.value)
    return
  isDemoRunning.value = true
  if (source.value === 'browser')
    void synth.ensureContext()
  let step = 0
  demoTimer = setInterval(() => {
    const t = step / DEMO_STEPS
    varioMs.value = DEMO_START_MS + (DEMO_END_MS - DEMO_START_MS) * t
    step++
    if (step > DEMO_STEPS)
      stopDemo()
  }, DEMO_DURATION_MS / DEMO_STEPS)
}

function stopDemo() {
  isDemoRunning.value = false
  if (demoTimer)
    clearInterval(demoTimer)
  demoTimer = null
  varioMs.value = 0
}

onUnmounted(() => {
  if (demoTimer)
    clearInterval(demoTimer)
})

function applyPreset(v: number) {
  varioMs.value = v
}

const showSlider = computed(() => local.value !== null || cpfSimChar.value !== undefined)
</script>

<template>
  <SettingsPanel group="simulator" :fields="fields" :cpf-chars="cpfChars">
    <div class="row">
      <span class="row__label">{{ t('audio.source-label') }}</span>
      <AudioSourceToggle />
    </div>

    <template v-if="showSlider">
      <div class="slider-block">
        <div class="slider-readout">
          <span class="slider-readout__big">{{ varioMs.toFixed(1) }}</span>
          <span class="slider-readout__unit">m/s</span>
        </div>
        <input
          v-model.number="varioMs"
          type="range"
          :min="SLIDER_MIN_MS"
          :max="SLIDER_MAX_MS"
          :step="SLIDER_STEP_MS"
          class="slider"
          @pointerdown="source === 'browser' && synth.ensureContext()"
        >
        <div class="slider-ticks">
          <span>−5</span>
          <span>0</span>
          <span>+5</span>
          <span>+10</span>
        </div>
      </div>

      <div class="presets">
        <button
          v-for="p in presets"
          :key="p.value"
          class="preset-btn"
          @click="applyPreset(p.value)"
        >
          {{ t(p.labelKey) }}
        </button>
        <button
          class="preset-btn preset-btn--demo"
          @click="isDemoRunning ? stopDemo() : startDemo()"
        >
          {{ isDemoRunning ? t('audio.demo-stop') : t('audio.demo') }}
        </button>
      </div>
    </template>

    <p v-else class="hint">
      {{ t('msg.fetching') }}…
    </p>

    <p v-if="local && local.buzzer_volume === 0 && varioMs !== 0" class="hint hint--alert">
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
  align-items: center;
  justify-content: space-between;
  gap: var(--ck-s-md);
  flex-wrap: wrap;
}

.row__label {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.slider-block {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
}

.slider-readout {
  display: flex;
  align-items: baseline;
  gap: var(--ck-s-xs);
  justify-content: center;
}

.slider-readout__big {
  font-family: var(--ck-font-display);
  font-size: 3rem;
  font-weight: 700;
  color: var(--ck-ink);
  font-variant-numeric: tabular-nums;
}

.slider-readout__unit {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-body);
  color: var(--ck-dim);
}

.slider {
  width: 100%;
  accent-color: var(--ck-signal);
  touch-action: none;
}

.slider-ticks {
  display: flex;
  justify-content: space-between;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-micro);
  color: var(--ck-dim);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ck-s-xs);
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

.preset-btn--demo {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border-color: var(--ck-signal);
}

.preset-btn--demo:hover {
  background: var(--ck-ink);
  border-color: var(--ck-ink);
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
