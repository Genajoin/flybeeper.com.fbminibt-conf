<script setup lang="ts">
import { computed } from 'vue'

/**
 * Update-over-Bluetooth panel for /update/firmware/<sku>.
 *
 * Shows exactly one of: "connect first" / "wrong device" / "up to date" /
 * "ready to install" / live progress / "reconnect to finish" / result. The
 * flashing itself lives in useFirmwareFlash(), whose state is module-scoped,
 * so a CTA rendered elsewhere on the page drives the very same operation.
 */

const props = defineProps<{
  sku: string
  latest: string | null
}>()

const { t } = useI18n()
const bt = useBluetoothStore()
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
const isThisDevice = computed(() => bt.isConnected && fwUpdate.sku.value === props.sku)
const canFlash = computed(() => isThisDevice.value && !!props.latest && !isActive.value)
const isUpToDate = computed(() =>
  isThisDevice.value && !!props.latest && fwUpdate.current.value === props.latest,
)

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

function start() {
  if (props.latest)
    void startFlash(props.sku, props.latest)
}
</script>

<template>
  <section class="flash">
    <CkEyebrow color="var(--ck-signal)" block>
      {{ t('update.flash-eyebrow') }}
    </CkEyebrow>

    <!-- Live progress: upload percentage, then the reboot / verify steps. -->
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
        <p class="flash__body">
          {{ t('update.flash-awaiting-body') }}
        </p>
        <div class="flash__ctas">
          <button class="flash__btn flash__btn--signal" type="button" @click="verify()">
            {{ t('update.flash-reconnect-cta') }}
          </button>
        </div>
      </template>
      <template v-else>
        <p class="flash__body">
          {{ t('update.flash-keep-close') }}
        </p>
        <div class="flash__ctas">
          <button class="flash__btn" type="button" @click="cancel()">
            {{ t('update.flash-cancel') }}
          </button>
        </div>
      </template>
    </template>

    <!-- Terminal states -->
    <template v-else-if="phase === 'done'">
      <h2 class="flash__title">
        {{ t('update.flash-done-title') }}
      </h2>
      <p class="flash__body">
        {{ t('update.flash-done-body', { version: targetVersion ?? latest }) }}
      </p>
      <div class="flash__ctas">
        <button class="flash__btn" type="button" @click="reset()">
          {{ t('update.flash-dismiss') }}
        </button>
      </div>
    </template>

    <template v-else-if="phase === 'error'">
      <h2 class="flash__title flash__title--error">
        {{ t('update.flash-error-title') }}
      </h2>
      <p class="flash__body">
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
      <div class="flash__ctas">
        <button v-if="canFlash" class="flash__btn flash__btn--signal" type="button" @click="start">
          {{ t('update.flash-retry') }}
        </button>
        <button class="flash__btn" type="button" @click="reset()">
          {{ t('update.flash-dismiss') }}
        </button>
      </div>
    </template>

    <!-- Idle states -->
    <p v-else-if="!bt.bleAvailable" class="flash__body">
      {{ t('update.flash-unsupported') }}
    </p>

    <template v-else-if="!bt.isConnected">
      <p class="flash__body">
        {{ t('update.flash-connect-first') }}
      </p>
      <p v-if="latest" class="flash__data">
        {{ t('update.flash-ready', { latest }) }}
      </p>
    </template>

    <p v-else-if="!isThisDevice" class="flash__body">
      {{ t('update.flash-other-device', {
        model: bt.dis.modelNumberString.value ?? bt.devName,
        expected: device?.displayName ?? sku.toUpperCase(),
      }) }}
    </p>

    <template v-else-if="isUpToDate">
      <p class="flash__body">
        {{ t('update.flash-uptodate', { version: fwUpdate.current.value }) }}
      </p>
      <div class="flash__ctas">
        <button class="flash__btn" type="button" :disabled="!canFlash" @click="start">
          {{ t('update.flash-cta', { version: latest }) }}
        </button>
      </div>
    </template>

    <template v-else-if="latest">
      <h2 class="flash__title">
        {{ t('update.flash-available', { current: fwUpdate.current.value ?? '—', latest }) }}
      </h2>
      <div class="flash__ctas">
        <button class="flash__btn flash__btn--signal" type="button" :disabled="!canFlash" @click="start">
          {{ t('update.flash-cta', { version: latest }) }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.flash {
  padding: 16px 22px;
  background: var(--ck-paper);
  border-left: 8px solid var(--ck-signal);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.flash__title {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 20px;
  letter-spacing: -0.5px;
  line-height: 1.1;
  margin: 6px 0 8px;
  text-transform: uppercase;
}

.flash__title--error {
  color: var(--ck-signal);
}

.flash__body {
  font-size: 13px;
  color: var(--ck-dim);
  line-height: 1.5;
  margin: 0 0 10px;
  max-width: 540px;
}

.flash__data {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
  margin: 0 0 10px;
}

.flash__bar {
  height: 10px;
  background: var(--ck-bg-deep);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  margin: 4px 0 8px;
  overflow: hidden;
}

.flash__bar-fill {
  display: block;
  height: 100%;
  background: var(--ck-signal);
  transition: width 120ms linear;
}

.flash__ctas {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -22px -16px;
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
}

.flash__btn {
  flex: 1;
  min-width: 50%;
  padding: 14px;
  text-align: center;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  cursor: pointer;
}

.flash__btn:last-child {
  border-right: none;
}

.flash__btn--signal {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.flash__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (min-width: 720px) {
  .flash {
    padding: 20px 28px;
  }
  .flash__ctas {
    margin: 0 -28px -20px;
  }
  .flash__btn {
    min-width: 0;
  }
}
</style>
