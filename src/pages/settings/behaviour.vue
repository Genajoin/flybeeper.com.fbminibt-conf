<script setup lang="ts">
import { SETTINGS_GROUPS } from '~/composables/useSettingsGroups'

const bt = useBluetoothStore()
const settings = useSettingsStore()
const { t } = useI18n()
const fields = SETTINGS_GROUPS.behaviour
const cpfChars = useCpfGroup('behaviour')

const local = computed(() => settings.local)
const fwRev = computed(() =>
  Number.parseFloat((bt.dis.firmwareRevisionString.value as string) || '0'),
)
const showLegacy = computed(() => local.value !== null)
const showCpf = computed(() => cpfChars.value.length > 0)
</script>

<template>
  <SettingsPanel group="behaviour" :fields="fields" :cpf-chars="cpfChars">
    <template v-if="showLegacy && local">
      <label v-if="fwRev >= 0.14" class="toggle">
        <input
          v-model="local.silent_on_ground"
          type="checkbox"
        >
        <span>{{ t('sett.silent') }}</span>
      </label>
      <label v-if="fwRev >= 0.14" class="toggle">
        <input
          v-model="local.led_blinky_by_vario"
          type="checkbox"
        >
        <span>{{ t('sett.led-vario') }}</span>
      </label>
      <label v-if="fwRev >= 0.15" class="toggle">
        <input
          v-model="local.hid_keyboard_off"
          type="checkbox"
        >
        <span>{{ t('sett.hid-off') }}</span>
      </label>
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

<route lang="yaml">
meta:
  layout: default
</route>

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
