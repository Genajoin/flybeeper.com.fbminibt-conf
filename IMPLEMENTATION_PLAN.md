# Configurator v2 — Implementation Plan

> Status: phases 1–6 closed. Visual rebuild ("cockpit minimal" — see `design/src/cockpit.jsx`)
> shipped in 2026-05; the branch matches the design and is mergeable. Phase 5 (URL-share)
> and Phase 6 (PWA install/update) folded into the visual rebuild commits.
> Branch: `v2-rewrite` (tagged `v1-legacy` for current main HEAD `9f02e65`).
> Source of truth: `~/dev/Freelance/CONFIGURATOR_UX_DECISIONS.md`.
> Audit: `~/dev/Freelance/CONFIGURATOR_UX_AUDIT.md`.

---

## What we keep from v1

Reused as-is (working, no rewrite needed):

- **GATT discovery layer** — `src/utils/BleCharacteristic.ts` (`BleCharacteristicImpl` class). Wraps `BluetoothRemoteGATTCharacteristic`, parses CPF descriptors (format/exponent/unit/namespace), manages notifications, log entries, subscribers. Battle-tested on real firmware 0.13+ / 0.15+.
- **GATT UUID map / firmware schema knowledge** — embodied in `src/stores/bluetooth.ts` (FSS UUID `904baf04-...`, characteristic UUIDs for thresholds, the 4×12 curve arrays, feature_bits packing) and `locales/en.yml > sett.*` (UUID → human label lookup). Move/refactor but don't re-derive — this took weeks to align with firmware `settings.c`.
- **Settings struct codec (≤0.15)** — the `readMiniBtSettings()` / `writeMiniBtSettings()` byte-level codec in `src/stores/bluetooth.ts` (lines 226-323). Legacy 110/111-byte buffer parser. Keep for backward-compat with old firmware in the field.
- **Per-characteristic mode (≥0.15)** — dynamic discovery + CPF-driven UI rendering (`CharacteristicForm15.vue` logic). Mechanism is good; only the UI rendering itself needs to change.
- **Build / tooling stack** — Vite 5 + vite-ssg + UnoCSS + unplugin auto-import + vue-router file-based routing + pnpm. Don't reset the template; iterate on top.
- **i18n infrastructure** — `vue-i18n` 9 + `@intlify/unplugin-vue-i18n` + `locales/*.yml`. Keep mechanism, retire `es/fr/it`, rewrite strings under new UX.
- **PWA infrastructure** — `vite-plugin-pwa` (Workbox-based) wired in `vite.config.ts` + `src/modules/pwa.ts`. Currently `registerType: 'autoUpdate'` with no install UI; replace registration logic but reuse plugin.
- **Pinia** — `src/stores/bluetooth.ts` + `src/stores/location.ts`. Layout is fine; we'll add `settings` (local-first) and `devices` (saved-device registry) stores alongside.
- **Geolocation wrapper** — `src/utils/LocationParam.ts`. Used by `/cockpit` and `/terminal`. Keep, gate behind explicit opt-in.
- **Device-info docs subtree** — `src/pages/devices/<sku>/{index.vue,changelog.md,manual-{en,ru}.md}` for 7 SKUs (fbminibt, fbps1, fbrc4, fbsv, fbtas, fbfanet, fbfanetvario). Product catalog stays; UI shell wraps them differently.
- **Hosting/CI**: Cloudflare Pages (`.github/workflows/deploy.yml` + `public/_redirects`/`public/_headers`), `Dockerfile` + `docker-compose.yml` (nginx static-serve; historical, not used in prod), `.well-known/assetlinks.json` (Android TWA).

## What we rewrite

