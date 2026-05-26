<script setup lang="ts">
const { t } = useI18n()
const { devices } = useDeviceCatalog()
</script>

<template>
  <section class="catalog">
    <header class="catalog__head">
      <p class="catalog__eyebrow">
        {{ t('home.eyebrow') }}
      </p>
      <h1 class="catalog__title">
        {{ t('intro.device-list') }}
      </h1>
    </header>

    <ul class="catalog__grid">
      <li v-for="d in devices" :key="d.sku" class="card">
        <RouterLink class="card__link" :to="`/devices/${d.sku}`">
          <span class="card__icon" :class="d.iconClass" aria-hidden="true" />
          <span class="card__name">{{ d.displayName }}</span>
          <span class="card__desc">{{ t(d.aboutKey) }}</span>
          <span class="card__chevron i-carbon-arrow-right" aria-hidden="true" />
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.catalog {
  max-width: 56rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-lg);
}

.catalog__head {
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
  color: var(--ck-signal);
  margin: 0;
}

.catalog__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-display);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  margin: 0;
}

.catalog__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: var(--ck-s-md);
}

.card {
  display: block;
}

.card__link {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  grid-template-areas:
    'icon name chevron'
    'icon desc desc';
  align-items: center;
  gap: var(--ck-s-xs) var(--ck-s-md);
  padding: var(--ck-s-md);
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  color: var(--ck-ink);
  text-decoration: none;
  transition:
    border-color var(--ck-dur-toggle) var(--ck-ease),
    transform var(--ck-dur-toggle) var(--ck-ease);
  text-align: left;
}

.card__link:hover {
  border-color: var(--ck-signal);
}

.card__link:hover .card__chevron {
  color: var(--ck-signal);
  transform: translateX(2px);
}

.card__icon {
  grid-area: icon;
  width: 36px;
  height: 36px;
  color: var(--ck-ink);
  display: block;
}

.card__name {
  grid-area: name;
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h2);
  font-weight: 600;
  line-height: var(--ck-line-tight);
}

.card__desc {
  grid-area: desc;
  font-size: var(--ck-fs-meta);
  color: var(--ck-ink-dim);
  line-height: var(--ck-line-body);
  /* Clamp long marketing copy so cards stay roughly aligned. */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__chevron {
  grid-area: chevron;
  width: 18px;
  height: 18px;
  color: var(--ck-dim);
  transition: transform var(--ck-dur-toggle) var(--ck-ease);
}
</style>
