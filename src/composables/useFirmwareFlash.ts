import { computed, ref, watch } from 'vue'
import type { ImageSlot, McubootImage } from '~/lib/smp'
import { needsPermanentSwap } from '~/utils/firmwareVersion'
import {
  SmpError,
  SmpTransport,
  hex,
  imageStateRead,
  imageStateWrite,
  imageUpload,
  mcumgrParams,
  osReset,
  parseMcubootImage,
  sameHash,
} from '~/lib/smp'

/**
 * Firmware update over the already-open Bluetooth connection (SMP / MCUmgr).
 *
 * Thin wrapper over `~/lib/smp`: it owns the UI-facing state machine, the
 * progress number and the error text, and nothing else. The protocol itself
 * lives in the portable module.
 *
 * The flow deliberately mirrors what a native MCUmgr client does:
 *   read slots → upload → mark pending → verify the mark landed → reboot →
 *   reconnect → verify slot 0 runs the new image and confirmed itself.
 *   Skipping the two verification reads would turn "the file went through"
 *   into "the update worked", which are not the same thing.
 *
 * The mark is a trial boot (`confirm: false`, MCUboot reverts unless the new
 * firmware confirms itself) on firmware from FW_TRIAL_BOOT_SAFE_FROM on, and a
 * permanent one on anything older — see needsPermanentSwap() for why trial
 * boot cannot work there.
 */

export type FlashPhase =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'marking'
  | 'rebooting'
  | 'awaiting-reconnect'
  | 'verifying'
  | 'done'
  | 'error'

/** How long MCUboot needs to copy the image across slots before it advertises again. */
const REBOOT_WAIT_MS = 20_000
const RECONNECT_ATTEMPTS = 3

// Module scope: a flash is a device-wide operation, and the page shows it in
// two places (status panel + the row of the version being installed). One
// state, one in-flight update — a second one could not work anyway.
const phase = ref<FlashPhase>('idle')
const sentBytes = ref(0)
const totalBytes = ref(0)
const error = ref<string | null>(null)
const errorCode = ref<number | null>(null)
const slots = ref<ImageSlot[]>([])
const targetVersion = ref<string | null>(null)

let controller: AbortController | null = null
let pendingImage: McubootImage | null = null
let deviceId: string | null = null

