<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <DeviceConnector v-if="!bt.isConnected" />
  <template v-else>
    <Suspense>
      <TheParams />
      <template #fallback>
        <div i-carbon-fade m-auto animate-spin text-4xl />
      </template>
    </Suspense>
    <div>
      {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
    </div>
    <noSleep />
  </template>
</template>
