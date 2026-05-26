<script setup lang="ts">
withDefaults(defineProps<{
  left?: string
  right?: string
}>(), {
  left: 'LOCAL · NO CLOUD',
  right: 'CONFIG.FLYBEEPER.COM',
})
</script>

<template>
  <div class="inv-footer">
    <span>{{ left }}</span>
    <span>{{ right }}</span>
  </div>
</template>

<style scoped>
.inv-footer {
  display: flex;
  justify-content: space-between;
  padding: 12px 22px;
  background: var(--ck-ink);
  color: var(--ck-paper);
  font-family: var(--ck-font-mono);
  font-size: 9px;
  letter-spacing: var(--ck-track-data);
  font-weight: 700;
  text-transform: uppercase;
}
</style>
