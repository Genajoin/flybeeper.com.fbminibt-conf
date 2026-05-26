<script setup lang="ts">
import { SETTINGS_GROUP_NAV } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const fwRev = computed(() =>
  Number.parseFloat((bt.dis.firmwareRevisionString.value as string) || '0'),
)
const model = computed(() => bt.dis.modelNumberString.value)

const needsFirmwareUpdate = computed(() =>
  model.value === 'FBminiBT' && fwRev.value > 0 && fwRev.value <= 0.11,
)

// Grouped settings IA (the new /settings/{audio,curves,…} children) only knows
// the legacy ≤0.15 monolithic FBminiBT struct. Every other device — fw ≥0.16
// FBminiBT with CPF descriptors, or other SKUs (fbps1/fbrc4/fbsv/fbtas/
// fbfanet/fbfanetvario) — falls back to the CPF-generic CharacteristicForm15.
const hasGroupedSettings = computed(() =>
  model.value === 'FBminiBT' && fwRev.value >= 0.12 && fwRev.value <= 0.15,
)

watchEffect(() => {
  if (!bt.isConnected || !hasGroupedSettings.value)
    return
  if (route.path === '/settings')
    router.replace('/settings/audio')
})
</script>

<template>
  <PairingWizard v-if="!bt.isConnected" />

  <template v-else>
    <div class="settings-id">
      {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
    </div>

    <div v-if="needsFirmwareUpdate" class="settings-needs-fw">
      <router-link to="/devices/fbminibt/changelog" m-4 mt-3 btn>
        {{ t('update.update-first') }}
      </router-link>
    </div>

    <template v-else-if="hasGroupedSettings">
      <nav class="settings-nav" aria-label="Settings groups">
        <router-link
          v-for="item in SETTINGS_GROUP_NAV"
          :key="item.key"
          :to="item.route"
          class="settings-nav__tab"
          active-class="settings-nav__tab--active"
        >
          {{ t(`sett.group-${item.key}`) }}
        </router-link>
      </nav>
      <RouterView v-if="settings.local" />
      <div v-else class="settings-syncing">
        <div i-carbon-fade m-auto animate-spin text-4xl />
        <p>{{ t('msg.fetching') }}…</p>
      </div>
    </template>

    <Suspense v-else>
      <CharacteristicForm15 />
      <template #fallback>
        <div i-carbon-fade m-auto animate-spin text-4xl />
      </template>
    </Suspense>
  </template>
</template>

<style scoped>
.settings-id {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
  padding: var(--ck-s-sm) var(--ck-s-md);
  text-align: left;
}

.settings-needs-fw {
  text-align: center;
}

.settings-syncing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ck-s-sm);
  padding: var(--ck-s-lg);
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.settings-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ck-s-xs);
  justify-content: center;
  margin: 0 auto var(--ck-s-md);
  padding: 0 var(--ck-s-md);
  max-width: 800px;
}

.settings-nav__tab {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-pill);
  color: var(--ck-ink-dim);
  text-decoration: none;
  background: var(--ck-paper);
}

.settings-nav__tab:hover {
  border-color: var(--ck-ink);
  color: var(--ck-ink);
}

.settings-nav__tab--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
  border-color: var(--ck-ink);
}
</style>
