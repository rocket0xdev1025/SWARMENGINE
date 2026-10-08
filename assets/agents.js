/* SWARM agents: the crawl stage. Six spider agents walk between wallet boxes while the scan runs.
   window.SwarmStage(canvas, {demo}) -> controller fed with scan events. No dependencies. */
(() => {
'use strict';
const AGENTS = [
  { id: 'scout', name: 'SCOUT', role: 'maps the holders', body: '#ffffff', leg: '#ffffff', shape: 'hex' },
  { id: 'tracer1', name: 'TRACER-α', role: 'reads wallet history', body: '#e4e4e4', leg: '#e4e4e4', shape: 'long' },
  { id: 'tracer2', name: 'TRACER-β', role: 'reads wallet history', body: '#e4e4e4', leg: '#e9e9e9', shape: 'long' },
  { id: 'tracer3', name: 'TRACER-γ', role: 'follows the money', body: '#e9e9e9', leg: '#e4e4e4', shape: 'round' },
  { id: 'linker', name: 'LINKER', role: 'ties wallets together', body: '#ffffff', leg: '#bdbdbd', shape: 'hex' },
  { id: 'auditor', name: 'AUDITOR', role: 'inspects the contract', body: '#d0d0d0', leg: '#ffffff', shape: 'round' },
];
const SWC = ['#ffffff', '#cfcfcf', '#a8a8a8', '#e6e6e6', '#8a8a8a', '#bdbdbd', '#f2f2f2', '#9a9a9a'];
const short = a => !a ? '0x····' : a.startsWith('0x') ? a.slice(0, 6) + '…' + a.slice(-4) : a.slice(0, 4) + '…' + a.slice(-4);
const rnd = (a, b) => a + Math.random() * (b - a);
const hexAddr = () => '0x' + [...Array(40)].map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

class Spider {
  constructor(spec, x, y, scale) {
    Object.assign(this, spec);
    this.x = x; this.y = y; this.a = rnd(0, 6.28); this.s = scale; this.target = null; this.speed = 2.2 * scale;
    this.legs = [];
    for (let side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const ang = (-0.95 + i * 0.62) * 1 + (side < 0 ? Math.PI : 0);
      this.legs.push({ side, i, ang, fx: x, fy: y, tx: x, ty: y, moving: 0, group: (i + (side > 0 ? 1 : 0)) % 2 });
    }
    this.legs.forEach(l => { const [dx, dy] = this.rest(l); l.fx = l.tx = x + dx; l.fy = l.ty = y + dy; });
    this.silk = null; this.busy = 0; this.status = 'idle'; this.count = 0; this.orbit = null;
  }
  rest(l) {
    const reach = 26 * this.s, spread = l.side * (0.5 + l.i * 0.38) - (l.side < 0 ? 0 : 0);
    const base = this.a + l.side * Math.PI / 2 + (l.i - 1.5) * -0.42 * l.side;
    return [Math.cos(base) * reach, Math.sin(base) * reach + spread * 0];
  }
  goTo(x, y, orbit) { this.target = { x, y }; this.orbit = orbit || null; }
  update(t) {
    let tx = this.x, ty = this.y;
    if (this.orbit) {                       // circling something (auditor / scout patrol)
      const o = this.orbit; o.ang += o.w;
      tx = o.x + Math.cos(o.ang) * o.r; ty = o.y + Math.sin(o.ang) * o.r * 0.82;
    } else if (this.target) { tx = this.target.x; ty = this.target.y; }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d > 1.5) {
      const want = Math.atan2(dy, dx);
      let da = want - this.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      this.a += da * 0.18;
      const v = Math.min(this.speed, d * 0.12 + 0.4);
      this.x += Math.cos(this.a) * v; this.y += Math.sin(this.a) * v;
      this.walking = true;
    } else this.walking = false;
    // legs: alternate tetrapod gait, re-plant feet that drift too far from their rest spot
    const stepGroup = Math.floor(t / 9) % 2;
    for (const l of this.legs) {
      const [rx, ry] = this.rest(l);
      const lead = this.walking ? 9 * this.s : 0;
      const wx = this.x + rx + Math.cos(this.a) * lead, wy = this.y + ry + Math.sin(this.a) * lead;
      if (!l.moving && Math.hypot(wx - l.fx, wy - l.fy) > 14 * this.s && l.group === stepGroup) { l.moving = 1; l.sx = l.fx; l.sy = l.fy; l.tx = wx; l.ty = wy; l.k = 0; }
      if (l.moving) { l.k += 0.22; const k = Math.min(1, l.k); l.fx = l.sx + (l.tx - l.sx) * k; l.fy = l.sy + (l.ty - l.sy) * k - Math.sin(k * Math.PI) * 4 * this.s; if (k >= 1) l.moving = 0; }
    }
  }
  draw(ctx) {
    const s = this.s;
    ctx.lineCap = 'round';
    for (const l of this.legs) {
      const hip = [this.x + Math.cos(this.a + l.side * Math.PI / 2) * 4 * s + Math.cos(this.a) * (1.5 - l.i) * 3 * s,
                   this.y + Math.sin(this.a + l.side * Math.PI / 2) * 4 * s + Math.sin(this.a) * (1.5 - l.i) * 3 * s];
      const fx = l.fx, fy = l.fy, mx = (hip[0] + fx) / 2, my = (hip[1] + fy) / 2;
      const dx = fx - hip[0], dy = fy - hip[1], d = Math.hypot(dx, dy) || 1;
      const bend = Math.max(0, 30 * s - d) * 0.5 + 6 * s;          // knee pops up when the leg is short
      const kx = mx - dy / d * bend * l.side, ky = my + dx / d * bend * l.side;
      ctx.strokeStyle = this.leg; ctx.lineWidth = 1.6 * s; ctx.globalAlpha = .9;
      ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = this.leg; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(kx, ky, 1.6 * s, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.arc(fx, fy, 1.3 * s, 0, 6.29); ctx.fill();
    }
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.a);
    ctx.shadowColor = this.body; ctx.shadowBlur = 12;
    ctx.strokeStyle = this.body; ctx.lineWidth = 1.6; ctx.fillStyle = '#141414';
    if (this.shape === 'long') { roundRect(ctx, -13 * s, -5 * s, 26 * s, 10 * s, 5 * s); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4 * s, -5 * s); ctx.lineTo(-4 * s, 5 * s); ctx.moveTo(3 * s, -5 * s); ctx.lineTo(3 * s, 5 * s); ctx.stroke(); }
    else if (this.shape === 'hex') { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * 9 * s, Math.sin(a) * 9 * s); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * 4.5 * s, Math.sin(a) * 4.5 * s); } ctx.closePath(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(-3 * s, 0, 11 * s, 8 * s, 0, 0, 6.29); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(-3 * s, 0, 6 * s, 4 * s, 0, 0, 6.29); ctx.stroke(); }
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.body; ctx.beginPath(); ctx.arc(10 * s, 0, 3.4 * s, 0, 6.29); ctx.fill();   // head
    ctx.fillStyle = '#070707'; ctx.beginPath(); ctx.arc(11.5 * s, -1.4 * s, 0.9 * s, 0, 6.29); ctx.arc(11.5 * s, 1.4 * s, 0.9 * s, 0, 6.29); ctx.fill();
    ctx.restore();
  }
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

