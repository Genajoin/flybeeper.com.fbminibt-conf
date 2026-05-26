<script setup lang="ts">
withDefaults(defineProps<{
  accent?: string
  eyebrow: string
  title: string
  sub?: string
}>(), {
  accent: 'var(--ck-ink)',
})
</script>

<template>
  <div class="ck-banner-row" role="status" aria-live="polite">
    <div class="ck-banner-row__stripe" :style="{ background: accent }" />
    <div class="ck-banner-row__body">
      <CkEyebrow :color="accent">
        {{ eyebrow }}
      </CkEyebrow>
      <div class="ck-banner-row__title">
        {{ title }}
      </div>
      <div v-if="sub" class="ck-banner-row__sub">
        {{ sub }}
      </div>
      <div class="ck-banner-row__actions">
        <slot name="actions" :accent="accent" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ck-banner-row {
  display: flex;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-body);
}

.ck-banner-row__stripe {
  width: 8px;
  flex-shrink: 0;
}

.ck-banner-row__body {
  flex: 1;
  padding: 12px 14px;
}

.ck-banner-row__title {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 16px;
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
  color: var(--ck-ink);
}

.ck-banner-row__sub {
  font-size: 11px;
  color: var(--ck-dim);
  margin-top: 3px;
  line-height: 1.4;
}

.ck-banner-row__actions {
  margin-top: 9px;
  display: inline-flex;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.ck-banner-row__actions:empty {
  display: none;
}

.ck-banner-row__actions :slotted(button),
.ck-banner-row__actions :slotted(a) {
  padding: 6px 11px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 0;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.ck-banner-row__actions :slotted(button:first-child),
.ck-banner-row__actions :slotted(a:first-child) {
  border-left: none;
}

.ck-banner-row__actions :slotted(.btn-primary) {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.ck-banner-row__actions :slotted(.btn-primary--ink) {
  background: var(--ck-ink);
  color: var(--ck-paper);
}
</style>
