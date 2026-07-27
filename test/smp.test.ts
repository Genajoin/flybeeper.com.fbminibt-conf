import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it, vi } from 'vitest'
import {
  SMP_HEADER_SIZE,
  SmpGroup,
  SmpImageCmd,
  SmpOp,
  SmpTransport,
  cborDecode,
  cborEncode,
  decodeMessage,
  encodeMessage,
  hex,
  imageStateRead,
  imageUpload,
  parseMcubootImage,
  sameHash,
} from '../src/lib/smp'

// vitest runs with the project root as cwd (see vite.config.ts > test).
const FIRMWARE_DIR = path.resolve(process.cwd(), 'public/firmware/fbfv')

describe('cBOR subset used by SMP', () => {
  it('round-trips the payload of an image-upload chunk', () => {
    const payload = {
      image: 0,
      off: 4096,
      len: 189200,
      sha: Uint8Array.from([0xD8, 0xB8, 0xFF, 0xFE]),
      data: Uint8Array.from([1, 2, 3, 250, 255]),
    }
    const decoded = cborDecode(cborEncode(payload)) as typeof payload
    expect(decoded.image).toBe(0)
    expect(decoded.off).toBe(4096)
    expect(decoded.len).toBe(189200)
    expect(Array.from(decoded.sha)).toEqual([0xD8, 0xB8, 0xFF, 0xFE])
    expect(Array.from(decoded.data)).toEqual([1, 2, 3, 250, 255])
  })

  it('handles the value shapes an image-state reply is made of', () => {
    const reply = {
      images: [
        { slot: 0, version: '0.24.0', hash: Uint8Array.from([1, 2]), bootable: true, confirmed: true, pending: false, active: true, permanent: false },
      ],
      splitStatus: 0,
    }
    expect(cborDecode(cborEncode(reply))).toEqual(reply)
  })

  it('encodes negative integers and null', () => {
    expect(cborDecode(cborEncode({ rc: -1, x: null }))).toEqual({ rc: -1, x: null })
  })

  it('decodes a definite-length map produced by zcbor', () => {
    // { "rc": 0, "off": 512 } as zcbor would emit it
    const bytes = Uint8Array.from([0xA2, 0x62, 0x72, 0x63, 0x00, 0x63, 0x6F, 0x66, 0x66, 0x19, 0x02, 0x00])
    expect(cborDecode(bytes)).toEqual({ rc: 0, off: 512 })
  })
})

describe('sMP framing', () => {
  it('writes the 8-byte header big-endian and round-trips it', () => {
    const frame = encodeMessage(SmpOp.Write, SmpGroup.Image, SmpImageCmd.Upload, 7, { off: 0 })
    expect(frame[0]).toBe(SmpOp.Write)
    expect(frame[1]).toBe(0)
    // len is the CBOR body length, big-endian
    expect((frame[2] << 8) | frame[3]).toBe(frame.length - SMP_HEADER_SIZE)
    expect((frame[4] << 8) | frame[5]).toBe(SmpGroup.Image)
    expect(frame[6]).toBe(7)
    expect(frame[7]).toBe(SmpImageCmd.Upload)

    const msg = decodeMessage(frame)
    expect(msg.header.seq).toBe(7)
    expect(msg.payload).toEqual({ off: 0 })
  })
})

