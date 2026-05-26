// Shared frame primitives + tiny iconography for all three directions.
// Themes are passed in as plain objects so each direction file controls
// its own tokens fully.

// ─── Phone frame (375x812-ish, bezel-styled but neutral) ────────────
function PhoneFrame({ children, bg = '#fff', radius = 38, statusBar = null, w = 380, h = 780 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: bg, position: 'relative', overflow: 'hidden',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
    }}>
      {statusBar}
      <div style={{ position: 'absolute', inset: 0, paddingTop: statusBar ? 44 : 0 }}>
        {children}
      </div>
    </div>
  );
}

// Status bar generator: 9:41 + signal/wifi/battery, themable.
function StatusBar({ fg = '#000', time = '9:41' }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 44,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px 0 28px', color: fg, fontWeight: 600,
      fontSize: 14, fontFeatureSettings: '"tnum"',
    }}>
      <span>{time}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill={fg}>
          <rect x="0" y="7" width="3" height="4" rx="0.6"/>
          <rect x="4.5" y="5" width="3" height="6" rx="0.6"/>
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.6"/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.6"/>
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 16 12" fill="none">
          <path d="M8 11.5c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z" fill={fg}/>
          <path d="M3.6 7.3a6 6 0 018.8 0" stroke={fg} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
          <path d="M.7 4.3a10 10 0 0114.6 0" stroke={fg} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        </svg>
        {/* battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={fg} opacity="0.5"/>
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill={fg}/>
          <rect x="23.5" y="3.5" width="2" height="5" rx="0.6" fill={fg} opacity="0.5"/>
        </svg>
      </div>
    </div>
  );
}

// ─── Desktop browser frame ──────────────────────────────────────────
function BrowserFrame({ children, w = 1280, h = 800, bg = '#fff', chromeBg = '#e9e8e3', chromeFg = '#3a3530', accent = '#5a5550', url = 'config.flybeeper.com' }) {
  return (
    <div style={{
      width: w, height: h, background: chromeBg, borderRadius: 12, overflow: 'hidden',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }}/>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }}/>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }}/>
        </div>
        <div style={{ display: 'flex', gap: 8, color: chromeFg, opacity: 0.6 }}>
          <span>‹</span><span>›</span><span>↻</span>
        </div>
        <div style={{
          flex: 1, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', padding: '0 12px',
          color: chromeFg, fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}>
          <span style={{ marginRight: 6, opacity: 0.5 }}>🔒</span>{url}
        </div>
      </div>
      <div style={{ flex: 1, background: bg, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Mock 3D button-map of the mini BT device ────────────────────────
// Top-down stylized rendering: rounded rect body, 4 buttons, LED, buzzer.
// Hotspots are positioned so a direction file can overlay annotation lines.
function DeviceTopdown({ palette, scale = 1, showCallouts = true, activeButton = null, ledOn = true }) {
  const W = 220 * scale, H = 340 * scale;
  const { body, bodyShadow, button, buttonActive, led, ledGlow, label, callout, stroke } = palette;
  // Unique gradient ids per React instance so multiple devices on the same page
  // don't all resolve to the first match — React.useId() yields ":r0:" etc.
  const uid = React.useId().replace(/[:]/g, '');
  const bodyId = `dev-body-${uid}`;
  const ledId = `dev-led-${uid}`;
  return (
    <svg width={W} height={H} viewBox="0 0 220 340" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={body} />
          <stop offset="1" stopColor={bodyShadow} />
        </linearGradient>
        <radialGradient id={ledId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={led} stopOpacity="1"/>
          <stop offset="0.4" stopColor={led} stopOpacity="0.8"/>
          <stop offset="1" stopColor={ledGlow} stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* device body */}
      <rect x="50" y="40" width="120" height="260" rx="22" fill={`url(#${bodyId})`} stroke={stroke} strokeWidth="1.2"/>
      {/* speaker grille */}
      <g opacity="0.5">
        {[0,1,2,3,4].map(i => <circle key={i} cx={86 + i*12} cy={80} r="2" fill={stroke}/>)}
      </g>
      {/* LED indicator */}
      {ledOn && <circle cx="110" cy="120" r="14" fill={`url(#${ledId})`} opacity="0.6"/>}
      <circle cx="110" cy="120" r="4" fill={led}/>
      {/* 4 buttons in 2x2 layout */}
      {[
        { x: 88, y: 180, n: 1 },
        { x: 132, y: 180, n: 2 },
        { x: 88, y: 224, n: 3 },
        { x: 132, y: 224, n: 4 },
      ].map(b => (
        <g key={b.n}>
          <circle cx={b.x} cy={b.y} r="14" fill={activeButton === b.n ? buttonActive : button} stroke={stroke} strokeOpacity="0.3"/>
          <text x={b.x} y={b.y + 4} textAnchor="middle" fill={label} fontSize="11" fontWeight="600" fontFamily="inherit">{b.n}</text>
        </g>
      ))}
      {/* buzzer label below */}
      <rect x="86" y="260" width="48" height="24" rx="4" fill="none" stroke={stroke} strokeOpacity="0.4" strokeDasharray="2 2"/>
      <text x="110" y="276" textAnchor="middle" fill={label} fontSize="9" letterSpacing="0.5" fontFamily="inherit">BUZZER</text>

      {showCallouts && (
        <g>
          {/* LED callout right */}
          <line x1="124" y1="120" x2="200" y2="100" stroke={callout} strokeWidth="0.8"/>
          <circle cx="200" cy="100" r="2" fill={callout}/>
          {/* button callout left */}
          <line x1="74" y1="202" x2="20" y2="180" stroke={callout} strokeWidth="0.8"/>
          <circle cx="20" cy="180" r="2" fill={callout}/>
        </g>
      )}
    </svg>
  );
}

