<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep'
import type { iFbMiniBtSettings } from '~/stores/bluetooth'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'
import type { SettingsGroupKey } from '~/composables/useSettingsGroups'
import { CPF_RESTART_REQUIRED_UUIDS } from '~/composables/useSettingsGroups'

const props = defineProps<{
  group: SettingsGroupKey
  /** Legacy ≤0.15 fields owned by this group (drives diffGroup / revertGroup). */
  fields: (keyof iFbMiniBtSettings)[]
  /** CPF ≥0.15 characteristics in this group (drives per-characteristic dirty tracking). */
  cpfChars?: BleCharacteristic[]
}>()

const settings = useSettingsStore()
const bt = useBluetoothStore()
const { t } = useI18n()

// CPF dirty tracking: snapshot the initial formattedValue per characteristic
// once it's read, then compare on every render. We can't rely on the store
// because CPF characteristics are stateful instances owned by bluetoothStore.
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

const legacyDirty = computed(() =>
  settings.local ? settings.diffGroup(props.fields) : [],
)

const dirtyCount = computed(() => legacyDirty.value.length + cpfDirtyChars.value.length)
const isDirty = computed(() => dirtyCount.value > 0)
const isBusy = ref(false)

async function apply() {
  if (!isDirty.value)
    return
  isBusy.value = true
  try {
    // Legacy struct: one batched writeMiniBtSettings covers every field this
    // group owns. Only invoked when the legacy fields actually moved.
    if (legacyDirty.value.length > 0 && settings.local) {
      if (bt.isConnected)
        await bt.writeMiniBtSettings(settings.local)
      else
        settings.markSynced()
    }
    // CPF: each dirty characteristic writes individually. Capture restart-
    // required transitions here since the legacy path no longer drives them
    // for fw ≥0.15.
    let restartNeeded = false
    for (const ch of cpfDirtyChars.value) {
      if (CPF_RESTART_REQUIRED_UUIDS.includes(ch.characteristic.uuid))
        restartNeeded = true
      await ch.setFormattedValue()
      cpfInitial.value[ch.characteristic.uuid] = cloneDeep(ch.formattedValue)
    }
    if (restartNeeded)
      settings.restartPending = true
  }
  finally {
    isBusy.value = false
  }
}

function revert() {
  if (legacyDirty.value.length > 0)
    settings.revertGroup(props.fields)
  for (const ch of cpfDirtyChars.value)
    ch.formattedValue = cloneDeep(cpfInitial.value[ch.characteristic.uuid])
}
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <p class="panel__eyebrow">
        {{ t(`sett.group-${group}`) }}
      </p>
      <p class="panel__desc">
        {{ t(`sett.group-${group}-desc`) }}
      </p>
    </header>

    <div class="panel__body">
      <slot />
    </div>

    <footer class="panel__footer">
      <p class="panel__dirty" :class="{ 'panel__dirty--active': isDirty }">
        {{ isDirty ? t('sett.unsynced', { count: dirtyCount }) : t('sett.no-changes') }}
      </p>
      <div class="panel__actions">
        <button
          class="panel__btn"
          :disabled="!isDirty || isBusy"
          @click="revert"
        >
          {{ t('sett.revert') }}
        </button>
        <button
          class="panel__btn panel__btn--primary"
          :disabled="!isDirty || isBusy"
          @click="apply"
        >
          {{ t('sett.apply') }}
        </button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.panel {
  background: var(--ck-paper);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  padding: var(--ck-s-lg);
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
  text-align: left;
}

.panel__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
}

.panel__eyebrow {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-h1);
  font-weight: 700;
  margin: 0;
  line-height: var(--ck-line-tight);
  text-transform: uppercase;
}

.panel__desc {
  font-size: var(--ck-fs-body);
  color: var(--ck-ink-dim);
  margin: 0;
  line-height: var(--ck-line-body);
}

.panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
}

.panel__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ck-s-md);
  flex-wrap: wrap;
  margin-top: var(--ck-s-sm);
  padding-top: var(--ck-s-md);
  border-top: var(--ck-stroke-hair) dashed var(--ck-grid);
}

.panel__dirty {
  margin: 0;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.panel__dirty--active {
  color: var(--ck-signal);
}

.panel__actions {
  display: flex;
  gap: var(--ck-s-sm);
}

.panel__btn {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  font-weight: 600;
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
}

.panel__btn:disabled {
  background: var(--ck-bg-deep);
  border-color: var(--ck-grid);
  color: var(--ck-dim);
  cursor: not-allowed;
}

.panel__btn--primary {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border-color: var(--ck-signal);
}

.panel__btn--primary:not(:disabled):hover {
  background: var(--ck-ink);
  border-color: var(--ck-ink);
}
</style>
