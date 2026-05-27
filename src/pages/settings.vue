<script setup lang="ts">
import { compareFwVersions, stripGitDescribe } from '~/utils/firmwareVersion'
import { resolveSku } from '~/composables/useFirmwareUpdate'

const bt = useBluetoothStore()

/**
 * The legacy 110/111-byte struct codec (read/writeMiniBtSettings) was
 * removed in the v2 rewrite. Until firmware exposes CPF characteristics —
 * which landed in 0.16 for FBminiBT — the configurator has no way to
 * read or write settings. Gate access and point the user at /update.
 */
const sku = computed(() => resolveSku(bt.dis.modelNumberString.value as string | null))
const fwClean = computed(() => stripGitDescribe(bt.dis.firmwareRevisionString.value as string | null))

const needsFirmwareUpdate = computed(() =>
  sku.value === 'fbminibt' && fwClean.value !== '' && compareFwVersions(fwClean.value, '0.16.0') < 0,
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
      <CkCTA kind="signal" to="/devices/fbminibt">
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
