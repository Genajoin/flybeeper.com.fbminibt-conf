<script setup lang="ts">
</script>

<template>
  <UpdateBanner />
  <BluefyBanner />
  <ConnectErrorBanner />
  <DisconnectBanner />
  <RestartDeviceBanner />
  <SimulationBanner />
  <PresetImportBanner />
  <main class="page">
    <RouterView />
  </main>
  <TheFooter />
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
