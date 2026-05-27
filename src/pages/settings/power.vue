<script setup lang="ts">
import type { BleCharacteristic } from '~/utils/BleCharacteristic'

const { t, te } = useI18n()
const cpfChars = useCpfGroup('power')

/**
 * Label resolution: curated i18n key → BLE User Format Descriptor
 * (firmware-provided name) → raw UUID. Same shape as behaviour.vue.
 */
function labelFor(ch: BleCharacteristic): string {
  const k = `sett.${ch.characteristic.uuid}`
  if (te(k))
    return t(k)
  return ch.userFormatDescriptor || ch.characteristic.uuid
}
</script>

<template>
  <SettingsPanel group="power" :cpf-chars="cpfChars">
    <ul v-if="cpfChars.length" class="b-list">
      <template v-for="ch in cpfChars" :key="ch.characteristic.uuid">
        <li v-if="typeof ch.formattedValue === 'boolean'" class="b-row">
          <CkSquareToggle
            :model-value="Boolean(ch.formattedValue)"
            :aria-label="labelFor(ch)"
            @update:model-value="ch.formattedValue = $event"
          />
          <span class="b-row__label">{{ labelFor(ch) }}</span>
        </li>
        <li v-else class="b-row b-row--full">
          <TheSetting :cha="ch" />
        </li>
      </template>
    </ul>
    <p v-else class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.b-list {
  /* Single shared 2-column grid: values (toggles + native inputs from
   * TheSetting) in col 1, labels in col 2. .b-row and TheSetting itself
   * are both display:contents so their children drop straight into this
   * grid — keeps the value/label seam aligned across boolean and numeric
   * rows. Left-aligned on mobile, centred on tablet+. */
  display: grid;
  grid-template-columns: max-content max-content;
  align-items: center;
  justify-content: start;
  column-gap: 16px;
  row-gap: 14px;
  margin: 0;
  padding: 22px;
  list-style: none;
}

@media (min-width: 720px) {
  .b-list {
    justify-content: center;
  }
}

.b-row,
.b-row--full {
  display: contents;
}

/* Pin the col-1 cell (toggle for boolean rows) to the seam so a 28px
 * toggle shares the same right edge as a 10ch <input> in the next row. */
.b-list > .b-row > :first-child {
  justify-self: end;
}

.b-row__label {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
  text-align: left;
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
