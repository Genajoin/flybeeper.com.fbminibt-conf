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
  blogUrl?: string
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
    blogUrl: 'https://blog.regimov.net/flybeeper-mini-bt/',
    iconName: 'pressure',
  },
  {
    sku: 'fbps1',
    displayName: 'FlyBeeper Pressure Sensor',
    aboutKey: 'about.fbps1-p1',
    stlPath: '/fbps1-model.stl',
    stlPos: { x: -40, y: -20, z: 60 },
    marketUrl: 'https://market.flybeeper.com/device/ps1',
    buyUrl: 'https://buy.stripe.com/dR6cPZ52vfxgdzifZ0',
    blogUrl: 'https://blog.regimov.net/flybeeper-pressure-sensor',
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
    blogUrl: 'https://blog.regimov.net/flybeeper-remote-control-4',
    iconName: 'game-console',
  },
  {
    sku: 'fbtas',
    displayName: 'FlyBeeper True Air Speed',
    aboutKey: 'about.fbtas-p1',
    stlPath: '/fbtas-model.stl',
    stlPos: { x: 100, y: 100, z: 100 },
    marketUrl: 'https://market.flybeeper.com/device/tas',
    blogUrl: 'https://blog.regimov.net/flybeeper-tas',
    iconName: 'wind',
  },
  {
    sku: 'fbsv',
    displayName: 'FlyBeeper Solar Vario',
    aboutKey: 'about.fbsv-p1',
    stlPath: '/fbsv-model.stl',
    stlPos: { x: -30, y: -30, z: 60 },
    blogUrl: 'https://blog.regimov.net/flybeeper-sun-vario/',
    iconName: 'sun',
  },
  {
    sku: 'fbfanet',
    displayName: 'FlyBeeper FANET',
    aboutKey: 'about.fbfanet-p1',
    stlPath: '/fbfanet-model.stl',
    stlPos: { x: -30, y: -50, z: 130 },
    marketUrl: 'https://market.flybeeper.com/device/fbfanet',
    blogUrl: 'https://blog.regimov.net/flybeeper-fanet',
    iconName: 'radio',
  },
  {
    sku: 'fbfanetvario',
    displayName: 'FlyBeeper FANET Vario',
    aboutKey: 'about.fbfanetvario-p1',
    stlPath: '/fbfanetvario-model.stl',
    stlPos: { x: 50, y: 20, z: 130 },
    iconName: 'satellite',
  },
]

export function useDeviceCatalog() {
  return {
    devices: DEVICE_CATALOG,
    bySku: (sku: string) => DEVICE_CATALOG.find(d => d.sku === sku),
  }
}
