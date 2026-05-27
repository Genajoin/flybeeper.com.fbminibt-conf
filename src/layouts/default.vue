<script setup lang="ts">
</script>

<template>
  <UpdateBanner />
  <BluefyBanner />
  <DisconnectBanner />
  <RestartDeviceBanner />
  <SimulationBanner />
  <PresetImportBanner />
  <ShareSettingsStrip />
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
