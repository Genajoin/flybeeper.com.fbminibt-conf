<script setup lang="ts">
/**
 * Cockpit-minimal icon set — single-stroke glyphs at 24×24, stroke 1.6,
 * round caps, mostly no fill. Source: design/src/cockpit.jsx > CkIcons,
 * extended with a few auxiliary glyphs for nav/locale/device catalog.
 */
import { computed } from 'vue'

export type IconName =
  | 'arrow-right' | 'arrow-left' | 'chevron' | 'close'
  | 'bluetooth' | 'bluetooth-off' | 'wifi' | 'rssi' | 'battery'
  | 'check' | 'alert' | 'info' | 'cross-circle'
  | 'share' | 'download' | 'upload' | 'copy' | 'qr' | 'refresh'
  | 'vario' | 'led' | 'buzzer' | 'button' | 'thermal' | 'install'
  | 'menu' | 'more' | 'plus' | 'settings'
  | 'home' | 'sun' | 'moon' | 'language' | 'meter' | 'terminal'
  | 'pressure' | 'pressure-filled' | 'game-console' | 'wind' | 'radio' | 'satellite'
  | 'changelog' | 'book' | 'cart' | 'external'

const props = withDefaults(defineProps<{
  name: IconName
  size?: number | string
  stroke?: string
  title?: string
}>(), {
  size: 20,
  stroke: 'currentColor',
})

const px = computed(() => typeof props.size === 'number' ? `${props.size}px` : props.size)
</script>

