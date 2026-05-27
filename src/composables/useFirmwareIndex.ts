import { ref } from 'vue'

/**
 * Build-time-generated firmware index (see scripts/vite-firmware-index.ts).
 * Fetched lazily on first access; cached for the lifetime of the page so
 * different consumers (header indicator, /update callout, per-SKU list) all
 * read the same snapshot.
 */
export interface FirmwareEntry {
  latest: string | null
  files: string[]
}

type Index = Record<string, FirmwareEntry>

const cache = ref<Index | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let inflight: Promise<Index | null> | null = null

async function load(): Promise<Index | null> {
  if (cache.value)
    return cache.value
  if (inflight)
    return inflight
  loading.value = true
  inflight = fetch('/firmware/index.json', { cache: 'no-cache' })
    .then((r) => {
      if (!r.ok)
        throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<Index>
    })
    .then((data) => {
      cache.value = data
      return data
    })
    .catch((e) => {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    })
    .finally(() => {
      loading.value = false
      inflight = null
    })
  return inflight
}

export function useFirmwareIndex() {
  if (!cache.value && !inflight)
    void load()

  return {
    index: cache,
    loading,
    error,
    latestFor: (sku: string) => cache.value?.[sku]?.latest ?? null,
    filesFor: (sku: string) => cache.value?.[sku]?.files ?? [],
    refresh: () => {
      cache.value = null
      return load()
    },
  }
}
