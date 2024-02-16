<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <DeviceConnector v-if="!bt.isConnected" />
  <Suspense v-else>
    <TheParams />
    <template #fallback>
      <div i-carbon-fade m-auto animate-spin p-4 text-4xl />
    </template>
  </Suspense>
  <noSleep />
</template>
