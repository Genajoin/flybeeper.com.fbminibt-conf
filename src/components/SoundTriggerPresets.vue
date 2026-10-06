<script setup lang="ts">
import { StorageSerializers } from '@vueuse/core'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'
import type { TriggerPresetKey, TriggerValues } from '~/utils/trigger-presets'
import { recordAction } from '~/utils/sessionJournal'
import { SOUND_HOLDS_FW } from '~/composables/useSoundLogic'
import {
  TRIGGER_PRESETS,
  TRIGGER_PRESET_KEYS,
  TRIGGER_UUIDS,
  matchTriggerPreset,
} from '~/utils/trigger-presets'

/**
 * Presets for when the vario sounds near zero: thresholds, holds, early exit
 * and averaging in one click. The curves (how it sounds) are left alone.
 * The active one is derived from the device's values, CUSTOM otherwise.
 * Leaving CUSTOM for a preset stashes the pilot's own values (per browser),
 * and the CUSTOM button puts them back.
 */
const props = defineProps<{
  chars: BleCharacteristic[]
}>()

const { t } = useI18n()
const logic = useSoundLogic()

function charFor(field: keyof TriggerValues) {
  return props.chars.find(c => c.characteristic.uuid === TRIGGER_UUIDS[field])
}

const current = computed<Partial<TriggerValues>>(() => {
  const out: Partial<TriggerValues> = {}
  for (const f of Object.keys(TRIGGER_UUIDS) as (keyof TriggerValues)[]) {
    const v = charFor(f)?.formattedValue
    if (typeof v === 'number')
      out[f] = v
  }
  return out
})

const active = computed(() => matchTriggerPreset(current.value))
// A saved profile matching the values lights the profile picker, not "Свой".
const profiles = useSoundProfiles()
const profile = computed(() => (active.value ? null : profiles.active('trigger')))
const own = computed(() => !active.value && !profile.value)

const customSnapshot = useLocalStorage<Partial<TriggerValues> | null>('trigger-custom', null, { serializer: StorageSerializers.object })

function write(values: Partial<TriggerValues>) {
  for (const f of Object.keys(values) as (keyof TriggerValues)[]) {
    const ch = charFor(f)
    const v = values[f]
    if (ch && typeof v === 'number')
      ch.formattedValue = v
  }
}

function stashCustom() {
  if (own.value && Object.keys(current.value).length)
    customSnapshot.value = { ...current.value }
}

function apply(k: TriggerPresetKey) {
  recordAction('settings', `trigger preset: ${k}`)
  stashCustom()
  write(TRIGGER_PRESETS[k])
}

function applyCustom() {
  // Already on own values, or nothing stashed yet.
  if (own.value || !customSnapshot.value)
    return
  recordAction('settings', 'trigger preset: custom')
  write(customSnapshot.value)
}

// Description of the hovered preset, else of the active one.
const hovered = ref<TriggerPresetKey | null>(null)
const shown = computed(() => hovered.value ?? active.value)

function fmt(v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`
}

const summary = computed(() => {
  if (!shown.value)
    return null
  const p = TRIGGER_PRESETS[shown.value]
  return t('trig.summary', {
    co: fmt(p.climbOn),
    cf: p.climbOff < p.climbOn ? fmt(p.climbOff) : '—',
    so: fmt(p.sinkOn),
    sf: p.sinkOff > p.sinkOn ? fmt(p.sinkOff) : '—',
    h: p.hyst > 0 ? p.hyst.toFixed(2) : t('trig.off'),
    avg: p.average.toFixed(1),
  })
})
</script>

<template>
  <div class="trig">
    <p v-if="logic.legacy.value" class="trig__fw">
      {{ t('trig.old-fw', { fw: logic.current.value, need: SOUND_HOLDS_FW }) }}
      <RouterLink :to="logic.updatePath.value" class="trig__fw-link">
        {{ t('trig.old-fw-update') }}
      </RouterLink>
    </p>
    <div class="trig__grid" role="radiogroup" :aria-label="t('trig.title')">
      <button
        v-for="k in TRIGGER_PRESET_KEYS"
        :key="k"
        type="button"
        role="radio"
        class="trig__btn"
        :class="{ 'trig__btn--active': active === k }"
        :aria-checked="active === k"
        @click="apply(k)"
        @mouseenter="hovered = k"
        @mouseleave="hovered = null"
        @focus="hovered = k"
        @blur="hovered = null"
      >
        {{ t(`trig.${k}`) }}
      </button>
      <button
        type="button"
        role="radio"
        class="trig__btn"
        :class="{ 'trig__btn--active': own }"
        :aria-checked="own"
        :disabled="!own && !customSnapshot"
        @click="applyCustom"
      >
        {{ t('trig.custom') }}
      </button>
      <SoundProfileMenu class="trig__profiles" scope="trigger" :preset-active="!!active" @before-apply="stashCustom" />
    </div>
    <div v-if="shown" class="trig__desc">
      <p>{{ t(`trig.${shown}-body`) }}</p>
      <p class="trig__nums">
        {{ summary }}
      </p>
    </div>
    <p v-else-if="profile" class="trig__desc">
      {{ t('prof.trigger-body', { name: profile.name }) }}
    </p>
    <p v-else class="trig__desc">
      {{ t('trig.custom-body') }}
    </p>
  </div>
</template>

<style scoped>
.trig {
  margin-top: 10px;
}

.trig__fw {
  margin: 0 0 10px;
  padding: 6px 8px;
  border-left: 3px solid var(--ck-signal);
  background: var(--ck-bg);
  font-family: var(--ck-font-body);
  font-size: 12px;
  line-height: 1.4;
}

.trig__fw-link {
  color: var(--ck-signal);
  font-weight: 700;
  white-space: nowrap;
}

.trig__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
}

.trig__btn {
  padding: 10px 6px;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-align: center;
  cursor: pointer;
  border-radius: 0;
}

.trig__profiles {
  grid-column: 1 / -1;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.trig__profiles :deep(.prof__toggle) {
  border: none;
  padding: 10px 6px;
}

.trig__btn:disabled {
  cursor: default;
  color: var(--ck-dim);
}

.trig__btn--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.trig__desc {
  margin: 10px 0 0;
  font-family: var(--ck-font-body);
  font-size: 13px;
  line-height: 1.4;
  color: var(--ck-ink);
}

.trig__desc p {
  margin: 0;
}

.trig__nums {
  margin-top: 6px !important;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
  font-variant-numeric: tabular-nums;
}
</style>
