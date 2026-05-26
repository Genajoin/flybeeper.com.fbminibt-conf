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
