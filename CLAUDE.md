# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

Browser-based Web Bluetooth configurator for FlyBeeper paragliding/hang-gliding hardware (variometers, trackers, remote controls). The app connects to FB-prefixed BLE devices, reads/writes settings via GATT characteristics, and previews/saves them. Deployed as a PWA at `fbminibt-conf.flybeeper.com` (Netlify). Currently supports 7 SKUs: `fbminibt`, `fbps1`, `fbrc4`, `fbsv`, `fbtas`, `fbfanet`, `fbfanetvario`.

The current `v2-rewrite` branch is mid-refactor — see `IMPLEMENTATION_PLAN.md` for the rewrite scope (local-first state, pairing wizard, draggable curve editor, URL-share presets). Treat that doc as the source of truth for what's keep-vs-rewrite.

## Common commands

```sh
pnpm dev          # vite dev on :5173, host exposed (LAN testing on mobile)
pnpm dev-local    # vite dev on :3333, --open (laptop only)
pnpm build        # vite-ssg build (static prerender → dist/)
pnpm preview      # vite preview on :5173, host exposed
pnpm typecheck    # vue-tsc --noEmit
pnpm lint         # eslint . (antfu config)
pnpm test         # vitest (test/**/*.test.ts, jsdom)
pnpm test:e2e     # cypress open
pnpm sizecheck    # vite-bundle-visualizer
```

Package manager is **pnpm 8** (pinned via `packageManager` field; `corepack enable` first). `postinstall` runs `simple-git-hooks` which wires a pre-commit `lint-staged` hook running `eslint --fix` on changed files.

## Web Bluetooth caveats

- The app **only works in browsers with Web Bluetooth**: Chromium-based desktop + Android Chrome. iOS Safari has no WebBluetooth — use Bluefy (a third-party WebBluetooth-capable browser) on iOS. Code should feature-detect (`'bluetooth' in navigator`, see `bluetoothStore.bleAvailable`).
- Dev must be served over **HTTPS or `localhost`** for `navigator.bluetooth` to be exposed. `pnpm dev --host` over LAN HTTP won't work for BLE testing on a phone — use `preview-https` or a Netlify deploy preview.
- BLE device filter is `namePrefix: 'FB'` (`bluetooth.ts > connectToRequestDevice`). All FlyBeeper devices advertise with that prefix.

## Architecture

### Routing & layouts (file-based, auto-generated)

- Routes come from `src/pages/**` via `unplugin-vue-router` (output: `src/typed-router.d.ts`). Both `.vue` and `.md` files become routes.
- Layouts come from `src/layouts/**` via `vite-plugin-vue-layouts`. Pages opt in to a layout by adding a `<route>` block or by name (default is `default.vue`).
- Device pages live under `src/pages/devices/<sku>/` with three files per SKU: `index.vue` (product page), `manual-{en,ru}.md`, `changelog.md`. The markdown files render through `unplugin-vue-markdown` + `markdown-it-shikiji` for code highlighting.
- Build runs **`vite-ssg`** — every route is statically prerendered at build time and hydrated client-side. New dynamic flows must still hydrate cleanly from prerendered HTML.

### Auto-imports (no manual imports needed)

`unplugin-auto-import` and `unplugin-vue-components` are aggressive. Two generated `.d.ts` files (`src/auto-imports.d.ts`, `src/components.d.ts`) list what's automatically available:

- All Vue composition API, `vue-router`, `vue-i18n`, `@vueuse/core`, `@vueuse/head`.
- Anything in `src/composables/` and `src/stores/` is auto-imported as a named export (`useBluetoothStore`, `useLocationStore`, `isDark`, etc.).
- Anything in `src/components/` is auto-registered as a Vue component (use directly in templates).
- If you add a new composable/store/component and tooling complains it doesn't exist, restart Vite — the dts files regenerate on dev server start.

### State: Pinia stores

- `src/stores/bluetooth.ts` — single big store holding connection state, discovered characteristics, parsed settings, device list. Couples device lifecycle with settings (`onDisconnected()` wipes everything). The v2 rewrite splits this; until then, expect tight coupling.
- `src/stores/location.ts` — geolocation (used by `/cockpit`, `/terminal`).

### BLE layer (the load-bearing bit)

