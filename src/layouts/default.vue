<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <UpdateBanner />
  <BluefyBanner />
  <DisconnectBanner />
  <RestartDeviceBanner />
  <SimulationBanner />
  <PresetImportBanner />
  <StatusLine v-if="bt.isConnected" />
  <main class="page">
    <RouterView />
  </main>
  <ReconnectDiffDialog />
  <InstallToast />
</template>

<style scoped>
.page {
  width: 100%;
  margin: 0;
  padding: 0;
}
</style>
