<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <div mx-auto max-w-full w-160>
    <div py-4 text-xl>
      FlyBeeper mini BT
    </div>
    <div>Variometer with Bluetooth and wireless buttons. Audible climb rate indication based on user-defined curves. The battery is cold-resistant.</div>
    <p mt-3 text-left>
      {{ t('about.p4') }}
    </p>
    <a m-4 mt-3 btn href="https://market.flybeeper.com/device/mini-bt">{{ t('about.link-market') }}</a>
    <a m-4 mt-3 btn href="https://buy.stripe.com/5kA6rBamPdp866Q9AE">{{ t('button.buy-now') }}</a>
    <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-mini-bt/">{{ t('about.link-blog') }}</a>
    <div />
    <router-link m-4 mt-3 btn to="/devices/fbminibt/changelog">
      {{ t('update.changelog') }}
    </router-link>
    <router-link m-4 mt-3 btn to="/devices/fbminibt/manual-en">
      {{ t('button.manual') }} EN
    </router-link>
    <router-link v-if="locale === 'ru'" to="/devices/fbminibt/manual-ru" m-4 mt-3 btn>
      {{ t('button.manual') }} RU
    </router-link>
    <div />
    <router-link text-sm btn m="3 t8" to="/devices">
      {{ t('button.back') }}
    </router-link>
  </div>
</template>

<style scoped>

</style>
