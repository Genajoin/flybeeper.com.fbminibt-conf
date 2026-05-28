<script setup lang="ts">
/**
 * Global "connect attempt failed" banner. Surfaces bt.errorMessage on every
 * route (the OFFLINE pill triggers connectToRequestDevice from anywhere — if
 * the attempt fails on /settings/* the user would otherwise only see a console
 * line). PairingWizard has its own inline error spot for the wizard flow; that
 * is still useful there, and this banner is suppressed while the wizard is
 * mounted (no connection has been established this session).
 */
const bt = useBluetoothStore()
const { t } = useI18n()

// While a fresh attempt is in flight (or has succeeded), the stale error is
// not actionable — hide the banner. connectToRequestDevice itself clears
// errorMessage at the start of each attempt, but isConnecting flips to true
// for the duration of the dialog → connect → fetch chain.
const show = computed(() =>
  !!bt.errorMessage && !bt.isConnecting && !bt.isFetching && !bt.isConnected,
)

function retry() {
  bt.connectToRequestDevice()
}

function dismiss() {
  bt.errorMessage = ''
}
</script>

<template>
  <Transition name="banner">
    <CkBannerRow
      v-if="show"
      class="err"
      accent="var(--ck-signal)"
      :eyebrow="t('pair.connect-err-eyebrow')"
      :title="t('pair.connect-err-title')"
      :sub="bt.errorMessage"
    >
      <template #actions>
        <!-- Design (.design/src/cockpit.jsx:783-790 "ERROR · pairing") uses an
             ink-filled RETRY: black bg, paper text. btn-primary--ink matches. -->
        <button class="btn-primary--ink" type="button" @click="retry">
          {{ t('pair.connect-err-retry') }}
        </button>
        <button type="button" @click="dismiss">
          {{ t('pair.connect-err-dismiss') }}
        </button>
      </template>
    </CkBannerRow>
  </Transition>
</template>

<style scoped>
.err {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 21;
}

.banner-enter-active,
.banner-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.banner-enter-from,
.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
