<script setup lang="ts">
const { t } = useI18n()
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
  <a m-4 mt-3 btn href="/devices/fbtas/changelog">{{ t('update.changelog') }}</a>
  <a m-4 mt-3 btn href="/devices/fbtas/manual-en">Manual EN</a>
  <a m-4 mt-3 btn href="/devices/fbtas/manual-ru">Manual RU</a>
  <div />
  <a text-sm btn m="3 t8" href="/devices/">{{ t('button.back') }}</a>
</template>

<style scoped>

</style>
