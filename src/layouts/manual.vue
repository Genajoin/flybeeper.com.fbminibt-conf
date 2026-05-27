<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()

/**
 * Manuals live at /devices/<sku>/manual-{en,ru,de}. Pluck both the sku
 * and the manual's own language from the path: the breadcrumb returns
 * to the product landing, and the per-page language chips let the
 * reader hop between EN / RU / DE manuals without changing the UI
 * locale (those are independent — the UI locale stays under the global
 * UtilityToggles in the strip).
 */
const sku = computed(() => {
  const segments = (route.path || '').split('/').filter(Boolean)
  const i = segments.indexOf('devices')
  return i >= 0 ? segments[i + 1] : ''
})

const currentManualLocale = computed<'en' | 'ru' | 'de'>(() => {
  const m = (route.path || '').match(/manual-([a-z]{2})\b/)
  return (m ? m[1] : 'en') as 'en' | 'ru' | 'de'
})

const backTo = computed(() => (sku.value ? `/devices/${sku.value}` : '/devices'))

function pathFor(lang: 'en' | 'ru' | 'de') {
  return sku.value ? `/devices/${sku.value}/manual-${lang}` : '#'
}
</script>

<template>
  <UpdateBanner />
  <BluefyBanner />
  <DisconnectBanner />
  <RestartDeviceBanner />
  <SimulationBanner />
  <PresetImportBanner />
  <main class="manual">
    <PageHeader :breadcrumb-to="backTo" breadcrumb-label="← BACK" />
    <ManualLangChips :current="currentManualLocale" :to-path="pathFor" />
    <article class="manual__body">
      <RouterView />
    </article>
  </main>
  <TheFooter />
  <ReconnectDiffDialog />
  <InstallToast />
</template>

<style scoped>
.manual {
  background: var(--ck-bg);
  color: var(--ck-ink);
  min-height: 100dvh;
}

.manual__body {
  background: var(--ck-paper);
  padding: 24px 22px 40px;
}

@media (min-width: 960px) {
  .manual__body {
    padding: 36px 64px 64px;
  }
}

.manual__body :deep(.prose h1) {
  font-size: 38px;
  letter-spacing: -1.4px;
  margin: 4px 0 18px;
}

.manual__body :deep(.prose h2) {
  font-size: 24px;
  letter-spacing: -0.6px;
  margin: 28px 0 10px;
}

.manual__body :deep(.prose h3) {
  font-size: 18px;
  margin: 22px 0 8px;
}
</style>
