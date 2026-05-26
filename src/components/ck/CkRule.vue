<script setup lang="ts">
withDefaults(defineProps<{
  width?: number
  color?: string
}>(), {
  width: 2,
  color: 'var(--ck-ink)',
})
</script>

<template>
  <hr class="ck-rule" :style="{ borderTopWidth: `${width}px`, borderTopColor: color }">
</template>

<style scoped>
.ck-rule {
  border: none;
  border-top-style: solid;
  margin: 0;
  width: 100%;
}
</style>
