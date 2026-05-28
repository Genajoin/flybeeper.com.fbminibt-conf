# FlyBeeper configurator

Browser-based Web Bluetooth configurator and demo cockpit for the [**FlyBeeper**](https://alpisto.eu/flybeeper) line of Bluetooth-LE wearables for paragliding and hang-gliding pilots — variometers, FANET radios, TAS sensors and remote controls. Pair the device, tweak audio curves and thresholds, preview the buzzer in the browser, save back to the device.

Live at **[fbminibt-conf.flybeeper.com](https://fbminibt-conf.flybeeper.com)** — install as a PWA on Android / desktop, or use directly in the browser. No accounts, no cloud, settings stay on the device.

Released under **MIT** as a reference implementation and community contribution to the paragliding hardware ecosystem.

---

## Supported devices

Each row links to the product page on [alpisto.eu/flybeeper](https://alpisto.eu/flybeeper).

| Device                                                    | What it does                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| [**FlyBeeper mini BT**](https://alpisto.eu/flybeeper)     | Pocket-sized acoustic variometer with BLE — flagship product |
| [**FlyBeeper Solar Vario**](https://alpisto.eu/flybeeper) | Supercapacitor + solar variometer, no battery to charge      |
| [**FlyBeeper TAS**](https://alpisto.eu/flybeeper)         | Autonomous true-airspeed sensor with Pitot tube              |
| [**FlyBeeper FANET radio**](https://alpisto.eu/flybeeper) | Bluetooth ↔ FANET (868 MHz LoRa) bridge for live tracking   |
| [**FlyBeeper FANET Vario**](https://alpisto.eu/flybeeper) | FANET radio + variometer in a single device                  |
| [**FlyBeeper RC4**](https://alpisto.eu/flybeeper)         | 4-button BLE remote for flight apps                          |
| [**FlyBeeper PS1**](https://alpisto.eu/flybeeper)         | Pressure-sensor reference device                             |

The app discovers any BLE peripheral advertising with the `FB` name prefix and auto-detects firmware features over GATT.

---

## What it does

- **Pairing wizard** — guided first-run that walks pilots through the Web Bluetooth flow.
- **Settings panels** — per-group editors (audio thresholds, vario curves, FANET radio, TAS pitot calibration, power-saving, UART protocols, behaviour flags). Generic CPF-driven UI: firmware ≥ 0.15 exposes each setting as its own GATT characteristic with self-describing format, so new firmware parameters appear automatically with no app update.
- **Draggable curve editor** — 12-breakpoint vario curve (vario / frequency / cycle / duty), with `Sensitive`, `Aggressive` and `Silent-on-ground` presets and a `Custom` snapshot that survives navigation.
- **Audio simulator** — type a vertical speed, hear how the device will sound at that climb / sink rate.
- **Cockpit view** — real-time BLE characteristic monitor for in-field debug.
- **URL-share presets** — one-tap export of settings as a `#preset=…` link with a QR code, scoped to the current settings group for compact transfer.
- **Local-first state** — settings live in IndexedDB per-device, survive disconnect, sync back to the device on `Apply`. Demo mode works without any hardware attached.
- **PWA** — offline-capable, installable, runs in a standalone window.
- **i18n** — English, Russian, German.

---

## Browser support

This app uses the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), which is **only available in Chromium-based browsers** (Chrome / Edge / Brave / Opera) on Android, Windows, macOS, ChromeOS and Linux.

- **iOS / iPadOS**: Safari has no Web Bluetooth. Use [Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055), a free third-party browser that adds Web BLE support — the configurator detects iOS and offers a one-tap deeplink.
- **Firefox**: no Web Bluetooth (intentionally not implemented).
- The page must be served over **HTTPS** (or `localhost`) — browsers gate `navigator.bluetooth` behind a secure context. The configurator detects insecure-context loads and surfaces a clear `HTTPS required` message.

---

## Tech stack

- **Vue 3** + **Vite** + [`vite-ssg`](https://github.com/antfu/vite-ssg) (static prerender of every route, hydrated client-side)
- **Pinia** for state, **IndexedDB** via [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) for per-device persistence
- **UnoCSS** atomic styling + custom design tokens
- **vue-i18n** with YAML locales
- **vite-plugin-pwa** for the PWA service worker + manifest
- [**unplugin-vue-router**](https://github.com/posva/unplugin-vue-router) for file-based routing
- TypeScript end-to-end, ESLint ([@antfu/eslint-config](https://github.com/antfu/eslint-config)), Vitest, Cypress

---

## Development

```sh
pnpm install              # corepack-pinned to pnpm 8
pnpm dev                  # vite dev on :5173, --host for LAN testing
pnpm dev-local            # vite dev on :3333, --open (laptop only)
pnpm build                # vite-ssg static prerender → dist/
pnpm preview              # preview the built dist/ over HTTPS
pnpm typecheck            # vue-tsc --noEmit
pnpm lint                 # eslint .
pnpm test                 # vitest (jsdom)
pnpm test:e2e             # cypress open
```

Note: Web Bluetooth needs a secure context, so for BLE testing on a phone over the LAN, use a Cloudflare / Netlify deploy preview or run `pnpm preview-https` — plain `vite --host` over HTTP won't expose `navigator.bluetooth`.

---

## Deploy

Pure static output (`dist/`) — drop into any static host.

- **[Netlify](./netlify.toml)** — current production deploy. Build: `pnpm build`, publish: `dist`, Node 20.
- **Cloudflare Pages** — supported via `public/_redirects` (SPA fallback) and `public/_headers` (manifest MIME + asset caching). Set build command `pnpm build`, output dir `dist`, Node 20, and enable Corepack to honour the pinned pnpm version.

---

## License

MIT — see [LICENSE](LICENSE).

## Links

- **Product**: [alpisto.eu/flybeeper](https://alpisto.eu/flybeeper)
- **Company**: [alpisto.eu](https://alpisto.eu)
- **Companion: Zephyr board definitions**: `flybeeper-zephyr-board-defs-public` (Apache-2.0, separate repo — open-source Zephyr/NCS board defs for the same hardware)
- **Issues / contributions**: [github.com/Genajoin/flybeeper.com.fbminibt-conf](https://github.com/Genajoin/flybeeper.com.fbminibt-conf)
- **Contact**: gena@alpisto.eu
