/**
 * SMP (Simple Management Protocol) framing + the CBOR subset MCUmgr uses.
 *
 * Deliberately dependency-free and framework-free: this module is meant to be
 * copied as-is into the maps app when the configurator folds into it. Nothing
 * here touches Vue, Pinia or the DOM.
 *
 * Frame layout (8-byte header, big-endian lengths, then a CBOR map):
 *
 *   byte 0    op       0 = read, 1 = read-rsp, 2 = write, 3 = write-rsp
 *   byte 1    flags    0
 *   byte 2-3  len      CBOR payload length
 *   byte 4-5  group    0 = OS management, 1 = image management
 *   byte 6    seq      request id, echoed back in the response
 *   byte 7    id       command within the group
 */

export const SMP_HEADER_SIZE = 8

export enum SmpOp {
  Read = 0,
  ReadRsp = 1,
  Write = 2,
  WriteRsp = 3,
}

export enum SmpGroup {
  Os = 0,
  Image = 1,
}

export enum SmpOsCmd {
  Echo = 0,
  Reset = 5,
  McumgrParams = 6,
}

export enum SmpImageCmd {
  State = 0,
  Upload = 1,
  Erase = 5,
}

export interface SmpHeader {
  op: SmpOp
  flags: number
  len: number
  group: number
  seq: number
  id: number
}

export interface SmpMessage {
  header: SmpHeader
  payload: CborValue
}

export type CborValue =
  | number
  | bigint
  | string
  | boolean
  | null
  | Uint8Array
  | CborValue[]
  | { [key: string]: CborValue }

export function encodeHeader(h: SmpHeader): Uint8Array {
  const out = new Uint8Array(SMP_HEADER_SIZE)
  const view = new DataView(out.buffer)
  view.setUint8(0, h.op)
  view.setUint8(1, h.flags)
  view.setUint16(2, h.len, false)
  view.setUint16(4, h.group, false)
  view.setUint8(6, h.seq)
  view.setUint8(7, h.id)
  return out
}

export function decodeHeader(buf: Uint8Array): SmpHeader {
  if (buf.length < SMP_HEADER_SIZE)
    throw new Error(`SMP header truncated (${buf.length} bytes)`)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  return {
    op: view.getUint8(0),
    flags: view.getUint8(1),
    len: view.getUint16(2, false),
    group: view.getUint16(4, false),
    seq: view.getUint8(6),
    id: view.getUint8(7),
  }
}

/** Header + CBOR payload in one buffer, ready to be written to the SMP characteristic. */
export function encodeMessage(
  op: SmpOp,
  group: number,
  id: number,
  seq: number,
  payload: CborValue,
): Uint8Array {
  const body = cborEncode(payload)
  const head = encodeHeader({ op, flags: 0, len: body.length, group, seq, id })
  const out = new Uint8Array(head.length + body.length)
  out.set(head, 0)
  out.set(body, head.length)
  return out
}

export function decodeMessage(buf: Uint8Array): SmpMessage {
  const header = decodeHeader(buf)
  const body = buf.subarray(SMP_HEADER_SIZE, SMP_HEADER_SIZE + header.len)
  // A zero-length body is legal (some responses carry no CBOR at all).
  const payload = body.length ? cborDecode(body) : {}
  return { header, payload }
}

// ---------------------------------------------------------------------------
// CBOR — only what SMP actually puts on the wire: flat maps of ints, strings,
// byte strings and booleans, plus arrays of such maps in the image-state reply.
// ---------------------------------------------------------------------------

export function cborEncode(value: CborValue): Uint8Array {
  const parts: number[] = []
  writeValue(parts, value)
  return Uint8Array.from(parts)
}

function writeTypeAndLength(out: number[], major: number, length: number): void {
  const mt = major << 5
  if (length < 24) {
    out.push(mt | length)
  }
  else if (length < 0x100) {
    out.push(mt | 24, length)
  }
  else if (length < 0x10000) {
    out.push(mt | 25, length >> 8, length & 0xFF)
  }
  else {
    out.push(mt | 26, (length >>> 24) & 0xFF, (length >>> 16) & 0xFF, (length >>> 8) & 0xFF, length & 0xFF)
  }
}

function writeValue(out: number[], value: CborValue): void {
  if (value === null) {
    out.push(0xF6)
    return
  }
  if (typeof value === 'boolean') {
    out.push(value ? 0xF5 : 0xF4)
    return
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    const n = typeof value === 'bigint' ? Number(value) : value
    if (!Number.isInteger(n))
      throw new TypeError(`CBOR: non-integer number ${n} is not supported by this codec`)
    if (n >= 0)
      writeTypeAndLength(out, 0, n)
    else
      writeTypeAndLength(out, 1, -n - 1)
    return
  }
  if (typeof value === 'string') {
    const bytes = new TextEncoder().encode(value)
    writeTypeAndLength(out, 3, bytes.length)
    for (const b of bytes) out.push(b)
    return
  }
  if (value instanceof Uint8Array) {
    writeTypeAndLength(out, 2, value.length)
    for (const b of value) out.push(b)
    return
  }
  if (Array.isArray(value)) {
    writeTypeAndLength(out, 4, value.length)
    for (const item of value) writeValue(out, item)
    return
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined) as [string, CborValue][]
  writeTypeAndLength(out, 5, entries.length)
  for (const [k, v] of entries) {
    writeValue(out, k)
    writeValue(out, v)
  }
}

