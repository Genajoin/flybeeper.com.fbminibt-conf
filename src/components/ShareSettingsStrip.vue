<script setup lang="ts">
/**
 * Inline accordion for sharing the current local settings as a QR /
 * URL / JSON. Mounts as a second header line on /settings/* (NOT on
 * /share — the standalone page exists as a fallback for hand-typed
 * URLs and direct links). Click the strip to expand the QR + actions
 * underneath without leaving the panel the user is reading.
 *
 * The QR URL is anchored to the **current pathname** (see
 * useSharePreset.baseUrl), so a code generated from /settings/audio
 * carries that path — the scanner lands on the same view.
 */
import { SETTINGS_GROUP_NAV, type SettingsGroupKey } from '~/composables/useSettingsGroups'

const route = useRoute()
const { t } = useI18n()

const visible = computed(() => {
  const p = route.path || ''
  return p.startsWith('/settings') && p !== '/share'
})

/**
 * Scope the share payload to the groups that the current /settings/<x>
 * page covers. /settings/audio bundles 'audio' + 'curves' (curves was
 * folded into the sound page); other groups are 1:1.
 */
const activeGroups = computed<SettingsGroupKey[] | null>(() => {
  const p = route.path || ''
  const match = SETTINGS_GROUP_NAV.filter(g => g.route === p).map(g => g.key)
  return match.length ? match : null
})

const expanded = ref(false)
const sharePreset = useSharePreset(activeGroups)
const { url, byteSize, fieldCount, qrSvg, copyUrl, downloadJson, presetName } = sharePreset

function toggle() {
  expanded.value = !expanded.value
}

const urlHead = computed(() => {
  const idx = url.value.indexOf('#preset=')
  return idx >= 0 ? url.value.slice(0, idx + 8) : url.value
})

const urlTail = computed(() => {
  const idx = url.value.indexOf('#preset=')
  const tail = idx >= 0 ? url.value.slice(idx + 8) : ''
  return tail.length > 120 ? `${tail.slice(0, 120)}…` : tail
})
</script>

<template>
  <section v-if="visible" class="share-strip">
    <button
      type="button"
      class="share-strip__bar"
      :aria-expanded="expanded"
      aria-controls="share-strip-body"
      @click="toggle"
    >
      <span class="share-strip__icon" aria-hidden="true">
        <Icon name="share" :size="20" />
      </span>
      <span class="share-strip__copy">
        <span class="share-strip__eyebrow">{{ t('preset.share-strip-eyebrow') }}</span>
        <span class="share-strip__cta">{{ t('preset.share-strip-cta') }}</span>
        <span class="share-strip__sub">{{ t('preset.share-strip-sub') }}</span>
      </span>
      <span class="share-strip__chev" :class="{ 'share-strip__chev--open': expanded }" aria-hidden="true">▾</span>
    </button>

    <Transition name="share-strip-body">
      <div v-if="expanded" id="share-strip-body" class="share-strip__body">
        <div class="share-strip__qr-wrap">
          <div class="share-strip__qr" v-html="qrSvg" />
          <div class="share-strip__qr-meta">
            <CkEyebrow>{{ t('preset.scan-eyebrow') }}</CkEyebrow>
            <div class="share-strip__qr-name">
              {{ presetName || t('preset.import-default-name') }}
            </div>
            <div class="share-strip__qr-stats">
              <div>{{ fieldCount }} {{ t('preset.fields') }}</div>
              <div class="share-strip__qr-signal">
                {{ byteSize }} {{ t('preset.bytes') }}
              </div>
            </div>
          </div>
        </div>

        <label class="share-strip__field">
          <CkEyebrow>{{ t('preset.preset-name') }}</CkEyebrow>
          <input
            v-model="presetName"
            class="share-strip__input"
            type="text"
            :placeholder="t('preset.import-default-name')"
          >
        </label>

        <div class="share-strip__url">
          <CkEyebrow block>
            {{ t('preset.url-eyebrow') }}
          </CkEyebrow>
          <div class="share-strip__url-box">
            <span class="share-strip__url-head">{{ urlHead }}</span><span>{{ urlTail }}</span>
          </div>
        </div>

        <div class="share-strip__actions">
          <button class="share-strip__cta-btn share-strip__cta-btn--ink" type="button" @click="copyUrl()">
            {{ t('preset.copy-url') }}
          </button>
          <button class="share-strip__cta-btn" type="button" @click="downloadJson()">
            {{ t('preset.download-json') }}
          </button>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.share-strip {
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  border-left: 8px solid var(--ck-signal);
}

.share-strip__bar {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 14px;
  padding: 12px 22px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  text-align: left;
  border: none;
  cursor: pointer;
  font-family: var(--ck-font-body);
  border-radius: 0;
}

.share-strip__bar:hover {
  background: var(--ck-bg-deep);
}

.share-strip__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background: var(--ck-bg);
  color: var(--ck-signal);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.share-strip__copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
  flex: 1;
}

.share-strip__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.share-strip__cta {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.4px;
  text-transform: uppercase;
  margin-top: 2px;
}

.share-strip__sub {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: 0.5px;
  color: var(--ck-dim);
  margin-top: 3px;
}

.share-strip__chev {
  font-family: var(--ck-font-mono);
  font-size: 14px;
  color: var(--ck-dim);
  margin-left: auto;
  transition: transform var(--ck-dur-panel) var(--ck-ease);
}

.share-strip__chev--open {
  transform: rotate(180deg);
}

.share-strip__body {
  padding: 18px 22px 22px;
  background: var(--ck-bg);
  border-top: var(--ck-stroke-hair) solid var(--ck-grid);
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
}

.share-strip__qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.share-strip__qr {
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1 / 1;
  padding: 6px;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.share-strip__qr :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.share-strip__qr-meta {
  width: 100%;
  max-width: 420px;
}

.share-strip__qr-name {
  font-family: var(--ck-font-display);
  font-size: 19px;
  font-weight: 700;
  margin-top: 6px;
  line-height: 1.1;
  text-transform: uppercase;
}

.share-strip__qr-stats {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
  letter-spacing: 1px;
  margin-top: 6px;
  line-height: 1.6;
}

.share-strip__qr-signal {
  color: var(--ck-signal);
  margin-top: 4px;
}

.share-strip__field {
  display: block;
}

.share-strip__input {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-paper);
  font-family: var(--ck-font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
  text-transform: uppercase;
  border-radius: 0;
  color: var(--ck-ink);
}

.share-strip__input:focus {
  outline: none;
  border-color: var(--ck-signal);
}

.share-strip__url-box {
  padding: 10px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-paper);
  font-family: var(--ck-font-mono);
  font-size: 10px;
  line-height: 1.6;
  color: var(--ck-ink);
  word-break: break-all;
  max-height: 70px;
  overflow: hidden;
  margin-top: 8px;
}

.share-strip__url-head {
  color: var(--ck-dim);
}

.share-strip__actions {
  display: flex;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.share-strip__cta-btn {
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

.share-strip__cta-btn:first-child {
  border-left: none;
}

.share-strip__cta-btn--ink {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.share-strip-body-enter-active,
.share-strip-body-leave-active {
  transition:
    max-height var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
  max-height: 1200px;
}

.share-strip-body-enter-from,
.share-strip-body-leave-to {
  max-height: 0;
  opacity: 0;
}

@media (min-width: 720px) {
  .share-strip__bar {
    padding: 14px 28px;
    gap: 16px;
  }
  .share-strip__cta {
    font-size: 18px;
  }
  .share-strip__body {
    padding: 22px 28px 26px;
  }
}
</style>
