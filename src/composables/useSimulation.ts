/* eslint-disable no-console -- intentional diagnostic logging on the BLE write
 * path. The simulator was silent in testing and there was no way for the user
 * to tell whether the write was happening, going to the wrong codec, or
 * silently no-op'ing. Console output is opt-in noise the user can ignore. */

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

  // Codec preference is decided by what the *device* exposes, not what
  // settings.local has in IDB. settings.local can be stale from a previous
  // session with a different SKU (e.g. last week's FBminiBT cached struct
  // surviving across a connect to FBfanetvario today) — if we keyed on it,
  // we'd happily call SendSimulationVarioValue() on a device that never
  // wired up miniBtSimulation.characteristic, and the write would silently
  // no-op.
  const hasLegacyCodec = computed(() =>
    bt.fss.miniBtSimulation.characteristic !== null,
  )

  /** Current simulation value in m/s, or 0 if not simulating. */
  const valueMs = computed<number>(() => {
    if (hasLegacyCodec.value && settings.local) {
      const v = settings.local.buzzer_simulate_vario_value
      return typeof v === 'number' ? v / 100 : 0
    }
    const v = getCpfChar()?.formattedValue
    return typeof v === 'number' ? v : 0
  })

  const isActive = computed(() => valueMs.value !== 0)

  /**
   * Set the simulation value in cm/s, writing to whichever codec the device
   * exposes. Doesn't await the BLE write — fire-and-forget so the slider
   * stays responsive; failures are logged in the underlying call.
   */
  function setValueCmS(cmS: number) {
    if (!bt.isConnected) {
      console.warn('[sim] setValueCmS skipped — not connected', cmS)
      return
    }
    if (hasLegacyCodec.value) {
      console.debug('[sim] legacy write', cmS, 'cm/s')
      if (settings.local)
        settings.local.buzzer_simulate_vario_value = cmS
      bt.SendSimulationVarioValue(cmS)
      return
    }
    const ch = getCpfChar()
    if (!ch) {
      console.warn('[sim] no CPF simulator characteristic — device does not expose 904baf04-…0002', { connected: bt.isConnected, chars: bt.bleCharacteristics.length })
      return
    }
    const msValue = cmS / 100
    console.debug('[sim] CPF write', msValue, 'm/s →', ch.characteristic.uuid)
    ch.formattedValue = msValue
    ch.setFormattedValue().catch(err => console.error('[sim] setFormattedValue failed', err))
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
