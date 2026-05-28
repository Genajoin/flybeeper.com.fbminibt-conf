import type { useSettingsStore } from '~/stores/settings'

/**
 * DEMO_SETTINGS — what the configurator looks like before any BLE device has
 * paired (and what /share + /settings/* + /cockpit render against).
 *
 * Keyed by FlyBeeper Settings Service characteristic UUID. Values are the
 * "formatted" (exponent-applied) representation, *except* curve UUIDs which
 * are raw int16 cm/s arrays — format 0x1B bypasses the CPF exponent (see
 * memory `ble-cpf-0x1b`).
 *
 * Values picked to mirror the firmware defaults that ship on a fresh device:
 * conservative climb/sink thresholds, mid-volume buzzer, sensitive curves.
 */
export const DEMO_SETTINGS: Record<string, unknown> = {
  // ── audio
  '67f82d94-2b2a-4123-81c9-058e460c3d01': 2, // buzzer volume (0–3)
  'fcb14ed9-06e7-4a9e-b311-6eee676a2f48': 0.2, // climb-on (m/s)
  '1673f137-66c1-4ff0-8db3-69b9ed7c33e0': 0.1, // climb-off
  'b713f438-42fe-46fe-b052-371a3b9e433a': -2.5, // sink-on
  '8a78979b-1425-4160-b34b-ac5aadddeb21': -1.8, // sink-off
  '0e984fe9-534c-4f13-969c-58ce03d33527': 0.05, // climb hysteresis
  'e88b07e7-9035-4afa-9fe8-206ddc34de61': false, // smooth frequency change
  '7e035080-7417-4393-959a-58505ef9cf4a': 0.5, // vario averaging (s)

  // ── curves (raw cm/s, format 0x1B) — byte-identical to firmware
  // factory defaults (FbBT/src/buzzer.h, FbFANET/src/buzzer/buzzer.h).
  // Must stay aligned with the DEFAULT preset in pages/settings/audio.vue
  // so a freshly-seeded offline session lands on activePreset === 'default'
  // instead of stranding the user on CUSTOM.
  '512d6d89-7a6f-461c-983e-902b68d40f56': [-1400, -800, -100, 0, 39, 40, 100, 200, 300, 450, 1200, 2000],
  '8c090502-81c4-4d29-8d10-6db20607ace9': [200, 250, 390, 395, 400, 470, 760, 1120, 1480, 2020, 4720, 6000],
  '9c3b62c0-e227-4f1a-8342-7e647015555d': [850, 790, 725, 350, 150, 595, 430, 325, 265, 210, 120, 100],
  '98c16914-00ad-47ba-b625-148f0baaec47': [100, 98, 95, 20, 80, 41, 43, 46, 49, 54, 78, 90],

  // ── behaviour
  'daadb8a9-a566-450e-97d0-990a0c8487dd': true, // silent_on_ground
  'a37e549a-f501-4e77-9c3d-291c85542471': false, // led_blinky_by_vario
  '86591053-2856-4f25-a35c-b753f0deea8f': false, // hid_keyboard_off

  // ── uart
  '84ccd3d4-a262-45e6-b616-d4a4ae7c0d5b': 0, // protocol (0 = none)
  '113bb48c-7e3f-4580-a561-acf6c9eb42a5': false, // duplication

  // ── power
  'd9eec180-344e-41e3-8c18-adf312dce8bb': false, // ble_never_sleep
  '9a560750-0bca-4d0c-a1fc-21bbc574d5a6': 14400, // power-off timeout (s — 4h)

  // ── simulator (write-only on device; included so virtual-char shim has a value)
  '904baf04-5814-11ee-8c99-0242ac120002': 0,

  // ── FANET radio (firmware defaults from FbFANET/src/settings/settings.c)
  '8d8e8809-4697-41fc-8ee2-ca0b999354ec': 868200000, // frequency, Hz (868.2 MHz)
  'f19422e2-982a-4954-9a75-b38927236a59': 1, // bandwidth (1 = 250 kHz)
  '108b855f-11cd-4bc5-adee-eafce49bc77a': 7, // datarate (SF7)
  '17a95752-3c12-438f-9244-4f4612a1ab49': 1, // coding rate (CR 4/5)
  '8ef0c42e-adb6-4897-b9c9-6fe93143faf4': 14, // tx power, dBm
  '9d9a9cd9-65ed-4d73-91ad-20cfdb5dbbba': 1, // FANET UART protocol (1 = FNNGB)

  // ── TAS (firmware defaults from FbFANET/src/settings/settings.c)
  '904baf04-5814-11ee-8c99-0242ac120201': 1.05, // Pitot K factor (firmware k_factor = 1050, exponent -3)
  '904baf04-5814-11ee-8c99-0242ac120202': 0, // Diff. pressure offset, Pa
}

