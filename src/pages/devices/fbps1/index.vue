<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div py-4>
    FlyBeeper Pressure Sensor
  </div>
  <div>Always available for Bluetooth connection external barometer. High sensitivity and stability with minimal delays. Turn any smartphone into a reliable variometer.</div>
  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p4') }}
  </p>
  <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-pressure-sensor">{{ t('about.link-blog') }}</a>
  <a m-4 mt-3 btn href="https://market.flybeeper.com/device/ps1">{{ t('about.link-market') }}</a>
  <a m-4 mt-3 btn href="https://buy.stripe.com/dR6cPZ52vfxgdzifZ0">Buy now</a>
  <div />
  <a m-4 mt-3 btn href="/devices/fbps1/changelog">{{ t('update.changelog') }}</a>
  <a m-4 mt-3 btn href="/devices/fbps1/manual-en">Manual EN</a>
  <a m-4 mt-3 btn href="/devices/fbps1/manual-ru">Manual RU</a>
  <div />
  <a text-sm btn m="3 t8" href="/devices/">{{ t('button.back') }}</a>
</template>

<style scoped>

</style>
