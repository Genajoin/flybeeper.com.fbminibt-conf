import type { CborValue, SmpMessage } from './codec'
import { SMP_HEADER_SIZE, SmpOp, decodeHeader, decodeMessage, encodeMessage } from './codec'

/**
 * SMP over Bluetooth LE: one characteristic carries both requests (write) and
 * responses (notify). Requests are serialised — the device processes one at a
 * time — and responses are matched back by the `seq` byte.
 *
 * The only thing this needs from the outside world is the characteristic
 * object, so the module stays portable across apps (no Vue, no Pinia, no DOM
 * beyond the Web Bluetooth types).
 */

/** FlyBeeper devices expose the standard MCUmgr SMP service. */
export const SMP_SERVICE_UUID = '8d53dc1d-1db7-4cd3-868b-8a527460aa84'
export const SMP_CHARACTERISTIC_UUID = 'da2e7828-fbce-4e01-ae9e-261174997c48'

export interface SmpTransportOptions {
  /**
   * Bytes per GATT write. Web Bluetooth exposes no MTU, so this is the
   * conservative floor that works on every browser we support (ATT MTU 247 →
   * 244 usable). The device reassembles a long SMP frame from several writes
   * (CONFIG_MCUMGR_TRANSPORT_BT_REASSEMBLY), so a small write size costs
   * throughput but never correctness.
   */
  writeChunkSize?: number
  /** Per-request timeout. Flash erase inside an upload can take a while. */
  timeoutMs?: number
}

export class SmpError extends Error {
  constructor(
    message: string,
    readonly rc: number | null = null,
    readonly group: number | null = null,
  ) {
    super(message)
    this.name = 'SmpError'
  }
}

export class SmpTransport {
  private readonly characteristic: BluetoothRemoteGATTCharacteristic
  private readonly writeChunkSize: number
  private readonly timeoutMs: number

  private seq = 0
  private rxBuffer = new Uint8Array(0)
  private pending: Map<number, {
    resolve: (msg: SmpMessage) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
  }> = new Map()

  /** Serialises requests: each one waits for the previous to settle. */
  private queue: Promise<unknown> = Promise.resolve()
  private started = false
  private readonly onNotify = (event: Event) => this.handleNotification(event)

  constructor(characteristic: BluetoothRemoteGATTCharacteristic, options: SmpTransportOptions = {}) {
    this.characteristic = characteristic
    this.writeChunkSize = options.writeChunkSize ?? 244
    this.timeoutMs = options.timeoutMs ?? 20_000
  }

  async start(): Promise<void> {
    if (this.started)
      return
    this.characteristic.addEventListener('characteristicvaluechanged', this.onNotify)
    await this.characteristic.startNotifications()
    this.started = true
  }

  async stop(): Promise<void> {
    if (!this.started)
      return
    this.started = false
    this.characteristic.removeEventListener('characteristicvaluechanged', this.onNotify)
    try {
      await this.characteristic.stopNotifications()
    }
    catch {
      // Link already gone (e.g. right after an OS reset) — nothing to unsubscribe.
    }
    this.failAllPending(new SmpError('SMP transport closed'))
  }

  /**
   * Send one command and resolve with the device's response. Rejects with
   * SmpError on timeout, on a torn-down link, or when the response carries a
   * non-zero result code (`rc`, or the SMP v2 `err` map).
   */
  async request(
    op: SmpOp,
    group: number,
    id: number,
    payload: CborValue = {},
    opts: { timeoutMs?: number, signal?: AbortSignal } = {},
  ): Promise<Record<string, CborValue>> {
    const run = async () => {
      opts.signal?.throwIfAborted()
      const seq = this.nextSeq()
      const frame = encodeMessage(op, group, id, seq, payload)
      const response = this.waitFor(seq, opts.timeoutMs ?? this.timeoutMs)
      try {
        await this.write(frame, opts.signal)
      }
      catch (error) {
        this.settle(seq, null, error instanceof Error ? error : new Error(String(error)))
        throw error
      }
      const msg = await response
      return unwrap(msg)
    }
    // Chain onto the queue regardless of whether the previous request failed.
    const chained = this.queue.then(run, run)
    this.queue = chained.catch(() => undefined)
    return chained
  }

