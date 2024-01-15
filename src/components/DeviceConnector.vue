<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()
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
    <p v-else-if="bt.isDisconnecting">
      {{ t('msg.disconnecting') }}...
    </p>
    <p v-else-if="bt.isConnected">
      {{ bt.devName }} {{ t('msg.connected') }}
    </p>
    <p v-else>
      {{ t('msg.disconnected') }}
    </p>

    <a
      v-if="bt.isDisconnecting || !bt.isConnected" :disabled="bt.isConnecting || bt.isConnected"
      m-3 btn
      :class="{ disabled: bt.isConnecting || bt.isConnected }"
      @click="bt.connectToDevice"
    >
      {{ t('msg.connect') }}
    </a>
    <a
      v-if="bt.isConnecting || bt.isConnected" :disabled="bt.isDisconnecting || !bt.isConnected"
      m-3 btn class="red"
      :class="{ disabled: bt.isDisconnecting || !bt.isConnected }"
      @click="bt.disconnectDevice"
    >
      {{ t('msg.disconnect') }}
    </a>
  </div>
</template>

<style scoped>

</style>
