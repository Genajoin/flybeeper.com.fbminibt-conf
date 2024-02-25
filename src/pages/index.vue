<script setup lang="ts">
import StlComponent from '~/components/StlComponent.vue'

defineOptions({
  name: 'IndexPage',
})

const { t } = useI18n()
</script>

<template>
  <StlComponent />
  <router-link m-4 mt-3 btn to="/devices">
    {{ t('intro.device-list') }}
  </router-link>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
