<script setup lang="ts">
import type { BleCharacteristic } from '~/utils/BleCharacteristic'

/**
 * Shared volume segmented control + climb/sink threshold editors.
 *
 * Hosted by the combined Sound page (/settings/audio); kept as a standalone
 * component so future split layouts can mount it elsewhere without dragging
 * the curve editor + simulator along.
 */
const props = defineProps<{
  chars: BleCharacteristic[]
}>()

const { t, te } = useI18n()

const VOLUME_UUID = '67f82d94-2b2a-4123-81c9-058e460c3d01'

const volumeChar = computed(() => props.chars.find(c => c.characteristic.uuid === VOLUME_UUID))
const otherChars = computed(() => props.chars.filter(c => c.characteristic.uuid !== VOLUME_UUID))
function labelFor(ch: BleCharacteristic): string {
  const k = `sett.${ch.characteristic.uuid}`
  if (te(k))
    return t(k)
  return ch.userFormatDescriptor || ch.characteristic.uuid
}

const helpOpen = ref<Record<string, boolean>>({})
function helpFor(ch: BleCharacteristic): string | null {
  const k = `help.${ch.characteristic.uuid}`
  return te(k) ? t(k) : null
}

const volumeValue = computed<number>(() => {
  const v = volumeChar.value?.formattedValue
  return typeof v === 'number' ? v : 0
})

function setVolume(v: number) {
  if (volumeChar.value)
    volumeChar.value.formattedValue = v
}
</script>

<template>
  <div class="vt">
    <div v-if="volumeChar" class="vt__block">
      <CkEyebrow block>
        {{ t('sett.buzz-vol') }}
      </CkEyebrow>
      <div class="vt__seg">
        <button
          v-for="v in 4"
          :key="v"
          type="button"
          class="vt__btn"
          :class="{ 'vt__btn--active': volumeValue === v - 1 }"
          @click="setVolume(v - 1)"
        >
          {{ v - 1 === 0 ? '✕' : v - 1 }}
        </button>
      </div>
    </div>

    <div v-if="otherChars.length" class="vt__block">
      <CkEyebrow block>
        {{ t('trig.title') }}
      </CkEyebrow>
      <SoundTriggerPresets :chars="otherChars" />
    </div>

    <div v-if="otherChars.length" class="vt__block">
      <CkEyebrow block>
        {{ t('sett.group-audio') }}
      </CkEyebrow>
      <div class="vt__list">
        <template v-for="ch in otherChars" :key="ch.characteristic.uuid">
          <template v-if="typeof ch.formattedValue === 'boolean'">
            <CkSquareToggle
              :model-value="Boolean(ch.formattedValue)"
              :aria-label="labelFor(ch)"
              class="vt__toggle"
              @update:model-value="ch.formattedValue = $event"
            />
            <span class="vt__toggle-label">
              {{ labelFor(ch) }}<SettingHelpButton
                v-if="helpFor(ch)"
                v-model="helpOpen[ch.characteristic.uuid]"
                :text="helpFor(ch)!"
              />
            </span>
            <p v-if="helpOpen[ch.characteristic.uuid]" class="vt__help">
              {{ helpFor(ch) }}
            </p>
          </template>
          <TheSetting v-else :cha="ch" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vt {
  display: flex;
  flex-direction: column;
}

.vt__block {
  padding: 18px 22px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.vt__block:last-child {
  border-bottom: none;
}

.vt__seg {
  display: flex;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  margin-top: 10px;
}

.vt__btn {
  flex: 1;
  padding: 16px 0;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 18px;
  cursor: pointer;
  border-radius: 0;
}

.vt__btn:first-child {
  border-left: none;
}

.vt__btn--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.vt__list {
  /* Shared 2-column grid for TheSetting rows AND toggle rows so the
   * value/label seam aligns regardless of widget type. Left-aligned on
   * mobile (the audio block already sits in a narrow column on desktop
   * too, so no auto-centring). */
  display: grid;
  grid-template-columns: max-content max-content;
  align-items: center;
  justify-content: start;
  column-gap: 16px;
  row-gap: 14px;
  margin-top: 12px;
}

/* Hug the seam so a 28px toggle and a 10ch input share the same right
 * edge in col 1. */
.vt__toggle {
  justify-self: end;
}

.vt__help {
  contain: inline-size;
  grid-column: 1 / -1;
  margin: -6px 0 4px;
  padding: 8px 10px;
  border-left: 2px solid var(--ck-signal);
  font-family: var(--ck-font-body);
  font-size: 13px;
  line-height: 1.4;
  color: var(--ck-ink);
}

.vt__toggle-label {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  color: var(--ck-ink);
}
</style>
