<script setup lang="ts">
const bt = useBluetoothStore()
const saved = useSavedDevicesStore()
const { t, locale } = useI18n()

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

function reconnect() {
  // Browsers don't expose a "connect by id" API without showing the chooser
  // again — so we just trigger the standard requestDevice flow. The chooser
  // pre-selects already-paired devices, which makes this a one-tap action
  // for returning users.
  bt.connectToRequestDevice()
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
      class="device-card"
      :class="{ 'device-card--active': bt.isConnected && bt.devName === dev.name }"
    >
      <div class="device-card__head">
        <div class="device-card__name">
          {{ dev.nickname || dev.name }}
          <span v-if="dev.nickname" class="device-card__sub">{{ dev.name }}</span>
        </div>
        <button
          class="device-card__retry"
          :disabled="bt.isConnecting || bt.isConnected || bt.isFetching"
          @click="reconnect"
        >
          {{ t('pair.reconnect') }}
        </button>
      </div>
      <dl class="device-card__meta">
        <div>
          <dt>{{ t('pair.last-seen') }}</dt>
          <dd>{{ relTime(dev.lastSeenAt) }}</dd>
        </div>
        <div v-if="dev.lastFirmware">
          <dt>{{ t('pair.firmware') }}</dt>
          <dd>{{ dev.lastFirmware }}</dd>
        </div>
      </dl>
      <div class="device-card__actions">
        <label class="device-card__toggle">
          <input
            type="checkbox"
            :checked="dev.autoConnect"
            @change="toggleAuto(dev.id, dev.autoConnect)"
          >
          <span>{{ t('pair.autoconnect-label') }}</span>
        </label>
        <button class="device-card__forget" @click="askForget(dev.id)">
          {{ t('pair.forget') }}
        </button>
      </div>
      <div v-if="pendingForgetId === dev.id" class="device-card__confirm">
        <span>{{ t('pair.forget-confirm') }}</span>
        <div class="device-card__confirm-actions">
          <button class="device-card__confirm-yes" @click="confirmForget">
            {{ t('pair.forget') }}
          </button>
          <button class="device-card__confirm-no" @click="cancelForget">
            {{ t('local.dismiss') }}
          </button>
        </div>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.empty {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  color: var(--ck-ink-dim);
  padding: var(--ck-s-md);
  text-align: center;
}

.device-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-sm);
}

.device-card {
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  padding: var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  text-align: left;
}

.device-card--active {
  border-color: var(--ck-signal);
}

.device-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ck-s-md);
}

.device-card__name {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h2);
  font-weight: 700;
  display: flex;
  flex-direction: column;
  line-height: var(--ck-line-tight);
}

.device-card__sub {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  color: var(--ck-dim);
  text-transform: uppercase;
  margin-top: 2px;
}

.device-card__retry {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
  font-weight: 600;
  padding: var(--ck-s-xs) var(--ck-s-sm);
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border: var(--ck-stroke-rule) solid var(--ck-signal);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
}

.device-card__retry:disabled {
  background: var(--ck-bg-deep);
  border-color: var(--ck-grid);
  color: var(--ck-dim);
  cursor: not-allowed;
}

.device-card__meta {
  display: flex;
  gap: var(--ck-s-md);
  margin: var(--ck-s-sm) 0 0;
  flex-wrap: wrap;
}

.device-card__meta > div {
  display: flex;
  flex-direction: column;
}

.device-card__meta dt {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-micro);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.device-card__meta dd {
  margin: 0;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-ink-dim);
}

.device-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ck-s-sm);
  margin-top: var(--ck-s-sm);
}

.device-card__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-xs);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
  cursor: pointer;
}

.device-card__forget {
  background: transparent;
  border: none;
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  cursor: pointer;
}

.device-card__forget:hover {
  color: var(--ck-signal);
}

.device-card__confirm {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
  margin-top: var(--ck-s-sm);
  padding: var(--ck-s-sm);
  background: var(--ck-bg-deep);
  border: var(--ck-stroke-hair) dashed var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
}

.device-card__confirm-actions {
  display: flex;
  gap: var(--ck-s-sm);
  justify-content: flex-end;
}

.device-card__confirm-yes,
.device-card__confirm-no {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-meta);
  font-weight: 600;
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.device-card__confirm-yes {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border-color: var(--ck-signal);
}

.device-card__confirm-no {
  background: var(--ck-paper);
  color: var(--ck-ink);
}
</style>
