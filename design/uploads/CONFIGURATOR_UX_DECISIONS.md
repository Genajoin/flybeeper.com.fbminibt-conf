# Configurator mini BT — UX decisions (для Claude Design handoff)

Решения собраны в диалоге 2026-05-26 по 10 вопросам из `CONFIGURATOR_UX_AUDIT.md` §10.

---

## 1. iOS Safari (Web Bluetooth не поддерживается)

**Решение**: detect iOS Safari → показать non-blocking banner с предложением открыть в **Bluefy Browser** (бесплатный, App Store, deep-link). Свой документации не пишем — ссылаемся на bluefy.app.

**Почему**: ~20% paragliding community на iOS, игнорировать нельзя. Нативное приложение — отдельный проект ×5-10 effort, не сейчас.

## 4. OTA firmware updates

**Решение**: `/update` страница с инструкцией использовать **nRF Connect Mobile** (Nordic standard, free, iOS+Android). В конфигуратор web-OTA не пишем.

**Почему**: nRF Connect — отраслевой стандарт в Nordic ecosystem. SMP/MCUmgr Web Bluetooth implementation = 1-2 недели работы без fallback. Docs-страница = пара часов и проверенный путь.

## 5. Saved devices flow (детально)

**Решение** — гибрид:

1. **На landing — автоскан** запускается сразу (если поддерживается BLE).
2. **Сохранённые устройства подсвечиваются** в списке если найдены в эфире (зелёный индикатор «available»).
3. **Индивидуальный toggle «Автоконнект»** на каждом сохранённом устройстве. Если включён для последнего использованного — автоматически коннектится при появлении в эфире (после первой ручной пайры в сессии — Web BLE требует user gesture).
4. **Fallback**: если автоскан не сработал (старый браузер) или устройство не найдено — **клик на сохранённое устройство** стартует цикл поиск+подключение вручную.
5. Saved-list поддерживает rename + delete per device.

**Почему**: Web BLE не даёт background-reconnect, но в пределах активной сессии можно сделать гладкий UX. Returning users не должны проходить full pair каждый раз.

## 10. PWA

**Решение**: Manifest + service worker **оставляем** (offline нужен в горах — это реальный use case, не edge case). Install-prompt **управляем сами**.

### Install button (контекстный, не auto-prompt)

- **Toast после первой успешной пайры**: «Установить для оффлайн-доступа в горах?» (показывается один раз, dismiss = больше не показываем).
- **Иконка `📲 Установить`** в footer/menu — всегда доступна для тех кто отказался от toast.
- Технически: `beforeinstallprompt` event → сохранить в переменную → `preventDefault()` (Chrome banner НЕ показывается) → вызвать `.prompt()` по клику нашей кнопки.

### Update strategy — гибрид silent + unobtrusive banner

Workflow:
1. Service worker слушает обновления в фоне: `registration.update()` на focus и periodic.
2. При обнаружении новой версии — устанавливает в фоне, **не активирует** сразу.
3. Показывает **тонкий баннер вверху** (не модал, не блокирует): «Доступна v1.2.3» + [Обновить] + [×].
4. **Обновить** → `skipWaiting()` + `location.reload()` → пользователь на свежей версии.
5. **×** → баннер скрывается до конца сессии. Обновление активируется **автоматически** при следующем закрытии+открытии вкладки (тихий `skipWaiting` on activate).
6. Hard reset больше не нужен — versioned cache name (`cache-v1.2.3`) делает invalidation автоматически.

