<script>
</script>

<template>
  <DisconnectBanner />
  <main
    px-4 py-1
    text="center gray-700 dark:gray-200"
  >
    <TheFooter />
    <RouterView />
  </main>
  <ReconnectDiffDialog />
</template>
