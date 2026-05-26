/**
 * Simulation-mode helpers shared between the /settings/simulator page and the
 * global SimulationBanner. The simulator characteristic (904baf04-…0002) takes
 * an Int16 cm/s on the wire — same protocol the original legacy
 * SendSimulationVarioValue used. We write the buffer directly because
 * setFormattedValue() silently no-ops when the characteristic has no CPF
 * Presentation Format Descriptor (which the simulator characteristic doesn't
 * always expose), and that was making the page look like it worked while
 * nothing ever reached the device.
 */

const SIM_UUID = '904baf04-5814-11ee-8c99-0242ac120002'

// Singleton write queue (module-scope so banner + page share state). Web
// Bluetooth rejects a writeValue with "GATT operation already in progress"
// if you fire a new one before the previous resolves. Slider drags can fire
// >50 Hz — way faster than the GATT round-trip — so we serialise writes and
// drop everything except the latest pending value. This is the classic
// "send latest, discard intermediate" pattern; matches the behaviour the
// user said was in the original code.
let writeInFlight = false
let pendingCmS: number | null = null

export function useSimulation() {
  const bt = useBluetoothStore()
  const settings = useSettingsStore()

  function getSimChar() {
    return bt.bleCharacteristics.find(c => c.characteristic.uuid === SIM_UUID)
  }

  /** Current simulation value in m/s, or 0 if not simulating. */
  const valueMs = computed<number>(() => {
    const ch = getSimChar()
    if (ch && typeof ch.formattedValue === 'number')
      return ch.formattedValue
    if (settings.local) {
      const v = settings.local.buzzer_simulate_vario_value
      return typeof v === 'number' ? v / 100 : 0
    }
    return 0
  })

  const isActive = computed(() => valueMs.value !== 0)

  function dispatchWrite(cmS: number) {
    const ch = getSimChar()
    if (!ch || !ch.characteristic.service.device.gatt?.connected) {
      writeInFlight = false
      pendingCmS = null
      return
    }
    const buffer = new ArrayBuffer(2)
    new DataView(buffer).setInt16(0, cmS, true)
    writeInFlight = true
    ch.characteristic.writeValue(buffer)
      .catch(err => console.error('[sim] writeValue failed', err))
      .finally(() => {
        if (pendingCmS !== null && pendingCmS !== cmS) {
          const next = pendingCmS
          pendingCmS = null
          dispatchWrite(next)
        }
        else {
          pendingCmS = null
          writeInFlight = false
        }
      })
  }

  /**
   * Write the simulation value to the device. Always Int16 cm/s little-endian
   * straight to characteristic.writeValue(). Drops to a queue if a write is
   * already in flight so the BLE stack never sees a second writeValue before
   * the first resolves.
   */
  function setValueCmS(cmS: number) {
    // Reflect locally first so the slider/banner feel instant — UI lag must
    // not depend on BLE round-trip.
    const ch = getSimChar()
    if (ch)
      ch.formattedValue = cmS / 100
    if (settings.local)
      settings.local.buzzer_simulate_vario_value = cmS

    if (!bt.isConnected || !ch)
      return

    if (writeInFlight) {
      // Newest value wins; older pending value is discarded.
      pendingCmS = cmS
      return
    }
    dispatchWrite(cmS)
  }

  function stop() {
    setValueCmS(0)
  }

  return {
    valueMs,
    isActive,
    setValueCmS,
    stop,
  }
}
