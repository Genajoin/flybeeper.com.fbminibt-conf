<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

/**
 * Stylised top-down vector of a FlyBeeper handheld — square body with rounded
 * corners, four large rounded-square buttons at the corners (circle, up-tri,
 * square, down-tri glyphs), and an LED dot dead-center. Buzzer/dot grille
 * lives on the physical part but isn't surfaced in the top-down icon.
 *
 * Decorative by default (no hotspots). The `hotspots` prop turns each
 * named area into a clickable region — the dashboard uses it to jump from
 * the top-down to the relevant settings panel.
 */

export interface Hotspot {
  id: string
  x: number
  y: number
  r: number
  route?: string
  label?: string
}

const props = withDefaults(defineProps<{
  scale?: number
  showCallouts?: boolean
  activeButton?: number | null
  ledOn?: boolean
  hotspots?: Hotspot[]
  /** Palette override. Falls back to current theme tokens. */
  palette?: Partial<DevicePalette>
}>(), {
  scale: 1,
  showCallouts: false,
  activeButton: null,
  ledOn: true,
})

const emit = defineEmits<{
  (e: 'jump', hotspot: Hotspot): void
}>()

export interface DevicePalette {
  body: string
  bodyShadow: string
  button: string
  buttonActive: string
  led: string
  ledGlow: string
  label: string
  callout: string
  stroke: string
  glyph: string
}

// Tokens map so dark mode flips both states.
const themed = computed<DevicePalette>(() => ({
  body: 'var(--ck-paper)',
  bodyShadow: 'var(--ck-bg-deep)',
  button: 'var(--ck-paper)',
  buttonActive: 'var(--ck-signal)',
  led: 'var(--ck-signal)',
  ledGlow: 'var(--ck-signal)',
  label: 'var(--ck-ink)',
  callout: 'var(--ck-ink)',
  stroke: 'var(--ck-ink)',
  glyph: 'var(--ck-ink)',
  ...props.palette,
}))

// Vue 3.4 lacks useId() — synthesise one from the component instance uid
// so multiple <DeviceTopdown> on the same page don't collide on gradient ids.
const instanceUid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 1e6)
const bodyId = `dev-body-${instanceUid}`
const ledId = `dev-led-${instanceUid}`

// Square viewBox; W and H tracked so scale keeps the 1:1 aspect ratio.
const W = computed(() => 240 * props.scale)
const H = computed(() => 240 * props.scale)

// Layout constants. Body occupies the full viewBox minus a small breathing
// margin; buttons are placed at the four corners with a gap from each other
// and from the body edge.
const BTN_SIZE = 88
const BTN_RX = 20
const BODY_INSET = 10
const BODY_RX = 28
const BTN_INSET = 22 // distance from body edge to button edge

const buttons = [
  // glyph: 'circle' | 'tri-up' | 'square' | 'tri-down'
  { x: BTN_INSET, y: BTN_INSET, n: 1, glyph: 'circle' },
  { x: 240 - BTN_INSET - BTN_SIZE, y: BTN_INSET, n: 2, glyph: 'tri-up' },
  { x: BTN_INSET, y: 240 - BTN_INSET - BTN_SIZE, n: 3, glyph: 'square' },
  { x: 240 - BTN_INSET - BTN_SIZE, y: 240 - BTN_INSET - BTN_SIZE, n: 4, glyph: 'tri-down' },
] as const

function glyphPath(g: string, x: number, y: number): { kind: 'circle' | 'rect' | 'polygon', attrs: Record<string, string | number> } {
  // All glyphs sit in a 36×36 box centered on the button.
  const cx = x + BTN_SIZE / 2
  const cy = y + BTN_SIZE / 2
  const r = 18
  if (g === 'circle')
    return { kind: 'circle', attrs: { cx, cy, r } }
  if (g === 'square')
    return { kind: 'rect', attrs: { x: cx - r, y: cy - r, width: r * 2, height: r * 2, rx: 3 } }
  if (g === 'tri-up') {
    const pts = `${cx},${cy - r} ${cx + r},${cy + r * 0.85} ${cx - r},${cy + r * 0.85}`
    return { kind: 'polygon', attrs: { points: pts } }
  }
  // tri-down
  const pts = `${cx - r},${cy - r * 0.85} ${cx + r},${cy - r * 0.85} ${cx},${cy + r}`
  return { kind: 'polygon', attrs: { points: pts } }
}

