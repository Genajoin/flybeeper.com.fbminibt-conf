<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <div mx-auto max-w-full w-160>
    <div py-4 text-xl>
      FlyBeeper Solar Vario
    </div>
    <div>{{ t('about.fbsv-p1') }}</div>
    <p mt-3 text-left>
      {{ t('about.p4') }}
    </p>
    <router-link m-4 mt-3 btn to="/devices/fbsv/changelog">
      {{ t('update.firmware') }}
    </router-link>
    <router-link v-if="locale === 'ru'" to="/devices/fbsv/manual-ru" m-4 mt-3 btn>
      {{ t('button.manual') }} RU
    </router-link>
    <router-link v-else m-4 mt-3 btn to="/devices/fbsv/manual-en">
      {{ t('button.manual') }} EN
    </router-link>
    <div />
    <!--    <a m-4 mt-3 btn href="https://market.flybeeper.com/device/sv">{{ t('about.link-market') }}</a> -->
    <!--    <a m-4 mt-3 btn href="https://buy.stripe.com/5kA6rBamPdp866Q9AE">{{ t('button.buy-now') }}</a> -->
    <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-sun-vario/">{{ t('about.link-blog') }}</a>
    <StlComponent stl="/fbsv-model.stl" :pos="{ x: 0, y: -90, z: 40 }" />
    <router-link text-sm btn m="3 t8" to="/devices">
      {{ t('button.back') }}
    </router-link>
  </div>
</template>

<style scoped>

</style>
