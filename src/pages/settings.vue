<script setup lang="ts">
const bt = useBluetoothStore()
const { t } = useI18n()
</script>

<template>
  <template v-if="bt.isConnected">
    <div p-4>
      {{ bt.dis.manufacturerNameString.value }} {{ bt.dis.modelNumberString.value }} {{ bt.dis.firmwareRevisionString.value }}
    </div>
    <Suspense>
      <div
        v-if="bt.dis.modelNumberString.value === 'FBminiBT'
          && parseFloat(bt.dis.firmwareRevisionString.value) <= 0.11"
      >
        <router-link m-4 mt-3 btn to="/devices/fbminibt/changelog">
          {{ t('update.update-first') }}
        </router-link>
      </div>
      <CharacteristicForm
        v-else-if="bt.dis.modelNumberString.value === 'FBminiBT'
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
