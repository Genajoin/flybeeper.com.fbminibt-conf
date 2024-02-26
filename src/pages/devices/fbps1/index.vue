<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <div mx-auto max-w-full w-160>
    <div py-4 text-xl>
      FlyBeeper Pressure Sensor
    </div>
    <div>{{ t('about.fbps1-p1') }}</div>
    <p mt-3 text-left>
      {{ t('about.p4') }}
    </p>
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
    <a m-4 mt-3 btn href="https://market.flybeeper.com/device/ps1">{{ t('about.link-market') }}</a>
    <a m-4 mt-3 btn href="https://buy.stripe.com/dR6cPZ52vfxgdzifZ0">{{ t('button.buy-now') }}</a>
    <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-pressure-sensor">{{ t('about.link-blog') }}</a>
    <div />
    <router-link text-sm btn m="3 t8" to="/devices">
      {{ t('button.back') }}
    </router-link>
  </div>
</template>

<style scoped>

</style>
