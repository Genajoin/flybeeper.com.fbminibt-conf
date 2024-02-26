<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const { t } = useI18n()
</script>

<template>
  <StlComponent stl="/fbminibt-model.stl" :pos="{ x: 0, y: -70, z: 40 }" />
  <router-link m-4 mt-3 btn to="/devices">
    {{ t('intro.device-list') }}
  </router-link>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
