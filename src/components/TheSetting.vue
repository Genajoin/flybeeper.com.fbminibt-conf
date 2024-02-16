<script setup lang="ts">
import log from 'loglevel'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic.js'

const props = defineProps(['cha'])
const emit = defineEmits(['change'])
const { t, te } = useI18n()
const ch = props.cha as BleCharacteristic
const isVisible = ref(false)
// await ch.initialize()

onMounted(async () => {
  log.debug(`Настройка ${ch.characteristic.uuid}`)
  if (ch.presentationFormatDescriptor && ch.presentationFormatDescriptor.format > 0 && ch.presentationFormatDescriptor.format !== 0x1B)
    isVisible.value = true
})

onBeforeUnmount(() => {

})

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
</script>

<template>
  <div v-if="isVisible">
    <label :for="ch.characteristic.uuid">{{ getTranslation() }}: </label>
    <input
      :id="ch.characteristic.uuid"
      v-model="ch.formattedValue"
      class="input-field"
      :type="getTypeFromPresentationFormat()"
      :step="getStepByFormatDescriptor()"
      @input="handelChange"
    >
  </div>
</template>

<style scoped>

</style>
