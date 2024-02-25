<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <div py-4>
    FlyBeeper True Air Speed
  </div>
  <div>Autonomous true airspeed sensor with bluetooth.</div>
  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p4') }}
  </p>
  <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-tas">{{ t('about.link-blog') }}</a>
  <a m-4 mt-3 btn href="https://market.flybeeper.com/device/tas">{{ t('about.link-market') }}</a>
  <div />
  <router-link m-4 mt-3 btn to="/devices/fbtas/changelog">
    {{ t('update.changelog') }}
  </router-link>
  <router-link m-4 mt-3 btn to="/devices/fbtas/manual-en">
    {{ t('button.manual') }} EN
  </router-link>
  <router-link v-if="locale === 'ru'" m-4 mt-3 btn to="/devices/fbtas/manual-ru">
    {{ t('button.manual') }} RU
  </router-link>
  <div />
  <router-link text-sm btn m="3 t8" to="/devices">
    {{ t('button.back') }}
  </router-link>
</template>

<style scoped>

</style>