- **3D viewer** (`src/components/StlComponent.vue` + 7 STL files in `public/`, ~2.2 MB total). Today it is purely decorative — global `mousemove` listener rotates the model on landing and `/devices/<sku>` pages. Per DECISIONS.md §1 → repurpose as **functional button-map** on Dashboard (clickable hotspots = buttons/LED/buzzer, live state mirror). Keep STL assets but lazy-load (currently pulled into landing bundle via `vue-3d-loader` / three.js, ~600 kB gz).
- **UI shell** — `src/layouts/{default,home,404}.vue` + `App.vue`. Current navbar = 8 inline icons (`@iconify-json/carbon`). Replace with FlyBeeper visual system (own brand, NOT alpisto brutalist — DECISIONS.md §6) per Claude Design output.
- **Settings page** (`src/pages/settings.vue` + `src/components/{CharacteristicForm,CharacteristicForm15,TheSetting,TheCurves}.vue`) — today it's a flat "characteristics list" with raw UUIDs leaking. Rewrite as grouped panels (Audio / Curves / Behaviour / Power / UART / Simulator) per audit §8 IA.
- **Connection flow** — `src/components/DeviceConnector.vue` (the auto-`getDevices()` + `watchAdvertisements()` anti-pattern that triggers Android location prompt). Replace with explicit 2-screen pairing wizard (DECISIONS.md §7) + saved-devices registry with per-device auto-connect toggle (DECISIONS.md §5).
- **State model** — Pinia `bluetooth` store today couples settings state to device lifecycle (`onDisconnected()` wipes `settings`, `bleCharacteristics`, etc.). Migrate to **local-first** (DECISIONS.md §★): settings live in IndexedDB, device is an optional sync target.
- **Curve editor** — `src/components/TheCurves.vue` (12×4 numeric grid + read-only SVG line chart). Replace with draggable SVG chart + climbrate simulator slider + ▶ Demo (DECISIONS.md §8 + §★ 4.2).
- **PWA install UX** — currently `registerType: 'autoUpdate'` blindly. Wire `beforeinstallprompt` → store handle → custom install button + first-pair toast + silent update with unobtrusive banner (DECISIONS.md §10).
- **Landing `/`** — today: 3D STL + single "Device list" CTA + zero copy. Rewrite as explainer + primary Connect CTA (audit §3.1) — no auto-scan.

## What we add new

- **Local-first settings store** (Pinia + IndexedDB). Versioned changes for "revert to N minutes ago".
- **Web Audio fallback** (`AudioContext` + `OscillatorNode` + `GainNode`) for offline tone preview. Toggle "Live preview source": Device / Browser / Off (DECISIONS.md §★ 3).
- **Climbrate simulator slider** — −5...+10 m/s draggable, plays current curve in real time via either Device or Web Audio, with snap presets and Demo walk-through (DECISIONS.md §★ 4.2).
- **URL-share presets** — JSON → base64 → URL fragment (`#preset=...`). Client-side parsing, apply-confirm banner, QR-code generator for sharing. No server (DECISIONS.md §★ §6).
- **iOS Safari Bluefy banner** — feature-detect WebBluetooth absence on iOS Safari → non-blocking banner with deep-link to Bluefy (DECISIONS.md §2).
- **Saved devices registry** — own `localStorage`/IndexedDB record (NOT relying on `navigator.bluetooth.getDevices()` chrome-internal store). Per-device nickname, last-seen, firmware version, auto-connect flag.
- **DE locale** (DECISIONS.md §3 — EN + RU + DE). Drop `es/fr/it`.
- **`/update` docs page polish** — already exists (`src/pages/update.vue`) pointing to nRF Connect, but is bare-bones. Add screenshots + clearer step-by-step (DECISIONS.md §4).
- **Diff-write on settings save** — only push characteristics whose `formattedValue` changed since last read (audit §4.4). Cuts BLE round-trips + flash wear.

---

## Phases

### Phase 0 — Wait for Claude Design (BLOCKING)

Pending receipt of visual mockups (FlyBeeper own brand, NOT alpisto brutalist).

### Phase 1 — Foundation

- [x] Branch off `main` into `v2-rewrite`, tag `v1-legacy`
- [ ] Decide fate of uncommitted CRLF noise + staged STL commit (see "Open questions" below)
- [ ] Strip `es/fr/it` locales; add `de` stub (keep `de.yml` rewritten under new copy)
- [ ] Set up design tokens (colors, fonts, spacing) from Claude Design mockups → `uno.config.ts` theme
- [ ] Replace `presetWebFonts` (DM Sans/Serif/Mono) with brand fonts from Claude Design
- [ ] Audit `@iconify-json/carbon` usage; consider Phosphor/Lucide per audit §9 Path B if Claude Design suggests so
- [ ] Lazy-load `vue-3d-loader` (currently in main bundle, ~600 kB gz)

### Phase 2 — Local-first state layer (DECISIONS.md §★)

- [ ] New Pinia store `useSettingsStore` — settings as first-class objects in IndexedDB (use `@vueuse/core useIDBKeyval` or raw `idb-keyval`)
- [ ] Decouple `bluetoothStore` from settings: BLE = sync target only
- [ ] Disconnect handler: keep `settings` in store, show "Saved locally, audio → browser" banner
- [ ] Reconnect handler: diff dialog (local vs device), explicit "Apply to device" CTA
- [ ] Web Audio service: `useToneSynth()` composable (`AudioContext` + `OscillatorNode` + `GainNode`), frequency/duty/cycle scheduling
- [ ] Audio source toggle: segmented control [Device | Browser | Off]

