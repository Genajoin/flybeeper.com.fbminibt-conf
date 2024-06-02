<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <div mx-auto max-w-full w-160>
    <div py-4 text-xl>
      FlyBeeper True Air Speed
    </div>
    <div>{{ t('about.fbtas-p1') }}</div>
    <p mt-3 text-left>
      {{ t('about.p4') }}
    </p>
    <router-link m-4 mt-3 btn to="/devices/fbtas/changelog">
      {{ t('update.firmware') }}
    </router-link>
    <router-link m-4 mt-3 btn to="/devices/fbtas/manual-en">
      {{ t('button.manual') }} EN
    </router-link>
    <router-link v-if="locale === 'ru'" m-4 mt-3 btn to="/devices/fbtas/manual-ru">
      {{ t('button.manual') }} RU
    </router-link>
    <div />
    <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-tas">{{ t('about.link-blog') }}</a>
    <a m-4 mt-3 btn href="https://market.flybeeper.com/device/tas">{{ t('about.link-market') }}</a>
    <StlComponent stl="/fbtas-model.stl" :pos="{ x: -160, y: -160, z: 100 }" />
    <router-link text-sm btn m="3 t8" to="/devices">
      {{ t('button.back') }}
    </router-link>
  </div>
</template>

<style scoped>

</style>
