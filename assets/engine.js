/* SWARM DECISION ENGINE: black & white live dashboard.
   A node graph (sources -> gate -> SWARM hub -> agents -> checks -> judge -> you) wired with glowing fibre
   bundles. It replays the server's REAL recent scans (/api/agent/feed): every packet is a scanned token, the
   judge shows its real decision and confidence. Panels below are computed from real data.
   window.SwarmEngine(root, {search}) -> { stop() } */
(() => {
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const hhmm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const hhmmss = d => hhmm(d) + ':' + pad(d.getSeconds());
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];
const fmt = n => (n ?? 0).toLocaleString('en-US');
const sym = x => (x.symbol || (x.name || '').split(' / ')[0] || (x.token || '').slice(0, 6) || '?').slice(0, 10);

// node: id, title, tag, rows [[label, key]], desktop [x,y] (design 1100x700), mobile [x,y] (design 360x1080), kind
const W = 220, MW = 165;
const NODES = [
  ['gecko', 'geckoterminal', 'CODE', [['today', 'n'], ['lag', 'lag']], [20, 10], [0, 0]],
  ['dex', 'dexscreener', 'CODE', [['today', 'n'], ['lag', 'lag']], [300, 10], [195, 0]],
  ['rpc', 'chain rpc', 'CODE', [['logs', 'n'], ['lag', 'lag']], [580, 10], [0, 92]],
  ['you', 'you · paste', 'USER', [['today', 'n'], ['last', 'last']], [860, 10], [195, 92]],
  ['skip', 'skipped', 'LOG', [['today', 'n'], ['rate', 'rate']], [20, 120], [0, 196]],
  ['gate', 'new launch?', 'GATE', [['p', 'p'], ['verdict', 'v']], [440, 120], [195, 196]],
  ['scout', 'scout · holders', 'AGENT', [['reading', 'r'], ['holders', 'n']], [40, 215], [0, 470]],
  ['linker', 'linker · swarms', 'AGENT', [['swarms', 'n'], ['biggest', 'b']], [840, 215], [195, 470]],
  ['tracer', 'tracer · funders', 'AGENT', [['wallets', 'n'], ['hands', 'h']], [40, 320], [0, 562]],
  ['auditor', 'auditor · contract', 'AGENT', [['checks', 'n'], ['flags', 'f']], [840, 320], [195, 562]],
  ['funder', 'shared funder?', 'LINK', [['p', 'p'], ['verdict', 'v']], [200, 420], [0, 666]],
  ['honey', 'contract trap?', 'SIM', [['p', 'p'], ['verdict', 'v']], [680, 420], [195, 666]],
  ['drop', 'dropped', 'LOG', [['today', 'n'], ['why', 'why']], [20, 520], [0, 768]],
  ['mem', 'swarm memory', 'DISK', [['wallets', 'n'], ['cost', 'c']], [440, 520], [97, 862]],
  ['llm', 'frontier llm', 'LLM', [['escalated', 'n'], ['takes', 't']], [860, 520], [195, 768]],
  ['cabal', 'cabal board', 'DISK', [['today', 'n'], ['kept', 'k']], [20, 620], [0, 1054]],
  ['judge', 'judge', 'CHOICE', [['verdict', 'v'], ['conf', 'c']], [440, 620], [97, 958]],
  ['feed', 'your feed', 'LIVE', [['queued', 'q'], ['sent', 's']], [860, 620], [195, 1054]],
];
const HUB = { d: [550, 300, 180], m: [180, 375, 150] };
const EDGES = [['gecko', 'gate'], ['dex', 'gate'], ['rpc', 'gate'], ['you', 'hub'], ['gate', 'skip'], ['gate', 'hub'],
  ['hub', 'scout'], ['hub', 'tracer'], ['hub', 'linker'], ['hub', 'auditor'],
  ['scout', 'funder'], ['tracer', 'funder'], ['linker', 'funder'], ['linker', 'honey'], ['auditor', 'honey'],
  ['funder', 'drop'], ['funder', 'mem'], ['honey', 'mem'], ['honey', 'llm'],
  ['mem', 'judge'], ['judge', 'cabal'], ['judge', 'feed'], ['llm', 'feed']];
const STEPS = ['SOURCES', 'GATE', 'SCOUT', 'TRACE', 'LINK', 'AUDIT', 'JUDGE', 'YOU'];

function demoItems() {    // only used when the server has no scans yet; labelled "demo" on screen
  const D = ['ANISOM', 'IPAID', 'OFFROUTER', 'ROBINDOG', 'HOODIE', 'TENDIE', 'RUGME', 'STONK'];
  return D.map((s, i) => {
    const dec = ['OK', 'OK', 'OK', 'CAUTION', 'AVOID', 'CAUTION', 'AVOID', 'OK'][i], conf = [0.93, 0.91, 0.95, 0.66, 0.84, 0.55, 0.9, 0.92][i];
    return { symbol: s, token: '0x' + i, chain: 'robinhood', band: { OK: 'CLEAN', CAUTION: 'RISKY', AVOID: 'DANGER' }[dec], score: [88, 81, 93, 52, 21, 47, 14, 85][i],
      holders: 40, hands: [31, 34, 36, 22, 9, 18, 7, 33][i], swarms: dec === 'OK' ? [] : [{ size: 4 + i, share_of_float: 0.12 + i * 0.03 }],
      contract_flags: dec === 'AVOID' ? [{ level: 'danger', title: 'owner can mint' }] : [],
      judge: { decision: dec, confidence: conf, escalate: conf < (dec === 'OK' ? 0.9 : dec === 'AVOID' ? 0.7 : 0.6), latency_ms: 3 + i } };
  });
}

window.SwarmEngine = function (root, opts = {}) {
  const mob = () => root.clientWidth < 760;
  root.classList.add('eng');
  root.innerHTML = `
  <div class="eng-top">
    <div class="eng-title"><h1>SWARM DECISION ENGINE <em>// 24/7</em></h1>
      <p>a token desk that never sleeps <i>·</i> the judge decides every launch <i>·</i> <span class="tba-wrap">the LLM only reads the unsure<span class="tba">TBA</span></span></p></div>
    <div class="eng-kpis">
      <div><span>clock</span><b data-k="clock">--:--</b></div>
      <div><span>decisions</span><b data-k="dec">0</b></div>
      <div><span>avoid</span><b data-k="avoid">0</b></div>
      <div><span>escalated</span><b data-k="esc">0</b></div>
      <div><span>spend</span><b data-k="spend">$0.000</b></div>
      <div class="eng-live"><i></i>LIVE</div>
    </div>
  </div>
  <div class="eng-search">${opts.search || ''}</div>
  <div class="eng-steps"><div>${STEPS.map((s, i) => `<span data-s="${i}">${s}</span>`).join('<b>›</b>')}</div><em data-k="mode">replay · real scans</em></div>
  <div class="eng-stage"><canvas class="eng-cv"></canvas>
    ${NODES.map(([id, title, tag, rows]) => `<div class="en" data-n="${id}" data-tag="${tag}"><div class="en-h"><span>${esc(title)}</span><b>${tag}</b></div>
      ${rows.map(([l, k]) => `<div class="en-r"><span>${esc(l)}</span><b data-f="${k}">—</b></div>`).join('')}</div>`).join('')}
    <div class="en-hub" data-n="hub"><svg viewBox="0 0 100 100"><circle class="hb0" cx="50" cy="50" r="47"/><circle class="hb1" cx="50" cy="50" r="40"/>
      <circle class="hb2" cx="50" cy="50" r="40" pathLength="100"/><circle class="hb3" cx="50" cy="50" r="34"/></svg>
      <div class="hub-in"><b>SWARM</b><span data-f="q">which hand?</span><em data-f="c">JUDGE · conf —</em></div></div>
  </div>
  <div class="eng-panels">
    <div class="ep ep-log"><h4>// run log <b data-k="clock2"></b></h4><div class="log"></div></div>
    <div class="ep"><h4>// scans / hour <b>12H</b></h4><div class="bars"></div></div>
    <div class="ep"><h4>// gate ≥ bar <b>LIVE</b></h4><div class="donut"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" class="d0"/><circle cx="50" cy="50" r="38" class="d1" pathLength="100"/></svg><div><b data-k="pass">—</b><span>acted</span></div></div>
      <canvas class="wave"></canvas><div class="kv"><span>escalated</span><b data-k="esc2">0</b></div><div class="kv"><span>dropped</span><b data-k="drop2">0</b></div></div>
    <div class="ep"><h4>// swarm heat <b data-k="heatn"></b></h4><div class="heat"></div>
      <div class="legend"><span><i class="h4"></i>danger</span><span><i class="h3"></i>risky</span><span><i class="h2"></i>ok</span><span><i class="h1"></i>clean</span></div><p class="note">last 64 scans, newest lit</p></div>
    <div class="ep"><h4>// spend today <b data-k="decs">0 DEC</b></h4><div class="big">$0.000</div><p class="sub">free APIs · local judge<br><b>output · free</b></p><canvas class="spark"></canvas>
      <div class="kv"><span>judge only</span><b>$0.000</b></div><div class="kv"><span>median</span><b data-k="lat">— ms</b></div><div class="kv"><span>10k decisions</span><b>≈ $0.00</b></div></div>
    <div class="ep"><h4>// ledger <b>LIVE</b></h4>
      <div class="kv"><span>screened</span><b data-k="l_scr">0</b></div><div class="kv"><span>clean</span><b data-k="l_clean">0</b></div>
      <div class="kv"><span>risky</span><b data-k="l_risky">0</b></div><div class="kv"><span>danger</span><b data-k="l_danger">0</b></div>
      <div class="kv"><span>cabals</span><b data-k="l_cabal">0</b></div><div class="kv"><span>sent to you</span><b data-k="l_sent">0</b></div>
      <div class="ok-list">${['scout', 'tracers', 'linker', 'auditor', 'judge'].map(a => `<div><span data-a="${a}">[ OK ]</span><b>${a}</b></div>`).join('')}</div></div>
  </div>
  <div class="eng-foot"><span data-k="foot">replay · real scans from this server, animated</span><span>SWARM · free · read-only</span></div>`;

  const $ = s => root.querySelector(s), $$ = s => root.querySelectorAll(s);
  const stage = $('.eng-stage'), cv = $('.eng-cv'), ctx = cv.getContext('2d');
  const nodeEl = {}; $$('[data-n]').forEach(e => { nodeEl[e.dataset.n] = e; });
  const setF = (n, k, v) => { const e = nodeEl[n].querySelector(`[data-f="${k}"]`); if (e) e.textContent = v; };
  const setK = (k, v) => $$(`[data-k="${k}"]`).forEach(e => { e.textContent = v; });
  let alive = true; const timers = new Set();
  const later = (ms, f) => { const id = setTimeout(() => { timers.delete(id); if (alive) f(); }, ms); timers.add(id); };

  // ---------------------------------------------------------------- layout
  let geo = {}, Wd = 0, Hd = 0, dpr = 1;
  function layout() {
    const m = mob(), dw = m ? 360 : 1100, dh = m ? 1135 : 700;
    stage.style.aspectRatio = `${dw} / ${dh}`;
    stage.classList.toggle('m', m);
    NODES.forEach(([id, , , , dpos, mpos]) => {
      const [x, y] = m ? mpos : dpos, e = nodeEl[id];
      e.style.left = (x / dw * 100) + '%'; e.style.top = (y / dh * 100) + '%'; e.style.width = ((m ? MW : W) / dw * 100) + '%';
    });
    const [hx, hy, hd] = m ? HUB.m : HUB.d, hub = nodeEl.hub;
    hub.style.left = ((hx - hd / 2) / dw * 100) + '%'; hub.style.top = ((hy - hd / 2) / dh * 100) + '%'; hub.style.width = (hd / dw * 100) + '%';
    requestAnimationFrame(measure);
  }
  function measure() {
    const r = stage.getBoundingClientRect(); Wd = r.width; Hd = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Wd * dpr; cv.height = Hd * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    geo = {};
    for (const id in nodeEl) { const b = nodeEl[id].getBoundingClientRect(); geo[id] = { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height, cx: b.left - r.left + b.width / 2, cy: b.top - r.top + b.height / 2 }; }
    edges.forEach(e => e.path = route(geo[e.a], geo[e.b], e.a === 'hub' || e.b === 'hub'));
    scv.width = Wd * dpr; scv.height = Hd * dpr; sctx.setTransform(dpr, 0, 0, dpr, 0, 0); crew = [];   // respawn at the new size
  }
  // bezier between two boxes, anchored on the facing sides
  function route(A, B, round) {
    const dx = B.cx - A.cx, dy = B.cy - A.cy;
    let p0, p3, d0, d3;
    if (Math.abs(dy) > Math.abs(dx) * 0.45 && Math.abs(dy) > (A.h + B.h) / 2) {
      const s = Math.sign(dy);
      p0 = [A.cx + Math.max(-A.w * 0.3, Math.min(A.w * 0.3, dx * 0.25)), s > 0 ? A.y + A.h : A.y]; p3 = [B.cx - Math.max(-B.w * 0.3, Math.min(B.w * 0.3, dx * 0.25)), s > 0 ? B.y : B.y + B.h];
      d0 = [0, s]; d3 = [0, -s];
    } else {
      const s = Math.sign(dx) || 1;
      p0 = [s > 0 ? A.x + A.w : A.x, A.cy]; p3 = [s > 0 ? B.x : B.x + B.w, B.cy]; d0 = [s, 0]; d3 = [-s, 0];
    }
    if (round) {     // the hub is a circle: anchor on its rim towards the other box
      const H = A.w === A.h && A === geo.hub ? A : B === geo.hub ? B : null;
      if (H) { const O = H === A ? B : A, ang = Math.atan2(O.cy - H.cy, O.cx - H.cx), pr = [H.cx + Math.cos(ang) * H.w * 0.5, H.cy + Math.sin(ang) * H.w * 0.5];
        if (H === A) { p0 = pr; d0 = [Math.cos(ang), Math.sin(ang)]; } else { p3 = pr; d3 = [Math.cos(ang), Math.sin(ang)]; } }
    }
    const L = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) * 0.45;
    const p1 = [p0[0] + d0[0] * L, p0[1] + d0[1] * L], p2 = [p3[0] + d3[0] * L, p3[1] + d3[1] * L];
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, u = 1 - t;
      pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    // normals for the fibre spread
    const nrm = pts.map((p, i) => { const q = pts[Math.min(40, i + 1)], o = pts[Math.max(0, i - 1)], dx2 = q[0] - o[0], dy2 = q[1] - o[1], l = Math.hypot(dx2, dy2) || 1; return [-dy2 / l, dx2 / l]; });
    return { pts, nrm };
  }
  const at = (path, t) => { const f = Math.max(0, Math.min(40, t * 40)), i = Math.min(39, f | 0), k = f - i, a = path.pts[i], b = path.pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; };

  const edges = EDGES.map(([a, b], i) => ({ a, b, seed: i * 1.7, heat: 0, path: null }));
  const edgeOf = (a, b) => edges.find(e => e.a === a && e.b === b);
  const parts = [];
  function send(a, b, n = 4, spread = 140) {
    const e = edgeOf(a, b); if (!e) return;
    e.heat = 1; dispatch(a, b);
    for (let i = 0; i < n; i++) later(i * spread * Math.random(), () => parts.push({ e, t: 0, v: rnd(0.9, 1.4), s: rnd(0.6, 1.2), k: rnd(-1, 1) }));
    later(700, () => hit(b));
  }
  // ---------------------------------------------------------------- spider crew: agents + worker drones walk the fibres
  // Every packet sent along an edge is carried by a spider (dragline behind it, packet on its back); it weaves at
  // the node it reaches, then grabs the next fibre to patrol. Nobody stands still for long.
  const scv = document.createElement('canvas'); scv.className = 'eng-sp'; stage.appendChild(scv);
  const sctx = scv.getContext('2d');
  const SP = window.SwarmSpider, SPEC = (window.SwarmStage && window.SwarmStage.AGENTS) || [];
  const ROLE = { scout: ['hub>scout', 'scout>funder', 'you>hub'], tracer1: ['hub>tracer', 'tracer>funder'],
    tracer2: ['gecko>gate', 'dex>gate', 'rpc>gate', 'gate>hub', 'gate>skip'], tracer3: ['funder>mem', 'funder>drop', 'honey>mem', 'honey>llm', 'llm>feed'],
    linker: ['hub>linker', 'linker>funder', 'linker>honey', 'judge>cabal'], auditor: ['hub>auditor', 'auditor>honey', 'mem>judge', 'judge>feed'] };
  let crew = [], frameN = 0, sparkl = [], webT = 0;
  function spawnCrew() {
    if (!SP || !SPEC.length || !geo.hub || !Wd) return;
    const m = mob(), sc = m ? 0.6 : 0.85, h = geo.hub, nd = m ? 6 : 12;
    const specs = SPEC.map(a => ({ ...a, drone: false }))
      .concat(Array.from({ length: nd }, (_, i) => ({ id: 'drone' + i, name: 'D-' + (0x1a + i * 7).toString(16).toUpperCase(), role: 'worker',
        body: i % 2 ? '#a8a8a8' : '#d0d0d0', leg: i % 3 ? '#8c8c8c' : '#b4b4b4', shape: ['round', 'long', 'hex'][i % 3], drone: true })));
    crew = specs.map((a, i) => { const ang = i / specs.length * 6.2832, r = h.w * (0.6 + (i % 3) * 0.12);
      const s = new SP(a, h.cx + Math.cos(ang) * r, h.cy + Math.sin(ang) * r, a.drone ? sc * 0.62 : sc);
      s.drone = a.drone; s.speed = (a.drone ? 3.6 : 4.2) * s.s + 1.4; s.jobs = []; s.job = null; s.trail = null; s.nap = rnd(0, 0.8); return s; });
  }
  const free = c => !c.job || c.job.patrol;
  function give(s, e, b, carry) {
    if (!e || !e.path) return;
    if (s.job && s.job.patrol) s.job = null;                               // drop the patrol, real work first
    s.jobs.push({ e, b, carry });
  }
  function dispatch(a, b) {
    const e = edgeOf(a, b); if (!crew.length || !e || !e.path) return;
    const k = a + '>' + b, p0 = e.path.pts[0], dist = c => Math.hypot(c.x - p0[0], c.y - p0[1]);
    const named = crew.find(c => (ROLE[c.id] || []).includes(k));
    if (named && named.jobs.length < 2) give(named, e, b, true);
    crew.filter(c => c.drone && free(c) && !c.jobs.length).sort((p, q) => dist(p) - dist(q)).slice(0, 2).forEach(d => give(d, e, b, true));
  }
  function patrol(s) {                                                     // idle: walk a random fibre near you
    const ok = edges.filter(e => e.path);
    if (!ok.length) return;
    const near = ok.map(e => [e, Math.min(Math.hypot(s.x - e.path.pts[0][0], s.y - e.path.pts[0][1]), Math.hypot(s.x - e.path.pts[40][0], s.y - e.path.pts[40][1]))])
      .sort((p, q) => p[1] - q[1]).slice(0, 5);
    const [e] = near[Math.random() * near.length | 0];
    const fwd = Math.hypot(s.x - e.path.pts[0][0], s.y - e.path.pts[0][1]) < Math.hypot(s.x - e.path.pts[40][0], s.y - e.path.pts[40][1]);
    s.job = { pts: fwd ? e.path.pts : e.path.pts.slice().reverse(), i: 0, node: fwd ? e.b : e.a, work: -1, patrol: true };
  }
  function burst(x, y, n = 8) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(0.4, 2); sparkl.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1 }); } }
  function hubWeb(T) {                                                     // the web the crew keeps spinning round the hub
    const h = geo.hub; if (!h) return;
    const R0 = h.w * 0.56, R1 = h.w * 0.95, spokes = 18, rings = 6;
    sctx.lineWidth = 0.6;
    sctx.strokeStyle = 'rgba(255,255,255,.10)'; sctx.beginPath();
    for (let i = 0; i < spokes; i++) { const a = i / spokes * 6.2832 + 0.08; sctx.moveTo(h.cx + Math.cos(a) * R0, h.cy + Math.sin(a) * R0); sctx.lineTo(h.cx + Math.cos(a) * R1, h.cy + Math.sin(a) * R1); }
    sctx.stroke();
    for (let r = 0; r < rings; r++) {
      const rr = R0 + (R1 - R0) * (r + 0.5) / rings, built = Math.min(1, Math.max(0, webT * 0.12 - r * 0.6));   // rings grow in
      sctx.strokeStyle = `rgba(255,255,255,${0.06 + 0.06 * Math.sin(T * 2 + r)})`; sctx.beginPath();
      for (let i = 0; i <= spokes * built; i++) { const a = i / spokes * 6.2832 + 0.08, sag = rr - 3 * Math.sin((i % 1) * Math.PI);
        const x = h.cx + Math.cos(a) * sag, y = h.cy + Math.sin(a) * sag; i ? sctx.lineTo(x, y) : sctx.moveTo(x, y); }
      sctx.stroke();
    }
  }
  function crewFrame(dt) {
    sctx.clearRect(0, 0, Wd, Hd);
    if (!crew.length) { spawnCrew(); if (!crew.length) return; }
    frameN++; webT += dt; const T = performance.now() / 1000;
    hubWeb(T);
    for (const s of crew) {
      if ((!s.job || s.job.patrol) && s.jobs.length) { const j = s.jobs.shift(); if (j.e.path) s.job = { pts: j.e.path.pts, i: 0, node: j.b, work: -1, carry: j.carry }; s.orbit = null; }
      if (!s.job && (s.nap -= dt) <= 0) patrol(s);
      const j = s.job;
      s.status = j && !j.patrol ? 'busy' : 'idle';
      if (j) {
        s.orbit = null;
        if (j.work < 0) {
          while (j.i < j.pts.length && Math.hypot(s.x - j.pts[j.i][0], s.y - j.pts[j.i][1]) < 10 * s.s + 4) j.i++;
          if (j.i >= j.pts.length) { j.work = j.patrol ? rnd(0.15, 0.5) : rnd(0.5, 0.9); if (!j.patrol) { burst(s.x, s.y, 10); s.count++; hit(j.node); } }
          else { const p = j.pts[Math.min(j.pts.length - 1, j.i + 3)]; s.goTo(p[0], p[1]); }
        } else if ((j.work -= dt) <= 0) {
          if (!j.patrol) s.trail = { x0: j.pts[0][0], y0: j.pts[0][1], x1: s.x, y1: s.y, a: 1 };
          s.job = null; s.nap = s.drone ? rnd(0, 0.3) : rnd(0.1, 0.6);
        } else if (Math.random() < dt * 10) burst(s.x + rnd(-6, 6), s.y + rnd(-6, 6), 2);   // weaving sparks
      }
      s.update(frameN);
    }
    // draglines: live silk while carrying, fading thread after; weave threads to the node while working
    sctx.lineWidth = 0.8;
    for (const s of crew) {
      const j = s.job;
      if (j && !j.patrol && j.i > 0) { const p = j.pts[0]; sctx.strokeStyle = 'rgba(255,255,255,.5)'; sctx.setLineDash([2, 3]);
        sctx.beginPath(); sctx.moveTo(p[0], p[1]); sctx.lineTo(s.x, s.y); sctx.stroke(); sctx.setLineDash([]);
        sctx.fillStyle = '#fff'; sctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3); }
      if (j && j.work >= 0 && !j.patrol && geo[j.node]) { const g = geo[j.node];
        sctx.strokeStyle = 'rgba(255,255,255,.28)'; sctx.beginPath();
        for (const [cx, cy] of [[g.x, g.y], [g.x + g.w, g.y], [g.x + g.w, g.y + g.h], [g.x, g.y + g.h]]) { if (Math.random() < 0.7) { sctx.moveTo(s.x, s.y); sctx.lineTo(cx, cy); } }
        sctx.stroke(); }
      if (s.trail) { const t = s.trail; t.a -= dt * 0.7;
        if (t.a <= 0) s.trail = null; else { sctx.strokeStyle = `rgba(255,255,255,${0.3 * t.a})`; sctx.beginPath(); sctx.moveTo(t.x0, t.y0); sctx.quadraticCurveTo((t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2 + 18 * (1 - t.a), t.x1, t.y1); sctx.stroke(); } }
    }
    for (let i = sparkl.length - 1; i >= 0; i--) { const p = sparkl[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.l -= dt * 1.6;
      if (p.l <= 0) { sparkl.splice(i, 1); continue; } sctx.fillStyle = `rgba(255,255,255,${p.l})`; sctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6); }
    crew.forEach(s => s.draw(sctx));
    sctx.font = `${mob() ? 8 : 9}px "JetBrains Mono", monospace`; sctx.textAlign = 'center';
    for (const s of crew) {
      const j = s.job;
      if (j && j.carry && j.work < 0) {                                     // packet on its back
        const bx = s.x - Math.cos(s.a) * 7 * s.s, by = s.y - Math.sin(s.a) * 7 * s.s, z = s.drone ? 3.5 : 5;
        sctx.save(); sctx.shadowColor = '#fff'; sctx.shadowBlur = 10; sctx.fillStyle = '#fff'; sctx.fillRect(bx - z / 2, by - z / 2, z, z); sctx.restore();
      }
      if (s.drone && !(j && !j.patrol)) continue;                           // drones only label themselves while on a job
      sctx.fillStyle = j && !j.patrol ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.45)';
      sctx.fillText(j && j.work >= 0 && !j.patrol ? s.name + ' ' + '···'.slice(0, 1 + (frameN >> 3) % 3) : s.name, s.x, s.y + 24 * s.s);
    }
    sctx.textAlign = 'start';
  }

  function hit(n) { const e = nodeEl[n]; if (!e) return; e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); }
  function focus(n, on) { nodeEl[n] && nodeEl[n].classList.toggle('on', on); }

  // ---------------------------------------------------------------- canvas loop
  let raf = 0, last = performance.now();
  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const T = now / 1000;
    ctx.clearRect(0, 0, Wd, Hd);
    ctx.globalCompositeOperation = 'lighter';
    for (const e of edges) {
      if (!e.path) continue;
      e.heat = Math.max(0, e.heat - dt * 0.35);
      const strands = 7, spread = 7 + e.heat * 6;
      for (let s = 0; s < strands; s++) {
        const off = (s - (strands - 1) / 2) / ((strands - 1) / 2);
        ctx.beginPath();
        e.path.pts.forEach((p, i) => {
          const t = i / 40, env = Math.sin(Math.PI * t), w = Math.sin(T * 1.3 + e.seed + s * 0.9 + t * 6) * 0.6 + off;
          const x = p[0] + e.path.nrm[i][0] * w * spread * env, y = p[1] + e.path.nrm[i][1] * w * spread * env;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.strokeStyle = `rgba(255,255,255,${0.05 + e.heat * 0.16})`; ctx.lineWidth = 0.8; ctx.stroke();
      }
      ctx.beginPath(); e.path.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.strokeStyle = `rgba(255,255,255,${0.10 + e.heat * 0.25})`; ctx.lineWidth = 1; ctx.stroke();
      if (Math.random() < dt * 0.25) parts.push({ e, t: 0, v: rnd(0.25, 0.45), s: rnd(0.25, 0.5), k: rnd(-1, 1), idle: 1 });
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt * p.v * (p.idle ? 0.6 : 1.1);
      if (p.t >= 1 || !p.e.path) { parts.splice(i, 1); continue; }
      const [x, y] = at(p.e.path, p.t), j = Math.min(40, p.t * 40 | 0), env = Math.sin(Math.PI * p.t), n = p.e.path.nrm[j];
      const X = x + n[0] * p.k * 6 * env, Y = y + n[1] * p.k * 6 * env, r = (p.idle ? 7 : 16) * p.s;
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    crewFrame(dt);
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- data
  let items = [], idx = 0, demo = false, stats = {}, recent = [], cabals = 0;
  const C = { gecko: 0, dex: 0, rpc: 0, you: 0, skip: 0, gateIn: 0, drop: 0, mem: 0, llm: 0, cabal: 0, sent: 0, acted: 0, judged: 0, avoid: 0 };
  const confHist = [], decHist = [];
  const log = (who, act, res) => {
    const box = $('.log'); if (!box) return;
    const d = document.createElement('div'); d.className = 'lr';
    d.innerHTML = `<span>${hhmm(new Date())}</span><b class="w-${esc(who)}">${esc(who)}</b><span>${esc(act)}</span><em>${esc(res)}</em>`;
    box.prepend(d); while (box.children.length > 16) box.lastChild.remove();
  };
  function agentBusy(a) { $$('[data-a]').forEach(e => { const b = e.dataset.a === a; e.textContent = b ? '[ BUSY ]' : '[ OK ]'; e.classList.toggle('busy', b); }); }
  function step(i) { $$('.eng-steps [data-s]').forEach(e => e.classList.toggle('on', +e.dataset.s === i)); }

  async function load() {
    const get = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
    const [f, s, rc, cb] = await Promise.all([get('/api/agent/feed?limit=40'), get('/api/stats'), get('/api/recent?limit=200'), get('/api/cabals')]);
    if (!alive) return;
    stats = s || {}; recent = (rc && rc.scans) || []; cabals = ((cb && cb.cabals) || []).length;
    const fresh = (f && f.items) || [];
    if (fresh.length) { items = fresh; demo = false; } else if (!items.length) { items = demoItems(); demo = true; }
    setK('foot', demo ? 'demo replay · no scans on this server yet: paste a token to start' : 'replay · real scans from this server, animated');
    setK('mode', demo ? 'demo replay' : 'replay · real scans');
    panels();
  }

  function panels() {
    const b = stats.bands || {}, now = Date.now() / 1000;
    const esc_ = items.filter(x => x.judge && x.judge.escalate).length, acted = items.filter(x => x.judge && !x.judge.escalate).length;
    setK('dec', fmt(demo ? C.judged : stats.scans || 0)); setK('avoid', fmt(demo ? C.avoid : b.DANGER || 0)); setK('esc', fmt(esc_));
    setK('esc2', fmt(esc_)); setK('drop2', fmt(C.drop)); setK('decs', fmt(stats.scans || C.judged) + ' DEC');
    const pass = items.length ? Math.round(acted / items.length * 100) : 0;
    setK('pass', pass + '%'); const d1 = $('.d1'); if (d1) d1.style.strokeDasharray = `${pass} 100`;
    const lat = items.map(x => x.judge && x.judge.latency_ms).filter(x => x != null).sort((a, z) => a - z);
    setK('lat', lat.length ? (lat[lat.length >> 1] < 10 ? (+lat[lat.length >> 1]).toFixed(2) : Math.round(lat[lat.length >> 1])) + ' ms' : '— ms');
    setK('l_scr', fmt(stats.tokens || items.length)); setK('l_clean', fmt((b.CLEAN || 0) + (b.OK || 0))); setK('l_risky', fmt(b.RISKY || 0));
    setK('l_danger', fmt(b.DANGER || 0)); setK('l_cabal', fmt(cabals)); setK('l_sent', fmt(C.sent));
    // scans per hour, last 12h (real)
    const hrs = Array.from({ length: 12 }, (_, i) => ({ h: new Date((Math.floor(now / 3600) - 11 + i) * 3600 * 1000).getHours(), n: 0 }));
    recent.forEach(r => { const k = 11 - Math.floor(now / 3600) + Math.floor(r.ts / 3600); if (k >= 0 && k < 12) hrs[k].n++; });
    const mx = Math.max(1, ...hrs.map(h => h.n));
    $('.bars').innerHTML = hrs.map((h, i) => `<div class="br${i === 11 ? ' now' : ''}"><span>${pad(h.h)}</span><i><u style="width:${h.n / mx * 100}%"></u></i><b>${h.n}</b></div>`).join('');
    // heat grid (real bands, newest first)
    const lv = { DANGER: 4, RISKY: 3, OK: 2, CLEAN: 1 }, src = recent.length ? recent : items;
    setK('heatn', src.length + ' SCANS');
    $('.heat').innerHTML = Array.from({ length: 64 }, (_, i) => { const r = src[63 - i]; return `<i class="h${r ? lv[r.band] || 0 : 0}${i === 63 && r ? ' lit' : ''}"${r ? ` title="${esc(sym(r))} ${esc(r.band)}"` : ''}></i>`; }).join('');
  }
  function sparks() {
    const draw = (c, data, max) => {
      if (!c) return; const w = c.clientWidth, h = c.clientHeight; if (!w) return;
      c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.4; g.beginPath();
      data.forEach((v, i) => { const x = i / Math.max(1, data.length - 1) * (w - 6) + 3, y = h - 4 - (v / max) * (h - 8); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
      if (data.length) { const v = data[data.length - 1], x = w - 3, y = h - 4 - (v / max) * (h - 8); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3, 0, 6.29); g.fill(); }
    };
    draw($('.wave'), confHist.length > 1 ? confHist : [0.5, 0.5], 1);
    draw($('.spark'), decHist.length > 1 ? decHist : [0, 0], Math.max(1, ...decHist));
  }

  // one token through the whole graph (~5.5 s)
  function play() {
    if (!alive) return;
    if (!items.length) { later(1500, play); return; }
    const x = items[idx++ % items.length], j = x.judge || {}, s = sym(x), dec = j.decision || '—';
    const swarms = x.swarms || [], big = swarms.reduce((m, c) => Math.max(m, c.share_of_float || 0), 0);
    const flags = (x.contract_flags || []).length, danger = (x.contract_flags || []).some(f => f.level === 'danger');
    const src = Math.random() < 0.15 ? 'you' : pick(['gecko', 'dex', 'rpc']);
    nodeEl.hub.classList.remove('done'); setF('hub', 'c', 'which hand?');
    step(0); C[src]++; setF(src, 'n', fmt(C[src])); setF(src, src === 'you' ? 'last' : 'lag', src === 'you' ? s : rnd(0.4, 3).toFixed(1) + 's');
    // occasional skipped pool (illustrative: the gate drops pools with no liquidity yet)
    if (src !== 'you' && Math.random() < 0.3) later(3000, () => {
      const s2 = pick(['gecko', 'dex', 'rpc']); C.skip++; C.gateIn++; send(s2, 'gate', 3);
      later(700, () => { step(1); focus('gate', true); setF('gate', 'p', rnd(0.05, 0.3).toFixed(2)); setF('gate', 'v', 'skip'); send('gate', 'skip', 3); log('gate', 'screen', 'skip'); });
      later(1500, () => { focus('gate', false); setF('skip', 'n', fmt(C.skip)); setF('skip', 'rate', Math.round(C.skip / C.gateIn * 100) + '%'); });
    });
    const t0 = src === 'you' ? 0 : 1500;
    if (src !== 'you') { C.gateIn++;
      send(src, 'gate', 4);
      later(t0 - 700, () => { step(1); focus('gate', true); setF('gate', 'p', rnd(0.72, 0.99).toFixed(2)); setF('gate', 'v', 'scan'); log('gate', 'screen', 'scan ' + s); });
      later(t0, () => { focus('gate', false); send('gate', 'hub', 5); setF('skip', 'rate', Math.round(C.skip / C.gateIn * 100) + '%'); });
    } else { send('you', 'hub', 5); log('you', 'paste', s); }
    later(t0 + 700, () => { step(2); setF('hub', 'q', s); ['scout', 'tracer', 'linker', 'auditor'].forEach((a, i) => later(i * 120, () => send('hub', a, 3))); agentBusy('scout'); });
    later(t0 + 1500, () => { setF('scout', 'r', s); setF('scout', 'n', x.holders ?? '—'); log('scout', 'holders', String(x.holders ?? '—')); step(3); agentBusy('tracers');
      setF('tracer', 'n', x.holders ?? '—'); setF('tracer', 'h', (x.hands ?? '—') + ' hands'); send('scout', 'funder', 2); send('tracer', 'funder', 3); });
    later(t0 + 2100, () => { step(4); agentBusy('linker'); setF('linker', 'n', swarms.length); setF('linker', 'b', swarms.length ? Math.round(big * 100) + '%' : '—');
      log('linker', 'swarms', swarms.length ? `${swarms.length} · ${Math.round(big * 100)}%` : 'none'); send('linker', 'funder', 3); send('linker', 'honey', 2); });
    later(t0 + 2600, () => { step(5); agentBusy('auditor'); setF('auditor', 'n', 'done'); setF('auditor', 'f', flags || 'none'); log('auditor', 'contract', flags ? flags + ' flag' + (flags > 1 ? 's' : '') : 'clean'); send('auditor', 'honey', 3); });
    later(t0 + 3200, () => {
      const linked = swarms.length > 0;
      focus('funder', true); setF('funder', 'p', Math.min(0.99, linked ? 0.6 + big : rnd(0.05, 0.3)).toFixed(2)); setF('funder', 'v', linked ? 'linked' : 'no link');
      focus('honey', true); setF('honey', 'p', (danger ? rnd(0.8, 0.98) : flags ? rnd(0.4, 0.7) : rnd(0.02, 0.2)).toFixed(2)); setF('honey', 'v', danger ? 'trap' : flags ? 'warn' : 'clean');
      if (!linked) { C.drop++; send('funder', 'drop', 2); setF('drop', 'n', fmt(C.drop)); setF('drop', 'why', 'no shared funder'); }
      send('funder', 'mem', 3); send('honey', 'mem', 3);
      C.mem += x.holders || 0; setF('mem', 'n', fmt(C.mem)); setF('mem', 'c', 'free');
      if (j.escalate) { C.llm++; send('honey', 'llm', 3); setF('llm', 'n', fmt(C.llm)); setF('llm', 't', 'the unsure'); log('llm', 'escalate', s); }
    });
    later(t0 + 3900, () => {
      focus('funder', false); focus('honey', false);
      step(6); agentBusy('judge'); send('mem', 'judge', 4);
      later(650, () => {
        focus('judge', true); setF('judge', 'v', dec); setF('judge', 'c', j.confidence != null ? j.confidence.toFixed(2) : '—');
        nodeEl.judge.dataset.dec = dec; nodeEl.hub.classList.add('done');
        const hb = root.querySelector('.hb2'); if (hb) hb.style.strokeDasharray = `${Math.round((j.confidence || 0) * 100)} 100`;
        setF('hub', 'c', `${dec} · conf ${j.confidence != null ? j.confidence.toFixed(2) : '—'}`);
        log('judge', dec.toLowerCase(), `${s} ${j.confidence != null ? j.confidence.toFixed(2) : ''}${j.escalate ? ' ↑' : ''}`);
        C.judged++; if (dec === 'AVOID') C.avoid++;
        confHist.push(j.confidence || 0); if (confHist.length > 30) confHist.shift();
        decHist.push(C.judged); if (decHist.length > 30) decHist.shift();
        sparks();
      });
    });
    later(t0 + 5000, () => {
      step(7); focus('judge', false); agentBusy('');
      if (dec === 'AVOID' && swarms.length) { C.cabal++; send('judge', 'cabal', 3); setF('cabal', 'n', fmt(C.cabal)); setF('cabal', 'k', 'forever'); }
      send('judge', 'feed', 4); if (j.escalate) send('llm', 'feed', 2);
      later(700, () => { C.sent++; setF('feed', 'q', fmt(Math.max(0, items.length - (idx % items.length)))); setF('feed', 's', `${fmt(C.sent)} · ${hhmm(new Date())}`); setK('l_sent', fmt(C.sent)); if (demo) panels(); });
    });
    later(t0 + 5600, play);
  }

  // clock
  const tick = () => { const d = new Date(); setK('clock', hhmm(d)); setK('clock2', hhmmss(d)); };
  tick(); const clk = setInterval(tick, 1000);
  const poll = setInterval(load, 30000);

  layout(); window.addEventListener('resize', layout);
  raf = requestAnimationFrame(frame);
  load().then(() => { setF('gecko', 'lag', '—'); later(400, play); sparks(); });
  return { stop() { alive = false; cancelAnimationFrame(raf); clearInterval(clk); clearInterval(poll); timers.forEach(clearTimeout); window.removeEventListener('resize', layout); } };
};
})();
