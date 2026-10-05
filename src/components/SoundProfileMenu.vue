<script setup lang="ts">
import type { ProfileScope, SoundProfile } from '~/utils/sound-profiles'
import { recordAction } from '~/utils/sessionJournal'
import { pickScope, profileToJson, profilesFromJson, profilesToJson } from '~/utils/sound-profiles'
import { presetNameFromFilename } from '~/utils/preset-import'

/**
 * "My profiles" picker for one part of the sound: the curves, or when it
 * sounds. Lists the saved profiles that carry that part, applies a profile's
 * part with one click, saves the current values under a name, and keeps the
 * list exportable — it lives in this browser only.
 */
const props = defineProps<{
  scope: ProfileScope
  /** A built-in preset already matches: that one is lit, not the profile. */
  presetActive?: boolean
}>()

const emit = defineEmits<{
  /** Fired right before a profile is written, so the page can stash the pilot's unsaved values. */
  (e: 'beforeApply'): void
}>()

const { t, locale } = useI18n()
const settings = useSettingsStore()
const profiles = useSoundProfiles()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => {
  open.value = false
})

const items = computed(() => profiles.inScope(props.scope))
const active = computed(() => (props.presetActive ? null : profiles.active(props.scope)))
const current = computed(() => pickScope(settings.local, props.scope))

function pick(p: SoundProfile) {
  if (active.value?.id === p.id)
    return
  recordAction('settings', `profile (${props.scope}): ${p.name}`)
  emit('beforeApply')
  profiles.apply(p, props.scope)
  open.value = false
}

const newName = ref('')
function saveCurrent() {
  if (!current.value)
    return
  const p = profiles.save(newName.value || t('prof.default-name'), current.value)
  recordAction('settings', `profile (${props.scope}) saved: ${p.name}`)
  newName.value = ''
}

const editing = ref<string | null>(null)
const confirmDelete = ref<string | null>(null)
const editName = ref('')
function startRename(p: SoundProfile) {
  editing.value = p.id
  editName.value = p.name
  confirmDelete.value = null
}
function commitRename() {
  if (editing.value && editName.value.trim())
    profiles.rename(editing.value, editName.value)
  editing.value = null
}

function del(p: SoundProfile) {
  if (confirmDelete.value !== p.id) {
    confirmDelete.value = p.id
    return
  }
  profiles.remove(p.id)
  confirmDelete.value = null
}

