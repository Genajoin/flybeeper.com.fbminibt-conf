<script setup lang="ts">
import { computed } from 'vue'
import type { BleCharacteristic } from '~/utils/BleCharacteristic'

const { t, te } = useI18n()
const cpfChars = useCpfGroup('behaviour')

/**
 * Label resolution order:
 *   1. `sett.<uuid>` i18n key (curated translation).
 *   2. BLE User Format Descriptor (0x2901) — firmware-provided name.
 *   3. UUID as last resort.
 */
function labelFor(ch: BleCharacteristic): string {
  const k = `sett.${ch.characteristic.uuid}`
  if (te(k))
    return t(k)
  return ch.userFormatDescriptor || ch.characteristic.uuid
}

const list = computed(() => cpfChars.value)
</script>

<template>
  <SettingsPanel group="behaviour" :cpf-chars="cpfChars">
    <ul v-if="list.length" class="b-list">
      <li v-for="ch in list" :key="ch.characteristic.uuid" class="b-row">
        <span class="b-row__label">{{ labelFor(ch) }}</span>
        <CkSquareToggle
          :model-value="Boolean(ch.formattedValue)"
          :aria-label="labelFor(ch)"
          @update:model-value="ch.formattedValue = $event"
        />
      </li>
    </ul>
    <p v-else class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.b-list {
  /* Two-column grid that hugs the centre seam: labels right-aligned in
   * the left column, controls left-aligned in the right. On desktop the
   * whole thing centres on the page so the eye doesn't have to span a
   * full-width row to pair a setting with its toggle. */
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  align-items: center;
  gap: 16px 28px;
  margin: 0;
  padding: 22px;
  list-style: none;
}

.b-row {
  /* Each row's two children fall straight into the parent grid so labels
   * line up across rows. */
  display: contents;
}

.b-row__label {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
  text-align: right;
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
