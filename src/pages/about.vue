<script setup>
const { t } = useI18n()
const deferredPrompt = ref(null)
const showInstallButton = ref(false)

function installApp() {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt()
    deferredPrompt.value.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          // console.log('User accepted the install prompt');
        }
        else {
          // console.log('User dismissed the install prompt');
        }
        deferredPrompt.value = null
      })
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt.value = event
  showInstallButton.value = true
})

const locationPermissionGranted = ref(false)
const locationPermissionDenied = ref(false)

async function requestLocationPermission() {
  try {
    locationPermissionDenied.value = false
    const status = await navigator.permissions.query({ name: 'geolocation' })
    if (status.state === 'granted') {
      // console.log('Location permission is already granted');
      locationPermissionGranted.value = true
    }
    else if (status.state === 'prompt') {
      // console.log('Requesting location permission');
      await navigator.geolocation.getCurrentPosition(() => {
        // console.log('Location permission granted');
        locationPermissionGranted.value = true
      }, () => {
        locationPermissionDenied.value = true
      })
    }
    else {
      // console.log('Location permission is denied');
      locationPermissionDenied.value = true
    }
  }
  catch (error) {
    // console.error('Error checking/requesting location permission:', error);
  }
}
</script>

<template>
  <div py-4 />

  <h3 text-center text-xl>
    {{ t('button.about') }}
  </h3>

  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p1') }}
  </p>
  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p2') }}
  </p>
  <button v-if="!locationPermissionGranted" mt-3 btn @click="requestLocationPermission">
    {{ t('about.location-permission') }}
  </button>
  <div v-else text-green-600="">
    {{ t('about.geo-granted') }}
  </div>
  <div v-if="locationPermissionDenied" text-red-600="">
    {{ t('about.geo-denied') }}
  </div>
  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p3') }}
  </p>
  <button v-if="showInstallButton" mt-3 btn @click="installApp">
    {{ t('about.install-app') }}
  </button>
  <p mx-auto mt-3 max-w-full w-160 text-left>
    {{ t('about.p4') }}
  </p>
  <a m-4 mt-3 btn href="https://blog.regimov.net/flybeeper-mini-bt/">{{ t('about.link-blog') }}</a>
  <a m-4 mt-3 btn href="https://market.flybeeper.com/device/mini-bt">{{ t('about.link-market') }}</a>
  <div />
</template>

<style scoped>

</style>