// ─── Vario curve chart (draggable points UI mock) ────────────────────
// 12 points across X (climb rate -3..+6 m/s), Y is frequency Hz.
// Renders a real-looking response curve with grid + markers. The
// climbrate-marker prop shows where the simulator slider is currently
// pointing.
function VarioCurveChart({ palette, w = 520, h = 220, markerAt = 0.55, points, showLabels = true, dotSize = 5, active = null, padded = true }) {
  const uid = React.useId().replace(/[:]/g, '');
  const fillId = `curve-fill-${palette.id}-${uid}`;
  const padL = padded ? 36 : 12, padR = padded ? 12 : 12, padT = 16, padB = padded ? 30 : 16;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  // Default curve: realistic vario response — quiet around 0, ramping up to climb
  const defaultPts = [
    0.18, 0.22, 0.28, 0.32, 0.30,  // sink → quiet
    0.20, 0.18,                     // around zero
    0.35, 0.50, 0.68, 0.82, 0.92,   // climb ramps up sharply
  ];
  const pts = points || defaultPts;
  const path = pts.map((y, i) => {
    const x = padL + (i / (pts.length - 1)) * innerW;
    const py = padT + (1 - y) * innerH;
    return `${i === 0 ? 'M' : 'L'} ${x} ${py}`;
  }).join(' ');
  const fillPath = path + ` L ${padL + innerW} ${padT + innerH} L ${padL} ${padT + innerH} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.curveFill} stopOpacity="0.5"/>
          <stop offset="1" stopColor={palette.curveFill} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const y = padT + g * innerH;
        return <line key={i} x1={padL} y1={y} x2={padL + innerW} y2={y} stroke={palette.grid} strokeWidth="0.6" strokeDasharray={g === 0.5 ? '0' : '2 3'}/>;
      })}
      {/* vertical zero-line (where sink/climb meet, roughly index 6 of 12) */}
      <line x1={padL + (6 / 11) * innerW} y1={padT} x2={padL + (6 / 11) * innerW} y2={padT + innerH} stroke={palette.grid} strokeWidth="0.8"/>
      {/* fill */}
      <path d={fillPath} fill={`url(#${fillId})`}/>
      {/* curve line */}
      <path d={path} stroke={palette.curve} strokeWidth="2" fill="none" strokeLinejoin="round"/>
      {/* climbrate marker (vertical line) */}
      {markerAt != null && (
        <g>
          <line
            x1={padL + markerAt * innerW} y1={padT}
            x2={padL + markerAt * innerW} y2={padT + innerH}
            stroke={palette.marker} strokeWidth="1.5"
          />
          <circle cx={padL + markerAt * innerW} cy={padT - 6} r="4" fill={palette.marker}/>
        </g>
      )}
      {/* drag points */}
      {pts.map((y, i) => {
        const x = padL + (i / (pts.length - 1)) * innerW;
        const py = padT + (1 - y) * innerH;
        const isActive = active === i;
        return (
          <g key={i}>
            <circle cx={x} cy={py} r={isActive ? dotSize + 3 : dotSize} fill={palette.surface} stroke={palette.curve} strokeWidth={isActive ? 2.5 : 1.5}/>
            {isActive && <circle cx={x} cy={py} r={dotSize - 1.5} fill={palette.curve}/>}
          </g>
        );
      })}
      {/* axis labels */}
      {showLabels && (
        <g fill={palette.axisLabel} fontSize="10" fontFamily="inherit">
          <text x={padL} y={h - 12} textAnchor="start">−3</text>
          <text x={padL + (6/11)*innerW} y={h - 12} textAnchor="middle">0</text>
          <text x={padL + innerW} y={h - 12} textAnchor="end">+6 m/s</text>
          <text x={padL - 6} y={padT + 4} textAnchor="end">Hz</text>
        </g>
      )}
    </svg>
  );
}

