<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()
</script>

<template>
  <DeviceConnector v-if="!bt.isConnected" />
  <template v-else>
    <Suspense>
      <TheParams />
      <template #fallback>
        <p>
          {{ t('msg.fetching') }}...
        </p>
      </template>
    </Suspense>
    <div v-if="bt.isConnected">
      {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
    </div>
    <noSleep />
  </template>
</template>
