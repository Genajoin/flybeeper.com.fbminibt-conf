import type { CborValue } from './codec'
import { SmpGroup, SmpImageCmd, SmpOp } from './codec'
import type { SmpTransport } from './transport'
import { SmpError } from './transport'

/**
 * Image management (SMP group 1): read slot state, stream an image into the
 * secondary slot, mark it for the next boot, erase.
 *
 * The identifier every command works with is the **MCUboot image hash** —
 * SHA-256 over `header + payload + protected TLVs`, i.e. everything up to the
 * (unprotected) TLV area that carries the signature. It is NOT the SHA-256 of
 * the whole .bin file: that one includes the signature TLVs and matches
 * nothing the device reports.
 */

export interface ImageSlot {
  image: number
  slot: number
  version: string
  hash: Uint8Array
  bootable: boolean
  pending: boolean
  confirmed: boolean
  active: boolean
  permanent: boolean
}

export interface McubootImage {
  /** The bytes to upload, unchanged. */
  data: Uint8Array
  /** MCUboot image hash — what `imageStateWrite` and the slot listing use. */
  hash: Uint8Array
  headerSize: number
  imageSize: number
  protectedTlvSize: number
  /** Version from the MCUboot header; often 0.0.0 when the build does not set it. */
  version: string
}

const MCUBOOT_MAGIC = 0x96F3B83D
const IMAGE_TLV_SHA256 = 0x10

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export function sameHash(a: Uint8Array | null | undefined, b: Uint8Array | null | undefined): boolean {
  if (!a || !b || a.length !== b.length)
    return false
  return a.every((v, i) => v === b[i])
}

/**
 * Validate an `app_update.bin` and compute the hash the device will report.
 * Throws on anything that is not a signed MCUboot update image — a merged.hex
 * or a raw ELF-derived binary must never reach the upload path.
 */
export async function parseMcubootImage(input: ArrayBuffer | Uint8Array): Promise<McubootImage> {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (data.length < 32)
    throw new SmpError('Firmware file is too small to be an MCUboot image')

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const magic = view.getUint32(0, true)
  if (magic !== MCUBOOT_MAGIC)
    throw new SmpError('Not an MCUboot update image (bad magic) — use app_update.bin, not merged.hex')

  const headerSize = view.getUint16(8, true)
  const protectedTlvSize = view.getUint16(10, true)
  const imageSize = view.getUint32(12, true)
  const version = `${view.getUint8(20)}.${view.getUint8(21)}.${view.getUint16(22, true)}`

  const hashedLength = headerSize + imageSize + protectedTlvSize
  if (hashedLength > data.length)
    throw new SmpError('Firmware file is truncated (header describes more bytes than the file has)')

  const digest = await crypto.subtle.digest('SHA-256', data.slice(0, hashedLength))
  const hash = new Uint8Array(digest)

  // Cross-check against the SHA256 TLV MCUboot itself stores, when present.
  const tlvHash = readSha256Tlv(data, hashedLength)
  if (tlvHash && !sameHash(tlvHash, hash))
    throw new SmpError('Firmware file is inconsistent: computed hash does not match its SHA256 TLV')

  return { data, hash, headerSize, imageSize, protectedTlvSize, version }
}

function readSha256Tlv(data: Uint8Array, tlvOffset: number): Uint8Array | null {
  if (tlvOffset + 4 > data.length)
    return null
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const tlvTotal = view.getUint16(tlvOffset + 2, true)
  let p = tlvOffset + 4
  const end = Math.min(tlvOffset + tlvTotal, data.length)
  while (p + 4 <= end) {
    const type = view.getUint16(p, true)
    const len = view.getUint16(p + 2, true)
    if (type === IMAGE_TLV_SHA256 && len === 32 && p + 4 + len <= data.length)
      return data.slice(p + 4, p + 4 + len)
    p += 4 + len
  }
  return null
}

function toSlots(payload: Record<string, CborValue>): ImageSlot[] {
  const images = payload.images
  if (!Array.isArray(images))
    return []
  return images.map((raw) => {
    const o = raw as Record<string, CborValue>
    return {
      image: typeof o.image === 'number' ? o.image : 0,
      slot: typeof o.slot === 'number' ? o.slot : 0,
      version: typeof o.version === 'string' ? o.version : '',
      hash: o.hash instanceof Uint8Array ? o.hash : new Uint8Array(0),
      bootable: o.bootable === true,
      pending: o.pending === true,
      confirmed: o.confirmed === true,
      active: o.active === true,
      permanent: o.permanent === true,
    }
  })
}

