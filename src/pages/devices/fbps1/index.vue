<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <div py-4>
    FlyBeeper Pressure Sensor
  </div>
  <div>Always available for Bluetooth connection external barometer. High sensitivity and stability with minimal delays. Turn any smartphone into a reliable variometer.</div>
  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p4') }}
  </p>
  <a m-4 mt-3 btn href="https://market.flybeeper.com/device/ps1">{{ t('about.link-market') }}</a>
  <a m-4 mt-3 btn href="https://buy.stripe.com/dR6cPZ52vfxgdzifZ0">{{ t('button.buy-now') }}</a>
  <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-pressure-sensor">{{ t('about.link-blog') }}</a>
  <div />
  <router-link m-4 mt-3 btn to="/devices/fbps1/changelog">
    {{ t('update.changelog') }}
  </router-link>
  <router-link m-4 mt-3 btn to="/devices/fbps1/manual-en">
    {{ t('button.manual') }} EN
  </router-link>
  <router-link v-if="locale === 'ru'" m-4 mt-3 btn to="/devices/fbps1/manual-ru">
    {{ t('button.manual') }} RU
  </router-link>
  <div />
  <router-link text-sm btn m="3 t8" to="/devices">
    {{ t('button.back') }}
  </router-link>
</template>

<style scoped>

</style>
