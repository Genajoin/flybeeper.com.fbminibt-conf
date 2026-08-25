<script setup lang="ts">
import { useSharedPresetStore } from '~/stores/shared-preset'
import { useSettingsStore } from '~/stores/settings'

const shared = useSharedPresetStore()
const settings = useSettingsStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

async function apply() {
  if (!shared.pending)
    return
  // Presets are always partial: a QR from /settings/audio carries only the
  // audio + curves group, and an old file dump has no climb-off / sink-off /
  // UART-duplication entries at all. Merging is what "apply a preset" means —
  // replacing the bag would reset every key the preset omits back to the
  // factory demo value.
  settings.mergeLocal(shared.pending.settings)
  shared.clear()
  // The QR-scan landing is /share, which is the *export* page — staying
  // there hides the change. Jump to the most visual settings page so the
  // user immediately sees what was applied (volume, thresholds, curves).
  // Skip the navigation if we're already inside /settings/* so we don't
  // bounce the user away from a panel they're already reading.
  if (!route.path.startsWith('/settings'))
    await router.push('/settings/audio')
}

function discard() {
  shared.clear()
}

const fieldCount = computed(() => Object.keys(shared.pending?.settings ?? {}).length)

/**
 * "via URL fragment" / "via JSON file · <shape>" — the shape matters when
 * an old file imports: it tells the user whether the legacy cm/s → m/s
 * conversion was applied.
 */
const sourceLabel = computed(() => {
  const p = shared.pending
  if (!p || p.source !== 'file')
    return t('preset.via-url')
  const fmt = p.format ? t(`preset.format-${p.format}`) : ''
  return fmt ? `${t('preset.via-file')} · ${fmt}` : t('preset.via-file')
})
</script>

<template>
  <Transition name="preset-imp">
    <div v-if="shared.pending" class="banner-row">
      <div class="banner-row__stripe" />
      <div class="banner-row__body">
        <CkEyebrow color="var(--ck-signal)">
          {{ t('preset.import-eyebrow') }}
        </CkEyebrow>
        <div class="banner-row__title">
          {{ shared.pending.name || t('preset.import-default-name') }}
        </div>
        <div class="banner-row__sub">
          {{ fieldCount }} {{ t('preset.fields') }} · {{ shared.pending.bytes }} {{ t('preset.bytes') }} · {{ sourceLabel }}
          <template v-if="shared.pending.skipped">
            · {{ shared.pending.skipped }} {{ t('preset.skipped') }}
          </template>
        </div>
        <div class="banner-row__actions">
          <button class="banner-row__primary" type="button" @click="apply">
            {{ t('preset.apply') }}
          </button>
          <button class="banner-row__secondary" type="button" @click="discard">
            {{ t('preset.discard') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.banner-row {
  display: flex;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-left: none;
  border-right: none;
  font-family: var(--ck-font-body);
}

.banner-row__stripe {
  width: 8px;
  background: var(--ck-signal);
  flex-shrink: 0;
}

.banner-row__body {
  flex: 1;
  padding: 12px 14px;
}

.banner-row__title {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 16px;
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
}

.banner-row__sub {
  font-size: 11px;
  color: var(--ck-dim);
  margin-top: 3px;
  line-height: 1.4;
}

.banner-row__actions {
  display: flex;
  margin-top: 9px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  width: max-content;
}

.banner-row__primary,
.banner-row__secondary {
  padding: 6px 11px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  border: none;
  background: var(--ck-paper);
  color: var(--ck-ink);
  cursor: pointer;
  border-radius: 0;
}

.banner-row__primary {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.banner-row__secondary {
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
}

.preset-imp-enter-active,
.preset-imp-leave-active {
  transition: opacity var(--ck-dur-panel) var(--ck-ease);
}

.preset-imp-enter-from,
.preset-imp-leave-to {
  opacity: 0;
}
</style>
