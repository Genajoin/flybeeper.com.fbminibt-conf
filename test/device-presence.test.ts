import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDevicePresence } from '../src/composables/useDevicePresence'

// Minimal fake BluetoothDevice that records advertisement listeners and lets a
// test fire an `advertisementreceived` event with a given rssi.
interface FakeDevice {
  id: string
  name: string
  watchingAdvertisements: boolean
  watchAdvertisements?: (opts?: { signal?: AbortSignal }) => Promise<void>
  addEventListener: (type: string, cb: (ev: any) => void) => void
  removeEventListener: (type: string, cb: (ev: any) => void) => void
  emit: (rssi: number) => void
}

function makeDevice(id: string, opts: {
  hasWatch?: boolean
  watchRejects?: boolean
  alreadyWatching?: boolean
} = {}): FakeDevice {
  const { hasWatch = true, watchRejects = false, alreadyWatching = false } = opts
  const listeners = new Set<(ev: any) => void>()
  const dev: FakeDevice = {
    id,
    name: id,
    watchingAdvertisements: alreadyWatching,
    addEventListener: (type, cb) => {
      if (type === 'advertisementreceived')
        listeners.add(cb)
    },
    removeEventListener: (type, cb) => {
      if (type === 'advertisementreceived')
        listeners.delete(cb)
    },
    emit: (rssi) => {
      for (const cb of [...listeners])
        cb({ rssi })
    },
  }
  if (hasWatch) {
    dev.watchAdvertisements = vi.fn(async () => {
      if (watchRejects)
        throw new Error('flag off')
    })
  }
  return dev
}

function setNavigator(getDevices: undefined | (() => Promise<any[]>)) {
  ;(globalThis as any).navigator = getDevices
    ? { bluetooth: { getDevices } }
    : { bluetooth: {} }
}

describe('useDevicePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Reset the module-level singleton between tests.
    useDevicePresence().stop()
    vi.clearAllTimers()
    vi.useRealTimers()
    delete (globalThis as any).navigator
  })

  it('marks a device in range on an advertisement and exposes rssi', async () => {
    const dev = makeDevice('a')
    setNavigator(async () => [dev])
    const { presenceById, supported, start } = useDevicePresence()

    await start()
    expect(supported.value).toBe(true)
    expect(presenceById.a?.inRange).toBeFalsy()

    dev.emit(-55)
    expect(presenceById.a.inRange).toBe(true)
    expect(presenceById.a.rssi).toBe(-55)
  })

  it('drops a device out of range after the TTL sweep', async () => {
    const dev = makeDevice('a')
    setNavigator(async () => [dev])
    const { presenceById, start } = useDevicePresence()
    await start()

    dev.emit(-40)
    expect(presenceById.a.inRange).toBe(true)

    // Advance past PRESENCE_TTL_MS (11s); the 3s sweep flips it out of range.
    await vi.advanceTimersByTimeAsync(12_000)
    expect(presenceById.a.inRange).toBe(false)
  })

  it('keeps a device in range while advertisements keep arriving', async () => {
    const dev = makeDevice('a')
    setNavigator(async () => [dev])
    const { presenceById, start } = useDevicePresence()
    await start()

    dev.emit(-40)
    await vi.advanceTimersByTimeAsync(6_000)
    dev.emit(-42) // refresh within the TTL window
    await vi.advanceTimersByTimeAsync(6_000)
    expect(presenceById.a.inRange).toBe(true)
  })

  it('sets supported=false when getDevices is unavailable', async () => {
    setNavigator(undefined)
    const { supported, start } = useDevicePresence()
    await start()
    expect(supported.value).toBe(false)
  })

  it('sets supported=false when watchAdvertisements rejects (flag off)', async () => {
    const dev = makeDevice('a', { watchRejects: true })
    setNavigator(async () => [dev])
    const { supported, presenceById, start } = useDevicePresence()
    await start()
    expect(supported.value).toBe(false)
    expect(presenceById.a?.inRange).toBeFalsy()
  })

  it('honours a device already watching without re-arming the watch', async () => {
    const dev = makeDevice('a', { alreadyWatching: true })
    setNavigator(async () => [dev])
    const { supported, presenceById, start } = useDevicePresence()
    await start()
    expect(dev.watchAdvertisements).not.toHaveBeenCalled()
    expect(supported.value).toBe(true)
    dev.emit(-60)
    expect(presenceById.a.inRange).toBe(true)
  })

  it('stop() clears in-range flags and detaches listeners', async () => {
    const dev = makeDevice('a')
    setNavigator(async () => [dev])
    const { presenceById, start, stop } = useDevicePresence()
    await start()
    dev.emit(-50)
    expect(presenceById.a.inRange).toBe(true)

    stop()
    expect(presenceById.a.inRange).toBe(false)
    // Listener detached: a late advertisement must not revive it.
    dev.emit(-50)
    expect(presenceById.a.inRange).toBe(false)
  })

  it('a stop() during an in-flight start() leaves no live watchers (generation guard)', async () => {
    const dev = makeDevice('a')
    let resolveGet: (v: any[]) => void = () => {}
    const getDevices = () => new Promise<any[]>((r) => {
      resolveGet = r
    })
    setNavigator(getDevices)
    const { presenceById, start, stop } = useDevicePresence()

    const startPromise = start() // suspends on getDevices()
    stop() // invalidates this generation before devices resolve
    resolveGet([dev])
    await startPromise

    // The aborted pass must not have wired the device up.
    dev.emit(-50)
    expect(presenceById.a?.inRange).toBeFalsy()
  })
})
