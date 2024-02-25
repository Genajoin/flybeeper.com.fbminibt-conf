<script setup lang="ts">
import StlComponent from '~/components/StlComponent.vue'

defineOptions({
  name: 'IndexPage',
})

const { t } = useI18n()
</script>

<template>
  <StlComponent />
  <a m-4 mt-3 btn href="/devices">{{ t('intro.device-list') }}</a>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
