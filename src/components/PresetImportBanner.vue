<script setup lang="ts">
import { useSharedPresetStore } from '~/stores/shared-preset'
import { useSettingsStore } from '~/stores/settings'
import { requestDemo } from '~/composables/useThresholdLab'
import { pickScope } from '~/utils/sound-profiles'

const shared = useSharedPresetStore()
const settings = useSettingsStore()
const router = useRouter()
const route = useRoute()
const { t, te } = useI18n()

async function apply() {
  if (!shared.pending)
    return
  // Presets are always partial: a QR from /settings/audio carries only the
  // audio + curves group, and an old file dump has no climb-off / sink-off /
  // UART-duplication entries at all. Merging is what "apply a preset" means —
  // replacing the bag would reset every key the preset omits back to the
  // factory demo value.
  settings.mergeLocal(shared.pending.settings)
  const demo = shared.pending.demo
  shared.clear()
  // A link with `&demo` (e.g. from an article) wants to be heard: open the
  // Sound page and start the demo. The Apply click is the user gesture the
  // browser needs before it lets the page make sound.
  if (demo) {
    requestDemo()
    if (route.path !== '/settings/audio')
      await router.push('/settings/audio')
    return
  }
  // The QR-scan landing is /share, which is the *export* page — staying
  // there hides the change. Jump to the most visual settings page so the
  // user immediately sees what was applied (volume, thresholds, curves).
  // Skip the navigation if we're already inside /settings/* so we don't
  // bounce the user away from a panel they're already reading.
  if (!route.path.startsWith('/settings'))
    await router.push('/settings/audio')
}

// A link or file with a sound part can go straight into "My profiles",
// with or without applying it.
const profiles = useSoundProfiles()
const savedName = ref('')
watch(() => shared.pending, () => {
  savedName.value = ''
})
const savable = computed(() => {
  const s = shared.pending?.settings
  return Boolean(pickScope(s, 'curves') || pickScope(s, 'trigger'))
})
function saveToProfiles() {
  if (!shared.pending || savedName.value)
    return
  savedName.value = profiles.save(shared.pending.name || t('preset.import-default-name'), shared.pending.settings).name
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
/**
 * "Frequency ×5 · Duty ×2" — which curves the range repair touched. Presets
 * from the old configurator (and from a Mini, whose firmware never checked
 * the tone tables) carry values no current device accepts; `stage()` pulls
 * them to the nearest valid value and this line says what moved, so the
 * import is a repair the user can see rather than a silent rewrite.
 */
const adjustedDetail = computed(() => {
  const by = shared.pending?.adjustedByUuid
  if (!by)
    return ''
  return Object.entries(by)
    .map(([uuid, n]) => `${te(`sett.${uuid}`) ? t(`sett.${uuid}`) : uuid} ×${n}`)
    .join(' · ')
})

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
        <div v-if="shared.pending.demo" class="banner-row__sub">
          {{ t('preset.demo-hint') }}
        </div>
        <div v-if="shared.pending.adjusted" class="banner-row__note">
          {{ t('preset.adjusted-note', { count: shared.pending.adjusted, detail: adjustedDetail }) }}
        </div>
        <div class="banner-row__actions">
          <button class="banner-row__primary" type="button" @click="apply">
            {{ t('preset.apply') }}
          </button>
          <button v-if="savable" class="banner-row__secondary" type="button" :disabled="!!savedName" @click="saveToProfiles">
            {{ savedName ? t('prof.saved') : t('prof.save-import') }}
          </button>
          <button class="banner-row__secondary" type="button" @click="discard">
            {{ savedName ? t('prof.close') : t('preset.discard') }}
          </button>
        </div>
        <div v-if="savedName" class="banner-row__sub">
          {{ t('prof.saved-hint', { name: savedName }) }}
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

.banner-row__note {
  font-size: 11px;
  line-height: 1.4;
  margin-top: 6px;
  padding: 5px 7px;
  border-left: 3px solid var(--ck-signal);
  background: var(--ck-bg);
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

.banner-row__secondary:disabled {
  color: var(--ck-dim);
  cursor: default;
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
