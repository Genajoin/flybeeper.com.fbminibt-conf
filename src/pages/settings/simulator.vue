<script setup lang="ts">
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()
const { source } = useAudioSource()
const synth = useToneSynth()

const fields = SETTINGS_GROUPS.simulator
const local = computed(() => settings.local)

// Slider works in m/s for UX; the underlying buzzer_simulate_vario_value is
// stored in cm/s as Int16 to match the device codec.
const SLIDER_MIN_MS = -5
const SLIDER_MAX_MS = 10
const SLIDER_STEP_MS = 0.1

const varioMs = computed<number>({
  get: () => (local.value ? local.value.buzzer_simulate_vario_value / 100 : 0),
  set: (v: number) => {
    if (!local.value)
      return
    local.value.buzzer_simulate_vario_value = Math.round(v * 100)
  },
})

const presets: { labelKey: string, value: number }[] = [
  { labelKey: 'audio.preset-strong-sink', value: -3 },
  { labelKey: 'audio.preset-zero', value: 0 },
  { labelKey: 'audio.preset-weak-climb', value: 1 },
  { labelKey: 'audio.preset-strong-climb', value: 5 },
]

// Volume mapping: the device's buzzer_volume is 0..3; for the browser synth we
// map that to 0..1 so volume=0 stays silent and volume=3 is full-scale.
const browserVolume = computed(() => {
  if (!local.value)
    return 0
  return Math.min(local.value.buzzer_volume / 3, 1)
})

let deviceDebounceTimer: ReturnType<typeof setTimeout> | null = null

function pushToDevice(cmS: number) {
  if (deviceDebounceTimer)
    clearTimeout(deviceDebounceTimer)
  deviceDebounceTimer = setTimeout(() => {
    if (bt.isConnected)
      bt.SendSimulationVarioValue(cmS)
  }, 150)
}

function previewBrowser(cmS: number) {
  if (!local.value)
    return
  if (cmS === 0) {
    synth.stop()
    return
  }
  synth.playForVario(cmS, local.value.curves, browserVolume.value)
}

watch(varioMs, (v) => {
  const cmS = Math.round(v * 100)
  if (source.value === 'device')
    pushToDevice(cmS)
  else if (source.value === 'browser')
    previewBrowser(cmS)
})

// Stop browser tone when source flips away from browser, or component unmounts.
watch(source, (s) => {
  if (s !== 'browser')
    synth.stop()
})

onUnmounted(() => synth.stop())

// ▶ Demo: walks the slider from −2 m/s to +5 m/s in ~6 s and stops. Independent
// of source — if device is selected we send each step, if browser we synth it.
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
  // Audio context needs to come up from a user gesture — calling here.
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
</script>

<template>
  <SettingsPanel v-if="local" group="simulator" :fields="fields">
    <div class="row">
      <span class="row__label">{{ t('audio.source-label') }}</span>
      <AudioSourceToggle />
    </div>

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

    <p v-if="local.buzzer_volume === 0 && varioMs !== 0" class="hint hint--alert">
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
