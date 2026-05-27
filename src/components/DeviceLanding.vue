<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { DeviceEntry } from '~/composables/useDeviceCatalog'

const props = defineProps<{
  sku: string
}>()

const { t, locale } = useI18n()
const { bySku } = useDeviceCatalog()
const { latestFor, filesFor } = useFirmwareIndex()

const device = computed<DeviceEntry | undefined>(() => bySku(props.sku))
const manualLocale = computed<'en' | 'ru' | 'de'>(() => (['ru', 'de'].includes(locale.value) ? locale.value as 'ru' | 'de' : 'en'))

const firmwareListPath = computed(() => `/update/firmware/${props.sku}`)

const latestFw = computed(() => latestFor(props.sku))
const fwFiles = computed(() => filesFor(props.sku))
const fwCount = computed(() => fwFiles.value.length)
const fwDownloadHref = computed(() => {
  if (!latestFw.value)
    return ''
  return `/firmware/${props.sku}/app_update.${latestFw.value}.bin`
})

// Lazy-load the STL viewer (~600 KB gz) so the device landing chunk stays
// small. Static decorative role only.
const StlViewer = defineAsyncComponent(() => import('~/components/StlComponent.vue'))
</script>

<template>
  <article v-if="device" class="device">
    <PageHeader
      breadcrumb-to="/devices"
      breadcrumb-label="← DEVICES"
    >
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('home.eyebrow') }}
        </CkEyebrow>
        <h1 class="device__display">
          {{ device.displayName }}
        </h1>
        <p class="device__body">
          {{ t(device.aboutKey) }}
        </p>
      </template>
    </PageHeader>

    <div class="device__viewer">
      <Suspense>
        <StlViewer :stl="device.stlPath" :pos="device.stlPos" />
        <template #fallback>
          <div class="device__loading">
            ...
          </div>
        </template>
      </Suspense>
    </div>

    <div class="device__actions">
      <RouterLink class="device__btn device__btn--signal" :to="firmwareListPath">
        {{ t('update.firmware') }} ↓
      </RouterLink>
      <a v-if="device.marketUrl" class="device__btn" :href="device.marketUrl" target="_blank" rel="noopener">
        {{ t('about.link-market') }} ↗
      </a>
    </div>

    <section class="device__fw" :class="{ 'device__fw--empty': !latestFw }">
      <CkEyebrow color="var(--ck-signal)">
        {{ t('device.firmware-eyebrow') }}
      </CkEyebrow>
      <template v-if="latestFw">
        <h2 class="device__fw-title">
          {{ t('device.firmware-title', { latest: latestFw }) }}
        </h2>
        <p class="device__fw-body">
          {{ t('device.firmware-body', { count: fwCount }) }}
        </p>
        <div class="device__fw-ctas">
          <a
            class="device__btn device__btn--signal"
            :href="fwDownloadHref"
            :download="`app_update.${latestFw}.bin`"
          >
            {{ t('device.firmware-download') }}
          </a>
          <RouterLink class="device__btn" :to="firmwareListPath">
            {{ t('device.firmware-all-builds') }}
          </RouterLink>
        </div>
      </template>
      <p v-else class="device__fw-empty-line">
        {{ t('device.firmware-empty') }}
      </p>
    </section>

    <section class="device__section">
      <h2 class="device__section-title">
        {{ t('device.changelog-title') }}
      </h2>
      <DeviceChangelog :sku="sku" />
    </section>

    <section class="device__section">
      <h2 class="device__section-title">
        {{ t('device.manual-title') }}
      </h2>
      <DeviceManual :sku="sku" :initial-lang="manualLocale" />
    </section>
  </article>
</template>

<style scoped>
.device {
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.device__display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 36px;
  letter-spacing: -1.3px;
  line-height: 0.95;
  margin: 8px 0;
  text-transform: uppercase;
}

.device__body {
  font-size: 13px;
  color: var(--ck-dim);
  line-height: 1.5;
  margin: 0;
  max-width: 540px;
}

.device__viewer {
  padding: 14px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  display: flex;
  justify-content: center;
}

.device__loading {
  padding: 80px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}

.device__actions {
  display: flex;
  flex-wrap: wrap;
}

.device__btn {
  flex: 1;
  min-width: 50%;
  padding: 14px;
  text-align: center;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  background: var(--ck-paper);
  color: var(--ck-ink);
  text-decoration: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.device__btn--signal {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.device__fw {
  padding: 16px 22px;
  background: var(--ck-paper);
  border-left: 8px solid var(--ck-signal);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.device__fw--empty {
  border-left-color: var(--ck-grid);
}

.device__fw-title {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.5px;
  line-height: 1.05;
  margin: 4px 0 6px;
  text-transform: uppercase;
}

.device__fw-body {
  font-size: 13px;
  color: var(--ck-dim);
  margin: 0 0 12px;
  line-height: 1.5;
}

.device__fw-empty-line {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  margin: 4px 0 0;
}

.device__fw-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin: 0 -22px -16px;
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
}

.device__fw-ctas .device__btn {
  border-bottom: none;
}

.device__section {
  background: var(--ck-bg);
}

.device__section-title {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.4px;
  line-height: 1;
  text-transform: uppercase;
  margin: 0;
  padding: 18px 22px 12px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  color: var(--ck-ink);
}

@media (min-width: 720px) {
  .device__display {
    font-size: 52px;
  }
  .device__btn {
    min-width: 0;
  }
  .device__fw {
    padding: 20px 28px;
  }
  .device__fw-ctas {
    margin: 0 -28px -20px;
  }
  .device__section-title {
    padding: 22px 28px 14px;
    font-size: 22px;
  }
}
</style>