function onHotspot(h: Hotspot) {
  emit('jump', h)
}
</script>

<template>
  <svg :width="W" :height="H" viewBox="0 0 240 240" class="device-topdown">
    <defs>
      <linearGradient :id="bodyId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" :stop-color="themed.body" />
        <stop offset="1" :stop-color="themed.bodyShadow" />
      </linearGradient>
      <radialGradient :id="ledId" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" :stop-color="themed.led" stop-opacity="1" />
        <stop offset="0.4" :stop-color="themed.led" stop-opacity="0.6" />
        <stop offset="1" :stop-color="themed.ledGlow" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- body -->
    <rect
      :x="BODY_INSET" :y="BODY_INSET"
      :width="240 - BODY_INSET * 2" :height="240 - BODY_INSET * 2"
      :rx="BODY_RX"
      :fill="`url(#${bodyId})`"
      :stroke="themed.stroke"
      stroke-width="1.4"
    />

    <!-- buttons -->
    <g v-for="b in buttons" :key="b.n">
      <rect
        :x="b.x" :y="b.y"
        :width="BTN_SIZE" :height="BTN_SIZE"
        :rx="BTN_RX"
        :fill="activeButton === b.n ? themed.buttonActive : themed.button"
        :stroke="themed.stroke"
        stroke-opacity="0.45"
        stroke-width="1.2"
      />
      <template v-for="g in [glyphPath(b.glyph, b.x, b.y)]" :key="g.kind">
        <circle
          v-if="g.kind === 'circle'"
          :cx="g.attrs.cx as number" :cy="g.attrs.cy as number" :r="g.attrs.r as number"
          fill="none"
          :stroke="activeButton === b.n ? 'var(--ck-on-signal)' : themed.glyph"
          stroke-width="2.4"
        />
        <rect
          v-else-if="g.kind === 'rect'"
          :x="g.attrs.x as number" :y="g.attrs.y as number"
          :width="g.attrs.width as number" :height="g.attrs.height as number"
          :rx="g.attrs.rx as number"
          fill="none"
          :stroke="activeButton === b.n ? 'var(--ck-on-signal)' : themed.glyph"
          stroke-width="2.4"
        />
        <polygon
          v-else
          :points="g.attrs.points as string"
          fill="none"
          :stroke="activeButton === b.n ? 'var(--ck-on-signal)' : themed.glyph"
          stroke-width="2.4"
          stroke-linejoin="round"
        />
      </template>
    </g>

    <!-- LED dead-center -->
    <circle v-if="ledOn" cx="120" cy="120" r="14" :fill="`url(#${ledId})`" opacity="0.7" />
    <circle cx="120" cy="120" r="4.5" :fill="themed.led" />

    <g v-if="showCallouts">
      <line x1="120" y1="138" x2="200" y2="170" :stroke="themed.callout" stroke-width="0.8" />
      <circle cx="200" cy="170" r="2" :fill="themed.callout" />
    </g>

    <g v-if="hotspots && hotspots.length">
      <g v-for="h in hotspots" :key="h.id" class="hotspot" @click="onHotspot(h)">
        <circle :cx="h.x" :cy="h.y" :r="h.r" fill="transparent" :stroke="themed.callout" stroke-opacity="0" stroke-width="2" class="hotspot__ring" />
        <title v-if="h.label">{{ h.label }}</title>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.device-topdown {
  display: block;
}

.hotspot {
  cursor: pointer;
}

.hotspot:hover .hotspot__ring {
  stroke-opacity: 1;
  stroke: var(--ck-signal);
}
</style>
