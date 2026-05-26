<script setup lang="ts">
/**
 * Shared simulator UI — audio source toggle, slider with readout, snap presets,
 * Demo walk-through. Used by /settings/simulator and /settings/curves (where
 * it sits under the CurveEditor so the user can drag breakpoints and hear
 * the result without leaving the page).
 *
 * State that needs to survive across the two mount points lives in the
 * shared composables (useSimulation singleton write queue, useAudioSource
 * persisted toggle, useToneSynth — one synth per component instance, which
 * is fine because only one of these is mounted at a time).
 */

const bt = useBluetoothStore()
const { t } = useI18n()
const { source } = useAudioSource()
const synth = useToneSynth()
const sim = useSimulation()

const SLIDER_MIN_MS = -5
const SLIDER_MAX_MS = 10
const SLIDER_STEP_MS = 0.1

const sliderMs = ref(sim.valueMs.value)
const SYNC_EPS = 0.05
watch(() => sim.valueMs.value, (v) => {
  if (Math.abs(sliderMs.value - v) > SYNC_EPS)
    sliderMs.value = v
})

const CPF_VARIO_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
const CPF_FREQ_UUID = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CPF_CYCLE_UUID = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const CPF_DUTY_UUID = '98c16914-00ad-47ba-b625-148f0baaec47'

const DEFAULT_CURVES = {
  buzzer_vario_dots: [-1400, -800, -100, 0, 5, 20, 100, 200, 300, 450, 1200, 2000],
  buzzer_frequency_dots: [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
  buzzer_cycle_dots: [850, 790, 725, 750, 665, 595, 430, 325, 265, 210, 120, 100],
  buzzer_duty_dots: [100, 98, 95, 38, 40, 41, 43, 46, 49, 54, 78, 90],
}

const synthCurves = computed(() => {
  const find = (uuid: string) => bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
  const vario = find(CPF_VARIO_UUID)?.formattedValue as number[] | undefined
  const freq = find(CPF_FREQ_UUID)?.formattedValue as number[] | undefined
  const cycle = find(CPF_CYCLE_UUID)?.formattedValue as number[] | undefined
  const duty = find(CPF_DUTY_UUID)?.formattedValue as number[] | undefined
  if (vario && freq && cycle && duty)
    return { buzzer_vario_dots: vario, buzzer_frequency_dots: freq, buzzer_cycle_dots: cycle, buzzer_duty_dots: duty }
  return DEFAULT_CURVES
})

// Browser tone volume — independent of the device buzzer_volume on purpose
// (Browser source means "preview without bothering the device" / "device is
// muted in flight").
const BROWSER_TONE_VOLUME = 0.5

function previewBrowser(cmS: number) {
  if (cmS === 0) {
    synth.stop()
    return
  }
  synth.playForVario(cmS, synthCurves.value, BROWSER_TONE_VOLUME)
}

// Re-fire browser tone when curves edits land (the user dragging a curve
// handle while the slider is held mid-air must hear the new value).
watch(synthCurves, () => {
  if (source.value !== 'browser')
    return
  const cmS = Math.round(sliderMs.value * 100)
  previewBrowser(cmS)
}, { deep: true })

watch(sliderMs, (v) => {
  const cmS = Math.round(v * 100)
  if (source.value === 'device')
    sim.setValueCmS(cmS)
  else if (source.value === 'browser')
    previewBrowser(cmS)
})

watch(source, (next, prev) => {
  if (prev === 'device' && sim.isActive.value)
    sim.stop()
  if (prev === 'browser')
    synth.stop()
  const cmS = Math.round(sliderMs.value * 100)
  if (next === 'browser') {
    void synth.ensureContext()
    previewBrowser(cmS)
  }
  else if (next === 'device') {
    sim.setValueCmS(cmS)
  }
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

// Leaving the host page takes the device out of simulation. If two pages host
// this component (curves + simulator), navigating between them tears down
// the channel cleanly: onUnmounted on one mount-point, onMounted on the next.
onUnmounted(() => {
  if (demoTimer)
    clearInterval(demoTimer)
  if (sim.isActive.value)
    sim.stop()
  synth.stop()
})
</script>

<template>
  <div class="ctrl">
    <div class="ctrl__row">
      <span class="ctrl__label">{{ t('audio.source-label') }}</span>
      <AudioSourceToggle />
    </div>

    <div class="ctrl__slider-block">
      <div class="ctrl__readout">
        <span class="ctrl__readout-big" :class="{ 'ctrl__readout-big--signal': sliderMs > 0 }">{{ sliderMs >= 0 ? '+' : '' }}{{ sliderMs.toFixed(1) }}</span>
        <span class="ctrl__readout-unit">M/S</span>
      </div>
      <ClimbrateSlider
        v-model="sliderMs"
        :min="SLIDER_MIN_MS"
        :max="SLIDER_MAX_MS"
        :step="SLIDER_STEP_MS"
        @pointerdown="source === 'browser' && synth.ensureContext()"
      >
        <template #extra>
          <span class="ctrl__spacer" />
          <button
            type="button"
            class="ctrl__demo"
            @click="isDemoRunning ? stopDemo() : startDemo()"
          >
            ▶ {{ isDemoRunning ? t('audio.demo-stop') : t('audio.demo') }}
          </button>
        </template>
      </ClimbrateSlider>
    </div>
  </div>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
}

.ctrl__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ck-s-md);
  flex-wrap: wrap;
}

.ctrl__label {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.ctrl__slider-block {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
}

.ctrl__readout {
  display: flex;
  align-items: baseline;
  gap: var(--ck-s-xs);
  justify-content: center;
}

.ctrl__readout-big {
  font-family: var(--ck-font-display);
  font-size: 3rem;
  font-weight: 700;
  color: var(--ck-ink);
  font-variant-numeric: tabular-nums;
}

.ctrl__readout-unit {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-body);
  color: var(--ck-dim);
}

.ctrl__readout-big--signal {
  color: var(--ck-signal);
}

.ctrl__spacer {
  flex: 1;
}

.ctrl__demo {
  padding: 5px 12px;
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border: var(--ck-stroke-rule) solid var(--ck-signal);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  border-radius: 0;
  text-transform: uppercase;
}
</style>