describe('mCUboot image parsing', () => {
  it('computes the hash the device reports for the published 0.24.0 image', async () => {
    const bin = await readFile(`${FIRMWARE_DIR}/app_update.0.24.0.bin`)
    const image = await parseMcubootImage(new Uint8Array(bin))
    // Header + payload + protected TLVs — NOT the sha256 of the whole file,
    // which would include the signature TLVs and match nothing on the device.
    expect(hex(image.hash)).toBe('d8b8fffe3651a75649e50c65c0d05e067479ed6e340ecfc9fcf436ca1a206b8b')
    expect(image.data.length).toBe(189200)
  })

  it('is not the sha256 of the file — the distinction the spec got wrong', async () => {
    const bin = new Uint8Array(await readFile(`${FIRMWARE_DIR}/app_update.0.24.0.bin`))
    const image = await parseMcubootImage(bin)
    const fileHash = new Uint8Array(await crypto.subtle.digest('SHA-256', bin))
    expect(hex(fileHash)).toBe('1546a5cb739d7b252b979a70f5e9da1b4f6d22316bc05a949dfbc1e28941cb6c')
    expect(hex(image.hash)).not.toBe(hex(fileHash))
  })

  it('rejects an image whose payload no longer matches its SHA256 TLV', async () => {
    const bin = new Uint8Array(await readFile(`${FIRMWARE_DIR}/app_update.0.24.0.bin`))
    bin[1024] ^= 0xFF
    await expect(parseMcubootImage(bin)).rejects.toThrow(/inconsistent/)
  })

  it('rejects a file that is not an MCUboot update image', async () => {
    await expect(parseMcubootImage(new Uint8Array(64))).rejects.toThrow(/MCUboot/)
  })

  it('rejects a truncated image', async () => {
    const bin = new Uint8Array(await readFile(`${FIRMWARE_DIR}/app_update.0.24.0.bin`))
    await expect(parseMcubootImage(bin.slice(0, 1024))).rejects.toThrow(/truncated/)
  })

  it('sameHash compares by content, not identity', () => {
    expect(sameHash(Uint8Array.from([1, 2, 3]), Uint8Array.from([1, 2, 3]))).toBe(true)
    expect(sameHash(Uint8Array.from([1, 2, 3]), Uint8Array.from([1, 2, 4]))).toBe(false)
    expect(sameHash(null, Uint8Array.from([1]))).toBe(false)
  })
})

/**
 * A fake characteristic that behaves like the device: it accepts writes in
 * chunks, reassembles a request, and answers with a notification — optionally
 * split across several notifications, which is what a long image-state reply
 * actually does over BLE.
 */
function fakeCharacteristic(respond: (req: ReturnType<typeof decodeMessage>) => Uint8Array, notifyChunk = 20) {
  const listeners: ((e: Event) => void)[] = []
  let rx = new Uint8Array(0)

  const characteristic = {
    properties: { writeWithoutResponse: true },
    value: undefined as DataView | undefined,
    addEventListener: (_: string, cb: (e: Event) => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: (e: Event) => void) => {
      const i = listeners.indexOf(cb)
      if (i >= 0)
        listeners.splice(i, 1)
    },
    startNotifications: vi.fn(async (): Promise<any> => characteristic),
    stopNotifications: vi.fn(async (): Promise<any> => characteristic),
    writeValueWithoutResponse: vi.fn(async (chunk: BufferSource) => {
      const bytes = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : new Uint8Array((chunk as ArrayBufferView).buffer)
      const merged = new Uint8Array(rx.length + bytes.length)
      merged.set(rx)
      merged.set(bytes, rx.length)
      rx = merged
      if (rx.length < SMP_HEADER_SIZE)
        return
      const total = SMP_HEADER_SIZE + ((rx[2] << 8) | rx[3])
      if (rx.length < total)
        return
      const request = decodeMessage(rx.slice(0, total))
      rx = rx.slice(total)
      const response = respond(request)
      for (let off = 0; off < response.length; off += notifyChunk) {
        const part = response.slice(off, off + notifyChunk)
        characteristic.value = new DataView(part.buffer, part.byteOffset, part.byteLength)
        for (const cb of [...listeners]) cb({ target: characteristic } as unknown as Event)
      }
    }),
  }
  return characteristic
}

