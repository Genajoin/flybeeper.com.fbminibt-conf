<script setup lang="ts">
import TheTerminal from '~/components/TheTerminal.vue'
import DeviceConnector from '~/components/DeviceConnector.vue'

const bt = useBluetoothStore()
</script>

<template>
  <DeviceConnector v-if="!bt.isConnected" />
  <template v-else>
    <div p-2>
      {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
    </div>
    <Suspense>
      <TheTerminal />
      <template #fallback>
        <div i-carbon-fade m-auto animate-spin text-4xl />
      </template>
    </Suspense>
  </template>
</template>
