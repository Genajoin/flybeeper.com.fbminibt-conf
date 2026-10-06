<script setup lang="ts">
import type { AudioSource } from '~/composables/useAudioSource'
import { recordAction } from '~/utils/sessionJournal'

const { source, deviceAvailable } = useAudioSource()
const { t } = useI18n()

const options: { value: AudioSource, labelKey: string }[] = [
  { value: 'device', labelKey: 'audio.source-device' },
  { value: 'browser', labelKey: 'audio.source-browser' },
  { value: 'off', labelKey: 'audio.source-off' },
]

function pick(value: AudioSource) {
  if (value === 'device' && !deviceAvailable.value)
    return
  if (source.value !== value)
    recordAction('audio', `sound preview source: ${value}`)
  source.value = value
}
</script>

<template>
  <div class="seg" role="radiogroup" aria-label="Audio source">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="seg__option"
      :class="{
        'seg__option--active': source === opt.value,
        'seg__option--unavailable': opt.value === 'device' && !deviceAvailable,
      }"
      :aria-checked="source === opt.value"
      :aria-disabled="opt.value === 'device' && !deviceAvailable"
      :title="opt.value === 'device' && !deviceAvailable ? t('audio.source-device-off') : undefined"
      role="radio"
      @click="pick(opt.value)"
    >
      {{ t(opt.labelKey) }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-pill);
  overflow: hidden;
  background: var(--ck-paper);
}

.seg__option {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  padding: var(--ck-s-xs) var(--ck-s-md);
  background: transparent;
  color: var(--ck-ink-dim);
  border: none;
  cursor: pointer;
  border-right: var(--ck-stroke-hair) solid var(--ck-grid);
}

.seg__option--unavailable {
  opacity: 0.4;
  cursor: not-allowed;
}

.seg__option:last-child {
  border-right: none;
}

.seg__option--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
}
</style>
