import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { Plugin } from 'vite'

/**
 * Scans public/firmware/<sku>/ for `app_update.<MAJOR.MINOR.PATCH>.bin`
 * files and writes public/firmware/index.json:
 *   { [sku]: { latest: string|null, files: string[] } }
 *
 * Runs once on Vite start and whenever a file under public/firmware/
 * changes. The composable useFirmwareIndex() fetches the JSON at runtime.
 */

const BIN_RE = /^app_update\.(\d+\.\d+(?:\.\d+)?)\.bin$/

interface SkuEntry { latest: string | null, files: string[] }
type Index = Record<string, SkuEntry>

function normalize(v: string): string {
  const parts = v.split('.').map(p => String(Number.parseInt(p, 10)))
  while (parts.length < 3)
    parts.push('0')
  return parts.slice(0, 3).join('.')
}

function compare(a: string, b: string): number {
  const pa = a.split('.').map(n => Number.parseInt(n, 10))
  const pb = b.split('.').map(n => Number.parseInt(n, 10))
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0)
      return d
  }
  return 0
}

function scan(firmwareDir: string): Index {
  const out: Index = {}
  if (!fs.existsSync(firmwareDir))
    return out
  for (const sku of fs.readdirSync(firmwareDir)) {
    const skuDir = path.join(firmwareDir, sku)
    if (!fs.statSync(skuDir).isDirectory())
      continue
    const versions: string[] = []
    for (const f of fs.readdirSync(skuDir)) {
      const m = f.match(BIN_RE)
      if (m)
        versions.push(normalize(m[1]))
    }
    versions.sort((a, b) => compare(b, a))
    out[sku] = { latest: versions[0] || null, files: versions }
  }
  return out
}

export function vitePluginFirmwareIndex(): Plugin {
  const cwd = process.cwd()
  const firmwareDir = path.resolve(cwd, 'public/firmware')
  const indexPath = path.join(firmwareDir, 'index.json')

  function write() {
    const idx = scan(firmwareDir)
    fs.mkdirSync(firmwareDir, { recursive: true })
    fs.writeFileSync(indexPath, `${JSON.stringify(idx, null, 2)}\n`)
  }

  return {
    name: 'flybeeper:firmware-index',
    enforce: 'pre',
    buildStart() {
      write()
    },
    configureServer(server) {
      write()
      server.watcher.add(firmwareDir)
      const onChange = (file: string) => {
        if (file.startsWith(firmwareDir))
          write()
      }
      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)
      server.watcher.on('change', onChange)
    },
  }
}

export default vitePluginFirmwareIndex