describe('sMP transport', () => {
  it('reassembles a response split across notifications and matches it by seq', async () => {
    const hash = Uint8Array.from({ length: 32 }, (_, i) => i)
    const characteristic = fakeCharacteristic(req => encodeMessage(
      SmpOp.ReadRsp,
      req.header.group,
      req.header.id,
      req.header.seq,
      { images: [{ slot: 0, version: '0.24.0', hash, bootable: true, pending: false, confirmed: true, active: true, permanent: false }] },
    ))

    const transport = new SmpTransport(characteristic as unknown as BluetoothRemoteGATTCharacteristic, { writeChunkSize: 16 })
    await transport.start()
    const slots = await imageStateRead(transport)

    expect(slots).toHaveLength(1)
    expect(slots[0].version).toBe('0.24.0')
    expect(slots[0].confirmed).toBe(true)
    expect(sameHash(slots[0].hash, hash)).toBe(true)
    await transport.stop()
  })

  it('splits a long request across writes and drives the upload by the offset the device reports', async () => {
    const firmware = new Uint8Array(await readFile(`${FIRMWARE_DIR}/app_update.0.24.0.bin`))
    const image = await parseMcubootImage(firmware)
    const received: number[] = []
    let firstChunkSaw: { len?: number, sha?: string } = {}

    const characteristic = fakeCharacteristic((req) => {
      const body = req.payload as { off: number, data: Uint8Array, len?: number, sha?: Uint8Array }
      if (body.off === 0)
        firstChunkSaw = { len: body.len, sha: body.sha ? hex(body.sha) : undefined }
      received.push(body.data.length)
      return encodeMessage(SmpOp.WriteRsp, req.header.group, req.header.id, req.header.seq, {
        rc: 0,
        off: body.off + body.data.length,
      })
    })

    const transport = new SmpTransport(characteristic as unknown as BluetoothRemoteGATTCharacteristic, { writeChunkSize: 244 })
    await transport.start()
    let lastProgress = 0
    await imageUpload(transport, image, {
      chunkSize: 1024,
      onProgress: (sent, total) => {
        expect(sent).toBeLessThanOrEqual(total)
        lastProgress = sent
      },
    })
    await transport.stop()

    // Whole image transferred, first frame carried len + the MCUboot hash.
    expect(received.reduce((a, b) => a + b, 0)).toBe(image.data.length)
    expect(lastProgress).toBe(image.data.length)
    expect(firstChunkSaw.len).toBe(image.data.length)
    expect(firstChunkSaw.sha).toBe(hex(image.hash))
    // 1024-byte payloads over 244-byte writes → several writes per SMP frame.
    expect(characteristic.writeValueWithoutResponse.mock.calls.length).toBeGreaterThan(received.length)
  })

  it('gives up instead of spinning when the device stops making progress', async () => {
    const firmware = new Uint8Array(await readFile(`${FIRMWARE_DIR}/app_update.0.24.0.bin`))
    const image = await parseMcubootImage(firmware)
    let calls = 0

    // Always answers "I am still at 0" — the pathological case.
    const characteristic = fakeCharacteristic((req) => {
      calls++
      return encodeMessage(SmpOp.WriteRsp, req.header.group, req.header.id, req.header.seq, { rc: 0, off: 0 })
    })

    const transport = new SmpTransport(characteristic as unknown as BluetoothRemoteGATTCharacteristic)
    await transport.start()
    await expect(imageUpload(transport, image, { chunkSize: 4096 })).rejects.toThrow(/stalled/)
    expect(calls).toBeLessThan(10)
    await transport.stop()
  })

  it('resumes from the offset a device reports when it already holds part of the image', async () => {
    const firmware = new Uint8Array(await readFile(`${FIRMWARE_DIR}/app_update.0.24.0.bin`))
    const image = await parseMcubootImage(firmware)
    const offsets: number[] = []
    const alreadyHave = 100_000

    const characteristic = fakeCharacteristic((req) => {
      const body = req.payload as { off: number, data: Uint8Array }
      offsets.push(body.off)
      const accepted = body.off === 0 ? alreadyHave : body.off + body.data.length
      return encodeMessage(SmpOp.WriteRsp, req.header.group, req.header.id, req.header.seq, { rc: 0, off: accepted })
    })

    const transport = new SmpTransport(characteristic as unknown as BluetoothRemoteGATTCharacteristic)
    await transport.start()
    await imageUpload(transport, image, { chunkSize: 4096 })
    await transport.stop()

    expect(offsets[0]).toBe(0)
    expect(offsets[1]).toBe(alreadyHave)
    expect(offsets[offsets.length - 1]).toBeLessThan(image.data.length)
  })

  it('surfaces a non-zero rc as an error', async () => {
    const characteristic = fakeCharacteristic(req => encodeMessage(
      SmpOp.WriteRsp,
      req.header.group,
      req.header.id,
      req.header.seq,
      { rc: 3 },
    ))
    const transport = new SmpTransport(characteristic as unknown as BluetoothRemoteGATTCharacteristic)
    await transport.start()
    await expect(imageStateRead(transport)).rejects.toThrow(/rc 3/)
    await transport.stop()
  })

  it('times out instead of hanging when the device stays silent', async () => {
    const characteristic = fakeCharacteristic(() => new Uint8Array(0))
    const transport = new SmpTransport(characteristic as unknown as BluetoothRemoteGATTCharacteristic, { timeoutMs: 50 })
    await transport.start()
    await expect(imageStateRead(transport)).rejects.toThrow(/timed out/)
    await transport.stop()
  })
})
