<script setup lang="ts">
import { CPF_UUID_TO_GROUP } from '~/composables/useSettingsGroups'

/**
 * Global "connected but no settings" banner. A connect can succeed (ONLINE
 * pill lit, isConnected true) yet land zero CPF characteristics in the store
 * — seen on iOS Bluefy / WebBLE, whose getPrimaryServices() sometimes returns
 * an incomplete service list right after pairing, omitting the custom 128-bit
 * FlyBeeper Settings Service. Without this banner the settings pages just fall
 * back to virtual (demo) chars silently, so the user edits values that never
 * reach the device. Surface it and offer a reconnect.
 */
const bt = useBluetoothStore()
const { t } = useI18n()

const hasCpfSettings = computed(() =>
  bt.bleCharacteristics.some(c => CPF_UUID_TO_GROUP[c.characteristic.uuid]),
)

const show = computed(() =>
  bt.isConnected && !bt.isFetching && !hasCpfSettings.value,
)

// Discovery diagnostic — shown in the banner so an iOS (Bluefy) connect that
// returns no usable services is debuggable straight from a screenshot.
const diag = computed(() => {
  const d = bt.discovery
  const svc = d.services.map(u => u.slice(0, 8)).join(' ')
  return `${d.chars} chars · ${d.services.length} svc${svc ? `: ${svc}` : ''}`
})

function reconnect() {
  // Drop the half-discovered link and re-run the pairing/discovery flow.
  bt.disconnectDevice().finally(() => bt.connectToRequestDevice())
}
</script>

<template>
  <Transition name="banner">
    <CkBannerRow
      v-if="show"
      class="no-sett"
      accent="var(--ck-signal)"
      :eyebrow="t('pair.no-settings-eyebrow')"
      :title="t('pair.no-settings-title')"
      :sub="`${t('pair.no-settings-sub')} — ${diag}`"
    >
      <template #actions>
        <button class="btn-primary--ink" type="button" @click="reconnect">
          {{ t('pair.no-settings-retry') }}
        </button>
      </template>
    </CkBannerRow>
  </Transition>
</template>

<style scoped>
.no-sett {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
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
