// Direction 3 — Cockpit minimal. High-contrast B/W, single signal-orange.
// Vibe: Suunto Core / Casio Pro Trek / dive computer. Sun-glare readable,
// utilitarian. Thick black ink rules, big mono numerics, single signal
// accent reserved for live/active states.

// Light (paper instrument) + Dark (OLED cockpit) variants share the same
// token shape so screens can swap themes without per-component edits.
// `ckTheme` is a mutable binding that <CkScene mode> flips before render —
// during a synchronous render pass, child Ck* components see the right mode.

const ckThemeLight = {
  id: 'cockpit-light',
  font: '"Archivo", "Helvetica Neue", system-ui, sans-serif',
  fontNarrow: '"Archivo Narrow", "Archivo", system-ui, sans-serif',
  mono: '"Space Mono", ui-monospace, monospace',

  bg: '#F5F4EE',                // off-white instrument paper
  bgDeep: '#E8E6DE',
  ink: '#0A0A08',                // near-black ink
  inkDim: '#3A3A36',
  paper: '#FFFFFF',
  surface: '#FFFFFF',

  border: '#0A0A08',
  borderHair: '#0A0A08',

  text: '#0A0A08',
  dim: '#6B6B65',
  dimmer: '#9A9890',

  signal: '#FF6A00',
  climbInk: '#0A0A08',
  sinkInk: '#0A0A08',
  warning: '#FF6A00',
  success: '#0A0A08',

  curve: '#0A0A08',
  curveFill: '#0A0A08',
  grid: '#D8D6CE',
  marker: '#FF6A00',
  axisLabel: '#3A3A36',

  sink: '#0A0A08',
  climb: '#0A0A08',
  chipBg: '#FFFFFF',
  chipBorder: '1.5px solid #0A0A08',
  chipRadius: 0,
  accent: '#FF6A00',
  onAccent: '#FFFFFF',
  thumbShadow: 'none',
  tick: '#0A0A08',
};

// OLED dark variant — true black bg + white ink so AMOLED pixels stay off
// in dark regions. Signal-orange retains identical hex (legible on both bgs).
const ckThemeDark = {
  id: 'cockpit-dark',
  font: '"Archivo", "Helvetica Neue", system-ui, sans-serif',
  fontNarrow: '"Archivo Narrow", "Archivo", system-ui, sans-serif',
  mono: '"Space Mono", ui-monospace, monospace',

  bg: '#000000',                  // OLED black
  bgDeep: '#0A0A0A',
  ink: '#F5F4EE',                 // ink inverts to paper
  inkDim: '#C8C6BE',
  paper: '#0A0A0A',               // "paper" = card surface near-black
  surface: '#0A0A0A',

  border: '#F5F4EE',              // borders are FULL white now
  borderHair: '#F5F4EE',

  text: '#F5F4EE',
  dim: '#7A7A74',
  dimmer: '#4A4A46',

  signal: '#FF6A00',              // same signal — pops on black + on paper
  climbInk: '#F5F4EE',
  sinkInk: '#F5F4EE',
  warning: '#FF6A00',
  success: '#F5F4EE',

  curve: '#F5F4EE',
  curveFill: '#F5F4EE',
  grid: '#2A2A28',
  marker: '#FF6A00',
  axisLabel: '#7A7A74',

  sink: '#F5F4EE',
  climb: '#F5F4EE',
  chipBg: '#0A0A0A',
  chipBorder: '1.5px solid #F5F4EE',
  chipRadius: 0,
  accent: '#FF6A00',
  onAccent: '#000000',
  thumbShadow: 'none',
  tick: '#F5F4EE',
};

// Live binding — swapped synchronously by <CkScene mode="…"> before its
// React-children render. Defaults to light.
let ckTheme = ckThemeLight;

const ckDevicePaletteLight = {
  body: '#FFFFFF',
  bodyShadow: '#F0EEE6',
  button: '#FFFFFF',
  buttonActive: '#FF6A00',
  led: '#FF6A00',
  ledGlow: '#FF6A00',
  label: '#0A0A08',
  callout: '#0A0A08',
  stroke: '#0A0A08',
};

const ckDevicePaletteDark = {
  body: '#0A0A0A',
  bodyShadow: '#000000',
  button: '#0A0A0A',
  buttonActive: '#FF6A00',
  led: '#FF6A00',
  ledGlow: '#FF6A00',
  label: '#F5F4EE',
  callout: '#F5F4EE',
  stroke: '#F5F4EE',
};

let ckDevicePalette = ckDevicePaletteLight;

// CkScene — sets the active theme synchronously before rendering children.
// Place this immediately inside an artboard so all Ck* descendants pick up
// the right mode during React's depth-first render pass.
function CkScene({ mode = 'light', children }) {
  ckTheme = mode === 'dark' ? ckThemeDark : ckThemeLight;
  ckDevicePalette = mode === 'dark' ? ckDevicePaletteDark : ckDevicePaletteLight;
  return children;
}

// ─── micro components ───────────────────────────────────────────────
function CkEyebrow({ children, color = ckTheme.ink, style = {} }) {
  return (
    <span style={{
      fontFamily: ckTheme.mono, fontSize: 10, letterSpacing: 2.5,
      textTransform: 'uppercase', color, fontWeight: 700, ...style,
    }}>{children}</span>
  );
}

function CkRule({ width = 2, color = ckTheme.ink, style = {} }) {
  return <hr style={{ border: 'none', borderTop: `${width}px solid ${color}`, margin: 0, ...style }}/>;
}

function CkTag({ children, filled = false, color = ckTheme.ink, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px',
      background: filled ? color : 'transparent',
      color: filled ? ckTheme.paper : color,
      border: `1.5px solid ${color}`,
      fontFamily: ckTheme.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      textTransform: 'uppercase',
      ...style,
    }}>{children}</span>
  );
}

// Card with thick black border (the cockpit signature)
function CkBox({ children, style = {}, padding = 16, frame = true }) {
  return (
    <div style={{
      background: ckTheme.paper,
      border: frame ? `1.5px solid ${ckTheme.ink}` : 'none',
      padding,
      ...style,
    }}>{children}</div>
  );
}

function CkCTA({ children, kind = 'primary', style = {}, full = true }) {
  const styles = {
    primary: { bg: ckTheme.ink, fg: ckTheme.paper, border: `2px solid ${ckTheme.ink}` },
    signal: { bg: ckTheme.signal, fg: ckTheme.paper, border: `2px solid ${ckTheme.signal}` },
    ghost: { bg: ckTheme.paper, fg: ckTheme.ink, border: `2px solid ${ckTheme.ink}` },
  }[kind];
  return (
    <button style={{
      width: full ? '100%' : 'auto',
      padding: '14px 20px',
      background: styles.bg, color: styles.fg, border: styles.border,
      borderRadius: 0,
      fontFamily: ckTheme.mono, fontWeight: 700, fontSize: 13,
      letterSpacing: 1.5, textTransform: 'uppercase',
      cursor: 'pointer',
      ...style,
    }}>{children}</button>
  );
}

// Diagonal stripe pattern (used for empty/disabled/warn zones)
function CkStripes({ size = 6, color = ckTheme.ink, opacity = 0.1 }) {
  return {
    background: `repeating-linear-gradient(45deg, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0 1px, transparent 1px ${size}px)`,
  };
}

function CkStatusLine({ device = 'MINI-BT · 0FA3', battery = 0.78, rssi = -52, fw = '0.18.2' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderBottom: `1.5px solid ${ckTheme.ink}`,
      fontFamily: ckTheme.mono,
      background: ckTheme.paper,
    }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderRight: `1.5px solid ${ckTheme.ink}` }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ckTheme.signal }}/>
        <span style={{ color: ckTheme.ink, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{device}</span>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6, borderLeft: `1.5px solid ${ckTheme.ink}` }}>
        <span style={{ color: ckTheme.dim, fontSize: 10, letterSpacing: 1 }}>FW</span>
        <span style={{ color: ckTheme.ink, fontSize: 11, fontWeight: 700 }}>{fw}</span>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6, borderLeft: `1.5px solid ${ckTheme.ink}` }}>
        <span style={{ color: ckTheme.dim, fontSize: 10, letterSpacing: 1 }}>RSSI</span>
        <span style={{ color: ckTheme.ink, fontSize: 11, fontWeight: 700 }}>{rssi}</span>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, borderLeft: `1.5px solid ${ckTheme.ink}` }}>
        <span style={{ color: ckTheme.dim, fontSize: 10, letterSpacing: 1 }}>BAT</span>
        <span style={{ color: ckTheme.ink, fontSize: 11, fontWeight: 700 }}>{Math.round(battery * 100)}%</span>
      </div>
    </div>
  );
}

