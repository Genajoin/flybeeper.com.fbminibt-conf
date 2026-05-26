<script setup lang="ts">
import { useSwUpdate } from '~/composables/useSwUpdate'

const { needRefresh, updateSW } = useSwUpdate()
const dismissed = ref(false)
const show = computed(() => needRefresh.value && !dismissed.value)
function apply() {
  updateSW()
}
function dismiss() {
  dismissed.value = true
}
</script>

<template>
  <Transition name="upd">
    <div v-if="show" class="upd" role="status" aria-live="polite">
      <div class="upd__stripe" />
      <div class="upd__body">
        <CkEyebrow color="var(--ck-signal)">
          UPDATE AVAILABLE
        </CkEyebrow>
        <div class="upd__title">
          New configurator build
        </div>
      </div>
      <button class="upd__cta" type="button" @click="apply">
        UPDATE
      </button>
      <button class="upd__close" type="button" aria-label="dismiss" @click="dismiss">
        <Icon name="close" :size="14" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.upd {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: stretch;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-body);
}

.upd__stripe {
  width: 8px;
  background: var(--ck-signal);
  flex-shrink: 0;
}

.upd__body {
  flex: 1;
  padding: 10px 14px;
}

.upd__title {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
  margin-top: 3px;
}

.upd__cta {
  margin: 8px;
  padding: 6px 11px;
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  cursor: pointer;
  border-radius: 0;
  align-self: center;
}

.upd__close {
  background: transparent;
  border: none;
  color: var(--ck-ink);
  cursor: pointer;
  padding: 0 12px;
}

.upd-enter-active,
.upd-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.upd-enter-from,
.upd-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
