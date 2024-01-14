<script setup lang="ts">
const bt = useBluetoothStore()
</script>

<template>
  <CharacteristicForm v-if="bt.isConnected" />
  <DeviceConnector v-else />
</template>
