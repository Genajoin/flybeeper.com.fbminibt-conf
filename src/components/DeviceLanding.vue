<script setup lang="ts">
import type { DeviceEntry } from '~/composables/useDeviceCatalog'

const props = defineProps<{
  sku: string
}>()

const { t, locale } = useI18n()
const { bySku } = useDeviceCatalog()

const device = computed<DeviceEntry | undefined>(() => bySku(props.sku))
const manualPath = computed(() => `/devices/${props.sku}/manual-${locale.value === 'ru' ? 'ru' : 'en'}`)
const changelogPath = computed(() => `/devices/${props.sku}/changelog`)
</script>

<template>
  <article v-if="device" class="device">
    <header class="device__head">
      <p class="device__eyebrow">
        {{ t('home.eyebrow') }}
      </p>
      <h1 class="device__title">
        {{ device.displayName }}
      </h1>
      <p class="device__body">
        {{ t(device.aboutKey) }}
      </p>
      <p class="device__meta">
        {{ t('about.p4') }}
      </p>
    </header>

    <div class="device__actions">
      <RouterLink class="device__btn device__btn--primary" :to="changelogPath">
        {{ t('update.firmware') }}
      </RouterLink>
      <RouterLink class="device__btn" :to="manualPath">
        {{ t('button.manual') }} {{ locale === 'ru' ? 'RU' : 'EN' }}
      </RouterLink>
      <a v-if="device.marketUrl" class="device__btn" :href="device.marketUrl">
        {{ t('about.link-market') }}
      </a>
      <a v-if="device.buyUrl" class="device__btn device__btn--primary" :href="device.buyUrl">
        {{ t('button.buy-now') }}
      </a>
      <a v-if="device.blogUrl" class="device__btn" :href="device.blogUrl">
        {{ t('about.link-blog') }}
      </a>
    </div>

    <div class="device__viewer">
      <StlComponent :stl="device.stlPath" :pos="device.stlPos" />
    </div>

    <RouterLink class="device__back" to="/devices">
      <span class="i-carbon-arrow-left" aria-hidden="true" />
      {{ t('button.back') }}
    </RouterLink>
  </article>
</template>

<style scoped>
.device {
  max-width: 44rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-lg);
  text-align: left;
}

.device__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-sm);
}

.device__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-signal);
  margin: 0;
}

.device__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-display);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  margin: 0;
}

.device__body {
  font-size: var(--ck-fs-body);
  line-height: var(--ck-line-body);
  color: var(--ck-ink);
  margin: 0;
}

.device__meta {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
}

.device__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ck-s-sm);
}

.device__btn {
  display: inline-flex;
  align-items: center;
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  font-weight: 600;
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
  text-decoration: none;
}

.device__btn:hover {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.device__btn--primary {
  background: var(--ck-signal);
  border-color: var(--ck-signal);
  color: var(--ck-on-signal);
}

.device__btn--primary:hover {
  background: var(--ck-ink);
  border-color: var(--ck-ink);
}

.device__viewer {
  padding: var(--ck-s-md);
  background: var(--ck-paper);
  border: var(--ck-stroke-hair) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  /* StlComponent draws onto a fixed-size canvas; cap it so it doesn't blow
   * the page on wide viewports. */
  max-width: 32rem;
  align-self: center;
  width: 100%;
}

.device__back {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-xs);
  align-self: flex-start;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
  text-decoration: none;
}

.device__back:hover {
  color: var(--ck-ink);
}
</style>
