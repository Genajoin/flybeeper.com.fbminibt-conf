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
    <!-- The strip is two flex zones: lead (breadcrumb + device info) and
         trail (theme/lang toggles + per-page right content). Both grow, so
         on a wide viewport they sit on one line (lead left, trail right);
         on a narrow viewport the trail wraps onto its own full-width row.
         The row divider is a border-BOTTOM on the lead zone — because lead
         grows to fill its line, the divider always spans the full width
         when trail wraps below (no partial line from per-cell borders), and
         on a single row it coincides with the strip's own bottom rule so it
         stays invisible. -->
    <div class="page-head__strip">
      <div class="page-head__zone page-head__zone--lead">
        <RouterLink v-if="breadcrumbTo" class="page-head__crumb" :to="breadcrumbTo">
          {{ breadcrumbLabel || '← BACK' }}
        </RouterLink>
        <button v-else-if="breadcrumbBack" type="button" class="page-head__crumb page-head__crumb--btn" @click="emit('back')">
          {{ breadcrumbLabel || '← BACK' }}
        </button>
        <span v-else-if="breadcrumbLabel" class="page-head__crumb">{{ breadcrumbLabel }}</span>
        <!-- Device-info cells (model · FW · battery) shown on every header
             once a device is paired. Suppressed inside nested headers
             (PairingWizard step strips) via hide-utils. -->
        <DeviceInfoStrip v-if="bt.isConnected && !hideUtils" />
      </div>
      <div class="page-head__zone page-head__zone--trail">
        <!-- Global utility toggles (theme + language) live in every page's
             header so the user can always change them. Suppressed via
             hide-utils when this header is nested inside another. -->
        <UtilityToggles v-if="!hideUtils" class="page-head__utils" />
        <span v-if="right" class="page-head__right" :class="{ 'page-head__right--signal': rightSignal }">{{ right }}</span>
        <slot name="right" />
      </div>
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

.page-head__zone {
  display: flex;
  align-items: stretch;
  min-width: 0;
  /* grow so a single zone alone on a wrapped line fills the full width
     (→ full-width divider); shrink:0 so the two zones WRAP instead of
     squeezing their nowrap content when they don't both fit. */
  flex: 1 0 auto;
}

.page-head__zone--lead {
  /* When the trail zone wraps to a second row, this border becomes the
     full-width divider between the two rows. On a single row it sits on
     top of the strip's own border-bottom (same position) and is invisible. */
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.page-head__zone--trail {
  /* Keep the toggles + status anchored to the right edge, both on one row
     and when wrapped onto their own row. */
  justify-content: flex-end;
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

.page-head__right {
  padding: 10px 18px;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
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