  private nextSeq(): number {
    const s = this.seq
    this.seq = (this.seq + 1) & 0xFF
    return s
  }

  private waitFor(seq: number, timeoutMs: number): Promise<SmpMessage> {
    return new Promise<SmpMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(seq)
        reject(new SmpError(`SMP request timed out after ${timeoutMs} ms`))
      }, timeoutMs)
      this.pending.set(seq, { resolve, reject, timer })
    })
  }

  private settle(seq: number, msg: SmpMessage | null, err?: Error): void {
    const entry = this.pending.get(seq)
    if (!entry)
      return
    this.pending.delete(seq)
    clearTimeout(entry.timer)
    if (err)
      entry.reject(err)
    else if (msg)
      entry.resolve(msg)
  }

  private failAllPending(err: Error): void {
    for (const [seq] of this.pending)
      this.settle(seq, null, err)
  }

  private async write(frame: Uint8Array, signal?: AbortSignal): Promise<void> {
    const useWithoutResponse
      = this.characteristic.properties?.writeWithoutResponse !== false
      && typeof this.characteristic.writeValueWithoutResponse === 'function'

    for (let offset = 0; offset < frame.length; offset += this.writeChunkSize) {
      signal?.throwIfAborted()
      // Copy the slice: some Web Bluetooth implementations keep a reference to
      // the buffer, and subarray() would hand them a view over the whole frame.
      const chunk = frame.slice(offset, offset + this.writeChunkSize)
      if (useWithoutResponse)
        await this.characteristic.writeValueWithoutResponse(chunk)
      else
        await this.characteristic.writeValue(chunk)
    }
  }

  private handleNotification(event: Event): void {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value
    if (!value)
      return
    const incoming = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    const merged = new Uint8Array(this.rxBuffer.length + incoming.length)
    merged.set(this.rxBuffer, 0)
    merged.set(incoming, this.rxBuffer.length)
    this.rxBuffer = merged

    // A long response arrives as several notifications; assemble by header len.
    while (this.rxBuffer.length >= SMP_HEADER_SIZE) {
      const header = decodeHeader(this.rxBuffer)
      const total = SMP_HEADER_SIZE + header.len
      if (this.rxBuffer.length < total)
        return
      const frame = this.rxBuffer.slice(0, total)
      this.rxBuffer = this.rxBuffer.slice(total)
      try {
        this.settle(header.seq, decodeMessage(frame))
      }
      catch (error) {
        this.settle(header.seq, null, error instanceof Error ? error : new Error(String(error)))
      }
    }
  }
}

/** MCUmgr result codes we surface by name; everything else shows as a number. */
export const MGMT_ERR: Record<number, string> = {
  0: 'OK',
  1: 'unknown error',
  2: 'not enough memory',
  3: 'invalid value',
  4: 'timeout',
  5: 'no entry',
  6: 'not supported by the device',
  7: 'response too long',
  8: 'busy',
  9: 'access denied',
  10: 'unsupported protocol version',
}

function unwrap(msg: SmpMessage): Record<string, CborValue> {
  const payload = (msg.payload ?? {}) as Record<string, CborValue>

  // SMP v2 style error: { err: { group, rc } }.
  const err = payload.err as { group?: number, rc?: number } | undefined
  if (err && typeof err === 'object' && typeof err.rc === 'number' && err.rc !== 0) {
    throw new SmpError(
      `Device rejected the command (group ${err.group ?? '?'}, rc ${err.rc})`,
      err.rc,
      err.group ?? null,
    )
  }

  const rc = payload.rc
  if (typeof rc === 'number' && rc !== 0)
    throw new SmpError(`Device rejected the command (rc ${rc}: ${MGMT_ERR[rc] ?? 'unknown'})`, rc)

  if (msg.header.op !== SmpOp.ReadRsp && msg.header.op !== SmpOp.WriteRsp)
    throw new SmpError(`Unexpected SMP op ${msg.header.op} in a response`)

  return payload
}
