# FlyBeeper mini BT Configurator — UX Audit

Source: https://config.flybeeper.com
Codebase: `/home/gena/dev/FlyBeeper/APP/flybeeper.com.fbminibt-conf/`
Firmware ref: `/home/gena/dev/FbBT/firmware/FlyBeeperBT/`
Audit date: 2026-05-26

This document is the full context for a visual redesign. Target reader: Claude Design (or any UI designer). The configurator is a single‑page Web Bluetooth tool that lets a paraglider pilot read and write settings on a small nRF52‑based vario over BLE GATT from a Chromium browser. The current UI is a thin, generic “characteristics list” style; it does not feel like a product UI for end users and it leaks a lot of firmware detail (raw cm/s, raw UUIDs, struct dumps).

---

## 1. Tech stack summary

Vue 3.4 + TypeScript + Vite SSG (static prerender), UnoCSS (atomic classes, no design system), Pinia stores (`bluetooth`, `location`), `vue-i18n` 9 with 6 locales (en, de, es, fr, it, ru), `vue-3d-loader` (three.js wrapper) for an STL preview, `vite-plugin-pwa` for installable PWA, Cypress e2e. Web Bluetooth API direct (no abstraction lib). Auto‑imports via `unplugin-auto-import` + `unplugin-vue-components` + `unplugin-vue-router` file‑based routing. Codebase is small (~18 MB on disk incl. STL models; `src/` is ~14 files). **Stack target for redesign: Vue 3 + UnoCSS or Tailwind, not React, not Astro.**

---

## 2. Feature inventory (GATT mapping)

GATT services exposed by mini BT firmware (`FlyBeeperBT/src/`) and consumed by the Vue app:

| Service | UUID | Purpose | Used in UI |
|---|---|---|---|
| Device Information (DIS) | `0x180A` | Manufacturer / Model / Firmware revision | yes (header label only) |
| Environmental Sensing (ESS) | `0x181A` | Temperature, Pressure, Elevation | yes (cockpit) |
| Location & Navigation (LNS) | `0x1819` | Vario by pressure, by altitude | yes (cockpit) |
| Battery (BAS) | `0x180F` | Battery level %, battery voltage mV | yes (cockpit) |
| Automation IO (AIO) | `0x1815` | Buttons bitmask (4 buttons) | yes (cockpit) |
| HID | `0x1812` | HID keyboard emulation (advertised, not configured in UI directly) | toggle only |
| FlyBeeper Settings Service (FSS) | `904baf04-5814-11ee-8c99-0242ac120000` | All vario settings | yes (settings page) |

All writable user‑facing characteristics under FSS, as defined by firmware `settings.c` / `settings.h` and discovered by `src/utils/BleCharacteristic.ts`:

| Feature | UUID | Type / unit | Current UX |
|---|---|---|---|
| Vario simulator value | `904baf04-…-120002` | int16, cm/s (exp −2 → m/s) | slider that streams writes; muted unless volume > 1 |
| Buzzer volume | `67f82d94-2b2a-4123-81c9-058e460c3d01` | int16 0..3 | number input |
| Climb tone ON threshold | `fcb14ed9-06e7-4a9e-b311-6eee676a2f48` | int16 cm/s | number input |
| Climb tone OFF threshold | `1673f137-66c1-4ff0-8db3-69b9ed7c33e0` | int16 cm/s | number input |
| Sink tone ON threshold | `b713f438-42fe-46fe-b052-371a3b9e433a` | int16 cm/s | number input |
| Sink tone OFF threshold | `8a78979b-1425-4160-b34b-ac5aadddeb21` | int16 cm/s | number input |
| Vario dots (12 points) | `512d6d89-7a6f-461c-983e-902b68d40f56` | int16[12] | 12 numeric cells in a table + Plotly‑less SVG curve |
| Frequency dots (12 points) | `8c090502-81c4-4d29-8d10-6db20607ace9` | int16[12] Hz | 12 numeric cells |
| Cycle dots (12 points) | `9c3b62c0-e227-4f1a-8342-7e647015555d` | int16[12] ms | 12 numeric cells |
| Duty dots (12 points) | `98c16914-00ad-47ba-b625-148f0baaec47` | int16[12] % | 12 numeric cells |
| UART protocol | `84ccd3d4-a262-45e6-b616-d4a4ae7c0d5b` | int16 (1=PRS, 2=POV) | number input with hint in label |
| Silent on the ground | `daadb8a9-a566-450e-97d0-990a0c8487dd` | bool | checkbox |
| BLE never sleep | `d9eec180-…` (legacy) / `3c844ac9-…` (new) | bool | checkbox |
| LED blink by vario | `a37e549a-f501-4e77-9c3d-291c85542471` | bool | checkbox |
| Deactivate HID keyboard | `86591053-2856-4f25-a35c-b753f0deea8f` | bool | checkbox |
| Vario averaging | `7e035080-7417-4393-959a-58505ef9cf4a` | int16, sec (exp −3) | number input |
| Power off timeout | `9a560750-0bca-4d0c-a1fc-21bbc574d5a6` | int8, hours | number input |
| Climb hysteresis | `0e984fe9-534c-4f13-969c-58ce03d33527` | int16, m/s | number input |
| Smooth frequency change | `e88b07e7-9035-4afa-9fe8-206ddc34de61` | bool | checkbox |
| UART data duplication | `113bb48c-7e3f-4580-a561-acf6c9eb42a5` | bool | checkbox |

