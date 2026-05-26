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
// ref so dragging feels instant — pushing through the store on every keystroke
// would couple slider lag to BLE write latency. We re-sync from sim.valueMs
// when external code resets it (e.g. SimulationBanner's Stop button calling
// sim.stop() — without this, the banner went away but the slider stayed at
// the last drag position).
const sliderMs = ref(sim.valueMs.value)
const SYNC_EPS = 0.05
watch(() => sim.valueMs.value, (v) => {
  if (Math.abs(sliderMs.value - v) > SYNC_EPS)
    sliderMs.value = v
})

// No throttling here — useSimulation.setValueCmS serialises BLE writes and
// drops intermediate values when a write is in flight, so the slider can fire
// as often as it wants without producing "GATT operation already in progress".

const CPF_VARIO_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
const CPF_FREQ_UUID = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CPF_CYCLE_UUID = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const CPF_DUTY_UUID = '98c16914-00ad-47ba-b625-148f0baaec47'

// Default curves — used by the browser tone synth when the device hasn't read
// its curves yet (or there's no device at all). Matches the "default" preset
// in /settings/curves so the offline preview is at least sensible. Spec says
// the user should be able to play with these settings without a device, and
// this is what makes the simulator audible immediately on /settings/simulator.
const DEFAULT_CURVES = {
  buzzer_vario_dots: [-1400, -800, -100, 0, 5, 20, 100, 200, 300, 450, 1200, 2000],
  buzzer_frequency_dots: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
  buzzer_cycle_dots: [850, 790, 725, 750, 665, 595, 430, 325, 265, 210, 120, 100],
  buzzer_duty_dots: [100, 98, 95, 38, 40, 41, 43, 46, 49, 54, 78, 90],
}

const synthCurves = computed(() => {
  if (local.value)
    return local.value.curves
  const find = (uuid: string) => bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
  const vario = find(CPF_VARIO_UUID)?.formattedValue as number[] | undefined
  const freq = find(CPF_FREQ_UUID)?.formattedValue as number[] | undefined
  const cycle = find(CPF_CYCLE_UUID)?.formattedValue as number[] | undefined
  const duty = find(CPF_DUTY_UUID)?.formattedValue as number[] | undefined
  // 12-element CPF arrays (format 0x1B) bypass the descriptor exponent —
  // vario is already cm/s, matching useToneSynth.playForVario(varioCmS, …).
  if (vario && freq && cycle && duty)
    return { buzzer_vario_dots: vario, buzzer_frequency_dots: freq, buzzer_cycle_dots: cycle, buzzer_duty_dots: duty }
  // Fall back to defaults so the browser preview works even before the device
  // finished reading its curves (BLE reads are serialised — curves are 4 of
  // ~20 characteristics in the queue).
  return DEFAULT_CURVES
})

// Browser tone is independent of the device buzzer_volume — the user explicitly
// chose Browser as the audio source, presumably to preview without bothering
// the device (or with the device muted in flight). Keep a comfortable constant
// so it's always audible. If a per-browser volume knob is wanted, we'll add
// one as a slider next to AudioSourceToggle.
const BROWSER_TONE_VOLUME = 0.5

function previewBrowser(cmS: number) {
  if (cmS === 0) {
    synth.stop()
    return
  }
  // synthCurves never returns null now — falls back to DEFAULT_CURVES.
  const params = synth.playForVario(cmS, synthCurves.value, BROWSER_TONE_VOLUME)
  if (!params)

    console.warn('[sim] playForVario returned null', { cmS, curves: synthCurves.value })
}

watch(sliderMs, (v) => {
  const cmS = Math.round(v * 100)
  if (source.value === 'device')
    sim.setValueCmS(cmS)
  else if (source.value === 'browser')
    previewBrowser(cmS)
})

// Source switch: stop the OLD channel (silence the device or the synth) and
// pick up the slider's current value on the NEW channel — otherwise the user
// gets "device keeps beeping after flipping to Browser", "device stays silent
// after flipping from Browser back to Device with the slider mid-air", etc.
watch(source, (next, prev) => {
  // Tear down the channel we're leaving.
  if (prev === 'device' && sim.isActive.value)
    sim.stop()
  if (prev === 'browser')
    synth.stop()

  // Bring up the channel we're entering. Slider may be sitting at non-zero.
  const cmS = Math.round(sliderMs.value * 100)
  if (next === 'browser') {
    void synth.ensureContext()
    previewBrowser(cmS)
  }
  else if (next === 'device') {
    sim.setValueCmS(cmS)
  }
  // 'off' — both channels already torn down above.
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

// Slider is always usable in browser mode — the spec calls for the user to
// be able to try settings without a device. The `device` source obviously
// no-ops without a connection (the underlying setValueCmS guards on
// bt.isConnected and logs a hint).
const showSlider = computed(() => true)

// Leaving the simulator page MUST take the device out of simulation mode —
// otherwise it stays stuck (audit feedback). Same on unmount for any reason.
onBeforeRouteLeave(() => {
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
  if (sim.isActive.value)
    sim.stop()
  synth.stop()
})

onUnmounted(() => {
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
  </section>
</template>

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
