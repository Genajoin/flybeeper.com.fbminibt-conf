<script setup lang="ts">
const { t, te } = useI18n()
const cpfChars = useCpfGroup('fanet')

// Radio frequency — firmware stores Hz (uint32), but humans think in MHz
// (868.20 vs 868200000). Display as MHz with 0.01 precision, BLE transport
// stays in Hz. Kept as a custom row so the rest of the FANET fields can
// still go through the generic TheSetting widget.
const FREQ_UUID = '8d8e8809-4697-41fc-8ee2-ca0b999354ec'
const freqChar = computed(() => cpfChars.value.find(c => c.characteristic.uuid === FREQ_UUID))
const otherChars = computed(() => cpfChars.value.filter(c => c.characteristic.uuid !== FREQ_UUID))

const freqMHz = computed<string>({
  get() {
    const hz = freqChar.value?.formattedValue
    if (typeof hz !== 'number')
      return ''
    return (hz / 1_000_000).toFixed(2)
  },
  set(v: string) {
    const ch = freqChar.value
    if (!ch)
      return
    const mhz = Number.parseFloat(v)
    if (!Number.isFinite(mhz))
      return
    ch.formattedValue = Math.round(mhz * 1_000_000)
  },
})

function freqLabel(): string {
  const k = `sett.${FREQ_UUID}`
  if (te(k))
    return t(k)
  return freqChar.value?.userFormatDescriptor || FREQ_UUID
}
</script>

<template>
  <SettingsPanel group="fanet" :cpf-chars="cpfChars">
    <div v-if="cpfChars.length" class="f-list">
      <template v-if="freqChar">
        <span class="f-input-wrap">
          <input
            :id="FREQ_UUID"
            v-model="freqMHz"
            class="f-input"
            type="number"
            step="0.01"
            inputmode="decimal"
          >
          <span class="f-unit">MHz</span>
        </span>
        <label class="f-label" :for="FREQ_UUID">{{ freqLabel() }}</label>
      </template>
      <TheSetting
        v-for="ch in otherChars"
        :key="ch.characteristic.uuid"
        :cha="ch"
      />
    </div>
    <p v-else class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.f-list {
  /* Shared 2-column grid so every input lines up under one vertical seam.
   * TheSetting is display:contents — its <input> and <label> drop straight
   * into THIS grid alongside the custom frequency row.
   *  - Mobile: pin to the left edge with normal page padding.
   *  - Tablet ≥720px: centre the whole block.
   *  - Wide ≥960px: lay out two field-pairs per row to use the space. */
  display: grid;
  grid-template-columns: max-content max-content;
  align-items: center;
  justify-content: start;
  column-gap: 16px;
  row-gap: 14px;
  padding: 22px;
}

@media (min-width: 720px) {
  .f-list {
    justify-content: center;
  }
}

@media (min-width: 960px) {
  .f-list {
    /* Two value/label pairs per row. Four max-content tracks with a
     * uniform column-gap; the gap is wider than mobile so the two pairs
     * read as distinct without an explicit spacer column. */
    grid-template-columns: repeat(4, max-content);
    column-gap: 28px;
    row-gap: 18px;
  }
}

.f-input-wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  justify-self: end;
}

.f-input {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-body);
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  background: var(--ck-paper);
  color: var(--ck-ink);
  width: 8ch;
  text-align: right;
}

.f-input:focus {
  outline: none;
  border-color: var(--ck-signal);
}

.f-unit {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  color: var(--ck-dim);
  text-transform: uppercase;
  letter-spacing: var(--ck-track-data);
}

.f-label {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  color: var(--ck-ink);
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