// ─── Screen 1 — Pairing step 1 ──────────────────────────────────────
function CkPairing1({ desktop = false }) {
  const bullets = [
    { t: 'Browser-native', d: 'Web Bluetooth speaks straight to your mini BT.' },
    { t: 'Power on the device', d: 'Long-press until LED breathes orange.' },
    { t: 'Pick from the chooser', d: 'Native picker. Your device shows as FB-…' },
    { t: 'One-tap reconnect', d: 'Stored locally. No cloud, no account.' },
  ];
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.paper }}>
        <div style={{ padding: '10px 18px', borderRight: `1.5px solid ${ckTheme.ink}` }}>
          <span style={{ fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>FB · MINI-BT</span>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ padding: '10px 18px', borderLeft: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>
          01 / 02
        </div>
      </div>

      <div style={{ padding: desktop ? '40px 64px 20px' : '24px 22px 12px' }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Pair · pre-flight</CkEyebrow>
        <h1 style={{
          fontFamily: ckTheme.fontNarrow, fontWeight: 800,
          fontSize: desktop ? 84 : 48, lineHeight: 0.92, letterSpacing: -2,
          margin: '12px 0 0',
          textWrap: 'balance', color: ckTheme.ink, textTransform: 'uppercase',
        }}>
          Four<br/>checks.<br/>Then go.
        </h1>
      </div>

      <CkRule/>

      <div style={{ display: 'grid', gridTemplateColumns: desktop ? '1fr 1fr' : '1fr', flex: 1 }}>
        {bullets.map((b, i) => (
          <div key={i} style={{
            padding: desktop ? '20px 32px' : '16px 22px',
            borderRight: desktop && i % 2 === 0 ? `1.5px solid ${ckTheme.ink}` : 'none',
            borderBottom: `1.5px solid ${ckTheme.ink}`,
            display: 'flex', gap: 16, alignItems: 'flex-start',
            background: ckTheme.paper,
          }}>
            <span style={{
              fontFamily: ckTheme.mono, fontSize: desktop ? 32 : 24, fontWeight: 700,
              color: ckTheme.signal, letterSpacing: -1, lineHeight: 1,
            }}>0{i+1}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: desktop ? 22 : 17,
                marginBottom: 4, textTransform: 'uppercase', letterSpacing: -0.3,
              }}>{b.t}</div>
              <div style={{ fontSize: 12, color: ckTheme.dim, lineHeight: 1.5 }}>{b.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: ckTheme.paper, padding: desktop ? '20px 64px' : '16px 22px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <CkCTA kind="signal" full={!desktop} style={{ width: desktop ? 300 : '100%' }}>Continue →</CkCTA>
        {desktop && <CkCTA kind="ghost" full={false} style={{ width: 240 }}>Skip · view demo</CkCTA>}
        {!desktop && null}
      </div>
      {!desktop && (
        <button style={{
          background: 'none', border: 'none', color: ckTheme.dim,
          fontFamily: ckTheme.mono, fontSize: 11, padding: '0 22px 16px',
          letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700,
          textAlign: 'left',
        }}>↳ Skip — view demo without device</button>
      )}
    </div>
  );
}

// ─── Screen 2 — Pairing step 2 ──────────────────────────────────────
function CkPairing2({ desktop = false }) {
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.paper }}>
        <div style={{ padding: '10px 18px', borderRight: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>← BACK</div>
        <div style={{ flex: 1 }}/>
        <div style={{ padding: '10px 18px', borderLeft: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>02 / 02</div>
      </div>

      <div style={{ padding: desktop ? '40px 64px 20px' : '24px 22px 12px' }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Connect</CkEyebrow>
        <h1 style={{
          fontFamily: ckTheme.fontNarrow, fontWeight: 800,
          fontSize: desktop ? 64 : 36, lineHeight: 0.95, letterSpacing: -1.5,
          margin: '10px 0 6px', textTransform: 'uppercase',
        }}>
          Power on.<br/>Then connect.
        </h1>
        <div style={{ fontSize: 12, color: ckTheme.dim, lineHeight: 1.5, fontFamily: ckTheme.mono, letterSpacing: 0.5 }}>
          Chromium opens the system chooser. Pick anything starting with <span style={{ color: ckTheme.ink, fontWeight: 700 }}>FB-</span>.
        </div>
      </div>

      <CkRule/>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: ckTheme.paper }}>
        {/* concentric square frames — instrument-style */}
        {[0,1,2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            width: desktop ? 240 + i*80 : 180 + i*46,
            height: desktop ? 240 + i*80 : 180 + i*46,
            border: `1px ${i===0?'solid':'dashed'} ${ckTheme.ink}`,
            opacity: 0.6 - i * 0.18,
          }}/>
        ))}
        <DeviceTopdown palette={ckDevicePalette} scale={desktop ? 0.95 : 0.7} showCallouts={false}/>
      </div>

      <CkRule/>

      <div style={{ background: ckTheme.paper, padding: desktop ? '20px 64px' : '14px 22px' }}>
        <CkCTA kind="signal">⚡ Connect via Bluetooth</CkCTA>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: ckTheme.dim, fontFamily: ckTheme.mono, letterSpacing: 1, textTransform: 'uppercase' }}>
          <span>navigator.bluetooth · prefix FB</span>
          <span>HTTPS</span>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 3 — Saved devices ───────────────────────────────────────
function CkSaved() {
  const devices = [
    { name: 'MINI-BT · 0FA3', nickname: 'My vario', available: true, autoConnect: true, rssi: -54, last: 'NOW' },
    { name: 'MINI-BT · 7B11', nickname: 'School #2', available: true, autoConnect: false, rssi: -71, last: '3D AGO' },
    { name: 'FB-PS1 · A03C', nickname: 'Bench pressure-test', available: false, autoConnect: false, last: '2W AGO' },
  ];
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.paper }}>
        <div style={{ padding: '10px 18px', borderRight: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>SAVED</div>
        <div style={{ flex: 1 }}/>
        <div style={{ padding: '10px 18px', borderLeft: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>03 PAIRED</div>
      </div>

      <div style={{ padding: '20px 22px 14px' }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Devices · paired</CkEyebrow>
        <h1 style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 44, letterSpacing: -1.5, margin: '6px 0 8px', textTransform: 'uppercase', lineHeight: 0.95 }}>3 in your kit</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: ckTheme.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: ckTheme.ink, fontWeight: 700 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: ckTheme.signal }}/>
          <span>SCANNING · 2 IN RANGE</span>
        </div>
      </div>

      <div style={{ flex: 1, borderTop: `1.5px solid ${ckTheme.ink}` }}>
        {devices.map((d, i) => (
          <div key={i} style={{
            padding: '14px 22px',
            borderBottom: `1.5px solid ${ckTheme.ink}`,
            background: ckTheme.paper,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 19, textTransform: 'uppercase', letterSpacing: -0.3 }}>{d.nickname}</span>
                  {d.available && <CkTag filled color={ckTheme.signal}>● IN RANGE</CkTag>}
                </div>
                <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {d.name} · {d.available ? `${d.rssi} dBm` : `LAST · ${d.last}`}
                </div>
              </div>
              <span style={{ fontFamily: ckTheme.mono, fontSize: 14, color: ckTheme.ink, cursor: 'pointer', fontWeight: 700 }}>≡</span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              {d.available ? (
                <CkCTA full={false} style={{ padding: '7px 14px', fontSize: 11 }}>Connect →</CkCTA>
              ) : (
                <CkCTA kind="ghost" full={false} style={{ padding: '7px 14px', fontSize: 11 }}>Retry</CkCTA>
              )}
              <span style={{ flex: 1 }}/>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: ckTheme.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: ckTheme.ink, fontWeight: 700 }}>
                AUTO
                <span style={{
                  width: 28, height: 16,
                  border: `1.5px solid ${ckTheme.ink}`,
                  background: d.autoConnect ? ckTheme.ink : ckTheme.paper,
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', top: 1, left: d.autoConnect ? 13 : 1,
                    width: 11, height: 11, background: d.autoConnect ? ckTheme.signal : ckTheme.ink,
                  }}/>
                </span>
              </span>
            </div>
          </div>
        ))}
        <button style={{
          width: '100%', padding: '16px',
          background: ckTheme.paper, color: ckTheme.ink,
          border: 'none', borderBottom: `1.5px solid ${ckTheme.ink}`,
          fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
          cursor: 'pointer',
          ...CkStripes({ size: 8, opacity: 0.06 }),
        }}>+  PAIR NEW DEVICE</button>
      </div>

      <div style={{ padding: '12px 22px', background: ckTheme.ink, color: ckTheme.paper, display: 'flex', justifyContent: 'space-between', fontFamily: ckTheme.mono, fontSize: 9, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase' }}>
        <span>LOCAL · NO CLOUD</span>
        <span>CONFIG.FLYBEEPER.COM</span>
      </div>
    </div>
  );
}

