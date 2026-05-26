<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  accent?: 'ink' | 'signal'
}>(), {
  accent: 'ink',
})
</script>

<template>
  <div class="state-cell">
    <div class="state-cell__head">
      <CkEyebrow :color="accent === 'signal' ? 'var(--ck-signal)' : 'var(--ck-ink)'">
        {{ label }}
      </CkEyebrow>
      <span class="state-cell__dot" :class="`state-cell__dot--${accent}`" />
    </div>
    <div class="state-cell__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.state-cell {
  display: flex;
  flex-direction: column;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
}

.state-cell__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.state-cell__dot {
  width: 7px;
  height: 7px;
}

.state-cell__dot--ink {
  background: var(--ck-ink);
}

.state-cell__dot--signal {
  background: var(--ck-signal);
}

.state-cell__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px;
  gap: 9px;
  text-align: center;
  color: var(--ck-ink);
}
</style>
