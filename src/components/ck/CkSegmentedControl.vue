<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue'

interface SegOption {
  label: string
  value: T
  disabled?: boolean
}

const props = defineProps<{
  modelValue: T
  options: SegOption[]
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void
}>()

function pick(value: T, disabled?: boolean) {
  if (disabled)
    return
  emit('update:modelValue', value)
}

const optionsArr = computed(() => props.options)
</script>

<template>
  <div class="ck-seg" role="group" :aria-label="ariaLabel">
    <button
      v-for="(o, i) in optionsArr"
      :key="String(o.value)"
      type="button"
      class="ck-seg__btn"
      :class="{
        'ck-seg__btn--active': o.value === modelValue,
        'ck-seg__btn--first': i === 0,
      }"
      :disabled="o.disabled"
      :aria-pressed="o.value === modelValue"
      @click="pick(o.value, o.disabled)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.ck-seg {
  display: inline-flex;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-paper);
}

.ck-seg__btn {
  flex: 1;
  min-width: 0;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  padding: 10px clamp(4px, 1.4vw, 14px);
  font-family: var(--ck-font-mono);
  font-size: clamp(9px, 2.6vw, 11px);
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background var(--ck-dur-toggle) var(--ck-ease),
    color var(--ck-dur-toggle) var(--ck-ease);
  border-radius: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ck-seg__btn--first {
  border-left: none;
}

.ck-seg__btn:hover:not(:disabled):not(.ck-seg__btn--active) {
  background: var(--ck-bg-deep);
}

.ck-seg__btn--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.ck-seg__btn:disabled {
  color: var(--ck-dimmer);
  cursor: not-allowed;
}
</style>
