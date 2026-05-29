import { reactive, ref } from 'vue'
import log from 'loglevel'

/**
 * Best-effort BLE presence detection for already-granted devices.
 *
 * Web Bluetooth's `device.watchAdvertisements()` lets us listen for a device's
 * advertising packets WITHOUT connecting — so we can light an "available now"
 * badge for saved devices powered on nearby. Two big caveats drive the design:
 *
 *  1. In stable Chrome the whole advertisement API sits behind
 *     `chrome://flags/#enable-experimental-web-platform-features`. With the flag
 *     off, `watchAdvertisements()` rejects — so support is only knowable by
 *     trying it. We surface that as `supported` (stays false until one watch
 *     resolves) and degrade silently: no badge, direct connect still works.
 *  2. iOS Bluefy / older shims don't implement it at all → same graceful path.
 *
 * State is a module-level singleton (same pattern as `useDark`) so every caller
 * shares one set of watchers and one reactive presence map.
 */

export interface PresenceEntry {
  inRange: boolean
  rssi: number | null
  lastAdAt: number
}

// A device is considered out of range once we've heard nothing from it for
// this long. Advertising intervals are typically well under a second, so this
// is generous enough to ride over a few missed packets without flapping.
const PRESENCE_TTL_MS = 11_000
const SWEEP_INTERVAL_MS = 3_000

const presenceById = reactive<Record<string, PresenceEntry>>({})
// null = not yet probed; true/false once we've attempted a watch at least once.
const supported = ref<boolean | null>(null)

let started = false
// Bumped on every stop(); an in-flight start() captures it and bails if it
// changed mid-await, so a stop() during start() can't leave orphan watchers.
let generation = 0
// id → teardown that detaches the listener and aborts the watch for that device.
const watchers = new Map<string, () => void>()
let sweepTimer: ReturnType<typeof setInterval> | null = null

function markSeen(id: string, rssi: number | null) {
  const existing = presenceById[id]
  if (existing) {
    existing.inRange = true
    existing.rssi = rssi
    existing.lastAdAt = Date.now()
  }
  else {
    presenceById[id] = { inRange: true, rssi, lastAdAt: Date.now() }
  }
}

function sweep() {
  const now = Date.now()
  for (const id of Object.keys(presenceById)) {
    const e = presenceById[id]
    if (e.inRange && now - e.lastAdAt > PRESENCE_TTL_MS)
      e.inRange = false
  }
}

async function start() {
  if (started)
    return
  if (typeof navigator === 'undefined' || typeof navigator.bluetooth?.getDevices !== 'function') {
    supported.value = false
    return
  }
  started = true
  const gen = generation

  let devices: BluetoothDevice[]
  try {
    devices = await navigator.bluetooth.getDevices()
  }
  catch (error) {
    log.warn('[presence] getDevices() failed', error)
    if (gen === generation)
      started = false
    return
  }
  // stop() ran while getDevices() was in flight — abandon this pass.
  if (gen !== generation)
    return

  for (const device of devices) {
    if (typeof device.watchAdvertisements !== 'function') {
      // No advertisement API on this device object at all.
      if (supported.value === null)
        supported.value = false
      continue
    }

    const handler = (ev: BluetoothAdvertisingEvent) => markSeen(device.id, ev.rssi ?? null)

    if (device.watchingAdvertisements) {
      supported.value = true
      device.addEventListener('advertisementreceived', handler)
      watchers.set(device.id, () => device.removeEventListener('advertisementreceived', handler))
      continue
    }

    const controller = new AbortController()
    try {
      await device.watchAdvertisements({ signal: controller.signal })
      // stop() ran during the await — don't register against a torn-down pass.
      if (gen !== generation) {
        controller.abort()
        return
      }
      supported.value = true
      device.addEventListener('advertisementreceived', handler)
      watchers.set(device.id, () => {
        controller.abort()
        device.removeEventListener('advertisementreceived', handler)
      })
    }
    catch (error) {
      // Flag off / unsupported / already-watching race — leave `supported`
      // false unless another device proved otherwise.
      controller.abort()
      if (supported.value === null)
        supported.value = false
      log.debug('[presence] watchAdvertisements rejected', error)
    }
  }

  if (supported.value && !sweepTimer)
    sweepTimer = setInterval(sweep, SWEEP_INTERVAL_MS)
}

function stop() {
  // Invalidate any in-flight start() so its continuation won't register
  // watchers after we've cleared the map.
  generation++
  for (const teardown of watchers.values())
    teardown()
  watchers.clear()
  if (sweepTimer) {
    clearInterval(sweepTimer)
    sweepTimer = null
  }
  for (const id of Object.keys(presenceById))
    presenceById[id].inRange = false
  started = false
}

export function useDevicePresence() {
  return { presenceById, supported, start, stop }
}

export default useDevicePresence
