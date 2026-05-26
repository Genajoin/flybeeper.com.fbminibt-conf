import type { iFbMiniBtSettings } from '~/stores/bluetooth'

/**
 * Settings IA per audit §8 — flat characteristics map to grouped panels so the
 * UI can ship a per-group Apply / Revert and a logical sidebar instead of one
 * long dump.
 *
 * `curves` is a single object on the settings — its sub-arrays
 * (vario / freq / cycle / duty) live or die together. Treat it as one field.
 */

export type SettingsGroupKey =
  | 'audio'
  | 'curves'
  | 'behaviour'
  | 'uart'
  | 'power'
  | 'simulator'

export const SETTINGS_GROUPS: Record<SettingsGroupKey, (keyof iFbMiniBtSettings)[]> = {
  audio: [
    'buzzer_volume',
    'climb_tone_on_threshold_cm',
    'climb_tone_off_threshold_cm',
    'sink_tone_on_threshold_cm',
    'sink_tone_off_threshold_cm',
  ],
  curves: ['curves'],
  behaviour: [
    'silent_on_ground',
    'led_blinky_by_vario',
    'hid_keyboard_off',
  ],
  uart: ['uart_protocols'],
  power: ['ble_never_sleep'],
  simulator: ['buzzer_simulate_vario_value'],
}

/**
 * Fields that need a power-cycle on the device for the change to take effect
 * (audit §7). Surfacing this state drives the restart-device banner.
 */
export const RESTART_REQUIRED_FIELDS: ReadonlyArray<keyof iFbMiniBtSettings> = [
  'hid_keyboard_off',
]

export interface SettingsGroupNav {
  key: SettingsGroupKey
  route: string
}

export const SETTINGS_GROUP_NAV: SettingsGroupNav[] = [
  { key: 'audio', route: '/settings/audio' },
  { key: 'curves', route: '/settings/curves' },
  { key: 'behaviour', route: '/settings/behaviour' },
  { key: 'uart', route: '/settings/uart' },
  { key: 'power', route: '/settings/power' },
  { key: 'simulator', route: '/settings/simulator' },
]

/**
 * CPF (fw ≥0.15) maps each FlyBeeper Settings Service characteristic UUID to a
 * settings group, mirroring SETTINGS_GROUPS but for the per-characteristic
 * codec. Characteristics not listed here fall through to a catch-all "other"
 * bucket; we surface those only on the closest panel that makes sense.
 *
 * Keep in sync with locales/*.yml `sett.<uuid>` keys and the ≤0.15 grouping.
 */
export const CPF_UUID_TO_GROUP: Record<string, SettingsGroupKey> = {
  // audio
  '67f82d94-2b2a-4123-81c9-058e460c3d01': 'audio', // Buzzer Volume
  'fcb14ed9-06e7-4a9e-b311-6eee676a2f48': 'audio', // climb-on
  '1673f137-66c1-4ff0-8db3-69b9ed7c33e0': 'audio', // climb-off
  'b713f438-42fe-46fe-b052-371a3b9e433a': 'audio', // sink-on
  '8a78979b-1425-4160-b34b-ac5aadddeb21': 'audio', // sink-off
  '0e984fe9-534c-4f13-969c-58ce03d33527': 'audio', // climb hysteresis
  'e88b07e7-9035-4afa-9fe8-206ddc34de61': 'audio', // smooth frequency change
  '7e035080-7417-4393-959a-58505ef9cf4a': 'audio', // vario averaging

  // curves (12-element arrays, format 0x1B)
  '512d6d89-7a6f-461c-983e-902b68d40f56': 'curves', // vario dots
  '8c090502-81c4-4d29-8d10-6db20607ace9': 'curves', // freq dots
  '9c3b62c0-e227-4f1a-8342-7e647015555d': 'curves', // cycle dots
  '98c16914-00ad-47ba-b625-148f0baaec47': 'curves', // duty dots

  // behaviour
  'daadb8a9-a566-450e-97d0-990a0c8487dd': 'behaviour', // silent_on_ground
  'a37e549a-f501-4e77-9c3d-291c85542471': 'behaviour', // led_blinky_by_vario
  '86591053-2856-4f25-a35c-b753f0deea8f': 'behaviour', // hid_keyboard_off

  // uart
  '84ccd3d4-a262-45e6-b616-d4a4ae7c0d5b': 'uart', // UART protocol
  '113bb48c-7e3f-4580-a561-acf6c9eb42a5': 'uart', // UART duplication

  // power
  'd9eec180-344e-41e3-8c18-adf312dce8bb': 'power', // ble_never_sleep
  '9a560750-0bca-4d0c-a1fc-21bbc574d5a6': 'power', // power off timeout

  // simulator
  '904baf04-5814-11ee-8c99-0242ac120002': 'simulator',
}

/** Characteristic UUIDs that require a device power-cycle on change. */
export const CPF_RESTART_REQUIRED_UUIDS: ReadonlyArray<string> = [
  '86591053-2856-4f25-a35c-b753f0deea8f', // hid_keyboard_off
]
