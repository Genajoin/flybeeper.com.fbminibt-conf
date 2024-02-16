<script setup lang="ts">
import TheTerminal from '~/components/TheTerminal.vue'
import DeviceConnector from '~/components/DeviceConnector.vue'

const bt = useBluetoothStore()
</script>

<template>
  <DeviceConnector v-if="!bt.isConnected" />
  <TheTerminal v-else />
</template>
