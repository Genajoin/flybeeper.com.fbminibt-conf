/* eslint-disable no-console -- intentional diagnostic logging on the BLE write
 * path. */

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

export function useSimulation() {
  const bt = useBluetoothStore()
  const settings = useSettingsStore()

  function getSimChar() {
    return bt.bleCharacteristics.find(c => c.characteristic.uuid === SIM_UUID)
  }

  /** Current simulation value in m/s, or 0 if not simulating. */
  const valueMs = computed<number>(() => {
    // Prefer the live characteristic read — it's the device's word for what's
    // actually being simulated. Fall back to the legacy struct only if there's
    // no characteristic surfaced (older ≤0.13 firmware that bundles sim into
    // the settings blob).
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

  /**
   * Write the simulation value to the device. Always Int16 cm/s little-endian,
   * straight to characteristic.writeValue() — bypasses the CPF setFormattedValue
   * path that silently drops the write when no Presentation Format Descriptor
   * is exposed.
   */
  function setValueCmS(cmS: number) {
    if (!bt.isConnected) {
      console.warn('[sim] skipped — not connected', cmS)
      return
    }
    const ch = getSimChar()
    if (!ch) {
      console.warn('[sim] no simulator characteristic found', { chars: bt.bleCharacteristics.length })
      return
    }
    const buffer = new ArrayBuffer(2)
    new DataView(buffer).setInt16(0, cmS, true)
    console.debug('[sim] write', cmS, 'cm/s →', ch.characteristic.uuid)
    ch.characteristic.writeValue(buffer).catch(err =>
      console.error('[sim] writeValue failed', err),
    )
    // Reflect locally so the banner / slider sync without waiting for the
    // device to notify us back.
    ch.formattedValue = cmS / 100
    if (settings.local)
      settings.local.buzzer_simulate_vario_value = cmS
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
