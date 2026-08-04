import log from 'loglevel'

/**
 * Serialises GATT operations across the whole app.
 *
 * A BLE central can only have ONE GATT request outstanding at a time — the
 * radio is shared, and Android's stack in particular fails hard (or silently
 * drops) when a second request arrives before the first completes. Desktop
 * Chrome on BlueZ hides this because BlueZ queues internally; Chrome on
 * Android does not, which is why the connect-time burst of
 * `Promise.allSettled(chars.map(c => c.initialize()))` — ~20 characteristics
 * × (getDescriptors + CUD read + CPF read + value read) ≈ 80 concurrent
 * operations — comes back partially empty there.
 *
 * Same role as `GattQueue` in packages/ble-protocol (maps app); duplicated
 * here because the configurator does not depend on that workspace package.
 */
export class GattQueue {
  private tail: Promise<unknown> = Promise.resolve()

  /** Run `op` after every previously enqueued operation has settled. */
  enqueue<T>(op: () => Promise<T> | T): Promise<T> {
    const run = this.tail.then(() => op())
    // Failures propagate to the enqueue() caller but must not poison the
    // chain for subsequent operations.
    this.tail = run.catch(() => undefined)
    return run
  }
}

/** Process-wide queue — one radio, one queue. */
export const gattQueue = new GattQueue()

/**
 * Errors worth a second try: the link is up but the stack refused this
 * particular request (busy, transient discovery race). A disconnected GATT
 * server is NOT retryable — bail immediately so a dead link fails fast.
 */
function isRetryable(err: unknown): boolean {
  const name = (err as DOMException | undefined)?.name
  return name === 'NotSupportedError' || name === 'NetworkError' || name === 'OperationError'
}

/**
 * Enqueue `op`, retrying transient GATT failures with a short backoff.
 *
 * Retries matter as much as the queue itself: on Android the first request
 * after connect frequently fails while CoreBluetooth/BlueDroid finishes
 * discovery, and the old code turned that single failure into a permanently
 * value-less characteristic (no CPF → every later write silently no-ops).
 */
export async function gattOp<T>(label: string, op: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await gattQueue.enqueue(op)
    }
    catch (err) {
      lastErr = err
      if (!isRetryable(err) || attempt === attempts)
        break
      log.debug(`gatt ${label} attempt ${attempt} failed, retrying`, err)
      await new Promise(resolve => setTimeout(resolve, 120 * attempt))
    }
  }
  throw lastErr
}
