<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const { isActive, valueMs, stop } = useSimulation()
const bt = useBluetoothStore()
const { t } = useI18n()

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
</script>

<template>
  <Transition name="sim">
    <CkBannerRow
      v-if="show"
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
