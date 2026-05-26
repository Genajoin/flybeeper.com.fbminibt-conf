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

@media (min-width: 720px) {
  .catalog__grid {
    grid-template-columns: 1fr 1fr;
  }
  .card:nth-child(odd) {
    border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  }
}
</style>
