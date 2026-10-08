/* SWARM fx: one motion language for every page.
   - staggered reveal of panels as they enter the viewport
   - title scramble on page change, count-up numbers
   - cursor spotlight on panel borders
   - a quiet white particle "swarm" in the background that links to the cursor */
(() => {
'use strict';
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const GLYPHS = '01#$%&*<>/\\=+ABCDEFXΣΔ';

// ---------------------------------------------------------------- count-up
function countTo(el, to, ms = 900) {
  if (!el) return;
  const from = parseFloat((el.textContent || '0').replace(/[^0-9.\-]/g, '')) || 0;
  if (reduce || from === to) { el.textContent = Number(to).toLocaleString('en-US'); return; }
  const t0 = performance.now(), dec = String(to).includes('.') ? String(to).split('.')[1].length : 0;
  const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3), v = from + (to - from) * e;
    el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
window.countTo = countTo;
function countIn(el) {          // animate an element whose text is a number like "$1.2K", "40", "93%"
  const m = (el.textContent || '').trim().match(/^([^\d\-]*)(-?[\d,]*\.?\d+)(.*)$/);
  if (!m || el.children.length) return;
  const [, pre, num, post] = m, to = parseFloat(num.replace(/,/g, '')), dec = (num.split('.')[1] || '').length;
  if (!isFinite(to) || reduce) return;
  const t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3), v = to * e;
    el.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + post; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------- scramble (text nodes only, keeps markup)
function scrambleEl(el, ms = 800) {
  if (reduce) return;
  const nodes = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) if (n.nodeValue.trim()) nodes.push([n, n.nodeValue]);
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / ms);
    nodes.forEach(([node, text]) => { const c = Math.floor(k * text.length);
      node.nodeValue = text.slice(0, c) + Array.from(text.slice(c), ch => ch === ' ' ? ' ' : GLYPHS[Math.random() * GLYPHS.length | 0]).join(''); });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
window.scrambleEl = scrambleEl;

// ---------------------------------------------------------------- reveal + spotlight on new content
const REVEAL = '.phead, .eng, .card, .kpis, .mapbox, .gwbox, .section > .head, .tbl tbody tr, .crew, .arena, .grid > .card';
const SPOT = '.card, .phead, .rc, .ep, .kpi, .mapbox';
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -6% 0px' }) : null;
function enhance(root) {
  let i = 0;
  root.querySelectorAll(REVEAL).forEach(el => {
    if (el.dataset.fx || el.closest('.r3list, #rad, #recent')) return;
    el.dataset.fx = 1;
    if (reduce || !io) return;
    el.classList.add('rv'); el.style.setProperty('--d', Math.min(i++, 14) * 55 + 'ms'); io.observe(el);
  });
  root.querySelectorAll(SPOT).forEach(el => el.classList.add('spot'));
  root.querySelectorAll('h1.scr').forEach(el => { if (!el.dataset.sc) { el.dataset.sc = 1; scrambleEl(el); } });
  root.querySelectorAll('.kpi .v, .phead .eng-kpis b.cnt').forEach(el => { if (!el.dataset.cn) { el.dataset.cn = 1; countIn(el); } });
}
document.addEventListener('pointermove', e => {
  const el = e.target.closest && e.target.closest('.spot'); if (!el) return;
  const b = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - b.left) + 'px'); el.style.setProperty('--my', (e.clientY - b.top) + 'px');
}, { passive: true });
function boot() {
  const view = document.getElementById('view'); if (!view) return;
  new MutationObserver(() => enhance(view)).observe(view, { childList: true, subtree: true });
  enhance(view);
  background();
}

// ---------------------------------------------------------------- background particle swarm
function background() {
  if (reduce) return;
  const cv = document.createElement('canvas'); cv.id = 'fxbg'; document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, pts = [], mx = -1e4, my = -1e4, raf = 0, last = 0;
  const size = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, W * H / 16000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.4 + .4 }));
  };
  size(); addEventListener('resize', size);
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { mx = my = -1e4; });
  const frame = now => {
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 33) return;        // ~30 fps is plenty for ambience
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      const dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy);
      if (d < 180) { p.vx += dx / d * 0.012; p.vy += dy / d * 0.012; }
      p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx + Math.sin(now * 0.0003 + p.y * 0.01) * 0.05; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10; if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
    }
    ctx.lineWidth = 0.6;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) { ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 120) * 0.10})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      const dm = Math.hypot(a.x - mx, a.y - my);
      if (dm < 160) { ctx.strokeStyle = `rgba(255,255,255,${(1 - dm / 160) * 0.35})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke(); }
      ctx.fillStyle = `rgba(255,255,255,${0.25 + a.r * 0.2})`; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.29); ctx.fill();
    }
  };
  raf = requestAnimationFrame(frame);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
