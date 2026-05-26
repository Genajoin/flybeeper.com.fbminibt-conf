<script setup lang="ts">
const { t } = useI18n()

const deferredPrompt = ref<any>(null)
const showInstallButton = ref(false)

function installApp() {
  if (!deferredPrompt.value)
    return
  deferredPrompt.value.prompt()
  deferredPrompt.value.userChoice.then(() => {
    deferredPrompt.value = null
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event: any) => {
    event.preventDefault()
    deferredPrompt.value = event
    showInstallButton.value = true
  })
}

const locationPermissionGranted = ref(false)
const locationPermissionDenied = ref(false)

async function requestLocationPermission() {
  try {
    locationPermissionDenied.value = false
    const status = await navigator.permissions.query({ name: 'geolocation' })
    if (status.state === 'granted') {
      locationPermissionGranted.value = true
    }
    else if (status.state === 'prompt') {
      await navigator.geolocation.getCurrentPosition(
        () => { locationPermissionGranted.value = true },
        () => { locationPermissionDenied.value = true },
      )
    }
    else {
      locationPermissionDenied.value = true
    }
  }
  catch {
    // Silent — feature is optional, just leave the UI in its initial state.
  }
}
</script>

<template>
  <article class="about">
    <header class="about__head">
      <p class="about__eyebrow">
        {{ t('button.about') }}
      </p>
      <h1 class="about__title">
        FlyBeeper
      </h1>
    </header>

    <p class="about__body">
      {{ t('about.p1') }}
    </p>

    <div class="about__actions">
      <RouterLink class="about__btn about__btn--primary" to="/devices">
        {{ t('intro.device-list') }}
      </RouterLink>
    </div>

    <p class="about__body">
      {{ t('about.p2') }}
    </p>

    <div class="about__perm">
      <button
        v-if="!locationPermissionGranted"
        class="about__btn"
        type="button"
        @click="requestLocationPermission"
      >
        {{ t('about.location-permission') }}
      </button>
      <p v-else class="about__perm-msg about__perm-msg--ok">
        {{ t('about.geo-granted') }}
      </p>
      <p v-if="locationPermissionDenied" class="about__perm-msg about__perm-msg--bad">
        {{ t('about.geo-denied') }}
      </p>
    </div>

    <p class="about__body">
      {{ t('about.p3') }}
    </p>

    <button
      v-if="showInstallButton"
      class="about__btn about__btn--primary"
      type="button"
      @click="installApp"
    >
      <span class="i-carbon-download" aria-hidden="true" />
      {{ t('about.install-app') }}
    </button>

    <a
      class="about__playstore"
      href="https://play.google.com/store/apps/details?id=com.flybeeper.fbminibt_conf.twa&pcampaignid=pcampaignidMKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1"
    >
      <img
        alt="Get it on Google Play"
        src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
      >
    </a>
  </article>
</template>

<style scoped>
.about {
  max-width: 44rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-md);
  text-align: left;
}

.about__head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
  margin-bottom: var(--ck-s-sm);
}

.about__eyebrow {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-eyebrow);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  color: var(--ck-signal);
  margin: 0;
}

.about__title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-fs-display);
  font-weight: 700;
  line-height: var(--ck-line-tight);
  color: var(--ck-ink);
  margin: 0;
}

.about__body {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  line-height: var(--ck-line-body);
  color: var(--ck-ink);
  margin: 0;
}

.about__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ck-s-sm);
}

.about__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-s-xs);
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  font-weight: 600;
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
  text-decoration: none;
  align-self: flex-start;
}

.about__btn:hover {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.about__btn--primary {
  background: var(--ck-signal);
  border-color: var(--ck-signal);
  color: var(--ck-on-signal);
}

.about__btn--primary:hover {
  background: var(--ck-ink);
  border-color: var(--ck-ink);
}

.about__perm {
  display: flex;
  flex-direction: column;
  gap: var(--ck-s-xs);
}

.about__perm-msg {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  margin: 0;
}

.about__perm-msg--ok {
  color: var(--ck-ink);
}

.about__perm-msg--bad {
  color: var(--ck-signal);
}

.about__playstore {
  margin-top: var(--ck-s-sm);
  align-self: flex-start;
}

.about__playstore img {
  height: 60px;
  display: block;
}
</style>