**Почему**: пользователь не страдает от force-modal, но обновление неизбежно. Eventually consistent. Использовать [Workbox](https://developer.chrome.com/docs/workbox) — это стандарт, ~30 строк кода.

---

## 1. 3D viewer

**Решение**: Repurpose как **functional button-map** на Dashboard. 3D-модель устройства остаётся, но превращается из декорации в интерактивную карту:

- Каждый физический элемент (кнопки, LED, buzzer) = clickable hotspot на 3D-модели.
- Hover на кнопку → tooltip с текущим состоянием («Кнопка 1: пресет громкости»). LED → отражает реальный цвет/моргание. Buzzer → анимация если играет.
- Click на элемент → прокрутка/прыжок к соответствующей настройке в Settings.
- Live-mirror: 3D обновляется в реальном времени по данным с устройства (battery level → анимация на крышке батарейного отсека и т.п.).

**Почему**: сохраняет wow-factor (3D), но превращает декорацию в инструмент. Demo-сценарий: пользователь хочет понять «что моргает оранжевым» — наводит на LED, видит подпись. Это лучший use case для 3D в config tool.

**Effort high** — нужны 3D anchor points, состояния, sync с GATT данными. Но это и main differentiator от Skytraxx/наследников.

## 7. Pairing flow

**Решение**: **двухэкранный wizard** — explainer → connect.

1. **Экран 1 (explainer)**: коротко (3-4 буллита): что такое Web BLE, что устройство должно быть включено, что браузер запросит permission. Иконка/иллюстрация. Кнопка «Понятно, продолжить».
2. **Экран 2 (connect)**: устройство-скелет (3D модель в lo-fi виде) + большая кнопка «Подключиться» + secondary «Не сейчас — посмотреть demo».

После успешной пайры — wizard больше не показывается этому пользователю (localStorage flag). Returning users сразу в dashboard.

**Почему**: snowblind cold-visitor нуждается в context (Web BLE незнакомая технология для большинства). Один экран explainer = снижает abandonment до permission prompt. Skip-кнопка «demo» — на случай если человек просто хочет посмотреть UI без устройства (важно для review/sales context, Nordic FAE будут это смотреть).

## 8. Vario curve editor

**Решение**: **draggable chart** с точками (vario response curve).

- Visual: SVG-график, ось X = climb/sink rate (м/с), ось Y = частота/громкость/duty cycle.
- 12 breakpoints как draggable points (mouse drag на desktop, touch drag на mobile).
- Live preview tone когда тащишь точку (звучит на устройстве через BLE команду — power user моментально слышит результат).
- Presets-кнопки рядом: «Sensitive», «Aggressive», «Silent ground», «Custom» — заполняют 12 точек предзаданными значениями.
- Numeric values рядом с каждой точкой (опциональный read-only display — для тех кто хочет точное число).

**Почему**: differentiator от всех конкурентов (Skytraxx, Bräuniger используют numeric grid). Tactile + audio preview = best learning experience. Effort серьёзный (custom SVG, drag math, mobile touch handling), но ROI высокий — это рассказывают друзьям и снимают в видео-обзорах.

**Trade-off**: high effort. Если в первой версии не успеваем — сделать numeric grid + presets, draggable chart в v2.

---

## Critical UX fix: Local-first settings + offline audio preview

**Pain-point**: сейчас всё state'ы привязаны к подключённому устройству. Disconnect → потеря несохранённых настроек. Невозможно играться с tone graph без устройства в руках.

**Решение** — переход на **local-first архитектуру**:

### 1. State model

- **Settings = first-class objects**, хранятся в `IndexedDB` (или `localStorage` для совсем простых). Версионирование per change (можно «откатить к 5 минут назад»).
- **Device = optional sync target.** Подключение — синхронизация локального state с устройством, не источник состояния.
- На disconnect — баннер «Устройство отключено — настройки сохранены локально. Звук переключён на колонки браузера.» Никакой потери work.
- На reconnect — диалог «Применить локальные изменения к устройству?» с диффом (показывает какие поля изменились локально, после disconnect).

### 2. Web Audio API синтез — offline tone preview

- `AudioContext` + `OscillatorNode` для генерации частоты (matches piezo buzzer).
- `GainNode` для управления громкостью.
- `setInterval` / `audioParam scheduling` для duty cycle / phase / period.
- Точность ±5% от реального piezo (синтезированный sine vs square wave даёт чуть другой timbre, но pitch и pattern совпадают).

### 3. Toggle «Live preview source» (UI control)

В Sound settings вверху — segmented control:

```
[ 🔊 Device  |  💻 Browser  |  🔇 Off ]
```

- **Device** (default если подключено) — звук с реального piezo, точный preview.
- **Browser** (default если disconnected) — Web Audio синтез через колонки/наушники.
- **Off** — silent режим, только визуальный feedback (для тех кто настраивает в общественном месте).

### 4. Vario curve editor — добавить interaction + climb-rate simulator

**4.1 Drag-feedback**: когда юзер тащит точку curve — играет соответствующий tone (Device или Browser в зависимости от toggle). Continuous audio feedback при настройке — учишь curve ушами а не глазами.

**4.2 Climbrate simulator slider** (критический pain-point — сейчас «цифра неудобна»):

Под curve chart — широкий горизонтальный slider:

```
sink                                                       climb
 −5 ──────────────●───────────────────────── +10 м/с
                  ▲ (-1.2 м/с — falling, low slow tone)
```

- Range: типично −5...+10 м/с (или настраиваемый).
- Tick marks: 0 (нейтрал), +0.5 (typical lift threshold), +3 (хороший thermal), +6 (strong climb).
- Цвет slider track: red sink → grey near zero → green climb (визуальное соответствие vario семантике).
- При движении — **в реальном времени** играется tone из текущей curve (mouse drag = continuous tone sweep, можно «прогуляться» по всему curve диапазону за секунду).
- Snap-кнопки рядом: [−2 м/с] [0] [+0.5] [+2] [+5] — быстрые preset значения для проверки конкретных сценариев.
- На графике — vertical marker line синхронно с slider value (показывает где именно ты на curve).

**Use case**: «Я хочу понять как мой curve звучит при +3 м/с (типичный thermal climb)» — двигаешь slider к +3 → слышишь tone → понимаешь подходит ли. Без simulator пришлось бы реально подниматься в термале чтобы проверить.

**Bonus**: автоматический «walk-through» режим — кнопка «▶ Demo curve» проигрывает slider от −5 до +10 за 5 секунд, slow ramp. Single click = слышишь весь curve как audio-tour.

### 5. Export/Import settings (JSON file)

JSON-файл с настройками: download / upload через `<input type=file>`. Простой backup mechanism для перестраховки перед экспериментами.

### 6. **URL-share presets** (критическая community-фича)

**Реализация без сервера** (static hosting compatible — как сейчас):

- Все настройки → JSON → base64 → URL **fragment** (после `#`).
- `config.flybeeper.com/#preset=eyJ2YXJpb19jdXJ2ZSI6Wy4uLl0sInNvdW5kIjp7Li4ufX0=`
- Browser открывает URL → JS парсит fragment → показывает баннер «Применить пресет 'Aggressive thermal' от пользователя?» → Apply / Decline.
- Если Apply — пресет загружается в local state, можно тут же тестировать через climbrate simulator (без устройства!).
- Если устройство подключено — кнопка «Записать на устройство».

**Почему URL fragment (`#`)**:
- НЕ отправляется на сервер (только client JS видит) → privacy by design, никаких analytics на пресеты пользователей.
- Static hosting compatible (Cloudflare Pages, GitHub Pages — как сейчас, никакого backend).
- QR-friendly: 200-500 байт JSON → 300-750 char URL → влезает в QR код стандартной плотности.
- Email/Telegram/Discord shareable: копируешь URL, паcтишь куда угодно.

**Размер JSON**: 12×4 vario points + sound config + LED + buttons mapping ≈ 200-500 bytes. После base64 + URL = 300-750 char URL. Browser limit ~2048 char → запас 3×.

**Use cases** (это вирусный community-multiplier):
- Backup настроек перед экспериментами (export JSON).
- Шеринг пресета «Школьный, безопасно» учителем парапланеризма всей группе через Telegram.
- Воспроизведение бажной конфигурации для troubleshooting («скинь свой URL — посмотрю что у тебя стоит»).
- Power-user community contributions: «Comp pilot 'aggressive thermal' preset by @username» — публикуется в форумах parapente.
- **QR-код на коробке устройства** с factory default preset → unboxing experience: scan → preset уже в браузере → нажал Apply → flight-ready.

**Future extension** (если когда-нибудь сервер появится): можно добавить **named presets registry** — `config.flybeeper.com/preset/aggressive-thermal-v2` короткий URL, но это **optional** layer поверх fragment-based shareable URLs.

### Effort

Серьёзный — это рефакторинг с device-coupled state на local-first. Но это самый большой UX-win во всём редизайне: убирает frustration #1 («потерял настройки»), открывает учебно-демо use cases (без устройства можно научиться UI), и работает в горах где не всегда есть желание включать устройство ради подбора curve.

---

## 3. Languages

**Решение**: **EN + RU + DE** в первой версии (вместо текущих 6).

| Locale | Why |
|---|---|
| **EN** | Default для мирового пользователя + Nordic application audience + paragliding-community lingua franca |
| **RU** | Текущий core community FlyBeeper |
| **DE** | DACH = ~30% EU paragliding market, FFVL/DHV schools, большой Skytraxx/Stodeus конкурент |

Удаляем `es / fr / it` — без native pass они выглядят как «MT-translated», что отталкивает больше чем «English only». Если будут запросы — добавляем в v2 с правильными native translators.

**Объём**: ~150-300 UI-строк × 3 locales. С новым copy под new UX — переписываем с нуля, не мигрируем старые переводы (они под старый flow).

## 6. Branding (связь с alpisto.eu)

**Решение**: **own visual system для FlyBeeper** (НЕ копируем alpisto brutalist).

**Почему**:
- FlyBeeper — это product brand (sport/paragliding context), Alpisto — engineering consulting brand. Это **разные target audiences** (пилоты vs R&D leads), разный tone.
- Brutalist alpisto идеален для consulting: серьёзный, текстовый, информационный. Для конфигуратора в полёте — слишком engineering-y, не sporty.
- FlyBeeper visual может быть более dynamic: акценты на climb rate visualization, цветовая температура (cold sink → warm climb), motion-aware UI.

**Что остаётся от alpisto**:
- Footer: «Built by [Alpisto](https://alpisto.eu)» с link — engineering credibility.
- Может быть **shared font**: использовать тот же Space Grotesk display + Geist Mono для consistency (но другая колоратура, другие weights, другая spacing).
- Один URL домен `flybeeper.com` — это product, не отдельная Alpisto property.

**Что НЕ копируем**: paper #eeeae0 фон, 2px ink borders, mono-grid hatch, accent #ff5b1f. Конфигуратор может быть darker (sport-feeling), с другой акцент-палитрой (например электрический cyan для climb, оранжевый для warning, без orange-as-CTA).

**Action**: для Claude Design — задавать «FlyBeeper as a sport product», не «alpisto subsection».

## 9. Multi-device support

**Решение**: **mini BT focused UI**, но **architecture поддерживает multi-device**.

**Конкретно**:

- **v1 UI** оптимизирован под mini BT — главный shipping product, 95% реальных пользователей сейчас. Никакого `/devices` listing.
- **Architecture** (под капотом) — device registry с per-device config schema. Добавить PS1/RC4/TAS в будущем = config file + UI variant, не rewrite.
- URL `config.flybeeper.com/` остаётся **root** — попадаешь сразу в mini BT flow.
- Когда добавим следующее устройство — URL pattern `/mini-bt` / `/ps1` (без `/devices` listing — pairing сам определяет device).
- **Auto-detect device type** при первом BLE-подключении: если detect PS1 в `/` URL — banner «Это PS1 — переключиться?» или auto-redirect.

**Почему**:
- 7 устройств в `/devices` listing создают paradox of choice для нового пользователя который пришёл просто настроить свой mini BT.
- Не отрезаем будущее: when PS1 ships, добавление = config + UI variant, не редизайн.
- URL hierarchy honest: каждое устройство = своя страница (опционально), root = main shipping product.

---

## Summary для Claude Design handoff

Все 10 questions из CONFIGURATOR_UX_AUDIT.md §10 + 2 critical fixes от пользователя:

| # | Topic | Decision |
|---|---|---|
| 1 | 3D viewer | Functional button-map (live state mirror) |
| 2 | iOS Safari | Bluefy redirect banner |
| 3 | Languages | EN + RU + DE |
| 4 | OTA | /update docs page → nRF Connect Mobile |
| 5 | Saved devices | Auto-scan + highlight saved + per-device auto-connect toggle + click-to-retry fallback |
| 6 | Branding | Own FlyBeeper visual (НЕ alpisto brutalist) |
| 7 | Pairing | 2-screen wizard (explainer → connect) |
| 8 | Curve editor | Draggable chart + climbrate simulator slider + Demo ▶ |
| 9 | Multi-device | mini BT focused UI, multi-device architecture |
| 10 | PWA | Keep manifest + SW. Silent update on next launch + unobtrusive banner. Install button = contextual toast + footer icon |
| ★ | **Local-first** | Settings = first-class objects. Disconnect ≠ data loss. Web Audio fallback. Toggle: Device / Browser / Off audio source |
| ★ | **URL-share presets** | base64 в URL fragment. Static-hosting compatible. QR-friendly. Виральный community-multiplier |
