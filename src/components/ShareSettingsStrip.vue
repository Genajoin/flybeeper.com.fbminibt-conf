<script setup lang="ts">
/**
 * Dedicated "Share these settings" CTA row, rendered as a second header
 * line on screens where the user is reading or editing settings —
 * /settings/* and /share itself (the latter so the strip stays present
 * after Apply navigates into the panels). Intentionally NOT in the
 * UtilityToggles cluster — that one is for app-level controls (theme /
 * language), the share action is content-level.
 */
const route = useRoute()
const { t } = useI18n()

const visible = computed(() => {
  const p = route.path || ''
  return p.startsWith('/settings') || p === '/share'
})

const isOnShare = computed(() => (route.path || '') === '/share')
</script>

<template>
  <RouterLink
    v-if="visible && !isOnShare"
    class="share-strip"
    to="/share"
  >
    <span class="share-strip__icon" aria-hidden="true">
      <Icon name="share" :size="20" />
    </span>
    <span class="share-strip__copy">
      <span class="share-strip__eyebrow">{{ t('preset.share-strip-eyebrow') }}</span>
      <span class="share-strip__cta">{{ t('preset.share-strip-cta') }}</span>
      <span class="share-strip__sub">{{ t('preset.share-strip-sub') }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.share-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  border-left: 8px solid var(--ck-signal);
  color: var(--ck-ink);
  text-decoration: none;
  font-family: var(--ck-font-body);
}

.share-strip:hover {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.share-strip__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background: var(--ck-bg);
  color: var(--ck-signal);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.share-strip:hover .share-strip__icon {
  background: var(--ck-paper);
  color: var(--ck-ink);
}

.share-strip__copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}

.share-strip__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.share-strip:hover .share-strip__eyebrow {
  color: var(--ck-on-signal);
  opacity: 0.85;
}

.share-strip__cta {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.4px;
  text-transform: uppercase;
  margin-top: 2px;
}

.share-strip__sub {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: 0.5px;
  color: var(--ck-dim);
  margin-top: 3px;
}

.share-strip:hover .share-strip__sub {
  color: var(--ck-on-signal);
  opacity: 0.85;
}

@media (min-width: 720px) {
  .share-strip {
    padding: 14px 28px;
    gap: 16px;
  }
  .share-strip__cta {
    font-size: 18px;
  }
}
</style>