function download(text: string, filename: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function fileSafe(name: string): string {
  return name.trim().replace(/[\s/\\:*?"<>|]+/g, '-') || 'profile'
}

function downloadOne(p: SoundProfile) {
  download(profileToJson(p), `${fileSafe(p.name)}.json`)
}

function downloadAll() {
  download(profilesToJson(profiles.list.value), 'flybeeper-profiles.json')
}

const fileInput = ref<HTMLInputElement | null>(null)
const importMsg = ref('')
async function onPickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file)
    return
  let text = ''
  try {
    text = await file.text()
  }
  catch {}
  const found = profilesFromJson(text, presetNameFromFilename(file.name))
  for (const f of found)
    profiles.save(f.name, f.settings, f.savedAt)
  importMsg.value = found.length ? t('prof.imported', { n: found.length }) : t('preset.import-error')
}

watch(open, (v) => {
  if (!v) {
    editing.value = null
    confirmDelete.value = null
    importMsg.value = ''
  }
})
</script>

<template>
  <div ref="root" class="prof">
    <button
      type="button"
      class="prof__toggle"
      :class="{ 'prof__toggle--active': active }"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="prof__toggle-label">{{ active ? active.name : t('prof.mine') }}</span>
      <span v-if="!active && items.length" class="prof__count">{{ items.length }}</span>
      <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>

    <div v-if="open" class="prof__panel">
      <ul v-if="items.length" class="prof__list">
        <li v-for="p in items" :key="p.id" class="prof__row" :class="{ 'prof__row--active': active?.id === p.id }">
          <form v-if="editing === p.id" class="prof__rename" @submit.prevent="commitRename">
            <input v-model="editName" class="prof__input" type="text" maxlength="40" :aria-label="t('prof.rename')" @keydown.esc="editing = null">
            <button type="submit" class="prof__icon" :title="t('prof.rename')">
              ✓
            </button>
          </form>
          <template v-else>
            <button type="button" class="prof__name" @click="pick(p)">
              <span>{{ p.name }}</span>
              <span class="prof__date">{{ new Date(p.savedAt).toLocaleDateString(locale) }}</span>
            </button>
            <button type="button" class="prof__icon" :title="t('prof.download')" @click="downloadOne(p)">
              ⤓
            </button>
            <button type="button" class="prof__icon" :title="t('prof.rename')" @click="startRename(p)">
              ✎
            </button>
            <button
              type="button"
              class="prof__icon"
              :class="{ 'prof__icon--danger': confirmDelete === p.id }"
              :title="confirmDelete === p.id ? t('prof.delete-confirm') : t('prof.delete')"
              @click="del(p)"
            >
              {{ confirmDelete === p.id ? t('prof.delete-confirm') : '✕' }}
            </button>
          </template>
        </li>
      </ul>
      <p v-else class="prof__empty">
        {{ t(`prof.empty-${scope}`) }}
      </p>

      <form class="prof__save" @submit.prevent="saveCurrent">
        <input
          v-model="newName"
          class="prof__input"
          type="text"
          maxlength="40"
          :placeholder="t('prof.name-placeholder')"
          :aria-label="t('prof.name-placeholder')"
        >
        <button type="submit" class="prof__btn" :disabled="!current">
          {{ t(`prof.save-${scope}`) }}
        </button>
      </form>

      <div class="prof__files">
        <button type="button" class="prof__btn prof__btn--quiet" :disabled="!profiles.list.value.length" @click="downloadAll">
          {{ t('prof.download-all') }}
        </button>
        <button type="button" class="prof__btn prof__btn--quiet" @click="fileInput?.click()">
          {{ t('prof.upload') }}
        </button>
        <input ref="fileInput" class="prof__file" type="file" accept=".json,application/json" @change="onPickFile">
      </div>
      <p v-if="importMsg" class="prof__msg">
        {{ importMsg }}
      </p>

      <p class="prof__note">
        {{ t('prof.local-note') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.prof {
  position: relative;
}

.prof__toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 8px 10px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 0;
}

.prof__toggle-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.prof__toggle--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.prof__count {
  font-weight: 400;
  color: var(--ck-dim);
}

.prof__panel {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  right: 0;
  width: min(360px, calc(100vw - 32px));
  padding: 10px;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  box-shadow: 4px 4px 0 var(--ck-ink);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prof__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 260px;
  overflow-y: auto;
  border: var(--ck-stroke-hair) solid var(--ck-grid);
}

.prof__row {
  display: flex;
  align-items: stretch;
  border-bottom: var(--ck-stroke-hair) solid var(--ck-grid);
}

.prof__row:last-child {
  border-bottom: none;
}

.prof__row--active .prof__name {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.prof__name {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 8px;
  background: transparent;
  color: var(--ck-ink);
  border: none;
  font-family: var(--ck-font-body);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
}

.prof__name > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prof__name:hover {
  background: var(--ck-bg-deep);
}

.prof__date {
  flex-shrink: 0;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  opacity: 0.6;
}

.prof__icon {
  flex-shrink: 0;
  min-width: 32px;
  padding: 0 6px;
  background: transparent;
  color: var(--ck-ink);
  border: none;
  border-left: var(--ck-stroke-hair) solid var(--ck-grid);
  font-family: var(--ck-font-mono);
  font-size: 12px;
  cursor: pointer;
  border-radius: 0;
}

.prof__icon:hover {
  background: var(--ck-bg-deep);
}

.prof__icon--danger {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  font-size: 10px;
  text-transform: uppercase;
}

.prof__rename,
.prof__save {
  display: flex;
  flex: 1;
  gap: 0;
}

.prof__input {
  flex: 1;
  min-width: 0;
  padding: 7px 8px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-paper);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  font-size: 13px;
  border-radius: 0;
}

.prof__input:focus {
  outline: none;
  border-color: var(--ck-signal);
}

.prof__btn {
  padding: 7px 10px;
  background: var(--ck-ink);
  color: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-left: none;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 0;
  white-space: nowrap;
}

.prof__btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.prof__files {
  display: flex;
  gap: 6px;
}

.prof__btn--quiet {
  flex: 1;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
}

.prof__file {
  display: none;
}

.prof__empty,
.prof__msg,
.prof__note {
  margin: 0;
  font-family: var(--ck-font-body);
  font-size: 12px;
  line-height: 1.4;
}

.prof__empty {
  color: var(--ck-dim);
}

.prof__note {
  padding: 6px 8px;
  border-left: 3px solid var(--ck-signal);
  background: var(--ck-bg);
  color: var(--ck-ink);
}
</style>
