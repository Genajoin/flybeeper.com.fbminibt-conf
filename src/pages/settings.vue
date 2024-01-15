<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <div v-if="bt.isConnected" p-4>
    {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
  </div>
  <CharacteristicForm v-if="bt.isConnected" />
  <DeviceConnector v-else />
</template>
