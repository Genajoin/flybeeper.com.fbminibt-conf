<script setup lang="ts">
import type { BleCharacteristic } from '~/utils/BleCharacteristic'
import type { TriggerPresetKey, TriggerValues } from '~/utils/trigger-presets'
import { recordAction } from '~/utils/sessionJournal'
import {
  TRIGGER_PRESETS,
  TRIGGER_PRESET_KEYS,
  TRIGGER_UUIDS,
  matchTriggerPreset,
  needsNewFirmware,
} from '~/utils/trigger-presets'

/**
 * Presets for when the vario sounds near zero: thresholds, holds, early exit
 * and averaging in one click. The curves (how it sounds) are left alone.
 * The active one is derived from the device's values, CUSTOM otherwise.
 */
const props = defineProps<{
  chars: BleCharacteristic[]
}>()

const { t } = useI18n()

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

function apply(k: TriggerPresetKey) {
  recordAction('settings', `trigger preset: ${k}`)
  const p = TRIGGER_PRESETS[k]
  for (const f of Object.keys(p) as (keyof TriggerValues)[]) {
    const ch = charFor(f)
    if (ch)
      ch.formattedValue = p[f]
  }
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
      <span class="trig__btn trig__btn--custom" :class="{ 'trig__btn--active': !active }">
        {{ t('trig.custom') }}
      </span>
    </div>
    <div v-if="shown" class="trig__desc">
      <p>{{ t(`trig.${shown}-body`) }}</p>
      <p class="trig__nums">
        {{ summary }}
      </p>
      <p v-if="needsNewFirmware(TRIGGER_PRESETS[shown])" class="trig__fw">
        {{ t('trig.fw') }}
      </p>
    </div>
    <p v-else class="trig__desc">
      {{ t('trig.custom-body') }}
    </p>
  </div>
</template>

<style scoped>
.trig {
  margin-top: 10px;
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

.trig__btn--custom {
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

.trig__fw {
  margin-top: 6px !important;
  padding-left: 8px;
  border-left: 2px solid var(--ck-signal);
}
</style>
