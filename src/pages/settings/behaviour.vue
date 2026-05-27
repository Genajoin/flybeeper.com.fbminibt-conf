<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n()
const cpfChars = useCpfGroup('behaviour')

// Per-UUID label, fallback to i18n sett.<uuid>.
function labelFor(uuid: string): string {
  const k = `sett.${uuid}`
  const fb = t(k)
  return fb === k ? uuid : fb
}

const list = computed(() => cpfChars.value)
</script>

<template>
  <SettingsPanel group="behaviour" :cpf-chars="cpfChars">
    <ul v-if="list.length" class="b-list">
      <li v-for="ch in list" :key="ch.characteristic.uuid" class="b-row">
        <span class="b-row__label">{{ labelFor(ch.characteristic.uuid) }}</span>
        <CkSquareToggle
          :model-value="Boolean(ch.formattedValue)"
          :aria-label="labelFor(ch.characteristic.uuid)"
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
