/**
 * Simulation-mode helpers shared between the /settings/simulator page and the
 * global SimulationBanner. The device stays in "fake vario" mode as long as
 * buzzer_simulate_vario_value != 0 (legacy ≤0.15) or the simulator
 * characteristic 904baf04-…0002 reads non-zero (CPF ≥0.15). Both paths are
 * checked here so the rest of the app can ask one question.
 */

const CPF_SIM_UUID = '904baf04-5814-11ee-8c99-0242ac120002'

export function useSimulation() {
  const bt = useBluetoothStore()
  const settings = useSettingsStore()

  function getCpfChar() {
    return bt.bleCharacteristics.find(c => c.characteristic.uuid === CPF_SIM_UUID)
  }

  /** Current simulation value in m/s, or 0 if not simulating. */
  const valueMs = computed<number>(() => {
    if (settings.local?.buzzer_simulate_vario_value)
      return settings.local.buzzer_simulate_vario_value / 100
    const v = getCpfChar()?.formattedValue
    return typeof v === 'number' ? v : 0
  })

  const isActive = computed(() => valueMs.value !== 0)

  /**
   * Set the simulation value in cm/s, writing to whichever codec the device
   * exposes. Doesn't await the BLE write — fire-and-forget so the slider stays
   * responsive; failures are logged in the underlying call.
   */
  function setValueCmS(cmS: number) {
    if (!bt.isConnected)
      return
    if (settings.local) {
      settings.local.buzzer_simulate_vario_value = cmS
      // Legacy: a dedicated single-Int16 write, not the full settings blob.
      bt.SendSimulationVarioValue(cmS)
      return
    }
    const ch = getCpfChar()
    if (ch) {
      ch.formattedValue = cmS / 100
      ch.setFormattedValue().catch(() => { /* underlying impl logs */ })
    }
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
