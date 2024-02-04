<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <div v-if="bt.isConnected" p-4>
    {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
  </div>
  <template v-if="bt.isConnected">
    <CharacteristicForm
      v-if="bt.dis.modelNumberString.value === 'FBminiBT'
        && parseFloat(bt.dis.firmwareRevisionString.value) <= 0.15"
    />
    <CharacteristicForm15 v-else />
  </template>
  <DeviceConnector v-else />
</template>
