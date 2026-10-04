<script setup lang="ts">
/**
 * Shared simulator UI — audio source toggle, slider with readout, snap presets,
 * a looping demo flight (−2 → +1 → −2 m/s). Mounted inside the combined Sound page (/settings/audio)
 * under the curve editor so the user can drag breakpoints and hear the result
 * without leaving the page.
 *
 * State that survives across mount/unmount lives in the shared composables
 * (useSimulation singleton write queue, useAudioSource persisted toggle,
 * useToneSynth — one synth per component instance).
 */

import { DEMO_SETTINGS } from '~/composables/useDemoSnapshot'
import type { Scenario } from '~/composables/useThresholdLab'
import { SIM_MAX_MS, SIM_MIN_MS } from '~/composables/useCurveZoom'
import { startBuzzerEmulator } from '~/composables/useThresholdLab'
import { recordAction } from '~/utils/sessionJournal'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()
const { source } = useAudioSource()
const synth = useToneSynth()
const sim = useSimulation()

const CPF_SMOOTH_FREQ_UUID = 'e88b07e7-9035-4afa-9fe8-206ddc34de61'

function readBoolChar(uuid: string): boolean {
  const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
  const v = ch?.formattedValue
  if (typeof v === 'boolean')
    return v
  const local = settings.local?.[uuid]
  return typeof local === 'boolean' ? local : false
}

// "Smooth frequency change" CPF char (firmware buzzer_frequency_adaptation) —
// when on, a beep that is already sounding follows the vario; when off, each
// beep keeps the pitch it started with.
const smoothFrequencyChange = computed<boolean>(() => readBoolChar(CPF_SMOOTH_FREQ_UUID))

// The slider shows the same vario window as the chart: −5…+10 m/s at 1×, the
// chart's visible window when zoomed in (useCurveZoom). The step shrinks with
// the window so a 1.5 m/s span still has fine resolution.
const { zoomLevel, viewWindowCmS } = useCurveZoom()
const sliderMinMs = computed(() => viewWindowCmS.value ? viewWindowCmS.value.min / 100 : SIM_MIN_MS)
const sliderMaxMs = computed(() => viewWindowCmS.value ? viewWindowCmS.value.max / 100 : SIM_MAX_MS)
const sliderStepMs = computed(() => (zoomLevel.value >= 10 ? 0.01 : zoomLevel.value > 1 ? 0.05 : 0.1))
const sliderDecimals = computed(() => (zoomLevel.value > 1 ? 2 : 1))
const sliderTicks = computed(() => {
  if (!viewWindowCmS.value)
    return undefined
  const lo = sliderMinMs.value
  const hi = sliderMaxMs.value
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2].find(s => (hi - lo) / s <= 8) ?? 5
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
    out.push(Math.round(v * 100) / 100)
  return out
})

const sliderMs = ref(sim.valueMs.value)
const SYNC_EPS = 0.05
// Only mirror the device's sim characteristic into the slider while the
// user is actually driving the device. In browser mode the slider drives
// the local synth independently — we deliberately keep sliderMs at its
// last position when switching device→browser even though sim.stop() takes
// the device's sim value to 0 (so the device exits its emulation state).
// That lets the user A/B the same vario on the speaker vs. the device
// without re-targeting the slider.
watch(() => sim.valueMs.value, (v) => {
  if (source.value !== 'device')
    return
  if (Math.abs(sliderMs.value - v) > SYNC_EPS)
    sliderMs.value = v
})

const CPF_VARIO_UUID = '512d6d89-7a6f-461c-983e-902b68d40f56'
const CPF_FREQ_UUID = '8c090502-81c4-4d29-8d10-6db20607ace9'
const CPF_CYCLE_UUID = '9c3b62c0-e227-4f1a-8342-7e647015555d'
const CPF_DUTY_UUID = '98c16914-00ad-47ba-b625-148f0baaec47'

// Resolve each curve UUID in priority order:
//   1. live BLE characteristic (when connected),
//   2. local store (mutated by virtual-CPF chars when offline),
//   3. DEMO_SETTINGS (last-resort fallback for SSG / before hydrate).
const synthCurves = computed(() => {
  const fromBle = (uuid: string) =>
    bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)?.formattedValue as number[] | undefined
  const fromLocal = (uuid: string) =>
    settings.local?.[uuid] as number[] | undefined
  const pick = (uuid: string) =>
    fromBle(uuid) ?? fromLocal(uuid) ?? (DEMO_SETTINGS[uuid] as number[])

  return {
    buzzer_vario_dots: pick(CPF_VARIO_UUID),
    buzzer_frequency_dots: pick(CPF_FREQ_UUID),
    buzzer_cycle_dots: pick(CPF_CYCLE_UUID),
    buzzer_duty_dots: pick(CPF_DUTY_UUID),
  }
})

// Browser tone volume — independent of the device buzzer_volume on purpose
// (Browser source means "preview without bothering the device" / "device is
// muted in flight").
const BROWSER_TONE_VOLUME = 0.5

