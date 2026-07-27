<script setup lang="ts">
</script>

<template>
  <div class="ck-shell">
    <UpdateBanner />
    <BluefyBanner />
    <ConnectErrorBanner />
    <NoSettingsBanner />
    <DisconnectBanner />
    <RestartDeviceBanner />
    <SimulationBanner />
    <PresetImportBanner />
    <main class="page">
      <RouterView />
    </main>
    <TheFooter />
  </div>
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
