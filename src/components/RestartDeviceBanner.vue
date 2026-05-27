<script setup lang="ts">
const settings = useSettingsStore()
const bt = useBluetoothStore()
const { t } = useI18n()

const dismissed = ref(false)

const show = computed(() => settings.restartPending && !dismissed.value)

watch(() => settings.restartPending, (now) => {
  if (now)
    dismissed.value = false
})

watch(() => bt.isConnected, (now) => {
  if (now)
    dismissed.value = false
})
</script>

<template>
  <Transition name="restart">
    <CkBannerRow
      v-if="show"
      class="restart"
      accent="var(--ck-signal)"
      :eyebrow="t('pair.restart-eyebrow')"
      :title="t('pair.restart-title')"
      :sub="t('sett.restart-device')"
    >
      <template #actions>
        <button class="btn-primary" type="button" @click="dismissed = true">
          {{ t('pair.restart-ack') }}
        </button>
      </template>
    </CkBannerRow>
  </Transition>
</template>

<style scoped>
.restart {
  position: sticky;
  top: 0;
  z-index: 7;
}

.restart-enter-active,
.restart-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.restart-enter-from,
.restart-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
