<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <div mx-auto max-w-full w-160>
    <div py-4 text-xl>
      FlyBeeper FANET
    </div>
    <div>{{ t('about.fbfanet-p1') }}</div>
    <p mt-3 text-left>
      {{ t('about.p4') }}
    </p>
    <router-link m-4 mt-3 btn to="/devices/fbfanet/changelog">
      {{ t('update.firmware') }}
    </router-link>
    <router-link m-4 mt-3 btn to="/devices/fbfanet/manual-en">
      {{ t('button.manual') }} EN
    </router-link>
    <div />
    <router-link v-if="locale === 'ru'" to="/devices/fbfanet/manual-ru" m-4 mt-3 btn>
      {{ t('button.manual') }} RU
    </router-link>
    <a m-4 mt-3 btn href="https://market.flybeeper.com/device/fbfanet">{{ t('about.link-market') }}</a>
    <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-fanet">{{ t('about.link-blog') }}</a>
    <StlComponent stl="/fbfanet-model.stl" :pos="{ x: -30, y: -120, z: 150 }" />
    <router-link text-sm btn m="3 t8" to="/devices">
      {{ t('button.back') }}
    </router-link>
  </div>
</template>

<style scoped>

</style>
