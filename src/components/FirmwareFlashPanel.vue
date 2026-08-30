<script setup lang="ts">
import { computed } from 'vue'

/**
 * The update flow for /update/firmware/<sku>, shaped as a three-step wizard:
 * CONNECT → UPDATE → DONE, with exactly one primary button on screen at any
 * moment. The earlier version assumed the device was already connected and
 * left the download links as the only visible affordance — people ended up
 * downloading .bin files with no idea where "update" lived.
 */

const props = defineProps<{
  sku: string
  latest: string | null
}>()

const { t } = useI18n()
const bt = useBluetoothStore()
const saved = useSavedDevicesStore()
const fwUpdate = useFirmwareUpdate()
const { bySku } = useDeviceCatalog()

const {
  phase,
  percent,
  sentBytes,
  totalBytes,
  error,
  errorCode,
  targetVersion,
  isActive,
  flash: startFlash,
  verify,
  cancel,
  reset,
} = useFirmwareFlash()

const device = computed(() => bySku(props.sku))
const deviceName = computed(() => device.value?.displayName ?? props.sku.toUpperCase())
const connecting = computed(() => bt.isConnecting || bt.isFetching)
const isThisDevice = computed(() => bt.isConnected && fwUpdate.sku.value === props.sku)
/* Connected, but DIS model number never arrived — discovery came up short
 * (fresh GATT cache right after a firmware change is the usual reason). This
 * is NOT "a different device": naming it that sent people hunting for another
 * vario on the desk. Offer a reconnect instead. */
const modelUnknown = computed(() => bt.isConnected && !fwUpdate.sku.value)
const isUpToDate = computed(() =>
  isThisDevice.value && !!props.latest && fwUpdate.current.value === props.latest,
)
const downloadHref = computed(() =>
  props.latest ? `/firmware/${props.sku}/app_update.${props.latest}.bin` : '',
)

/** 1 = connect, 2 = install, 3 = done. Drives the step strip at the top. */
const step = computed(() => {
  if (phase.value === 'done')
    return 3
  if (isActive.value)
    return 2
  return isThisDevice.value ? 2 : 1
})

const statusLabel = computed(() => {
  switch (phase.value) {
    case 'preparing': return t('update.flash-preparing')
    case 'uploading': return t('update.flash-uploading')
    case 'marking': return t('update.flash-marking')
    case 'rebooting': return t('update.flash-rebooting')
    case 'verifying': return t('update.flash-verifying')
    case 'awaiting-reconnect': return t('update.flash-awaiting-title')
    default: return ''
  }
})

const connectLabel = computed(() => {
  if (bt.isFetching)
    return t('dashboard.fetching-cta', { n: bt.fetchProgress, total: bt.fetchTotal || '?' })
  if (bt.isConnecting)
    return t('dashboard.connecting-cta')
  return t('update.flash-connect-cta')
})

function connect() {
  if (connecting.value) {
    bt.cancelConnect()
    return
  }
  // Straight to the device we saw last — connectToSavedDevice falls back to
  // the browser chooser by itself when that one is not reachable silently.
  const last = saved.sortedByLastSeen[0]
  if (last)
    void bt.connectToSavedDevice(last.id)
  else
    void bt.connectToRequestDevice()
}

async function connectAnother() {
  if (bt.isConnected)
    await bt.disconnectDevice()
  void bt.connectToRequestDevice()
}

function start() {
  if (props.latest)
    void startFlash(props.sku, props.latest)
}
</script>