- `src/utils/BleCharacteristic.ts` — `BleCharacteristicImpl` wraps `BluetoothRemoteGATTCharacteristic`. Parses CPF (Characteristic Presentation Format) descriptors to figure out format/exponent/unit, manages notifications, keeps a log buffer per characteristic, exposes a subscriber pattern. This is the generic ≥0.15-firmware path.
- `bluetooth.ts > readMiniBtSettings` / `writeMiniBtSettings` — the **legacy ≤0.15 codec** that packs/unpacks a 110/111-byte buffer at fixed `indexes` offsets (climb/sink thresholds, four 12-element curve arrays, simulator value, uart_protocols, feature_bits). Keep working for old firmware in the field. Adding a new field on this path means updating `indexes`, `iFbMiniBtSettings`, both read and write, and the buffer size.
- **FlyBeeper Settings Service UUID** (`FSS`): `904baf04-5814-11ee-8c99-0242ac120000`. Settings characteristic: `...0001`. Simulation characteristic: `...0002`. Device Information Service uses standard 16-bit UUIDs (`2a24` model, `2a26` firmware rev, `2a29` manufacturer).
- Firmware-rev gating: `Number.parseFloat(firmwareRevisionString.value) <= 0.15` switches between legacy struct codec and per-characteristic CPF-driven UI. Keep both paths working until v2 ships.
- The `connectToRequestDevice` filter prefixes `'FB'`; `optionalServices` must list every service the app reads from or Chrome will reject access post-pairing.

### i18n

- `locales/{en,ru,de,es,fr,it}.yml`. EN is the source; `sett.*` keys map BLE characteristic UUIDs to human labels and unit suffixes (this is the lookup table the per-characteristic UI uses).
- `src/modules/i18n.ts` lazy-loads locale on demand based on `navigator.language`, falls back to `en`.
- Per the v2 plan: `es/fr/it` will be dropped, `de` rewritten under new copy. Don't translate strings into those three.

### Modules pattern

`src/main.ts` glob-imports every `src/modules/*.ts` and calls its `install(ctx)` — that's how `i18n`, `pinia`, `pwa`, `logs` get wired. Add a new module by exporting `install: UserModule` (`UserModule` defined in `src/types.ts`) from a file in that dir; it'll be picked up automatically on next build/dev.

### Styling

- **UnoCSS** (atomic, Tailwind-compatible syntax) via `uno.config.ts`. Presets: `uno`, `attributify` (so `text="center gray-700 dark:gray-200"` is valid), `icons` (carbon + mdi), `typography`, `webfonts` (DM Sans/Serif/Mono — to be replaced by brand fonts in v2).
- Shortcut classes `btn` and `icon-btn` defined in `uno.config.ts`. Prefer these for consistency.
- Dark mode via `src/composables/dark.ts` (`useDark` from `@vueuse/core`); class strategy.

### PWA

- `vite-plugin-pwa` with `registerType: 'autoUpdate'` — currently silent updates with no install UI. The v2 plan switches to `prompt` + custom install button + update banner. Manifest defined in `vite.config.ts`.
- `public/.well-known/assetlinks.json` is the Android TWA digital-asset link — don't break it without updating the Play Console fingerprints.

## Conventions

- **TypeScript everywhere except generated `.d.ts`**. `vue-tsc` is the source of truth for type errors; `tsc` alone won't understand `.vue` SFCs.
- ESLint config is `@antfu/eslint-config` with `unocss` and `formatters` enabled. **No semicolons, single quotes, 2-space indent, LF endings** (see `.editorconfig`). `lint-staged` auto-fixes on commit.
- Line endings: the working tree has historical CRLF noise. **Always commit with LF**. Don't introduce a `.gitattributes` change in a feature PR — that's a separate cleanup tracked in the v2 plan.
- Path alias: `~/` → `src/` (vite + tsconfig). Use it for cross-dir imports.
- Pages and components frequently use `<script setup lang="ts">` + composition API. Stick to that style; no Options API in new code.

## Things to know before changing the BLE layer

- The firmware team's `settings.c` is the ultimate source of truth for the legacy struct layout — the byte offsets and bit packing in `readMiniBtSettings` were aligned against it across multiple firmware revisions. Don't reorder or resize without checking with firmware.
- `feature_bits` is a packed byte: `silent_on_ground` (b0), `ble_never_sleep` (b1), `led_blinky_by_vario` (b2), `hid_keyboard_off` (b3). Added in firmware >0.13.
- Curves are four parallel 12-element `Int16` arrays (vario breakpoint, frequency, cycle, duty). They're written together — there's no partial update on the legacy codec.
- New ≥0.15 firmware exposes each setting as its own GATT characteristic with CPF descriptors describing format/unit. The generic CPF-driven UI handles those automatically — adding a setting on new firmware is a no-code change here (the UI infers the widget); only the `sett.*` i18n labels need updating.

## Deploy

- **Netlify** (`netlify.toml`): `pnpm run build` → `dist/`, SPA fallback redirect to `/index.html`, `.webmanifest` content-type fix.
- `Dockerfile` + `docker-compose.yml` exist for local-with-traefik development but are not used in production.
