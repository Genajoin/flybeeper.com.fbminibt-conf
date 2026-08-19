import type { UserModule } from '~/types'

/**
 * Recover from a chunk that refuses to load.
 *
 * Vite fires `vite:preloadError` on window when a dynamic import of a hashed
 * bundle fails. In practice that means the browser is holding an index.html
 * from build A while the origin only serves build B's chunks — or, as on
 * 2026-08-18, an edge cache is answering an /assets/*.js URL with index.html
 * (see public/_redirects). Either way the route component never mounts, Vue
 * never hydrates, and the user is left staring at the prerendered snapshot
 * with no hint that anything failed.
 *
 * One reload usually fixes it: the fresh index.html points at the chunk names
 * that actually exist. Drop the PWA caches first, otherwise the service worker
 * hands back the very same stale document.
 *
 * The guard against a reload loop is a timestamp, not a "tried once" flag: a
 * loop would fire its attempts seconds apart, so anything within the cooldown
 * is treated as "reloading did not help" and the error is left to surface.
 * A failure a minute or more later is a fresh incident and gets its own retry.
 */
const RELOAD_AT_KEY = 'fb:chunk-reload-at'
const RELOAD_COOLDOWN_MS = 60_000

export const install: UserModule = ({ isClient }) => {
  if (!isClient)
    return

  window.addEventListener('vite:preloadError', (event) => {
    const last = Number(window.sessionStorage.getItem(RELOAD_AT_KEY) ?? 0)
    if (Date.now() - last < RELOAD_COOLDOWN_MS) {
      // Let Vite's default (rethrow) stand — reloading already failed to fix it.
      console.error('[chunk] preload failed again right after a reload — not retrying', event)
      return
    }

    event.preventDefault()
    window.sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()))
    console.warn('[chunk] preload failed, dropping caches and reloading once')

    void (async () => {
      try {
        if ('caches' in window)
          await Promise.all((await caches.keys()).map(k => caches.delete(k)))
        const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
        await Promise.all(regs.map(r => r.unregister()))
      }
      catch (err) {
        console.error('[chunk] cache teardown failed, reloading anyway', err)
      }
      window.location.reload()
    })()
  })
}
