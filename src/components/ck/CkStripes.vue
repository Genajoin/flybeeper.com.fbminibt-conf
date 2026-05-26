<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: number
  color?: string
  opacity?: number
}>(), {
  size: 6,
  color: 'var(--ck-ink)',
  opacity: 0.08,
})

const bg = computed(() =>
  `repeating-linear-gradient(45deg, color-mix(in srgb, ${props.color} ${Math.round(props.opacity * 100)}%, transparent) 0 1px, transparent 1px ${props.size}px)`,
)
</script>

<template>
  <div class="ck-stripes" :style="{ backgroundImage: bg }">
    <slot />
  </div>
</template>

<style scoped>
.ck-stripes {
  position: relative;
}
</style>
