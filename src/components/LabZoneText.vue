<script setup lang="ts">
import type { ZoneKind } from '~/utils/threshold-model'

/**
 * Pilot-facing explanation of one threshold-lab zone, with the current
 * values filled in. Shared by the chart tooltip and the zone list in
 * ThresholdLab.
 */
const props = defineProps<{ kind: ZoneKind }>()

const { t } = useI18n()
const lab = useThresholdLab()

function ms(cmS: number): string {
  const v = cmS / 100
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`
}

const vars = computed(() => {
  const p = lab.params.value
  return { co: ms(p.climbOn), cf: ms(p.climbOff), so: ms(p.sinkOn), sf: ms(p.sinkOff), early: ms(p.climbOn + p.hyst) }
})

const KEY: Record<ZoneKind, string> = {
  'sink': 'z-sink',
  'sink-memory': 'z-sink-memory',
  'quiet': 'z-quiet',
  'climb-memory': 'z-climb-memory',
  'early-exit': 'z-early',
  'climb': 'z-climb',
}

const range = computed(() => {
  const z = lab.zones.value.find(z => z.kind === props.kind)
  if (!z)
    return ''
  if (!Number.isFinite(z.from))
    return `< ${ms(z.to)} m/s`
  if (!Number.isFinite(z.to))
    return `> ${ms(z.from)} m/s`
  return `${ms(z.from)} … ${ms(z.to)} m/s`
})
</script>

<template>
  <div class="lzt" :class="`lzt--${kind}`">
    <div class="lzt__head">
      <span class="lzt__swatch" />
      <strong>{{ t(`lab.${KEY[kind]}`) }}</strong>
      <span class="lzt__range">{{ range }}</span>
    </div>
    <p class="lzt__body">
      {{ t(`lab.${KEY[kind]}-body`, vars) }}
      <template v-if="kind === 'climb-memory' && lab.params.value.hyst > 0">
        {{ t('lab.z-climb-memory-hyst', vars) }}
      </template>
    </p>
  </div>
</template>

<style scoped>
.lzt__head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
}

.lzt__range {
  margin-left: auto;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
  font-variant-numeric: tabular-nums;
}

.lzt__swatch {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  border: 1px solid var(--ck-grid);
}

/* Same tints / hatches as the chart zones. */
.lzt--sink .lzt__swatch {
  background: rgb(10 160 224 / 30%);
}
.lzt--climb .lzt__swatch {
  background: rgb(255 106 0 / 30%);
}
.lzt--quiet .lzt__swatch {
  background: rgb(122 122 122 / 18%);
}
.lzt--sink-memory .lzt__swatch {
  background: repeating-linear-gradient(45deg, rgb(10 160 224 / 45%) 0 3px, transparent 3px 6px);
}
.lzt--climb-memory .lzt__swatch {
  background: repeating-linear-gradient(45deg, rgb(255 106 0 / 45%) 0 3px, transparent 3px 6px);
}
.lzt--early-exit .lzt__swatch {
  background: repeating-linear-gradient(-45deg, rgb(194 65 12 / 60%) 0 2px, transparent 2px 6px);
}

.lzt__body {
  margin: 4px 0 0;
  font-family: var(--ck-font-body);
  font-size: 13px;
  line-height: 1.4;
  color: var(--ck-ink);
}
</style>