class CborReader {
  private pos = 0
  constructor(private readonly buf: Uint8Array) {}

  get done(): boolean {
    return this.pos >= this.buf.length
  }

  private byte(): number {
    if (this.pos >= this.buf.length)
      throw new Error('CBOR: unexpected end of input')
    return this.buf[this.pos++]
  }

  private bytes(n: number): Uint8Array {
    if (this.pos + n > this.buf.length)
      throw new Error('CBOR: unexpected end of input')
    const out = this.buf.subarray(this.pos, this.pos + n)
    this.pos += n
    return out
  }

  /** Returns the argument of the initial byte, or null for indefinite length. */
  private argument(ai: number): number | null {
    if (ai < 24)
      return ai
    if (ai === 24)
      return this.byte()
    if (ai === 25)
      return (this.byte() << 8) | this.byte()
    if (ai === 26)
      return ((this.byte() << 24) >>> 0) + (this.byte() << 16) + (this.byte() << 8) + this.byte()
    if (ai === 27) {
      // 64-bit: SMP never needs the top half, and Number keeps 53 bits exactly.
      const hi = ((this.byte() << 24) >>> 0) + (this.byte() << 16) + (this.byte() << 8) + this.byte()
      const lo = ((this.byte() << 24) >>> 0) + (this.byte() << 16) + (this.byte() << 8) + this.byte()
      return hi * 0x100000000 + lo
    }
    if (ai === 31)
      return null
    throw new Error(`CBOR: reserved additional info ${ai}`)
  }

  read(): CborValue {
    const initial = this.byte()
    const major = initial >> 5
    const ai = initial & 0x1F
    switch (major) {
      case 0:
        return this.argument(ai) as number
      case 1:
        return -1 - (this.argument(ai) as number)
      case 2: {
        const len = this.argument(ai)
        if (len === null)
          return this.readIndefiniteBytes()
        // Copy: the caller may outlive the notification buffer we decode from.
        return Uint8Array.from(this.bytes(len))
      }
      case 3: {
        const len = this.argument(ai)
        if (len === null)
          return new TextDecoder().decode(this.readIndefiniteBytes())
        return new TextDecoder().decode(this.bytes(len))
      }
      case 4: {
        const len = this.argument(ai)
        const arr: CborValue[] = []
        if (len === null) {
          while (!this.atBreak()) arr.push(this.read())
          this.byte()
          return arr
        }
        for (let i = 0; i < len; i++) arr.push(this.read())
        return arr
      }
      case 5: {
        const len = this.argument(ai)
        const map: { [key: string]: CborValue } = {}
        if (len === null) {
          while (!this.atBreak()) {
            const k = this.read()
            map[String(k)] = this.read()
          }
          this.byte()
          return map
        }
        for (let i = 0; i < len; i++) {
          const k = this.read()
          map[String(k)] = this.read()
        }
        return map
      }
      case 6:
        // Tag — skip it and return the tagged value; SMP does not use tags.
        this.argument(ai)
        return this.read()
      case 7: {
        if (ai === 20)
          return false
        if (ai === 21)
          return true
        if (ai === 22)
          return null
        if (ai === 23)
          return null // undefined
        if (ai === 25)
          return decodeFloat16(this.bytes(2))
        if (ai === 26)
          return new DataView(Uint8Array.from(this.bytes(4)).buffer).getFloat32(0, false)
        if (ai === 27)
          return new DataView(Uint8Array.from(this.bytes(8)).buffer).getFloat64(0, false)
        throw new Error(`CBOR: unsupported simple value ${ai}`)
      }
      default:
        throw new Error(`CBOR: unsupported major type ${major}`)
    }
  }

  private atBreak(): boolean {
    return this.buf[this.pos] === 0xFF
  }

  private readIndefiniteBytes(): Uint8Array {
    const chunks: Uint8Array[] = []
    while (!this.atBreak()) {
      const chunk = this.read()
      if (!(chunk instanceof Uint8Array))
        throw new TypeError('CBOR: indefinite string with a non-string chunk')
      chunks.push(chunk)
    }
    this.byte()
    const total = chunks.reduce((n, c) => n + c.length, 0)
    const out = new Uint8Array(total)
    let off = 0
    for (const c of chunks) {
      out.set(c, off)
      off += c.length
    }
    return out
  }
}

function decodeFloat16(bytes: Uint8Array): number {
  const half = (bytes[0] << 8) | bytes[1]
  const exp = (half >> 10) & 0x1F
  const frac = half & 0x3FF
  const sign = half & 0x8000 ? -1 : 1
  if (exp === 0)
    return sign * 2 ** -24 * frac
  if (exp === 0x1F)
    return frac ? Number.NaN : sign * Number.POSITIVE_INFINITY
  return sign * 2 ** (exp - 25) * (frac + 1024)
}

export function cborDecode(buf: Uint8Array): CborValue {
  return new CborReader(buf).read()
}
