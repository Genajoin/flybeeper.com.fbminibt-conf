<script setup lang="ts">
const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()
const { source } = useAudioSource()
const synth = useToneSynth()
const sim = useSimulation()

const local = computed(() => settings.local)

const SLIDER_MIN_MS = -5
const SLIDER_MAX_MS = 10
const SLIDER_STEP_MS = 0.1

// Reflect device state for the slider, but write through useSimulation so the
// banner and any other reader stay in sync. The slider's own model is a local
// ref because we want it to feel instant — pushing through the store on every
// keystroke would couple slider lag to BLE write latency.
const sliderMs = ref(sim.valueMs.value)

// Throttle device writes (audit feedback: 150ms debounce was way too slow for
// the demo and for drag — every intermediate step got dropped). 30ms ≈ 33Hz
// is comfortably under typical Web Bluetooth write throughput.
const THROTTLE_MS = 30
let lastWriteAt = 0
let pendingValue: number | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null

function flushPending() {
  if (pendingValue === null)
    return
  sim.setValueCmS(pendingValue)
  lastWriteAt = Date.now()
  pendingValue = null
}

function pushToDevice(cmS: number) {
  const now = Date.now()
  const elapsed = now - lastWriteAt
  if (elapsed >= THROTTLE_MS) {
    sim.setValueCmS(cmS)
    lastWriteAt = now
    return
  }
  // Coalesce intermediate values into one trailing write so we never skip the
  // final position of a drag (which is what the user actually wants the
  // device to play).
  pendingValue = cmS
  if (!pendingTimer) {
    pendingTimer = setTimeout(() => {
      pendingTimer = null
      flushPending()
    }, THROTTLE_MS - elapsed)
  }
}

const CPF_VARIO_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
const CPF_FREQ_UUID = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CPF_CYCLE_UUID = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const CPF_DUTY_UUID = '98c16914-00ad-47ba-b625-148f0baaec47'
const CPF_VOL_UUID = '67f82d94-2b2a-4123-81c9-058e460c3d01'

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
  // 12-element CPF arrays (format 0x1B) bypass the descriptor exponent —
  // vario is already cm/s, matching useToneSynth.playForVario(varioCmS, …).
  return {
    buzzer_vario_dots: vario,
    buzzer_frequency_dots: freq,
    buzzer_cycle_dots: cycle,
    buzzer_duty_dots: duty,
  }
})

const browserVolume = computed(() => {
  const raw = local.value
    ? local.value.buzzer_volume
    : (bt.bleCharacteristics.find(c => c.characteristic.uuid === CPF_VOL_UUID)?.formattedValue as number | undefined) ?? 0
  return Math.min(raw / 3, 1)
})

function previewBrowser(cmS: number) {
  const curves = synthCurves.value
  if (!curves || cmS === 0) {
    synth.stop()
    return
  }
  synth.playForVario(cmS, curves, browserVolume.value)
}

watch(sliderMs, (v) => {
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
    sliderMs.value = DEMO_START_MS + (DEMO_END_MS - DEMO_START_MS) * t
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
  sliderMs.value = 0
}

function applyPreset(v: number) {
  sliderMs.value = v
}

const presets: { labelKey: string, value: number }[] = [
  { labelKey: 'audio.preset-strong-sink', value: -3 },
  { labelKey: 'audio.preset-zero', value: 0 },
  { labelKey: 'audio.preset-weak-climb', value: 1 },
  { labelKey: 'audio.preset-strong-climb', value: 5 },
]

const showSlider = computed(() => bt.isConnected && (
  local.value !== null
  || bt.bleCharacteristics.some(c => c.characteristic.uuid === '904baf04-5814-11ee-8c99-0242ac120002')
))

// Leaving the simulator page MUST take the device out of simulation mode —
// otherwise it stays stuck (audit feedback). Same on unmount for any reason.
onBeforeRouteLeave(() => {
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
  if (sim.isActive.value)
    sim.stop()
  synth.stop()
})

onUnmounted(() => {
  if (pendingTimer)
    clearTimeout(pendingTimer)
  if (demoTimer)
    clearInterval(demoTimer)
  synth.stop()
})
</script>

<template>
  <section class="sim-panel">
    <header class="sim-panel__head">
      <p class="sim-panel__eyebrow">
        {{ t('sett.group-simulator') }}
      </p>
      <p class="sim-panel__desc">
        {{ t('sett.group-simulator-desc') }}
      </p>
    </header>

    <div class="row">
      <span class="row__label">{{ t('audio.source-label') }}</span>
      <AudioSourceToggle />
    </div>

    <template v-if="showSlider">
      <div class="slider-block">
        <div class="slider-readout">
          <span class="slider-readout__big">{{ sliderMs.toFixed(1) }}</span>
          <span class="slider-readout__unit">m/s</span>
        </div>
        <input
          v-model.number="sliderMs"
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

    <p v-if="local && local.buzzer_volume === 0 && sliderMs !== 0" class="hint hint--alert">
      {{ t('sett.sim-label3') }}
    </p>
  </section>
</template>

<route lang="yaml">
meta:
  layout: default
</route>

<style scoped>
.sim-panel {
  background: var(--ck-paper);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  padding: var(--ck-s-lg);
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
  text-align: left;
}

.sim-panel__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
}

.sim-panel__eyebrow {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h1);
  font-weight: 700;
  margin: 0;
  line-height: var(--ck-line-tight);
  text-transform: uppercase;
}

.sim-panel__desc {
  font-size: var(--ck-fs-body);
  color: var(--ck-ink-dim);
  margin: 0;
  line-height: var(--ck-line-body);
}

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
