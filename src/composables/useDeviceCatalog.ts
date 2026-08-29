import type { IconName } from '~/components/Icon.vue'

/**
 * Single source of truth for the product catalog. /devices/index renders a
 * card grid by iterating this list; /devices/<sku>/index.vue files mount
 * <DeviceLanding :sku="..."> which looks the entry up here. Keep the SKU
 * key in sync with the directory name under src/pages/devices/.
 */
export interface DeviceEntry {
  sku: string
  displayName: string
  aboutKey: string
  stlPath: string
  stlPos: { x: number, y: number, z: number }
  marketUrl?: string
  buyUrl?: string
  /** Glyph name from the cockpit icon set (see src/components/Icon.vue). */
  iconName: IconName
}

export const DEVICE_CATALOG: DeviceEntry[] = [
  {
    sku: 'fbminibt',
    displayName: 'FlyBeeper mini BT',
    aboutKey: 'about.fbminibt-p1',
    stlPath: '/fbminibt-model.stl',
    stlPos: { x: -20, y: -30, z: 60 },
    marketUrl: 'https://market.flybeeper.com/device/mini-bt',
    iconName: 'pressure',
  },
  {
    // Одна карточка на два прибора: Baro и его предшественник Pressure Sensor
    // (FBPS1). Разделить их нельзя и не нужно — по Bluetooth оба отдают Model
    // Number «FBPS» и берут одну и ту же прошивку (см. resolveSku в
    // useFirmwareUpdate.ts), поэтому подключившийся всегда попадает сюда.
    sku: 'fbps',
    displayName: 'FlyBeeper Baro',
    aboutKey: 'about.fbps-p1',
    stlPath: '/fbps-model.stl',
    stlPos: { x: -40, y: -20, z: 60 },
    marketUrl: 'https://market.flybeeper.com/device/baro',
    iconName: 'pressure-filled',
  },
  {
    sku: 'fbrc4',
    displayName: 'FlyBeeper Remote Control 4',
    aboutKey: 'about.fbrc4-p1',
    stlPath: '/fbrc4-model.stl',
    stlPos: { x: -20, y: -20, z: 40 },
    marketUrl: 'https://market.flybeeper.com/device/rc4',
    buyUrl: 'https://buy.stripe.com/aEUeY7dz1etcan628b',
    iconName: 'game-console',
  },
  {
    sku: 'fbtas',
    displayName: 'FlyBeeper True Air Speed',
    aboutKey: 'about.fbtas-p1',
    stlPath: '/fbtas-model.stl',
    stlPos: { x: 100, y: 100, z: 100 },
    marketUrl: 'https://market.flybeeper.com/device/tas',
    iconName: 'wind',
  },
  {
    sku: 'fbsv',
    displayName: 'FlyBeeper SunVario',
    aboutKey: 'about.fbsv-p1',
    stlPath: '/fbsv-model.stl',
    stlPos: { x: -30, y: -30, z: 60 },
    marketUrl: 'https://market.flybeeper.com/device/sun-vario',
    iconName: 'sun',
  },
  {
    sku: 'fbfanet',
    displayName: 'FlyBeeper FANET',
    aboutKey: 'about.fbfanet-p1',
    stlPath: '/fbfanet-model.stl',
    stlPos: { x: -30, y: -50, z: 130 },
    marketUrl: 'https://market.flybeeper.com/device/fbfanet',
    iconName: 'radio',
  },
  {
    // SKU matches the DIS Model Number the device reports ('FBFV'), so
    // resolveSku() links a connected device to this entry by name alone.
    sku: 'fbfv',
    displayName: 'FlyBeeper FANET Vario',
    aboutKey: 'about.fbfv-p1',
    stlPath: '/fbfv-model.stl',
    // Enclosure is 28 × 92 × 16 mm, centred in X/Y — this camera looks at the
    // solar-panel face from slightly above and off to one side.
    stlPos: { x: 45, y: -28, z: 112 },
    iconName: 'satellite',
  },
]

export function useDeviceCatalog() {
  return {
    devices: DEVICE_CATALOG,
    bySku: (sku: string) => DEVICE_CATALOG.find(d => d.sku === sku),
  }
}
