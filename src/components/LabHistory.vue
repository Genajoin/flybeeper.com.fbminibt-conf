<script setup lang="ts">
import { HISTORY_S } from '~/composables/useThresholdLab'

/**
 * Last 20 s of the emulator on a time axis: vario, its average (EMA), the
 * climb threshold in effect and where the tone was on. The trend hysteresis is
 * a threshold that moves in time — it lifts by the hysteresis while the climb
 * is weakening — so it only reads on a time axis, not on the vario axis of the
 * curve chart.
 */
const { t } = useI18n()
const lab = useThresholdLab()

const VB_W = 600
const VB_H = 170
const PAD_T = 8
const PAD_B = 8
const PAD_R = 78
const plotW = VB_W - PAD_R
const plotH = VB_H - PAD_T - PAD_B

function ms(cmS: number): string {
  const v = cmS / 100
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`
}

const view = computed(() => {
  void lab.historyVersion.value
  const h = lab.history
  if (!h.length)
    return null
  const p = lab.params.value
  const now = h[h.length - 1].t
  const t0 = now - HISTORY_S * 1000
  let lo = Math.min(p.climbOn, ...h.map(s => Math.min(s.air, s.vario, s.ema)))
  let hi = Math.max(p.climbOn + p.hyst, ...h.map(s => Math.max(s.air, s.vario, s.ema)))
  lo -= 25
  hi += 25
  if (hi - lo < 100) {
    const mid = (hi + lo) / 2
    lo = mid - 50
    hi = mid + 50
  }
  const x = (tt: number) => ((tt - t0) / (now - t0 || 1)) * plotW
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * plotH
  const line = (pick: (s: typeof h[number]) => number) =>
    h.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)} ${y(pick(s)).toFixed(1)}`).join('')
  // Threshold as a step line: it jumps when the trend flips.
  const step = h.map((s, i) => {
    const xs = x(s.t).toFixed(1)
    const ys = y(s.climbTh).toFixed(1)
    return i ? `H${xs}V${ys}` : `M${xs} ${ys}`
  }).join('')

  const runs = (pred: (s: typeof h[number]) => boolean) => {
    const out: { x: number, w: number }[] = []
    let start = -1
    h.forEach((s, i) => {
      if (pred(s) && start < 0)
        start = i
      if ((!pred(s) || i === h.length - 1) && start >= 0) {
        const end = pred(s) ? i : i - 1
        out.push({ x: x(h[start].t), w: Math.max(x(h[end].t) - x(h[start].t), 1) })
        start = -1
      }
    })
    return out
  }

  const refs = [
    { v: p.climbOn, label: `C-ON ${ms(p.climbOn)}`, cls: 'on' },
    ...(p.hyst > 0 ? [{ v: p.climbOn + p.hyst, label: `+H ${ms(p.climbOn + p.hyst)}`, cls: 'early' }] : []),
    ...(p.sinkOn >= lo && p.sinkOn <= hi ? [{ v: p.sinkOn, label: `S-ON ${ms(p.sinkOn)}`, cls: 'sink' }] : []),
    ...(lo < 0 && hi > 0 ? [{ v: 0, label: '0', cls: 'zero' }] : []),
  ].map(r => ({ ...r, y: y(r.v) }))
    // Threshold labels win over the zero line's when they'd overlap.
    .filter((r, _, all) => r.cls !== 'zero' || all.every(o => o.cls === 'zero' || Math.abs(o.y - r.y) > 12))

  return {
    air: line(s => s.air),
    vario: line(s => s.vario),
    ema: line(s => s.ema),
    step,
    toneRuns: runs(s => s.toneOn),
    weakRuns: runs(s => s.weakening),
    refs,
  }
})

const avgS = computed(() => (lab.averageMs.value / 1000).toFixed(lab.averageMs.value < 1000 ? 2 : 1))

const caption = computed(() => {
  const p = lab.params.value
  if (p.hyst <= 0)
    return t('lab.hist-caption-off', { co: ms(p.climbOn) })
  return t('lab.hist-caption', { co: ms(p.climbOn), early: ms(p.climbOn + p.hyst), h: ms(p.hyst) })
})
</script>