Firmware also defines (behind `CONFIG_EMULATE_FANET`, mini BT does not enable): radio frequency / bandwidth / datarate / coding rate / TX power. Not in scope for mini BT but the same configurator page is shared across devices, so these may surface for other FB hardware.

**Counts.** Firmware FSS: ~17 active + ~5 commented‑out + 5 FANET‑gated. Vue app discovers them dynamically via `getCharacteristics()`, so the inventory in the UI ≡ firmware exposes whatever it advertises. **No drift between FW and Vue** — the Vue app is mostly a generic GATT browser with a few hard‑coded UUIDs for the curve editor and a settings struct parser for firmware ≤0.15. From 0.15+ it uses per‑characteristic CPF (Characteristic Presentation Format) descriptors to drive the UI type.

Hardware (`boards/arm/fbminibt/fbminibt.dts`): nRF52832, **4 push buttons** (P0.02‑05), 1 blue LED, 1 PWM buzzer with 2 GPIO volume‑enable lines (3 discrete volume levels), SPI pressure sensor (SPL06 / BMP280), ADC battery voltage. Buzzer volume is therefore a **0..3** integer, not a percentage. The configurator does not communicate this.

---

## 3. Current user journey (step‑by‑step)

1. **Landing `/`** — almost empty. A 400×400 STL render of the device on a white/black canvas (`StlComponent.vue` uses three.js, model rotates with mouse), one button **“Device list”**, and a top navbar with 8 icons (home, settings, cockpit, update, terminal, about, dark, lang, bluetooth). No copy, no first‑use explanation, no “what is this”, no preview of what you can do without a device.
2. **`/devices`** — flat list of 7 router‑link buttons: mini BT, pressure sensor, RC4, TAS, FANET, FANET Vario, Sun Vario. No icons, no badges. User clicks **FlyBeeper mini BT**.
3. **`/devices/fbminibt`** — product info page with a paragraph, a 3D STL preview, and links: Firmware update, Manual EN/RU, FlyBeeper Shop, Blog. **Connect button is not here** — user has to figure out that connect lives in the top‑right of the navbar or that some pages (Settings, Cockpit, Terminal) auto‑show a Connect prompt.
4. **`/settings`** (or tapping bluetooth icon) — calls `DeviceConnector.vue`. On mount it calls `bt.getDevices()` which uses `navigator.bluetooth.getDevices()` to read already‑permitted devices and **subscribes each to `watchAdvertisements()`** — on Android this triggers a location permission prompt even if the user only wants to connect once. The component renders an empty page with “Bluetooth disconnected” + a **Connect** button. Below it, if `getDevices()` returned any, a manual list of saved devices with **live RSSI** number is rendered.
5. **Connect tap** → `navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'FB' }], optionalServices: [...] })` → native chooser. User picks. The app then walks every service, every characteristic, creates a `BleCharacteristicImpl` for each (no `initialize()` here — it is deferred until the page that needs the value), reads DIS strings to know firmware version, then for FBminiBT ≤0.15 reads the **whole 110/111‑byte settings buffer in one shot** via the legacy struct characteristic, otherwise the per‑characteristic mode is used.
6. **Settings page after connect** — `CharacteristicForm.vue` (≤0.15) or `CharacteristicForm15.vue` (>0.15) renders. For 0.15+ the UI sorts characteristics by `presentationFormatDescriptor.format` and shows whatever discovery returned. UUIDs are translated via `locales/en.yml > sett.<uuid>` lookups; unknown UUIDs fall through to the raw 36‑char UUID string as a label. A separate table for the 4 curve arrays + an inline SVG line chart. Three preset buttons (Default / Log / Linear) and **Apply** (greyed until something changed). Plus Download/Upload JSON for settings.
7. **`/cockpit`** — live telemetry. Subscribes to all notify‑capable characteristics, renders them in a flex grid of grey cards, and **also starts `navigator.geolocation.watchPosition`** (`loc.startWatchingSpeed()` in `TheParams.vue` `onMounted`) → second location prompt, this time genuine, used to show GNSS speed/altitude/heading next to barometric values.
8. **`/terminal`** — text log of every notification (timestamped CSV), Save / Clear / Pause buttons. Also starts geolocation watch (same reason).
9. **`/update`** — pure documentation page pointing to **nRF Connect for Mobile** and **nRF Connect Device Manager** as the “real” OTA tools. **There is no in‑browser OTA flow.**
10. **Saved devices** — persisted by Chromium itself (Web Bluetooth permission store), surfaced via `navigator.bluetooth.getDevices()`. The app does **not** keep its own localStorage record of name / last connect / nickname. There is **no auto‑reconnect** — the user always taps Connect.
11. **Settings save** — for ≤0.15 firmware, one giant `writeValue(buffer)` of 110/111 bytes. For 0.15+, **iterates every characteristic and writes one by one** in `updateCharacteristic()`. There is no batching, no diff: all characteristics are rewritten on Apply even if only one changed. There is no “live apply” — values only go to device on Apply tap.

