<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps<{
  sku: string
}>()

const modules = import.meta.glob('~/changelogs/*.md')

const component = computed(() => {
  const key = Object.keys(modules).find(k => k.endsWith(`/${props.sku}.md`))
  if (!key)
    return null
  return defineAsyncComponent(modules[key] as () => Promise<any>)
})
</script>

<template>
  <div class="device-changelog">
    <component :is="component" v-if="component" />
    <p v-else class="device-changelog__empty">
      —
    </p>
  </div>
</template>

<style scoped>
.device-changelog {
  padding: 14px 22px 24px;
  background: var(--ck-paper);
}

.device-changelog :deep(.prose) {
  max-width: 720px;
}

.device-changelog :deep(.prose h2) {
  /* The shared changelog has its own '## Changelog' heading rendered above; */
  /* nested h2's inside the prose are the per-version blocks — keep them smaller. */
  font-size: 16px;
  margin: 20px 0 8px;
}

.device-changelog__empty {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
  text-transform: uppercase;
  letter-spacing: var(--ck-track-data);
}

@media (min-width: 720px) {
  .device-changelog {
    padding: 18px 28px 32px;
  }
}
</style>
