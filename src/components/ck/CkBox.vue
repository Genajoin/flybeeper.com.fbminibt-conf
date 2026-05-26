<script setup lang="ts">
withDefaults(defineProps<{
  padding?: number | string
  frame?: boolean
  background?: string
}>(), {
  padding: 16,
  frame: true,
  background: 'var(--ck-paper)',
})
</script>

<template>
  <div
    class="ck-box"
    :class="{ 'ck-box--framed': frame }"
    :style="{
      padding: typeof padding === 'number' ? `${padding}px` : padding,
      background,
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.ck-box {
  border-radius: 0;
}

.ck-box--framed {
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}
</style>
