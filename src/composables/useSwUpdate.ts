import { type Ref, ref } from 'vue'

/**
 * Service-worker update signal. Backed by virtual:pwa-register/vue when
 * available (browser); during SSR it falls back to inert refs.
 *
 * `needRefresh` flips true when the worker has installed a new build.
 * `updateSW()` activates it (skipWaiting → reload).
 */
export interface SwUpdate {
  needRefresh: Ref<boolean>
  updateSW: () => void
}

let cached: SwUpdate | null = null

export function useSwUpdate(): SwUpdate {
  if (cached)
    return cached
  if (typeof window === 'undefined') {
    cached = { needRefresh: ref(false), updateSW: () => {} }
    return cached
  }
  // Lazily import — virtual module only exists in client build.
  const needRefresh = ref(false)
  let updateFn: (reload?: boolean) => void = () => {}
  import('virtual:pwa-register/vue')
    .then(({ useRegisterSW }) => {
      const reg = useRegisterSW({ immediate: true })
      // useRegisterSW returns a refs object; wire ours to it.
      const wr = reg.needRefresh as Ref<boolean>
      const wu = reg.updateServiceWorker as (reload?: boolean) => Promise<void>
      // Sync flag once mounted.
      const unwatch = () => {}
      const sync = () => {
        needRefresh.value = !!wr.value
      }
      sync()
      // Watch reactive flag — keep it simple.
      const id = setInterval(sync, 1500)
      updateFn = () => {
        clearInterval(id)
        unwatch()
        wu(true)
      }
    })
    .catch(() => {})
  cached = { needRefresh, updateSW: () => updateFn(true) }
  return cached
}
