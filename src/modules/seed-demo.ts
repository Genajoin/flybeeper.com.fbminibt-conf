import type { UserModule } from '~/types'
import { useSettingsStore } from '~/stores/settings'
import { seedDemoIfEmpty } from '~/composables/useDemoSnapshot'

/**
 * On first-ever visit the local-first store is empty — seed it with the demo
 * snapshot so /cockpit, /settings/*, /share render against real values
 * instead of empty placeholders. After this, applyDeviceSnapshot on first BLE
 * connect overwrites the demo data with what's on the device.
 */
export const install: UserModule = async ({ isClient }) => {
  if (!isClient)
    return
  const settings = useSettingsStore()
  await settings.hydrate()
  seedDemoIfEmpty(settings)
}
