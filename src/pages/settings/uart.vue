<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n()
const cpfChars = useCpfGroup('uart')

const PROTOCOL_UUID = '84ccd3d4-a262-45e6-b616-d4a4ae7c0d5b'
const protocolChar = computed(() => cpfChars.value.find(c => c.characteristic.uuid === PROTOCOL_UUID))
const otherChars = computed(() => cpfChars.value.filter(c => c.characteristic.uuid !== PROTOCOL_UUID))

const protocolValue = computed<number>(() => {
  const v = protocolChar.value?.formattedValue
  return typeof v === 'number' ? v : 0
})

function setProtocol(v: number) {
  if (!protocolChar.value)
    return
  protocolChar.value.formattedValue = v
}

const protocolOptions = [
  { label: 'NOTHING', value: 0 },
  { label: 'PRS', value: 1 },
  { label: 'POV', value: 2 },
]
</script>

<template>
  <SettingsPanel group="uart" :cpf-chars="cpfChars">
    <div v-if="protocolChar" class="uart-row">
      <CkEyebrow block>
        {{ t('sett.uart') }}
      </CkEyebrow>
      <CkSegmentedControl
        class="uart-row__seg"
        :model-value="protocolValue"
        :options="protocolOptions"
        :aria-label="t('sett.uart')"
        @update:model-value="setProtocol"
      />
    </div>

    <div v-if="otherChars.length" class="uart-extras">
      <TheSetting
        v-for="ch in otherChars"
        :key="ch.characteristic.uuid"
        :cha="ch"
      />
    </div>

    <p v-if="cpfChars.length === 0" class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.uart-row,
.uart-extras {
  padding: 18px 22px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.uart-row__seg {
  display: flex;
  margin-top: 10px;
}

.empty {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
  padding: 22px;
  text-align: center;
}
</style>
