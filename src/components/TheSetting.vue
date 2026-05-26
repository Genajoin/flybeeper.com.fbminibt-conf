<script setup lang="ts">
import { computed } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic.js'

const props = defineProps<{ cha: BleCharacteristic }>()
const emit = defineEmits<{ (e: 'change'): void }>()
const { t, te } = useI18n()
const ch = props.cha

// Reactive — CPF descriptors arrive async via ch.initialize() (kicked off by
// useCpfGroup). If we computed this in onMounted, the very first paint after
// connect would freeze isVisible=false and only unfreeze on next navigation.
// computed re-evaluates on every formatDescriptor mutation, so the field
// appears as soon as the descriptor lands.
const isVisible = computed(() =>
  !!ch.presentationFormatDescriptor
  && ch.presentationFormatDescriptor.format > 0
  && ch.presentationFormatDescriptor.format !== 0x1B,
)

function handelChange() {
  emit('change')
}

function getTranslation() {
  return (te(`sett.${ch.characteristic.uuid}`))
    ? t(`sett.${ch.characteristic.uuid}`)
    : ch.userFormatDescriptor || ch.characteristic.uuid
}

function getTypeFromPresentationFormat() {
  if (!ch.presentationFormatDescriptor)
    return 'text'
  switch (ch.presentationFormatDescriptor.format) {
    case 0x01: // bit
      return 'checkbox'
    case 0x19: // utf8s
    case 0x1A: // utf16s
      return 'text'
    case 0x1B: // array
      return 'array'
    default:
      return 'number'
  }
}

function getStepByFormatDescriptor() {
  if (!ch.presentationFormatDescriptor)
    return 1
  if (ch.presentationFormatDescriptor.format > 0x01 && ch.presentationFormatDescriptor.format < 0x14)
    return 10 ** ch.presentationFormatDescriptor.exponent
  return 1
}

const inputType = computed(() => getTypeFromPresentationFormat())
</script>

<template>
  <div v-if="isVisible" class="row" :class="{ 'row--check': inputType === 'checkbox' }">
    <label class="row__label" :for="ch.characteristic.uuid">
      {{ getTranslation() }}
    </label>
    <input
      :id="ch.characteristic.uuid"
      v-model="ch.formattedValue"
      class="row__input"
      :class="{ 'row__input--check': inputType === 'checkbox' }"
      :type="inputType"
      :step="getStepByFormatDescriptor()"
      @input="handelChange"
    >
  </div>
</template>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ck-s-md);
}

.row__label {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  color: var(--ck-ink);
  flex: 1 1 auto;
}

.row__input {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-body);
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  background: var(--ck-paper);
  color: var(--ck-ink);
  width: 10ch;
  text-align: right;
}

.row__input:focus {
  outline: none;
  border-color: var(--ck-signal);
}

.row__input--check {
  width: auto;
  accent-color: var(--ck-signal);
  cursor: pointer;
}
</style>
