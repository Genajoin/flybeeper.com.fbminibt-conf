<script setup lang="ts">
import { computed } from 'vue'
import type { Hotspot } from '~/components/DeviceTopdown.vue'
import { CPF_UUID_TO_GROUP, type SettingsGroupKey } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const { t, locale } = useI18n()
const router = useRouter()
const fwUpdate = useFirmwareUpdate()

const manualLink = computed(() => {
  if (!bt.isConnected)
    return null
  const sku = fwUpdate.sku.value
  if (!sku)
    return null
  const lang = ['ru', 'de'].includes(locale.value) ? locale.value : 'en'
  return `/devices/${sku}/manual-${lang}`
})

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
  { id: 'led', x: 120, y: 120, r: 18, route: '/settings/behaviour', label: t('dashboard.hub-behaviour') },
  { id: 'btn-1', x: 66, y: 66, r: 44, route: '/settings/power', label: t('dashboard.hub-power') },
  { id: 'btn-2', x: 174, y: 66, r: 44, route: '/settings/audio', label: t('dashboard.hub-sound') },
  { id: 'btn-3', x: 66, y: 174, r: 44, route: '/settings/behaviour', label: t('dashboard.hub-behaviour') },
  { id: 'btn-4', x: 174, y: 174, r: 44, route: '/settings/audio', label: t('dashboard.hub-sound') },
])

function onJump(h: Hotspot) {
  if (h.route)
    router.push(h.route)
}

const ledOn = computed(() => bt.isConnected)
const fwLabel = computed(() => bt.dis.firmwareRevisionString.value ?? '—')
const isOffline = computed(() => !bt.isConnected)

// Banner state priority: connecting/fetching progress → demo. Connect
// errors are surfaced by the global ConnectErrorBanner in the layout, so
// no inline branch for bt.errorMessage here — would just double-fire.
const banner = computed(() => {
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
          <CkEyebrow :color="bt.isConnected ? 'var(--ck-signal)' : 'var(--ck-dim)'">
            {{ bt.isConnected ? t('dashboard.live') : t('dashboard.offline-eyebrow') }}
          </CkEyebrow>
        </div>
        <div class="dash__topdown">
          <DeviceTopdown :scale="1" :led-on="ledOn" :hotspots="hotspots" @jump="onJump" />
        </div>
        <div class="dash__hint">
          <span>{{ t('dashboard.hover-jump-hint') }}</span>
          <RouterLink
            v-if="manualLink"
            :to="manualLink"
            class="dash__hint-link"
          >
            {{ t('dashboard.manual-link') }}
          </RouterLink>
          <span
            v-else-if="!bt.isConnected"
            class="dash__hint-link dash__hint-link--disabled"
            :title="t('dashboard.manual-link-need-connect')"
          >
            {{ t('dashboard.manual-link') }}
          </span>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.dash__hint-link {
  color: var(--ck-ink);
  text-decoration: none;
}

.dash__hint-link:hover {
  color: var(--ck-signal);
}

.dash__hint-link--disabled {
  color: var(--ck-dim);
  cursor: not-allowed;
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
