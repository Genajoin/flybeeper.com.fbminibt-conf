<script setup lang="ts">
import { computed } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'

const { t, te } = useI18n()
const cpfChars = useCpfGroup('uart')

function labelFor(ch: BleCharacteristic): string {
  const k = `sett.${ch.characteristic.uuid}`
  if (te(k))
    return t(k)
  return ch.userFormatDescriptor || ch.characteristic.uuid
}

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
      <template v-for="ch in otherChars" :key="ch.characteristic.uuid">
        <template v-if="typeof ch.formattedValue === 'boolean'">
          <CkSquareToggle
            :model-value="Boolean(ch.formattedValue)"
            :aria-label="labelFor(ch)"
            class="uart-extras__toggle"
            @update:model-value="ch.formattedValue = $event"
          />
          <span class="uart-extras__toggle-label">{{ labelFor(ch) }}</span>
        </template>
        <TheSetting v-else :cha="ch" />
      </template>
    </div>

    <p v-if="cpfChars.length === 0" class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.uart-row {
  padding: 18px 22px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.uart-extras {
  /* Shared 2-column grid for TheSetting rows (display:contents at the
   * child level). Left-aligned on mobile, centred on tablet+. */
  display: grid;
  grid-template-columns: max-content max-content;
  align-items: center;
  justify-content: start;
  column-gap: 16px;
  row-gap: 14px;
  padding: 18px 22px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

@media (min-width: 720px) {
  .uart-extras {
    justify-content: center;
  }
}

/* Pin the toggle to the seam so a 28px toggle and a 10ch <input> share
 * the same right edge in col 1. */
.uart-extras__toggle {
  justify-self: end;
}

.uart-extras__toggle-label {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  color: var(--ck-ink);
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
