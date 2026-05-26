<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  ariaLabel?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

function toggle() {
  if (props.disabled)
    return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    class="ck-toggle"
    :class="{ 'ck-toggle--on': modelValue }"
    :aria-pressed="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="ck-toggle__knob" :class="{ 'ck-toggle__knob--on': modelValue }" />
  </button>
</template>

<style scoped>
.ck-toggle {
  position: relative;
  display: inline-block;
  width: 28px;
  height: 16px;
  padding: 0;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  cursor: pointer;
  border-radius: 0;
  transition: background var(--ck-dur-toggle) var(--ck-ease);
}

.ck-toggle--on {
  background: var(--ck-ink);
}

.ck-toggle__knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 11px;
  height: 11px;
  background: var(--ck-ink);
  transition:
    left var(--ck-dur-toggle) var(--ck-ease),
    background var(--ck-dur-toggle) var(--ck-ease);
}

.ck-toggle__knob--on {
  left: 13px;
  background: var(--ck-signal);
}

.ck-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
