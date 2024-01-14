<script>
export default {
  data() {
    return {
      wakeLock: null,
    }
  },
  mounted() {
    if ('wakeLock' in navigator && 'request' in navigator.wakeLock) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
      document.addEventListener('fullscreenchange', this.handleVisibilityChange)
      this.requestWakeLock()
    }
    else {
      // console.error('Wake Lock API not supported.')
    }
  },
  methods: {
    handleVisibilityChange() {
      if (this.wakeLock === null && document.visibilityState === 'visible')
        this.requestWakeLock()
      // .catch(e => console.error(e.message)
      // )
    },

    async requestWakeLock() {
      this.wakeLock = await navigator.wakeLock.request('screen')
      this.wakeLock.addEventListener('release', () => {
        // console.log(e, 'Wake Lock was released')
        this.wakeLock = null
      })
      // console.log('Wake Lock is active')
    },
  },
}
</script>

<template>
  <div>
    <!--  noSleep -->
  </div>
</template>
