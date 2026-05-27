<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'
import type { SettingsGroupKey } from '~/composables/useSettingsGroups'
import { CPF_RESTART_REQUIRED_UUIDS } from '~/composables/useSettingsGroups'

const props = defineProps<{
  group: SettingsGroupKey
  cpfChars: BleCharacteristic[]
}>()

const settings = useSettingsStore()
const bt = useBluetoothStore()
const { t } = useI18n()

// Snapshot each CPF characteristic's initial value once it's read, so we can
// compute a per-characteristic dirty state independent of the parent store.
const cpfInitial = ref<Record<string, unknown>>({})

watch(
  () => props.cpfChars,
  (chars) => {
    if (!chars)
      return
    for (const ch of chars) {
      const uuid = ch.characteristic.uuid
      if (cpfInitial.value[uuid] === undefined && ch.formattedValue !== null && ch.formattedValue !== undefined)
        cpfInitial.value[uuid] = cloneDeep(ch.formattedValue)
    }
  },
  { immediate: true, deep: true },
)

function cpfIsCharDirty(ch: BleCharacteristic): boolean {
  const init = cpfInitial.value[ch.characteristic.uuid]
  if (init === undefined)
    return false
  return JSON.stringify(ch.formattedValue) !== JSON.stringify(init)
}

const cpfDirtyChars = computed(() =>
  (props.cpfChars ?? []).filter(cpfIsCharDirty),
)

const dirtyCount = computed(() => cpfDirtyChars.value.length)
const isDirty = computed(() => dirtyCount.value > 0)
const isBusy = ref(false)
const isOffline = computed(() => !bt.isConnected)

async function apply() {
  if (!isDirty.value)
    return
  isBusy.value = true
  try {
    let restartNeeded = false
    for (const ch of cpfDirtyChars.value) {
      if (CPF_RESTART_REQUIRED_UUIDS.includes(ch.characteristic.uuid))
        restartNeeded = true
      if (bt.isConnected)
        await ch.setFormattedValue()
      cpfInitial.value[ch.characteristic.uuid] = cloneDeep(ch.formattedValue)
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
  for (const ch of cpfDirtyChars.value)
    ch.formattedValue = cloneDeep(cpfInitial.value[ch.characteristic.uuid])
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
        :disabled="!isDirty || isBusy"
        type="button"
        @click="revert"
      >
        {{ t('sett.revert') }}
      </button>
      <button
        class="panel__btn panel__btn--signal"
        :disabled="!isDirty || isBusy"
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
