<script setup lang="ts">
const { t } = useI18n()
const { devices } = useDeviceCatalog()
</script>

<template>
  <section class="catalog">
    <PageHeader
      breadcrumb-to="/"
      breadcrumb-label="← HOME"
    >
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('home.eyebrow') }}
        </CkEyebrow>
        <h1 class="catalog__display">
          {{ t('intro.device-list') }}
        </h1>
      </template>
    </PageHeader>

    <ul class="catalog__grid">
      <li v-for="d in devices" :key="d.sku" class="card">
        <RouterLink class="card__link" :to="`/devices/${d.sku}`">
          <Icon :name="d.iconName" :size="36" class="card__icon" />
          <span class="card__body">
            <span class="card__name">{{ d.displayName }}</span>
            <span class="card__desc">{{ t(d.aboutKey) }}</span>
          </span>
          <span class="card__chevron">→</span>
        </RouterLink>
      </li>
    </ul>

    <aside class="catalog__pitch">
      <CkEyebrow color="var(--ck-signal)" block>
        {{ t('catalog.pitch-eyebrow') }}
      </CkEyebrow>
      <h2 class="catalog__pitch-title">
        {{ t('catalog.pitch-title') }}
      </h2>
      <p class="catalog__pitch-body">
        {{ t('catalog.pitch-body') }}
      </p>
      <a class="catalog__pitch-cta" href="https://alpisto.eu/flybeeper/" target="_blank" rel="noopener">
        {{ t('catalog.pitch-cta') }}
      </a>
    </aside>
  </section>
</template>

<style scoped>
.catalog {
  background: var(--ck-bg);
  color: var(--ck-ink);
}

.catalog__display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 44px;
  letter-spacing: -1.4px;
  margin: 6px 0 4px;
  text-transform: uppercase;
  line-height: 0.95;
}

.catalog__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr;
  background: var(--ck-paper);
}

.card {
  display: block;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.card__link {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  text-decoration: none;
  text-align: left;
}

.card__link:hover {
  background: var(--ck-bg-deep);
  color: var(--ck-signal);
}

.card__icon {
  flex-shrink: 0;
}

.card__body {
  display: flex;
  flex-direction: column;
}

.card__name {
  font-family: var(--ck-font-display);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: -0.2px;
}

.card__desc {
  font-size: 12px;
  color: var(--ck-dim);
  margin-top: 4px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__chevron {
  font-family: var(--ck-font-mono);
  font-weight: 700;
  color: var(--ck-ink);
}

.catalog__pitch {
  padding: 32px 22px 36px;
  background: var(--ck-paper);
  border-left: 8px solid var(--ck-signal);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.catalog__pitch-title {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 28px;
  letter-spacing: -1px;
  line-height: 1;
  margin: 10px 0 12px;
  text-transform: uppercase;
  color: var(--ck-ink);
}

.catalog__pitch-body {
  font-size: 13px;
  color: var(--ck-dim);
  line-height: 1.55;
  margin: 0 0 20px;
  max-width: 540px;
}

.catalog__pitch-cta {
  display: inline-block;
  padding: 12px 18px;
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  text-decoration: none;
  font-family: var(--ck-font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}

.catalog__pitch-cta:hover {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

@media (min-width: 720px) {
  .catalog__grid {
    grid-template-columns: 1fr 1fr;
  }
  .card:nth-child(odd) {
    border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  }
  .catalog__pitch {
    padding: 48px 64px 56px;
  }
  .catalog__pitch-title {
    font-size: 44px;
    letter-spacing: -1.4px;
  }
}
</style>
