<script setup lang="ts">
const bt = useBluetoothStore()

const fwRev = computed(() =>
  Number.parseFloat((bt.dis.firmwareRevisionString.value as string) || '0'),
)
const model = computed(() => bt.dis.modelNumberString.value)

const needsFirmwareUpdate = computed(() =>
  model.value === 'FBminiBT' && fwRev.value > 0 && fwRev.value <= 0.11,
)

const { t } = useI18n()
</script>

<template>
  <section v-if="needsFirmwareUpdate" class="needs-fw">
    <PageHeader
      breadcrumb-to="/cockpit"
      breadcrumb-label="← HOME"
      :eyebrow="t('sett.group-audio')"
      :title="t('update.update-first')"
    />
    <div class="needs-fw__cta">
      <CkCTA kind="signal" to="/devices/fbminibt/changelog">
        {{ t('update.update-first') }}
      </CkCTA>
    </div>
  </section>
  <RouterView v-else />
</template>

<style scoped>
.needs-fw {
  background: var(--ck-bg);
}

.needs-fw__cta {
  padding: 22px;
  background: var(--ck-paper);
}
</style>
