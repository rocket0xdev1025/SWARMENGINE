/* SWARM Spider Cam: every new scan, live. A spider walks out along the web to the token, reads it
   (resolve > scout > trace > link > audit), walks back, and the Judge stamps the verdict.
   window.SpiderCam(canvas, logEl, { onCount }) -> { stop() }. Reads /api/agent/feed. Needs agents.js
   (window.SwarmSpider, SwarmStage.AGENTS) and planets.js (window.Planets). */
(() => {
'use strict';
const TAU = Math.PI * 2;
const COL = { DANGER: '#ffffff', RISKY: '#d6d6d6', OK: '#19e3c4', CLEAN: '#2f7dff', TOO_EARLY: '#6a6a6a' };
const STAGES = ['RESOLVE', 'SCOUT', 'TRACE', 'LINK', 'AUDIT'];
const STEP_MS = 650;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = a => !a ? '' : a.startsWith('0x') ? a.slice(0, 6) + '…' + a.slice(-4) : a.slice(0, 4) + '…' + a.slice(-4);
const pct = x => x == null ? '—' : (x * 100).toFixed(1) + '%';
const label = b => b === 'TOO_EARLY' ? 'TOO EARLY' : (b || '—');

function thoughts(it) {
  const sym = '$' + (it.symbol || short(it.token)), sw = it.swarms || [], fl = it.contract_flags || [];
  const big = sw.reduce((m, c) => Math.max(m, c.share_of_float || 0), 0);
  return [
    `${sym} · ${it.chain} · ${short(it.token)}`,
    it.holders != null ? `${it.holders} holders mapped` : 'holders mapped',
    it.holders != null && it.hands != null ? `${it.holders} holders → ${it.hands} real hands` : 'funders traced',
    sw.length ? `${sw.length} swarm${sw.length > 1 ? 's' : ''} · biggest ${pct(big)} of float` : 'no swarms · holders look independent',
    fl.length ? fl.slice(0, 2).map(f => f.title).join(' · ') : 'no contract flags',
  ];
}

window.SpiderCam = function (cv, logEl, opt = {}) {
  const g = cv.getContext('2d'), SP = window.SwarmSpider, SPEC = (window.SwarmStage && window.SwarmStage.AGENTS) || [];
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0, yk = 0.8, slots = [], alive = true, frame = 0, raf = 0, poll = 0;
  const tokens = [], queue = [], seen = new Set(), sprites = {};
  let primed = false, watched = 0, avoid = 0, judge = null, crew = [], judgePulse = -1e9, hover = null;

  function layout() {
    const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2; yk = Math.max(0.8, Math.min(1.15, H / W)); R = Math.min(W * 0.47, H * 0.46 / yk);
    slots = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2 + 0.52; slots.push({ x: cx + Math.cos(a) * R * 0.55, y: cy + Math.sin(a) * R * 0.55 * yk }); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2 + 0.31; slots.push({ x: cx + Math.cos(a) * R * 0.9, y: cy + Math.sin(a) * R * 0.9 * yk }); }
    tokens.forEach(t => { const s = slots[t.slot]; if (s) { t.x = s.x; t.y = s.y; } });
  }
  function spawnCrew() {
    if (!SP || !SPEC.length) return;
    const sc = W < 560 ? 0.62 : 0.85;
    judge = new SP({ id: 'judge', name: 'JUDGE', body: '#ffffff', leg: '#ffffff', shape: 'hex' }, cx, cy, sc * 1.35);
    crew = SPEC.map((a, i) => { const ang = i / SPEC.length * TAU; const s = new SP(a, cx + Math.cos(ang) * R * 0.27, cy + Math.sin(ang) * R * 0.22, sc);
      s.speed = 3.0 * sc + 1.2; s.job = null; s.home = ang; idle(s); return s; });
  }
  function idle(s) { s.job = null; s.goTo(cx, cy, { x: cx, y: cy, r: R * 0.27, ang: Math.atan2(s.y - cy, s.x - cx), w: 0.006 + Math.random() * 0.004 }); }

  // ---------------------------------------------------------------- data
  const key = it => it.chain + ':' + it.token + ':' + (it.scanned_at || '');
  async function fetchFeed() {
    try {
      const r = await fetch('https://app-server-sandy.vercel.app/api/agent/feed?limit=20'); if (!r.ok) return;
      const d = await r.json(); let items = (d.items || []).filter(it => !seen.has(key(it)));
      if (!primed) items = items.slice(0, 8);                                   // first look: replay the last few
      primed = true;
      items.sort((a, b) => (a.scanned_at || 0) - (b.scanned_at || 0));
      for (const it of items) { seen.add(key(it)); queue.push(it); }
      (d.items || []).forEach(it => seen.add(key(it)));
    } catch (e) { /* offline: keep patrolling */ }
  }
  function freeSlot() {
    const used = new Set(tokens.filter(t => !t.leaving).map(t => t.slot));
    const order = [...slots.keys()].sort(() => 0);
    for (const i of order) if (!used.has(i)) return i;
    const old = tokens.filter(t => t.state === 'judged' && !t.leaving).sort((a, b) => a.judgedAt - b.judgedAt)[0];
    if (!old) return -1;
    old.leaving = performance.now(); return old.slot;
  }
  function assign(now) {
    if (!queue.length) return;
    const s = crew.find(c => !c.job); if (!s) return;
    const slot = freeSlot(); if (slot < 0) return;
    const it = queue.shift(), sl = slots[slot], a = Math.atan2(sl.y - cy, sl.x - cx);
    const t = { it, slot, x: sl.x, y: sl.y, fromX: cx + Math.cos(a) * R * 1.6, fromY: cy + Math.sin(a) * R * 1.6, born: now, state: 'wait', r: W < 560 ? 14 : 20, judgedAt: 0 };
    tokens.push(t);
    s.job = { t, phase: 'go', t0: now, step: -1, lines: thoughts(it) };
    s.orbit = null; s.goTo(sl.x, sl.y);
    log(s.name, `walking out to $${it.symbol || short(it.token)}`, 'go');
  }
  function log(who, text, cls = '') {
    if (!logEl) return;
    const ts = new Date().toTimeString().slice(0, 8), el = document.createElement('div');
    el.className = 'cam-l ' + cls; el.innerHTML = `<span class="ts">${ts}</span><b>${esc(who)}</b><span class="tx">${esc(text)}</span>`;
    logEl.prepend(el); while (logEl.children.length > 60) logEl.lastChild.remove();
  }

  // ---------------------------------------------------------------- jobs
  function work(s, now) {
    const j = s.job; if (!j) return;
    const t = j.t;
    if (j.phase === 'go') {
      if (Math.hypot(s.x - t.x, s.y - t.y) < t.r + 18) { j.phase = 'read'; j.t0 = now; t.state = 'reading';
        s.goTo(t.x, t.y, { x: t.x, y: t.y, r: t.r + 16, ang: Math.atan2(s.y - t.y, s.x - t.x), w: 0.035 }); }
    } else if (j.phase === 'read') {
      const step = Math.floor((now - j.t0) / STEP_MS);
      if (step !== j.step && step < STAGES.length) { j.step = step; log(STAGES[step], j.lines[step], 'st'); }
      if (step >= STAGES.length) { j.phase = 'back'; s.orbit = null; s.goTo(cx + (t.x - cx) * 0.3, cy + (t.y - cy) * 0.3); }
    } else if (j.phase === 'back') {
      if (Math.hypot(s.x - s.target.x, s.y - s.target.y) < 12) {
        const it = t.it, jd = it.judge || {}, dec = jd.decision || '—';
        t.state = 'judged'; t.judgedAt = now; judgePulse = now; watched++; if (dec === 'AVOID') avoid++;
        log('JUDGE', `${dec}${jd.confidence != null ? ' · ' + Math.round(jd.confidence * 100) + '%' : ''} · ${label(it.band)}${it.score != null ? ' ' + it.score : ''}`, 'jd b-' + (it.band || ''));
        opt.onCount && opt.onCount({ watched, avoid });
        idle(s);
      }
    }
  }

  // ---------------------------------------------------------------- draw
  function web(now) {
    g.save(); g.translate(cx, cy); g.scale(1, yk);
    const spokes = 16, rings = 7;
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 0.7; g.beginPath();
    for (let i = 0; i < spokes; i++) { const a = i / spokes * TAU; g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 1.1, Math.sin(a) * R * 1.1); }
    g.stroke();
    for (let k = 1; k <= rings; k++) {
      const rr = R * k / rings * 1.06 + Math.sin(now / 1800 + k) * 1.5;
      g.strokeStyle = `rgba(255,255,255,${k === 4 || k === 7 ? 0.15 : 0.07})`; g.beginPath();
      for (let i = 0; i <= spokes; i++) { const a = i / spokes * TAU, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (!i) g.moveTo(x, y); else { const pa = (i - 0.5) / spokes * TAU, sag = rr * 0.95; g.quadraticCurveTo(Math.cos(pa) * sag, Math.sin(pa) * sag, x, y); } }
      g.stroke();
    }
    g.restore();
    for (let i = 0; i < 28; i++) { const a = i * 2.39 + now / 9000, rr = R * (0.2 + (i * 37 % 85) / 100);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * yk, 1.4, 1.4); }
  }
  function sprite(t) {
    const k = t.it.chain + t.it.token, sz = Math.max(16, Math.ceil(t.r * 2 / 0.46 * dpr / 8) * 8);
    return sprites[k] || (sprites[k] = window.Planets ? window.Planets.sprite(k, sz, { tone: 0.32 }) : null);
  }
  function drawToken(t, now) {
    const k = Math.min(1, (now - t.born) / 700), e = 1 - Math.pow(1 - k, 3);
    const x = t.fromX + (t.x - t.fromX) * e, y = t.fromY + (t.y - t.fromY) * e;
    let al = k;
    if (t.leaving) { const q = Math.min(1, (now - t.leaving) / 600); al *= 1 - q; if (q >= 1) t.dead = true; }
    t.px = x; t.py = y;
    g.save(); g.globalAlpha = al;
    const sp = sprite(t), D = t.r / 0.46;
    if (sp) g.drawImage(sp, x - D / 2, y - D / 2, D, D); else { g.fillStyle = '#444'; g.beginPath(); g.arc(x, y, t.r, 0, TAU); g.fill(); }
    if (t.state === 'reading') {
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2; g.setLineDash([3, 5]); g.lineDashOffset = -now / 40;
      g.beginPath(); g.arc(x, y, t.r + 8, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    if (t.state === 'judged') {
      const b = t.it.band || 'TOO_EARLY', c = COL[b] || '#888', q = Math.min(1, (now - t.judgedAt) / 350);
      g.strokeStyle = c; g.lineWidth = 2; g.shadowColor = c; g.shadowBlur = 12;
      g.beginPath(); g.arc(x, y, t.r + 5 + (1 - q) * 18, 0, TAU); g.stroke(); g.shadowBlur = 0;
      const txt = label(b) + (t.it.score != null ? ' ' + t.it.score : '');
      g.font = '800 10px "JetBrains Mono", monospace'; const w = g.measureText(txt).width + 12;
      g.globalAlpha = al * q; g.fillStyle = b === 'DANGER' ? '#fff' : '#000'; g.strokeStyle = c; g.lineWidth = 1;
      g.fillRect(x - w / 2, y + t.r + 9, w, 16); g.strokeRect(x - w / 2 + .5, y + t.r + 9.5, w - 1, 15);
      g.fillStyle = b === 'DANGER' ? '#000' : c; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + t.r + 17.5);
    }
    g.globalAlpha = al; g.font = '700 11px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; const nm = '$' + String(t.it.symbol || short(t.it.token)).slice(0, 10);
    g.strokeText(nm, x, y - t.r - 9); g.fillStyle = '#fff'; g.fillText(nm, x, y - t.r - 9);
    if (t === hover) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, t.r + 2, 0, TAU); g.stroke(); }
    g.restore();
  }
  function bubble(s, text) {
    g.font = '800 10px "JetBrains Mono", monospace'; const w = g.measureText(text).width + 12, x = s.x - w / 2, y = s.y - 30 * s.s - 16;
    g.fillStyle = '#fff'; g.fillRect(x, y, w, 15); g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, s.x, y + 8);
  }
  function loop() {
    if (!alive) return;
    const now = performance.now(); frame++;
    g.clearRect(0, 0, W, H);
    web(now);
    crew.forEach(s => { if (s.job) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo((cx + s.x) / 2, (cy + s.y) / 2 + 14, s.x, s.y); g.stroke(); } });
    for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].dead) tokens.splice(i, 1);
    tokens.forEach(t => drawToken(t, now));
    assign(now);
    crew.forEach(s => { work(s, now); s.update(frame); s.draw(g); });
    if (judge) {
      judge.x = cx; judge.y = cy; judge.a = -Math.PI / 2 + Math.sin(now / 900) * 0.15; judge.update(frame);
      const p = Math.max(0, 1 - (now - judgePulse) / 700);
      if (p > 0) { g.strokeStyle = `rgba(255,255,255,${p})`; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 26 + (1 - p) * 70, 0, TAU); g.stroke(); }
      judge.draw(g);
      g.font = '800 10px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('JUDGE', cx, cy + 40 * judge.s);
    }
    crew.forEach(s => { if (s.job && s.job.phase === 'read' && s.job.step >= 0) bubble(s, STAGES[Math.min(STAGES.length - 1, s.job.step)]); });
    if (!tokens.length && !queue.length) { g.font = '500 12px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText('waiting for the next scan…', cx, cy + R * 0.82); }
    raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- input
  function pick(e) { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    return tokens.find(t => t.px != null && !t.leaving && Math.hypot(t.px - x, t.py - y) < t.r + 6) || null; }
  cv.addEventListener('mousemove', e => { hover = pick(e); cv.style.cursor = hover ? 'pointer' : 'default'; });
  cv.addEventListener('click', e => { const t = pick(e); if (t && opt.open) opt.open(`/t/${t.it.chain}/${t.it.token}`); });
  const ro = new ResizeObserver(() => layout()); ro.observe(cv);

  layout(); spawnCrew();
  log('SWARM', 'spider cam online · 6 agents + the judge', 'sys');
  fetchFeed(); poll = setInterval(fetchFeed, 8000);
  raf = requestAnimationFrame(loop);
  return { stop() { alive = false; cancelAnimationFrame(raf); clearInterval(poll); ro.disconnect(); } };
};
})();
