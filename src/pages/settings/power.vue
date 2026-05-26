<script setup lang="ts">
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()
const fields = SETTINGS_GROUPS.power
const cpfChars = useCpfGroup('power')

const local = computed(() => settings.local)
const fwRev = computed(() =>
  Number.parseFloat((bt.dis.firmwareRevisionString.value as string) || '0'),
)
const showLegacy = computed(() => local.value !== null)
const showCpf = computed(() => cpfChars.value.length > 0)
</script>

<template>
  <SettingsPanel group="power" :fields="fields" :cpf-chars="cpfChars">
    <template v-if="showLegacy && local">
      <!-- Legacy form gated this behind > 0.99 (effectively never-shown).
           We expose it once firmware-level behaviour is wired; until then,
           keep parity with legacy and only show on firmware that supports it. -->
      <label v-if="fwRev > 0.99" class="toggle">
        <input
          v-model="local.ble_never_sleep"
          type="checkbox"
        >
        <span>{{ t('sett.bt-never-sleep') }}</span>
      </label>
      <p v-else-if="!showCpf" class="empty">
        {{ t('sett.bt-never-sleep') }} — fw ≥ 1.0 required
      </p>
    </template>

    <template v-if="showCpf">
      <TheSetting
        v-for="ch in cpfChars"
        :key="ch.characteristic.uuid"
        :cha="ch"
      />
    </template>

    <p v-if="!showLegacy && !showCpf" class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-sm);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  cursor: pointer;
}

.empty {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
}
</style>
