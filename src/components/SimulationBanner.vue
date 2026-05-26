<script setup lang="ts">
const { isActive, valueMs, stop } = useSimulation()
const bt = useBluetoothStore()
const { t } = useI18n()

const show = computed(() => bt.isConnected && isActive.value)
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
        <button class="btn-primary" type="button" @click="stop">
          {{ t('pair.sim-stop') }}
        </button>
      </template>
    </CkBannerRow>
  </Transition>
</template>

<style scoped>
.sim {
  position: sticky;
  top: 0;
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
