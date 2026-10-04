<script setup lang="ts">
import type { LabPreset } from '~/composables/useThresholdLab'
import type { ThresholdParams, ZoneKind } from '~/utils/threshold-model'
import { STUCK_AFTER_S } from '~/composables/useThresholdLab'
import { effectiveThresholds } from '~/utils/threshold-model'

/**
 * Threshold lab panel (emulator only): ClimbOn/Off, SinkOn/Off and the trend
 * hysteresis, presets to compare against, the live sound
 * state with its reason, and the zone legend. Nothing here reaches the device.
 */
const { t } = useI18n()
const lab = useThresholdLab()
const { source } = useAudioSource()

function ms(cmS: number): string {
  const v = cmS / 100
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`
}

const presetOptions = computed(() => [
  { label: t('lab.preset-flybeeper'), value: 'flybeeper' as LabPreset },
  { label: t('lab.preset-xctracer'), value: 'xctracer' as LabPreset },
  { label: t('lab.preset-hugo'), value: 'hugo' as LabPreset },
  { label: t('lab.preset-custom'), value: 'custom' as LabPreset },
])

const FIELDS: { key: keyof ThresholdParams, label: string, hint: string }[] = [
  { key: 'climbOn', label: 'lab.field-climb-on', hint: 'lab.hint-climb-on' },
  { key: 'climbOff', label: 'lab.field-climb-off', hint: 'lab.hint-climb-off' },
  { key: 'sinkOn', label: 'lab.field-sink-on', hint: 'lab.hint-sink-on' },
  { key: 'sinkOff', label: 'lab.field-sink-off', hint: 'lab.hint-sink-off' },
  { key: 'hyst', label: 'lab.field-hyst', hint: 'lab.hint-hyst' },
]

function onField(key: keyof ThresholdParams, evt: Event) {
  const v = Number.parseFloat((evt.target as HTMLInputElement).value.replace(',', '.'))
  if (Number.isFinite(v))
    lab.setParam(key, v * 100)
  else
    (evt.target as HTMLInputElement).value = (lab.params.value[key] / 100).toFixed(2)
}

const live = lab.live

const reasonText = computed(() => {
  const p = lab.params.value
  const eff = effectiveThresholds(p, lab.weakening.value)
  const th = live.reason === 'climb-hold' ? eff.climbOffEff : eff.climbOnEff
  return t(`lab.r-${live.reason}`, {
    th: ms(th),
    co: ms(p.climbOn),
    cf: ms(p.climbOff),
    so: ms(p.sinkOn),
    sf: ms(p.sinkOff),
    early: ms(p.climbOn + p.hyst),
  })
})

const trendText = computed(() => {
  if (lab.weakening.value)
    return t('lab.trend-weak')
  const d = live.varioCm - lab.emaCm.value
  if (Math.abs(d) < 3)
    return t('lab.trend-flat')
  return t(d > 0 ? 'lab.trend-up' : 'lab.trend-down')
})

const stuck = computed(() => live.stuckS >= STUCK_AFTER_S)

const zoneKinds = computed<ZoneKind[]>(() => lab.zones.value.map(z => z.kind))
</script>

<template>
  <section class="lab">
    <CkEyebrow block>
      {{ t('lab.title') }}
    </CkEyebrow>

    <CkSegmentedControl
      class="lab__presets"
      :model-value="lab.preset.value"
      :options="presetOptions"
      :aria-label="t('lab.title')"
      @update:model-value="lab.selectPreset"
    />
    <p class="lab__badge" :class="{ 'lab__badge--local': !lab.linked.value }">
      {{ lab.linked.value ? t('lab.badge-linked') : t('lab.badge-local') }}
    </p>
    <p v-if="source === 'device' && !lab.linked.value" class="lab__warn">
      {{ t('lab.device-note') }}
    </p>

    <div class="lab__fields">
      <label v-for="f in FIELDS" :key="f.key" class="lab__field">
        <span class="lab__field-label">{{ t(f.label) }}</span>
        <span class="lab__field-row">
          <input
            class="lab__input"
            type="number"
            inputmode="decimal"
            step="0.05"
            :min="f.key === 'hyst' ? 0 : undefined"
            :value="(lab.params.value[f.key] / 100).toFixed(2)"
            @change="onField(f.key, $event)"
          >
          <span class="lab__unit">m/s</span>
        </span>
        <span class="lab__hint">{{ t(f.hint) }}</span>
      </label>
    </div>

    <div class="lab__status" :class="{ 'lab__status--on': live.toneOn }" aria-live="polite">
      <div class="lab__status-head">
        <span class="lab__state">{{ live.toneOn ? t('lab.on') : t('lab.off') }}</span>
        <span class="lab__vario">{{ ms(live.varioCm) }} m/s</span>
      </div>
      <p class="lab__reason">
        {{ reasonText }}
      </p>
      <p class="lab__ema">
        {{ t('lab.ema', { ema: ms(lab.emaCm.value) }) }} · {{ trendText }}
      </p>
    </div>
    <LabHistory />
    <p v-if="stuck" class="lab__warn lab__warn--stuck">
      {{ t('lab.stuck', { s: live.stuckS, so: ms(lab.params.value.sinkOn), sf: ms(lab.params.value.sinkOff) }) }}
    </p>

    <details class="lab__zones" open>
      <summary>{{ t('lab.zones') }}</summary>
      <LabZoneText v-for="k in zoneKinds" :key="k" :kind="k" class="lab__zone" />
    </details>
  </section>
</template>

<style scoped>
.lab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 22px;
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
}

.lab__presets {
  display: flex;
}

.lab__badge,
.lab__warn {
  margin: 0;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  letter-spacing: 0.3px;
  color: var(--ck-dim);
}

.lab__badge--local {
  color: var(--ck-signal);
  font-weight: 700;
}

.lab__warn {
  padding: 8px 10px;
  border: var(--ck-stroke-rule) solid var(--ck-signal);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  font-size: 13px;
}

.lab__warn--stuck {
  border-color: #e30613;
}

.lab__fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.lab__field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.lab__field-label {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lab__field-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.lab__input {
  width: 11ch;
  padding: 4px 6px;
  font-family: var(--ck-font-mono);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: 0;
}

.lab__unit,
.lab__hint {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
}

.lab__status {
  padding: 10px 12px;
  border: var(--ck-stroke-rule) solid var(--ck-grid);
}

.lab__status--on {
  border-color: #e30613;
}

.lab__status-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.lab__state {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 18px;
  color: var(--ck-dim);
}

.lab__status--on .lab__state {
  color: #e30613;
}

.lab__vario {
  font-family: var(--ck-font-mono);
  font-variant-numeric: tabular-nums;
}

.lab__reason,
.lab__ema {
  margin: 4px 0 0;
  font-family: var(--ck-font-body);
  font-size: 13px;
}

.lab__ema {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
}

.lab__zones summary {
  cursor: pointer;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.lab__zone {
  margin-top: 10px;
}
</style>
