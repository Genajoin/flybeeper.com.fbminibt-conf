<script setup lang="ts">
/**
 * Shared simulator UI — audio source toggle, slider with readout, snap presets,
 * Demo walk-through. Mounted inside the combined Sound page (/settings/audio)
 * under the curve editor so the user can drag breakpoints and hear the result
 * without leaving the page.
 *
 * State that survives across mount/unmount lives in the shared composables
 * (useSimulation singleton write queue, useAudioSource persisted toggle,
 * useToneSynth — one synth per component instance).
 */

import { DEMO_SETTINGS } from '~/composables/useDemoSnapshot'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()
const { source } = useAudioSource()
const synth = useToneSynth()
const sim = useSimulation()

const CPF_CLIMB_ON_UUID = 'fcb14ed9-06e7-4a9e-b311-6eee676a2f48'
const CPF_SINK_ON_UUID = 'b713f438-42fe-46fe-b052-371a3b9e433a'
const CPF_SMOOTH_FREQ_UUID = 'e88b07e7-9035-4afa-9fe8-206ddc34de61'

function readNumChar(uuid: string): number | null {
  const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
  const v = ch?.formattedValue
  if (typeof v === 'number')
    return v
  const local = settings.local?.[uuid]
  return typeof local === 'number' ? local : null
}

function readBoolChar(uuid: string): boolean {
  const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === uuid)
  const v = ch?.formattedValue
  if (typeof v === 'boolean')
    return v
  const local = settings.local?.[uuid]
  return typeof local === 'boolean' ? local : false
}

// climb-on / sink-on are the start-of-tone thresholds. The buzzer (and the
// browser preview) stays silent between these two values. Values are
// presented in m/s after the CPF exponent has been applied, so we convert
// to cm/s for comparison against the slider's cmS value.
const climbOnCmS = computed<number>(() => {
  const v = readNumChar(CPF_CLIMB_ON_UUID)
  return typeof v === 'number' ? Math.round(v * 100) : 0
})
const sinkOnCmS = computed<number>(() => {
  const v = readNumChar(CPF_SINK_ON_UUID)
  return typeof v === 'number' ? Math.round(v * 100) : 0
})

// "Smooth frequency change" CPF char — when off, the synth must lock
// freq/cycle/duty for the duration of each cycle and only step at the cycle
// boundary so the user can hear the discrete jumps.
const smoothFrequencyChange = computed<boolean>(() => readBoolChar(CPF_SMOOTH_FREQ_UUID))

const SLIDER_MIN_MS = -5
const SLIDER_MAX_MS = 10
// Step follows the curve editor's zoom: at 10× the user is fine-tuning
// around the dead-band so we drop to 0.01 m/s; otherwise 0.1 m/s.
const { zoomLevel } = useCurveZoom()
const sliderStepMs = computed(() => (zoomLevel.value >= 10 ? 0.01 : 0.1))
const sliderDecimals = computed(() => (zoomLevel.value >= 10 ? 2 : 1))

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

// True when the buzzer should be silent at varioCmS, per the climb-on / sink-on
// thresholds. Climb-on is positive (e.g. +20 cm/s) and sink-on is negative
// (e.g. -180 cm/s); the dead-band sits between them.
function inDeadBand(cmS: number): boolean {
  return cmS < climbOnCmS.value && cmS > sinkOnCmS.value
}

function paramsForCmS(cmS: number): ReturnType<typeof synth.playForVario> | null {
  const c = synthCurves.value
  if (!c.buzzer_vario_dots || !c.buzzer_frequency_dots || !c.buzzer_cycle_dots || !c.buzzer_duty_dots)
    return null
  return {
    frequencyHz: interpolate(c.buzzer_vario_dots, c.buzzer_frequency_dots, cmS),
    cycleMs: interpolate(c.buzzer_vario_dots, c.buzzer_cycle_dots, cmS),
    dutyPercent: interpolate(c.buzzer_vario_dots, c.buzzer_duty_dots, cmS),
    volume: BROWSER_TONE_VOLUME,
  }
}

// Latest cmS in a ref so the synth's per-cycle paramsProvider (smooth=OFF
// mode) can read the live value without us calling play() on every move.
const liveCmS = ref(0)

