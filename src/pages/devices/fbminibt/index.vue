<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <div mx-auto max-w-full w-160>
    <div py-4 text-xl>
      FlyBeeper mini BT
    </div>
    <div>{{ t('about.fbminibt-p1') }}</div>
    <p mt-3 text-left>
      {{ t('about.p4') }}
    </p>
    <router-link m-4 mt-3 btn to="/devices/fbminibt/changelog">
      {{ t('update.firmware') }}
    </router-link>
    <router-link m-4 mt-3 btn to="/devices/fbminibt/manual-en">
      {{ t('button.manual') }} EN
    </router-link>
    <router-link v-if="locale === 'ru'" to="/devices/fbminibt/manual-ru" m-4 mt-3 btn>
      {{ t('button.manual') }} RU
    </router-link>
    <div />
    <a m-4 mt-3 btn href="https://market.flybeeper.com/device/mini-bt">{{ t('about.link-market') }}</a>
    <!--    <a m-4 mt-3 btn href="https://buy.stripe.com/5kA6rBamPdp866Q9AE">{{ t('button.buy-now') }}</a> -->
    <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-mini-bt/">{{ t('about.link-blog') }}</a>
    <StlComponent stl="/fbminibt-model.stl" :pos="{ x: 0, y: -70, z: 40 }" />
    <router-link text-sm btn m="3 t8" to="/devices">
      {{ t('button.back') }}
    </router-link>
  </div>
</template>

<style scoped>

</style>
