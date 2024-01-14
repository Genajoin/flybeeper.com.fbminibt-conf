import { defineStore } from 'pinia'

export const useLocationStore = defineStore('locationStore', {
  state: () => ({
    speed: null as number,
    altitude: null as number,
    latitude: null as number,
    longitude: null as number,
    accuracy: null as number,
    altitudeAccuracy: null as number,
    heading: null as number,
    watchId: 0,
    error: null as GeolocationPositionError | null,
  }),
  actions: {
    successCallback(position: GeolocationPosition) {
      this.speed = position.coords.speed * 3.6
      this.altitude = position.coords.altitude
      this.latitude = position.coords.latitude || 0
      this.longitude = position.coords.longitude || 0
      this.accuracy = position.coords.accuracy
      this.heading = position.coords.heading
      this.altitudeAccuracy = position.coords.altitudeAccuracy
      // console.log(position.coords)
    },

    startWatchingSpeed() {
      try {
        this.watchId = navigator.geolocation.watchPosition(
          this.successCallback,
          (error: GeolocationPositionError) => {
            this.error = error
          },
          { enableHighAccuracy: true, timeout: 2000, maximumAge: 60000 },
        )
      }
      catch (error) {
        this.error = error
      }
    },

    // Метод для остановки слежения, если это необходимо
    stopWatchingSpeed() {
      if (this.watchId) {
        navigator.geolocation.clearWatch(this.watchId)
        this.watchId = 0
        this.altitude = 0
        this.speed = 0
        this.error = null
      }
    },
  },
})

export default useLocationStore
