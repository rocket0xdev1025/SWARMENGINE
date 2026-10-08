/* SWARM decision torus: ~1400 glossy spheres on a morphing, rotating torus + a terminal HUD, in Canvas 2D.
   Every sphere is a decision slot: it lights up (silver / white-hot) when an agent decides, dims back to graphite after.
   window.DecisionTorus(canvas, {demo, title, chain}) -> controller { push(event), stop() } */
(() => {
'use strict';
const TAU = Math.PI * 2;
const HUES = 36;                         // rainbow sprite buckets
const SPR = 48;                          // sprite px

function sphereSprite(fill, rim, glow) {
  const c = document.createElement('canvas'); c.width = c.height = SPR;
  const g = c.getContext('2d'), r = SPR / 2;
  const grad = g.createRadialGradient(r * 0.62, r * 0.55, r * 0.06, r, r, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.16, glow);
  grad.addColorStop(0.55, fill);
  grad.addColorStop(1, rim);
  g.fillStyle = grad; g.beginPath(); g.arc(r, r, r - 0.5, 0, TAU); g.fill();
  g.globalAlpha = 0.35; g.fillStyle = '#ffffff';                 // specular dot
  g.beginPath(); g.ellipse(r * 0.62, r * 0.48, r * 0.22, r * 0.14, -0.6, 0, TAU); g.fill();
  return c;
}
function haloSprite(color) {
  const c = document.createElement('canvas'); c.width = c.height = SPR * 2;
  const g = c.getContext('2d'), r = SPR;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, color); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, SPR * 2, SPR * 2);
  return c;
}
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
let SPRITES = null;
function sprites() {
  if (SPRITES) return SPRITES;
  const lit = [], halo = [];
  for (let i = 0; i < HUES; i++) {        // monochrome: a band of silver tones instead of a rainbow
    const l = 62 + 26 * Math.sin(i / HUES * TAU) ** 2;
    lit.push(sphereSprite(hsl(0, 0, l), hsl(0, 0, 10), hsl(0, 0, 96)));
    halo.push(haloSprite(hsl(0, 0, 100, 0.45)));
  }
  const dark = [sphereSprite('#2a2a2a', '#050505', '#6a6a6a'), sphereSprite('#222', '#030303', '#5a5a5a'),
                sphereSprite('#333', '#070707', '#7a7a7a')];
  const red = sphereSprite('#ffffff', '#3a3a3a', '#ffffff'), amber = sphereSprite('#b8b8b8', '#1a1a1a', '#eeeeee');
  SPRITES = { lit, halo, dark, red, amber, redHalo: haloSprite('rgba(255,255,255,0.8)'), amberHalo: haloSprite('rgba(200,200,200,0.45)') };
  return SPRITES;
}

