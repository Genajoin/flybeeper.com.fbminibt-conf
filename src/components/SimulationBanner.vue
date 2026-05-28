<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const { isActive, valueMs, stop } = useSimulation()
const bt = useBluetoothStore()
const settings = useSettingsStore()
const { source } = useAudioSource()
const router = useRouter()
const { t } = useI18n()

// Device buzzer_volume — when the user is auditioning via the device but the
// firmware buzzer is muted, the slider produces nothing audible. The
// "simulation active" banner is misleading in that case (no sound is reaching
// the user), so we swap it for a more useful "device muted" variant that
// links straight to the volume control. Silent variant takes priority.
//
// No route-based suppression: the simulator is currently only operable on
// /settings/audio (that's where SimulatorControls lives), and stopping it
// happens on unmount when leaving the page. Suppressing the banner there
// would mean it never showed at all.
const CPF_BUZZER_VOLUME_UUID = '67f82d94-2b2a-4123-81c9-058e460c3d01'
const deviceBuzzerVolume = computed<number | null>(() => {
  const ch = bt.bleCharacteristics.find(c => c.characteristic.uuid === CPF_BUZZER_VOLUME_UUID)
  const v = ch?.formattedValue
  if (typeof v === 'number')
    return v
  const local = settings.local?.[CPF_BUZZER_VOLUME_UUID]
  return typeof local === 'number' ? local : null
})
const silentMode = computed(() =>
  bt.isConnected && source.value === 'device' && deviceBuzzerVolume.value === 0,
)

/**
 * Debounced visibility. The slider is continuous, so it spends a few ms at
 * exactly 0 every time the user crosses through zero, and the raw "isActive"
 * flag flips off and on again — making the banner flash. We only show the
 * banner once the simulation has been active for ≥1.5 s, and we hold the
 * banner for 0.6 s after deactivation to swallow brief zero crossings.
 */
const SHOW_DELAY_MS = 1500
const HIDE_DELAY_MS = 600

const show = ref(false)
let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

function clearShow() {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
}
function clearHide() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

watch(() => bt.isConnected && isActive.value, (active) => {
  if (active) {
    clearHide()
    // If already showing, nothing to do. If not yet showing and no pending
    // appearance timer, start the appearance countdown.
    if (!show.value && !showTimer) {
      showTimer = setTimeout(() => {
        show.value = true
        showTimer = null
      }, SHOW_DELAY_MS)
    }
  }
  else {
    // Activity ended. Cancel any pending appearance (we never showed it, so
    // suppress it entirely). If the banner is already visible, schedule a
    // short hide so a momentary zero-crossing doesn't make it strobe.
    clearShow()
    if (show.value && !hideTimer) {
      hideTimer = setTimeout(() => {
        show.value = false
        hideTimer = null
      }, HIDE_DELAY_MS)
    }
  }
}, { immediate: true })

onBeforeUnmount(() => {
  clearShow()
  clearHide()
})

function onStop() {
  // Stop is an explicit user action — close the banner immediately, don't
  // wait for the hide-debounce to elapse.
  stop()
  clearShow()
  clearHide()
  show.value = false
}

function openAudioSettings() {
  void router.push('/settings/audio')
}

// Which variant to actually render. Silent variant has priority over the
// standard "sim active" message — if the device is muted, "vario simulation
// active" is technically true but practically useless to the user.
type Variant = 'silent' | 'sim' | null
const variant = computed<Variant>(() => {
  if (!show.value)
    return null
  if (silentMode.value)
    return 'silent'
  return 'sim'
})
</script>

<template>
  <Transition name="sim">
    <CkBannerRow
      v-if="variant === 'silent'"
      class="sim"
      accent="var(--ck-ink)"
      :eyebrow="t('audio.silent-device-eyebrow')"
      :title="t('audio.silent-device-title')"
      :sub="t('audio.silent-device-body')"
    >
      <template #actions>
        <button class="btn-primary--ink" type="button" @click="openAudioSettings">
          {{ t('audio.silent-device-cta') }}
        </button>
        <button type="button" @click="onStop">
          {{ t('pair.sim-stop') }}
        </button>
      </template>
    </CkBannerRow>
    <CkBannerRow
      v-else-if="variant === 'sim'"
      class="sim"
      accent="var(--ck-signal)"
      :eyebrow="t('pair.sim-eyebrow')"
      :title="t('pair.sim-title')"
      :sub="t('pair.sim-sub', { value: valueMs.toFixed(1) })"
    >
      <template #actions>
        <button class="btn-primary" type="button" @click="onStop">
          {{ t('pair.sim-stop') }}
        </button>
      </template>
    </CkBannerRow>
  </Transition>
</template>

<style scoped>
.sim {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 11;
}

.sim-enter-active,
.sim-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.sim-enter-from,
.sim-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
