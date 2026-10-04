<script setup lang="ts">
import type { ZoneKind } from '~/utils/threshold-model'
import { STUCK_AFTER_S } from '~/composables/useThresholdLab'
import { effectiveThresholds } from '~/utils/threshold-model'

/**
 * What the sound emulator is doing, under the simulator: the current state
 * and why, the last 20 s on a time axis, and the zone legend. The thresholds
 * themselves are the device's sound settings in the panel on the right.
 * Each section folds away; the choice is remembered per browser.
 */
const { t } = useI18n()
const lab = useThresholdLab()

function ms(cmS: number): string {
  const v = cmS / 100
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`
}

const open = useLocalStorage('sound-panel-open', { now: true, history: true, zones: true }, { mergeDefaults: true })
function onToggle(key: 'now' | 'history' | 'zones', evt: Event) {
  open.value = { ...open.value, [key]: (evt.target as HTMLDetailsElement).open }
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
    <details class="lab__sec" :open="open.now" @toggle="onToggle('now', $event)">
      <summary>{{ t('lab.sec-now') }}</summary>
      <div class="lab__status" :class="{ 'lab__status--on': live.toneOn }" aria-live="polite">
        <div class="lab__status-head">
          <span class="lab__state">{{ live.toneOn ? t('lab.on') : t('lab.off') }}</span>
          <span class="lab__vario">{{ ms(live.varioCm) }} m/s</span>
        </div>
        <p class="lab__reason">
          {{ reasonText }}
        </p>
        <p v-if="live.airCm !== live.varioCm" class="lab__ema">
          {{ t('lab.avg', { air: ms(live.airCm), s: (lab.averageMs.value / 1000).toFixed(2) }) }}
        </p>
        <p class="lab__ema">
          {{ t('lab.ema', { ema: ms(lab.emaCm.value) }) }} · {{ trendText }}
        </p>
      </div>
      <p v-if="stuck" class="lab__warn lab__warn--stuck">
        {{ t('lab.stuck', { s: live.stuckS, so: ms(lab.params.value.sinkOn), sf: ms(lab.params.value.sinkOff) }) }}
      </p>
    </details>

    <details class="lab__sec" :open="open.history" @toggle="onToggle('history', $event)">
      <summary>{{ t('lab.hist-title') }}</summary>
      <LabHistory />
    </details>

    <details class="lab__sec" :open="open.zones" @toggle="onToggle('zones', $event)">
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

.lab__warn {
  margin: 0;
  padding: 8px 10px;
  border: var(--ck-stroke-rule) solid var(--ck-signal);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  font-size: 13px;
}

.lab__warn--stuck {
  border-color: #e30613;
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

.lab__sec summary {
  cursor: pointer;
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.lab__sec > :not(summary) {
  margin-top: 10px;
}
</style>