function previewBrowser(cmS: number) {
  liveCmS.value = cmS
  if (cmS === 0 || inDeadBand(cmS)) {
    synth.stop()
    return
  }
  const params = paramsForCmS(cmS)
  if (!params)
    return
  // Smooth=ON: each slider move restarts the schedule with fresh params; the
  // 2-second scheduled horizon glides continuously between calls.
  // Smooth=OFF: the schedule keeps walking and the provider snapshots fresh
  // params at every cycle boundary — slider moves between cycle boundaries
  // don't disturb the in-flight cycle.
  if (smoothFrequencyChange.value) {
    synth.setParamsProvider(null)
    synth.play(params)
  }
  else {
    // Install the provider before play() so the very first cycle is locked.
    synth.setParamsProvider(() => {
      const cmS2 = liveCmS.value
      if (cmS2 === 0 || inDeadBand(cmS2))
        return null
      return paramsForCmS(cmS2)
    })
    synth.play(params)
  }
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
  // Shared "current preview position" — drives the live cursor in the chart
  // regardless of which audio source we're using.
  sim.previewCmS.value = cmS
  if (source.value === 'device') {
    sim.setValueCmS(cmS)
    return
  }
  if (source.value !== 'browser')
    return
  liveCmS.value = cmS
  // Smooth=OFF mode: the synth's provider will pick up the new value at the
  // next cycle boundary on its own. Don't restart the schedule — that would
  // defeat the locking behaviour. We still need to stop when entering the
  // dead-band or zero, otherwise the cycle keeps audible.
  if (!smoothFrequencyChange.value && synth.isPlaying.value) {
    if (cmS === 0 || inDeadBand(cmS))
      synth.stop()
    return
  }
  previewBrowser(cmS)
})

// React to threshold or smooth-flag changes while the synth is playing.
watch([climbOnCmS, sinkOnCmS, smoothFrequencyChange], () => {
  if (source.value === 'browser') {
    const cmS = Math.round(sliderMs.value * 100)
    previewBrowser(cmS)
  }
})

watch(source, (next, prev) => {
  if (prev === 'device' && sim.isActive.value)
    sim.stop()
  if (prev === 'browser') {
    synth.setParamsProvider(null)
    synth.stop()
  }
  const cmS = Math.round(sliderMs.value * 100)
  if (next === 'browser') {
    void synth.ensureContext()
    previewBrowser(cmS)
  }
  else if (next === 'device') {
    sim.setValueCmS(cmS)
  }
})

/**
 * Demo: starts from the current slider position and sweeps the slider up to
 * +10 m/s, then back down to −5 m/s, looping until the user toggles the
 * button off. Speed is time-based (m/s per second) so frame-rate jitter
 * doesn't compress the sweep.
 */
const isDemoRunning = ref(false)
const DEMO_TOP_MS = 10
const DEMO_BOTTOM_MS = -5
const DEMO_SPEED_MS_PER_S = 1.05 // slower than feels-natural so single ticks audibly settle
const DEMO_TICK_MS = 1000 / 60
let demoTimer: ReturnType<typeof setInterval> | null = null
let demoDirection: 1 | -1 = 1
let demoLastTickAt = 0

function startDemo() {
  if (isDemoRunning.value)
    return
  isDemoRunning.value = true
  if (source.value === 'browser')
    void synth.ensureContext()
  // Choose direction so we always have somewhere to go from the current
  // position — if we're already at (or above) the top, head down first.
  demoDirection = sliderMs.value >= DEMO_TOP_MS ? -1 : 1
  demoLastTickAt = performance.now()
  demoTimer = setInterval(() => {
    const now = performance.now()
    const dt = (now - demoLastTickAt) / 1000
    demoLastTickAt = now
    let next = sliderMs.value + demoDirection * DEMO_SPEED_MS_PER_S * dt
    if (next >= DEMO_TOP_MS) {
      next = DEMO_TOP_MS
      demoDirection = -1
    }
    else if (next <= DEMO_BOTTOM_MS) {
      next = DEMO_BOTTOM_MS
      demoDirection = 1
    }
    sliderMs.value = next
  }, DEMO_TICK_MS)
}

function stopDemo() {
  isDemoRunning.value = false
  if (demoTimer)
    clearInterval(demoTimer)
  demoTimer = null
  // Intentionally leave sliderMs where the loop happened to stop — feels
  // more natural than snapping back to zero, and the user can keep editing
  // curves from that vario position right away.
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
        :min="SLIDER_MIN_MS"
        :max="SLIDER_MAX_MS"
        :step="sliderStepMs"
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