window.DecisionTorus = function (cv, opts = {}) {
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, raf = 0, alive = true, t = 0;
  const S = sprites();
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const NU = small ? 54 : 72, NV = small ? 16 : 20, N = NU * NV;
  const P = new Float32Array(N * 3), L = new Float32Array(N), K = new Uint8Array(N);   // lit level, kind (0 rainbow 1 red 2 amber)
  const order = new Uint16Array(N); for (let i = 0; i < N; i++) order[i] = i;
  const depth = new Float32Array(N), sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N);
  const hud = {
    title: opts.title || 'SWARM ENGINE // judge-1', chain: opts.chain || '', stage: opts.demo ? 'patrol' : 'resolving',
    decisions: 0, escalated: 0, lat: [], conf: [], rate: [], wave: new Float32Array(160), last: null, lines: [],
    chips: [['SCOUT', '#ffffff'], ['TRACER', '#ffffff'], ['LINKER', '#ffffff'], ['AUDITOR', '#ffffff'], ['JUDGE', '#ffffff']],
    active: {},
  };
  const size = () => { const b = cv.getBoundingClientRect(); W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size();

  // ---------- geometry ----------
  function shape(time) {
    const morph = 0.5 + 0.5 * Math.sin(time * 0.00021);        // torus <-> bowl
    const R = 1.0, r = 0.30 + 0.16 * (1 - morph), twist = Math.sin(time * 0.00013) * 0.9;
    let k = 0;
    for (let i = 0; i < NU; i++) {
      const u = i / NU * TAU;
      for (let j = 0; j < NV; j++, k++) {
        const v = j / NV * TAU + twist * Math.sin(u);
        const rr = R + r * Math.cos(v);
        let x = rr * Math.cos(u), y = r * Math.sin(v), z = rr * Math.sin(u);
        y += morph * 0.55 * (x * x + z * z - 0.9);              // bowl: lift the rim
        P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z;
      }
    }
  }
  function project(time) {
    const ay = time * 0.00032, ax = 1.02 + 0.22 * Math.sin(time * 0.00017), az = 0.18 * Math.sin(time * 0.00011);
    const cy = Math.cos(ay), sy_ = Math.sin(ay), cx = Math.cos(ax), sx_ = Math.sin(ax), cz = Math.cos(az), sz_ = Math.sin(az);
    const zoom = 1 + 0.12 * Math.sin(time * 0.00019);
    const scale = Math.min(W * 0.27, H * 0.31) * zoom;
    const ox = W * (opts.offsetX ?? 0.5), oy = H * (opts.offsetY ?? 0.5);
    for (let k = 0; k < N; k++) {
      let x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2];
      let x1 = x * cy + z * sy_, z1 = -x * sy_ + z * cy;                 // spin (Y)
      let y1 = y * cx - z1 * sx_, z2 = y * sx_ + z1 * cx;                // tilt (X)
      let x2 = x1 * cz - y1 * sz_, y2 = x1 * sz_ + y1 * cz;              // roll (Z)
      const f = 3.4 / (z2 + 4.2);
      sx[k] = ox + x2 * scale * f; sy[k] = oy + y2 * scale * f; sz[k] = f; depth[k] = z2;
    }
    order.sort((a, b) => depth[b] - depth[a]);
  }

  // ---------- lighting ----------
  function light(start, count, kind = 0, level = 1) {
    for (let n = 0; n < count; n++) {
      const k = (start + n * 7) % N;
      L[k] = Math.max(L[k], level * (0.7 + Math.random() * 0.3)); K[k] = kind;
    }
  }
  function ring(i0, kind = 0) { const i = ((i0 % NU) + NU) % NU; for (let j = 0; j < NV; j++) { const k = i * NV + j; L[k] = 1; K[k] = kind; } }
  let sweep = 0;

  // ---------- drawing ----------
  function drawSpheres(time) {
    const base = Math.min(W, H) * (small ? 0.032 : 0.028);
    const hueShift = (time * 0.02) % 360;
    for (let n = 0; n < N; n++) {
      const k = order[n], f = sz[k], d = base * f * 1.15;
      const lit = L[k];
      const fade = 0.35 + 0.65 * Math.min(1, Math.max(0, (depth[k] + 1.6) / 3));
      ctx.globalAlpha = fade;
      if (lit > 0.08) {
        let spr, halo;
        if (K[k] === 1) { spr = S.red; halo = S.redHalo; } else if (K[k] === 2) { spr = S.amber; halo = S.amberHalo; }
        else { const hb = Math.floor((((k / NV) / NU * 360 + hueShift + (k % NV) * 3) % 360) / 360 * HUES) % HUES; spr = S.lit[hb]; halo = S.halo[hb]; }
        if (lit > 0.45 && f > 0.75) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = lit * 0.32 * fade; ctx.drawImage(halo, sx[k] - d * 1.4, sy[k] - d * 1.4, d * 2.8, d * 2.8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade; }
        ctx.drawImage(spr, sx[k] - d / 2, sy[k] - d / 2, d, d);
        if (lit < 0.6) { ctx.globalAlpha = (0.6 - lit) * fade; ctx.drawImage(S.dark[k % 3], sx[k] - d / 2, sy[k] - d / 2, d, d); }
      } else {
        ctx.drawImage(S.dark[k % 3], sx[k] - d / 2, sy[k] - d / 2, d, d);
      }
      L[k] *= 0.992;
    }
    ctx.globalAlpha = 1;
  }
  const mono = (sz, w = 500) => `${w} ${sz}px JetBrains Mono, ui-monospace, monospace`;
  function spark(x, y, w, h, arr, color, max) {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.strokeRect(x, y, w, h);
    if (arr.length < 2) return;
    const m = max || Math.max(...arr, 1e-9);
    ctx.beginPath();
    arr.forEach((v, i) => { const px = x + i / (arr.length - 1) * w, py = y + h - (v / m) * (h - 4) - 2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
  }
  function drawHud(time) {
    const pad = 12, s = W < 520 ? 0.82 : 1;
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // top bar
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, 26 * s);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(0, 26 * s); ctx.lineTo(W, 26 * s); ctx.stroke();
    ctx.font = mono(10 * s, 700); ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
    ctx.fillText('▌' + hud.title + (hud.chain ? ' · ' + hud.chain : ''), pad, 13 * s);
    let cx = pad + ctx.measureText('▌' + hud.title + (hud.chain ? ' · ' + hud.chain : '')).width + 12;
    ctx.font = mono(9 * s, 700);
    for (const [name, col] of hud.chips) {
      const w = ctx.measureText(name).width + 12;
      if (cx + w > W - 150) break;
      const on = hud.active[name] && time - hud.active[name] < 1600;
      ctx.fillStyle = on ? col : 'rgba(255,255,255,0.06)'; ctx.fillRect(cx, 6 * s, w, 14 * s);
      ctx.fillStyle = on ? '#05070c' : col; ctx.fillText(name, cx + 6, 13 * s); cx += w + 6;
    }
    ctx.textAlign = 'right'; ctx.font = mono(9.5 * s); ctx.fillStyle = '#8c8c8c';
    const p50 = hud.lat.length ? [...hud.lat].sort((a, b) => a - b)[Math.floor(hud.lat.length / 2)] : 0;
    ctx.fillText(`decisions ${hud.decisions.toLocaleString()} · p50 ${p50.toFixed(2)}ms · cost $0.00`, W - pad, 13 * s);
    // callouts
    const box = (x, y, lines, col) => {
      ctx.font = mono(9.5 * s); const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16, h = lines.length * 14 * s + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = col; ctx.strokeRect(x, y, w, h);
      ctx.textAlign = 'left'; lines.forEach((l, i) => { ctx.fillStyle = i ? '#d6d6d6' : col; ctx.fillText(l, x + 8, y + 12 + i * 14 * s); });
      ctx.beginPath(); ctx.moveTo(x + w, y + h / 2); ctx.lineTo(x + w + 26, y + h / 2 + 18); ctx.strokeStyle = col + '88'; ctx.stroke();
    };
    const last = hud.last;
    box(pad + 6, 44 * s, last ? [`judge.decision  ${last.decision}`, `confidence ${last.confidence.toFixed(3)}  bar ${last.bar ?? '—'}`, `route  ${last.escalate ? 'ESCALATE → LLM' : 'ACT'}`, `${last.receipt || ''}`]
      : [`stage  ${hud.stage}`, 'avoid_bar 0.70 · ok_bar 0.90', 'route  triage → act | escalate'], last ? '#ffffff' : '#ffffff');
    if (H > 300 && hud.lines.length) box(pad + 6, H - 120 * s, hud.lines.slice(-3), '#bbbbbb');
    // right panels
    if (W > 520) {
      const x = W - 150 - pad, w = 150;
      ctx.font = mono(9); ctx.textAlign = 'left'; ctx.fillStyle = '#8c8c8c';
      ctx.fillText('decisions / s', x, 44); spark(x, 50, w, 34, hud.rate, '#ffffff');
      ctx.fillStyle = '#8c8c8c'; ctx.fillText('confidence', x, 100); spark(x, 106, w, 34, hud.conf, '#ffffff', 1);
      ctx.fillStyle = '#8c8c8c'; ctx.fillText('latency ms', x, 156); spark(x, 162, w, 34, hud.lat, '#bbbbbb');
    }
    // bottom waveform
    const by = H - 34 * s, bh = 26 * s;
    ctx.fillStyle = 'rgba(5,7,12,0.7)'; ctx.fillRect(0, by - 4, W, bh + 8);
    const n = hud.wave.length;
    for (let band = 0; band < 3; band++) {
      ctx.beginPath(); ctx.moveTo(0, by + bh);
      for (let i = 0; i < n; i++) { const v = hud.wave[(i + Math.floor(time / 40)) % n] * (1 - band * 0.25); ctx.lineTo(i / (n - 1) * W, by + bh - v * bh * (0.5 + 0.5 * Math.sin(i * 0.3 + band + time * 0.002) ** 2)); }
      ctx.lineTo(W, by + bh); ctx.closePath();
      ctx.fillStyle = ['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.10)'][band]; ctx.fill();
    }
    ctx.font = mono(8.5 * s); ctx.fillStyle = '#5a5a5a'; ctx.textAlign = 'left';
    ctx.fillText(`LLMs think · SWARM decides · code does   escalated ${hud.escalated}`, pad, by - 10);
  }
  let lastTick = performance.now(), rateAcc = 0;
  function frame(now) {
    if (!alive) return;
    t = now;
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
    bg.addColorStop(0, '#111111'); bg.addColorStop(1, '#000000'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    shape(now); project(now);
    if (opts.demo) demo(now);
    sweep += 0.35; if (Math.floor(sweep) % 3 === 0) ring(Math.floor(sweep / 3), 0);
    drawSpheres(now);
    if (!opts.noHud) drawHud(now);
    if (now - lastTick > 1000) { hud.rate.push(rateAcc); if (hud.rate.length > 40) hud.rate.shift(); rateAcc = 0; lastTick = now;
      for (let i = 0; i < hud.wave.length; i++) hud.wave[i] = Math.max(0.05, hud.wave[i] * 0.92); }
    raf = requestAnimationFrame(frame);
  }
  function tick(conf, lat, name) {
    hud.decisions++; rateAcc++;
    hud.conf.push(conf); if (hud.conf.length > 40) hud.conf.shift();
    hud.lat.push(lat); if (hud.lat.length > 40) hud.lat.shift();
    if (name) hud.active[name] = t;
    const i = Math.floor(Math.random() * hud.wave.length); for (let k = -6; k <= 6; k++) hud.wave[(i + k + hud.wave.length) % hud.wave.length] = Math.min(1, hud.wave[(i + k + hud.wave.length) % hud.wave.length] + 0.5 * (1 - Math.abs(k) / 7));
  }
  // idle demo: a stream of triage decisions
  let dn = 0;
  function demo(now) {
    if (now < dn) return;
    dn = now + 90 + Math.random() * 120;
    const r = Math.random(), kind = r < 0.12 ? 1 : r < 0.25 ? 2 : 0;
    light(Math.floor(Math.random() * N), 26 + Math.floor(Math.random() * 40), kind);
    const conf = kind === 0 ? 0.88 + Math.random() * 0.11 : 0.55 + Math.random() * 0.4;
    tick(conf, 0.2 + Math.random() * 0.5, ['SCOUT', 'TRACER', 'LINKER', 'AUDITOR', 'JUDGE'][Math.floor(Math.random() * 5)]);
    if (conf < 0.7) hud.escalated++;
  }

  // ---------- scan events ----------
  let slot = 0;
  function push(e) {
    const take = (n, kind = 0, name) => { light(slot, n, kind); slot = (slot + n * 3) % N; tick(0.6 + Math.random() * 0.4, 0.1 + Math.random() * 0.4, name); };
    switch (e.type) {
      case 'stage': hud.stage = e.detail; hud.lines.push(`▸ ${e.detail}`);
        take(30, 0, { token: 'SCOUT', holders: 'SCOUT', wallets: 'TRACER', funders: 'TRACER', security: 'AUDITOR', analysis: 'LINKER' }[e.detail]); break;
      case 'holders': take(Math.min(220, 9 * (e.wallets || []).length), 0, 'SCOUT'); hud.lines.push(`SCOUT  ${(e.wallets || []).length} wallets in range`); break;
      case 'wallet': take(36, (e.detail || '').includes('fresh') ? 2 : 0, 'TRACER'); break;
      case 'link': take(48, e.level === 'pack' ? 2 : 0, 'LINKER'); hud.lines.push(`LINKER ${e.detail}`); break;
      case 'cluster': take(90, 1, 'LINKER'); hud.lines.push(`LINKER ${e.detail}`); break;
      case 'memory': take(60, 1, 'LINKER'); break;
      case 'judge': {
        hud.last = { decision: e.decision, confidence: e.confidence || 0, escalate: !!e.escalate, receipt: e.receipt, bar: { AVOID: 0.7, CAUTION: 0.6, OK: 0.9 }[e.decision] };
        if (e.escalate) hud.escalated++;
        tick(e.confidence || 0, e.latency_ms || 0.3, 'JUDGE');
        const kind = e.decision === 'AVOID' ? 1 : e.decision === 'CAUTION' ? 2 : 0;
        for (let k = 0; k < N; k++) { L[k] = 0.95; K[k] = kind; }
        hud.lines.push(`JUDGE  ${e.decision} ${(e.confidence * 100).toFixed(0)}%`);
        break;
      }
    }
    if (hud.lines.length > 12) hud.lines.splice(0, hud.lines.length - 12);
  }
  const onResize = () => size();
  window.addEventListener('resize', onResize);
  raf = requestAnimationFrame(frame);
  return { push, stop() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); }, hud };
};
})();
