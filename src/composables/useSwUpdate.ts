import { type Ref, ref } from 'vue'

/**
 * Service-worker update signal. Single source of truth around
 * `useRegisterSW` from `virtual:pwa-register/vue` — call sites get a stable
 * `needRefresh` ref and an `updateSW()` action that activates the waiting
 * worker (skipWaiting → controllerchange → reload).
 *
 * History: there used to be a second `registerSW({ immediate: true })` call
 * in a separate pwa module. Both created their own workbox-window instance
 * against the same SW URL — the browser dedups the registration, but each
 * Workbox instance has its own `_waiting` state populated only by the
 * `waiting` event it personally caught. The first instance grabbed the
 * event; the second one (the composable's) ended up with a null waiting
 * worker, so its `updateServiceWorker(true)` silently no-op'd. That's why
 * the banner's UPDATE button did nothing. The pwa module is now gone —
 * registration lives only here, called from UpdateBanner's setup, which is
 * mounted in every layout so the SW still registers on first paint.
 */
export interface SwUpdate {
  needRefresh: Ref<boolean>
  updateSW: (reload?: boolean) => void
}

let cached: SwUpdate | null = null

export function useSwUpdate(): SwUpdate {
  if (cached)
    return cached
  if (typeof window === 'undefined') {
    cached = { needRefresh: ref(false), updateSW: () => {} }
    return cached
  }

  const needRefresh = ref(false)
  let doUpdate: (reload?: boolean) => Promise<void> = async () => {}

  void import('virtual:pwa-register/vue')
    .then(({ useRegisterSW }) => {
      const reg = useRegisterSW({
        immediate: true,
        onNeedRefresh() {
          needRefresh.value = true
        },
      })
      // Cover the race where the new SW reached `waiting` before our
      // callback was wired (useRegisterSW already exposes the ref).
      if (reg.needRefresh.value)
        needRefresh.value = true
      doUpdate = reg.updateServiceWorker
    })
    .catch(() => {})

  cached = {
    needRefresh,
    updateSW: (reload = true) => {
      void doUpdate(reload)
    },
  }
  return cached
}
