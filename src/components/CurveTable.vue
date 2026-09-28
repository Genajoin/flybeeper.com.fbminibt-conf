<script setup lang="ts">
import type { iVarioCurves } from '~/components/CurveEditor.vue'
import type { CurveColumn } from '~/utils/curve-units'
import { CURVE_LIMITS, VARIO_DOTS_UUID } from '~/utils/setting-limits'
import { CURVE_COLUMNS, cellRange, displayToRaw, parseDisplay, rawToDisplay } from '~/utils/curve-units'

/**
 * Numeric twin of CurveEditor. Same contract: mutates the curve arrays
 * in-place, emits thresholds in cm/s, so edits go through the page's
 * Apply / Discard exactly like a dragged point.
 */
const props = defineProps<{
  curves: iVarioCurves
  /** Start-of-climb and start-of-sink thresholds, in cm/s. */
  climbOn?: number
  sinkOn?: number
}>()

const emit = defineEmits<{
  (e: 'update:climbOn', valueCmS: number): void
  (e: 'update:sinkOn', valueCmS: number): void
}>()

const { t } = useI18n()

const VARIO = CURVE_LIMITS[VARIO_DOTS_UUID]
const rows = computed(() => props.curves.buzzer_vario_dots.map((_, i) => i))

function cellText(col: CurveColumn, i: number): string {
  return rawToDisplay(props.curves[col.field][i], col.scale, col.decimals)
}

function commitCell(col: CurveColumn, i: number, evt: Event) {
  const input = evt.target as HTMLInputElement
  const values = props.curves[col.field]
  const parsed = parseDisplay(input.value)
  if (parsed !== null) {
    const { lo, hi } = cellRange(col, values, i)
    const raw = displayToRaw(parsed, col.scale, lo, hi)
    if (raw !== values[i])
      values[i] = raw
  }
  // Always re-render: shows the repaired value, or restores on garbage.
  input.value = cellText(col, i)
}

function thresholdText(cmS: number | undefined): string {
  return typeof cmS === 'number' ? rawToDisplay(cmS, 100, 2) : ''
}

function commitThreshold(kind: 'climb' | 'sink', evt: Event) {
  const input = evt.target as HTMLInputElement
  const current = kind === 'climb' ? props.climbOn : props.sinkOn
  const parsed = parseDisplay(input.value)
  if (parsed !== null) {
    // Same single rule as the graph: sink-on ≤ climb-on.
    const lo = kind === 'climb' && typeof props.sinkOn === 'number' ? props.sinkOn : VARIO.min
    const hi = kind === 'sink' && typeof props.climbOn === 'number' ? props.climbOn : VARIO.max
    const raw = displayToRaw(parsed, 100, lo, hi)
    if (raw !== current) {
      if (kind === 'climb')
        emit('update:climbOn', raw)
      else
        emit('update:sinkOn', raw)
    }
    input.value = thresholdText(raw)
    return
  }
  input.value = thresholdText(current)
}

const HEADERS: Record<CurveColumn['field'], string> = {
  buzzer_vario_dots: 'VARIO',
  buzzer_frequency_dots: 'FREQ',
  buzzer_cycle_dots: 'CYCLE',
  buzzer_duty_dots: 'DUTY',
}
</script>

<template>
  <div class="ct">
    <table class="ct__table">
      <thead>
        <tr>
          <th class="ct__idx">
            #
          </th>
          <th v-for="col in CURVE_COLUMNS" :key="col.field">
            {{ HEADERS[col.field] }}<span class="ct__unit">{{ col.unit }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in rows" :key="i">
          <td class="ct__idx">
            {{ i + 1 }}
          </td>
          <td v-for="col in CURVE_COLUMNS" :key="col.field">
            <input
              class="ct__input"
              type="text"
              inputmode="decimal"
              :value="cellText(col, i)"
              :aria-label="`${HEADERS[col.field]} ${i + 1}, ${col.unit}`"
              @change="commitCell(col, i, $event)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            >
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="climbOn !== undefined || sinkOn !== undefined" class="ct__thr">
      <label v-if="climbOn !== undefined" class="ct__thr-item">
        <span>CLIMB-ON <span class="ct__unit">m/s</span></span>
        <input
          class="ct__input"
          type="text"
          inputmode="decimal"
          :value="thresholdText(climbOn)"
          @change="commitThreshold('climb', $event)"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        >
      </label>
      <label v-if="sinkOn !== undefined" class="ct__thr-item">
        <span>SINK-ON <span class="ct__unit">m/s</span></span>
        <input
          class="ct__input"
          type="text"
          inputmode="decimal"
          :value="thresholdText(sinkOn)"
          @change="commitThreshold('sink', $event)"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        >
      </label>
    </div>
    <p class="ct__hint">
      {{ t('sett.table-hint') }}
    </p>
  </div>
</template>

<style scoped>
.ct {
  padding: 8px 14px 12px;
  font-family: var(--ck-font-mono);
}

.ct__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.ct__table th {
  font-size: 10px;
  letter-spacing: var(--ck-track-data);
  text-align: left;
  padding: 6px 4px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.ct__table td {
  padding: 2px 4px;
}

.ct__idx {
  width: 2em;
  color: var(--ck-dim);
  font-size: 11px;
}

.ct__unit {
  margin-left: 4px;
  color: var(--ck-dim);
  font-weight: 400;
  text-transform: none;
}

.ct__input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px;
  font: inherit;
  font-size: 14px;
  text-align: right;
  color: var(--ck-ink);
  background: var(--ck-paper);
  border: 1px solid var(--ck-dim);
  border-radius: 0;
}

.ct__input:focus {
  outline: none;
  border-color: var(--ck-signal);
}

.ct__thr {
  display: flex;
  gap: 14px;
  margin-top: 12px;
}

.ct__thr-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;
  letter-spacing: var(--ck-track-data);
}

.ct__hint {
  margin: 10px 0 0;
  font-size: 10px;
  color: var(--ck-dim);
}
</style>
