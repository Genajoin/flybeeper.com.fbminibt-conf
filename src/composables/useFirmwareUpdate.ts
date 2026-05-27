import { computed } from 'vue'
import { compareFwVersions, stripGitDescribe } from '~/utils/firmwareVersion'
import { DEVICE_CATALOG } from '~/composables/useDeviceCatalog'

export function resolveSku(model: string | null | undefined): string | null {
  if (!model)
    return null
  const norm = model.replace(/\s+/g, '').toLowerCase()
  for (const d of DEVICE_CATALOG) {
    if (norm === d.sku.toLowerCase())
      return d.sku
    if (norm === d.displayName.replace(/\s+/g, '').toLowerCase())
      return d.sku
  }
  if (norm.startsWith('fbminibt'))
    return 'fbminibt'
  if (norm.startsWith('fbfanetvario'))
    return 'fbfanetvario'
  if (norm.startsWith('fbfanet'))
    return 'fbfanet'
  if (norm.startsWith('fbtas'))
    return 'fbtas'
  if (norm.startsWith('fbrc4'))
    return 'fbrc4'
  if (norm.startsWith('fbsv'))
    return 'fbsv'
  if (norm.startsWith('fbps'))
    return 'fbps1'
  return null
}

/**
 * Resolves the connected device's SKU from `bt.dis.modelNumberString`,
 * strips the git-describe suffix off the firmware revision, and compares
 * against the build-time firmware index. When the connected FW is older
 * than the latest published bin, `hasUpdate` flips on — header turns
 * orange, /update surfaces the per-SKU list.
 */
export function useFirmwareUpdate() {
  const bt = useBluetoothStore()
  const { latestFor } = useFirmwareIndex()

  const sku = computed<string | null>(() => resolveSku(bt.dis.modelNumberString.value as string | null))

  const current = computed<string | null>(() => {
    const raw = bt.dis.firmwareRevisionString.value as string | null
    const clean = stripGitDescribe(raw)
    return clean || null
  })

  const latest = computed<string | null>(() => {
    const s = sku.value
    return s ? latestFor(s) : null
  })

  const hasUpdate = computed<boolean>(() => {
    if (!current.value || !latest.value)
      return false
    return compareFwVersions(current.value, latest.value) < 0
  })

  return { sku, current, latest, hasUpdate }
}