---

## 4. Pain‑points catalogue

### 4.1 Scanning / pairing / saved devices  *(severity: high)*

- `DeviceConnector.vue` immediately calls `bt.getDevices()` → `navigator.bluetooth.getDevices()` → `device.watchAdvertisements()` for **every** previously paired device on mount. On Android this is the call that triggers the **location permission prompt**. On desktop Chrome it spins up BLE scanning continuously while the page is open, draining the host’s BLE adapter and showing meaningless live RSSI updates. **Recommend:** only call `getDevices()` when the user explicitly opts in (“show last devices”), and only call `watchAdvertisements()` when the user taps that specific device’s reconnect button.
- Saved devices list shows just `{name} ({rssi})` with no last‑seen timestamp, no firmware version, no friendly nickname. Tapping reconnects via `connectToDevice(device)`.
- “Connect” is buried in the navbar bluetooth icon. From `/devices/fbminibt` (the product page the user lands on after browsing the device list) there is no Connect CTA.
- Error states (`bt.errorMessage` is the raw `Error` object) are dumped to a red `<div>` with `.toString()` semantics. Users see things like `NotFoundError: User cancelled the requestDevice() chooser`.

### 4.2 3D viewer  *(severity: med — distraction, not blocker)*

- Lives in two places: `/` (landing) and `/devices/fbminibt` (product info). Implemented in `StlComponent.vue` via `vue-3d-loader`. The component listens to **global `mousemove`** and rotates the STL based on cursor position relative to viewport — feels gimmicky and steals input on desktop.
- It is **purely decorative**: not a hotspot map of buttons, not an indicator of connection state, not a place to point at the LED or buzzer. The STL files (`/public/fbminibt-model.stl` and 6 siblings) are static product renders.
- It is **not in the configurator path**. A connected user never sees it again after entering Settings. So it is overhead on the landing only.
- **Recommendation:** drop on landing, replace with a 2D product photo + clear value prop. Optionally repurpose the 3D model on the Dashboard as a button‑map overlay: hover a button → highlights the corresponding `sw0..sw3` from the DTS, with current bitmask state from `BT_UUID_BUTTONS`. That would make the 3D actually functional.

### 4.3 Geolocation prompts  *(severity: high)*

