<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()

const dismissed = ref(false)

const show = computed(() =>
  bt.hasConnectedThisSession && !bt.isConnected && !dismissed.value,
)

watch(() => bt.isConnected, (now) => {
  if (now)
    dismissed.value = false
})

function reconnect() {
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
  position: sticky;
  top: 0;
  z-index: 8;
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