<template>
  <svg
    :width="px"
    :height="px"
    viewBox="0 0 24 24"
    class="ck-icon"
    :aria-label="title"
    :aria-hidden="title ? undefined : true"
    role="img"
  >
    <title v-if="title">{{ title }}</title>
    <g v-if="name === 'arrow-right'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12 H19 M13 6 L19 12 L13 18" />
    </g>
    <g v-else-if="name === 'arrow-left'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12 H5 M11 6 L5 12 L11 18" />
    </g>
    <g v-else-if="name === 'chevron'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 6 L15 12 L9 18" />
    </g>
    <g v-else-if="name === 'close'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </g>
    <g v-else-if="name === 'bluetooth'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linejoin="round" stroke-linecap="round">
      <path d="M9 6 L17 14 L12 18 L12 4 L17 8 L9 14" />
    </g>
    <g v-else-if="name === 'bluetooth-off'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linejoin="round" stroke-linecap="round">
      <path d="M9 6 L17 14 L12 18 L12 4 L17 8 L9 14" />
      <path d="M4 4 L20 20" />
    </g>
    <g v-else-if="name === 'wifi'">
      <path d="M5 10 a10 10 0 0 1 14 0" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" />
      <path d="M8 13 a6 6 0 0 1 8 0" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" />
      <circle cx="12" cy="16.5" r="1" :fill="stroke" />
    </g>
    <g v-else-if="name === 'rssi'">
      <rect x="3" y="14" width="3" height="6" :fill="stroke" />
      <rect x="8" y="11" width="3" height="9" :fill="stroke" />
      <rect x="13" y="8" width="3" height="12" :fill="stroke" />
      <rect x="18" y="5" width="3" height="15" :fill="stroke" opacity="0.3" />
    </g>
    <g v-else-if="name === 'battery'">
      <rect x="3" y="8" width="16" height="8" :stroke="stroke" stroke-width="1.6" fill="none" />
      <rect x="5" y="10" width="9" height="4" :fill="stroke" />
      <rect x="20" y="10.5" width="2" height="3" :fill="stroke" />
    </g>
    <g v-else-if="name === 'check'" :stroke="stroke" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12 L10 17 L19 6" />
    </g>
    <g v-else-if="name === 'alert'">
      <path d="M12 3 L21 19 H3 Z" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" :stroke="stroke" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="12" cy="16" r="1" :fill="stroke" />
    </g>
    <g v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9" :stroke="stroke" stroke-width="1.6" fill="none" />
      <circle cx="12" cy="8" r="1.2" :fill="stroke" />
      <line x1="12" y1="11" x2="12" y2="17" :stroke="stroke" stroke-width="1.6" stroke-linecap="round" />
    </g>
    <g v-else-if="name === 'cross-circle'">
      <circle cx="12" cy="12" r="9" :stroke="stroke" stroke-width="1.6" fill="none" />
      <path d="M8 8 L16 16 M16 8 L8 16" :stroke="stroke" stroke-width="1.6" />
    </g>
    <g v-else-if="name === 'share'">
      <circle cx="6" cy="12" r="2.5" :stroke="stroke" stroke-width="1.6" fill="none" />
      <circle cx="18" cy="6" r="2.5" :stroke="stroke" stroke-width="1.6" fill="none" />
      <circle cx="18" cy="18" r="2.5" :stroke="stroke" stroke-width="1.6" fill="none" />
      <line x1="8" y1="11" x2="16" y2="7" :stroke="stroke" stroke-width="1.6" />
      <line x1="8" y1="13" x2="16" y2="17" :stroke="stroke" stroke-width="1.6" />
    </g>
    <g v-else-if="name === 'download'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3 V15 M7 11 L12 16 L17 11 M5 20 H19" />
    </g>
    <g v-else-if="name === 'upload'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21 V9 M7 13 L12 8 L17 13 M5 4 H19" />
    </g>
    <g v-else-if="name === 'copy'">
      <rect x="8" y="4" width="12" height="14" :stroke="stroke" stroke-width="1.6" fill="none" />
      <rect x="4" y="8" width="12" height="14" :stroke="stroke" stroke-width="1.6" fill="none" />
    </g>
    <g v-else-if="name === 'qr'">
      <rect x="3" y="3" width="6" height="6" :stroke="stroke" stroke-width="1.6" fill="none" />
      <rect x="15" y="3" width="6" height="6" :stroke="stroke" stroke-width="1.6" fill="none" />
      <rect x="3" y="15" width="6" height="6" :stroke="stroke" stroke-width="1.6" fill="none" />
      <rect x="13" y="13" width="2" height="2" :fill="stroke" />
      <rect x="17" y="13" width="2" height="2" :fill="stroke" />
      <rect x="13" y="17" width="2" height="2" :fill="stroke" />
      <rect x="17" y="17" width="2" height="2" :fill="stroke" />
    </g>
    <g v-else-if="name === 'refresh'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 12 a8 8 0 0 1 13.5 -5.7 L19 8 M19 4 V8 H15 M20 12 a8 8 0 0 1 -13.5 5.7 L5 16 M5 20 V16 H9" />
    </g>
    <g v-else-if="name === 'vario'" :stroke="stroke" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 18 L7 14 L9 16 L13 10 L17 12 L21 5" />
    </g>
    <g v-else-if="name === 'led'">
      <circle cx="12" cy="12" r="3.5" :fill="stroke" />
      <circle cx="12" cy="12" r="7" :stroke="stroke" stroke-width="1.6" fill="none" stroke-dasharray="2 2.5" />
    </g>
    <g v-else-if="name === 'buzzer'">
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linejoin="round" />
      <path d="M17 9 a4 4 0 0 1 0 6" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" />
    </g>
    <g v-else-if="name === 'button'">
      <circle cx="12" cy="12" r="7" :stroke="stroke" stroke-width="1.6" fill="none" />
      <circle cx="12" cy="12" r="3" :fill="stroke" />
    </g>
    <g v-else-if="name === 'thermal'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M6 21 C 6 12, 10 14, 10 6 M10 21 C 10 14, 14 16, 14 8 M14 21 C 14 16, 18 18, 18 10" />
    </g>
    <g v-else-if="name === 'install'">
      <rect x="6" y="3" width="12" height="18" rx="2" :stroke="stroke" stroke-width="1.6" fill="none" />
      <path d="M12 9 V15 M9 12 L12 15 L15 12" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="12" cy="18.5" r="0.8" :fill="stroke" />
    </g>
    <g v-else-if="name === 'menu'" :stroke="stroke" stroke-width="1.6" stroke-linecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </g>
    <g v-else-if="name === 'more'">
      <circle cx="6" cy="12" r="1.5" :fill="stroke" />
      <circle cx="12" cy="12" r="1.5" :fill="stroke" />
      <circle cx="18" cy="12" r="1.5" :fill="stroke" />
    </g>
    <g v-else-if="name === 'plus'" :stroke="stroke" stroke-width="1.8" stroke-linecap="round">
      <path d="M12 4 V20 M4 12 H20" />
    </g>
    <g v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" :stroke="stroke" stroke-width="1.6" fill="none" />
      <path d="M12 2 V5 M12 19 V22 M22 12 H19 M5 12 H2 M19 5 L17 7 M7 17 L5 19 M19 19 L17 17 M7 7 L5 5" :stroke="stroke" stroke-width="1.6" stroke-linecap="round" />
    </g>
    <g v-else-if="name === 'home'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linejoin="round" stroke-linecap="round">
      <path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" />
    </g>
    <g v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" :fill="stroke" />
      <g :stroke="stroke" stroke-width="1.6" stroke-linecap="round">
        <line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
        <line x1="5" y1="5" x2="6.5" y2="6.5" />
        <line x1="17.5" y1="17.5" x2="19" y2="19" />
        <line x1="5" y1="19" x2="6.5" y2="17.5" />
        <line x1="17.5" y1="6.5" x2="19" y2="5" />
      </g>
    </g>
    <g v-else-if="name === 'moon'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linejoin="round">
      <path d="M19 14 A8 8 0 1 1 10 5 A6 6 0 0 0 19 14 Z" />
    </g>
    <g v-else-if="name === 'language'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21 M12 3 C 16 7, 16 17, 12 21 C 8 17, 8 7, 12 3" />
    </g>
    <g v-else-if="name === 'meter'">
      <circle cx="12" cy="12" r="9" :stroke="stroke" stroke-width="1.6" fill="none" />
      <line x1="12" y1="12" x2="17" y2="7" :stroke="stroke" stroke-width="1.6" stroke-linecap="round" />
      <circle cx="12" cy="12" r="1.5" :fill="stroke" />
    </g>
    <g v-else-if="name === 'terminal'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="5" width="18" height="14" />
      <path d="M7 10 L10 12 L7 14 M12 15 H16" />
    </g>
    <g v-else-if="name === 'pressure'">
      <circle cx="12" cy="12" r="9" :stroke="stroke" stroke-width="1.6" fill="none" />
      <path d="M12 12 L15 8" :stroke="stroke" stroke-width="1.6" stroke-linecap="round" />
      <circle cx="12" cy="12" r="1.2" :fill="stroke" />
    </g>
    <g v-else-if="name === 'pressure-filled'">
      <circle cx="12" cy="12" r="9" :fill="stroke" />
      <path d="M12 12 L16 8" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
    </g>
    <g v-else-if="name === 'game-console'">
      <rect x="3" y="8" width="18" height="10" rx="3" :stroke="stroke" stroke-width="1.6" fill="none" />
      <circle cx="8" cy="13" r="1" :fill="stroke" />
      <circle cx="16" cy="13" r="1" :fill="stroke" />
    </g>
    <g v-else-if="name === 'wind'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M3 8 H14 a2 2 0 1 0 -2 -2 M3 12 H18 a2 2 0 1 1 -2 2 M3 16 H12 a2 2 0 1 1 -2 2" />
    </g>
    <g v-else-if="name === 'radio'">
      <circle cx="12" cy="12" r="2" :fill="stroke" />
      <path d="M7 7 a7 7 0 0 0 0 10 M17 7 a7 7 0 0 1 0 10 M4 4 a11 11 0 0 0 0 16 M20 4 a11 11 0 0 1 0 16" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" />
    </g>
    <g v-else-if="name === 'satellite'">
      <path d="M5 19 L12 12 L19 19 Z M14 6 L18 10 M16 4 L20 8" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="9" cy="15" r="1.5" :fill="stroke" />
    </g>
    <g v-else-if="name === 'changelog'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round">
      <rect x="4" y="4" width="16" height="16" />
      <path d="M8 9 H16 M8 13 H16 M8 17 H12" />
    </g>
    <g v-else-if="name === 'book'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linejoin="round">
      <path d="M4 5 H10 a2 2 0 0 1 2 2 V20 a2 2 0 0 0 -2 -2 H4 Z" />
      <path d="M20 5 H14 a2 2 0 0 0 -2 2 V20 a2 2 0 0 1 2 -2 H20 Z" />
    </g>
    <g v-else-if="name === 'cart'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 4 H6 L8 16 H19 L21 8 H7" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </g>
    <g v-else-if="name === 'external'" :stroke="stroke" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 5 H5 V19 H19 V15 M14 5 H19 V10 M19 5 L11 13" />
    </g>
  </svg>
</template>

<style scoped>
.ck-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