// ─── Climbrate simulator slider (the centerpiece "real instrument") ──
function ClimbrateSimulator({ palette, value = -1.2, min = -5, max = 10, w = 520, snapValues = [-2, 0, 0.5, 2, 5] }) {
  const frac = (value - min) / (max - min);
  const ticks = [-5, -3, -1, 0, 0.5, 1, 3, 6, 10];
  return (
    <div style={{ width: w, fontFamily: 'inherit', color: palette.text }}>
      {/* header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: palette.dim }}>
          Climbrate simulator
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: palette.dim }}>current</span>
          <span style={{ fontSize: 22, fontFamily: palette.mono, fontWeight: 600, color: value >= 0 ? palette.climb : palette.sink, fontFeatureSettings: '"tnum"' }}>
            {value >= 0 ? '+' : ''}{value.toFixed(1)} <span style={{ fontSize: 11, color: palette.dim, fontWeight: 400 }}>m/s</span>
          </span>
        </div>
      </div>
      {/* track */}
      <div style={{ position: 'relative', height: 28 }}>
        {/* gradient bar */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 11, height: 6, borderRadius: 3,
          background: `linear-gradient(to right, ${palette.sink} 0%, ${palette.sink} ${((0 - min) / (max - min)) * 100 - 8}%, ${palette.dim} ${((0 - min) / (max - min)) * 100}%, ${palette.climb} ${((0 - min) / (max - min)) * 100 + 8}%, ${palette.climb} 100%)`,
          opacity: 0.85,
        }}/>
        {/* tick marks */}
        {ticks.map(t => {
          const f = (t - min) / (max - min);
          const isZero = t === 0;
          return (
            <div key={t} style={{
              position: 'absolute', left: `calc(${f * 100}% - 0.5px)`, top: 9,
              width: 1, height: isZero ? 14 : 10, background: palette.tick, opacity: isZero ? 1 : 0.6,
            }}/>
          );
        })}
        {/* thumb */}
        <div style={{
          position: 'absolute', left: `calc(${frac * 100}% - 12px)`, top: 1,
          width: 24, height: 24, borderRadius: 12, background: palette.surface,
          border: `2px solid ${value >= 0 ? palette.climb : palette.sink}`,
          boxShadow: palette.thumbShadow || '0 2px 6px rgba(0,0,0,0.18)',
        }}/>
      </div>
      {/* axis numbers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, fontFamily: palette.mono, color: palette.dim, fontFeatureSettings: '"tnum"' }}>
        <span>−5</span>
        <span style={{ marginLeft: '-2%' }}>−3</span>
        <span style={{ marginLeft: '-3%' }}>−1</span>
        <span>0</span>
        <span>+1</span>
        <span>+3</span>
        <span>+6</span>
        <span>+10 m/s</span>
      </div>
      {/* snap chips */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: palette.dim, marginRight: 4 }}>Snap</span>
        {snapValues.map(s => (
          <span key={s} style={{
            padding: '5px 10px', borderRadius: palette.chipRadius || 4,
            background: s === Math.round(value * 10) / 10 ? palette.accent : palette.chipBg,
            color: s === Math.round(value * 10) / 10 ? palette.onAccent : palette.text,
            border: palette.chipBorder || 'none',
            fontSize: 11, fontFamily: palette.mono, fontWeight: 500, fontFeatureSettings: '"tnum"',
          }}>
            {s >= 0 ? '+' : ''}{s}
          </span>
        ))}
        <span style={{ flex: 1 }}/>
        <button style={{
          padding: '5px 12px', borderRadius: palette.chipRadius || 4,
          background: palette.accent, color: palette.onAccent, border: 'none',
          fontSize: 11, fontFamily: palette.mono, fontWeight: 600, letterSpacing: 0.5, cursor: 'pointer',
        }}>▶ Demo curve</button>
      </div>
    </div>
  );
}

