<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()
</script>

<template>
  <!-- Проверка наличия модуля Bluetooth -->
  <div v-if="!bt.bleAvailable">
    <p>Your device not support Bluetooth.</p>
    <p>To use certain features, you may need a Bluetooth enabled device.</p>
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
      class="button-link"
      :class="{ disabled: bt.isConnecting || bt.isConnected }"
      @click="bt.connectToDevice"
    >
      {{ t('msg.connect') }}
    </a>
    <a
      v-if="bt.isConnecting || bt.isConnected" :disabled="bt.isDisconnecting || !bt.isConnected"
      class="button-link red"
      :class="{ disabled: bt.isDisconnecting || !bt.isConnected }"
      @click="bt.disconnectDevice"
    >
      {{ t('msg.disconnect') }}
    </a>
  </div>
</template>

<style scoped>
.button-link {
  background-color: green;
  color: white;
  cursor: pointer;
  padding: 10px 20px;
  margin-right: 10px;
  text-decoration: none;
  display: inline-block;
  border-radius: 5px;
  margin-top: 10px;
  transition: background-color 0.3s ease;
}

.button-link.red {
  background-color: red;
}

.button-link.disabled {
  cursor: not-allowed;
  background-color: grey;
  opacity: 0.6;
}

.redMarked {
  color: red;
}
</style>
