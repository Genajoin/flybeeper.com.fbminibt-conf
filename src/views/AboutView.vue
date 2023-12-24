<template>
  <div class="about">
    <h1>About</h1>
    <p>FlyBeeper mini BT - variometer with Bluetooth. Audible indication of climb rate.</p>
    <p>This resource allows you to connect to the device over the air using web bluetooth technology and change its settings.</p>
    <p>Please, visit <a href="https://market.flybeeper.com/device/mini-bt">market</a> to read more, or buy right now.</p>
    <stripe-buy-button
        buy-button-id="buy_btn_1OQzbHEVz0YmyuWXmtwlFFkB"
        publishable-key="pk_live_JM1bcerUSdh78SyxYTRA5E6V00uWmrGEyu"
    >
    </stripe-buy-button>
  </div>
</template>

<script>
export default {
  mounted() {
    const recaptchaScript = document.createElement("script");
    recaptchaScript.setAttribute(
        "src",
        "https://js.stripe.com/v3/buy-button.js"
    );
    document.head.appendChild(recaptchaScript);
  },
}
</script>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
  }
}
</style>
