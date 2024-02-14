<script setup lang="ts">
import StlComponent from '~/components/StlComponent.vue'

defineOptions({
  name: 'IndexPage',
})

const { t } = useI18n()
const bt = useBluetoothStore()
bt.bleCharacteristics.forEach(ch => ch.unsubscribeFromNotifications())

const recaptchaScript = document.createElement('script')
recaptchaScript.setAttribute(
  'src',
  'https://js.stripe.com/v3/buy-button.js',
)
document.head.appendChild(recaptchaScript)
</script>

<template>
  <div>
    <div py-4 />
    <p>
      <a btn href="https://market.flybeeper.com/device/mini-bt">FlyBeeper mini BT</a>
    </p>
    <p>
      <em text-sm opacity-75>{{ t('intro.desc') }}</em>
    </p>
    <StlComponent />
  </div>
  <stripe-buy-button buy-button-id="buy_btn_1OYH3IEVz0YmyuWXqi2D9ODj" publishable-key="pk_live_JM1bcerUSdh78SyxYTRA5E6V00uWmrGEyu" />
</template>

<route lang="yaml">
meta:
  layout: home
</route>