window.SwarmStage = function (cv, opts = {}) {
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, raf = 0, t = 0, alive = true;
  const size = () => { const b = cv.getBoundingClientRect(); W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); layout(); };
  const center = { label: opts.token ? short(opts.token) : '0x····', sub: 'resolving…', pulse: 0, color: '#e4e4e4' };
  let boxes = [], byAddr = {}, links = [], funders = {}, ringCount = 18, judgeOut = null;
  const scale = () => Math.max(0.75, Math.min(1.25, Math.min(W, H) / 560));
  function layout() {
    const n = Math.max(ringCount, boxes.length);
    const rx = W * 0.40, ry = H * 0.38;
    for (let i = 0; i < n; i++) {
      if (!boxes[i]) boxes[i] = { addr: null, share: 0, lit: 0, color: null, visited: 0 };
      const a = (i / n) * Math.PI * 2 - Math.PI / 2 + (i % 2 ? 0.06 : -0.06);
      const rr = i % 2 ? 0.86 : 1;
      boxes[i].x = W / 2 + Math.cos(a) * rx * rr; boxes[i].y = H / 2 + Math.sin(a) * ry * rr;
    }
  }
  size();
  const sc = scale();
  const spiders = AGENTS.map((a, i) => new Spider(a, W / 2 + Math.cos(i) * W * 0.3, H / 2 + Math.sin(i) * H * 0.3, sc));
  spiders.forEach((s, i) => { s.home = { x: W / 2 + Math.cos(i * 1.05) * W * 0.18, y: H / 2 + Math.sin(i * 1.05) * H * 0.18 }; s.goTo(s.home.x, s.home.y); });
  const byId = Object.fromEntries(spiders.map(s => [s.id, s]));
  const queue = [];
  let tracerTurn = 0;

  // ---------- drawing ----------
  function grid() {
    ctx.fillStyle = '#070707'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(233,233,233,0.07)'); g.addColorStop(1, 'rgba(7,7,7,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1c1c1c';
    for (let x = 12; x < W; x += 22) for (let y = 12; y < H; y += 22) ctx.fillRect(x, y, 1.2, 1.2);
    ctx.strokeStyle = 'rgba(233,233,233,0.10)'; ctx.lineWidth = 1;
    for (const r of [0.16, 0.24, 0.33]) { ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W * r, H * r * 1.05, 0, 0, 6.29); ctx.stroke(); }
    ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(228,228,228,0.10)';
    ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W * 0.40, H * 0.38, 0, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
    // scan sweep
    const a = (t / 160) % (Math.PI * 2);
    const sg = ctx.createConicGradient ? ctx.createConicGradient(a, W / 2, H / 2) : null;
    if (sg) { sg.addColorStop(0, 'rgba(233,233,233,0.10)'); sg.addColorStop(0.08, 'rgba(233,233,233,0)'); sg.addColorStop(1, 'rgba(233,233,233,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W * 0.42, H * 0.40, 0, 0, 6.29); ctx.fill(); }
  }
  function drawBox(b) {
    const s = scale(), w = 74 * s, h = 26 * s, x = b.x - w / 2, y = b.y - h / 2;
    const lit = b.lit > 0;
    ctx.fillStyle = lit ? 'rgba(228,228,228,0.10)' : 'rgba(17,17,17,0.85)';
    ctx.strokeStyle = b.color || (lit ? '#e4e4e4' : b.addr ? 'rgba(228,228,228,0.55)' : 'rgba(100,100,100,0.45)');
    ctx.lineWidth = b.color ? 2 : lit ? 1.8 : 1.2;
    if (b.color || lit) { ctx.shadowColor = b.color || '#e4e4e4'; ctx.shadowBlur = 10; }
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.shadowBlur = 0;
    ctx.font = `${10.5 * s}px JetBrains Mono, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = b.addr ? '#cfcfcf' : '#444444';
    ctx.fillText(b.addr ? short(b.addr) : '0x····', b.x, b.y - (b.addr && b.share ? 3 * s : 0));
    if (b.addr && b.share) { ctx.font = `${8.5 * s}px JetBrains Mono, monospace`; ctx.fillStyle = '#747474'; ctx.fillText((b.share * 100).toFixed(1) + '%', b.x, b.y + 7 * s); }
    if (b.visited) { ctx.fillStyle = '#e9e9e9'; ctx.beginPath(); ctx.arc(x + w - 4 * s, y + 4 * s, 2.4 * s, 0, 6.29); ctx.fill(); }
    if (b.lit > 0) b.lit -= 1;
  }
  function drawCenter() {
    const s = scale(), w = 150 * s, h = 150 * s, x = W / 2 - w / 2, y = H / 2 - h / 2;
    center.pulse = (center.pulse + 1) % 120;
    for (let k = 0; k < 2; k++) { const p = ((center.pulse + k * 60) % 120) / 120; ctx.strokeStyle = `rgba(61,255,139,${0.35 * (1 - p)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(W / 2, H / 2, 60 * s + p * 70 * s, 0, 6.29); ctx.stroke(); }
    ctx.fillStyle = 'rgba(13,13,13,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = center.color; ctx.lineWidth = 2; ctx.shadowColor = center.color; ctx.shadowBlur = 14; ctx.strokeRect(x, y, w, h); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(233,233,233,0.5)'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 52 * s, 0, 6.29); ctx.stroke();
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { ctx.fillStyle = '#e9e9e9'; ctx.beginPath(); ctx.arc(cx, cy, 3 * s, 0, 6.29); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f6f6f6'; ctx.font = `700 ${15 * s}px JetBrains Mono, monospace`; ctx.fillText(center.label, W / 2, H / 2 - 6 * s);
    ctx.fillStyle = '#939393'; ctx.font = `${9.5 * s}px JetBrains Mono, monospace`; ctx.fillText(center.sub, W / 2, H / 2 + 14 * s);
  }
  function drawLinks() {
    for (const l of links) {
      const A = l.A, B = l.B; if (!A || !B) continue;
      l.k = Math.min(1, (l.k || 0) + 0.04);
      const x2 = A.x + (B.x - A.x) * l.k, y2 = A.y + (B.y - A.y) * l.k;
      ctx.strokeStyle = l.pack ? 'rgba(237,237,237,0.85)' : l.funder ? 'rgba(255,255,255,0.35)' : 'rgba(233,233,233,0.9)';
      ctx.lineWidth = l.funder ? 1 : 1.8; ctx.setLineDash(l.pack ? [5, 4] : []);
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = l.funder ? 0 : 6;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
    }
    for (const f of Object.values(funders)) {
      ctx.fillStyle = '#111111'; ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](f.x + Math.cos(a) * 6, f.y + Math.sin(a) * 6); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  function drawSilk(sp) {
    if (!sp.silk) return;
    ctx.strokeStyle = 'rgba(207,207,207,0.22)'; ctx.setLineDash([2, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sp.silk.x, sp.silk.y); ctx.lineTo(sp.x, sp.y); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawJudge() {
    if (!judgeOut) return;
    judgeOut.k = Math.min(1, judgeOut.k + 0.04);
    const s = scale(), col = { AVOID: '#b3b3b3', CAUTION: '#ededed', OK: '#e9e9e9' }[judgeOut.decision] || '#e4e4e4';
    ctx.globalAlpha = judgeOut.k;
    ctx.fillStyle = 'rgba(7,7,7,0.55)'; ctx.fillRect(0, 0, W, H);
    const pw = 300 * s, ph = 120 * s;
    ctx.fillStyle = 'rgba(10,10,10,0.96)'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 30;
    roundRect(ctx, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, 12 * s); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${46 * s}px JetBrains Mono, monospace`; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 24;
    ctx.fillText(judgeOut.decision, W / 2, H / 2 - 8 * s); ctx.shadowBlur = 0;
    ctx.font = `${12 * s}px JetBrains Mono, monospace`; ctx.fillStyle = '#cfcfcf';
    ctx.fillText(`JUDGE · confidence ${(judgeOut.confidence * 100).toFixed(0)}%`, W / 2, H / 2 + 32 * s);
    ctx.globalAlpha = 1;
  }
  function frame() {
    if (!alive) return;
    t++;
    if (queue.length && t % (queue.length > 24 ? 2 : queue.length > 8 ? 4 : 7) === 0) apply(queue.shift());
    grid(); drawLinks();
    spiders.forEach(drawSilk);
    boxes.forEach(drawBox); drawCenter();
    spiders.forEach(s => { s.update(t); s.draw(ctx); });
    if (opts.demo) demoTick();
    drawJudge();
    raf = requestAnimationFrame(frame);
  }

  // ---------- events ----------
  const boxFor = a => byAddr[a];
  function setHolders(list) {
    ringCount = Math.max(12, Math.min(24, list.length));
    boxes = []; byAddr = {}; layout();
    list.slice(0, ringCount).forEach((h, i) => { boxes[i].addr = h.address; boxes[i].share = h.share; byAddr[h.address] = boxes[i]; });
  }
  function funderNode(f, near) {
    if (!funders[f]) {
      const a = Math.atan2(near.y - H / 2, near.x - W / 2) + rnd(-0.18, 0.18);
      funders[f] = { x: W / 2 + Math.cos(a) * W * 0.48, y: H / 2 + Math.sin(a) * H * 0.46 };
      funders[f].x = Math.max(10, Math.min(W - 10, funders[f].x)); funders[f].y = Math.max(10, Math.min(H - 10, funders[f].y));
    }
    return funders[f];
  }
  function apply(e) {
    const st = id => { const s = byId[id]; if (s) { s.status = 'working'; s.count++; } return s; };
    switch (e.type) {
      case 'stage':
        if (e.detail === 'token' || e.detail === 'resolve') { const s = st('scout'); s.goTo(W / 2, H / 2 - 90 * scale()); center.sub = 'resolving token'; }
        if (e.detail === 'holders') { const s = st('scout'); s.goTo(0, 0, { x: W / 2, y: H / 2, r: Math.min(W, H) * 0.36, ang: 0, w: 0.012 }); center.sub = 'mapping holders'; }
        if (e.detail === 'wallets') { byId.scout.status = 'done'; center.sub = 'crawling wallets'; }
        if (e.detail === 'funders') { center.sub = 'following the money'; }
        if (e.detail === 'security') { const s = st('auditor'); s.goTo(0, 0, { x: W / 2, y: H / 2, r: 96 * scale(), ang: 0, w: 0.03 }); center.sub = 'auditing contract'; center.color = '#b3b3b3'; }
        if (e.detail === 'analysis') { byId.auditor.status = 'done'; byId.auditor.orbit = null; byId.auditor.goTo(byId.auditor.home.x, byId.auditor.home.y); center.sub = 'linking swarms'; center.color = '#ededed'; }
        break;
      case 'holders':
        setHolders(e.wallets || []); center.sub = `${(e.wallets || []).length} wallets in range`; break;
      case 'wallet': {
        const b = boxFor(e.wallet); const s = st(['tracer1', 'tracer2', 'tracer3'][tracerTurn++ % 3]);
        if (b) { s.goTo(b.x, b.y + 22 * scale()); s.silk = { x: W / 2, y: H / 2 }; b.lit = 50; b.visited = 1;
          if (e.funder) { const f = funderNode(e.funder, b); links.push({ A: f, B: b, funder: true }); } }
        break;
      }
      case 'link': {
        const A = boxFor(e.a), B = boxFor(e.b), s = st('linker');
        if (A && B) { links.push({ A, B, pack: e.level === 'pack' }); s.goTo((A.x + B.x) / 2, (A.y + B.y) / 2); }
        break;
      }
      case 'cluster': {
        const c = SWC[(apply.cc = (apply.cc || 0) + 1) % SWC.length];
        (e.wallets || []).forEach(w => { const b = boxFor(w); if (b) b.color = c; });
        break;
      }
      case 'judge':
        judgeOut = { decision: e.decision, confidence: e.confidence || 0, k: 0 };
        spiders.forEach(s => { s.orbit = null; s.status = 'done'; s.goTo(s.home.x, s.home.y); s.silk = null; });
        break;
      case 'done':
        center.sub = `${e.band || ''} ${e.score ?? ''}`.trim(); center.color = { CLEAN: '#e9e9e9', OK: '#e2e2e2', RISKY: '#ededed', DANGER: '#b3b3b3' }[e.band] || '#e4e4e4';
        break;
    }
    if (opts.onAgents) opts.onAgents(spiders.map(s => ({ id: s.id, name: s.name, role: s.role, status: s.status, count: s.count, color: s.body })));
  }

  // ---------- idle demo (hero) ----------
  let demoNext = 0;
  function demoTick() {
    if (t < demoNext) return;
    demoNext = t + 26;
    if (!boxes[0].addr) setHolders([...Array(18)].map(() => ({ address: hexAddr(), share: rnd(0.005, 0.06) })));
    const b = boxes[Math.floor(Math.random() * boxes.length)], s = spiders[Math.floor(Math.random() * spiders.length)];
    s.goTo(b.x, b.y + 20 * scale()); b.lit = 40; b.visited = 1; s.silk = Math.random() < .5 ? { x: W / 2, y: H / 2 } : null;
    if (Math.random() < .25 && links.length < 14) { const b2 = boxes[Math.floor(Math.random() * boxes.length)]; if (b2 !== b) links.push({ A: b, B: b2, pack: Math.random() < .3 }); }
    if (links.length >= 14 && Math.random() < .05) { links = []; boxes.forEach(x => { x.color = null; x.visited = 0; }); }
    if (Math.random() < .08) { const c = SWC[Math.floor(Math.random() * SWC.length)]; boxes.slice(0, 18).filter(() => Math.random() < .15).forEach(x => x.color = c); }
  }
  if (opts.demo) { center.label = opts.label || 'SWARM'; center.sub = 'agents on patrol'; }

  const onResize = () => size();
  window.addEventListener('resize', onResize);
  frame();
  return {
    push(e) { queue.push(e); },
    agents: () => spiders.map(s => ({ id: s.id, name: s.name, role: s.role, status: s.status, count: s.count, color: s.body })),
    setToken(a) { center.label = short(a); },
    stop() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); },
    pending: () => queue.length,
  };
};
window.SwarmStage.AGENTS = AGENTS;
window.SwarmSpider = Spider;          // reused by the home page engine (spider crew on the fibres)
})();
