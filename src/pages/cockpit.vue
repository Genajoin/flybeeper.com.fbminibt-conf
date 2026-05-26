<script setup lang="ts">
import { computed } from 'vue'
import type { Hotspot } from '~/components/DeviceTopdown.vue'

const bt = useBluetoothStore()
const { t } = useI18n()
const router = useRouter()

// Hotspots map the device's interactive areas to settings sub-pages.
const hotspots = computed<Hotspot[]>(() => [
  { id: 'led', x: 110, y: 120, r: 18, route: '/settings/behaviour', label: 'LED · behaviour' },
  { id: 'btn-1', x: 88, y: 180, r: 18, route: '/settings/behaviour', label: 'Button 1' },
  { id: 'btn-2', x: 132, y: 180, r: 18, route: '/settings/behaviour', label: 'Button 2' },
  { id: 'btn-3', x: 88, y: 224, r: 18, route: '/settings/behaviour', label: 'Button 3' },
  { id: 'btn-4', x: 132, y: 224, r: 18, route: '/settings/behaviour', label: 'Button 4' },
  { id: 'buzzer', x: 110, y: 272, r: 22, route: '/settings/audio', label: 'Buzzer' },
])

function onJump(h: Hotspot) {
  if (h.route)
    router.push(h.route)
}

const ledOn = computed(() => bt.isConnected)
const fwLabel = computed(() => bt.dis.firmwareRevisionString.value ?? '—')

function disconnect() {
  bt.disconnectDevice()
}
</script>

<template>
  <PairingWizard v-if="!bt.isConnected" />

  <section v-else class="dash">
    <PageHeader
      :eyebrow="t('dashboard.eyebrow')"
      :title="bt.dis.modelNumberString.value || 'DEVICE'"
      :sub="`${bt.dis.manufacturerNameString.value} · fw ${fwLabel}`"
    >
      <template #right>
        <RouterLink to="/share" class="dash__hdr-btn">
          {{ t('dashboard.share') }}
        </RouterLink>
        <button type="button" class="dash__hdr-btn dash__hdr-btn--signal" @click="disconnect">
          {{ t('dashboard.disconnect') }}
        </button>
      </template>
    </PageHeader>

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
              {{ t('dashboard.hub-curves-sub') }}
            </div>
          </div>
          <span>→</span>
        </RouterLink>
        <RouterLink to="/settings/curves" class="dash__hub-row">
          <div>
            <div class="dash__hub-label">
              {{ t('dashboard.hub-curves') }}
            </div>
            <div class="dash__hub-sub">
              {{ t('dashboard.hub-curves-sub') }}
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
        <RouterLink to="/settings/uart" class="dash__hub-row">
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

.dash__hdr-btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-ink);
  text-decoration: none;
  background: var(--ck-paper);
  border-radius: 0;
  border-top: none;
  border-right: none;
  border-bottom: none;
  cursor: pointer;
}

.dash__hdr-btn--signal {
  color: var(--ck-signal);
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
