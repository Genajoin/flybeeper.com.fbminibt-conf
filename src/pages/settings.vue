<script setup lang="ts">
import { SETTINGS_GROUP_NAV } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const isLegacyCpfFirmware = computed(() => {
  if (bt.dis.modelNumberString.value !== 'FBminiBT')
    return false
  const v = Number.parseFloat(bt.dis.firmwareRevisionString.value as string)
  return v > 0.15
})

const needsFirmwareUpdate = computed(() => {
  if (bt.dis.modelNumberString.value !== 'FBminiBT')
    return false
  const v = Number.parseFloat(bt.dis.firmwareRevisionString.value as string)
  return v <= 0.11
})

// /settings → /settings/audio: this is the layout page; children live under
// pages/settings/<group>.vue. The grouped IA only fits the legacy ≤0.15 codec
// for now (the ≥0.15 CPF UI is rendered inline via CharacteristicForm15
// until Phase 4 final groups it the same way).
watchEffect(() => {
  if (!bt.isConnected || needsFirmwareUpdate.value || isLegacyCpfFirmware.value)
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

    <Suspense v-else-if="isLegacyCpfFirmware">
      <CharacteristicForm15 />
      <template #fallback>
        <div i-carbon-fade m-auto animate-spin text-4xl />
      </template>
    </Suspense>

    <template v-else>
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
      <RouterView />
    </template>
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