// ─── Screen 4 — Dashboard ───────────────────────────────────────────
function CkDashboard({ desktop = false }) {
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <CkStatusLine/>

      {/* Page title strip */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.paper }}>
        <div style={{ padding: '12px 18px', borderRight: `1.5px solid ${ckTheme.ink}`, flex: 1 }}>
          <CkEyebrow>Dashboard · live</CkEyebrow>
        </div>
        <div style={{ padding: '10px 14px', borderRight: `1.5px solid ${ckTheme.ink}`, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CkEyebrow>SHARE</CkEyebrow>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CkEyebrow style={{ color: ckTheme.signal }}>● DISCONNECT</CkEyebrow>
        </div>
      </div>

      <div style={{
        flex: 1, display: 'grid', gap: 0,
        gridTemplateColumns: desktop ? '1fr 1.1fr 0.9fr' : '1fr',
        gridTemplateRows: desktop ? '1fr' : undefined,
      }}>
        {/* Button map */}
        <div style={{ background: ckTheme.paper, borderRight: desktop ? `1.5px solid ${ckTheme.ink}` : 'none', borderBottom: !desktop ? `1.5px solid ${ckTheme.ink}` : 'none', padding: 20, display: 'flex', flexDirection: 'column', minHeight: desktop ? undefined : 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <CkEyebrow>Button-map</CkEyebrow>
            <CkEyebrow style={{ color: ckTheme.signal }}>● LIVE</CkEyebrow>
          </div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
            <DeviceTopdown palette={ckDevicePalette} scale={desktop ? 1 : 0.7}/>
          </div>
          <div style={{ marginTop: 12, fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.ink, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, display: 'flex', gap: 6 }}>
            <span>HOVER</span><span>→</span><span style={{ color: ckTheme.signal }}>JUMP</span>
          </div>
        </div>

        {/* Vario stack */}
        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: !desktop ? `1.5px solid ${ckTheme.ink}` : 'none' }}>
          {/* Vario reading */}
          <div style={{ background: ckTheme.paper, padding: '20px 24px', borderBottom: `1.5px solid ${ckTheme.ink}` }}>
            <CkEyebrow>Vario</CkEyebrow>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
              <div style={{ fontFamily: ckTheme.fontNarrow, fontSize: 88, fontWeight: 800, letterSpacing: -4, color: ckTheme.ink, lineHeight: 0.85, fontFeatureSettings: '"tnum"' }}>
                +1.8
              </div>
              <span style={{ color: ckTheme.dim, fontFamily: ckTheme.mono, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>M/S</span>
            </div>
            <div style={{ marginTop: 12, position: 'relative', height: 10, border: `1.5px solid ${ckTheme.ink}` }}>
              <div style={{ position: 'absolute', left: '50%', top: -1, bottom: -1, width: '20%', background: ckTheme.signal }}/>
              <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 2, background: ckTheme.ink }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, letterSpacing: 1 }}>
              <span>−5</span><span>0</span><span>+10</span>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1 }}>
            {[
              { l: 'ALT', v: '1247', u: 'M' },
              { l: 'PRESS', v: '871.2', u: 'HPA' },
              { l: 'TEMP', v: '18°', u: 'C' },
              { l: 'BAT', v: '4.02', u: 'V' },
            ].map((s, i) => (
              <div key={i} style={{
                background: ckTheme.paper,
                padding: '12px 16px',
                borderRight: i % 2 === 0 ? `1.5px solid ${ckTheme.ink}` : 'none',
                borderBottom: i < 2 ? `1.5px solid ${ckTheme.ink}` : 'none',
              }}>
                <CkEyebrow style={{ color: ckTheme.dim }}>{s.l}</CkEyebrow>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
                  <span style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 28, letterSpacing: -0.8, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{s.v}</span>
                  <span style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, fontWeight: 700, letterSpacing: 1 }}>{s.u}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings menu */}
        <div style={{ background: ckTheme.paper, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1.5px solid ${ckTheme.ink}`, display: 'flex', justifyContent: 'space-between' }}>
            <CkEyebrow>Settings</CkEyebrow>
            <CkEyebrow style={{ color: ckTheme.signal }}>● SYNCED</CkEyebrow>
          </div>
          {[
            { l: 'SOUND', sub: '12-pt curve · vol 2/3' },
            { l: 'BEHAVIOUR', sub: 'silent · LED on' },
            { l: 'POWER', sub: 'sleep 4h · avg 1s' },
            { l: 'UART', sub: 'POV protocol' },
            { l: 'FIRMWARE', sub: '0.18.2 · current' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '12px 16px',
              borderBottom: `1.5px solid ${ckTheme.ink}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}>
              <div>
                <div style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 14, letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.l}</div>
                <div style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, marginTop: 1, letterSpacing: 1, textTransform: 'uppercase' }}>{s.sub}</div>
              </div>
              <span style={{ fontFamily: ckTheme.mono, fontWeight: 700 }}>→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 5 — Sound settings ──────────────────────────────────────