<template>
  <section class="flash">
    <ol class="flash__steps">
      <li class="flash__step" :class="{ 'is-current': step === 1, 'is-done': step > 1 }">
        <span class="flash__step-num">01</span>{{ t('update.wizard-connect') }}
      </li>
      <li class="flash__step" :class="{ 'is-current': step === 2, 'is-done': step > 2 }">
        <span class="flash__step-num">02</span>{{ t('update.wizard-install') }}
      </li>
      <li class="flash__step" :class="{ 'is-current': step === 3 }">
        <span class="flash__step-num">03</span>{{ t('update.wizard-done') }}
      </li>
    </ol>

    <div class="flash__body">
      <!-- ---------- live progress ---------- -->
      <template v-if="isActive">
        <h2 class="flash__title">
          {{ statusLabel }}
        </h2>
        <template v-if="phase === 'uploading'">
          <div
            class="flash__bar"
            role="progressbar"
            :aria-valuenow="percent"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span class="flash__bar-fill" :style="{ width: `${percent}%` }" />
          </div>
          <p class="flash__data">
            {{ percent }}% · {{ Math.round(sentBytes / 1024) }} / {{ Math.round(totalBytes / 1024) }} KB
          </p>
        </template>

        <template v-if="phase === 'awaiting-reconnect'">
          <p class="flash__lead">
            {{ t('update.flash-awaiting-body') }}
          </p>
          <button class="flash__cta" type="button" @click="verify()">
            {{ t('update.flash-reconnect-cta') }}
          </button>
        </template>
        <template v-else>
          <p class="flash__lead">
            {{ t('update.flash-keep-close') }}
          </p>
          <button class="flash__cta flash__cta--quiet" type="button" @click="cancel()">
            {{ t('update.flash-cancel') }}
          </button>
        </template>
      </template>

      <!-- ---------- finished ---------- -->
      <template v-else-if="phase === 'done'">
        <h2 class="flash__title">
          ✓ {{ t('update.flash-done-title') }}
        </h2>
        <p class="flash__lead">
          {{ t('update.flash-done-body', { version: targetVersion ?? latest }) }}
        </p>
        <button class="flash__cta flash__cta--quiet" type="button" @click="reset()">
          {{ t('update.flash-dismiss') }}
        </button>
      </template>

      <!-- ---------- failed ---------- -->
      <template v-else-if="phase === 'error'">
        <h2 class="flash__title flash__title--error">
          {{ t('update.flash-error-title') }}
        </h2>
        <p class="flash__lead">
          <template v-if="error === 'security'">
            {{ t('update.flash-error-security') }}
          </template>
          <template v-else>
            {{ error }}
          </template>
        </p>
        <p v-if="errorCode !== null" class="flash__data">
          {{ t('update.flash-error-rc', { code: errorCode }) }}
        </p>
        <button v-if="isThisDevice && latest" class="flash__cta" type="button" @click="start">
          {{ t('update.flash-retry') }}
        </button>
        <button class="flash__cta flash__cta--quiet" type="button" @click="reset()">
          {{ t('update.flash-dismiss') }}
        </button>
      </template>

      <!-- ---------- step 1: no Web Bluetooth at all (confirmed) ---------- -->
      <template v-else-if="bt.bleBlocked">
        <h2 class="flash__title">
          {{ t('update.flash-unsupported-title') }}
        </h2>
        <p class="flash__lead">
          {{ t('update.flash-unsupported') }}
        </p>
        <a v-if="downloadHref" class="flash__cta flash__cta--quiet" :href="downloadHref" :download="`app_update.${latest}.bin`">
          {{ t('update.flash-download-instead', { version: latest }) }}
        </a>
      </template>

      <!-- ---------- step 1: connect ---------- -->
      <template v-else-if="!bt.isConnected">
        <h2 class="flash__title">
          {{ t('update.flash-connect-title', { model: deviceName }) }}
        </h2>
        <p class="flash__lead">
          {{ latest ? t('update.flash-connect-lead', { latest }) : t('update.flash-connect-first') }}
        </p>
        <button class="flash__cta" type="button" @click="connect">
          {{ connectLabel }}
          <CkDots v-if="connecting" />
        </button>
      </template>

      <!-- ---------- step 1: connected, but the model could not be read ---------- -->
      <template v-else-if="modelUnknown">
        <h2 class="flash__title">
          {{ t('update.flash-model-unknown-title') }}
        </h2>
        <p class="flash__lead">
          {{ t('update.flash-model-unknown', { name: bt.devName }) }}
        </p>
        <button class="flash__cta" type="button" @click="connectAnother">
          {{ t('update.flash-model-unknown-retry') }}
        </button>
      </template>

      <!-- ---------- step 1: a different device is on the link ---------- -->
      <template v-else-if="!isThisDevice">
        <h2 class="flash__title">
          {{ t('update.flash-other-device-title') }}
        </h2>
        <p class="flash__lead">
          {{ t('update.flash-other-device', {
            model: bt.dis.modelNumberString.value ?? bt.devName,
            expected: deviceName,
          }) }}
        </p>
        <button class="flash__cta" type="button" @click="connectAnother">
          {{ t('update.flash-connect-other') }}
        </button>
      </template>

      <!-- ---------- step 2: nothing to do ---------- -->
      <template v-else-if="isUpToDate">
        <h2 class="flash__title">
          ✓ {{ t('update.flash-uptodate-title') }}
        </h2>
        <p class="flash__lead">
          {{ t('update.flash-uptodate', { version: fwUpdate.current.value }) }}
          {{ t('update.flash-uptodate-hint') }}
        </p>
      </template>

      <!-- ---------- step 2: install ---------- -->
      <template v-else-if="latest">
        <h2 class="flash__title">
          {{ t('update.flash-install-title', { latest }) }}
        </h2>
        <p class="flash__lead">
          {{ t('update.flash-available', { current: fwUpdate.current.value ?? '—', latest }) }}
        </p>
        <button class="flash__cta" type="button" @click="start">
          {{ t('update.flash-cta', { version: latest }) }}
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.flash {
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

/* Step strip — always visible, so "where am I / what is next" is answered
 * before the user reads anything else. */
.flash__steps {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.flash__step {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
}

.flash__step:last-child {
  border-right: none;
}

.flash__step.is-current {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.flash__step.is-done {
  color: var(--ck-ink);
}

.flash__step-num {
  font-size: 13px;
}

.flash__body {
  padding: 18px 22px 0;
  border-left: 8px solid var(--ck-signal);
}

.flash__title {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.6px;
  line-height: 1.1;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.flash__title--error {
  color: var(--ck-signal);
}

.flash__lead {
  font-size: 13px;
  color: var(--ck-dim);
  line-height: 1.5;
  margin: 0 0 14px;
  max-width: 540px;
}

.flash__data {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
  margin: 0 0 12px;
}

.flash__bar {
  height: 12px;
  background: var(--ck-bg-deep);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  margin: 0 0 8px;
  overflow: hidden;
}

.flash__bar-fill {
  display: block;
  height: 100%;
  background: var(--ck-signal);
  transition: width 120ms linear;
}

/* One primary action, full width, impossible to miss. Secondary actions get
 * the quiet variant so they never compete with it. */
.flash__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% + 22px);
  margin: 0 -22px 0 -22px;
  padding: 18px 14px;
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border: none;
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}

.flash__cta--quiet {
  background: var(--ck-paper);
  color: var(--ck-ink);
  font-size: 11px;
  padding: 14px;
}

.flash__cta:hover {
  filter: brightness(0.95);
}

@media (min-width: 720px) {
  .flash__body {
    padding: 22px 28px 0;
  }
  .flash__cta {
    width: calc(100% + 28px);
    margin: 0 -28px 0 -28px;
  }
  .flash__title {
    font-size: 26px;
  }
}
</style>
