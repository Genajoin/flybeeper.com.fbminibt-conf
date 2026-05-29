<script setup lang="ts">
</script>

<template>
  <UpdateBanner />
  <BluefyBanner />
  <ConnectErrorBanner />
  <NoSettingsBanner />
  <DisconnectBanner />
  <RestartDeviceBanner />
  <SimulationBanner />
  <PresetImportBanner />
  <main class="page page--home">
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
