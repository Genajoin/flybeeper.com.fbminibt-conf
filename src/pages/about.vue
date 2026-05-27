<script setup lang="ts">
import { useInstallPrompt } from '~/composables/useInstallPrompt'

const { t } = useI18n()
const { canInstall, install } = useInstallPrompt()

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mwvzalkr'

const locationPermissionGranted = ref(false)
const locationPermissionDenied = ref(false)

const contactName = ref('')
const contactEmail = ref('')
const contactMessage = ref('')
const contactSending = ref(false)
type ContactStatus = 'idle' | 'success' | 'error'
const contactStatus = ref<ContactStatus>('idle')

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

async function submitContact() {
  if (contactSending.value)
    return
  contactSending.value = true
  contactStatus.value = 'idle'
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: contactName.value,
        email: contactEmail.value,
        message: contactMessage.value,
      }),
    })
    if (!res.ok)
      throw new Error(`status ${res.status}`)
    contactStatus.value = 'success'
    contactName.value = ''
    contactEmail.value = ''
    contactMessage.value = ''
  }
  catch {
    contactStatus.value = 'error'
  }
  finally {
    contactSending.value = false
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

    <section class="about__alpisto">
      <CkEyebrow color="var(--ck-signal)" block>
        {{ t('about.alpisto-eyebrow') }}
      </CkEyebrow>
      <h2 class="about__alpisto-title">
        {{ t('about.alpisto-title') }}
      </h2>
      <p class="about__body">
        {{ t('about.alpisto-body') }}
      </p>
      <p class="about__body about__body--dim">
        {{ t('about.alpisto-services') }}
      </p>
      <p class="about__body about__body--mono">
        {{ t('about.alpisto-address') }}
      </p>
      <a
        class="about__btn about__btn--signal about__btn--block"
        href="https://alpisto.eu"
        target="_blank"
        rel="noopener"
      >
        {{ t('about.alpisto-cta') }} ↗
      </a>
    </section>

    <section class="about__contact">
      <CkEyebrow color="var(--ck-signal)" block>
        {{ t('about.contact-eyebrow') }}
      </CkEyebrow>
      <h2 class="about__alpisto-title">
        {{ t('about.contact-title') }}
      </h2>
      <p class="about__body">
        {{ t('about.contact-body') }}
      </p>

      <form class="about__form" @submit.prevent="submitContact">
        <label class="about__field">
          <span class="about__field-label">{{ t('about.contact-name') }}</span>
          <input
            v-model="contactName"
            class="about__input"
            type="text"
            name="name"
            autocomplete="name"
            :placeholder="t('about.contact-name-ph')"
          >
        </label>
        <label class="about__field">
          <span class="about__field-label">{{ t('about.contact-email') }}</span>
          <input
            v-model="contactEmail"
            class="about__input"
            type="email"
            name="email"
            required
            autocomplete="email"
            :placeholder="t('about.contact-email-ph')"
          >
        </label>
        <label class="about__field">
          <span class="about__field-label">{{ t('about.contact-message') }}</span>
          <textarea
            v-model="contactMessage"
            class="about__input about__input--ta"
            name="message"
            required
            rows="5"
            :placeholder="t('about.contact-message-ph')"
          />
        </label>
        <button
          class="about__btn about__btn--signal about__btn--block"
          type="submit"
          :disabled="contactSending"
        >
          {{ contactSending ? t('about.contact-sending') : t('about.contact-send') }}
        </button>
      </form>

      <div v-if="contactStatus === 'success'" class="about__alert about__alert--ok">
        <CkEyebrow color="var(--ck-signal)">
          {{ t('about.contact-success-eyebrow') }}
        </CkEyebrow>
        <p class="about__alert-body">
          {{ t('about.contact-success-body') }}
        </p>
      </div>
      <div v-else-if="contactStatus === 'error'" class="about__alert about__alert--err">
        <CkEyebrow color="var(--ck-ink)">
          {{ t('about.contact-error-eyebrow') }}
        </CkEyebrow>
        <p class="about__alert-body">
          {{ t('about.contact-error-body') }}
        </p>
      </div>
    </section>
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

.about__alpisto,
.about__contact {
  padding: 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  border-left: 8px solid var(--ck-signal);
}

.about__alpisto-title {
  font-family: var(--ck-font-display);
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.5px;
  line-height: 1.05;
  margin: 4px 0 12px;
  text-transform: uppercase;
}

.about__body--dim {
  color: var(--ck-dim);
  font-size: 13px;
}

.about__body--mono {
  font-family: var(--ck-font-mono);
  font-size: 11px;
  letter-spacing: var(--ck-track-data);
  color: var(--ck-dim);
  text-transform: uppercase;
}

.about__alpisto > .about__body + .about__body,
.about__contact > .about__body + .about__body {
  margin-top: 10px;
}

.about__btn--block {
  flex: none;
  min-width: 0;
  width: 100%;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  margin-top: 14px;
}

.about__btn:disabled {
  background: var(--ck-dim);
  color: var(--ck-paper);
  cursor: not-allowed;
}

.about__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.about__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.about__field-label {
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-dim);
}

.about__input {
  padding: 10px 12px;
  background: var(--ck-bg);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: 0;
  color: var(--ck-ink);
  font-family: var(--ck-font-body);
  font-size: 14px;
  line-height: 1.4;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.about__input:focus {
  border-color: var(--ck-signal);
  box-shadow: inset 0 0 0 1px var(--ck-signal);
}

.about__input--ta {
  resize: vertical;
  min-height: 110px;
}

.about__alert {
  margin-top: 16px;
  padding: 14px;
  background: var(--ck-bg);
  border-left: 8px solid var(--ck-signal);
}

.about__alert--err {
  border-left-color: var(--ck-ink);
}

.about__alert-body {
  font-size: 13px;
  line-height: 1.5;
  margin: 4px 0 0;
  color: var(--ck-ink);
}
</style>
