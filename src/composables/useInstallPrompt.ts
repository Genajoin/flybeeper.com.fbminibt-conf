import { onBeforeUnmount, onMounted, ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Captures the browser-emitted `beforeinstallprompt` event and exposes
 * `canInstall` + `install()`. Works for installable PWAs (Chromium-based).
 *
 * Returns a singleton — multiple callers in the same session share the
 * captured event so any one of them can drive the install.
 */
let deferred: BeforeInstallPromptEvent | null = null
const canInstall = ref(false)
let bound = false

function bind() {
  if (bound || typeof window === 'undefined')
    return
  bound = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    canInstall.value = true
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    canInstall.value = false
  })
}

export function useInstallPrompt() {
  onMounted(bind)
  onBeforeUnmount(() => {
    /* never unbind — singleton */
  })
  async function install() {
    if (!deferred)
      return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    canInstall.value = false
  }
  return { canInstall, install }
}
