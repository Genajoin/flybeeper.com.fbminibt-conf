<script setup lang="ts">
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <div py-4>
    FlyBeeper mini BT
  </div>
  <div>Variometer with Bluetooth and wireless buttons. Audible climb rate indication based on user-defined curves. The battery is cold-resistant.</div>
  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p4') }}
  </p>
  <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-mini-bt/">{{ t('about.link-blog') }}</a>
  <a m-4 mt-3 btn href="https://market.flybeeper.com/device/mini-bt">{{ t('about.link-market') }}</a>
  <a m-4 mt-3 btn href="https://buy.stripe.com/5kA6rBamPdp866Q9AE">Buy now</a>
  <div />
  <a m-4 mt-3 btn href="/devices/fbminibt/changelog">{{ t('update.changelog') }}</a>
  <a m-4 mt-3 btn href="/devices/fbminibt/manual-en">Manual EN</a>
  <a m-4 mt-3 btn href="/devices/fbminibt/manual-ru">Manual RU</a>
  <div />
  <button text-sm btn m="3 t8" @click="router.back()">
    {{ t('button.back') }}
  </button>
</template>

<style scoped>

</style>
