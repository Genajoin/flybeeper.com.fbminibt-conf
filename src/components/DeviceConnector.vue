<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const bt = useBluetoothStore()
const { t } = useI18n()

onMounted(async () => await bt.getDevices())

onBeforeUnmount(async () => await bt.stopAdvertisement())
</script>

<template>
  <!-- Проверка наличия модуля Bluetooth -->
  <div v-if="!bt.bleAvailable">
    <p>{{ t('msg.no-bluetooth') }}</p>
    <p>{{ t('msg.need-bluetooth') }}</p>
  </div>

  <div v-else p-4>
    <p v-if="bt.isConnecting">
      {{ t('msg.connecting') }}...
    </p>
    <p v-else-if="bt.isFetching">
      {{ bt.devName }} {{ t('msg.fetching') }}...
    </p>
    <p v-else-if="bt.isDisconnecting">
      {{ t('msg.disconnecting') }}...
    </p>
    <p v-else-if="bt.isConnected">
      {{ bt.devName }} {{ t('msg.connected') }}
    </p>
    <p v-else>
      {{ t('msg.disconnected') }}
    </p>

    <div v-if="!(bt.isConnecting || bt.isConnected)" m-3 btn @click="bt.connectToRequestDevice">
      {{ t('msg.connect') }}
    </div>
    <div v-if="bt.isConnected" m-3 btn @click="bt.disconnectDevice">
      {{ t('msg.disconnect') }}
    </div>

    <div text-red-600>
      {{ bt.errorMessage }}
    </div>

    <template v-if="!(bt.isConnecting || bt.isConnected || bt.isFetching) && bt.devices.length">
      <div text-xl>
        {{ t('msg.device-list') }}
      </div>
      <div v-for="device in bt.devices" :id="device" :key="device" m-2 btn @click="bt.connectToDevice(device)">
        <div> {{ device.name }} </div> <div text-xs>
          ({{ bt.devicesRssi[device.id] }})
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>

</style>
