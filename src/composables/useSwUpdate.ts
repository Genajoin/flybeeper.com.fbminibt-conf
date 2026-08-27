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
 *
 * Why the extra machinery below: with `registerType: 'prompt'` the browser
 * only looks for a new worker when the page is *loaded*. An installed PWA on
 * a phone is never loaded again — it is resumed — so a user could sit on an
 * August 18 build for a week without the banner ever appearing. Two answers:
 *  - `checkForUpdate()` on a timer, on tab focus and on regaining network,
 *    so a resumed app notices a new build within minutes;
 *  - `hardReload()`, the escape hatch behind the footer's UPDATE button, for
 *    the case where the worker itself is the thing that is stuck. Pulling
 *    down to reload on a phone cannot clear a service-worker cache; this can.
 */
export interface SwUpdate {
  needRefresh: Ref<boolean>
  /** Activate the waiting worker (skipWaiting → reload). */
  updateSW: (reload?: boolean) => void
  /** Ask the browser to re-fetch sw.js right now. Cheap, safe to call often. */
  checkForUpdate: () => Promise<void>
  /**
   * Last resort: drop every cache, unregister every worker, reload from the
   * network. Only touches Cache Storage — device settings and saved devices
   * live in IndexedDB/localStorage and survive.
   */
  hardReload: () => Promise<void>
}

/** A resumed PWA re-checks this often while it stays open. */
const CHECK_INTERVAL_MS = 15 * 60 * 1000
/** Floor between two checks, so focus-flapping cannot hammer the origin. */
const CHECK_THROTTLE_MS = 60 * 1000

let cached: SwUpdate | null = null

export function useSwUpdate(): SwUpdate {
  if (cached)
    return cached
  if (typeof window === 'undefined') {
    cached = {
      needRefresh: ref(false),
      updateSW: () => {},
      checkForUpdate: async () => {},
      hardReload: async () => {},
    }
    return cached
  }

  const needRefresh = ref(false)
  let doUpdate: (reload?: boolean) => Promise<void> = async () => {}
  let registration: ServiceWorkerRegistration | undefined
  let lastCheck = 0

  async function checkForUpdate(): Promise<void> {
    if (!registration)
      return
    const now = Date.now()
    if (now - lastCheck < CHECK_THROTTLE_MS)
      return
    lastCheck = now
    try {
      await registration.update()
    }
    catch { /* offline or the origin is down — the next check retries */ }
  }

  function watchForUpdates(reg: ServiceWorkerRegistration) {
    registration = reg
    lastCheck = Date.now() // the registration just fetched sw.js itself
    setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS)
    // A phone does not reload an installed PWA, it resumes it — that resume
    // is the only reliable moment to look for a new build.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible')
        void checkForUpdate()
    })
    window.addEventListener('focus', () => void checkForUpdate())
    window.addEventListener('online', () => void checkForUpdate())
  }

  async function hardReload(): Promise<void> {
    try {
      if ('caches' in window)
        await Promise.all((await caches.keys()).map(k => caches.delete(k)))
    }
    catch { /* nothing cached, or storage is blocked — reload anyway */ }
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
      await Promise.all(regs.map(r => r.unregister()))
    }
    catch { /* same */ }
    // A unique query defeats every cache still between us and the origin;
    // the inline script in index.html strips it again on arrival.
    const url = new URL(window.location.href)
    url.searchParams.set('fresh', Date.now().toString(36))
    window.location.replace(url.toString())
  }

  void import('virtual:pwa-register/vue')
    .then(({ useRegisterSW }) => {
      const reg = useRegisterSW({
        immediate: true,
        onNeedRefresh() {
          needRefresh.value = true
        },
        onRegisteredSW(_swUrl, r) {
          if (r)
            watchForUpdates(r)
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
    checkForUpdate,
    hardReload,
  }
  return cached
}