- Two distinct location prompts exist and they fire at unexpected times:
  1. `DeviceConnector.getDevices()` → `watchAdvertisements()` → **Android location prompt on first visit to /settings, even before pairing**.
  2. `location.startWatchingSpeed()` in `/cockpit` and `/terminal` → real foreground geolocation prompt.
- The “About” page has an explicit *Request Location Access* button — orphan UX, only useful as a debug toggle.
- **Recommendation:** never call `getDevices()` / `watchAdvertisements()` automatically. Move the second prompt to an opt‑in toggle on the Cockpit page: “Overlay GNSS speed/altitude”.

### 4.4 Settings page (raw UUIDs, no grouping)  *(severity: high)*

- `CharacteristicForm15.vue` simply iterates `bt.bleCharacteristics` filtered by FSS service UUID, sorts by `presentationFormatDescriptor.format`, and renders one `<TheSetting>` per characteristic with a label = `t('sett.' + uuid)` or fallback to the raw UUID string. If the firmware adds a characteristic the app doesn’t know about, the user sees `daadb8a9-a566-450e-97d0-990a0c8487dd: [input]`.
- No grouping (audio / behaviour / sleep / advanced), no progressive disclosure, no defaults marker, no per‑field help text. Boolean toggles are native `<input type="checkbox">` next to numbers and inline next to vario curve cells.
- Vario curve editor is a **12×4 grid of number inputs** plus an SVG line chart (`TheCurves.vue`). Hard to use on mobile and hard to understand without prior knowledge of the four arrays (vario / freq / cycle / duty). Presets are unlabeled beyond *Default / Log / Linear*.
- **Apply** is the only commit affordance. There is no per‑field “revert”, no “unsaved changes” banner if you navigate away, no firmware‑side ack other than the `writeValue` promise resolving.
- Write path on 0.15+ writes **every** FSS characteristic on Apply (sequential `await`s), not a diff — slow on a 4‑connection BLE link, and creates flash wear on the device side because `conf_cb->changed()` fires for every one.

### 4.5 Cockpit  *(severity: low)*

- Telemetry tiles are mixed: BLE values from notify chars + 5 GNSS tiles concatenated. Tile background colour is hard‑coded `#e0e0e0` / `#343a40` — bypasses the rest of the UnoCSS theming. Reads barometric altitude in m as a tiny number; no big primary readout.
- No connection status pill (battery %, RSSI, firmware version) at the top — those values live in BLE characteristics that the cockpit subscribes to but there is no design treatment.

### 4.6 Firmware update  *(severity: med)*

- `/update` is a documentation page only. It tells the user to install one of two external Nordic apps to do DFU. Web Bluetooth could host an in‑browser MCUmgr / SMP DFU client (Nordic provides a JS sample), but this is not done.
- Even if you keep it as docs, the design should make it look like *“you need an external tool, here is why”* rather than a half‑finished page.

### 4.7 Mobile responsiveness  *(severity: med)*

- The 12‑column curve table breaks below ~360 px (set as `min-w-340px` on the controls column). On a phone in portrait the inputs wrap to two rows per array and the SVG chart drops below.
- The navbar uses 8 icons on a single line with `text-xl`; on small phones it wraps. There is no bottom tab bar.

### 4.8 i18n / copy  *(severity: low)*

- 6 locales, all roughly 138 lines, parity looks OK. Copy is functional but reads like raw firmware variable names (“Start climbing (cm/s)”, “Cycle”, “Duty”). No tooltips explaining what a “cycle” is.
- Some user‑facing units are wrong scale: thresholds are stored as cm/s and labelled cm/s, but a user thinks in m/s. The legacy `CharacteristicForm.vue` (≤0.15) inherits the same.

### 4.9 Other UX smells

- **Apply vs live**: the simulator slider is *live‑debounced* (200‑300 ms), settings are *Apply‑gated*. Mixed model with no visual cue.
- **Disconnect handling**: on `gattserverdisconnected` the store wipes everything to empty objects, the UI flips back to `DeviceConnector`. No “reconnect?” offer, no toast, no countdown.
- **Bundle**: `vue-3d-loader` brings three.js (~600 kB gz) into the landing bundle even though three.js is only needed for the STL preview. Vite SSG inlines it. **Lazy‑load the 3D model.**
- **Manuals**: route uses markdown pages `manual-en.md`, `manual-ru.md` — only EN/RU are available; other locales fall back to EN. This is decoupled from the i18n `locale` switch.
- **PWA**: configured but no offline‑friendly value (the app needs BLE which is online‑in‑hardware anyway).

