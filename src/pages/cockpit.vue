<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <DeviceConnector v-if="!bt.isConnected" />
  <Suspense v-else>
    <TheParams />
    <template #fallback>
      Loading...
    </template>
  </Suspense>
  <noSleep />
</template>
