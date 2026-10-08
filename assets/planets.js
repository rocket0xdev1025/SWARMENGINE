/* Procedural monochrome planets + mini black holes, shared by the Gravity Well and the bubble map.
   window.Planets = { sprite(seed, size, opts), hole(ctx, x, y, r, t, opts), Disk } */
(() => {
'use strict';
const TAU = Math.PI * 2;
function rng(seed) {
  let h = 2166136261; const s = String(seed || '?');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const cache = new Map();

/* sprite(seed, size, {tone 0..1 brightness, kind: 'gas'|'rock'|'ice', glow}) -> canvas (size x size, planet in the middle) */
function sprite(seed, size, o = {}) {
  size = Math.max(8, Math.round(size));
  const key = seed + '|' + size + '|' + (o.tone ?? 0.6).toFixed(2) + '|' + (o.kind || '') + '|' + (o.logo ? 1 : 0);
  if (cache.has(key)) return cache.get(key);
  if (cache.size > 400) cache.clear();
  const R = rng(seed), c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), r = size / 2 * 0.92, cx = size / 2, cy = size / 2;
  const tone = o.tone ?? 0.6, kind = o.kind || (R() < 0.55 ? 'gas' : R() < 0.6 ? 'rock' : 'ice');
  const L = v => { const x = Math.max(0, Math.min(255, Math.round(v * 255))); return `rgb(${x},${x},${x})`; };
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
  g.fillStyle = L(tone * 0.85); g.fillRect(0, 0, size, size);
  g.translate(cx, cy); g.rotate((R() - 0.5) * 0.7); g.translate(-cx, -cy);       // axial tilt
  if (kind === 'gas') {                       // Jupiter-like bands with turbulence
    const f1 = 3 + R() * 6, f2 = 9 + R() * 14, ph = R() * TAU, amp = 0.10 + R() * 0.16;
    for (let y = 0; y < size; y++) {
      const v = y / size, w = Math.sin(v * f1 * TAU + ph) * 0.6 + Math.sin(v * f2 * TAU + ph * 2) * 0.4;
      g.fillStyle = L(tone + w * amp - 0.03); g.fillRect(0, y, size, 1.2);
    }
    for (let k = 0; k < 3; k++) {             // storms
      const sx = cx + (R() - 0.5) * r * 1.2, sy = cy + (R() - 0.5) * r * 1.2, sw = r * (0.12 + R() * 0.2);
      g.fillStyle = L(tone + (R() - 0.4) * 0.3); g.beginPath(); g.ellipse(sx, sy, sw, sw * 0.45, 0, 0, TAU); g.fill();
    }
  } else if (kind === 'rock') {               // craters + mottling
    for (let k = 0; k < 90; k++) { const a = R() * TAU, d = Math.sqrt(R()) * r, s = r * (0.02 + R() * 0.07);
      g.fillStyle = L(tone + (R() - 0.5) * 0.25); g.globalAlpha = 0.6; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    for (let k = 0; k < 7; k++) { const a = R() * TAU, d = Math.sqrt(R()) * r * 0.85, s = r * (0.06 + R() * 0.12);
      const cr = g.createRadialGradient(cx + Math.cos(a) * d - s * 0.3, cy + Math.sin(a) * d - s * 0.3, 0, cx + Math.cos(a) * d, cy + Math.sin(a) * d, s);
      cr.addColorStop(0, L(tone - 0.18)); cr.addColorStop(0.8, L(tone - 0.05)); cr.addColorStop(1, L(tone + 0.08));
      g.fillStyle = cr; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, TAU); g.fill(); }
  } else {                                     // ice giant: soft gradient + faint bands
    const lg = g.createLinearGradient(0, 0, 0, size); lg.addColorStop(0, L(tone + 0.1)); lg.addColorStop(1, L(tone - 0.08));
    g.fillStyle = lg; g.fillRect(0, 0, size, size);
    for (let k = 0; k < 5; k++) { g.fillStyle = L(tone + (R() - 0.5) * 0.08); g.fillRect(0, size * R(), size, size * 0.04); }
  }
  if (o.logo && o.logo.complete && o.logo.naturalWidth) {      // the token's own logo wrapped as a decal
    g.globalAlpha = 0.85; g.filter = 'grayscale(1) contrast(1.1)';
    g.drawImage(o.logo, cx - r, cy - r, r * 2, r * 2); g.filter = 'none'; g.globalAlpha = 1;
  }
  g.restore();
  // terminator shading (light from upper-left) + rim light + atmosphere
  const sh = g.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.15, cx + r * 0.15, cy + r * 0.2, r * 1.25);
  sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.45, 'rgba(0,0,0,0)'); sh.addColorStop(0.8, 'rgba(0,0,0,0.62)'); sh.addColorStop(1, 'rgba(0,0,0,0.92)');
  g.fillStyle = sh; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,' + (0.25 + tone * 0.35) + ')'; g.lineWidth = Math.max(1, r * 0.04);
  g.beginPath(); g.arc(cx, cy, r - g.lineWidth / 2, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
  const at = g.createRadialGradient(cx, cy, r * 0.92, cx, cy, size / 2);
  at.addColorStop(0, 'rgba(255,255,255,' + (0.10 + tone * 0.15) + ')'); at.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = at; g.beginPath(); g.arc(cx, cy, size / 2, 0, TAU); g.fill();
  cache.set(key, c);
  return c;
}

