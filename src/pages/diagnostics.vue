<script setup lang="ts">
import { mailtoUrl, reportFileName, reportText, trend } from '~/utils/diagnostics'
import { SAMPLE_PERIOD_MS, useDiagnostics } from '~/composables/useDiagnostics'

/**
 * /diagnostics — one page support can link customers to. Collects a report
 * from the connected device and the browser, shows it, and hands it over by
 * clipboard, JSON file or a pre-filled email. The address is given out to
 * customers: keep it stable.
 */

// Support inbox named by the owner (2026-09-28). Ask the owner
// before changing it — it is baked into every email the page opens.
const SUPPORT_EMAIL = 'flybeeper@alpisto.eu'

const { t } = useI18n()
const bt = useBluetoothStore()
const diag = useDiagnostics()

useHead({ title: () => `${t('diag.title')} · FlyBeeper` })

const problem = ref('')
const copied = ref(false)
const downloaded = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

const busyConnecting = computed(() => bt.isConnecting || bt.isFetching)

// The report describes the visitor's browser — never render it at prerender
// time (it would say "Node.js" and mismatch on hydration).
const mounted = ref(false)

// Collect as soon as the device is fully up; the browser-only part right away.
onMounted(() => {
  mounted.value = true
  if (bt.isConnected)
    void diag.collect()
  else
    diag.collectOffline()
})
watch(() => bt.isConnected && !bt.isFetching, (ready, was) => {
  if (ready && !was)
    void diag.collect()
})

const text = computed(() => {
  if (!mounted.value)
    return ''
  // Re-render when live data moves (samples / report).
  void diag.sampleCount.value
  void diag.report.value
  return reportText(diag.current(problem.value))
})

const batteryNow = computed(() => {
  const s = diag.samples.value
  const v = trend(s, 'batteryV')
  const p = trend(s, 'batteryPct')
  if (!v && !p)
    return null
  return [p && `${Math.round(p.last)} %`, v && `${v.last.toFixed(2)} V`].filter(Boolean).join(' · ')
})

const elapsedMin = computed(() => {
  const s = diag.samples.value
  if (s.length < 2)
    return 0
  return Math.round((Date.parse(s[s.length - 1].t) - Date.parse(s[0].t)) / 60_000)
})

function connect() {
  if (busyConnecting.value)
    void bt.cancelConnect()
  else
    void bt.connectToRequestDevice()
}

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied.value = false), 2000)
  }
  catch { /* clipboard blocked — the text below is selectable */ }
}

function downloadJson() {
  const r = diag.current(problem.value)
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = reportFileName(r)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  downloaded.value = true
}

/**
 * The full report does not fit into a mailto: link, so the email carries the
 * summary and asks for the JSON file — which we download right here, so the
 * pilot has it at hand when the mail client opens.
 */
function send() {
  downloadJson()
  const r = diag.current(problem.value)
  const url = mailtoUrl(r, SUPPORT_EMAIL, {
    problemPrompt: t('diag.mail-problem'),
    problem: problem.value,
    attachRequest: t('diag.mail-attach', { file: reportFileName(r) }),
  })
  // After the download has started — some browsers drop it if the page
  // navigates to the mail handler in the same tick.
  setTimeout(() => {
    window.location.href = url
  }, 300)
}

onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <article class="diag">
    <PageHeader
      breadcrumb-to="/"
      breadcrumb-label="← HOME"
      :eyebrow="t('diag.eyebrow')"
      eyebrow-signal
      :title="t('diag.title')"
      :sub="t('diag.sub')"
    />

    <section class="diag__block">
      <template v-if="bt.bleBlocked">
        <StateCell :label="t('diag.no-ble-label')" accent="signal">
          <span>{{ t('diag.no-ble-body') }}</span>
        </StateCell>
      </template>
      <template v-else-if="!bt.isConnected">
        <StateCell :label="t('diag.offline-label')" accent="signal">
          <span>{{ busyConnecting ? t('diag.connecting') : t('diag.offline-body') }}</span>
        </StateCell>
        <button class="diag__btn diag__btn--signal diag__btn--block" type="button" @click="connect">
          {{ busyConnecting ? t('dashboard.cancel-cta') : t('dashboard.connect-cta') }}
        </button>
      </template>
      <template v-else>
        <StateCell :label="t('diag.online-label')">
          <span class="diag__mono">{{ bt.devName || bt.dis.modelNumberString.value }}</span>
          <span v-if="bt.dis.firmwareRevisionString.value" class="diag__mono"> · FW {{ bt.dis.firmwareRevisionString.value }}</span>
          <span v-if="batteryNow" class="diag__mono"> · {{ batteryNow }}</span>
        </StateCell>
        <p class="diag__note">
          {{ diag.collecting.value
            ? t('diag.collecting', { n: diag.progress.value.done, total: diag.progress.value.total })
            : t('diag.sampling', { n: diag.sampleCount.value, sec: SAMPLE_PERIOD_MS / 1000, min: elapsedMin }) }}
        </p>
        <p class="diag__note diag__note--dim">
          {{ t('diag.sampling-hint') }}
        </p>
      </template>
    </section>

    <section class="diag__block">
      <label class="diag__field">
        <span class="diag__field-label">{{ t('diag.problem-label') }}</span>
        <textarea
          v-model="problem"
          class="diag__input diag__input--ta"
          rows="4"
          :placeholder="t('diag.problem-ph')"
        />
      </label>
    </section>

    <div class="diag__actions">
      <button class="diag__btn diag__btn--signal" type="button" :disabled="diag.collecting.value" @click="send">
        {{ t('diag.send') }}
      </button>
      <button class="diag__btn" type="button" @click="downloadJson">
        {{ t('diag.download') }}
      </button>
      <button class="diag__btn" type="button" @click="copy">
        {{ copied ? t('diag.copied') : t('diag.copy') }}
      </button>
      <button
        v-if="bt.isConnected"
        class="diag__btn"
        type="button"
        :disabled="diag.collecting.value"
        @click="diag.collect()"
      >
        {{ t('diag.refresh') }}
      </button>
    </div>

    <section class="diag__block">
      <p class="diag__note">
        {{ t('diag.mail-note', { email: SUPPORT_EMAIL }) }}
      </p>
      <p v-if="downloaded" class="diag__note diag__note--dim">
        {{ t('diag.downloaded') }}
      </p>
    </section>

    <section class="diag__block diag__block--report">
      <CkEyebrow color="var(--ck-signal)" block>
        {{ t('diag.report') }}
      </CkEyebrow>
      <pre v-if="mounted" class="diag__report">{{ text }}</pre>
    </section>
  </article>
</template>

<style scoped>
.diag {
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.diag__block {
  padding: 18px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diag__mono {
  font-family: var(--ck-font-mono);
  font-size: 12px;
}

.diag__note {
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}

.diag__note--dim {
  color: var(--ck-dim);
}

.diag__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diag__field-label {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.diag__input {
  padding: 10px 12px;
  background: var(--ck-bg);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: 0;
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  font-size: 14px;
  line-height: 1.4;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.diag__input:focus {
  border-color: var(--ck-signal);
  box-shadow: inset 0 0 0 1px var(--ck-signal);
}

.diag__input--ta {
  resize: vertical;
  min-height: 96px;
}

.diag__actions {
  display: flex;
  flex-wrap: wrap;
}

.diag__btn {
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
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: 0;
  cursor: pointer;
}

.diag__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.diag__btn--signal {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.diag__btn--block {
  width: 100%;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.diag__report {
  margin: 0;
  padding: 12px;
  background: var(--ck-bg);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 60vh;
  overflow: auto;
  user-select: text;
}
</style>
