<script setup lang="ts">
import { useRouter } from 'vue-router'

defineOptions({
  name: 'IndexPage',
})

const bt = useBluetoothStore()
const { t } = useI18n()
const router = useRouter()

// Watcher lives here, not in PairingWizard: this page renders the wizard
// only while !bt.isConnected, so the wizard would unmount on the same
// flush that isConnected flips true — its own watcher would be torn down
// before it could fire. Pilots want to land in the cockpit immediately
// after pairing (live vario + simulator are there).
//
// Redirect on connect *start* (isConnecting), not just on isConnected: the
// GATT link comes up fast but the characteristic read that follows takes
// several seconds. Jumping to the cockpit right away means that long phase
// plays out on the cockpit's own "READING n/total" progress banner instead
// of a frozen "CONNECTING…" on the wizard. The picker is dismissed before
// isConnecting flips true, so a cancelled chooser never triggers this.
watch(() => bt.isConnecting || bt.isConnected, (now, prev) => {
  if (now && !prev)
    router.push('/cockpit')
})
</script>

<template>
  <section class="landing">
    <PageHeader>
      <template #right>
        <ConnectionPill />
      </template>
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
