<script setup lang="ts">
withDefaults(defineProps<{
  breadcrumbLabel?: string
  breadcrumbTo?: string | object
  /**
   * Render the breadcrumb as a button that emits 'back' instead of a
   * static label. Use when "back" means "step backwards through this
   * flow" (e.g. wizard step 2 → step 1) rather than navigating to a
   * concrete route. Ignored when breadcrumbTo is set — a route always
   * wins.
   */
  breadcrumbBack?: boolean
  eyebrow?: string
  eyebrowSignal?: boolean
  title?: string
  sub?: string
  right?: string
  rightSignal?: boolean
  /**
   * Suppress the global theme/language toggles + device-info strip inside
   * this header. Set `true` when this header is nested inside another
   * PageHeader (e.g. the step strips inside PairingWizard) so the global
   * chrome isn't duplicated.
   */
  hideUtils?: boolean
}>(), {
  eyebrowSignal: true,
  rightSignal: false,
  hideUtils: false,
  breadcrumbBack: false,
})

const emit = defineEmits<{ back: [] }>()

const bt = useBluetoothStore()
</script>

<template>
  <header class="page-head">
    <div class="page-head__strip">
      <RouterLink v-if="breadcrumbTo" class="page-head__crumb" :to="breadcrumbTo">
        {{ breadcrumbLabel || '← BACK' }}
      </RouterLink>
      <button v-else-if="breadcrumbBack" type="button" class="page-head__crumb page-head__crumb--btn" @click="emit('back')">
        {{ breadcrumbLabel || '← BACK' }}
      </button>
      <span v-else-if="breadcrumbLabel" class="page-head__crumb">{{ breadcrumbLabel }}</span>
      <!-- Device-info cells (model · FW · battery) shown on every header
           once a device is paired. Placed after the breadcrumb but before
           the spacer so on wide viewports it sits inline with the utility
           cluster; on narrow viewports the strip's flex-wrap pushes
           utils/right onto a second row. Suppressed inside nested headers
           (PairingWizard step strips) via hide-utils. -->
      <DeviceInfoStrip v-if="bt.isConnected && !hideUtils" />
      <span class="page-head__spacer" />
      <!-- Global utility toggles (theme + language) live in every page's
           header strip so the user can always change them. Sits before the
           per-page right content so app-level controls stay in a stable
           place across screens. Suppressed via hide-utils when this header
           is nested inside another (e.g. PairingWizard step strips). -->
      <UtilityToggles v-if="!hideUtils" class="page-head__utils" />
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
  flex-wrap: wrap;
  align-items: stretch;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
}

/* Border-top on every direct strip child. On a single-row layout the
 * children's tops align and read as one continuous frame line (matches
 * the strip's existing border-bottom). When the strip wraps onto two
 * rows on mobile, the second row's children inherit the same border —
 * which becomes a horizontal divider between the wrapped rows. The
 * spacer participates so the line continues through the gap. */
.page-head__strip > * {
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
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

/* Button-only resets so the back-button matches the RouterLink and
 * span variants of .page-head__crumb. font-family / size / weight /
 * letter-spacing / text-transform are intentionally NOT touched here —
 * they're inherited from .page-head__crumb. Do NOT add `font: inherit`,
 * it's a short-hand that nukes all font-* and lets the UA button font
 * through. */
.page-head__crumb--btn {
  background: none;
  border: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  cursor: pointer;
  color: inherit;
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

.page-head__utils {
  /* match the height of breadcrumb / right segments (the utils buttons
     paint their own borders via UtilityToggles' .utils__btn border-left). */
  display: inline-flex;
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
