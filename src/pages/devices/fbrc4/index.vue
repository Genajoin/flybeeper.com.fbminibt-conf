<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div py-4>
    FlyBeeper Remote Control 4
  </div>
  <div>4 external buttons are always available for connecting via Bluetooth.</div>
  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p4') }}
  </p>
  <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-remote-control-4">{{ t('about.link-blog') }}</a>
  <a m-4 mt-3 btn href="https://market.flybeeper.com/device/rc4">{{ t('about.link-market') }}</a>
  <a m-4 mt-3 btn href="https://buy.stripe.com/aEUeY7dz1etcan628b">Buy now</a>
  <div />
  <a m-4 mt-3 btn href="/devices/fbrc4/changelog">{{ t('update.changelog') }}</a>
  <a m-4 mt-3 btn href="/devices/fbrc4/manual-en">Manual EN</a>
  <a m-4 mt-3 btn href="/devices/fbrc4/manual-ru">Manual RU</a>
  <div />
  <a text-sm btn m="3 t8" href="/devices/">{{ t('button.back') }}</a>
</template>

<style scoped>

</style>
