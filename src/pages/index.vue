<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const bt = useBluetoothStore()
const { t } = useI18n()
</script>

<template>
  <section class="hero">
    <p class="hero__eyebrow">
      {{ t('home.eyebrow') }}
    </p>
    <h1 class="hero__title">
      {{ t('home.title') }}
    </h1>
    <p class="hero__body">
      {{ t('home.subtitle') }}
    </p>
  </section>

  <!-- When disconnected the PairingWizard owns the primary CTA (explainer or
       saved-devices list). When connected we surface a shortcut grid instead so
       the landing has somewhere to go. -->
  <PairingWizard v-if="!bt.isConnected" />

  <section v-else class="connected">
    <header class="connected__head">
      <h2 class="connected__title">
        {{ t('home.connected-title') }}
      </h2>
      <p class="connected__body">
        {{ t('home.connected-body') }}
      </p>
    </header>
    <div class="connected__grid">
      <RouterLink class="connected__card" to="/settings">
        <span class="connected__icon i-carbon-settings-edit" aria-hidden="true" />
        <span class="connected__label">{{ t('home.link-settings') }}</span>
      </RouterLink>
      <RouterLink class="connected__card" to="/cockpit">
        <span class="connected__icon i-carbon-meter" aria-hidden="true" />
        <span class="connected__label">{{ t('home.link-cockpit') }}</span>
      </RouterLink>
      <RouterLink class="connected__card" to="/terminal">
        <span class="connected__icon i-carbon-terminal" aria-hidden="true" />
        <span class="connected__label">{{ t('home.link-terminal') }}</span>
      </RouterLink>
      <RouterLink class="connected__card" to="/update">
        <span class="connected__icon i-carbon-update-now" aria-hidden="true" />
        <span class="connected__label">{{ t('home.link-update') }}</span>
      </RouterLink>
    </div>
  </section>

  <section class="catalog">
    <p class="catalog__eyebrow">
      {{ t('home.catalog-eyebrow') }}
    </p>
    <RouterLink class="catalog__link" to="/devices">
      {{ t('home.catalog-link') }}
      <span class="catalog__chevron i-carbon-arrow-right" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-sm);
  text-align: left;
  max-width: 36rem;
  margin: var(--ck-s-md) auto var(--ck-s-lg);
}

.hero__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-signal);
  margin: 0;
}

.hero__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-display);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  margin: 0;
}

.hero__body {
  font-size: var(--ck-fs-body);
  line-height: var(--ck-line-body);
  color: var(--ck-ink-dim);
  margin: 0;
}

.connected {
  max-width: 36rem;
  margin: 0 auto var(--ck-s-lg);
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
  text-align: left;
}

.connected__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
}

.connected__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h1);
  font-weight: 700;
  margin: 0;
  line-height: var(--ck-line-tight);
}

.connected__body {
  font-size: var(--ck-fs-body);
  color: var(--ck-ink-dim);
  margin: 0;
}

.connected__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: var(--ck-s-sm);
}

.connected__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ck-s-sm);
  padding: var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  text-decoration: none;
  transition:
    border-color var(--ck-dur-toggle) var(--ck-ease),
    color var(--ck-dur-toggle) var(--ck-ease);
}

.connected__card:hover {
  border-color: var(--ck-signal);
  color: var(--ck-signal);
}

.connected__icon {
  display: block;
  width: 24px;
  height: 24px;
}

.connected__label {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h2);
  font-weight: 600;
}

.catalog {
  max-width: 36rem;
  margin: var(--ck-s-lg) auto 0;
  padding-top: var(--ck-s-md);
  border-top: var(--ck-stroke-hair) dashed var(--ck-grid);
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
  text-align: left;
}

.catalog__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
  margin: 0;
}

.catalog__link {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-xs);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  font-weight: 600;
  color: var(--ck-ink);
  text-decoration: none;
  align-self: flex-start;
}

.catalog__link:hover {
  color: var(--ck-signal);
}

.catalog__chevron {
  width: 16px;
  height: 16px;
}
</style>

<route lang="yaml">
meta:
  layout: home
</route>
