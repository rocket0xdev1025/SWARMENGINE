/* SWARM RADAR SCOPE: the launch radar as a monochrome PPI scope.
   Bearing = chain sector, range = pool age (rim = just launched, centre = 24h old), blip shape = verdict.
   The sweep lights blips as it passes; echoes drive the oscilloscope, spectrum, wave ring and echo stream.
   The scope locks onto the token being scanned (or replays recent verdicts) and never waits on the backend.
   window.RadarScope(box, {chains:[{id,name}], onOpen(item), onHover(item|null), chain}) -> { update(feed, enabled), stop(), mode } */
(() => {
'use strict';
const TAU = Math.PI * 2, SPEED = TAU / 4;                      // one sweep every 4 s (15 rpm)
const ACC = '#ffffff';
const COL = { DANGER: '#ffffff', RISKY: '#e0e0e0', OK: '#19e3c4', CLEAN: '#2f7dff', TOO_EARLY: '#6a6a6a' };
const SHORT = { ethereum: 'ETH', arbitrum: 'ARB', optimism: 'OP', robinhood: 'HOOD', solana: 'SOL', base: 'BASE' };
const RANGES = [[60, '1M'], [600, '10M'], [3600, '1H'], [6 * 3600, '6H'], [86400, '24H']];
const MAXAGE = 86400;
const RING_TXT = ' SWARM // LAUNCH INTAKE // PPI SCAN // HOLDER CRAWL // FUNDER TRACE // SWARM LINK // CONTRACT AUDIT // JUDGE //';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = x => x == null ? '—' : x >= 1e6 ? '$' + (x / 1e6).toFixed(2) + 'M' : x >= 1e3 ? '$' + (x / 1e3).toFixed(1) + 'K' : '$' + Math.round(x);
const sym = x => (x.symbol || (x.name || '').split(' / ')[0] || (x.token || '').slice(0, 6) || '?').toUpperCase().slice(0, 12);
const ago = ts => { if (!ts) return '—'; const m = Math.max(0, (Date.now() / 1000 - ts) / 60); return m < 1 ? 'now' : m < 60 ? Math.round(m) + 'm' : m < 1440 ? (m / 60).toFixed(1) + 'h' : Math.round(m / 1440) + 'd'; };
const key = x => x.chain + ':' + x.token;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
const RGB = {}; const rgba = (hex, a) => { const c = RGB[hex] || (RGB[hex] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
const color = it => it.band ? (COL[it.band] || '#6a6a6a') : it.status === 'scanning' ? ACC : it.status === 'error' ? '#4a4a4a' : '#9a9a9a';
const state = it => it.band ? `${it.band} ${it.score ?? ''}`.trim() : it.status === 'scanning' ? 'SCANNING' : it.status === 'error' ? 'FAILED' : 'QUEUED';
const liqK = it => Math.max(0, Math.min(1, (Math.log10(Math.max(10, it.liquidity_usd || 10)) - 2) / 4));
const angDiff = (a, b) => ((a - b) % TAU + TAU) % TAU;
const bearing = ang => ((ang * 180 / Math.PI + 90) % 360 + 360) % 360;
const hex2 = () => (Math.random() * 256 | 0).toString(16).padStart(2, '0');
const ICON = {   // legend glyphs, same shapes as the blips
  DANGER: '<svg viewBox="0 0 10 10"><path d="M5 0 10 5 5 10 0 5z" fill="#fff"/></svg>',
  RISKY: '<svg viewBox="0 0 10 10"><path d="M5 1 9.5 9 .5 9z" fill="#e0e0e0"/></svg>',
  OK: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#19e3c4"/></svg>',
  CLEAN: '<svg viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="#2f7dff"/></svg>',
  QUEUED: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.6" fill="none" stroke="#9a9a9a" stroke-width="1.2"/></svg>',
};

window.RadarScope = function (box, opts = {}) {
  box.classList.add('rs');
  box.innerHTML = `<canvas class="rs-cv"></canvas><div class="rs-scan"></div><div class="rs-noise"></div>
    <i class="rs-cn tl"></i><i class="rs-cn tr"></i><i class="rs-cn bl"></i><i class="rs-cn br"></i>
    <div class="rs-top"><div class="rs-title"><b>LAUNCH RADAR</b><span>PPI · ${esc(opts.chain || 'live')} · <i data-k="mode">standby</i></span></div>
      <div class="rs-stats"><div><span>contacts</span><b data-k="n">000</b></div><div><span>scanned</span><b data-k="sc">000</b></div><div><span>danger</span><b data-k="dg" class="rs-hi">000</b></div><div><span>in scan</span><b data-k="live">0</b></div></div></div>
    <div class="rs-hexcol">
      <div class="rs-panel rs-hex"><div class="rs-ph"><span>echo stream</span><i data-k="rx">rx 0</i></div><pre data-k="hex"></pre></div>
      <div class="rs-panel rs-meters"><div class="rs-ph"><span>load</span><i data-k="hz">0 hz</i></div>
        <div class="rs-mt"><div><u data-k="m0"></u><span>rx</span></div><div><u data-k="m1"></u><span>lock</span></div><div><u data-k="m2"></u><span>q</span></div><div><u data-k="m3"></u><span>thr</span></div><div><u data-k="m4"></u><span>snr</span></div></div></div>
    </div>
    <div class="rs-right">
      <div class="rs-panel rs-log"><div class="rs-ph"><span>contact log</span><i data-k="clock">--:--:-- UTC</i></div><div class="rs-log-l"></div></div>
      <div class="rs-panel rs-sig"><div class="rs-ph"><span>echo · spectrum</span><i data-k="snr">snr --</i></div><canvas class="rs-osc"></canvas><canvas class="rs-spec"></canvas></div>
    </div>
    <div class="rs-lock"><em data-k="lid"></em><b data-k="lsym"></b><span data-k="lsub"></span><div class="rs-lrow"><span>liq <b data-k="lliq"></b></span><span>age <b data-k="lage"></b></span><span>brg <b data-k="lbrg"></b></span></div><i data-k="lvd"></i></div>
    <div class="rs-empty"></div>
    <div class="rs-bot"><span>brg <b data-k="brg">---.-°</b></span><span>rng <b data-k="rng">---</b></span><span>sweep <b>15 rpm</b></span><span class="rs-hz">freq <b data-k="fq">9.41 ghz</b></span>
      <span class="rs-legend">${['DANGER', 'RISKY', 'OK', 'CLEAN', 'QUEUED'].map(b => `<i>${ICON[b]}</i>${b.toLowerCase()}`).join('')}</span></div>
    <div class="rs-tick"><div class="rs-tick-in" data-k="tick"></div></div>
    <div class="rs-tip"></div>`;
  const cv = box.querySelector('.rs-cv'), ctx = cv.getContext('2d'), stat = document.createElement('canvas');
  const osc = box.querySelector('.rs-osc'), octx = osc.getContext('2d'), spec = box.querySelector('.rs-spec'), sctx = spec.getContext('2d');
  const K = k => box.querySelector(`[data-k="${k}"]`);
  const lock = box.querySelector('.rs-lock'), tip = box.querySelector('.rs-tip'), empty = box.querySelector('.rs-empty'), logEl = box.querySelector('.rs-log-l');
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 100, narrow = false, wide = false, hexOn = false, alive = true, raf = 0;
  let feed = [], enabled = true, sectors = new Map(), blips = [], clutter = [], hover = null, mode = 'standby';
  let tgt = null, tgtT = 0, replayIdx = 0, lastClock = 0, lastHex = 0, rx = 0, echoes = 0;
  let shocks = [], prevBand = null, lastSince = new Map(), hexLines = [], oscBuf = [], specH = new Float32Array(48), specPk = new Float32Array(48);
  const ring = new Float32Array(360);

  // ---------------------------------------------------------------- geometry
  const rad = age => { const f = Math.max(0, Math.min(1, Math.log(1 + Math.max(0, age) / 20) / Math.log(1 + MAXAGE / 20))); return R * (0.96 - 0.84 * f); };
  function fit(c) { const w = c.clientWidth, h = c.clientHeight; if (w && (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr))) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); } return [w, h]; }
  function layout() {
    W = box.clientWidth; H = box.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    narrow = W < 640; wide = W >= 860; hexOn = W >= 1100;
    cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
    if (wide) {
      const left = hexOn ? 196 : 24, right = W - Math.min(340, W * 0.3) - 48, aw = right - left;
      cx = left + aw / 2; cy = H * 0.5 + 2; R = Math.max(90, Math.min(aw / 2 - 66, H / 2 - 108));
    } else if (!narrow) { cx = W / 2; cy = H * 0.52; R = Math.min(W * 0.32, H / 2 - 108); }
    else { R = Math.min(W * 0.38, H * 0.3); cx = W / 2; cy = H * 0.52; }
    drawStatic();
  }
  function setSectors() {
    const ids = [...new Set([...(opts.chains || []).map(c => c.id), ...feed.map(x => x.chain)])];
    const same = ids.length === sectors.size && ids.every(id => sectors.has(id));
    if (same) return false;
    sectors = new Map(); const n = Math.max(1, ids.length), w = TAU / n;
    ids.forEach((id, i) => sectors.set(id, [-Math.PI / 2 + i * w, w]));
    return true;
  }
  function place(it) {
    const s = sectors.get(it.chain) || [-Math.PI / 2, TAU];
    const ang = s[0] + s[1] * (0.1 + 0.8 * hash(it.token || ''));
    const r = rad(Date.now() / 1000 - (it.created_ts || it.seen_ts || Date.now() / 1000));
    return { it, ang, r, x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, s: 2.6 + 4.2 * liqK(it) };
  }

  // ---------------------------------------------------------------- static layer (grid, rings, ticks, sectors)
  function drawStatic() {
    stat.width = cv.width; stat.height = cv.height;
    const g = stat.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.07)';                           // dot grid + crosses
    for (let x = 12; x < W; x += 24) for (let y = 12; y < H; y += 24) g.fillRect(x, y, 1, 1);
    g.strokeStyle = 'rgba(255,255,255,.10)'; g.beginPath();
    for (let x = 12; x < W; x += 96) for (let y = 12; y < H; y += 96) { g.moveTo(x - 3, y); g.lineTo(x + 4, y); g.moveTo(x, y - 3); g.lineTo(x, y + 4); }
    g.stroke();
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.45);
    glow.addColorStop(0, 'rgba(255,255,255,.09)'); glow.addColorStop(0.65, 'rgba(255,255,255,.025)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, R * 1.45, 0, TAU); g.fill();
    g.fillStyle = 'rgba(4,4,4,.9)'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    // polar grid: fine radial spokes every 10°
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.beginPath();
    for (let d = 0; d < 360; d += 10) { const a = d * Math.PI / 180; g.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
    g.stroke();
    // range rings + labels
    g.font = '9px "JetBrains Mono", monospace'; g.textBaseline = 'bottom';
    RANGES.forEach(([s, lb]) => {
      const r = rad(s); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.setLineDash(s === 3600 ? [] : [2, 4]);
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText(lb, cx + 4, cy - r - 2);
    });
    g.setLineDash([]);
    // crosshair + diagonals
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.beginPath();
    g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    g.setLineDash([1, 5]); g.beginPath();
    for (const a of [Math.PI / 4, 3 * Math.PI / 4]) { g.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
    g.stroke(); g.setLineDash([]);
    // sector dividers + arcs + labels
    let si = 0;
    sectors.forEach(([a0, w], id) => {
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.setLineDash([3, 6]); g.beginPath();
      g.moveTo(cx + Math.cos(a0) * R * 0.12, cy + Math.sin(a0) * R * 0.12); g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); g.stroke(); g.setLineDash([]);
      g.strokeStyle = si++ % 2 ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.4)'; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, R + 3, a0 + 0.02, a0 + w - 0.02); g.stroke(); g.lineWidth = 1;
      if (sectors.size > 1) {
        const am = a0 + w / 2, lr = R + (narrow ? 14 : 34);
        g.font = `600 ${narrow ? 9 : 10}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const lb = SHORT[id] || id.toUpperCase().slice(0, 6), lx = cx + Math.cos(am) * lr, ly = cy + Math.sin(am) * lr, tw = g.measureText(lb).width + 10;
        g.fillStyle = '#000'; g.fillRect(lx - tw / 2, ly - 7, tw, 14); g.strokeStyle = 'rgba(255,255,255,.45)'; g.strokeRect(lx - tw / 2 + .5, ly - 6.5, tw - 1, 13);
        g.fillStyle = '#fff'; g.fillText(lb, lx, ly + 0.5);
      }
    });
    // bearing ticks
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath();
    for (let d = 0; d < 360; d += 2) {
      const a = (d - 90) * Math.PI / 180, len = d % 30 === 0 ? 9 : d % 10 === 0 ? 5 : 2;
      g.moveTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6)); g.lineTo(cx + Math.cos(a) * (R + 6 + len), cy + Math.sin(a) * (R + 6 + len));
    }
    g.stroke();
    if (!narrow) {
      g.font = '8.5px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(255,255,255,.45)'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const mids = sectors.size > 1 ? [...sectors.values()].map(([a0, w]) => bearing(a0 + w / 2)) : [];
      for (let d = 0; d < 360; d += 30) { if (mids.some(m => Math.min(Math.abs(m - d), 360 - Math.abs(m - d)) < 12)) continue; const a = (d - 90) * Math.PI / 180; g.fillText(String(d).padStart(3, '0'), cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22)); }
    }
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  }

  // ---------------------------------------------------------------- target lock
  function pickTarget() {
    const live = feed.find(x => x.status === 'scanning' && !x.band);
    if (live) { mode = 'live'; return live; }
    const done = feed.filter(x => x.band).slice(0, 12);
    if (done.length) { mode = 'replay'; return done[replayIdx++ % done.length]; }
    const q = feed.filter(x => !x.band).slice(0, 12);
    if (q.length) { mode = 'queue'; return q[replayIdx++ % q.length]; }
    mode = enabled === false ? 'offline' : 'standby'; return null;
  }
  function setTarget(it) {
    tgt = it ? key(it) : null; tgtT = performance.now();
    const m = K('mode'); m.textContent = { live: 'live · scanning', replay: 'replay · real verdicts', queue: 'queue', standby: 'standby', offline: 'offline' }[mode];
    m.className = mode === 'live' ? 'live' : '';
    if (!it) { lock.classList.remove('on'); return; }
    const n = feed.indexOf(it);
    lock.classList.toggle('danger', it.band === 'DANGER');
    K('lid').textContent = `TGT ${String(n + 1).padStart(2, '0')}/${String(feed.length).padStart(2, '0')} · ${SHORT[it.chain] || it.chain} · ${(it.token || '').slice(0, 10)}`;
    scramble(K('lsym'), sym(it));
    K('lsub').textContent = (it.headline || it.error || (it.status === 'scanning' ? 'swarm agents crawling holders…' : 'awaiting scan slot')).split(' · ')[0];
    K('lliq').textContent = usd(it.liquidity_usd); K('lage').textContent = ago(it.created_ts || it.seen_ts);
    K('lvd').textContent = state(it); lock.style.setProperty('--vc', color(it));
    lock.classList.add('on');
    logEl.querySelectorAll('.rs-row').forEach(r => r.classList.toggle('tgt', r.dataset.k === tgt));
    pushHex(`>> LOCK ${SHORT[it.chain] || it.chain} ${sym(it)} ${state(it)}`, 'lk');
  }
  function scramble(el, text, ms = 650) {
    const G = '01#$%&*<>/\\=+ABCDEFX', t0 = performance.now();
    const step = now => { if (!alive) return; const k = Math.min(1, (now - t0) / ms), n = Math.floor(k * text.length);
      el.textContent = text.slice(0, n) + Array.from(text.slice(n), c => c === ' ' ? ' ' : G[Math.random() * G.length | 0]).join('');
      if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- HUD (stats, log, ticker, echo stream, meters)
  const pad = (v, n = 3) => String(v).padStart(n, '0');
  function hud() {
    K('n').textContent = pad(feed.length); K('sc').textContent = pad(feed.filter(x => x.band).length);
    K('dg').textContent = pad(feed.filter(x => x.band === 'DANGER').length); K('live').textContent = feed.filter(x => x.status === 'scanning' && !x.band).length;
    logEl.innerHTML = feed.slice(0, 16).map(x => `<div class="rs-row${key(x) === tgt ? ' tgt' : ''} b-${esc(x.band || x.status || '')}" data-k="${esc(key(x))}">
      <i>${esc(ago(x.created_ts || x.seen_ts))}</i><span>${esc(SHORT[x.chain] || x.chain)}</span><b>${esc(sym(x))}</b><em>${esc(state(x))}</em></div>`).join('')
      || `<div class="rs-row idle"><i>--</i><span>sys</span><b>${enabled === false ? 'radar offline' : 'listening…'}</b><em>idle</em></div>`;
    empty.textContent = feed.length ? '' : enabled === false ? 'RADAR OFFLINE · RADAR_ENABLED=false' : 'NO CONTACTS · LISTENING FOR NEW POOLS';
    const items = feed.slice(0, 24).map(x => `<span class="${x.band === 'DANGER' ? 'hi' : ''}">${esc(SHORT[x.chain] || x.chain)} ▸ ${esc(sym(x))} ▸ ${esc(state(x))} ▸ liq ${esc(usd(x.liquidity_usd))}</span>`);
    const base = items.length ? items.join('<em>///</em>') : '<span>SWARM LAUNCH RADAR ▸ LISTENING FOR NEW POOLS ▸ GECKOTERMINAL INTAKE ▸ AUTO-SCAN ▸ JUDGE</span>';
    const tk = K('tick'); tk.innerHTML = base + '<em>///</em>' + base + '<em>///</em>'; tk.style.animationDuration = Math.max(20, Math.min(120, (items.length || 6) * 5)) + 's';
  }
  function pushHex(line, cls = '') { hexLines.push([line, cls]); if (hexLines.length > 60) hexLines.splice(0, hexLines.length - 60); }
  function hexTick(now) {
    if (now - lastHex < 120) return; lastHex = now;
    const addr = (Math.random() * 0xffff | 0).toString(16).padStart(4, '0');
    pushHex(`${addr} ${hex2()} ${hex2()} ${hex2()} ${hex2()} ${hex2()} ${hex2()}`);
    if (hexOn) K('hex').innerHTML = hexLines.slice(-30).map(([l, c]) => `<span class="${c}">${esc(l)}</span>`).join('');
    K('rx').textContent = 'rx ' + rx; K('hz').textContent = (echoes * 8).toFixed(0) + ' hz';
    const q = feed.filter(x => !x.band && x.status !== 'error').length, live = feed.some(x => x.status === 'scanning' && !x.band);
    const m = [Math.min(1, echoes * 0.5 + Math.random() * 0.15), tgt ? 0.75 + Math.random() * 0.25 : 0.05, Math.min(1, q / 12), live ? 0.6 + Math.random() * 0.4 : 0.1 + Math.random() * 0.1, 0.45 + Math.random() * 0.35];
    m.forEach((v, i) => { K('m' + i).style.height = (v * 100).toFixed(0) + '%'; });
    K('snr').textContent = 'snr ' + (12 + echoes * 6 + Math.random() * 3).toFixed(1) + ' db';
    K('fq').textContent = (9.41 + Math.sin(now / 900) * 0.004).toFixed(3) + ' ghz';
    echoes *= 0.6;
  }
  logEl.addEventListener('click', e => { const r = e.target.closest('.rs-row[data-k]'); const it = r && feed.find(x => key(x) === r.dataset.k); if (it && opts.onOpen) opts.onOpen(it); });
  logEl.addEventListener('mouseover', e => { const r = e.target.closest('.rs-row[data-k]'); hover = r ? blips.find(b => key(b.it) === r.dataset.k) || null : null; });
  logEl.addEventListener('mouseleave', () => { hover = null; });

  // ---------------------------------------------------------------- scope layers
  function sweep(a, T) {
    const L = 1.3;
    if (ctx.createConicGradient) {
      const gr = ctx.createConicGradient(a - L, cx, cy);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(L / TAU * 0.7, 'rgba(255,255,255,.05)'); gr.addColorStop(L / TAU, 'rgba(255,255,255,.26)'); gr.addColorStop(L / TAU + 0.0005, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    } else {
      for (let i = 0; i < 28; i++) { const k = i / 28; ctx.fillStyle = `rgba(255,255,255,${0.24 * k * k})`; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a - L + L * k, a - L + L * (k + 1 / 28) + 0.005); ctx.fill(); }
    }
    // interference waves riding the beam
    for (let j = 1; j <= 3; j++) {
      const aj = a - j * 0.07; ctx.strokeStyle = `rgba(255,255,255,${0.32 / j})`; ctx.lineWidth = 1; ctx.beginPath();
      for (let r = R * 0.06; r <= R; r += 3) {
        const off = Math.sin(r * 0.09 - T * 9 + j) * (2 + j) * (r / R);
        const x = cx + Math.cos(aj) * r - Math.sin(aj) * off, y = cy + Math.sin(aj) * r + Math.cos(aj) * off;
        r === R * 0.06 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.shadowColor = '#fff'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); ctx.restore();
  }
  function sonar(T) {                                  // concentric pulse waves leaving the centre
    for (let i = 0; i < 4; i++) {
      const k = ((T / 2.2) + i / 4) % 1, r = R * k;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.22})`; ctx.lineWidth = 1 + (1 - k) * 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    }
    // radial ripple: a wavy ring that breathes
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.beginPath();
    const rr = R * (0.5 + 0.06 * Math.sin(T * 0.8));
    for (let d = 0; d <= 360; d += 3) { const ang = d * Math.PI / 180, r = rr + Math.sin(ang * 8 + T * 2.5) * 4 + Math.sin(ang * 3 - T * 1.3) * 3;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r; d ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function waveRing(a, T) {                            // signal ring: amplitude spikes at the beam and at echo bearings
    const base = R + (narrow ? 24 : 48), amp = narrow ? 5 : 10;
    ring.fill(0);
    blips.forEach(b => { const gl = Math.exp(-angDiff(a, b.ang) / SPEED / 0.9); if (gl < 0.02) return;
      const c = Math.round(bearing(b.ang)); for (let o = -4; o <= 4; o++) ring[(c + o + 360) % 360] += gl * (1 - Math.abs(o) / 5) * (b.it.band === 'DANGER' ? 1.6 : 1); });
    const sb = bearing(a);
    for (const [w, al, dir] of [[1, 0.55, 1], [0.6, 0.2, -1]]) {
      ctx.strokeStyle = `rgba(255,255,255,${al})`; ctx.lineWidth = w; ctx.beginPath();
      for (let d = 0; d <= 360; d += 1) {
        const i = d % 360, ang = (d - 90) * Math.PI / 180, behind = ((sb - d) % 360 + 360) % 360;
        const beam = Math.exp(-behind / 18), n = Math.sin(d * 0.35 + T * 6 * dir) * 0.25 + Math.sin(d * 0.11 - T * 2) * 0.2;
        const r = base + dir * amp * (n * (0.6 + beam) + ring[i] * 1.2 + beam * Math.sin(d * 1.7 + T * 30) * 0.8);
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r; d ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  function textRing(T) {
    if (narrow) return;
    const r = R + 70; if (cy - r < 64 || cy + r > H - 52) return;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-T * 0.04);
    ctx.font = '8px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.textAlign = 'center';
    const txt = RING_TXT.repeat(3), step = 7 / r, n = Math.min(txt.length, Math.floor(TAU / step));
    for (let i = 0; i < n; i++) { ctx.save(); ctx.rotate(i * step); ctx.translate(0, -r); ctx.fillText(txt[i], 0, 0); ctx.restore(); }
    ctx.restore();
  }
  function shape(it, x, y, s) {
    const b = it.band; ctx.beginPath();
    if (b === 'DANGER') { ctx.moveTo(x, y - s * 1.35); ctx.lineTo(x + s * 1.35, y); ctx.lineTo(x, y + s * 1.35); ctx.lineTo(x - s * 1.35, y); ctx.closePath(); ctx.fill(); }
    else if (b === 'RISKY') { ctx.moveTo(x, y - s * 1.2); ctx.lineTo(x + s * 1.1, y + s * 0.8); ctx.lineTo(x - s * 1.1, y + s * 0.8); ctx.closePath(); ctx.fill(); }
    else if (b === 'OK') { ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
    else if (b === 'CLEAN') { ctx.rect(x - s * 0.85, y - s * 0.85, s * 1.7, s * 1.7); ctx.fill(); }
    else if (b) { ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke(); }
    else if (it.status === 'error') { ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke(); }
    else { ctx.arc(x, y, s, 0, TAU); ctx.stroke(); }
  }
  function blip(b, a, T) {
    const it = b.it, c = color(it), since = angDiff(a, b.ang) / SPEED, gl = Math.exp(-since / 2.4), hot = hover === b;
    const k = key(it), prev = lastSince.get(k); lastSince.set(k, since);
    if (prev != null && since < prev - 1) { rx++; echoes += 0.5 + liqK(it); pushHex(`ECHO ${bearing(b.ang).toFixed(0).padStart(3, '0')}° ${sym(it)}`, it.band === 'DANGER' ? 'hi' : 'ec'); }
    if (since < 0.9) {                                // echo ripple: 2 rings
      for (const off of [0, 0.25]) { const s2 = since - off; if (s2 < 0) continue;
        ctx.strokeStyle = rgba(c, (1 - s2 / 0.9) * 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, b.s + s2 * 34, 0, TAU); ctx.stroke(); }
    }
    ctx.save(); ctx.globalAlpha = hot ? 1 : Math.max(it.band ? 0.45 : 0.3, gl); ctx.shadowColor = c; ctx.shadowBlur = 6 + 12 * gl + (hot ? 12 : 0);
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 1.3;
    shape(it, b.x, b.y, b.s * (hot ? 1.4 : 1));
    if (it.band === 'DANGER') {                         // danger strobe halo
      const p = (Math.sin(T * 7) + 1) / 2; ctx.globalAlpha = 0.25 + 0.5 * p; ctx.shadowBlur = 0; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.s * 2.4 + p * 3, 0, TAU); ctx.stroke();
    }
    if (it.status === 'scanning' && !it.band) {
      ctx.setLineDash([3, 3]); ctx.lineDashOffset = -T * 18; ctx.beginPath(); ctx.arc(b.x, b.y, b.s + 5 + Math.sin(T * 6) * 1.5, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.s + 10 + ((T * 20) % 14), 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  function reticle(b, T) {
    const k = Math.min(1, (performance.now() - tgtT) / 600), e = 1 - Math.pow(1 - k, 3);
    const sz = (b.s + 10) + (1 - e) * 46, br = sz * 0.45;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate((1 - e) * 1.6 + (mode === 'live' ? T * 0.6 : 0));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(sx * sz, sy * (sz - br)); ctx.lineTo(sx * sz, sy * sz); ctx.lineTo(sx * (sz - br), sy * sz); }
    ctx.stroke();
    ctx.shadowBlur = 0; ctx.rotate(-T * 1.4); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.setLineDash([1, 4]); ctx.beginPath(); ctx.arc(0, 0, sz + 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // crosshair lines through the target to the rim
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(b.x, cy - R); ctx.lineTo(b.x, cy + R); ctx.moveTo(cx - R, b.y); ctx.lineTo(cx + R, b.y); ctx.stroke(); ctx.restore();
    // track line from origin
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.setLineDash([2, 5]); ctx.lineDashOffset = -T * 12;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
    // callout placement + leader
    const lw = lock.offsetWidth, lh = lock.offsetHeight;
    let lx, ly;
    if (narrow) { lx = 14; ly = H - lh - 58; }
    else {
      const right = b.x <= cx;
      lx = right ? b.x + 46 : b.x - 46 - lw; ly = b.y - lh - 26;
      const minX = hexOn ? 196 : 14, maxX = wide ? W - Math.min(340, W * 0.3) - 48 : W - 14;
      lx = Math.max(minX, Math.min(lx, maxX - lw)); ly = Math.max(70, Math.min(ly, H - lh - 64));
      const ax = lx + (right ? 0 : lw), ay = ly + lh;
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * e})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(ax - 2, ay - 2, 4, 4);
    }
    lock.style.left = lx + 'px'; lock.style.top = ly + 'px';
    K('lbrg').textContent = bearing(b.ang).toFixed(0).padStart(3, '0') + '°';
  }
  function shock(T) {                                  // verdict landed: triple ripple from that blip
    shocks = shocks.filter(s => T - s.t < 2.4);
    shocks.forEach(s => { const b = blips.find(x => key(x.it) === s.k); if (!b) return;
      for (let i = 0; i < 3; i++) { const k = (T - s.t - i * 0.25) / 1.6; if (k < 0 || k > 1) continue;
        ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`; ctx.lineWidth = 1.5 * (1 - k) + 0.5; ctx.beginPath(); ctx.arc(b.x, b.y, 6 + k * R * 0.5, 0, TAU); ctx.stroke(); } });
  }
  function hub(T) {
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(cx, cy, 2.5 + Math.sin(T * 4) * 0.8, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(T * 0.9); ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(3, -9); ctx.lineTo(-3, -9); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(cx, cy, 18, T % TAU, T % TAU + 1.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 18, T % TAU + Math.PI, T % TAU + Math.PI + 1.6); ctx.stroke();
  }

  // ---------------------------------------------------------------- side instruments (oscilloscope + spectrum)
  function scope2(a, T) {
    if (!wide) return;
    let [w, h] = fit(osc); if (!w) return;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.clearRect(0, 0, w, h);
    octx.strokeStyle = 'rgba(255,255,255,.08)'; octx.beginPath();
    for (let x = 0; x < w; x += w / 10) { octx.moveTo(x + .5, 0); octx.lineTo(x + .5, h); }
    for (let y = 0; y <= h; y += h / 4) { octx.moveTo(0, y + .5); octx.lineTo(w, y + .5); }
    octx.stroke();
    let e = 0; blips.forEach(b => { const s = angDiff(a, b.ang) / SPEED; e += Math.exp(-s * 16) * (0.5 + liqK(b.it)) * (b.it.band === 'DANGER' ? 1.5 : 1); });
    const live = feed.some(x => x.status === 'scanning' && !x.band);
    oscBuf.push([Math.min(1.4, e), Math.random()]); const N = Math.ceil(w / 2); if (oscBuf.length > N) oscBuf.splice(0, oscBuf.length - N);
    const mid = h / 2, n = oscBuf.length;
    // carrier
    octx.strokeStyle = 'rgba(255,255,255,.35)'; octx.lineWidth = 1; octx.beginPath();
    for (let x = 0; x <= w; x += 2) { const y = mid + Math.sin(x * 0.08 - T * 7) * h * (live ? 0.18 : 0.1) * (0.7 + 0.3 * Math.sin(x * 0.013 + T)); x ? octx.lineTo(x, y) : octx.moveTo(x, y); }
    octx.stroke();
    // echo return trace (data driven)
    octx.strokeStyle = '#fff'; octx.lineWidth = 1.4; octx.shadowColor = '#fff'; octx.shadowBlur = 6; octx.beginPath();
    oscBuf.forEach(([v, r], i) => { const x = w - (n - 1 - i) * 2, y = mid + (h * 0.42) * (-v * Math.sin(i * 1.9) * 0.9 + (r - 0.5) * 0.12); i ? octx.lineTo(x, y) : octx.moveTo(x, y); });
    octx.stroke(); octx.shadowBlur = 0;
    // spectrum by bearing
    [w, h] = fit(spec); if (!w) return;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.clearRect(0, 0, w, h);
    const B = specH.length, bw = w / B, tgtH = new Float32Array(B);
    blips.forEach(b => { const i = Math.floor(bearing(b.ang) / 360 * B) % B; tgtH[i] += 0.18 + Math.exp(-angDiff(a, b.ang) / SPEED / 0.6) * 0.6; });
    const sbi = Math.floor(bearing(a) / 360 * B) % B;
    for (let i = 0; i < B; i++) {
      const t = Math.min(1, tgtH[i] + (i === sbi ? 0.35 : 0) + 0.06 + Math.random() * 0.08 + Math.sin(i * 0.5 + T * 3) * 0.03);
      specH[i] += (t - specH[i]) * 0.18; specPk[i] = Math.max(specH[i], specPk[i] - 0.006);
      const bh = specH[i] * (h - 4);
      sctx.fillStyle = i === sbi ? '#fff' : `rgba(255,255,255,${0.25 + specH[i] * 0.6})`;
      sctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      sctx.fillStyle = 'rgba(255,255,255,.8)'; sctx.fillRect(i * bw + 1, h - specPk[i] * (h - 4) - 2, bw - 2, 1);
    }
  }

  // ---------------------------------------------------------------- frame
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden || !W) return;
    const T = now / 1000, a = (T * SPEED) % TAU - Math.PI / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(stat, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    blips = feed.slice(0, 80).map(place);
    if (hover) hover = blips.find(b => key(b.it) === key(hover.it)) || null;
    // rotating bezels + outer rings
    ctx.save(); ctx.translate(cx, cy); ctx.lineWidth = 1;
    ctx.rotate(T * 0.05); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.setLineDash([2, 9]); ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, TAU); ctx.stroke();
    if (!narrow) { ctx.rotate(-T * 0.13); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.setLineDash([R * 0.3, R * 0.12, 4, R * 0.12]); ctx.beginPath(); ctx.arc(0, 0, R + 60, 0, TAU); ctx.stroke(); }
    ctx.restore(); ctx.setLineDash([]);
    textRing(T);
    waveRing(a, T);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    sonar(T);
    sweep(a, T);
    if (Math.random() < 0.9) for (let i = 0; i < 4; i++) { const r = R * (0.08 + Math.random() * 0.9), aa = a - Math.random() * 0.08; clutter.push({ x: cx + Math.cos(aa) * r, y: cy + Math.sin(aa) * r, t: T }); }
    clutter = clutter.filter(p => T - p.t < 1.8);
    clutter.forEach(p => { ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - (T - p.t) / 1.8)})`; ctx.fillRect(p.x, p.y, 1.2, 1.2); });
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    blips.forEach(b => blip(b, a, T));
    shock(T);
    // lock target: live scans hold the lock, replays rotate every 4.5 s
    const tb = tgt && blips.find(b => key(b.it) === tgt);
    const live = feed.find(x => x.status === 'scanning' && !x.band);
    const need = !tb || (live && key(live) !== tgt) || (mode === 'live' && tb.it.band) || (mode !== 'live' && now - tgtT > 4500);
    if (need && (tgt || now - tgtT > 1000)) setTarget(pickTarget());        // idle: re-check once a second, not every frame
    const tb2 = tgt && blips.find(b => key(b.it) === tgt);
    if (tb2) reticle(tb2, T); else lock.classList.remove('on');
    hub(T);
    scope2(a, T);
    hexTick(now);
    if (empty.textContent) { empty.style.left = cx + 'px'; empty.style.top = (cy + R * 0.3) + 'px'; }
    if (now - lastClock > 1000) { lastClock = now; K('clock').textContent = new Date().toISOString().slice(11, 19) + ' UTC'; }
  }

  // ---------------------------------------------------------------- interaction
  cv.addEventListener('pointermove', e => {
    const bb = cv.getBoundingClientRect(), x = e.clientX - bb.left, y = e.clientY - bb.top, d = Math.hypot(x - cx, y - cy);
    if (d <= R) {
      const ang = Math.atan2(y - cy, x - cx), f = (0.96 - d / R) / 0.84;
      const age = f <= 0 ? 0 : 20 * (Math.pow(1 + MAXAGE / 20, Math.min(1, f)) - 1);
      K('brg').textContent = bearing(ang).toFixed(1).padStart(5, '0') + '°'; K('rng').textContent = ago(Date.now() / 1000 - age);
    }
    let h = null, best = 14;
    blips.forEach(b => { const dd = Math.hypot(x - b.x, y - b.y); if (dd < best) { best = dd; h = b; } });
    if ((h && h.it) !== (hover && hover.it)) { hover = h; opts.onHover && opts.onHover(h ? h.it : null); cv.style.cursor = h ? 'pointer' : ''; }
    if (h) { const it = h.it;
      tip.innerHTML = `<b>${esc(sym(it))}</b> <span class="b" style="background:${color(it)}">${esc(state(it))}</span><br>${it.headline ? esc(it.headline) + '<br>' : ''}<span class="dim">${esc(it.chain)} · liq ${usd(it.liquidity_usd)} · ${ago(it.created_ts || it.seen_ts)} old · click to open</span>`;
      tip.style.display = 'block'; tip.style.left = Math.min(x + 14, W - 260) + 'px'; tip.style.top = Math.min(y + 14, H - 90) + 'px'; }
    else tip.style.display = 'none';
  });
  cv.addEventListener('pointerleave', () => { hover = null; tip.style.display = 'none'; opts.onHover && opts.onHover(null); K('brg').textContent = '---.-°'; K('rng').textContent = '---'; });
  cv.addEventListener('click', () => { if (hover && opts.onOpen) opts.onOpen(hover.it); });

  const onResize = () => layout();
  addEventListener('resize', onResize);
  setSectors(); layout(); hud();
  raf = requestAnimationFrame(frame);
  return {
    update(f, en) {
      feed = Array.isArray(f) ? f : []; if (en !== undefined) enabled = en;
      const T = performance.now() / 1000;
      if (prevBand) feed.forEach(x => { const k = key(x); if (x.band && prevBand.has(k) && !prevBand.get(k)) { shocks.push({ k, t: T }); pushHex(`!! VERDICT ${sym(x)} ${state(x)}`, 'hi'); } });
      prevBand = new Map(feed.map(x => [key(x), x.band || '']));
      if (setSectors()) drawStatic();
      hud();
      if (tgt) { const it = feed.find(x => key(x) === tgt); if (it) { K('lvd').textContent = state(it); lock.style.setProperty('--vc', color(it)); lock.classList.toggle('danger', it.band === 'DANGER'); } }
    },
    stop() { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', onResize); },
    get mode() { return mode; },
  };
};
})();
