<script setup lang="ts">
withDefaults(defineProps<{
  color?: string
  block?: boolean
}>(), {
  color: 'var(--ck-ink)',
  block: false,
})
</script>

<template>
  <span class="ck-eyebrow" :style="{ color, display: block ? 'block' : 'inline-block' }">
    <slot />
  </span>
</template>

<style scoped>
.ck-eyebrow {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  line-height: 1.2;
}
</style>
