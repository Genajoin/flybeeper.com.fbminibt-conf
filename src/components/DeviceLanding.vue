<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { DeviceEntry } from '~/composables/useDeviceCatalog'

const props = defineProps<{
  sku: string
}>()

const { t, locale } = useI18n()
const { bySku } = useDeviceCatalog()

const device = computed<DeviceEntry | undefined>(() => bySku(props.sku))
const manualPath = computed(() => `/devices/${props.sku}/manual-${locale.value === 'ru' ? 'ru' : 'en'}`)
const changelogPath = computed(() => `/devices/${props.sku}/changelog`)

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
      <RouterLink class="device__btn device__btn--signal" :to="changelogPath">
        {{ t('update.firmware') }} ↓
      </RouterLink>
      <RouterLink class="device__btn" :to="manualPath">
        {{ t('button.manual') }} · {{ locale === 'ru' ? 'RU' : 'EN' }}
      </RouterLink>
      <a v-if="device.marketUrl" class="device__btn" :href="device.marketUrl" target="_blank" rel="noopener">
        {{ t('about.link-market') }} ↗
      </a>
      <a v-if="device.buyUrl" class="device__btn device__btn--signal" :href="device.buyUrl" target="_blank" rel="noopener">
        {{ t('button.buy-now') }} ↗
      </a>
      <a v-if="device.blogUrl" class="device__btn" :href="device.blogUrl" target="_blank" rel="noopener">
        {{ t('about.link-blog') }} ↗
      </a>
    </div>
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

@media (min-width: 720px) {
  .device__display {
    font-size: 52px;
  }
  .device__btn {
    min-width: 0;
  }
}
</style>
