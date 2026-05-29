<script setup lang="ts">
const bt = useBluetoothStore()
const saved = useSavedDevicesStore()
const { t, locale } = useI18n()

// Best-effort presence: light an "available now" badge for saved devices whose
// advertising packets we can hear without connecting. Degrades silently when
// the advertisement API is unavailable (flag off / iOS shim). Watching costs
// radio, so we only run it while this list is on screen and not connected.
const { presenceById, supported: presenceSupported, start: startPresence, stop: stopPresence } = useDevicePresence()

function isAvailable(id: string): boolean {
  return !bt.isConnected && (presenceById[id]?.inRange ?? false)
}

onMounted(() => {
  if (!bt.isConnected)
    startPresence()
})
onUnmounted(stopPresence)
watch(() => bt.isConnected, (connected) => {
  if (connected)
    stopPresence()
  else
    startPresence()
})

const dtfRelative = computed(() => {
  if (typeof Intl === 'undefined' || !('RelativeTimeFormat' in Intl))
    return null
  return new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
})

function relTime(ts: number): string {
  const fmt = dtfRelative.value
  if (!fmt)
    return new Date(ts).toLocaleString()
  const diffMs = ts - Date.now()
  const mins = Math.round(diffMs / 60_000)
  if (Math.abs(mins) < 60)
    return fmt.format(mins, 'minute')
  const hours = Math.round(mins / 60)
  if (Math.abs(hours) < 24)
    return fmt.format(hours, 'hour')
  const days = Math.round(hours / 24)
  return fmt.format(days, 'day')
}

function reconnect(id: string) {
  bt.connectToSavedDevice(id)
}

function toggleAuto(id: string, current: boolean) {
  saved.setAutoConnect(id, !current)
}

const pendingForgetId = ref<string | null>(null)

function askForget(id: string) {
  pendingForgetId.value = id
}

function confirmForget() {
  if (pendingForgetId.value)
    saved.forget(pendingForgetId.value)
  pendingForgetId.value = null
}

function cancelForget() {
  pendingForgetId.value = null
}
</script>

<template>
  <div v-if="saved.devices.length === 0" class="empty">
    {{ t('pair.saved-empty') }}
  </div>
  <ul v-else class="device-list">
    <li
      v-for="dev in saved.sortedByLastSeen"
      :key="dev.id"
      class="device-row"
      :class="{
        'device-row--active': bt.isConnected && bt.devName === dev.name,
        'device-row--available': isAvailable(dev.id),
      }"
    >
      <div class="device-row__head">
        <div class="device-row__name-block">
          <span class="device-row__name">{{ dev.nickname || dev.name }}</span>
          <CkTag v-if="bt.isConnected && bt.devName === dev.name" filled color="var(--ck-signal)">
            {{ t('pair.in-range') }}
          </CkTag>
          <CkTag v-else-if="isAvailable(dev.id)" color="var(--ck-signal)">
            {{ t('pair.available-now') }}
          </CkTag>
        </div>
        <button class="device-row__menu" :aria-label="t('pair.forget')" @click="askForget(dev.id)">
          ≡
        </button>
      </div>
      <div class="device-row__meta">
        <span>{{ dev.name }}</span>
        <span class="device-row__sep">·</span>
        <span v-if="dev.lastFirmware">FW {{ dev.lastFirmware }}</span>
        <span v-if="dev.lastFirmware" class="device-row__sep">·</span>
        <span>{{ t('pair.last-ago', { when: relTime(dev.lastSeenAt).toUpperCase() }) }}</span>
      </div>
      <div class="device-row__actions">
        <CkCTA
          :kind="bt.isConnected ? 'ghost' : 'primary'"
          :full="false"
          :disabled="bt.isConnecting || bt.isFetching"
          @click="reconnect(dev.id)"
        >
          {{ t('pair.reconnect') }} →
        </CkCTA>
        <span class="device-row__spacer" />
        <label class="device-row__auto">
          <span>{{ t('pair.auto') }}</span>
          <CkSquareToggle
            :model-value="dev.autoConnect"
            :aria-label="t('pair.autoconnect-label')"
            @update:model-value="toggleAuto(dev.id, dev.autoConnect)"
          />
        </label>
      </div>
      <div v-if="pendingForgetId === dev.id" class="device-row__confirm">
        <span>{{ t('pair.forget-confirm') }}</span>
        <div class="device-row__confirm-actions">
          <CkCTA kind="signal" :full="false" @click="confirmForget">
            {{ t('pair.forget') }}
          </CkCTA>
          <CkCTA kind="ghost" :full="false" @click="cancelForget">
            {{ t('local.dismiss') }}
          </CkCTA>
        </div>
      </div>
    </li>
  </ul>
  <p v-if="presenceSupported === false && !bt.isConnected && saved.devices.length > 0" class="presence-hint">
    {{ t('pair.presence-hint') }}
    <RouterLink to="/about">
      {{ t('pair.presence-hint-link') }}
    </RouterLink>
  </p>
</template>

<style scoped>
.empty {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
  padding: 18px 22px;
  text-align: center;
  background: var(--ck-paper);
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
}

.device-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
}

.device-row {
  padding: 14px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  position: relative;
  color: var(--ck-ink);
  text-align: left;
}

.device-row--active {
  border-left: 4px solid var(--ck-signal);
  padding-left: 18px;
}

.device-row__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.device-row__name-block {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.device-row__name {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 19px;
  text-transform: uppercase;
  letter-spacing: -0.3px;
}

.device-row__meta {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  margin-top: 6px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.device-row__sep {
  opacity: 0.6;
}

.device-row__menu {
  background: transparent;
  border: none;
  color: var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 18px;
  cursor: pointer;
  font-weight: 700;
  padding: 0 4px;
}

.device-row__actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-row__spacer {
  flex: 1;
}

.device-row__auto {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-ink);
  font-weight: 700;
  cursor: pointer;
}

.device-row__confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding: 10px;
  background: var(--ck-bg-deep);
  border: var(--ck-stroke-hair) dashed var(--ck-ink);
  font-family: var(--ck-font-body);
  font-size: 12px;
}

.device-row__confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
