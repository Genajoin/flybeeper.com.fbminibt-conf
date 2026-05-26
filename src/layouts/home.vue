<template>
  <BluefyBanner />
  <DisconnectBanner />
  <RestartDeviceBanner />
  <SimulationBanner />
  <TheFooter />
  <main class="page page--home">
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

/* Landing route uses tighter top padding so the hero sits closer to the nav. */
.page--home {
  padding-top: var(--ck-s-md);
}

@media (max-width: 480px) {
  .page {
    padding: var(--ck-s-md) var(--ck-s-sm) var(--ck-s-xl);
  }
}
</style>
