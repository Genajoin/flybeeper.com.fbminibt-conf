<script setup>
const { t } = useI18n()
</script>

<template>
  <h1 p-4 text-xl>
    {{ t('update.how-to') }}
  </h1>
  <p m-auto text-left prose>
    <a href="https://www.nordicsemi.com/Products/Development-tools/nrf-connect-for-mobile" class="link-primary">nRF
      Connect for Mobile application</a> - {{ t('update.descr') }}
  </p>
  <p m-auto text-left prose>
    {{ t('update.descr2') }} - <a href="https://www.nordicsemi.com/Products/Development-tools/nRF-Connect-Device-Manager" class="link-primary">nRF Connect Device Manager</a>
  </p>
</template>