---

## 5. Web Bluetooth constraints (hard limits for any redesign)

- **iOS Safari does not support Web Bluetooth** at all. Users need Bluefy / WebBLE browser, or a native iOS app. The current app does not detect this and just says “Your device not support Bluetooth.”.
- **Android Chrome requires location permission** for any BLE scan or advertisement watch (security model bundles BLE scanning under coarse location). `requestDevice` itself does not trigger it, but `watchAdvertisements()` and `getDevices()` returning anything with discovery do. **Avoid those APIs on first visit.**
- **No background BLE** — when the tab loses visibility, browsers throttle and may drop the GATT connection. PWA installation does not help; there is no Web Bluetooth in service workers.
- **No auto‑pairing** — every new device needs a user gesture going through the native chooser. You can never pre‑populate the device list with “nearby FBminiBT”.
- **HTTPS only** — already satisfied (config.flybeeper.com).
- **Connection is single‑GATT** — disconnects on navigation between tabs of a desktop browser, on screen lock on mobile, on charger plug events on some devices.
- **Chooser cannot be styled** — the device picker is OS‑native.
- **No raw BLE scan API in stable Chrome** — `requestLEScan` is behind a flag. Reconnect to known devices uses `getDevices()` + `watchAdvertisements()` (both gated by the location prompt above).

---

## 6. Competitive analysis

| App | Pattern worth borrowing |
|---|---|
| **nRF Connect for Mobile** (Nordic, native) | Per‑device dashboard with prominent battery / RSSI / connection state pill; collapsible service tree under a clean “Settings” tab; explicit Reconnect button per saved device. |
| **Pebblebee / Tile / Chipolo** consumer trackers (native + web) | First‑run pairing wizard with a single big CTA, an illustration of where to find the button on the physical device, and a single success state. No flat “Device list”. |
| **Bangle.js App Loader** (web, Espruino) | Web Bluetooth done well: one‑screen flow `Connect → Dashboard with apps + battery + storage`. No location prompts because they never use `getDevices`. Settings grouped into clearly named cards. |
| **Insta360 Studio / DJI Mimo** companion settings | Dashboard‑first after connect: firmware version, battery, storage, recent shots. Settings live behind a gear icon; advanced live in a separate “Pro” section. Curve editors (LUTs) use draggable points on a real chart, not a 12×4 number grid. |
| **WLED** (open‑source LED controller, web) | Profile/preset system done well: named presets, JSON import/export, “revert to default” per section. The FBminiBT configurator has the bones (presets + JSON download/upload) but no naming or per‑section revert. |

**Takeaways to borrow:**
1. One‑screen pairing wizard with a hero image of the device and a single CTA (Pebblebee).
2. Persistent connection pill: battery %, RSSI bars, firmware, *Disconnect* (nRF Connect).
3. Vario curve editor as a draggable line chart, not numeric grid (DJI/Insta).
4. Named presets stored locally with import/export (WLED).
5. Never call `getDevices`/`watchAdvertisements` until user asks (Bangle.js).

---

## 7. Web Bluetooth pattern checklist

**Dashboard after connect (must show without sub‑navigation):**
- Device name (editable nickname, persisted to `localStorage`)
- Battery % + voltage
- RSSI / link quality pill
- Firmware version + “update available?” badge
- Buzzer volume current value (one‑tap change)
- Big *Disconnect* button (top‑right)
- *Reconnect last device* if currently disconnected

**Pairing flow:**
- Single screen, single primary CTA, illustration of the device.
- Do not call `getDevices()` or `watchAdvertisements()` on landing.
- Detect iOS Safari → show “Use Bluefy browser” fallback link with explanation.
- Save the device’s name + last‑connected timestamp + nickname to `localStorage`; on next visit, show “Reconnect to {nickname}” chip — clicking calls `requestDevice` again (cannot bypass the chooser).
- Catch user‑cancel error silently (no red banner).

