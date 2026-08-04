import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// In-memory stand-in for idb-keyval — the settings store persists on every
// slot swap and we do not want a real IndexedDB in unit tests.
const idb = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idb.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    idb.set(key, value)
  }),
}))

const { useSettingsStore } = await import('../src/stores/settings')
const { BleCharacteristicImpl } = await import('../src/utils/BleCharacteristic')

const SINK_ON = 'b713f438-42fe-46fe-b052-371a3b9e433a' // int16, exponent -2, m/s
const CLIMB_ON = 'fcb14ed9-06e7-4a9e-b311-6eee676a2f48'
const CPF_UUID = '00002904-0000-1000-8000-00805f9b34fb'

function cpfDescriptor(format: number, exponent: number) {
  const buf = new ArrayBuffer(7)
  const dv = new DataView(buf)
  dv.setUint8(0, format)
  dv.setInt8(1, exponent)
  dv.setUint16(2, 0x2712, true) // m/s
  dv.setUint8(4, 1)
  return {
    uuid: CPF_UUID,
    readValue: vi.fn(async () => new DataView(buf)),
  }
}

/**
 * Minimal fake of a Web Bluetooth characteristic that actually stores what is
 * written to it, so read-back verification is meaningful.
 */
function fakeChar(opts: {
  uuid: string
  initial?: number
  format?: number
  exponent?: number
  withCpf?: boolean
  writable?: boolean
  readable?: boolean
  /** Simulate firmware that ACKs the write but keeps its old value. */
  ignoreWrites?: boolean
  /** Fail the first N reads (transient Android-style GATT failures). */
  failReads?: number
}) {
  const format = opts.format ?? 0x0E
  const exponent = opts.exponent ?? -2
  let stored: DataView<ArrayBuffer> = new DataView(new ArrayBuffer(2))
  stored.setInt16(0, opts.initial ?? -250, true)
  let readsToFail = opts.failReads ?? 0

  const char: any = {
    uuid: opts.uuid,
    properties: {
      read: opts.readable ?? true,
      write: opts.writable ?? true,
      notify: false,
    },
    service: { uuid: 'fss', device: { gatt: { connected: true } } },
    getDescriptors: vi.fn(async () =>
      opts.withCpf === false ? [] : [cpfDescriptor(format, exponent)],
    ),
    readValue: vi.fn(async () => {
      if (readsToFail-- > 0) {
        const err: any = new Error('GATT operation failed for unknown reason')
        err.name = 'NotSupportedError'
        throw err
      }
      return stored
    }),
    writeValue: vi.fn(async (v: DataView<ArrayBuffer>) => {
      if (!opts.ignoreWrites)
        stored = v
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  return { char, read: () => stored.getInt16(0, true) }
}

describe('bleCharacteristic write path', () => {
  it('writes the value and confirms it by reading back', async () => {
    const { char, read } = fakeChar({ uuid: SINK_ON })
    const ch = new BleCharacteristicImpl(char)
    await ch.initialize()
    expect(ch.isInitialized).toBe(true)
    expect(ch.formattedValue).toBe(-2.5)

    ch.formattedValue = -0.5
    await ch.setFormattedValue()

    expect(char.writeValue).toHaveBeenCalledTimes(1)
    expect(read()).toBe(-50)
  })

  it('throws when the device silently keeps its old value', async () => {
    const { char, read } = fakeChar({ uuid: SINK_ON, ignoreWrites: true })
    const ch = new BleCharacteristicImpl(char)
    await ch.initialize()

    ch.formattedValue = -0.5
    // The write is ACKed, the device ignores it. Before read-back
    // verification this resolved happily and the UI reported success.
    await expect(ch.setFormattedValue()).rejects.toThrow(/did not accept/)
    expect(read()).toBe(-250)
  })

  it('falls back to the static CPF when the descriptor cannot be read', async () => {
    const { char, read } = fakeChar({ uuid: SINK_ON, withCpf: false })
    const ch = new BleCharacteristicImpl(char)
    await ch.initialize()

    // No CPF from the device — but a write must still be possible, because a
    // format-less characteristic used to make every write a silent no-op.
    expect(ch.presentationFormatDescriptor).not.toBeNull()
    ch.formattedValue = -0.5
    await ch.setFormattedValue()
    expect(read()).toBe(-50)
  })

  it('retries a transient GATT read failure instead of giving up', async () => {
    const { char } = fakeChar({ uuid: CLIMB_ON, initial: 20, failReads: 2 })
    const ch = new BleCharacteristicImpl(char)
    await ch.initialize()
    expect(ch.isInitialized).toBe(true)
    expect(ch.formattedValue).toBe(0.2)
  })

  it('throws instead of no-op when the characteristic is not writable', async () => {
    const { char } = fakeChar({ uuid: SINK_ON, writable: false })
    const ch = new BleCharacteristicImpl(char)
    await ch.initialize()
    ch.formattedValue = -0.5
    await expect(ch.setFormattedValue()).rejects.toThrow(/not writable/)
  })

  it('rounds the exponent scaling instead of truncating', async () => {
    // 1.15 / 10**-2 is 114.99999999999999 in IEEE-754 — setInt16 truncated
    // that to 114, i.e. the device got 1.14 m/s.
    const { char, read } = fakeChar({ uuid: CLIMB_ON, initial: 20 })
    const ch = new BleCharacteristicImpl(char)
    await ch.initialize()
    ch.formattedValue = 1.15
    await ch.setFormattedValue()
    expect(read()).toBe(115)
  })
})

describe('settings store sync bookkeeping', () => {
  beforeEach(() => {
    idb.clear()
    setActivePinia(createPinia())
  })

  it('markSyncedKeys only marks the keys that were confirmed', () => {
    const s = useSettingsStore()
    s.applyDeviceSnapshot({ [SINK_ON]: -2.5, [CLIMB_ON]: 0.2 })
    s.updateLocal({ [SINK_ON]: -0.5, [CLIMB_ON]: 0.5 })

    // Only the sink threshold made it onto the wire.
    s.markSyncedKeys([SINK_ON])

    expect(s.lastDeviceSnapshot?.[SINK_ON]).toBe(-0.5)
    expect(s.lastDeviceSnapshot?.[CLIMB_ON]).toBe(0.2)
    expect(s.diff().map(d => d.key)).toEqual([CLIMB_ON])
  })

  it('ignores keys the device snapshot does not know', () => {
    const s = useSettingsStore()
    s.applyDeviceSnapshot({ [SINK_ON]: -2.5 })
    s.updateLocal({ [SINK_ON]: -2.5, [CLIMB_ON]: 0.2 })

    // CLIMB_ON was never read off the device (failed connect-time read).
    // Reporting it as a pending change produced the "↔ —" rows that no
    // Apply could clear.
    expect(s.diff()).toEqual([])
    expect(s.hasUnsyncedChanges).toBe(false)
  })

  it('drops non-setting keys such as the simulator value', () => {
    const s = useSettingsStore()
    s.replaceLocal({ [SINK_ON]: -2.5, buzzer_simulate_vario_value: 120 })
    s.applyDeviceSnapshot({ [SINK_ON]: -2.5 })

    expect(s.diff()).toEqual([])
    s.pruneLocal()
    expect(Object.keys(s.local ?? {})).toEqual([SINK_ON])
  })
})