function CkSound({ desktop = false }) {
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <CkStatusLine/>

      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.paper }}>
        <div style={{ padding: '10px 18px', borderRight: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>← DASHBOARD</div>
        <div style={{ flex: 1 }}/>
        <div style={{ padding: '10px 14px', borderLeft: `1.5px solid ${ckTheme.ink}` }}><CkEyebrow>JSON ↓</CkEyebrow></div>
        <div style={{ padding: '10px 14px', borderLeft: `1.5px solid ${ckTheme.ink}` }}><CkEyebrow style={{ color: ckTheme.signal }}>SHARE ↗</CkEyebrow></div>
      </div>

      <div style={{ padding: desktop ? '20px 32px 12px' : '16px 22px 6px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Sound</CkEyebrow>
        <h1 style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: desktop ? 42 : 30, letterSpacing: -1.3, margin: '6px 0 12px', textTransform: 'uppercase', lineHeight: 0.95 }}>Vario response curve</h1>

        {/* audio source */}
        <div style={{ marginBottom: 4 }}>
          <CkEyebrow style={{ marginBottom: 8, display: 'block' }}>Preview source</CkEyebrow>
          <div style={{ display: 'inline-flex', border: `1.5px solid ${ckTheme.ink}` }}>
            {[
              { l: '◉ DEVICE', active: true },
              { l: '💻 BROWSER', active: false },
              { l: '🔇 OFF', active: false },
            ].map((o, i) => (
              <span key={i} style={{
                padding: '8px 14px', fontSize: 11,
                background: o.active ? ckTheme.ink : ckTheme.paper,
                color: o.active ? ckTheme.paper : ckTheme.ink,
                borderLeft: i ? `1.5px solid ${ckTheme.ink}` : 'none',
                fontFamily: ckTheme.mono, fontWeight: 700, letterSpacing: 1.5,
                cursor: 'pointer',
              }}>{o.l}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'grid', gridTemplateColumns: desktop ? '1.4fr 1fr' : '1fr',
      }}>
        {/* curve + simulator */}
        <div style={{ borderRight: desktop ? `1.5px solid ${ckTheme.ink}` : 'none', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: desktop ? 24 : 18, background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <CkEyebrow>Response curve · 12 pts</CkEyebrow>
              <CkEyebrow style={{ color: ckTheme.signal }}>● DRAG TO HEAR</CkEyebrow>
            </div>
            <div style={{ border: `1.5px solid ${ckTheme.ink}`, padding: 6, background: ckTheme.paper }}>
              <VarioCurveChart palette={ckTheme} w={desktop ? 540 : 300} h={desktop ? 220 : 170} markerAt={0.62} active={9}/>
            </div>
            <div style={{ display: 'flex', gap: 0, marginTop: 12, border: `1.5px solid ${ckTheme.ink}` }}>
              {['Sensitive', 'Aggressive', 'Silent gnd', 'Custom*'].map((p, i) => (
                <span key={i} style={{
                  flex: 1, textAlign: 'center', padding: '8px 4px',
                  background: i === 3 ? ckTheme.ink : ckTheme.paper,
                  color: i === 3 ? ckTheme.paper : ckTheme.ink,
                  borderLeft: i ? `1.5px solid ${ckTheme.ink}` : 'none',
                  fontFamily: ckTheme.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                  cursor: 'pointer',
                }}>{p}</span>
              ))}
            </div>
          </div>

          <div style={{ padding: desktop ? 24 : 18, background: ckTheme.paper, flex: 1 }}>
            <ClimbrateSimulator palette={ckTheme} w={desktop ? 540 : 300} value={1.8}/>
          </div>
        </div>

        {/* right column */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 18, background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
            <CkEyebrow style={{ marginBottom: 12, display: 'block' }}>Buzzer volume</CkEyebrow>
            <div style={{ display: 'flex', border: `1.5px solid ${ckTheme.ink}` }}>
              {[0,1,2,3].map(v => (
                <span key={v} style={{
                  flex: 1, textAlign: 'center', padding: '16px 0',
                  background: v === 2 ? ckTheme.ink : ckTheme.paper,
                  color: v === 2 ? ckTheme.paper : ckTheme.ink,
                  borderLeft: v ? `1.5px solid ${ckTheme.ink}` : 'none',
                  fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 18,
                  cursor: 'pointer',
                }}>{v === 0 ? '✕' : v}</span>
              ))}
            </div>
            <div style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
              3 hardware levels · PWM duty + 2 GPIO
            </div>
          </div>

          <div style={{ padding: 18, background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}`, flex: 1 }}>
            <CkEyebrow style={{ marginBottom: 12, display: 'block' }}>Thresholds</CkEyebrow>
            {[
              { l: 'CLIMB ON', v: '+0.2 M/S' },
              { l: 'CLIMB OFF', v: '+0.1 M/S' },
              { l: 'SINK ON', v: '−2.5 M/S' },
              { l: 'SINK OFF', v: '−1.8 M/S' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i ? `1px dashed ${ckTheme.ink}` : 'none' }}>
                <span style={{ fontFamily: ckTheme.mono, fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: ckTheme.dim }}>{t.l}</span>
                <span style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>{t.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', borderTop: 'none' }}>
            <CkCTA kind="ghost" full={true} style={{ borderRadius: 0, padding: '16px' }}>REVERT</CkCTA>
            <CkCTA kind="signal" full={true} style={{ borderRadius: 0, padding: '16px' }}>WRITE</CkCTA>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Banners ────────────────────────────────────────────────────────
function CkBanners() {
  const BannerRow = ({ accent = ckTheme.ink, label, title, sub, primary, secondary }) => (
    <div style={{ border: `1.5px solid ${ckTheme.ink}`, background: ckTheme.paper, display: 'flex' }}>
      <div style={{ width: 8, background: accent, flexShrink: 0 }}/>
      <div style={{ flex: 1, padding: '12px 14px' }}>
        <CkEyebrow style={{ color: accent }}>{label}</CkEyebrow>
        <div style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 16, marginTop: 3, textTransform: 'uppercase', letterSpacing: -0.2 }}>{title}</div>
        <div style={{ fontSize: 11, color: ckTheme.dim, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
        <div style={{ display: 'flex', gap: 0, marginTop: 9, border: `1.5px solid ${ckTheme.ink}` }}>
          <span style={{
            padding: '6px 11px',
            background: accent, color: ckTheme.paper,
            fontFamily: ckTheme.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          }}>{primary}</span>
          {secondary && <span style={{
            padding: '6px 11px',
            borderLeft: `1.5px solid ${ckTheme.ink}`,
            fontFamily: ckTheme.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          }}>{secondary}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CkEyebrow style={{ color: ckTheme.signal }}>Banner system</CkEyebrow>
      <h1 style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 24, letterSpacing: -0.7, margin: '4px 0 6px', textTransform: 'uppercase' }}>4 banners</h1>

      <BannerRow
        accent={ckTheme.signal}
        label="iOS · Safari"
        title="Bluetooth not supported"
        sub="Open in Bluefy — adds Web BLE on iOS. Free."
        primary="OPEN BLUEFY ↗"
        secondary="DISMISS"
      />
      <BannerRow
        accent={ckTheme.ink}
        label="Disconnected"
        title="Settings saved locally"
        sub="Audio preview routed to Browser. Reconnect anytime."
        primary="RECONNECT"
        secondary="WORK OFFLINE"
      />
      <BannerRow
        accent={ckTheme.signal}
        label="Preset import"
        title='"Aggressive thermal" · @volodya_b'
        sub="12 vario pts · 4 thresholds · 312 bytes · via URL fragment"
        primary="APPLY"
        secondary="DISCARD"
      />

      {/* PWA toast — inverted treatment */}
      <div style={{ marginTop: 'auto', background: ckTheme.ink, color: ckTheme.paper, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{
          width: 38, height: 38, background: ckTheme.signal, color: ckTheme.paper,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>📲</div>
        <div style={{ flex: 1 }}>
          <CkEyebrow style={{ color: ckTheme.signal }}>Install · offline</CkEyebrow>
          <div style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 14, marginTop: 3, textTransform: 'uppercase', letterSpacing: -0.2 }}>For offline use in the mountains</div>
        </div>
        <span style={{ padding: '8px 14px', background: ckTheme.signal, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: ckTheme.paper }}>INSTALL</span>
        <span style={{ color: ckTheme.paper, opacity: 0.6, padding: '0 4px', cursor: 'pointer', fontFamily: ckTheme.mono }}>×</span>
      </div>
    </div>
  );
}

// ─── States ─────────────────────────────────────────────────────────
function CkStates() {
  const Cell = ({ label, accent = ckTheme.ink, children }) => (
    <div style={{
      background: ckTheme.paper, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ borderBottom: `1.5px solid ${ckTheme.ink}`, padding: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
        <CkEyebrow style={{ color: accent }}>{label}</CkEyebrow>
        <span style={{ width: 7, height: 7, background: accent, flexShrink: 0 }}/>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 9, textAlign: 'center' }}>{children}</div>
    </div>
  );
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CkEyebrow style={{ color: ckTheme.signal }}>State system</CkEyebrow>
      <h1 style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 24, letterSpacing: -0.7, margin: '4px 0 6px', textTransform: 'uppercase' }}>Critical states</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10, flex: 1, border: `1.5px solid ${ckTheme.ink}` }}>
        <Cell label="LOADING">
          <div style={{ position: 'relative', width: 54, height: 54, border: `2px solid ${ckTheme.bgDeep}`, borderRadius: '50%' }}>
            <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `2px solid transparent`, borderTopColor: ckTheme.ink, transform: 'rotate(120deg)' }}/>
          </div>
          <div>
            <div style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.2 }}>FB-0FA3</div>
            <div style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' }}>requesting · 2/7 services</div>
          </div>
        </Cell>

        <Cell label="ERROR · pairing" accent={ckTheme.signal}>
          <div style={{ width: 44, height: 44, border: `2px solid ${ckTheme.signal}`, color: ckTheme.signal, fontWeight: 800, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ckTheme.fontNarrow }}>!</div>
          <div>
            <div style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>NO DEVICE FOUND</div>
            <div style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, marginTop: 3, letterSpacing: 1 }}>USER CANCELLED · OR OUT OF RANGE</div>
          </div>
          <span style={{ padding: '6px 12px', border: `1.5px solid ${ckTheme.ink}`, background: ckTheme.ink, color: ckTheme.paper, fontFamily: ckTheme.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5 }}>RETRY</span>
        </Cell>

        <Cell label="ERROR · OTA" accent={ckTheme.signal}>
          <div style={{
            width: '100%',
            fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.ink,
            border: `1.5px solid ${ckTheme.ink}`, padding: 8,
            textAlign: 'left', lineHeight: 1.7, letterSpacing: 0.4,
          }}>
            <div style={{ color: ckTheme.dim }}>$ smp upload 0.18.3.bin</div>
            <div>uploading 142 KB</div>
            <div>████████░░░░ 67%</div>
            <div style={{ background: ckTheme.signal, color: ckTheme.paper, padding: '0 4px', marginTop: 2, display: 'inline-block', fontWeight: 700 }}>× ERR: CONNECTION LOST</div>
          </div>
          <span style={{ padding: '5px 11px', border: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 }}>OPEN /UPDATE</span>
        </Cell>

        <Cell label="SUCCESS · preset" accent={ckTheme.ink}>
          <div style={{ width: 44, height: 44, border: `2px solid ${ckTheme.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.check(ckTheme.ink, 24)}</div>
          <div>
            <div style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>Written to device</div>
            <div style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' }}>17 chars · 312 b · 1.4s</div>
          </div>
          <span style={{ padding: '5px 11px', border: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 }}>UNDO · 5S</span>
        </Cell>
      </div>

      <div style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, textAlign: 'center', letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase' }}>
        Every state · explicit recovery affordance
      </div>
    </div>
  );
}

// ─── Screen 8 — URL-share preset dialog (sheet over Sound) ──────────
// Pilots share presets as base64-encoded JSON in the URL fragment.
// This is the export half — user picks transport (link / QR / file).
function CkUrlShare({ desktop = false }) {
  // 312-byte JSON, base64-encoded, results in ~420-char URL — visualised as
  // truncated to fit the column. Real impl: live-generated from current state.
  const url = 'config.flybeeper.com/#preset=eyJ2YXJpb19jdXJ2ZSI6Wy0wLjMsLTAuMiwwLjIsMC41LDEsMS40LDEuOSwyLjUsMy40LDUsOCwxMV0sInZvbHVtZSI6Miwic2lsZW50X29uX2dyb3VuZCI6dHJ1ZSwiYmxpbmsiOmZhbHNlfQ==';
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.paper }}>
        <div style={{ padding: '10px 18px', borderRight: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>← SOUND</div>
        <div style={{ flex: 1 }}/>
        <div style={{ padding: '10px 18px', borderLeft: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: ckTheme.signal }}>SHARE</div>
      </div>

      <div style={{ padding: '20px 22px 12px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Export preset · URL fragment</CkEyebrow>
        <h1 style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 28, letterSpacing: -1, margin: '6px 0 6px', textTransform: 'uppercase', lineHeight: 0.95 }}>Share your settings</h1>
        <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1, lineHeight: 1.6, textTransform: 'uppercase' }}>
          Encoded in URL hash · never sent to server · static-hosting safe
        </div>
      </div>

      {/* QR */}
      <div style={{ padding: '20px 22px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}`, display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        {/* mock QR — pure CSS grid */}
        <div style={{
          width: 132, height: 132, padding: 6,
          background: ckTheme.paper, border: `1.5px solid ${ckTheme.ink}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: '100%', height: '100%',
            display: 'grid', gridTemplateColumns: 'repeat(21, 1fr)', gridTemplateRows: 'repeat(21, 1fr)', gap: 0,
          }}>
            {/* 21x21 mock QR — pseudo-random pattern from seeded sequence */}
            {Array.from({length: 21*21}, (_, i) => {
              const x = i % 21, y = Math.floor(i / 21);
              const corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
              const cornerInner = (x >= 1 && x <= 5 && y >= 1 && y <= 5) || (x >= 15 && x <= 19 && y >= 1 && y <= 5) || (x >= 1 && x <= 5 && y >= 15 && y <= 19);
              const cornerCore = (x >= 2 && x <= 4 && y >= 2 && y <= 4) || (x >= 16 && x <= 18 && y >= 2 && y <= 4) || (x >= 2 && x <= 4 && y >= 16 && y <= 18);
              let on;
              if (corner && !cornerInner) on = true;
              else if (corner && cornerInner && !cornerCore) on = false;
              else if (corner && cornerCore) on = true;
              else on = ((x * 13 + y * 7 + x*y) % 5) < 2;
              return <div key={i} style={{ background: on ? ckTheme.ink : 'transparent' }}/>;
            })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <CkEyebrow>Scan with phone</CkEyebrow>
          <div style={{ fontFamily: ckTheme.fontNarrow, fontSize: 19, fontWeight: 700, marginTop: 6, lineHeight: 1.1, textTransform: 'uppercase' }}>
            Aggressive thermal
          </div>
          <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1, marginTop: 6, lineHeight: 1.6 }}>
            <div>12 VARIO PTS</div>
            <div>4 THRESHOLDS</div>
            <div>LED · ON · VOL 2</div>
            <div style={{ color: ckTheme.signal, marginTop: 4 }}>312 BYTES · 420 CHARS</div>
          </div>
        </div>
      </div>

      {/* URL field */}
      <div style={{ padding: '16px 22px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <CkEyebrow style={{ marginBottom: 8, display: 'block' }}>URL</CkEyebrow>
        <div style={{
          padding: 10,
          border: `1.5px solid ${ckTheme.ink}`,
          background: ckTheme.bg,
          fontFamily: ckTheme.mono, fontSize: 10, lineHeight: 1.6,
          color: ckTheme.ink, wordBreak: 'break-all',
          maxHeight: 70, overflow: 'hidden', position: 'relative',
        }}>
          <span style={{ color: ckTheme.dim }}>config.flybeeper.com/#preset=</span>
          <span>eyJ2YXJpb19jdXJ2ZSI6Wy0wLjMsLTAuMiwwLjIsMC41LDEsMS40LDEuOSwyLjUsMy40LDUsOCwxMV0sInZvbHVtZSI6Miwic2lsZW50X29uX2dyb3VuZCI...</span>
        </div>
        <div style={{
          display: 'flex', gap: 0, marginTop: 10,
          border: `1.5px solid ${ckTheme.ink}`,
        }}>
          <span style={{
            flex: 1, padding: '12px 8px', textAlign: 'center',
            background: ckTheme.ink, color: ckTheme.paper,
            fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
            cursor: 'pointer',
          }}>📋 Copy URL</span>
          <span style={{
            flex: 1, padding: '12px 8px', textAlign: 'center',
            borderLeft: `1.5px solid ${ckTheme.ink}`,
            fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
            cursor: 'pointer',
          }}>↓ JSON</span>
        </div>
      </div>

      {/* preset name + signed-by */}
      <div style={{ padding: '14px 22px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}`, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <CkEyebrow>Preset name</CkEyebrow>
          <div style={{
            marginTop: 6, padding: '10px 12px',
            border: `1.5px solid ${ckTheme.ink}`, background: ckTheme.bg,
            fontFamily: ckTheme.fontNarrow, fontSize: 16, fontWeight: 700, letterSpacing: -0.2,
            textTransform: 'uppercase',
          }}>Aggressive thermal<span style={{ color: ckTheme.signal }}> |</span></div>
        </div>
        <div>
          <CkEyebrow>By</CkEyebrow>
          <div style={{
            marginTop: 6, padding: '10px 12px',
            border: `1.5px solid ${ckTheme.ink}`, background: ckTheme.bg,
            fontFamily: ckTheme.mono, fontSize: 12, color: ckTheme.dim,
          }}>@volodya_b</div>
        </div>
      </div>

      <div style={{
        padding: '12px 22px',
        background: ckTheme.bg, fontFamily: ckTheme.mono,
        fontSize: 9, color: ckTheme.dim, letterSpacing: 1.5, textTransform: 'uppercase',
        lineHeight: 1.6,
      }}>
        Privacy · URL fragment is client-only · never sent to server
      </div>
    </div>
  );
}

// ─── Screen 9 — /update docs page ───────────────────────────────────
function CkUpdate({ desktop = false }) {
  const steps = [
    { t: 'Install nRF Connect Mobile', d: 'Free, Nordic-official. iOS App Store + Google Play. Works without an account.' },
    { t: 'Power on your mini BT', d: 'Long-press until the LED breathes signal-orange.' },
    { t: 'Open Device Manager tab', d: 'Select your mini BT from the scan list. The Device Manager card pops up.' },
    { t: 'Tap Firmware Upgrade', d: 'Choose the .bin file you downloaded from flybeeper.com/firmware. Tap Start.' },
    { t: 'Wait 60–90 seconds', d: 'Progress bar runs to 100%. The device reboots once. nRF Connect shows "complete".' },
    { t: 'Reopen this configurator', d: 'Reconnect to verify the firmware version in the status bar matches.' },
  ];
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.paper }}>
        <div style={{ padding: '10px 18px', borderRight: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>← BACK</div>
        <div style={{ flex: 1 }}/>
        <div style={{ padding: '10px 18px', borderLeft: `1.5px solid ${ckTheme.ink}`, fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>/UPDATE</div>
      </div>

      <div style={{ padding: desktop ? '36px 64px 12px' : '22px 22px 12px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Firmware update</CkEyebrow>
        <h1 style={{
          fontFamily: ckTheme.fontNarrow, fontWeight: 800,
          fontSize: desktop ? 64 : 34, lineHeight: 0.95, letterSpacing: -1.5,
          margin: '8px 0 8px', textTransform: 'uppercase',
        }}>
          Use nRF Connect.<br/>It just works.
        </h1>
        <div style={{ fontSize: 13, color: ckTheme.dim, lineHeight: 1.5, maxWidth: 540 }}>
          We don't ship in-browser OTA. Nordic's free <span style={{ fontFamily: ckTheme.mono, fontWeight: 700, color: ckTheme.ink, letterSpacing: 0.5 }}>nRF Connect for Mobile</span> is the industry-standard tool for nRF52 firmware updates — battle-tested, recoverable, supported on both platforms. Use it.
        </div>
      </div>

      {/* Why-not callout */}
      <div style={{
        padding: '14px 22px', background: ckTheme.paper,
        borderBottom: `1.5px solid ${ckTheme.ink}`,
        borderLeft: `8px solid ${ckTheme.signal}`,
        marginLeft: 0,
      }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Why not in-browser?</CkEyebrow>
        <div style={{ fontSize: 12, color: ckTheme.ink, lineHeight: 1.5, marginTop: 4 }}>
          A failed OTA on a vario can brick it. Native MCUmgr clients handle retry, error recovery and signature validation. A web app over flaky BLE can't match that safely. Until SMP-over-WebBLE has a recovery path — use the native tool.
        </div>
      </div>

      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gridTemplateColumns: desktop ? '1fr 1fr' : undefined, flex: 1 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            background: ckTheme.paper,
            padding: desktop ? '18px 28px' : '14px 22px',
            borderBottom: `1.5px solid ${ckTheme.ink}`,
            borderRight: desktop && i % 2 === 0 ? `1.5px solid ${ckTheme.ink}` : 'none',
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <span style={{
              fontFamily: ckTheme.mono, fontSize: desktop ? 26 : 20, fontWeight: 700,
              color: i === steps.length - 1 ? ckTheme.signal : ckTheme.ink,
              letterSpacing: -1, lineHeight: 1, minWidth: 36,
            }}>0{i+1}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: desktop ? 18 : 15,
                textTransform: 'uppercase', letterSpacing: -0.2,
              }}>{s.t}</div>
              <div style={{ fontSize: 12, color: ckTheme.dim, marginTop: 3, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', borderTop: 'none' }}>
        <a href="https://apps.apple.com" style={{
          flex: 1, padding: '14px', textAlign: 'center', textDecoration: 'none',
          background: ckTheme.paper, color: ckTheme.ink,
          borderRight: `1.5px solid ${ckTheme.ink}`,
          fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
        }}>nRF · iOS ↗</a>
        <a href="https://play.google.com" style={{
          flex: 1, padding: '14px', textAlign: 'center', textDecoration: 'none',
          background: ckTheme.paper, color: ckTheme.ink,
          fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
        }}>nRF · Android ↗</a>
        <a href="https://flybeeper.com/firmware" style={{
          flex: 1.2, padding: '14px', textAlign: 'center', textDecoration: 'none',
          background: ckTheme.signal, color: ckTheme.paper,
          fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
        }}>Get firmware ↓</a>
      </div>
    </div>
  );
}

// ─── Spec 1 — Typography ────────────────────────────────────────────
function CkTypography() {
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 28px 14px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Type system</CkEyebrow>
        <h1 style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 48, letterSpacing: -1.6, margin: '6px 0 6px', textTransform: 'uppercase', lineHeight: 0.95 }}>3 families</h1>
        <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1.5, textTransform: 'uppercase' }}>Google Fonts · all OFL · free for commercial use</div>
      </div>

      {/* Archivo Narrow — display */}
      <div style={{ padding: '20px 28px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 28, letterSpacing: -0.8, textTransform: 'uppercase' }}>Archivo Narrow</span>
          <CkTag color={ckTheme.signal}>DISPLAY</CkTag>
        </div>
        <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1.5, marginTop: 6, textTransform: 'uppercase' }}>
          weights 500 · 600 · 700 · 800 · headlines / large numerics / nav labels
        </div>
        <div style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 56, letterSpacing: -2, lineHeight: 0.95, marginTop: 12, textTransform: 'uppercase' }}>+1.8 m/s</div>
        <div style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 700, fontSize: 22, letterSpacing: -0.3, marginTop: 6, textTransform: 'uppercase' }}>VARIO RESPONSE CURVE</div>
      </div>

      {/* Archivo — body */}
      <div style={{ padding: '20px 28px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: ckTheme.font, fontWeight: 700, fontSize: 28, letterSpacing: -0.5 }}>Archivo</span>
          <CkTag>TEXT</CkTag>
        </div>
        <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1.5, marginTop: 6, textTransform: 'uppercase' }}>
          weights 400 · 500 · 600 · 700 · body copy / button labels / form fields
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.3, marginBottom: 4 }}>Reconnect to your last device?</div>
          <div style={{ fontSize: 13, color: ckTheme.dim, lineHeight: 1.55, maxWidth: 460 }}>
            Web Bluetooth needs a user gesture to reconnect. One tap and we re-walk the GATT services — settings, telemetry, button-map.
          </div>
        </div>
      </div>

      {/* Space Mono — data */}
      <div style={{ padding: '20px 28px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}`, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: ckTheme.mono, fontWeight: 700, fontSize: 22 }}>Space Mono</span>
          <CkTag>DATA · LABELS</CkTag>
        </div>
        <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1.5, marginTop: 6, textTransform: 'uppercase' }}>
          weights 400 · 700 · eyebrows / status pills / UUIDs / numeric units
        </div>
        <div style={{ marginTop: 14, fontFamily: ckTheme.mono, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5 }}>FW 0.18.2</span>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5 }}>−54 dBm</span>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, color: ckTheme.signal }}>● LIVE</span>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5 }}>312 BYTES</span>
        </div>
        <div style={{
          marginTop: 14, fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim,
          letterSpacing: 0.4, lineHeight: 1.7, padding: 10, border: `1.5px solid ${ckTheme.ink}`,
          background: ckTheme.bg,
        }}>
          904baf04-5814-11ee-8c99-0242ac120002<br/>
          fcb14ed9-06e7-4a9e-b311-6eee676a2f48
        </div>
      </div>

      <div style={{ padding: '14px 28px', background: ckTheme.ink, color: ckTheme.paper, fontFamily: ckTheme.mono, fontSize: 9, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
        <span>3 FAMILIES · &lt; 90 KB SUBSET</span>
        <span>LATIN + CYRILLIC + EXTENDED</span>
      </div>
    </div>
  );
}

