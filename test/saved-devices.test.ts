import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// In-memory stand-in for idb-keyval so the store's hydrate/persist run without
// a real IndexedDB. The map persists across get/set within a test.
const idb = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idb.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    idb.set(key, value)
  }),
}))

const IDB_KEY = 'fb:saved-devices:v1'

// Imported after the mock is registered.
const { useSavedDevicesStore } = await import('../src/stores/saved-devices')

describe('savedDevices store', () => {
  beforeEach(() => {
    idb.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('remember() inserts a new device with defaults', () => {
    const store = useSavedDevicesStore()
    store.remember({ id: 'a', name: 'FBFV.1', firmware: '0.23.7' })
    expect(store.devices).toHaveLength(1)
    expect(store.devices[0]).toMatchObject({
      id: 'a',
      name: 'FBFV.1',
      nickname: null,
      lastFirmware: '0.23.7',
    })
    expect(typeof store.devices[0].lastSeenAt).toBe('number')
  })

  it('remember() upserts and preserves the nickname on a known device', () => {
    const store = useSavedDevicesStore()
    store.remember({ id: 'a', name: 'FBFV.1', firmware: '0.23.0' })
    store.setNickname('a', 'My vario')
    store.remember({ id: 'a', name: 'FBFV.1', firmware: '0.24.0' })
    expect(store.devices).toHaveLength(1)
    expect(store.devices[0].nickname).toBe('My vario')
    expect(store.devices[0].lastFirmware).toBe('0.24.0')
  })

  it('remember() leaves firmware untouched when omitted', () => {
    const store = useSavedDevicesStore()
    store.remember({ id: 'a', name: 'FBFV.1', firmware: '0.23.0' })
    store.remember({ id: 'a', name: 'FBFV.1' })
    expect(store.devices[0].lastFirmware).toBe('0.23.0')
  })

  it('setNickname() trims and nulls out blank input', () => {
    const store = useSavedDevicesStore()
    store.remember({ id: 'a', name: 'FBFV.1' })
    store.setNickname('a', '  Spaced  ')
    expect(store.devices[0].nickname).toBe('Spaced')
    store.setNickname('a', '   ')
    expect(store.devices[0].nickname).toBeNull()
  })

  it('sortedByLastSeen orders most-recent first without mutating devices', () => {
    const store = useSavedDevicesStore()
    store.devices = [
      { id: 'old', name: 'A', nickname: null, lastSeenAt: 100, lastFirmware: null },
      { id: 'new', name: 'B', nickname: null, lastSeenAt: 300, lastFirmware: null },
      { id: 'mid', name: 'C', nickname: null, lastSeenAt: 200, lastFirmware: null },
    ]
    expect(store.sortedByLastSeen.map(d => d.id)).toEqual(['new', 'mid', 'old'])
    // getter must not reorder the source array
    expect(store.devices.map(d => d.id)).toEqual(['old', 'new', 'mid'])
  })

  it('byId returns the device or null', () => {
    const store = useSavedDevicesStore()
    store.remember({ id: 'a', name: 'FBFV.1' })
    expect(store.byId('a')?.name).toBe('FBFV.1')
    expect(store.byId('missing')).toBeNull()
  })

  it('forget() and clear() remove devices', () => {
    const store = useSavedDevicesStore()
    store.remember({ id: 'a', name: 'A' })
    store.remember({ id: 'b', name: 'B' })
    store.forget('a')
    expect(store.devices.map(d => d.id)).toEqual(['b'])
    store.clear()
    expect(store.devices).toHaveLength(0)
  })

  it('hydrate() strips the legacy autoConnect key from stored records', async () => {
    // Simulate data persisted before the auto-connect feature was removed.
    idb.set(IDB_KEY, [
      { id: 'a', name: 'FBFV.1', nickname: 'Old', lastSeenAt: 5, lastFirmware: '0.23', autoConnect: true },
    ])
    const store = useSavedDevicesStore()
    await store.hydrate()
    expect(store.devices).toHaveLength(1)
    expect(store.devices[0]).toEqual({
      id: 'a',
      name: 'FBFV.1',
      nickname: 'Old',
      lastSeenAt: 5,
      lastFirmware: '0.23',
    })
    expect('autoConnect' in store.devices[0]).toBe(false)
  })

  it('hydrate() is idempotent', async () => {
    idb.set(IDB_KEY, [{ id: 'a', name: 'A', nickname: null, lastSeenAt: 1, lastFirmware: null }])
    const store = useSavedDevicesStore()
    await store.hydrate()
    await store.hydrate()
    expect(store.devices).toHaveLength(1)
  })

  it('persist() writes a JSON-safe snapshot to idb', async () => {
    const store = useSavedDevicesStore()
    store.remember({ id: 'a', name: 'A', firmware: '0.1' })
    await store.persist()
    const written = idb.get(IDB_KEY) as Array<Record<string, unknown>>
    expect(written).toHaveLength(1)
    expect(written[0].id).toBe('a')
    // Must be a plain clone, not a Pinia reactive proxy.
    expect(written[0]).not.toHaveProperty('__v_isRef')
  })
})
