<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const { t } = useI18n()
const { bySku } = useDeviceCatalog()
const fwIndex = useFirmwareIndex()

const sku = computed(() => String(route.params.sku || ''))
const device = computed(() => bySku(sku.value))
const files = computed(() => fwIndex.filesFor(sku.value))
const latest = computed(() => fwIndex.latestFor(sku.value))
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
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
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