/* black hole: event horizon + photon ring brightest at the bottom (as seen slightly from above) */
function hole(ctx, x, y, r, t, o = {}) {
  const tilt = o.tilt ?? 0.55;
  const glow = ctx.createRadialGradient(x, y + r * 0.2, r * 0.9, x, y + r * 0.2, r * 2.4);
  glow.addColorStop(0, 'rgba(255,255,255,0.22)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  // photon ring: thin, brighter on the lower arc, slightly flickering
  const fl = 0.85 + 0.15 * Math.sin(t * 3.1);
  ctx.lineWidth = Math.max(1.2, r * 0.09);
  ctx.strokeStyle = `rgba(255,255,255,${0.35 * fl})`; ctx.beginPath(); ctx.arc(x, y, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.lineWidth = Math.max(2, r * 0.16);
  const lg = ctx.createLinearGradient(x, y - r, x, y + r);
  lg.addColorStop(0, 'rgba(255,255,255,0.15)'); lg.addColorStop(0.55, 'rgba(255,255,255,0.55)'); lg.addColorStop(1, `rgba(255,255,255,${0.98 * fl})`);
  ctx.strokeStyle = lg; ctx.beginPath(); ctx.arc(x, y, r * 1.04, Math.PI * 0.02, Math.PI * 0.98); ctx.stroke();
  ctx.shadowColor = '#fff'; ctx.shadowBlur = r * 0.6; ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 1.0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); ctx.shadowBlur = 0;
}

/* accretion disk of motion-blurred streaks orbiting (x, y); faster near the horizon */
class Disk {
  constructor(n, inner, outer, o = {}) {
    this.tilt = o.tilt ?? 0.58; this.inner = inner; this.outer = outer; this.speed = o.speed ?? 1; this.p = [];
    for (let i = 0; i < n; i++) this.p.push(this.spawn(true));
  }
  spawn(any) {
    const u = Math.random(), r = any ? this.inner + Math.pow(u, 1.6) * (this.outer - this.inner) : this.outer * (0.85 + Math.random() * 0.15);
    return { r, a: Math.random() * TAU, w: 0.6 + Math.random() * 0.8, b: 0.35 + Math.random() * 0.65 };
  }
  resize(inner, outer) { const k = outer / (this.outer || 1); this.p.forEach(p => { p.r *= k; }); this.inner = inner; this.outer = outer; }
  draw(ctx, x, y, dt, o = {}) {
    const buckets = [[], [], [], []], tilt = this.tilt, inner = this.inner, outer = this.outer;
    for (const p of this.p) {
      const om = this.speed * 1.6 * Math.pow(inner / p.r, 1.25) * p.w;    // angular speed ~ r^-1.25
      p.a += om * dt; p.r -= dt * (inner * 0.06) * (inner / p.r) * (o.pull || 1);
      if (p.r < inner * 1.02) Object.assign(p, this.spawn(false));
      const near = 1 - (p.r - inner) / (outer - inner);                     // 1 at horizon, 0 at edge
      const bi = Math.min(3, Math.floor((near * 0.75 + p.b * 0.35) * 4));
      buckets[bi].push(p, om);
    }
    ctx.lineCap = 'round';
    for (let bi = 0; bi < 4; bi++) {
      const arr = buckets[bi]; if (!arr.length) continue;
      ctx.strokeStyle = `rgba(255,255,255,${[0.08, 0.18, 0.36, 0.7][bi] * (o.alpha ?? 1)})`;
      ctx.lineWidth = [0.5, 0.7, 0.9, 1.1][bi] * (o.width ?? 1);
      ctx.beginPath();
      for (let i = 0; i < arr.length; i += 2) {
        const p = arr[i], om = arr[i + 1], tail = Math.min(1.1, (0.06 + om * 0.28) * (o.trail ?? 1));
        const a0 = p.a - tail, a1 = p.a;
        ctx.moveTo(x + Math.cos(a0) * p.r, y + Math.sin(a0) * p.r * tilt);
        const steps = 5;
        for (let s = 1; s <= steps; s++) { const a = a0 + (a1 - a0) * s / steps; ctx.lineTo(x + Math.cos(a) * p.r, y + Math.sin(a) * p.r * tilt); }
      }
      ctx.stroke();
    }
  }
}
window.Planets = { sprite, hole, Disk, rng };
})();
