<script setup lang="ts">
import { availableLocales, loadLanguageAsync } from '~/modules/i18n'
import useBluetoothStore from '~/stores/bluetooth'

const { t, locale } = useI18n()
const bt = useBluetoothStore()

async function toggleLocales() {
  const locales = availableLocales
  const newLocale = locales[(locales.indexOf(locale.value) + 1) % locales.length]
  await loadLanguageAsync(newLocale)
  locale.value = newLocale
}
</script>

<template>
  <nav flex="~ gap-4" mt-4 justify-center text-xl>
    <RouterLink icon-btn to="/" :title="t('button.home')">
      <div i-carbon-campsite />
    </RouterLink>

    <RouterLink icon-btn to="/settings" :title="t('button.settings')" data-test-id="settings">
      <div i-carbon-settings-edit />
    </RouterLink>

    <RouterLink icon-btn to="/cockpit" :title="t('button.cockpit')" data-test-id="cockpit">
      <div i-carbon-meter />
    </RouterLink>

    <RouterLink icon-btn to="/update" :title="t('button.update')" data-test-id="update">
      <div i-carbon-update-now />
    </RouterLink>

    <RouterLink icon-btn to="/terminal" :title="t('button.terminal')" data-test-id="terminal">
      <div i-carbon-terminal />
    </RouterLink>

    <RouterLink icon-btn to="/about" :title="t('button.about')" data-test-id="about">
      <div i-carbon-information />
    </RouterLink>

    <button icon-btn :title="t('button.toggle_dark')" @click="toggleDark()">
      <div i="carbon-sun dark:carbon-moon" />
    </button>

    <a icon-btn :title="t('button.toggle_langs')" @click="toggleLocales()">
      <div i-carbon-language />
    </a>

    <button v-if="bt.bleAvailable" icon-btn :title="t('button.bluetooth')" @click="bt.toggleConnectionBT()">
      <div v-if="!bt.isConnected && !bt.isConnecting" i-carbon-bluetooth-off />
      <div v-else-if="bt.isConnected" i-carbon-bluetooth color-blue />
      <div v-else-if="bt.isConnecting || bt.isDisconnecting" i-carbon-fade animate-spin />
    </button>
  </nav>
</template>
