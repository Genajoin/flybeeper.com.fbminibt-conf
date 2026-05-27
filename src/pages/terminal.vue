<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()

const isOffline = computed(() => !bt.isConnected)
const fwLabel = computed(() => bt.dis.firmwareRevisionString.value ?? '—')

const titleLabel = computed(() =>
  bt.dis.modelNumberString.value || (isOffline.value ? t('dashboard.demo-device') : '—'),
)
const subLabel = computed(() => {
  if (isOffline.value)
    return t('dashboard.demo-mode-sub')
  return `${bt.dis.manufacturerNameString.value} · fw ${fwLabel.value}`
})

const isBusyConnecting = computed(() => bt.isConnecting || bt.isFetching)

const connectLabel = computed(() => {
  if (isBusyConnecting.value)
    return t('dashboard.cancel-cta')
  return t('dashboard.connect-cta')
})

const banner = computed(() => {
  if (bt.errorMessage) {
    return {
      accent: 'var(--ck-signal)',
      eyebrow: t('dashboard.connect-error-eyebrow'),
      title: t('dashboard.connect-error-title'),
      sub: bt.errorMessage,
      loading: false,
    }
  }
  if (bt.isConnecting) {
    return {
      accent: 'var(--ck-signal)',
      eyebrow: t('dashboard.connecting-eyebrow'),
      title: t('dashboard.connecting-title'),
      sub: '',
      loading: true,
    }
  }
  if (bt.isFetching) {
    return {
      accent: 'var(--ck-signal)',
      eyebrow: t('dashboard.fetching-eyebrow'),
      title: t('dashboard.fetching-title', { n: bt.fetchProgress, total: bt.fetchTotal || '?' }),
      sub: '',
      loading: true,
    }
  }
  if (isOffline.value) {
    return {
      accent: 'var(--ck-signal)',
      eyebrow: t('dashboard.demo-mode-eyebrow'),
      title: t('dashboard.demo-mode-title'),
      sub: t('dashboard.demo-mode-sub'),
      loading: false,
    }
  }
  return null
})

function connect() {
  if (isBusyConnecting.value) {
    bt.cancelConnect()
    return
  }
  bt.connectToRequestDevice()
}
</script>

<template>
  <section class="terminal-page">
    <PageHeader
      breadcrumb-to="/cockpit"
      :breadcrumb-label="t('dashboard.back-dashboard')"
      :eyebrow="isOffline ? t('dashboard.demo-mode-eyebrow') : t('button.terminal')"
      :title="titleLabel"
      :sub="subLabel"
    />

    <CkBannerRow
      v-if="banner"
      :accent="banner.accent"
      :eyebrow="banner.eyebrow"
      :title="banner.title"
      :sub="banner.sub"
      :loading="banner.loading"
    >
      <template v-if="isOffline" #actions>
        <button
          type="button"
          class="btn-primary"
          :disabled="!bt.bleAvailable"
          @click="connect"
        >
          <span>{{ connectLabel }}</span><CkDots v-if="isBusyConnecting" />
        </button>
      </template>
    </CkBannerRow>

    <div v-if="isOffline" class="terminal-page__shell">
      <span class="terminal-page__shell-label">{{ t('button.terminal') }}</span>
      <span class="terminal-page__shell-meta">— · {{ t('dashboard.offline-body') }}</span>
    </div>

    <Suspense v-else>
      <TheTerminal />
      <template #fallback>
        <div class="terminal-page__loading">
          <span>{{ t('msg.fetching') }}…</span>
        </div>
      </template>
    </Suspense>
  </section>
</template>

<style scoped>
.terminal-page {
  background: var(--ck-bg);
  color: var(--ck-ink);
  display: flex;
  flex-direction: column;
}

.terminal-page__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  padding: var(--ck-s-xl);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}

.terminal-page__shell {
  padding: 18px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.terminal-page__shell-label {
  font-weight: 700;
  color: var(--ck-ink);
}
</style>
