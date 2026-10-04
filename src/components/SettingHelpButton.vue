<script setup lang="ts">
/**
 * "?" next to a setting's label. Hover shows the description as a native
 * tooltip; click (or tap) toggles it inline below the row, which the parent
 * renders — rows sit in a shared 2-column grid, so the text has to be a grid
 * child spanning both columns.
 */
defineProps<{ text: string }>()
const open = defineModel<boolean>({ default: false })
const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="help-btn"
    :class="{ 'help-btn--open': open }"
    :title="text"
    :aria-label="t('help.more')"
    :aria-expanded="open"
    @click.prevent.stop="open = !open"
  >
    ?
  </button>
</template>

<style scoped>
.help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 6px;
  padding: 0;
  vertical-align: 1px;
  border: var(--ck-stroke-rule) solid var(--ck-dim);
  border-radius: 50%;
  background: var(--ck-paper);
  color: var(--ck-dim);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.help-btn:hover,
.help-btn--open {
  border-color: var(--ck-signal);
  color: var(--ck-signal);
}
</style>