/**
 * CPF format hints used by the virtual-CPF shim in `useCpfGroup` when offline.
 * Mirrors what the device's CPF descriptors advertise so SettingsPanel can
 * pick the right widget (toggle vs. number input vs. array curve editor).
 */
export interface VirtualCpfFormat {
  format: number
  exponent: number
  unit?: string
}

export const VIRTUAL_CPF_FORMAT: Record<string, VirtualCpfFormat> = {
  '67f82d94-2b2a-4123-81c9-058e460c3d01': { format: 0x04, exponent: 0 },
  'fcb14ed9-06e7-4a9e-b311-6eee676a2f48': { format: 0x0E, exponent: -2, unit: 'm/s' },
  '1673f137-66c1-4ff0-8db3-69b9ed7c33e0': { format: 0x0E, exponent: -2, unit: 'm/s' },
  'b713f438-42fe-46fe-b052-371a3b9e433a': { format: 0x0E, exponent: -2, unit: 'm/s' },
  '8a78979b-1425-4160-b34b-ac5aadddeb21': { format: 0x0E, exponent: -2, unit: 'm/s' },
  '0e984fe9-534c-4f13-969c-58ce03d33527': { format: 0x0E, exponent: -2, unit: 'm/s' },
  'e88b07e7-9035-4afa-9fe8-206ddc34de61': { format: 0x01, exponent: 0 },
  '7e035080-7417-4393-959a-58505ef9cf4a': { format: 0x04, exponent: -1, unit: 'sec' },

  '512d6d89-7a6f-461c-983e-902b68d40f56': { format: 0x1B, exponent: 0 },
  '8c090502-81c4-4d29-8d10-6db20607ace9': { format: 0x1B, exponent: 0 },
  '9c3b62c0-e227-4f1a-8342-7e647015555d': { format: 0x1B, exponent: 0 },
  '98c16914-00ad-47ba-b625-148f0baaec47': { format: 0x1B, exponent: 0 },

  'daadb8a9-a566-450e-97d0-990a0c8487dd': { format: 0x01, exponent: 0 },
  'a37e549a-f501-4e77-9c3d-291c85542471': { format: 0x01, exponent: 0 },
  '86591053-2856-4f25-a35c-b753f0deea8f': { format: 0x01, exponent: 0 },

  '84ccd3d4-a262-45e6-b616-d4a4ae7c0d5b': { format: 0x04, exponent: 0 },
  '113bb48c-7e3f-4580-a561-acf6c9eb42a5': { format: 0x01, exponent: 0 },

  'd9eec180-344e-41e3-8c18-adf312dce8bb': { format: 0x01, exponent: 0 },
  '9a560750-0bca-4d0c-a1fc-21bbc574d5a6': { format: 0x08, exponent: 0, unit: 'sec' },

  '904baf04-5814-11ee-8c99-0242ac120002': { format: 0x0E, exponent: -2, unit: 'm/s' },

  // FANET radio (fbfanet, fbfanetvario). Types match struct fb_settings
  // in FbFANET/src/settings/settings.h. On a real connected device the
  // firmware's actual CPF descriptor is spliced onto the virtual char,
  // so these fallbacks only matter offline.
  '8d8e8809-4697-41fc-8ee2-ca0b999354ec': { format: 0x08, exponent: 0, unit: 'Hz' }, // uint32, frequency
  'f19422e2-982a-4954-9a75-b38927236a59': { format: 0x0C, exponent: 0 }, // int8, bandwidth enum 0-3
  '108b855f-11cd-4bc5-adee-eafce49bc77a': { format: 0x0C, exponent: 0 }, // int8, datarate (SF) 6-12
  '17a95752-3c12-438f-9244-4f4612a1ab49': { format: 0x0C, exponent: 0 }, // int8, coding rate 1-4
  '8ef0c42e-adb6-4897-b9c9-6fe93143faf4': { format: 0x0C, exponent: 0, unit: 'dBm' }, // int8, tx_power
  '9d9a9cd9-65ed-4d73-91ad-20cfdb5dbbba': { format: 0x0C, exponent: 0 }, // int8, fanet_uart_protocol enum

  // TAS (fbtas). k_factor stored as int16 *1000 (firmware 1050 = 1.05).
  '904baf04-5814-11ee-8c99-0242ac120201': { format: 0x0E, exponent: -3 },
  '904baf04-5814-11ee-8c99-0242ac120202': { format: 0x0E, exponent: 0, unit: 'Pa' },
}

type Store = ReturnType<typeof useSettingsStore>

/**
 * Seeds DEMO_SETTINGS into the local-first store, but only if no local copy
 * exists yet. Idempotent across reloads — once a user paired with a device,
 * applyDeviceSnapshot() has populated `local` and we skip.
 */
export function seedDemoIfEmpty(store: Store): void {
  if (store.local === null)
    store.replaceLocal({ ...DEMO_SETTINGS })
}
