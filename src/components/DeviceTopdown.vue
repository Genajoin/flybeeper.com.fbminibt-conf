<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

/**
 * Stylised top-down vector of a FlyBeeper handheld — body, LED, 4 buttons,
 * buzzer area. Source: design/src/frames.jsx > DeviceTopdown.
 *
 * Decorative by default (no hotspots). The `hotspots` prop turns each
 * named area into a clickable region — Phase E uses it to jump from the
 * dashboard to the relevant settings panel.
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
  ...props.palette,
}))

// Vue 3.4 lacks useId() — synthesise one from the component instance uid
// so multiple <DeviceTopdown> on the same page don't collide on gradient ids.
const instanceUid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 1e6)
const bodyId = `dev-body-${instanceUid}`
const ledId = `dev-led-${instanceUid}`

const W = computed(() => 220 * props.scale)
const H = computed(() => 340 * props.scale)

const buttons = [
  { x: 88, y: 180, n: 1 },
  { x: 132, y: 180, n: 2 },
  { x: 88, y: 224, n: 3 },
  { x: 132, y: 224, n: 4 },
]

function onHotspot(h: Hotspot) {
  emit('jump', h)
}
</script>

<template>
  <svg :width="W" :height="H" viewBox="0 0 220 340" class="device-topdown">
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

    <rect x="50" y="40" width="120" height="260" rx="22" :fill="`url(#${bodyId})`" :stroke="themed.stroke" stroke-width="1.2" />

    <g opacity="0.5">
      <circle v-for="i in 5" :key="i" :cx="86 + (i - 1) * 12" :cy="80" r="2" :fill="themed.stroke" />
    </g>

    <circle v-if="ledOn" cx="110" cy="120" r="14" :fill="`url(#${ledId})`" opacity="0.65" />
    <circle cx="110" cy="120" r="4" :fill="themed.led" />

    <g v-for="b in buttons" :key="b.n">
      <circle :cx="b.x" :cy="b.y" r="14" :fill="activeButton === b.n ? themed.buttonActive : themed.button" :stroke="themed.stroke" stroke-opacity="0.3" />
      <text :x="b.x" :y="b.y + 4" text-anchor="middle" :fill="activeButton === b.n ? 'var(--ck-on-signal)' : themed.label" font-size="11" font-weight="600">{{ b.n }}</text>
    </g>

    <rect x="86" y="260" width="48" height="24" rx="4" fill="none" :stroke="themed.stroke" stroke-opacity="0.4" stroke-dasharray="2 2" />
    <text x="110" y="276" text-anchor="middle" :fill="themed.label" font-size="9" letter-spacing="0.5">BUZZER</text>

    <g v-if="showCallouts">
      <line x1="124" y1="120" x2="200" y2="100" :stroke="themed.callout" stroke-width="0.8" />
      <circle cx="200" cy="100" r="2" :fill="themed.callout" />
      <line x1="74" y1="202" x2="20" y2="180" :stroke="themed.callout" stroke-width="0.8" />
      <circle cx="20" cy="180" r="2" :fill="themed.callout" />
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
