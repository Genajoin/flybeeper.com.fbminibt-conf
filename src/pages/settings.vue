<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <template v-if="bt.isConnected">
    <div p-4>
      {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
    </div>
    <Suspense>
      <CharacteristicForm
        v-if="bt.dis.modelNumberString.value === 'FBminiBT'
          && parseFloat(bt.dis.firmwareRevisionString.value) <= 0.15"
      />
      <CharacteristicForm15 v-else />
      <template #fallback>
        <div i-carbon-fade m-auto animate-spin text-4xl />
      </template>
    </Suspense>
  </template>
  <DeviceConnector v-else />
</template>
