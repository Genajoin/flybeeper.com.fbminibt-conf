<script setup>
const { t } = useI18n()
</script>

<template>
  <TheUpdate />
  <router-link m-4 mt-3 btn to="/devices">
    {{ t('intro.device-list') }}
  </router-link>
</template>
