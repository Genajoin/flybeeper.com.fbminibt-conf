<script setup lang="ts">
import QRCode from 'qrcode'
import { buildShareUrl } from '~/utils/preset-share'
import { useSharedPresetStore } from '~/stores/shared-preset'

const settings = useSettingsStore()
const shared = useSharedPresetStore()
const { t } = useI18n()

const baseUrl = computed(() => {
  if (typeof window === 'undefined')
    return 'https://config.flybeeper.com/'
  return window.location.origin + window.location.pathname
})

const localBag = computed(() => settings.local ?? {})

const url = computed(() =>
  buildShareUrl(baseUrl.value, localBag.value, shared.exportName),
)

const fragment = computed(() => url.value.split('#preset=')[1] ?? '')

const qrSvg = ref<string>('')

async function regenQr() {
  try {
    qrSvg.value = await QRCode.toString(url.value, {
      type: 'svg',
      margin: 1,
      // Drop EC from default 'M' to 'L' — at ~580 bytes that's QR version
      // 13 vs 15, gives noticeably bigger modules at the same render size.
      errorCorrectionLevel: 'L',
      color: { dark: '#0a0a08', light: '#ffffff' },
    })
  }
  catch {
    qrSvg.value = ''
  }
}

watch(url, () => {
  void regenQr()
}, { immediate: true })

const presetName = computed({
  get: () => shared.exportName,
  set: (v: string) => { shared.exportName = v },
})
const presetBy = computed({
  get: () => shared.exportBy,
  set: (v: string) => { shared.exportBy = v },
})

const byteSize = computed(() => new Blob([url.value]).size)

async function copyUrl() {
  if (typeof navigator === 'undefined' || !navigator.clipboard)
    return
  try {
    await navigator.clipboard.writeText(url.value)
  }
  catch { /* no-op */ }
}

function downloadJson() {
  if (typeof window === 'undefined')
    return
  const payload = JSON.stringify({ name: shared.exportName, by: shared.exportBy, settings: localBag.value }, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(shared.exportName || 'preset').replace(/\s+/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

// Truncated URL preview (mono block keeps it ergonomic at 420+ chars).
const urlHead = computed(() => `${baseUrl.value}#preset=`)
const urlTail = computed(() => fragment.value.length > 120 ? `${fragment.value.slice(0, 120)}...` : fragment.value)
</script>

<template>
  <section class="share">
    <PageHeader
      breadcrumb-to="/cockpit"
      :breadcrumb-label="`← ${t('button.cockpit').toUpperCase()}`"
      right="SHARE"
      right-signal
    >
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('preset.share-eyebrow') }}
        </CkEyebrow>
        <h1 class="share__display">
          {{ t('preset.share-title') }}
        </h1>
        <p class="share__sub">
          {{ t('preset.share-sub') }}
        </p>
      </template>
    </PageHeader>

    <div class="share__grid">
      <div class="share__qr">
        <div class="share__qr-box" v-html="qrSvg" />
        <div class="share__qr-meta">
          <CkEyebrow>{{ t('preset.scan-eyebrow') }}</CkEyebrow>
          <div class="share__qr-name">
            {{ presetName || t('preset.import-default-name') }}
          </div>
          <div class="share__qr-stats">
            <div>{{ Object.keys(localBag).length }} FIELDS</div>
            <div class="share__qr-signal">
              {{ byteSize }} {{ t('preset.bytes') }}
            </div>
          </div>
        </div>
      </div>

      <div class="share__right">
        <div class="share__url">
          <CkEyebrow block>
            {{ t('preset.url-eyebrow') }}
          </CkEyebrow>
          <div class="share__url-box">
            <span class="share__url-head">{{ urlHead }}</span><span>{{ urlTail }}</span>
          </div>
          <div class="share__url-actions">
            <button class="share__url-cta share__url-cta--ink" type="button" @click="copyUrl">
              {{ t('preset.copy-url') }}
            </button>
            <button class="share__url-cta" type="button" @click="downloadJson">
              {{ t('preset.download-json') }}
            </button>
          </div>
        </div>

        <div class="share__form">
          <label class="share__field">
            <CkEyebrow>{{ t('preset.preset-name') }}</CkEyebrow>
            <input v-model="presetName" class="share__input" type="text" :placeholder="t('preset.import-default-name')">
          </label>
          <label class="share__field">
            <CkEyebrow>{{ t('preset.preset-by') }}</CkEyebrow>
            <input v-model="presetBy" class="share__input" type="text" placeholder="@pilot">
          </label>
        </div>
      </div>
    </div>

    <div class="share__privacy">
      {{ t('preset.privacy-note') }}
    </div>
  </section>
</template>

<style scoped>
.share {
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.share__display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: clamp(20px, 7.2vw, 28px);
  letter-spacing: -0.8px;
  margin: 6px 0 6px;
  text-transform: uppercase;
  line-height: 0.95;
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
}

.share__sub {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
  letter-spacing: 1px;
  line-height: 1.6;
  text-transform: uppercase;
  margin: 0;
}

.share__qr {
  padding: 20px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.share__qr-box {
  /* Mobile: take the full available width up to a sensible cap; on a 360px
   * viewport that gives a ~316px QR — modules end up around 4-5px wide,
   * well into the comfort zone for any phone camera. */
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1 / 1;
  padding: 6px;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.share__qr-box :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.share__qr-meta {
  width: 100%;
  max-width: 420px;
}

.share__qr-name {
  font-family: var(--ck-font-display);
  font-size: 19px;
  font-weight: 700;
  margin-top: 6px;
  line-height: 1.1;
  text-transform: uppercase;
}

.share__qr-stats {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
  letter-spacing: 1px;
  margin-top: 6px;
  line-height: 1.6;
}

.share__qr-signal {
  color: var(--ck-signal);
  margin-top: 4px;
}

.share__url {
  padding: 16px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.share__url-box {
  padding: 10px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-bg);
  font-family: var(--ck-font-mono);
  font-size: 10px;
  line-height: 1.6;
  color: var(--ck-ink);
  word-break: break-all;
  max-height: 70px;
  overflow: hidden;
  margin-top: 8px;
}

.share__url-head {
  color: var(--ck-dim);
}

.share__url-actions {
  display: flex;
  margin-top: 10px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.share__url-cta {
  flex: 1;
  padding: 12px 8px;
  text-align: center;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 0;
}

.share__url-cta:first-child {
  border-left: none;
}

.share__url-cta--ink {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.share__form {
  padding: 14px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share__field {
  display: block;
}

.share__input {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-bg);
  font-family: var(--ck-font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
  text-transform: uppercase;
  border-radius: 0;
  color: var(--ck-ink);
}

.share__input:focus {
  outline: none;
  border-color: var(--ck-signal);
}

.share__privacy {
  padding: 12px 22px;
  background: var(--ck-bg);
  font-family: var(--ck-font-mono);
  font-size: 9px;
  color: var(--ck-dim);
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  line-height: 1.6;
}

.share__grid {
  display: flex;
  flex-direction: column;
}

.share__right {
  display: flex;
  flex-direction: column;
}

@media (min-width: 960px) {
  .share__grid {
    display: grid;
    grid-template-columns: 420px 1fr;
  }
  .share__qr {
    border-right: 1.5px solid var(--ck-ink);
    border-bottom: none;
    /* Anchor QR + meta to the top of the left column so the right column
     * (taller — url-box + form) doesn't stretch the QR-box. */
    justify-content: flex-start;
  }
  .share__right .share__url,
  .share__right .share__form {
    border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  }
}
</style>