// ─── Bluetooth icon + RSSI bars ──────────────────────────────────────
const Icons = {
  bt: (c = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 12 16" fill="none">
      <path d="M2 4 L10 12 L6 14 L6 2 L10 4 L2 12" stroke={c} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  rssi: (c = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill={c}>
      <rect x="0" y="9" width="2" height="5"/>
      <rect x="3.5" y="6" width="2" height="8"/>
      <rect x="7" y="3" width="2" height="11"/>
      <rect x="10.5" y="0" width="2" height="14" opacity="0.3"/>
    </svg>
  ),
  battery: (level = 0.78, c = 'currentColor', size = 22) => (
    <svg width={size} height={size * 0.5} viewBox="0 0 26 12" fill="none">
      <rect x="0.5" y="0.5" width="22" height="11" rx="2.5" stroke={c}/>
      <rect x="2" y="2" width={19 * level} height="8" rx="1" fill={c}/>
      <rect x="23.5" y="3.5" width="2" height="5" rx="0.6" fill={c}/>
    </svg>
  ),
  check: (c = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2 7 L6 11 L12 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  x: (c = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 3 L11 11 M11 3 L3 11" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  alert: (c = 'currentColor', size = 16) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2 L14.5 13 H1.5 Z" stroke={c} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <line x1="8" y1="6.5" x2="8" y2="9.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="8" cy="11.4" r="0.9" fill={c}/>
    </svg>
  ),
  arrow: (c = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2 7 H12 M8 3 L12 7 L8 11" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  download: (c = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 2 V9 M3 7 L7 11 L11 7 M2 12 H12" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  share: (c = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="3" cy="7" r="1.6" stroke={c} strokeWidth="1.4"/>
      <circle cx="11" cy="3" r="1.6" stroke={c} strokeWidth="1.4"/>
      <circle cx="11" cy="11" r="1.6" stroke={c} strokeWidth="1.4"/>
      <path d="M4.4 6.3 L9.6 3.7 M4.4 7.7 L9.6 10.3" stroke={c} strokeWidth="1.2"/>
    </svg>
  ),
  qr: (c = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="4" height="4" stroke={c} strokeWidth="1"/>
      <rect x="9" y="1" width="4" height="4" stroke={c} strokeWidth="1"/>
      <rect x="1" y="9" width="4" height="4" stroke={c} strokeWidth="1"/>
      <rect x="7" y="7" width="2" height="2" fill={c}/>
      <rect x="11" y="7" width="2" height="2" fill={c}/>
      <rect x="7" y="11" width="2" height="2" fill={c}/>
      <rect x="11" y="11" width="2" height="2" fill={c}/>
    </svg>
  ),
};

Object.assign(window, { PhoneFrame, StatusBar, BrowserFrame, DeviceTopdown, VarioCurveChart, ClimbrateSimulator, Icons });
