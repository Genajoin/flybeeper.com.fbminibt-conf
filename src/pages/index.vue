<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const bt = useBluetoothStore()
const { t } = useI18n()
</script>

<template>
  <section class="landing">
    <PageHeader>
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('home.eyebrow') }}
        </CkEyebrow>
        <h1 class="landing__display">
          {{ t('home.title') }}
        </h1>
        <p class="landing__sub">
          {{ t('home.subtitle') }}
        </p>
      </template>
    </PageHeader>

    <PairingWizard v-if="!bt.isConnected" />

    <div class="landing__cells">
      <RouterLink class="landing__cell" to="/settings">
        <Icon name="settings" :size="32" />
        <span class="landing__cell-label">{{ t('home.link-settings') }}</span>
      </RouterLink>
      <RouterLink class="landing__cell" to="/cockpit">
        <Icon name="meter" :size="32" />
        <span class="landing__cell-label">{{ t('home.link-cockpit') }}</span>
      </RouterLink>
      <RouterLink class="landing__cell" to="/terminal">
        <Icon name="terminal" :size="32" />
        <span class="landing__cell-label">{{ t('home.link-terminal') }}</span>
      </RouterLink>
      <RouterLink class="landing__cell" to="/update">
        <Icon name="download" :size="32" />
        <span class="landing__cell-label">{{ t('home.link-update') }}</span>
      </RouterLink>
    </div>

    <div class="landing__catalog">
      <CkEyebrow color="var(--ck-dim)" block>
        {{ t('home.catalog-eyebrow') }}
      </CkEyebrow>
      <RouterLink class="landing__catalog-link" to="/devices">
        {{ t('home.catalog-link') }} →
      </RouterLink>
    </div>

    <InvertedFooter />
  </section>
</template>

<style scoped>
.landing {
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.landing__display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: clamp(28px, 10.5vw, 44px);
  letter-spacing: -1.4px;
  line-height: 0.95;
  margin: 8px 0 8px;
  text-transform: uppercase;
  overflow-wrap: break-word;
  word-break: break-word;
}

.landing__sub {
  font-size: 13px;
  color: var(--ck-dim);
  line-height: 1.5;
  margin: 0;
  max-width: 540px;
}

.landing__cells {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.landing__cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  padding: 22px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  text-decoration: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.landing__cell:nth-child(2n) {
  border-right: none;
}

.landing__cell:nth-child(n + 3) {
  border-bottom: none;
}

.landing__cell:hover {
  background: var(--ck-bg-deep);
  color: var(--ck-signal);
}

.landing__cell-label {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 17px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
}

.landing__catalog {
  padding: 16px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.landing__catalog-link {
  display: inline-block;
  margin-top: 6px;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-ink);
  text-decoration: none;
}

.landing__catalog-link:hover {
  color: var(--ck-signal);
}

@media (min-width: 960px) {
  .landing__display {
    font-size: 84px;
    letter-spacing: -2.4px;
  }
  .landing__cells {
    grid-template-columns: repeat(4, 1fr);
  }
  .landing__cell:nth-child(n + 3) {
    border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  }
  .landing__cell {
    border-bottom: none;
  }
  .landing__cell:not(:last-child) {
    border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  }
  .landing__cell:nth-child(2n) {
    border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  }
}
</style>

<route lang="yaml">
meta:
  layout: home
</route>
