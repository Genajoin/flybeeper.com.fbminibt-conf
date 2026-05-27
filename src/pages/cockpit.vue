<script setup lang="ts">
import { computed } from 'vue'
import type { Hotspot } from '~/components/DeviceTopdown.vue'
import { CPF_UUID_TO_GROUP, type SettingsGroupKey } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const { t } = useI18n()
const router = useRouter()

const presentGroups = computed<Set<SettingsGroupKey>>(() => {
  if (!bt.isConnected)
    return new Set<SettingsGroupKey>(Object.values(CPF_UUID_TO_GROUP))
  const out = new Set<SettingsGroupKey>()
  for (const ch of bt.bleCharacteristics) {
    const g = CPF_UUID_TO_GROUP[ch.characteristic.uuid]
    if (g)
      out.add(g)
  }
  return out
})

const hasFanet = computed(() => presentGroups.value.has('fanet'))
const hasTas = computed(() => presentGroups.value.has('tas'))
const hasUart = computed(() => presentGroups.value.has('uart'))

// Hotspots map the device's interactive areas to settings sub-pages.
// Coordinates target the 240×240 viewBox in DeviceTopdown — button centres
// sit at (66,66) / (174,66) / (66,174) / (174,174); LED is dead-center.
const hotspots = computed<Hotspot[]>(() => [
  { id: 'led', x: 120, y: 120, r: 18, route: '/settings/behaviour', label: 'LED · behaviour' },
  { id: 'btn-1', x: 66, y: 66, r: 44, route: '/settings/behaviour', label: 'Button 1' },
  { id: 'btn-2', x: 174, y: 66, r: 44, route: '/settings/behaviour', label: 'Button 2' },
  { id: 'btn-3', x: 66, y: 174, r: 44, route: '/settings/behaviour', label: 'Button 3' },
  { id: 'btn-4', x: 174, y: 174, r: 44, route: '/settings/behaviour', label: 'Button 4' },
])

function onJump(h: Hotspot) {
  if (h.route)
    router.push(h.route)
}

const ledOn = computed(() => bt.isConnected)
const fwLabel = computed(() => bt.dis.firmwareRevisionString.value ?? '—')
const isOffline = computed(() => !bt.isConnected)
const headerTitle = computed(() =>
  bt.dis.modelNumberString.value || (isOffline.value ? t('dashboard.demo-device') : 'DEVICE'),
)
const headerSub = computed(() => {
  if (isOffline.value)
    return t('dashboard.demo-mode-sub')
  return `${bt.dis.manufacturerNameString.value} · fw ${fwLabel.value}`
})

// Banner state priority: connect-error → connecting/fetching progress → demo.
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
</script>

