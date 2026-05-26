<script setup lang="ts">
import { useInstallPrompt } from '~/composables/useInstallPrompt'

const { t } = useI18n()
const { canInstall, install } = useInstallPrompt()

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
    // Silent — feature is optional.
  }
}
</script>

<template>
  <article class="about">
    <PageHeader
      breadcrumb-to="/"
      breadcrumb-label="← HOME"
    >
      <template #body>
        <CkEyebrow color="var(--ck-signal)" block>
          {{ t('button.about') }}
        </CkEyebrow>
        <h1 class="about__display">
          FlyBeeper
        </h1>
      </template>
    </PageHeader>

    <div class="about__article">
      <p class="about__body">
        {{ t('about.p1') }}
      </p>
      <p class="about__body">
        {{ t('about.p2') }}
      </p>
      <p class="about__body">
        {{ t('about.p3') }}
      </p>
    </div>

    <div class="about__perm">
      <StateCell v-if="locationPermissionGranted" label="LOCATION · GRANTED">
        <span>{{ t('about.geo-granted') }}</span>
      </StateCell>
      <StateCell v-else-if="locationPermissionDenied" label="LOCATION · DENIED" accent="signal">
        <span>{{ t('about.geo-denied') }}</span>
      </StateCell>
      <button v-else class="about__btn" type="button" @click="requestLocationPermission">
        {{ t('about.location-permission') }}
      </button>
    </div>

    <div class="about__actions">
      <RouterLink class="about__btn about__btn--signal" to="/devices">
        {{ t('intro.device-list') }}
      </RouterLink>
      <button v-if="canInstall" class="about__btn" type="button" @click="install">
        <Icon name="install" :size="16" />
        {{ t('about.install-app') }}
      </button>
    </div>

    <a
      class="about__playstore"
      href="https://play.google.com/store/apps/details?id=com.flybeeper.fbminibt_conf.twa"
      target="_blank"
      rel="noopener"
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
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
}

.about__display {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 44px;
  letter-spacing: -1.6px;
  margin: 6px 0;
  text-transform: uppercase;
  line-height: 0.95;
}

.about__article {
  padding: 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.about__body {
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  color: var(--ck-ink);
}

.about__perm {
  padding: 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.about__actions {
  display: flex;
  flex-wrap: wrap;
}

.about__btn {
  flex: 1;
  min-width: 50%;
  padding: 14px;
  text-align: center;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  background: var(--ck-paper);
  color: var(--ck-ink);
  text-decoration: none;
  border: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 0;
}

.about__btn--signal {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.about__playstore {
  display: block;
  padding: 14px 22px;
  background: var(--ck-paper);
}

.about__playstore img {
  height: 60px;
  display: block;
}
</style>