function interpolate(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0])
    return ys[0]
  const n = xs.length
  if (x >= xs[n - 1])
    return ys[n - 1]
  for (let i = 1; i < n; i++) {
    if (x <= xs[i]) {
      const span = xs[i] - xs[i - 1]
      if (span === 0)
        return ys[i - 1]
      const t = (x - xs[i - 1]) / span
      return ys[i - 1] + (ys[i] - ys[i - 1]) * t
    }
  }
  return ys[n - 1]
}

function toneAt(cmS: number) {
  const c = synthCurves.value
  if (!c.buzzer_vario_dots || !c.buzzer_frequency_dots || !c.buzzer_cycle_dots || !c.buzzer_duty_dots)
    return null
  return {
    frequencyHz: interpolate(c.buzzer_vario_dots, c.buzzer_frequency_dots, cmS),
    cycleMs: interpolate(c.buzzer_vario_dots, c.buzzer_cycle_dots, cmS),
    dutyPercent: interpolate(c.buzzer_vario_dots, c.buzzer_duty_dots, cmS),
  }
}

// The browser preview is a port of the firmware's buzzer loop driven by the
// threshold lab (useThresholdLab): 40 ms ticks, EMA trend, decisions only
// between beeps, beep/pause lengths fixed when each phase starts. It runs in
// every audio-source mode so the chart can show the live sound state; only
// the Browser source actually makes noise.
const lab = useThresholdLab()
let stopEmulator: (() => void) | null = null
onMounted(() => {
  stopEmulator = startBuzzerEmulator({
    varioCm: () => Math.round(sliderMs.value * 100),
    toneAt,
    smooth: () => smoothFrequencyChange.value,
    toneOn: (hz) => {
      if (source.value === 'browser')
        synth.gateOn(hz, BROWSER_TONE_VOLUME)
    },
    toneOff: () => synth.gateOff(),
    setFrequency: (hz) => {
      if (source.value === 'browser')
        synth.setFrequency(hz)
    },
  })
})

// Demo playback (useThresholdLab scenario) moves the slider.
watch(() => lab.driveMs.value, (v) => {
  if (v === null)
    return
  sliderMs.value = v
})

watch(sliderMs, (v) => {
  const cmS = Math.round(v * 100)
  // Shared "current preview position" — drives the live cursor in the chart
  // regardless of which audio source we're using.
  sim.previewCmS.value = cmS
  if (source.value === 'device') {
    sim.setValueCmS(cmS)
    return
  }
  if (source.value === 'browser')
    recordAction('simulator', `browser plays simulated vario: ${(cmS / 100).toFixed(2)} m/s`, 'sim:browser', { v: cmS / 100, unit: 'm/s' })
})

watch(source, (next, prev) => {
  if (prev === 'device' && sim.isActive.value)
    sim.stop()
  if (prev === 'browser')
    synth.gateOff()
  if (next === 'browser')
    void synth.ensureContext()
  else if (next === 'device')
    sim.setValueCmS(Math.round(sliderMs.value * 100))
})

function toggleScenario(key: Scenario) {
  if (lab.activeScenario.value === key) {
    lab.stopScenario()
    recordAction('simulator', `scenario stopped: ${key}`)
    return
  }
  if (source.value === 'browser')
    void synth.ensureContext()
  recordAction('simulator', `scenario started (${source.value}): ${key}`)
  lab.runScenario(key)
}

function onSliderGrab() {
  lab.stopScenario()
  if (source.value === 'browser')
    void synth.ensureContext()
}

// Leaving the host page takes the device out of simulation. If two pages host
// this component (curves + simulator), navigating between them tears down
// the channel cleanly: onUnmounted on one mount-point, onMounted on the next.
onUnmounted(() => {
  stopEmulator?.()
  lab.stopScenario()
  if (sim.isActive.value)
    sim.stop()
  synth.stop()
  // The chart's live cursor is driven by previewCmS — when nobody owns the
  // slider any more, reset to 0 so the cursor disappears.
  sim.previewCmS.value = 0
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
        <span class="ctrl__readout-big" :class="{ 'ctrl__readout-big--signal': sliderMs > 0 }">{{ sliderMs >= 0 ? '+' : '' }}{{ sliderMs.toFixed(sliderDecimals) }}</span>
        <span class="ctrl__readout-unit">M/S</span>
      </div>
      <ClimbrateSlider
        v-model="sliderMs"
        :min="sliderMinMs"
        :max="sliderMaxMs"
        :step="sliderStepMs"
        :ticks="sliderTicks"
        @pointerdown="onSliderGrab"
      >
        <template #extra>
          <span class="ctrl__spacer" />
          <button
            type="button"
            class="ctrl__demo"
            :class="{ 'ctrl__demo--active': lab.activeScenario.value === 'demo' }"
            @click="toggleScenario('demo')"
          >
            {{ lab.activeScenario.value === 'demo' ? `■ ${t('audio.demo-stop')}` : `▶ ${t('audio.demo')}` }}
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

.ctrl__demo--active {
  background: var(--ck-ink);
  border-color: var(--ck-ink);
  color: var(--ck-paper);
}
</style>