export async function imageStateRead(t: SmpTransport, signal?: AbortSignal): Promise<ImageSlot[]> {
  const rsp = await t.request(SmpOp.Read, SmpGroup.Image, SmpImageCmd.State, {}, { signal })
  return toSlots(rsp)
}

/**
 * Mark an uploaded image for the next boot.
 *
 * `confirm: false` is the only mode this app uses: the image boots once on
 * trial and MCUboot reverts to the previous one unless the firmware confirms
 * itself. `confirm: true` would skip that safety net and leave a device that
 * fails to boot unrecoverable over the air.
 */
export async function imageStateWrite(
  t: SmpTransport,
  hash: Uint8Array,
  confirm = false,
  signal?: AbortSignal,
): Promise<ImageSlot[]> {
  const rsp = await t.request(
    SmpOp.Write,
    SmpGroup.Image,
    SmpImageCmd.State,
    { hash, confirm },
    { signal, timeoutMs: 30_000 },
  )
  return toSlots(rsp)
}

export async function imageErase(t: SmpTransport, slot?: number, signal?: AbortSignal): Promise<void> {
  await t.request(
    SmpOp.Write,
    SmpGroup.Image,
    SmpImageCmd.Erase,
    slot === undefined ? {} : { slot },
    { signal, timeoutMs: 60_000 },
  )
}

export interface UploadOptions {
  /** Bytes of firmware per SMP frame. Halved automatically if the device says no. */
  chunkSize?: number
  /** Image number for multi-image targets. Single-core FlyBeeper devices use 0. */
  imageNumber?: number
  onProgress?: (sent: number, total: number) => void
  signal?: AbortSignal
}

/**
 * Stream an image into the secondary slot.
 *
 * The device answers every chunk with the offset it has actually accepted, and
 * that answer — not our own counter — drives the next write. A device that
 * already holds part of this image (same hash, interrupted upload) answers the
 * first chunk with a non-zero offset, and the upload resumes from there.
 */
export async function imageUpload(t: SmpTransport, image: McubootImage, opts: UploadOptions = {}): Promise<void> {
  const total = image.data.length
  let chunkSize = Math.max(64, opts.chunkSize ?? 512)
  let imageNumber = opts.imageNumber ?? 0
  let offset = 0
  let firstChunkDone = false
  let attempts = 0

  opts.onProgress?.(0, total)

  while (offset < total) {
    opts.signal?.throwIfAborted()
    const end = Math.min(offset + chunkSize, total)
    const body: Record<string, CborValue> = {
      image: imageNumber,
      off: offset,
      data: image.data.slice(offset, end),
    }
    if (offset === 0) {
      body.len = total
      body.sha = image.hash
    }

    let rsp: Record<string, CborValue>
    try {
      rsp = await t.request(
        SmpOp.Write,
        SmpGroup.Image,
        SmpImageCmd.Upload,
        body,
        // The first chunk can block on a flash erase; later ones are quick.
        { signal: opts.signal, timeoutMs: offset === 0 ? 60_000 : 20_000 },
      )
    }
    catch (error) {
      if (opts.signal?.aborted || !(error instanceof SmpError))
        throw error

      // A device that rejects the very first chunk with image 0 may be a
      // multi-image target that numbers its application slot differently.
      if (!firstChunkDone && imageNumber === 0 && error.rc !== null) {
        imageNumber = 1
        continue
      }
      // "response too long" / "not enough memory" mean our frame does not fit
      // the device's SMP buffer — back off and retry the same offset.
      if ((error.rc === 2 || error.rc === 7) && chunkSize > 64) {
        chunkSize = Math.max(64, Math.floor(chunkSize / 2))
        continue
      }
      if (++attempts >= 3)
        throw error
      continue
    }

    firstChunkDone = true
    const accepted = typeof rsp.off === 'number' ? rsp.off : end
    if (accepted <= offset) {
      // No forward progress: the device keeps pointing at an offset we already
      // sent. Retry the same chunk a couple of times, then give up — resetting
      // the counter here would spin forever against a stuck device.
      if (++attempts >= 3)
        throw new SmpError(`Upload stalled at offset ${offset}`)
      continue
    }
    attempts = 0
    offset = accepted
    opts.onProgress?.(Math.min(offset, total), total)
  }
}
