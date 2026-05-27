<script setup lang="ts">
type Lang = 'en' | 'ru' | 'de'

const props = withDefaults(defineProps<{
  current: Lang
  toPath?: (lang: Lang) => string
  label?: string
}>(), {
  toPath: undefined,
  label: 'MANUAL',
})

const emit = defineEmits<{
  (e: 'select', lang: Lang): void
}>()

const LANGS: Lang[] = ['en', 'ru', 'de']

function isRouted(lang: Lang) {
  return typeof props.toPath === 'function' && lang !== props.current
}

function onClick(lang: Lang, ev: MouseEvent) {
  if (props.toPath)
    return
  ev.preventDefault()
  emit('select', lang)
}
</script>

<template>
  <div class="lang-strip">
    <span class="lang-strip__label">{{ label }}</span>
    <nav class="lang-strip__chips" aria-label="Manual language">
      <template v-for="loc in LANGS" :key="loc">
        <RouterLink
          v-if="isRouted(loc)"
          class="lang-strip__chip"
          :to="props.toPath!(loc)"
        >
          {{ loc.toUpperCase() }}
        </RouterLink>
        <button
          v-else
          type="button"
          class="lang-strip__chip"
          :class="{ 'lang-strip__chip--active': loc === current }"
          :aria-pressed="loc === current"
          @click="(e) => onClick(loc, e)"
        >
          {{ loc.toUpperCase() }}
        </button>
      </template>
    </nav>
  </div>
</template>

<style scoped>
.lang-strip {
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.lang-strip__label {
  display: inline-flex;
  align-items: center;
  margin-right: auto;
  padding: 10px 14px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.lang-strip__chips {
  display: inline-flex;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
}

.lang-strip__chip {
  padding: 10px 14px;
  border: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-ink);
  text-decoration: none;
  background: var(--ck-paper);
  cursor: pointer;
}

.lang-strip__chip:last-child {
  border-right: none;
}

.lang-strip__chip:hover {
  background: var(--ck-bg);
}

.lang-strip__chip--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
  cursor: default;
}
</style>
