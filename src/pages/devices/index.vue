<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div py-4 text-xl>
    {{ t('intro.device-list') }}
  </div>
  <a m-4 mt-3 btn href="/devices/fbminibt">FlyBeeper mini BT</a>
  <a m-4 mt-3 btn href="/devices/fbps1">FlyBeeper pressure sensor</a>
  <a m-4 mt-3 btn href="/devices/fbrc4">FlyBeeper remote control 4</a>
  <a m-4 mt-3 btn href="/devices/fbtas">FlyBeeper TAS</a>
</template>

<style scoped>

</style>
