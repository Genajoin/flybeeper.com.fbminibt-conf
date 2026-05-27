<script setup lang="ts">
import { computed } from 'vue'

type Kind = 'primary' | 'signal' | 'ghost'

const props = withDefaults(defineProps<{
  kind?: Kind
  full?: boolean
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  href?: string
  to?: string | object
}>(), {
  kind: 'primary',
  full: true,
  type: 'button',
  disabled: false,
})

const classes = computed(() => [
  'ck-cta',
  `ck-cta--${props.kind}`,
  { 'ck-cta--full': props.full },
])
</script>

<template>
  <RouterLink v-if="to" :class="classes" :to="to">
    <slot />
  </RouterLink>
  <a v-else-if="href" :class="classes" :href="href">
    <slot />
  </a>
  <button v-else :class="classes" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.ck-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-sm);
  padding: 14px 20px;
  font-family: var(--ck-font-mono);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  border-radius: 0;
  border: 2px solid var(--ck-ink);
  background: var(--ck-ink);
  color: var(--ck-paper);
  white-space: nowrap;
  transition:
    background var(--ck-dur-toggle) var(--ck-ease),
    color var(--ck-dur-toggle) var(--ck-ease),
    border-color var(--ck-dur-toggle) var(--ck-ease);
}

.ck-cta--full {
  width: 100%;
}

.ck-cta--primary {
  background: var(--ck-ink);
  color: var(--ck-paper);
  border-color: var(--ck-ink);
}

.ck-cta--signal {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border-color: var(--ck-signal);
}

.ck-cta--ghost {
  background: transparent;
  color: var(--ck-ink);
  border-color: var(--ck-ink);
}

.ck-cta:disabled {
  background: var(--ck-bg-deep);
  border-color: var(--ck-grid);
  color: var(--ck-dim);
  cursor: not-allowed;
}

.ck-cta:hover:not(:disabled) {
  filter: brightness(1.05);
}

.ck-cta--ghost:hover:not(:disabled) {
  background: var(--ck-ink);
  color: var(--ck-paper);
}
</style>