### Phase 3 — Connection flow + Saved devices (DECISIONS.md §5, §7)

- [ ] Drop auto-`getDevices()` + `watchAdvertisements()` from landing/mount (kill the location-prompt anti-pattern)
- [ ] New `useSavedDevicesStore` — own registry in IndexedDB (name, id, nickname, last-seen, fw version, auto-connect bool)
- [ ] Pairing wizard: 2 screens (explainer → connect). LocalStorage flag to skip on returning users.
- [ ] Saved devices UI: cards with availability indicator (when scan permitted), per-device auto-connect toggle, click-to-retry
- [ ] iOS Safari detect → non-blocking Bluefy banner (DECISIONS.md §2)
- [ ] Catch user-cancel `NotFoundError` silently (no red banner — audit §4.1)

### Phase 4 — Settings panels (DECISIONS.md §8)

- [ ] IA per audit §8: `/dashboard/{audio,curves,behaviour,uart,power,cockpit,terminal,update}`
- [ ] Group characteristics by category (move out of flat list)
- [ ] Per-group save/revert footer
- [ ] Diff-write on Apply (only changed characteristics)
- [ ] Vario curve editor: draggable SVG chart (12 breakpoints, mouse + touch drag)
- [ ] Climbrate simulator slider: −5...+10 m/s, snap presets, ▶ Demo walk-through
- [ ] Live tone feedback on drag (via current audio source toggle)
- [ ] Surface `sett.restart-device` banner (already in i18n, audit §7)

### Phase 5 — URL-share + presets (DECISIONS.md §★ 6) — CLOSED

- [x] Encode: settings JSON → minified → base64 → URL fragment (`src/utils/preset-share.ts`)
- [x] Decode on page load: parse fragment, show "Apply preset?" banner (`PresetImportBanner.vue`)
- [x] Apply to local state via `settings.replaceLocal(...)`
- [x] QR-code generator for current preset (`qrcode` npm, `src/pages/share.vue`)
- [x] Round-trip test (`test/preset-share.test.ts`)
- [ ] Named local presets (deferred — out of MVP scope, not in DECISIONS §6)

### Phase 6 — PWA shell (DECISIONS.md §10) — CLOSED

- [x] Switch `vite-plugin-pwa` `registerType` from `autoUpdate` to `prompt`
- [x] Capture `beforeinstallprompt` event, `preventDefault()`, store handle (`useInstallPrompt.ts`)
- [x] Custom install row in settings hub (always available when `canInstall`)
- [x] First-pair success toast — `InstallToast.vue` (one-shot, `fb:install-toast-shown-v1`)
- [x] Update flow: detect new SW, show banner via `UpdateBanner.vue`
- [x] `skipWaiting` + reload on Update tap (via `useSwUpdate`)
- [ ] Versioned cache names via Workbox config (default generateSW config; revisit if needed)

### Phase 7 — Polish

- [ ] iOS Bluefy banner copy + visual polish (DECISIONS.md §1)
- [ ] `/update` page: add nRF Connect screenshots, clearer step-by-step (DECISIONS.md §4)
- [ ] EN/RU/DE final pass under new copy
- [ ] Friendly error messages (replace raw `Error.toString()` — audit §4.1)
- [ ] Mobile bottom-tab bar (audit §4.7)
- [ ] Cockpit redesign: connection status pill (battery/RSSI/FW) + bigger primary readouts (audit §4.5)

### Phase 8 — QA + deploy

- [ ] Test on real mini BT (firmware 0.13, 0.15+, 0.17 if applicable)
- [ ] Test on Android Chrome / Linux Chrome / macOS Chrome / macOS Safari (Bluefy) / iOS Bluefy
- [ ] Test PWA install on Android + desktop Chrome
- [ ] Test URL-share roundtrip (paste link → preset applies)
- [ ] Test multi-device disconnect/reconnect with local-first state preserved
- [ ] Deploy to Cloudflare Pages preview → smoke test → prod deploy

---

## Key technical decisions (from UX audit)

