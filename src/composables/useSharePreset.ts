import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { buildShareUrl } from '~/utils/preset-share'
import { parsePresetJson, presetNameFromFilename } from '~/utils/preset-import'
import { CPF_UUID_TO_GROUP, type SettingsGroupKey } from '~/composables/useSettingsGroups'

/**
 * Shared codec / QR generator used by both the standalone /share page
 * and the inline ShareSettingsStrip accordion on settings pages.
 *
 * Base URL is the **current location** (origin + pathname) so a QR code
 * generated from /settings/audio carries that path — the recipient
 * lands on the same panel the sender was looking at, not on /share.
 *
 * Optional `groupKeys` filters the encoded payload to UUIDs belonging
 * to those groups (e.g. ['audio', 'curves'] on /settings/audio). Pass
 * null/omit to share every UUID in local — the standalone /share page
 * does that.
 */
export function useSharePreset(groupKeys?: Ref<SettingsGroupKey[] | null>) {
  const settings = useSettingsStore()
  const shared = useSharedPresetStore()

  const baseUrl = computed(() => {
    if (typeof window === 'undefined')
      return 'https://config.flybeeper.com/'
    return window.location.origin + window.location.pathname
  })

  const localBag = computed(() => {
    const all = settings.local ?? {}
    const gk = groupKeys?.value
    if (!gk || gk.length === 0)
      return all
    const allowed = new Set(gk)
    const out: Record<string, unknown> = {}
    for (const [uuid, value] of Object.entries(all)) {
      const g = CPF_UUID_TO_GROUP[uuid]
      if (g && allowed.has(g))
        out[uuid] = value
    }
    return out
  })
  const fieldCount = computed(() => Object.keys(localBag.value).length)

  const url = computed(() =>
    buildShareUrl(baseUrl.value, localBag.value, shared.exportName),
  )

  const byteSize = computed(() =>
    typeof Blob === 'undefined' ? url.value.length : new Blob([url.value]).size,
  )

  const qrSvg = ref<string>('')

  async function regenQr() {
    try {
      qrSvg.value = await QRCode.toString(url.value, {
        type: 'svg',
        margin: 1,
        // 'L' keeps the matrix small at ~580 byte payloads (version 13,
        // 69x69) so phone cameras can actually scan the result.
        errorCorrectionLevel: 'L',
        color: { dark: '#0a0a08', light: '#ffffff' },
      })
    }
    catch {
      qrSvg.value = ''
    }
  }

  watch(url, () => {
    void regenQr()
  }, { immediate: true })

  async function copyUrl(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard)
      return
    try {
      await navigator.clipboard.writeText(url.value)
    }
    catch { /* no-op */ }
  }

  function downloadJson(filename?: string): void {
    if (typeof window === 'undefined')
      return
    const payload = JSON.stringify({
      name: shared.exportName,
      by: shared.exportBy,
      settings: localBag.value,
    }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename ?? `${(shared.exportName || 'preset').replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /**
   * Read a picked JSON file and stage it for the import banner.
   *
   * Nothing is written to the settings store here — the parsed preset goes
   * to `sharedPreset.pending` so the user gets the same Apply / Discard
   * prompt a scanned QR code produces. Returns false when the file is not
   * a preset we recognise, so the caller can surface an error.
   */
  async function importJsonFile(file: File): Promise<boolean> {
    let text: string
    try {
      text = await file.text()
    }
    catch {
      return false
    }
    const preset = parsePresetJson(text, presetNameFromFilename(file.name))
    if (!preset)
      return false
    shared.stage({
      name: preset.name,
      bytes: preset.bytes,
      settings: preset.settings,
      source: 'file',
      format: preset.format,
      skipped: preset.skipped,
    })
    return true
  }

  return {
    url,
    byteSize,
    fieldCount,
    qrSvg,
    copyUrl,
    downloadJson,
    importJsonFile,
    presetName: computed({
      get: () => shared.exportName,
      set: (v: string) => { shared.exportName = v },
    }),
    presetBy: computed({
      get: () => shared.exportBy,
      set: (v: string) => { shared.exportBy = v },
    }),
  }
}