<template>
  <div class="hist">
    <div class="hist__head">
      <span class="hist__legend">
        <i class="hist__key hist__key--air" />{{ t('lab.hist-air') }}
        <i class="hist__key hist__key--vario" />{{ t('lab.hist-vario', { s: avgS }) }}
        <i class="hist__key hist__key--ema" />{{ t('lab.hist-ema') }}
        <i class="hist__key hist__key--th" />{{ t('lab.hist-th') }}
        <i class="hist__key hist__key--tone" />{{ t('lab.hist-tone') }}
        <i class="hist__key hist__key--weak" />{{ t('lab.hist-weak') }}
      </span>
    </div>
    <svg class="hist__svg" :viewBox="`0 0 ${VB_W} ${VB_H}`" role="img" :aria-label="t('lab.hist-title')">
      <rect :width="plotW" :height="VB_H" class="hist__bg" />
      <template v-if="view">
        <rect v-for="(r, i) in view.toneRuns" :key="`t${i}`" :x="r.x" :y="0" :width="r.w" :height="VB_H" class="hist__tone" />
        <rect v-for="(r, i) in view.weakRuns" :key="`w${i}`" :x="r.x" :y="VB_H - 6" :width="r.w" height="6" class="hist__weak" />
        <g v-for="r in view.refs" :key="r.cls">
          <line :x1="0" :x2="plotW" :y1="r.y" :y2="r.y" class="hist__ref" :class="`hist__ref--${r.cls}`" vector-effect="non-scaling-stroke" />
          <text :x="plotW + 3" :y="r.y + 4" class="hist__ref-label" :class="`hist__ref-label--${r.cls}`">{{ r.label }}</text>
        </g>
        <path :d="view.step" class="hist__th" vector-effect="non-scaling-stroke" />
        <path :d="view.ema" class="hist__ema" vector-effect="non-scaling-stroke" />
        <path :d="view.air" class="hist__air" vector-effect="non-scaling-stroke" />
        <path :d="view.vario" class="hist__vario" vector-effect="non-scaling-stroke" />
      </template>
      <text v-else :x="plotW / 2" :y="VB_H / 2" text-anchor="middle" class="hist__empty">{{ t('lab.hist-empty') }}</text>
    </svg>
    <p class="hist__caption">
      {{ caption }}
    </p>
  </div>
</template>

<style scoped>
.hist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hist__head {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
  justify-content: space-between;
}

.hist__legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  color: var(--ck-dim);
}

.hist__key {
  display: inline-block;
  width: 14px;
  height: 3px;
  margin-left: 6px;
}

.hist__key--air {
  height: 2px;
  background: #0aa0e0;
}
.hist__key--vario {
  background: var(--ck-ink);
}
.hist__key--ema {
  background: repeating-linear-gradient(90deg, var(--ck-dim) 0 3px, transparent 3px 5px);
}
.hist__key--th {
  background: #ff6a00;
}
.hist__key--tone {
  height: 10px;
  background: rgb(227 6 19 / 18%);
}
.hist__key--weak {
  height: 6px;
  background: #c2410c;
}

.hist__svg {
  width: 100%;
  height: auto;
  display: block;
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  background: var(--ck-paper);
}

.hist__bg {
  fill: transparent;
}

.hist__tone {
  fill: #e30613;
  opacity: 0.12;
}

.hist__weak {
  fill: #c2410c;
  opacity: 0.8;
}

.hist__ref {
  stroke: var(--ck-grid);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.hist__ref--on {
  stroke: #ff6a00;
  opacity: 0.6;
}
.hist__ref--early {
  stroke: #c2410c;
  opacity: 0.6;
}
.hist__ref--sink {
  stroke: #0aa0e0;
  opacity: 0.6;
}

.hist__ref-label {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  fill: var(--ck-dim);
}

.hist__ref-label--on {
  fill: #ff6a00;
}
.hist__ref-label--early {
  fill: #c2410c;
}
.hist__ref-label--sink {
  fill: #0aa0e0;
}

.hist__th {
  fill: none;
  stroke: #ff6a00;
  stroke-width: 2.5;
}

.hist__ema {
  fill: none;
  stroke: var(--ck-dim);
  stroke-width: 2;
  stroke-dasharray: 5 3;
}

.hist__air {
  fill: none;
  stroke: #0aa0e0;
  stroke-width: 1.5;
  opacity: 0.7;
}

.hist__vario {
  fill: none;
  stroke: var(--ck-ink);
  stroke-width: 2;
}

.hist__empty {
  font-family: var(--ck-font-mono);
  font-size: 12px;
  fill: var(--ck-dim);
}

.hist__caption {
  margin: 0;
  font-family: var(--ck-font-body);
  font-size: 13px;
  line-height: 1.4;
}
</style>
