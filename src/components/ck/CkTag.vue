<script setup lang="ts">
withDefaults(defineProps<{
  filled?: boolean
  color?: string
}>(), {
  filled: false,
  color: 'var(--ck-ink)',
})
</script>

<template>
  <span
    class="ck-tag"
    :class="{ 'ck-tag--filled': filled }"
    :style="{
      color: filled ? 'var(--ck-paper)' : color,
      background: filled ? color : 'transparent',
      borderColor: color,
    }"
  >
    <slot />
  </span>
</template>

<style scoped>
.ck-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  line-height: 1.2;
}
</style>