<template>
  <section class="dash">
    <PageHeader
      breadcrumb-to="/"
      breadcrumb-label="← HOME"
      :eyebrow="isOffline ? t('dashboard.demo-mode-eyebrow') : t('dashboard.eyebrow')"
      :title="headerTitle"
      :sub="headerSub"
    >
      <template #right>
        <ConnectionPill />
      </template>
    </PageHeader>

    <CkBannerRow
      v-if="banner"
      :accent="banner.accent"
      :eyebrow="banner.eyebrow"
      :title="banner.title"
      :sub="banner.sub"
      :loading="banner.loading"
    />

    <div class="dash__grid">
      <!-- Button map -->
      <div class="dash__col dash__col--map">
        <div class="dash__col-head">
          <CkEyebrow>{{ t('dashboard.button-map') }}</CkEyebrow>
          <CkEyebrow color="var(--ck-signal)">
            {{ t('dashboard.live') }}
          </CkEyebrow>
        </div>
        <div class="dash__topdown">
          <DeviceTopdown :scale="1" :led-on="ledOn" :hotspots="hotspots" @jump="onJump" />
        </div>
        <div class="dash__hint">
          {{ t('dashboard.hover-jump-hint') }}
        </div>
      </div>

      <!-- Vario + stats -->
      <div class="dash__col dash__col--stack">
        <VarioReading />
        <StatsGrid />
      </div>

      <!-- Settings hub -->
      <div class="dash__col dash__col--hub">
        <div class="dash__hub-head">
          <CkEyebrow>{{ t('dashboard.settings-title') }}</CkEyebrow>
          <CkEyebrow color="var(--ck-signal)">
            {{ t('dashboard.synced') }}
          </CkEyebrow>
        </div>
        <RouterLink to="/settings/audio" class="dash__hub-row">
          <div>
            <div class="dash__hub-label">
              {{ t('dashboard.hub-sound') }}
            </div>
            <div class="dash__hub-sub">
              {{ t('dashboard.hub-sound-sub') }}
            </div>
          </div>
          <span>→</span>
        </RouterLink>
        <RouterLink to="/settings/behaviour" class="dash__hub-row">
          <div>
            <div class="dash__hub-label">
              {{ t('dashboard.hub-behaviour') }}
            </div>
            <div class="dash__hub-sub">
              {{ t('dashboard.hub-behaviour-sub') }}
            </div>
          </div>
          <span>→</span>
        </RouterLink>
        <RouterLink to="/settings/power" class="dash__hub-row">
          <div>
            <div class="dash__hub-label">
              {{ t('dashboard.hub-power') }}
            </div>
            <div class="dash__hub-sub">
              {{ t('dashboard.hub-power-sub') }}
            </div>
          </div>
          <span>→</span>
        </RouterLink>
        <RouterLink v-if="hasUart" to="/settings/uart" class="dash__hub-row">
          <div>
            <div class="dash__hub-label">
              {{ t('dashboard.hub-uart') }}
            </div>
            <div class="dash__hub-sub">
              {{ t('dashboard.hub-uart-sub') }}
            </div>
          </div>
          <span>→</span>
        </RouterLink>
        <RouterLink v-if="hasFanet" to="/settings/fanet" class="dash__hub-row">
          <div>
            <div class="dash__hub-label">
              {{ t('sett.group-fanet') }}
            </div>
            <div class="dash__hub-sub">
              {{ t('sett.group-fanet-desc') }}
            </div>
          </div>
          <span>→</span>
        </RouterLink>
        <RouterLink v-if="hasTas" to="/settings/tas" class="dash__hub-row">
          <div>
            <div class="dash__hub-label">
              {{ t('sett.group-tas') }}
            </div>
            <div class="dash__hub-sub">
              {{ t('sett.group-tas-desc') }}
            </div>
          </div>
          <span>→</span>
        </RouterLink>
        <RouterLink to="/update" class="dash__hub-row">
          <div>
            <div class="dash__hub-label">
              {{ t('dashboard.hub-firmware') }}
            </div>
            <div class="dash__hub-sub">
              {{ t('dashboard.hub-firmware-sub', { v: fwLabel }) }}
            </div>
          </div>
          <span>→</span>
        </RouterLink>
      </div>
    </div>

    <noSleep />
  </section>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.dash__grid {
  display: grid;
  grid-template-columns: 1fr;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.dash__col {
  background: var(--ck-paper);
  display: flex;
  flex-direction: column;
}

.dash__col--map {
  padding: 20px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  align-items: stretch;
}

.dash__col-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dash__topdown {
  display: flex;
  justify-content: center;
  flex: 1;
  align-items: center;
  position: relative;
}

.dash__hint {
  margin-top: 12px;
  font-family: var(--ck-font-mono);
  font-size: 9px;
  color: var(--ck-ink);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
}

.dash__col--stack {
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.dash__col--hub {
  background: var(--ck-paper);
}

.dash__hub-head {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.dash__hub-row {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  cursor: pointer;
  text-decoration: none;
  color: var(--ck-ink);
  background: var(--ck-paper);
}

.dash__hub-row:hover {
  background: var(--ck-bg-deep);
}

.dash__hub-label {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.dash__hub-sub {
  font-family: var(--ck-font-mono);
  font-size: 9px;
  color: var(--ck-dim);
  margin-top: 1px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

@media (min-width: 960px) {
  .dash__grid {
    grid-template-columns: 1fr 1.1fr 0.9fr;
  }
  .dash__col--map {
    border-right: var(--ck-stroke-rule) solid var(--ck-ink);
    border-bottom: none;
  }
  .dash__col--stack {
    border-right: var(--ck-stroke-rule) solid var(--ck-ink);
    border-bottom: none;
  }
}
</style>
