import { createPinia } from 'pinia'
import type { UserModule } from '~/types'
import { useSettingsStore } from '~/stores/settings'

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

  // Hydrate the local-first settings store from IndexedDB before the first
  // route renders, then auto-persist on every mutation (debounced to coalesce
  // bursts from sliders / drag-edit). See DECISIONS.md §★ State model.
  const settings = useSettingsStore(pinia)
  await settings.hydrate()

  let persistTimer: ReturnType<typeof setTimeout> | null = null
  settings.$subscribe(() => {
    if (persistTimer)
      clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      settings.persist().catch(err => console.error('[settings] persist failed', err))
      persistTimer = null
    }, 250)
  })
}
