<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div py-4 text-xl>
    {{ t('intro.device-list') }}
  </div>
  <dev inline-flex flex-col>
    <router-link m-4 mt-3 btn to="/devices/fbminibt">
      FlyBeeper mini BT
    </router-link>
    <router-link m-4 mt-3 btn to="/devices/fbps1">
      FlyBeeper pressure sensor
    </router-link>
    <router-link m-4 mt-3 btn to="/devices/fbrc4">
      FlyBeeper remote control 4
    </router-link>
    <router-link m-4 mt-3 btn to="/devices/fbtas">
      FlyBeeper TAS
    </router-link>
    <router-link m-4 mt-3 btn to="/devices/fbfanet">
      FlyBeeper FANET
    </router-link>
  </dev>
</template>

<style scoped>

</style>