| #   | Topic         | Decision                                                                                                                     |
| --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3D viewer     | Functional button-map on Dashboard (live state mirror). Keep STL assets, lazy-load.                                          |
| 2   | iOS Safari    | Bluefy redirect banner (deep-link)                                                                                           |
| 3   | Languages     | EN + RU + DE (drop es/fr/it)                                                                                                 |
| 4   | OTA           | `/update` docs page → nRF Connect Mobile (no in-browser SMP DFU)                                                             |
| 5   | Saved devices | Own registry + auto-scan + per-device auto-connect toggle + click-to-retry fallback                                          |
| 6   | Branding      | Own FlyBeeper visual system (NOT alpisto brutalist)                                                                          |
| 7   | Pairing       | 2-screen wizard (explainer → connect), one-time per user                                                                     |
| 8   | Curve editor  | Draggable SVG chart + climbrate simulator slider + Demo ▶                                                                   |
| 9   | Multi-device  | mini BT focused UI; architecture supports PS1/RC4/TAS via config + UI variants                                               |
| 10  | PWA           | Manifest + SW kept. Silent update + unobtrusive banner. Contextual install (toast + footer icon).                            |
| ★   | Local-first   | Settings = first-class objects in IndexedDB. Disconnect ≠ data loss. Web Audio fallback. Source toggle [Device/Browser/Off]. |
| ★   | URL-share     | base64 in URL fragment (`#preset=...`). Static-hosting compatible. QR-friendly.                                              |

---

## Files preserved from v1 (low-touch)

- `src/utils/BleCharacteristic.ts` — GATT wrapper (refactor only if API needs to change)
- `src/stores/bluetooth.ts` — codec + UUIDs (refactor; split connection vs settings vs codec)
- `src/utils/LocationParam.ts` — geolocation helper
- `src/stores/location.ts` — geo store
- `src/pages/devices/<sku>/{changelog.md,manual-{en,ru}.md}` — product docs (rewrite copy only if needed)
- `public/pwa-{192,512}x512.png` — PWA icons (may swap with Claude Design output)
- `public/.well-known/assetlinks.json` — Android TWA fingerprints
- `.github/workflows/deploy.yml` — Cloudflare Pages deploy config

## Files / dirs to delete or significantly cut

- `src/pages/index.vue` (current 3D-on-landing) — rewrite
- `src/pages/[...all].vue` — likely fine but inspect
- `src/components/DeviceConnector.vue` — replaced by wizard + saved-devices UI
- `src/components/CharacteristicForm.vue` (≤0.15 legacy form) — keep codec logic, drop UI
- `src/components/CharacteristicForm15.vue` (≥0.15 generic form) — drop, replaced by grouped panels
- `src/components/TheSetting.vue` — drop (replaced by panel-specific inputs)
- `src/components/TheCurves.vue` — drop, rewrite as draggable chart
- `src/components/TheTerminal.vue` — keep but demote behind advanced toggle
- `src/components/StlComponent.vue` — refactor (drop global mousemove, lazy-load, add hotspot mode)
- `src/components/noSleep.vue` — review necessity
- `locales/{es,fr,it}.yml` — delete

---

## Open questions for new Claude Code session

1. **Uncommitted line-ending noise**: 49 files in working tree differ only by CRLF↔LF. Real changes are zero in those files. Quickest resolution = restore them (`git checkout -- <files>`), make sure `.gitattributes` enforces LF, then commit `.gitattributes`. See "Next step for user" below.
2. **Staged "STL update" commit (2 commits ahead of origin/main)**: 16 files staged (7 STL models updated + StlComponent.vue + 8 device index.vue pages). This is content-real, not noise. Could be committed as `chore: refresh device STL models` before branching off, or carried into v2-rewrite. Recommend: commit on `main` first (small, atomic), then rebase / re-create `v2-rewrite` off updated `main`. Or leave staged on `v2-rewrite` and commit there.
3. **3D viewer fate decision**: DECISIONS.md §1 says "repurpose as functional button-map" — but this is "effort high". Open Q for new session: do we ship Phase 4 (settings) without 3D button-map and add it in Phase 5+ as enhancement, or block on it?
4. **Vite SSG**: current build uses `vite-ssg` for static prerender. Does this hold up with new dynamic state-heavy SPA-style flows? Probably yes (it's just prerender + hydration), but verify early.
5. **vue-3d-loader dependency**: tiny wrapper around three.js. If we keep 3D, consider migrating to direct three.js or babylon.js for finer control (especially for hotspot raycasting). Decision punted to Phase 4/5.
6. **Workbox config**: vite-plugin-pwa uses Workbox under the hood — need to expose precaching + runtime strategies + custom SW for the silent-update flow (Phase 6). May need `strategies: 'injectManifest'` instead of default `generateSW`.
7. **Cypress e2e**: present in package.json but no test files inspected. Decide if we keep + rewrite or drop for v2.
