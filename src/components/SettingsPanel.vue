<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'
import type { SettingsGroupKey } from '~/composables/useSettingsGroups'
import { CPF_RESTART_REQUIRED_UUIDS } from '~/composables/useSettingsGroups'
import { DEMO_SETTINGS } from '~/composables/useDemoSnapshot'

const props = defineProps<{
  group: SettingsGroupKey
  cpfChars: BleCharacteristic[]
}>()

const settings = useSettingsStore()
const bt = useBluetoothStore()
const { t } = useI18n()

// Dirty-check now compares the live local value (from settings.local, via the
// virtual char's getter) against the device snapshot. The snapshot is the
// authoritative "what's on the wire" reference: cancel-to-snapshot semantics
// across reconnects, no per-component init state to drift.
function snapshotValue(uuid: string): unknown {
  return settings.lastDeviceSnapshot?.[uuid]
}

function cpfIsCharDirty(ch: BleCharacteristic): boolean {
  const uuid = ch.characteristic.uuid
  const live = ch.formattedValue
  const snap = snapshotValue(uuid)
  if (snap === undefined)
    return false
  return JSON.stringify(live) !== JSON.stringify(snap)
}

const cpfDirtyChars = computed(() =>
  (props.cpfChars ?? []).filter(cpfIsCharDirty),
)

const dirtyCount = computed(() => cpfDirtyChars.value.length)
const isDirty = computed(() => dirtyCount.value > 0)
const isBusy = ref(false)
const isOffline = computed(() => !bt.isConnected)

async function apply() {
  if (!isDirty.value || !bt.isConnected)
    return
  isBusy.value = true
  try {
    let restartNeeded = false
    for (const ch of cpfDirtyChars.value) {
      const uuid = ch.characteristic.uuid
      if (CPF_RESTART_REQUIRED_UUIDS.includes(uuid))
        restartNeeded = true
      // Source of truth lives in settings.local (via the virtual char
      // getter). Route the actual GATT write through writeCharacteristic
      // — which finds the real BLE char and calls setFormattedValue on it
      // — instead of the virtual char's setFormattedValue no-op.
      await bt.writeCharacteristic(uuid, ch.formattedValue)
    }
    if (restartNeeded)
      settings.restartPending = true
    settings.markSynced()
  }
  finally {
    isBusy.value = false
  }
}

function revert() {
  for (const ch of cpfDirtyChars.value) {
    const snap = snapshotValue(ch.characteristic.uuid)
    if (snap !== undefined)
      ch.formattedValue = cloneDeep(snap)
  }
}

function resetGroupToDefaults() {
  // eslint-disable-next-line no-alert
  if (!window.confirm(t('sett.reset-confirm')))
    return
  for (const ch of props.cpfChars ?? []) {
    const def = DEMO_SETTINGS[ch.characteristic.uuid]
    if (def !== undefined)
      ch.formattedValue = cloneDeep(def)
  }
}
</script>

<template>
  <section class="panel">
    <PageHeader
      breadcrumb-to="/settings"
      :breadcrumb-label="t('dashboard.back-dashboard')"
    >
      <template #right>
        <ConnectionPill />
      </template>
    </PageHeader>

    <div v-if="isOffline" class="panel__offline">
      <StateCell label="OFFLINE">
        <span class="panel__offline-text">{{ t('dashboard.offline-body') }}</span>
      </StateCell>
    </div>

    <div class="panel__body">
      <slot />
    </div>

    <footer class="panel__footer" :class="{ 'panel__footer--dirty': isDirty }">
      <button
        class="panel__btn"
        :disabled="isBusy"
        type="button"
        @click="resetGroupToDefaults"
      >
        {{ t('sett.reset') }}
      </button>
      <button
        class="panel__btn"
        :disabled="!isDirty || isBusy"
        type="button"
        @click="revert"
      >
        {{ t('sett.revert') }}
      </button>
      <button
        class="panel__btn panel__btn--signal"
        :disabled="!isDirty || isBusy || isOffline"
        type="button"
        @click="apply"
      >
        {{ t('sett.apply') }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.panel {
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  display: flex;
  flex-direction: column;
}

.panel__offline {
  padding: 14px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.panel__offline-text {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}

.panel__body {
  display: flex;
  flex-direction: column;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.panel__footer {
  display: flex;
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
  position: sticky;
  bottom: 0;
  z-index: 5;
  background: var(--ck-paper);
}

.panel__btn {
  flex: 1;
  font-family: var(--ck-font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  padding: 16px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  cursor: pointer;
  border-radius: 0;
}

.panel__btn:first-child {
  border-left: none;
}

.panel__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.panel__btn:hover:not(:disabled) {
  background: var(--ck-bg-deep);
}

.panel__btn--signal {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.panel__btn--signal:hover:not(:disabled) {
  background: var(--ck-signal);
  filter: brightness(1.05);
}

.panel__btn--signal:disabled {
  background: var(--ck-paper);
  color: var(--ck-dim);
}
</style>
