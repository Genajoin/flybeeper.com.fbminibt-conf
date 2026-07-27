import { defineStore } from 'pinia'
import { LocParamImpl } from '~/utils/LocationParam'

export const useLocationStore = defineStore('locationStore', {
  state: () => ({
    speed: null as number | null,
    altitude: null as number | null,
    latitude: null as number | null,
    longitude: null as number | null,
    accuracy: null as number | null,
    altitudeAccuracy: null as number | null,
    heading: null as number | null,
    watchId: 0,
    error: null as GeolocationPositionError | null,
    locParams: [] as LocParamImpl[],
  }),
  actions: {
    /** Appends a sample to the named series, if that series exists. */
    logParam(description: string, timestamp: number, value: number | null) {
      this.locParams.find(c => c.description === description)?.entryArray.push({ timestamp, value })
    },

    successCallback(position: GeolocationPosition) {
      const c = position.coords
      this.speed = c.speed == null ? null : c.speed * 3.6
      this.altitude = c.altitude
      this.latitude = c.latitude || 0
      this.longitude = c.longitude || 0
      this.accuracy = c.accuracy
      this.heading = c.heading
      this.altitudeAccuracy = c.altitudeAccuracy
      if (c.speed != null)
        this.logParam('speed', position.timestamp, this.speed)
      if (c.altitude != null)
        this.logParam('altitude', position.timestamp, this.altitude)
      this.logParam('latitude', position.timestamp, this.latitude)
      this.logParam('longitude', position.timestamp, this.longitude)
      this.logParam('accuracy', position.timestamp, this.accuracy)
      if (c.heading != null)
        this.logParam('heading', position.timestamp, this.heading)
      if (c.altitudeAccuracy != null)
        this.logParam('altitudeAccuracy', position.timestamp, this.altitudeAccuracy)
    },

    startWatchingSpeed() {
      try {
        this.locParams = [
          'speed',
          'altitude',
          'latitude',
          'longitude',
          'accuracy',
          'heading',
          'altitudeAccuracy',
        ].map(d => new LocParamImpl(d))
        this.watchId = navigator.geolocation.watchPosition(
          this.successCallback,
          (error: GeolocationPositionError) => {
            this.error = error
          },
          { enableHighAccuracy: true, timeout: 2000, maximumAge: 60000 },
        )
      }
      catch (error) {
        this.error = error as GeolocationPositionError
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
