<script setup lang="ts">
/**
 * Second header line on settings panels. Compact, page-header-height
 * bar with a quiet 'SHARE' chip on the right; when the user has unsaved
 * local changes, a contextual hint slides in immediately to the left of
 * SHARE drawing attention to the action. Click expands an inline panel
 * with QR + URL + copy/download under the bar so the user never leaves
 * the settings page.
 *
 * Anchored to current pathname, so a code generated from /settings/audio
 * carries that path — the recipient lands on the same panel.
 */
import { SETTINGS_GROUP_NAV, type SettingsGroupKey } from '~/composables/useSettingsGroups'

const route = useRoute()
const settings = useSettingsStore()
const { t } = useI18n()

/**
 * Scope the share payload to the groups that the current /settings/<x>
 * page covers. /settings/audio bundles 'audio' + 'curves'; the rest 1:1.
 * Smaller payload → lower-density QR → better camera recognition.
 */
const activeGroups = computed<SettingsGroupKey[] | null>(() => {
  const p = route.path || ''
  const match = SETTINGS_GROUP_NAV.filter(g => g.route === p).map(g => g.key)
  return match.length ? match : null
})

const expanded = ref(false)
// Auto-collapse the QR panel when the user navigates between settings
// tabs so it doesn't stay open with a stale (other-group) payload.
watch(() => route.path, () => {
  expanded.value = false
})
const sharePreset = useSharePreset(activeGroups)
const { url, byteSize, fieldCount, qrSvg, copyUrl, downloadJson, presetName } = sharePreset

const hasChanges = computed(() => settings.hasUnsyncedChanges)

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
  <section v-if="activeGroups" class="share-strip">
    <button
      type="button"
      class="share-strip__bar"
      :aria-expanded="expanded"
      aria-controls="share-strip-body"
      @click="toggle"
    >
      <Transition name="share-hint">
        <span v-if="hasChanges && !expanded" class="share-strip__hint">
          {{ t('preset.share-strip-sub') }} <span class="share-strip__hint-arrow">→</span>
        </span>
      </Transition>
      <span class="share-strip__cta">{{ t('dashboard.share') }}</span>
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
}

.share-strip__bar {
  /* Match PageHeader strip height (10px + 11px font ≈ 36px) so the bar
   * reads as a second line of the same chrome, not a free-floating
   * banner. Right-aligned content; hint slides in next to SHARE when
   * there's something worth sharing. */
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
  min-height: 36px;
  padding: 0 22px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  text-align: right;
  border: none;
  cursor: pointer;
  font-family: var(--ck-font-mono);
  border-radius: 0;
}

.share-strip__bar:hover {
  background: var(--ck-bg-deep);
}

.share-strip__bar:hover .share-strip__cta {
  text-decoration: underline;
}

.share-strip__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: 0.5px;
  color: var(--ck-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.share-strip__hint-arrow {
  color: var(--ck-signal);
  font-weight: 700;
}

.share-strip__cta {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-signal);
  white-space: nowrap;
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

.share-hint-enter-active,
.share-hint-leave-active {
  transition:
    opacity var(--ck-dur-panel) var(--ck-ease),
    transform var(--ck-dur-panel) var(--ck-ease);
}

.share-hint-enter-from,
.share-hint-leave-to {
  opacity: 0;
  transform: translateX(8px);
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
    padding: 0 28px;
  }
  .share-strip__body {
    padding: 22px 28px 26px;
  }
}
</style>
