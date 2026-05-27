<script setup lang="ts">
withDefaults(defineProps<{
  breadcrumbLabel?: string
  breadcrumbTo?: string | object
  eyebrow?: string
  eyebrowSignal?: boolean
  title?: string
  sub?: string
  right?: string
  rightSignal?: boolean
}>(), {
  eyebrowSignal: true,
  rightSignal: false,
})
</script>

<template>
  <header class="page-head">
    <div class="page-head__strip">
      <RouterLink v-if="breadcrumbTo" class="page-head__crumb" :to="breadcrumbTo">
        {{ breadcrumbLabel || '← BACK' }}
      </RouterLink>
      <span v-else-if="breadcrumbLabel" class="page-head__crumb">{{ breadcrumbLabel }}</span>
      <span class="page-head__spacer" />
      <span v-if="right" class="page-head__right" :class="{ 'page-head__right--signal': rightSignal }">{{ right }}</span>
      <slot name="right" />
    </div>
    <div v-if="eyebrow || title || sub || $slots.body" class="page-head__body">
      <CkEyebrow v-if="eyebrow" :color="eyebrowSignal ? 'var(--ck-signal)' : 'var(--ck-ink)'" block>
        {{ eyebrow }}
      </CkEyebrow>
      <h1 v-if="title" class="page-head__title">
        {{ title }}
      </h1>
      <p v-if="sub" class="page-head__sub">
        {{ sub }}
      </p>
      <slot name="body" />
    </div>
  </header>
</template>

<style scoped>
.page-head {
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.page-head__strip {
  display: flex;
  align-items: stretch;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
}

.page-head__crumb {
  padding: 10px 18px;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-ink);
  text-decoration: none;
  white-space: nowrap;
}

.page-head__crumb:hover {
  background: var(--ck-bg-deep);
}

.page-head__spacer {
  flex: 1;
}

.page-head__right {
  padding: 10px 18px;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}

.page-head__right--signal {
  color: var(--ck-signal);
}

.page-head__body {
  padding: 20px 22px 14px;
}

.page-head__title {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: clamp(22px, 8.4vw, 32px);
  letter-spacing: -1px;
  line-height: 0.95;
  margin: 6px 0 8px;
  text-transform: uppercase;
  color: var(--ck-ink);
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
}

.page-head__sub {
  font-size: 12px;
  color: var(--ck-dim);
  line-height: 1.5;
  margin: 0;
  font-family: var(--ck-font-mono);
  letter-spacing: 0.5px;
}

@media (min-width: 960px) {
  .page-head__body {
    padding: 40px 64px 24px;
  }
  .page-head__title {
    font-size: 52px;
    letter-spacing: -1.8px;
  }
}
</style>
