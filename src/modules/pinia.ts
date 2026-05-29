import { createPinia } from 'pinia'
import type { UserModule } from '~/types'
import { useSettingsStore } from '~/stores/settings'
import { useSavedDevicesStore } from '~/stores/saved-devices'
import { useBluetoothStore } from '~/stores/bluetooth'

// Setup Pinia + local-first settings hydration.
// https://pinia.vuejs.org/
export const install: UserModule = async ({ isClient, initialState, app }) => {
  const pinia = createPinia()
  app.use(pinia)

  // SSG serialization
  // https://github.com/antfu/vite-ssg/blob/main/README.md#state-serialization
  if (isClient)
    pinia.state.value = (initialState.pinia) || {}
  else
    initialState.pinia = pinia.state.value

  if (!isClient)
    return

  // Re-detect Web Bluetooth against the real navigator. The SSR snapshot
  // we just restored always says bleAvailable=false / reason='browser'
  // because the prerender has no navigator / window.
  useBluetoothStore(pinia).detectBleAvailability()

  // Hydrate the local-first settings store from IndexedDB before the first
  // route renders, then auto-persist on every mutation (debounced to coalesce
  // bursts from sliders / drag-edit). See DECISIONS.md §★ State model.
  const settings = useSettingsStore(pinia)
  const savedDevices = useSavedDevicesStore(pinia)
  await Promise.all([settings.hydrate(), savedDevices.hydrate()])

  let settingsPersistTimer: ReturnType<typeof setTimeout> | null = null
  settings.$subscribe(() => {
    if (settingsPersistTimer)
      clearTimeout(settingsPersistTimer)
    settingsPersistTimer = setTimeout(() => {
      settings.persist().catch(err => console.error('[settings] persist failed', err))
      settingsPersistTimer = null
    }, 250)
  })

  let savedDevicesPersistTimer: ReturnType<typeof setTimeout> | null = null
  savedDevices.$subscribe(() => {
    if (savedDevicesPersistTimer)
      clearTimeout(savedDevicesPersistTimer)
    savedDevicesPersistTimer = setTimeout(() => {
      savedDevices.persist().catch(err => console.error('[savedDevices] persist failed', err))
      savedDevicesPersistTimer = null
    }, 250)
  })
}
