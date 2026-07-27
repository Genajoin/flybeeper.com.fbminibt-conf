<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const { t } = useI18n()
const bt = useBluetoothStore()
const { bySku } = useDeviceCatalog()
const fwIndex = useFirmwareIndex()
const fwUpdate = useFirmwareUpdate()
const { phase, isActive, flash } = useFirmwareFlash()

const sku = computed(() => String(route.params.sku || ''))
const device = computed(() => bySku(sku.value))
const files = computed(() => fwIndex.filesFor(sku.value))
const latest = computed(() => fwIndex.latestFor(sku.value))

// The row-level CTA only appears for the latest build and only when THIS
// device is on the other end of the link — flashing an FBFV image into an
// FBTAS is exactly the mistake worth designing out.
const canFlashLatest = computed(() =>
  bt.isConnected && fwUpdate.sku.value === sku.value && !!latest.value && !isActive.value,
)
const breadcrumbTo = computed(() => (sku.value ? `/devices/${sku.value}` : '/devices'))
const breadcrumbLabel = computed(() => {
  const name = device.value?.displayName || sku.value
  return `← ${name.toUpperCase()}`
})

function downloadHref(version: string) {
  return `/firmware/${sku.value}/app_update.${version}.bin`
}
</script>

<template>
  <section class="fwlist">
    <PageHeader :breadcrumb-to="breadcrumbTo" :breadcrumb-label="breadcrumbLabel">
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('update.eyebrow') }}
        </CkEyebrow>
        <h1 class="fwlist__display">
          {{ t('update.firmware-list-title', { model: device?.displayName || sku }) }}
        </h1>
      </template>
    </PageHeader>

    <FirmwareFlashPanel v-if="files.length" :sku="sku" :latest="latest" />

    <div v-if="files.length === 0" class="fwlist__empty">
      <CkEyebrow color="var(--ck-dim)" block>
        {{ t('update.no-public-firmware-eyebrow') }}
      </CkEyebrow>
      <p class="fwlist__empty-body">
        {{ t('update.no-public-firmware') }}
      </p>
    </div>

    <ul v-else class="fwlist__items">
      <li v-for="v in files" :key="v" class="fwlist__row">
        <a class="fwlist__link" :href="downloadHref(v)" download>
          <span class="fwlist__ver">{{ v }}</span>
          <span v-if="v === latest" class="fwlist__badge">{{ t('update.latest-badge') }}</span>
          <span class="fwlist__chev">↓</span>
        </a>
        <button
          v-if="v === latest && canFlashLatest && phase !== 'done'"
          class="fwlist__flash"
          type="button"
          @click="flash(sku, v)"
        >
          {{ t('update.flash-cta-short') }} ⟳
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.fwlist {
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.fwlist__display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 30px;
  letter-spacing: -1.2px;
  line-height: 0.95;
  margin: 6px 0 4px;
  text-transform: uppercase;
}

.fwlist__items {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--ck-paper);
}

.fwlist__row {
  display: flex;
  align-items: stretch;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.fwlist__row > .fwlist__link {
  flex: 1;
}

.fwlist__flash {
  padding: 0 18px;
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
}

.fwlist__link {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 14px;
  padding: 16px 22px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  text-decoration: none;
  font-family: var(--ck-font-mono);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
}

.fwlist__link:hover {
  background: var(--ck-bg-deep);
  color: var(--ck-signal);
}

.fwlist__ver {
  font-size: 16px;
}

.fwlist__badge {
  padding: 4px 8px;
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}

.fwlist__chev {
  font-family: var(--ck-font-mono);
  font-weight: 700;
}

.fwlist__empty {
  padding: 28px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.fwlist__empty-body {
  font-size: 13px;
  color: var(--ck-dim);
  line-height: 1.5;
  margin: 6px 0 0;
  max-width: 540px;
}

@media (min-width: 960px) {
  .fwlist__display {
    font-size: 48px;
    letter-spacing: -1.6px;
  }
}
</style>