// ─── Spec 2 — Icon inventory ────────────────────────────────────────
function CkIcons() {
  // Curated single-stroke icon set. All 24×24, 1.5 stroke, no fill,
  // round caps. Drawn as inline SVG — total set is ~28 glyphs.
  const stroke = ckTheme.ink;
  const sw = 1.6;
  const icons = [
    // navigation
    { n: 'arrow-right',  k: 'NAV',   p: <path d="M5 12 H19 M13 6 L19 12 L13 18" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round"/> },
    { n: 'arrow-left',   k: 'NAV',   p: <path d="M19 12 H5 M11 6 L5 12 L11 18" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round"/> },
    { n: 'chevron',      k: 'NAV',   p: <path d="M9 6 L15 12 L9 18" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round"/> },
    { n: 'close',        k: 'NAV',   p: <path d="M6 6 L18 18 M18 6 L6 18" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round"/> },
    // status
    { n: 'bluetooth',    k: 'CONN',  p: <path d="M9 6 L17 14 L12 18 L12 4 L17 8 L9 14" stroke={stroke} strokeWidth={sw} fill="none" strokeLinejoin="round" strokeLinecap="round"/> },
    { n: 'wifi',         k: 'CONN',  p: <g><path d="M5 10 a10 10 0 0 1 14 0" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round"/><path d="M8 13 a6 6 0 0 1 8 0" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1" fill={stroke}/></g> },
    { n: 'rssi',         k: 'CONN',  p: <g><rect x="3"  y="14" width="3" height="6"  fill={stroke}/><rect x="8"  y="11" width="3" height="9"  fill={stroke}/><rect x="13" y="8"  width="3" height="12" fill={stroke}/><rect x="18" y="5"  width="3" height="15" fill={stroke} opacity="0.3"/></g> },
    { n: 'battery',      k: 'CONN',  p: <g><rect x="3" y="8" width="16" height="8" stroke={stroke} strokeWidth={sw} fill="none"/><rect x="5" y="10" width="9" height="4" fill={stroke}/><rect x="20" y="10.5" width="2" height="3" fill={stroke}/></g> },
    // semantic
    { n: 'check',        k: 'STATE', p: <path d="M5 12 L10 17 L19 6" stroke={stroke} strokeWidth={sw + 0.2} fill="none" strokeLinecap="round" strokeLinejoin="round"/> },
    { n: 'alert',        k: 'STATE', p: <g><path d="M12 3 L21 19 H3 Z" stroke={stroke} strokeWidth={sw} fill="none" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke={stroke} strokeWidth={sw + 0.2} strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={stroke}/></g> },
    { n: 'info',         k: 'STATE', p: <g><circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} fill="none"/><circle cx="12" cy="8" r="1.2" fill={stroke}/><line x1="12" y1="11" x2="12" y2="17" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></g> },
    { n: 'cross-circle', k: 'STATE', p: <g><circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} fill="none"/><path d="M8 8 L16 16 M16 8 L8 16" stroke={stroke} strokeWidth={sw}/></g> },
    // action
    { n: 'share',        k: 'ACT',   p: <g><circle cx="6"  cy="12" r="2.5" stroke={stroke} strokeWidth={sw} fill="none"/><circle cx="18" cy="6"  r="2.5" stroke={stroke} strokeWidth={sw} fill="none"/><circle cx="18" cy="18" r="2.5" stroke={stroke} strokeWidth={sw} fill="none"/><line x1="8" y1="11" x2="16" y2="7" stroke={stroke} strokeWidth={sw}/><line x1="8" y1="13" x2="16" y2="17" stroke={stroke} strokeWidth={sw}/></g> },
    { n: 'download',     k: 'ACT',   p: <path d="M12 3 V15 M7 11 L12 16 L17 11 M5 20 H19" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round"/> },
    { n: 'upload',       k: 'ACT',   p: <path d="M12 21 V9 M7 13 L12 8 L17 13 M5 4 H19" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round"/> },
    { n: 'copy',         k: 'ACT',   p: <g><rect x="8" y="4" width="12" height="14" stroke={stroke} strokeWidth={sw} fill="none"/><rect x="4" y="8" width="12" height="14" stroke={stroke} strokeWidth={sw} fill="none"/></g> },
    { n: 'qr',           k: 'ACT',   p: <g><rect x="3" y="3" width="6" height="6" stroke={stroke} strokeWidth={sw} fill="none"/><rect x="15" y="3" width="6" height="6" stroke={stroke} strokeWidth={sw} fill="none"/><rect x="3" y="15" width="6" height="6" stroke={stroke} strokeWidth={sw} fill="none"/><rect x="13" y="13" width="2" height="2" fill={stroke}/><rect x="17" y="13" width="2" height="2" fill={stroke}/><rect x="13" y="17" width="2" height="2" fill={stroke}/><rect x="17" y="17" width="2" height="2" fill={stroke}/></g> },
    { n: 'refresh',      k: 'ACT',   p: <path d="M4 12 a8 8 0 0 1 13.5 -5.7 L19 8 M19 4 V8 H15 M20 12 a8 8 0 0 1 -13.5 5.7 L5 16 M5 20 V16 H9" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round"/> },
    // domain
    { n: 'vario',        k: 'DOM',   p: <path d="M3 18 L7 14 L9 16 L13 10 L17 12 L21 5" stroke={stroke} strokeWidth={sw + 0.2} fill="none" strokeLinecap="round" strokeLinejoin="round"/> },
    { n: 'led',          k: 'DOM',   p: <g><circle cx="12" cy="12" r="3.5" fill={stroke}/><circle cx="12" cy="12" r="7" stroke={stroke} strokeWidth={sw} fill="none" strokeDasharray="2 2.5"/></g> },
    { n: 'buzzer',       k: 'DOM',   p: <g><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" stroke={stroke} strokeWidth={sw} fill="none" strokeLinejoin="round"/><path d="M17 9 a4 4 0 0 1 0 6" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round"/></g> },
    { n: 'button',       k: 'DOM',   p: <g><circle cx="12" cy="12" r="7" stroke={stroke} strokeWidth={sw} fill="none"/><circle cx="12" cy="12" r="3" fill={stroke}/></g> },
    { n: 'thermal',      k: 'DOM',   p: <path d="M6 21 C 6 12, 10 14, 10 6 M10 21 C 10 14, 14 16, 14 8 M14 21 C 14 16, 18 18, 18 10" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round"/> },
    { n: 'install',      k: 'DOM',   p: <g><rect x="6" y="3" width="12" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill="none"/><path d="M12 9 V15 M9 12 L12 15 L15 12" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="18.5" r="0.8" fill={stroke}/></g> },
    // controls
    { n: 'menu',         k: 'CTRL',  p: <g><line x1="4" y1="7"  x2="20" y2="7"  stroke={stroke} strokeWidth={sw} strokeLinecap="round"/><line x1="4" y1="12" x2="20" y2="12" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/><line x1="4" y1="17" x2="20" y2="17" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></g> },
    { n: 'more',         k: 'CTRL',  p: <g><circle cx="6"  cy="12" r="1.5" fill={stroke}/><circle cx="12" cy="12" r="1.5" fill={stroke}/><circle cx="18" cy="12" r="1.5" fill={stroke}/></g> },
    { n: 'plus',         k: 'CTRL',  p: <path d="M12 4 V20 M4 12 H20" stroke={stroke} strokeWidth={sw + 0.2} strokeLinecap="round"/> },
    { n: 'settings',     k: 'CTRL',  p: <g><circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth={sw} fill="none"/><path d="M12 2 V5 M12 19 V22 M22 12 H19 M5 12 H2 M19 5 L17 7 M7 17 L5 19 M19 19 L17 17 M7 7 L5 5" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></g> },
  ];
  const groups = {};
  icons.forEach(i => { (groups[i.k] = groups[i.k] || []).push(i); });
  const groupOrder = ['NAV', 'CONN', 'STATE', 'ACT', 'DOM', 'CTRL'];
  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 28px 14px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Icon set</CkEyebrow>
        <h1 style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 44, letterSpacing: -1.4, margin: '6px 0 4px', textTransform: 'uppercase', lineHeight: 0.95 }}>{icons.length} glyphs</h1>
        <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          24×24 · stroke 1.6 · round caps · no fill · single weight
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {groupOrder.map(g => (
          <div key={g} style={{ background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
            <div style={{ padding: '8px 16px', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.bg }}>
              <CkEyebrow>{g} · {groups[g].length}</CkEyebrow>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {groups[g].map((i, idx) => (
                <div key={i.n} style={{
                  padding: '12px 10px',
                  borderRight: (idx % 4) < 3 ? `1px dashed ${ckTheme.ink}` : 'none',
                  borderBottom: idx < groups[g].length - (groups[g].length % 4 || 4) ? `1px dashed ${ckTheme.ink}` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: 'block' }}>{i.p}</svg>
                  <span style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, letterSpacing: 0.5, textTransform: 'lowercase' }}>{i.n}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Spec 3 — Design tokens (color + spacing + scales) ──────────────
function CkTokens() {
  const swatches = [
    { n: 'ink',       v: '#0A0A08', g: 'INK' },
    { n: 'inkDim',    v: '#3A3A36', g: 'INK' },
    { n: 'dim',       v: '#6B6B65', g: 'INK' },
    { n: 'dimmer',    v: '#9A9890', g: 'INK' },
    { n: 'paper',     v: '#FFFFFF', g: 'PAPER' },
    { n: 'bg',        v: '#F5F4EE', g: 'PAPER' },
    { n: 'bgDeep',    v: '#E8E6DE', g: 'PAPER' },
    { n: 'grid',      v: '#D8D6CE', g: 'PAPER' },
    { n: 'signal',    v: '#FF6A00', g: 'SIGNAL' },
    { n: 'darkInk',   v: '#F5F4EE', g: 'DARK · OLED' },
    { n: 'darkPaper', v: '#0A0A0A', g: 'DARK · OLED' },
    { n: 'darkBg',    v: '#000000', g: 'DARK · OLED' },
    { n: 'darkGrid',  v: '#2A2A28', g: 'DARK · OLED' },
  ];
  const grouped = {};
  swatches.forEach(s => { (grouped[s.g] = grouped[s.g] || []).push(s); });
  const order = ['INK', 'PAPER', 'SIGNAL', 'DARK · OLED'];

  const spacing = [
    { n: 'xs', v: 4 }, { n: 'sm', v: 8 }, { n: 'md', v: 14 }, { n: 'lg', v: 22 }, { n: 'xl', v: 32 }, { n: '2xl', v: 48 },
  ];
  const stroke = [
    { n: 'hair',  v: 1 }, { n: 'rule',  v: 1.5 }, { n: 'bold',  v: 2 },
  ];
  const radii = [
    { n: 'flat',  v: 0 }, { n: 'soft',  v: 4 }, { n: 'pill',  v: 999 },
  ];

  return (
    <div style={{ height: '100%', background: ckTheme.bg, color: ckTheme.ink, fontFamily: ckTheme.font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 28px 14px', background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <CkEyebrow style={{ color: ckTheme.signal }}>Design tokens</CkEyebrow>
        <h1 style={{ fontFamily: ckTheme.fontNarrow, fontWeight: 800, fontSize: 44, letterSpacing: -1.4, margin: '6px 0 4px', textTransform: 'uppercase', lineHeight: 0.95 }}>Color · space · stroke</h1>
        <div style={{ fontFamily: ckTheme.mono, fontSize: 10, color: ckTheme.dim, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Exported · tokens.css · design-tokens.json
        </div>
      </div>

      {/* Color */}
      {order.map(g => (
        <div key={g} style={{ background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
          <div style={{ padding: '8px 28px', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.bg }}>
            <CkEyebrow>{g}</CkEyebrow>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(grouped[g].length, 4)}, 1fr)` }}>
            {grouped[g].map((s, i) => (
              <div key={s.n} style={{
                borderRight: i < grouped[g].length - 1 ? `1px dashed ${ckTheme.ink}` : 'none',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ height: 48, background: s.v, borderBottom: `1px dashed ${ckTheme.ink}` }}/>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontFamily: ckTheme.mono, fontSize: 11, fontWeight: 700 }}>{s.n}</div>
                  <div style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim, marginTop: 1, letterSpacing: 0.5 }}>{s.v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Spacing */}
      <div style={{ background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <div style={{ padding: '8px 28px', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.bg }}>
          <CkEyebrow>SPACING · base 2px</CkEyebrow>
        </div>
        <div style={{ padding: '14px 28px', display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end' }}>
          {spacing.map(s => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: s.v, height: s.v, background: ckTheme.ink }}/>
              <div style={{ fontFamily: ckTheme.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>{s.n}</div>
              <div style={{ fontFamily: ckTheme.mono, fontSize: 9, color: ckTheme.dim }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stroke */}
      <div style={{ background: ckTheme.paper, borderBottom: `1.5px solid ${ckTheme.ink}` }}>
        <div style={{ padding: '8px 28px', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.bg }}>
          <CkEyebrow>STROKE · rules</CkEyebrow>
        </div>
        <div style={{ padding: '14px 28px', display: 'flex', gap: 24 }}>
          {stroke.map(s => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: 80, height: s.v, background: ckTheme.ink }}/>
              <div style={{ fontFamily: ckTheme.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>{s.n} · {s.v}px</div>
            </div>
          ))}
        </div>
      </div>

      {/* Radii */}
      <div style={{ background: ckTheme.paper, flex: 1 }}>
        <div style={{ padding: '8px 28px', borderBottom: `1.5px solid ${ckTheme.ink}`, background: ckTheme.bg }}>
          <CkEyebrow>CORNERS · pragmatic</CkEyebrow>
        </div>
        <div style={{ padding: '14px 28px', display: 'flex', gap: 18 }}>
          {radii.map(r => (
            <div key={r.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 48, height: 32, background: ckTheme.bg, border: `1.5px solid ${ckTheme.ink}`, borderRadius: r.v }}/>
              <div style={{ fontFamily: ckTheme.mono, fontSize: 9, fontWeight: 700 }}>{r.n} · {r.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 28px', background: ckTheme.ink, color: ckTheme.paper, fontFamily: ckTheme.mono, fontSize: 9, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
        <span>tokens.css · :root vars</span>
        <span>design-tokens.json · structured</span>
      </div>
    </div>
  );
}

window.CockpitArtboards = function() {
  const phone = { width: 380, height: 780 };
  const desktop = { width: 1280, height: 800 };
  const dark = ckThemeDark;
  const light = ckThemeLight;
  // Helper — wraps a phone screen in light or dark mode. CkScene mutates the
  // ckTheme/ckDevicePalette bindings synchronously so child Ck* components
  // render with the right mode during React's depth-first pass.
  const M = (id, label, mode, Inner, props = {}) => {
    const th = mode === 'dark' ? dark : light;
    return (
      <DCArtboard id={id} label={label} {...phone}>
        <PhoneFrame bg={th.bg} statusBar={<StatusBar fg={th.ink}/>}>
          <CkScene mode={mode}><Inner {...props}/></CkScene>
        </PhoneFrame>
      </DCArtboard>
    );
  };
  const D = (id, label, mode, Inner, props = {}) => {
    const th = mode === 'dark' ? dark : light;
    return (
      <DCArtboard id={id} label={label} {...desktop}>
        <BrowserFrame bg={th.bg} chromeBg={mode === 'dark' ? '#0A0A0A' : '#e8e6de'} chromeFg={th.ink}>
          <CkScene mode={mode}><Inner desktop {...props}/></CkScene>
        </BrowserFrame>
      </DCArtboard>
    );
  };
  return (
    <React.Fragment>
      {/* ── Mobile · primary flow ─────────────────────────────────── */}
      {M('ck-pair1',         'M · Pairing · explainer',          'light', CkPairing1)}
      {M('ck-pair2',         'M · Pairing · connect',            'light', CkPairing2)}
      {M('ck-saved',         'M · Saved devices',                'light', CkSaved)}
      {M('ck-dashboard-m',   'M · Dashboard · button-map',       'light', CkDashboard)}
      {M('ck-sound-m',       'M · Sound · curve + simulator',    'light', CkSound)}
      {M('ck-url-share',     'M · Share preset · URL + QR',      'light', CkUrlShare)}
      {M('ck-update',        'M · /update · firmware docs',      'light', CkUpdate)}
      {M('ck-banners',       'M · Banners (4)',                  'light', CkBanners)}
      {M('ck-states',        'M · States',                       'light', CkStates)}

      {/* ── Desktop · key screens ─────────────────────────────────── */}
      {D('ck-pair-d',        'D · Pairing wizard',               'light', CkPairing1)}
      {D('ck-dashboard-d',   'D · Dashboard',                    'light', CkDashboard)}
      {D('ck-sound-d',       'D · Sound · curve + simulator',    'light', CkSound)}
      {D('ck-update-d',      'D · /update · firmware docs',      'light', CkUpdate)}

      {/* ── OLED dark mode · key screens ──────────────────────────── */}
      {M('ck-dark-pair2',    'M · OLED · Pairing connect',       'dark',  CkPairing2)}
      {M('ck-dark-dashboard','M · OLED · Dashboard',             'dark',  CkDashboard)}
      {M('ck-dark-sound',    'M · OLED · Sound · curve',         'dark',  CkSound)}
      {D('ck-dark-dashboard-d','D · OLED · Dashboard',           'dark',  CkDashboard)}

      {/* ── Spec sheets ───────────────────────────────────────────── */}
      <DCArtboard id="ck-tokens" label="SPEC · Design tokens" width={480} height={900}>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}>
          <CkScene mode="light"><CkTokens/></CkScene>
        </div>
      </DCArtboard>
      <DCArtboard id="ck-typography" label="SPEC · Typography" width={480} height={780}>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}>
          <CkScene mode="light"><CkTypography/></CkScene>
        </div>
      </DCArtboard>
      <DCArtboard id="ck-icons" label="SPEC · Icons (28)" width={480} height={900}>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}>
          <CkScene mode="light"><CkIcons/></CkScene>
        </div>
      </DCArtboard>
    </React.Fragment>
  );
};
