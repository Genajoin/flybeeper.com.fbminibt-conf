<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <div v-if="bt.isConnected" p-4>
    {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
  </div>
  <CharacteristicForm15 v-if="bt.isConnected && parseFloat(bt.dis.firmwareRevisionString.value) > 0.15" />
  <CharacteristicForm v-else-if="bt.isConnected" />
  <DeviceConnector v-else />
</template>