**Settings flow:**
- Group: Audio (volume, climb/sink thresholds), Vario curves, Hardware (LED, HID, silent on ground), Power (sleep timeout, BLE never sleep), UART, Simulator.
- Each group is a card with a clear save/revert footer.
- Vario curves: draggable points on the line chart, with secondary number inputs available as advanced.
- Diff write: only `writeValue` characteristics whose `formattedValue` differs from the last read.
- “Restart device to apply” banner is already in i18n (`sett.restart-device`) — surface it.

**OTA:**
- Either implement in‑browser SMP DFU (file chooser → progress bar → countdown → reconnect) or kill the page and replace it with a one‑screen explainer with two clearly captioned CTAs to the Nordic apps + screenshots.

---

## 8. Recommended Information Architecture

```
/                       Landing — explainer + Connect CTA (no 3D, no auto‑scan)
/connect                Single‑screen pairing wizard (lazy‑loaded)
/dashboard              After connect — main hub with status pills + quick toggles
  /dashboard/audio        Buzzer volume, climb/sink thresholds, simulator
  /dashboard/curves       Vario / freq / cycle / duty curves (chart‑first)
  /dashboard/behaviour    Silent on ground, BLE never sleep, LED, HID, smooth freq
  /dashboard/uart         UART protocol + duplication
  /dashboard/power        Sleep timeout, vario averaging
  /dashboard/cockpit      Live telemetry (opt‑in GNSS overlay)
  /dashboard/terminal     Raw log (advanced, collapsed in menu)
  /dashboard/update       Firmware update (in‑browser SMP or Nordic apps fallback)
/devices                Catalog of all FlyBeeper devices (existing, keep)
/devices/<sku>          Product info page per device (existing)
/about                  Help, version, links, language, install PWA
```

Mobile: bottom tab bar with 4 tabs (Dashboard, Curves, Cockpit, More). Desktop: left rail.
On disconnect: return to `/connect` with a “Reconnect to {nickname}?” chip.

---

## 9. Visual design hints for Claude Design

The user already has a brutalist v5 visual system on alpisto.eu. Two paths:

**Path A — match alpisto‑eu brutalist (recommended for brand continuity):**
- Palette: paper‑warm bg, ink black, accent orange `#ff5b1f`. 2 px ink borders, no soft shadows.
- Fonts: Space Grotesk (display + body), Geist Mono for status pills and eyebrows.
- Status badges as monospace pills with single‑glyph indicators: `◉ live`, `◌ idle`, `× error`, `▲ update`.
- Cards are flat rectangles with 2 px borders; section headers are uppercase monospace eyebrows.
- Battery / RSSI / FW pills sit in a top row of the dashboard, monospace, no rounded corners.

**Path B — neutral modern (if user wants a different look for the tool):**
- Tailwind defaults + Inter / system‑ui.
- Soft 12 px radius cards, subtle shadow, neutral grey scale.
- Iconography from Phosphor or Lucide (not Carbon — the current app uses `@iconify-json/carbon` which is an IBM‑specific set and reads as enterprise).

In both cases: drop the three.js STL on landing; replace with a 2D illustration or hero photo. Keep a 3D viewer only inside the Dashboard, as a functional button‑map overlay (optional, low priority).

---

## 10. Open questions for the user (decide before handoff)

1. **3D viewer** — remove entirely or repurpose as functional button‑map on Dashboard?
2. **iOS Safari** — detect & redirect to Bluefy with explainer, or skip Apple users for now?
3. **Languages** — keep 6 locales (en/de/es/fr/it/ru) or trim to EN + RU + DE for the redesign and re‑translate the new copy?
4. **In‑browser OTA** — invest in SMP/MCUmgr Web Bluetooth implementation, or keep `/update` as a docs page pointing to Nordic apps?
5. **Saved devices** — auto‑attempt reconnect to last device on landing (single user gesture to confirm), or always require explicit click?
6. **Branding** — match alpisto‑eu brutalist or new visual system for the tool?
7. **Pairing wizard vs no‑wizard** — single screen with hero illustration, or skip straight into the dashboard scaffold with a sticky Connect button?
8. **Curve editor** — replace 12×4 number grid with draggable chart points (bigger redesign), or keep grid and just style it nicely?
9. **Other FB devices** — design only for mini BT (single‑device tool) or keep the multi‑device catalog architecture? Right now `/devices` lists 7 SKUs and most share the same FSS UI.
10. **PWA** — keep installable PWA or drop it (Web Bluetooth doesn’t benefit from offline)?
