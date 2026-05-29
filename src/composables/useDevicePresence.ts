import { reactive, ref } from 'vue'
import log from 'loglevel'

/**
 * Best-effort BLE presence detection for already-granted devices.
 *
 * Web Bluetooth's `device.watchAdvertisements()` lets us listen for a device's
 * advertising packets WITHOUT connecting — so we can light an "available now"
 * badge and skip a doomed auto-connect to a powered-off device. Two big caveats
 * drive the design here:
 *
 *  1. In stable Chrome the whole advertisement API sits behind
 *     `chrome://flags/#enable-experimental-web-platform-features`. With the flag
 *     off, `watchAdvertisements()` rejects — so support is only knowable by
 *     trying* it. We surface that as `supported` (stays false until one watch
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

  let devices: BluetoothDevice[]
  try {
    devices = await navigator.bluetooth.getDevices()
  }
  catch (error) {
    log.warn('[presence] getDevices() failed', error)
    started = false
    return
  }

  for (const device of devices) {
    if (typeof device.watchAdvertisements !== 'function') {
      // No advertisement API on this device object at all.
      if (supported.value === null)
        supported.value = false
      continue
    }

    const handler = (ev: BluetoothAdvertisingEvent) => markSeen(device.id, ev.rssi ?? null)
    device.addEventListener('advertisementreceived', handler)

    if (device.watchingAdvertisements) {
      supported.value = true
      watchers.set(device.id, () => device.removeEventListener('advertisementreceived', handler))
      continue
    }

    const controller = new AbortController()
    try {
      await device.watchAdvertisements({ signal: controller.signal })
      supported.value = true
      watchers.set(device.id, () => {
        controller.abort()
        device.removeEventListener('advertisementreceived', handler)
      })
    }
    catch (error) {
      // Flag off / unsupported / already-watching race — clean up this one and
      // leave `supported` false unless another device proved otherwise.
      device.removeEventListener('advertisementreceived', handler)
      if (supported.value === null)
        supported.value = false
      log.debug('[presence] watchAdvertisements rejected', error)
    }
  }

  if (supported.value && !sweepTimer)
    sweepTimer = setInterval(sweep, SWEEP_INTERVAL_MS)
}

function stop() {
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

/**
 * Wait for a single advertisement from a specific device, up to `timeoutMs`.
 * Resolves `true` on the first packet, `false` on timeout. If the advertisement
 * API is unsupported (flag off / shim), resolves `true` — callers must NOT
 * treat "can't tell" as "absent", or they'd block the only working path.
 */
async function waitForPresence(device: BluetoothDevice, timeoutMs: number): Promise<boolean> {
  if (typeof device.watchAdvertisements !== 'function')
    return true

  // Already heard from it within the TTL → present.
  const known = presenceById[device.id]
  if (known?.inRange && Date.now() - known.lastAdAt <= PRESENCE_TTL_MS)
    return true

  return new Promise<boolean>((resolve) => {
    const controller = new AbortController()
    let settled = false
    let timer: ReturnType<typeof setTimeout>

    const onAd = (ev: BluetoothAdvertisingEvent) => {
      markSeen(device.id, ev.rssi ?? null)
      done(true)
    }

    function done(result: boolean) {
      if (settled)
        return
      settled = true
      device.removeEventListener('advertisementreceived', onAd)
      controller.abort()
      clearTimeout(timer)
      resolve(result)
    }

    timer = setTimeout(() => done(false), timeoutMs)
    device.addEventListener('advertisementreceived', onAd)
    device.watchAdvertisements({ signal: controller.signal }).catch(() => {
      // Flag off / unsupported — don't block the connect path.
      done(true)
    })
  })
}

export function useDevicePresence() {
  return { presenceById, supported, start, stop, waitForPresence }
}

export default useDevicePresence
