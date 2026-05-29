<script lang="ts">
// Module-scope so the dismissal survives layout swaps (default.vue ↔
// home.vue) and route navigation. Was per-instance before, which meant
// "work offline" was forgotten the moment the user navigated away.
const dismissed = ref(false)
</script>

<script setup lang="ts">
const bt = useBluetoothStore()
const saved = useSavedDevicesStore()
const { t } = useI18n()

const show = computed(() =>
  bt.hasConnectedThisSession && !bt.isConnected && !dismissed.value,
)

watch(() => bt.isConnected, (now) => {
  if (now)
    dismissed.value = false
})

function reconnect() {
  // We just lost a device this session — reconnect straight to the most
  // recently seen one (no picker). connectToSavedDevice falls back to the
  // chooser if that device is no longer reachable without one.
  const last = saved.sortedByLastSeen[0]
  if (last)
    bt.connectToSavedDevice(last.id)
  else
    bt.connectToRequestDevice()
}
</script>

<template>
  <Transition name="banner">
    <CkBannerRow
      v-if="show"
      class="disc"
      accent="var(--ck-ink)"
      :eyebrow="t('pair.disc-eyebrow')"
      :title="t('pair.disc-title')"
      :sub="t('pair.disc-sub')"
    >
      <template #actions>
        <button class="btn-primary--ink" type="button" @click="reconnect">
          {{ t('pair.disc-reconnect') }}
        </button>
        <button type="button" @click="dismissed = true">
          {{ t('pair.disc-work-offline') }}
        </button>
      </template>
    </CkBannerRow>
  </Transition>
</template>

<style scoped>
.disc {
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
