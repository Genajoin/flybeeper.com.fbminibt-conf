<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'

type Lang = 'en' | 'ru' | 'de'

const props = withDefaults(defineProps<{
  sku: string
  initialLang?: Lang
}>(), {
  initialLang: 'en',
})

const lang = ref<Lang>(props.initialLang)

watch(() => props.initialLang, (v) => {
  lang.value = v
})

const modules = import.meta.glob('../pages/devices/*/manual-*.md')

const component = computed(() => {
  const suffix = `/${props.sku}/manual-${lang.value}.md`
  const key = Object.keys(modules).find(k => k.endsWith(suffix))
  if (!key)
    return null
  return defineAsyncComponent(modules[key] as () => Promise<any>)
})

const standalonePath = computed(() => `/devices/${props.sku}/manual-${lang.value}`)

function onSelect(l: Lang) {
  lang.value = l
}
</script>

<template>
  <section class="device-manual">
    <ManualLangChips :current="lang" @select="onSelect" />
    <div class="device-manual__body">
      <component :is="component" v-if="component" />
      <p v-else class="device-manual__empty">
        —
      </p>
    </div>
    <div class="device-manual__foot">
      <RouterLink class="device-manual__open" :to="standalonePath">
        {{ $t('device.manual-open-standalone') }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.device-manual {
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.device-manual__body {
  padding: 18px 22px 8px;
}

.device-manual__body :deep(.prose) {
  max-width: 720px;
}

.device-manual__body :deep(.prose h1) {
  font-size: 22px;
  margin: 0 0 12px;
}

.device-manual__body :deep(.prose h2) {
  font-size: 16px;
}

.device-manual__body :deep(.prose h3) {
  font-size: 14px;
}

.device-manual__empty {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
  text-transform: uppercase;
  letter-spacing: var(--ck-track-data);
}

.device-manual__foot {
  display: flex;
  justify-content: flex-end;
  padding: 8px 22px 14px;
}

.device-manual__open {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-signal);
  text-decoration: none;
}

.device-manual__open:hover {
  text-decoration: underline;
}

@media (min-width: 720px) {
  .device-manual__body {
    padding: 22px 28px 8px;
  }
  .device-manual__foot {
    padding: 10px 28px 18px;
  }
}
</style>
