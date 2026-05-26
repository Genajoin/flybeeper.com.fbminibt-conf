<template>
  <BluefyBanner />
  <DisconnectBanner />
  <RestartDeviceBanner />
  <SimulationBanner />
  <TheFooter />
  <main class="page">
    <RouterView />
  </main>
  <ReconnectDiffDialog />
</template>

<style scoped>
.page {
  max-width: 64rem;
  margin: 0 auto;
  padding: var(--ck-s-lg) var(--ck-s-md) var(--ck-s-2xl);
}

@media (max-width: 480px) {
  .page {
    padding: var(--ck-s-md) var(--ck-s-sm) var(--ck-s-xl);
  }
}
</style>
