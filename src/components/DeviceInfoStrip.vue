<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'

/**
 * Top strip on the landing page surfacing the freshly-paired device:
 * model name · firmware revision · battery. Mounts inside PageHeader's
 * #device-strip slot above the regular utility strip so the user can
 * still see and reach theme/language/ONLINE controls underneath, even
 * when this strip wraps onto its own row on narrow viewports.
 *
 * Renders nothing until at least one of name/fw/battery resolves — keeps
 * the offline header from gaining empty chrome.
 */
const bt = useBluetoothStore()
const { t } = useI18n()

const BAT_V_UUID = 'b0c889e8-16d2-45ef-b615-387f6bca2370'
const BAT_PCT_UUID = '00002a19-0000-1000-8000-00805f9b34fb'

const batPct = ref<number | null>(null)
const batV = ref<number | null>(null)

const subs = new Map<string, { ch: BleCharacteristic, cb: (v: unknown) => void }>()

async function attach(ch: BleCharacteristic, sink: 'pct' | 'v') {
  const uuid = ch.characteristic.uuid
  if (subs.has(uuid))
    return
  const cb = (v: unknown) => {
    if (typeof v !== 'number')
      return
    if (sink === 'pct')
      batPct.value = v
    else
      batV.value = v
  }
  ch.subscribe(cb)
  subs.set(uuid, { ch, cb })
  if (!ch.isNotified && !ch.isBlockNotify && ch.characteristic.properties?.notify) {
    try {
      await ch.initialize()
      await ch.subscribeToNotifications()
    }
    catch { /* best-effort */ }
  }
  if (typeof ch.formattedValue === 'number') {
    if (sink === 'pct')
      batPct.value = ch.formattedValue
    else
      batV.value = ch.formattedValue
  }
}

function detach(uuid: string) {
  const s = subs.get(uuid)
  if (!s)
    return
  s.ch.unsubscribe(s.cb)
  subs.delete(uuid)
}

const batPctChar = computed(() =>
  bt.bleCharacteristics.find(c => c.characteristic.uuid === BAT_PCT_UUID) as BleCharacteristic | undefined,
)
const batVChar = computed(() =>
  bt.bleCharacteristics.find(c => c.characteristic.uuid === BAT_V_UUID) as BleCharacteristic | undefined,
)

watch([batPctChar, batVChar], ([pctCh, vCh]) => {
  if (pctCh) {
    void attach(pctCh, 'pct')
  }
  else {
    detach(BAT_PCT_UUID)
    batPct.value = null
  }
  if (vCh) {
    void attach(vCh, 'v')
  }
  else {
    detach(BAT_V_UUID)
    batV.value = null
  }
}, { immediate: true })

onBeforeUnmount(() => {
  for (const uuid of [...subs.keys()])
    detach(uuid)
})

/**
 * Full device identity, e.g. `FBFV.9BFC`. The BLE advertising name is
 * `{DEVICE_NAME}.{last 4 hex of the hardware id}`, and that four-character
 * code is what support (and the FANET registry) need. The strip used to show
 * `modelNumberString` alone — the SKU, e.g. `FBFV` — so once the browser's
 * device chooser had closed, the code was reachable nowhere in the UI.
 */
const model = computed(() => (bt.dis.modelNumberString.value as string | null) || null)
const name = computed(() => bt.devName || model.value)
const fw = computed(() => (bt.dis.firmwareRevisionString.value as string | null) || null)

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

/** Support asks for this string constantly — make it one tap to copy. */
async function copyName() {
  if (!name.value)
    return
  try {
    await navigator.clipboard?.writeText(name.value)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied.value = false), 1500)
  }
  catch { /* clipboard blocked (insecure context / permission) — it is on screen anyway */ }
}

onBeforeUnmount(() => clearTimeout(copyTimer))

const fwUpdate = useFirmwareUpdate()

const batText = computed(() => {
  if (batPct.value !== null)
    return `${Math.round(batPct.value)}%`
  if (batV.value !== null)
    return `${batV.value.toFixed(2)}V`
  return null
})

const hasAny = computed(() => !!(name.value || fw.value || batText.value))
</script>

<template>
  <template v-if="hasAny">
    <button
      v-if="name"
      type="button"
      class="dev__cell dev__cell--name"
      :title="t('dashboard.copy-device-id')"
      @click="copyName"
    >
      {{ copied ? t('dashboard.copied') : name }}
    </button>
    <span v-if="model && name !== model" class="dev__cell dev__cell--model">{{ model }}</span>
    <RouterLink
      v-if="fw && fwUpdate.hasUpdate.value"
      class="dev__cell dev__cell--update"
      :to="fwUpdate.updatePath.value"
      :title="t('dashboard.fw-update-warn')"
    >
      ⚠ FW {{ fwUpdate.current.value || fw }} → {{ fwUpdate.latest.value }}
    </RouterLink>
    <span v-else-if="fw" class="dev__cell">FW {{ fw }}</span>
    <span v-if="batText" class="dev__cell">{{ t('dashboard.bat') }} {{ batText }}</span>
  </template>
</template>

<style scoped>
/* Cells are rendered as direct children of .page-head__strip so they
   participate in its flex-wrap: on wide viewports they sit inline with
   the utility cluster; on narrow viewports the wrap pushes the rest
   onto a second row beneath them. */
.dev__cell {
  padding: 10px 14px;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-ink);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
}

.dev__cell--name {
  color: var(--ck-signal);
  background: none;
  border-top: none;
  border-left: none;
  border-bottom: none;
  cursor: pointer;
  letter-spacing: var(--ck-track-data);
}

.dev__cell--model {
  color: var(--ck-dim);
}

.dev__cell--update {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  text-decoration: none;
}

.dev__cell--update:hover {
  background: var(--ck-ink);
  color: var(--ck-paper);
}
</style>