export function useFirmwareFlash() {
  const bt = useBluetoothStore()

  const progress = computed(() => (totalBytes.value ? sentBytes.value / totalBytes.value : 0))
  const percent = computed(() => Math.round(progress.value * 100))
  const isBusy = computed(() => ['preparing', 'uploading', 'marking', 'rebooting', 'verifying'].includes(phase.value))
  const isActive = computed(() => phase.value !== 'idle' && phase.value !== 'done' && phase.value !== 'error')
  /** True while the user has to act: chooser-less reconnect is unavailable here. */
  const needsManualReconnect = computed(() => phase.value === 'awaiting-reconnect')

  function reset(): void {
    controller?.abort()
    controller = null
    pendingImage = null
    phase.value = 'idle'
    sentBytes.value = 0
    totalBytes.value = 0
    error.value = null
    errorCode.value = null
    slots.value = []
    targetVersion.value = null
    bt.isFlashing = false
  }

  function cancel(): void {
    controller?.abort()
  }

  async function openTransport(): Promise<SmpTransport> {
    const characteristic = await bt.getSmpCharacteristic()
    const transport = new SmpTransport(characteristic)
    await transport.start()
    return transport
  }

  function fail(e: unknown): void {
    if (e instanceof SmpError) {
      error.value = e.message
      errorCode.value = e.rc
    }
    else if (e instanceof DOMException && e.name === 'SecurityError') {
      // The origin was granted this device before SMP was in optionalServices.
      error.value = 'security'
      errorCode.value = null
    }
    else if ((e as Error)?.name === 'AbortError') {
      error.value = null
      errorCode.value = null
      phase.value = 'idle'
      bt.isFlashing = false
      return
    }
    else {
      error.value = e instanceof Error ? e.message : String(e)
      errorCode.value = null
    }
    phase.value = 'error'
    bt.isFlashing = false
  }

  /**
   * Upload + mark + reboot. Verification continues in `verify()`, either
   * automatically (browsers with getDevices()) or after the user taps the
   * reconnect button (iOS shims, where reconnecting needs a user gesture).
   */
  async function flash(sku: string, version: string): Promise<void> {
    if (isBusy.value)
      return
    controller = new AbortController()
    const signal = controller.signal
    error.value = null
    errorCode.value = null
    sentBytes.value = 0
    totalBytes.value = 0
    targetVersion.value = version
    phase.value = 'preparing'
    bt.isFlashing = true
    deviceId = (bt.device?.id as string | undefined) ?? null

    let transport: SmpTransport | null = null
    try {
      const response = await fetch(`/firmware/${sku}/app_update.${version}.bin`, { signal })
      if (!response.ok)
        throw new Error(`Cannot download the firmware file (HTTP ${response.status})`)
      const image = await parseMcubootImage(await response.arrayBuffer())
      pendingImage = image
      totalBytes.value = image.data.length

      transport = await openTransport()
      slots.value = await imageStateRead(transport, signal)

      const active = slots.value.find(s => s.active)
      if (active && sameHash(active.hash, image.hash))
        throw new SmpError('This firmware is already running on the device')

      // A previous attempt may have left the image in the secondary slot —
      // then uploading it again is pure waste, go straight to marking it.
      const staged = slots.value.find(s => !s.active && sameHash(s.hash, image.hash))
      if (!staged) {
        const params = await mcumgrParams(transport, signal)
        // Leave room for the SMP header and the CBOR keys around the payload.
        const chunkSize = params ? Math.max(128, Math.min(1024, params.bufSize - 400)) : 512

        phase.value = 'uploading'
        await imageUpload(transport, image, {
          chunkSize,
          signal,
          onProgress: (sent, total) => {
            sentBytes.value = sent
            totalBytes.value = total
          },
        })
      }
      else {
        sentBytes.value = totalBytes.value
      }

      // Trial boot where the device can survive it (MCUboot reverts to the old
      // image unless the new one confirms itself — the only safety net over
      // BLE); permanent on old firmware, whose watchdog resets the device in
      // the bootloader's image check and would turn every trial into a revert.
      phase.value = 'marking'
      const permanent = needsPermanentSwap(bt.dis.firmwareRevisionString.value as string | null)
      await imageStateWrite(transport, image.hash, permanent, signal)

      slots.value = await imageStateRead(transport, signal)
      const marked = slots.value.find(s => sameHash(s.hash, image.hash))
      if (!marked || (!marked.pending && !marked.active)) {
        throw new SmpError(
          `Device did not mark the image for the next boot (hash ${hex(image.hash).slice(0, 8)})`,
        )
      }

      phase.value = 'rebooting'
      await osReset(transport, signal)
      await transport.stop()
      transport = null

      await sleep(REBOOT_WAIT_MS, signal)
      await reconnectAndVerify(signal)
    }
    catch (e) {
      fail(e)
    }
    finally {
      await transport?.stop().catch(() => undefined)
    }
  }

  /**
   * Re-open the link and check what actually booted. Runs from the UI button,
   * so a device chooser is allowed here: this call carries a user gesture,
   * which the post-reboot automatic attempt does not.
   */
  async function verify(): Promise<void> {
    if (!pendingImage || phase.value === 'verifying')
      return
    const signal = controller?.signal
    phase.value = 'verifying'
    try {
      if (!bt.isConnected) {
        if (deviceId)
          await bt.connectToSavedDevice(deviceId)
        else
          await bt.connectToRequestDevice()
      }
      await reconnectAndVerify(signal)
    }
    catch (e) {
      fail(e)
    }
  }

  // However the user got the device back — our button, the disconnect banner,
  // the pairing wizard — finish the check as soon as the link is up again.
  watch(() => bt.isConnected, (connected) => {
    if (connected && phase.value === 'awaiting-reconnect')
      void verify()
  })

  async function reconnectAndVerify(signal?: AbortSignal): Promise<void> {
    const image = pendingImage
    if (!image)
      return

    if (!bt.isConnected) {
      const canReconnectSilently = typeof navigator !== 'undefined'
        && typeof navigator.bluetooth?.getDevices === 'function'
        && !!deviceId
      if (!canReconnectSilently) {
        // iOS shims can only open the picker from a user gesture — hand it back
        // to the UI, and drop isFlashing so the generic reconnect affordances
        // (disconnect banner) become available too.
        phase.value = 'awaiting-reconnect'
        bt.isFlashing = false
        return
      }
      for (let attempt = 0; attempt < RECONNECT_ATTEMPTS && !bt.isConnected; attempt++) {
        signal?.throwIfAborted()
        await bt.connectToSavedDevice(deviceId as string)
        if (!bt.isConnected)
          await sleep(3000, signal)
      }
      if (!bt.isConnected) {
        phase.value = 'awaiting-reconnect'
        bt.isFlashing = false
        return
      }
    }

    phase.value = 'verifying'
    let transport: SmpTransport | null = null
    try {
      transport = await openTransport()
      slots.value = await imageStateRead(transport, signal)
      const active = slots.value.find(s => s.active)
      if (!active || !sameHash(active.hash, image.hash))
        throw new SmpError('Device rebooted into the previous firmware — the update did not take')
      if (!active.confirmed) {
        throw new SmpError(
          'New firmware started but did not confirm itself — the bootloader will roll it back on the next reboot',
        )
      }
      phase.value = 'done'
      bt.isFlashing = false
    }
    finally {
      await transport?.stop().catch(() => undefined)
    }
  }

  return {
    phase,
    progress,
    percent,
    sentBytes,
    totalBytes,
    error,
    errorCode,
    slots,
    targetVersion,
    isBusy,
    isActive,
    needsManualReconnect,
    flash,
    verify,
    cancel,
    reset,
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
