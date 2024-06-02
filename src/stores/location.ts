import { defineStore } from 'pinia'
import { LocParamImpl } from '~/utils/LocationParam'

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
    locParams: [] as LocParamImpl,
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
      if (position.coords.speed != null)
        this.locParams.find(c => c.description === 'speed').entryArray.push({ timestamp: position.timestamp, value: this.speed })
      if (position.coords.altitude != null)
        this.locParams.find(c => c.description === 'altitude').entryArray.push({ timestamp: position.timestamp, value: this.altitude })
      this.locParams.find(c => c.description === 'latitude').entryArray.push({ timestamp: position.timestamp, value: this.latitude })
      this.locParams.find(c => c.description === 'longitude').entryArray.push({ timestamp: position.timestamp, value: this.longitude })
      this.locParams.find(c => c.description === 'accuracy').entryArray.push({ timestamp: position.timestamp, value: this.accuracy })
      if (position.coords.heading != null)
        this.locParams.find(c => c.description === 'heading').entryArray.push({ timestamp: position.timestamp, value: this.heading })
      if (position.coords.altitudeAccuracy != null)
        this.locParams.find(c => c.description === 'altitudeAccuracy').entryArray.push({ timestamp: position.timestamp, value: this.altitudeAccuracy })
    },

    startWatchingSpeed() {
      try {
        this.locParams = [] as LocParamImpl
        this.locParams.push(new LocParamImpl('speed'))
        this.locParams.push(new LocParamImpl('altitude'))
        this.locParams.push(new LocParamImpl('latitude'))
        this.locParams.push(new LocParamImpl('longitude'))
        this.locParams.push(new LocParamImpl('accuracy'))
        this.locParams.push(new LocParamImpl('heading'))
        this.locParams.push(new LocParamImpl('altitudeAccuracy'))
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
