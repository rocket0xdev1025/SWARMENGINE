/* SWARM front-end: router, i18n, live crawl, bubble map, radar, cabals, wallet X-ray, share card. No deps. */
(() => {
'use strict';
// ---------------------------------------------------------------- i18n
const I18N = {
  en: {
    nav_scan: 'Scan', nav_radar: 'Radar', nav_cabals: 'Cabals', nav_cam: 'Spider Cam', nav_replay: 'Replay', nav_molt: 'Molt', nav_spider: 'Spider', nav_docs: 'API', ca_copy: 'copy contract address', ca_copied: 'CA copied',
    eyebrow: 'free · read-only · multi-chain', hero1: 'How many', hero2: 'real hands', hero3: 'hold this token?',
    lead: 'Paste a token. SWARM crawls its top holders, follows the money that funded them and maps them into real hands — shared funders, bundled buys, fresh wallets, contract traps. One verdict, one bubble map.',
    ph: '0x… token address or Solana mint', auto: 'auto chain', scan: 'SCAN', scanning: 'CRAWLING…', fresh: 'fresh scan',
    try_: 'try:', s_scans: 'scans', s_tokens: 'tokens', s_wallets: 'wallets mapped',
    radar_t: 'Launch radar', radar_sub: 'new pools, scanned automatically', radar_all: 'open radar →', recent_t: 'Latest scans',
    crawl_t: 'Live crawl', swarm_t: 'the swarm is forming…',
    hands_a: 'holders →', hands_b: 'real hands', parts: 'Score', rules: 'Rules triggered', none_rules: 'No stop rules triggered.',
    security: 'Contract', sec_na: 'Security checks unavailable for this scan.', swarms: 'Swarms', no_swarms: 'No multi-wallet swarms found — holders look independent.',
    holders: 'Top holders', infra: 'Set aside (pools, burn, lockers, contracts)', memory: 'Swarm memory',
    mem_none: 'None of these wallets sat in a swarm we scanned before.', mem_group: 'holders were ONE swarm in',
    mem_repeat: 'holders appeared in earlier scans', share: 'Share', share_x: 'Post on X', dl_card: 'Download card', copy: 'Copy link',
    copied: 'Copied', history: 'Scans of this token', map_title: 'bubble map', map_hint: 'drag · hover · click a bubble',
    lg_funder: 'shared funder', lg_bundle: 'same tx / transfer', lg_pack: 'entered together', lg_dev: 'creator',
    price: 'Price', mcap: 'MCap', liq: 'Liquidity', vol: '24h vol', age: 'Age', holders_n: 'Holders',
    wallet: 'Wallet', float: 'Float', entry: 'Entry', flags: 'Flags', swarm: 'Swarm', txs: 'Txs',
    radar_head: 'Launch radar', radar_lead: 'Fresh pools from GeckoTerminal, scanned by SWARM one by one. Verdicts appear as soon as a scan finishes.',
    queued: 'queued', scanning_s: 'scanning…', error_s: 'failed', radar_off: 'Radar is off on this server (RADAR_ENABLED=false).',
    radar_empty: 'Waiting for new pools… the first ones appear within a couple of minutes.',
    cab_head: 'Cabal board', cab_lead: 'Crews of wallets that acted as ONE swarm in two or more different tokens. The more tokens, the more likely it is a team that farms launches.',
    cab_empty: 'No crews yet. Crews appear once the same wallets show up together in several scanned tokens.',
    tokens: 'tokens', wallets_: 'wallets', w_head: 'Wallet X-ray', w_funder: 'First funder', w_hub: 'exchange / hub',
    w_seen: 'Seen by SWARM in', w_recent: 'Recent tokens touched', w_none: 'Not seen in any scan yet.',
    foot: 'SWARM reads public blockchain data only. It never asks for keys and never moves funds. Not financial advice.',
    err: 'Scan failed',
    agents_t: 'Agent swarm', agents_sub: '6 agents crawl every scan', judge_t: 'Judge output', judge_sub: 'structured decision for trading agents',
    view_result: 'VIEW RESULT →', mcp_t: 'Give your agent eyes', mcp_sub: 'SWARM speaks MCP: plug it into Claude, Cursor or your own trading agent.',
    eyebrow_agents: 'agent swarm · read-only · free',
    engine_t: 'Decision engine', engine_sub: 'every sphere is a decision · LLMs think, SWARM decides, code does',
    tab_torus: 'TORUS', tab_agents: 'AGENTS', receipt: 'receipt', route: 'route', copy_llm: 'Copy for your LLM',
    tri_act: 'ACT · confident', tri_esc: 'ESCALATE · needs words',
  },
};
let lang = 'en';
// the interface is English only
if (!I18N[lang]) lang = 'en';
const t = k => (I18N[lang] || I18N.en)[k] ?? I18N.en[k] ?? k;

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = a => !a ? '' : a.startsWith('0x') ? a.slice(0, 6) + '…' + a.slice(-4) : a.slice(0, 4) + '…' + a.slice(-4);
const usd = x => x == null ? '—' : x >= 1e9 ? '$' + (x / 1e9).toFixed(2) + 'B' : x >= 1e6 ? '$' + (x / 1e6).toFixed(2) + 'M' : x >= 1e3 ? '$' + (x / 1e3).toFixed(1) + 'K' : x >= 1 ? '$' + x.toFixed(2) : '$' + Number(x).toPrecision(3);
const pct = (x, d = 1) => x == null ? '—' : (x * 100).toFixed(d) + '%';
const ago = ts => { if (!ts) return '—'; const s = Math.max(0, Date.now() / 1000 - ts); return s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'd'; };
const age = h => h == null ? '—' : h < 1 ? Math.round(h * 60) + 'm' : h < 48 ? Math.floor(h) + 'h' : Math.floor(h / 24) + 'd';
const bandLabel = b => b === 'TOO_EARLY' ? 'TOO EARLY' : (b || '—');
const BANDC_C = { CLEAN: '#3dff8b', OK: '#7fd8ff', RISKY: '#ffb547', DANGER: '#ff4f6d', TOO_EARLY: '#8b93a7' };
const BANDC_M = { CLEAN: '#3a3a3a', OK: '#6e6e6e', RISKY: '#b4b4b4', DANGER: '#ffffff', TOO_EARLY: '#2a2a2a' };
const BANDC = BANDC_M;
const SW = ['#ffffff', '#cfcfcf', '#a8a8a8', '#e6e6e6', '#8a8a8a', '#bdbdbd', '#f2f2f2', '#9a9a9a', '#dcdcdc', '#7a7a7a'];
const icon = l => `<span class="ico ${l}">${({ ok: '✓', info: 'i', warn: '!', danger: '✕' }[l] || '·')}</span>`;
// ---------------------------------------------------------------- Holder Pass (sign once, no tx): sent with every API call
const PASS_KEY = 'swarm_holder_pass';
const passGet = () => { try { return JSON.parse(localStorage.getItem(PASS_KEY) || 'null'); } catch (e) { return null; } };
const passSet = v => { try { v ? localStorage.setItem(PASS_KEY, JSON.stringify(v)) : localStorage.removeItem(PASS_KEY); } catch (e) {} };
// Stay on this host. swarmengine.tech only sends Access-Control-Allow-Origin for itself, so a cross-origin POST from www.swarmengine.site is blocked.
async function api(p, o) {
  const ps = passGet();
  if (ps && ps.pass && ps.exp * 1000 > Date.now() && p.startsWith('/api/')) o = { ...(o || {}), headers: { ...((o || {}).headers || {}), 'X-Holder-Pass': ps.pass } };
  const r = await fetch(p, o); let d = null;
  try { d = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((d && d.error) || 'HTTP ' + r.status);
  return d;
}
// ---------------------------------------------------------------- project CA + X (PROJECT_CA / PROJECT_X in env)
const XICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
const COPYICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M9 9h11v11H9zM5 15H4V4h11v1"/></svg>';
function copyCA(ca) {
  const done = () => toast(t('ca_copied'));
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(ca).then(done, () => fallback());
  else fallback();
  function fallback() { const i = document.createElement('textarea'); i.value = ca; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); done(); } catch (e) {} i.remove(); }
}
function projectInfo(p) {
  if (!p || !p.ca) return;
  const nav = $('#proj');
  nav.innerHTML = `<button class="navbtn ca" data-ca="${esc(p.ca)}" title="${esc(t('ca_copy'))}: ${esc(p.ca)}"><span>CA</span><b>${esc(short(p.ca))}</b>${COPYICON}</button>`;
  nav.hidden = false;
  document.querySelectorAll('[data-ca]').forEach(b => b.addEventListener('click', () => copyCA(b.dataset.ca)));
}
function toast(m) { let e = $('.toast'); if (!e) { e = document.createElement('div'); e.className = 'toast'; document.body.appendChild(e); } e.textContent = m; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 1600); }
async function copy(s) { try { await navigator.clipboard.writeText(s); toast(t('copied')); } catch (e) { toast(s); } }
const explorer = (r, a, kind) => !r || !r.explorer ? null : r.chain === 'solana' ? r.explorer + (kind === 'token' ? '/token/' : '/account/') + a : r.explorer + (kind === 'token' ? '/token/' : '/address/') + a;
// token logo; when there is none (or it fails to load) a mono identicon derived from the address
function identicon(seed) {
  let h = 2166136261; const str = String(seed || '?'); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let cells = '';
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    if ((h >>> 0) % 100 < 48) { cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`; if (x < 2) cells += `<rect x="${4 - x}" y="${y}" width="1" height="1"/>`; }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 7 7"><rect x="-1" y="-1" width="7" height="7" fill="#0a0a0a"/><g fill="#e6e6e6">${cells}</g></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const tokImg = (src, sym, addr) => {
  const fb = identicon(addr || sym);
  return src ? `<img class="tok-img" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fb}';this.classList.add('idn')">`
    : `<img class="tok-img idn" src="${fb}" alt="">`;
};

let CHAINS = [];
let timers = [], stages = [];
const clearTimers = () => { timers.forEach(x => { clearTimeout(x); clearInterval(x); cancelAnimationFrame(x); }); timers = []; stages.forEach(s => s.stop()); stages = []; };

// ---------------------------------------------------------------- router
const routes = [
  [/^\/$/, home], [/^\/t\/([a-z]+)\/([0-9A-Za-z]+)\/?$/, tokenView], [/^\/w\/([0-9A-Za-z]+)\/?$/, walletView],
  [/^\/radar\/?$/, radarView], [/^\/cabals\/?$/, cabalsView], [/^\/cam\/?$/, camView], [/^\/replay\/?$/, replayView], [/^\/molt\/?$/, moltView], [/^\/spider(?:\/([0-9A-Za-z]+))?\/?$/, spiderView], [/^\/docs\/?$/, docsView],
];
function go(path, replace) { if (replace) history.replaceState(null, '', path); else history.pushState(null, '', path); render(); }
function render() {
  clearTimers(); closeSide();
  const p = location.pathname;
  document.querySelectorAll('.nav nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === p || (a.getAttribute('href') === '/' && p.startsWith('/t/'))));
  for (const [re, fn] of routes) { const m = p.match(re); if (m) { window.scrollTo(0, 0); return fn(...m.slice(1)); } }
  $('#view').innerHTML = '<div class="empty" style="padding:80px 0">404</div>';
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link], a[href^="/t/"], a[href^="/w/"]');
  if (a && a.origin === location.origin && !e.metaKey && !e.ctrlKey && a.target !== '_blank') { e.preventDefault(); go(a.getAttribute('href')); }
});
window.addEventListener('popstate', render);
function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(e => e.textContent = t(e.dataset.i18n));
  root.querySelectorAll('[data-ph]').forEach(e => e.placeholder = t(e.dataset.ph));
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  document.documentElement.lang = lang;
}
document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.l; try { localStorage.setItem('swarm_lang', lang); } catch (e) {} applyI18n(); render(); }));

// ---------------------------------------------------------------- home
function searchBox(value = '', chain = 'auto') {
  const one = CHAINS.length === 1;
  return `<form class="search" id="sf" autocomplete="off">
    <input id="ca" spellcheck="false" ${one ? `placeholder="${esc(CHAINS[0].name)} · 0x… token address"` : 'data-ph="ph"'} value="${esc(value)}" aria-label="token address">
    <select id="ch" aria-label="chain" ${one ? 'hidden' : ''}>${one ? '' : `<option value="auto">${esc(t('auto'))}</option>`}${CHAINS.map(c => `<option value="${c.id}" ${c.id === chain ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <button class="btn" id="go">${esc(t('scan'))}</button></form><div class="err" id="err"></div>`;
}
function bindSearch() {
  $('#sf').addEventListener('submit', e => {
    e.preventDefault();
    const ca = $('#ca').value.trim(); if (!ca) return;
    const ch = $('#ch').value;
    startScan(ca, !ch || ch === 'auto' ? null : ch);
  });
}
async function home() {
  $('#view').innerHTML = `
  <section id="engroot"></section>
  <section class="section"><div class="head"><h2>${esc(t('radar_t'))}</h2><span class="live-dot"></span><span class="dim mono" style="font-size:12px">${esc(t('radar_sub'))}</span><span class="sp"></span><a href="/radar" data-link class="mono" style="font-size:12px">${esc(t('radar_all'))}</a></div><div class="rsbox" id="scope"></div><div class="radar gwdeck" id="rad"></div></section>
  <section class="section"><div class="head"><h2>${esc(t('recent_t'))}</h2></div><div class="radar" id="recent"></div></section>
  ${mcpBox()}`;
  stages.push(SwarmEngine($('#engroot'), { search: searchBox() }));
  applyI18n(); bindSearch();
  const scope = mountScope($('#scope'), '#rad'), deck = radarDeck($('#rad'), 8);
  const loadRadar = () => document.hidden ? 0 : api('https://app-server-sandy.vercel.app/api/radar').then(d => { if (!$('#rad')) return; const f = d.feed || []; scope.update(f, d.enabled); deck(f, d.enabled); }).catch(() => {});
  loadRadar(); timers.push(setInterval(loadRadar, 6000));
  api('https://app-server-sandy.vercel.app/api/recent?limit=12&source=user').then(d => { $('#recent').innerHTML = (d.scans || []).map(scanCard).join('') || '<div class="empty">—</div>'; }).catch(() => {});
}
function scanCard(s) {
  return `<a class="rc" href="/t/${esc(s.chain)}/${esc(s.token)}"><span class="bar" style="background:${BANDC[s.band] || '#333'}"></span>
    <div class="top">${tokImg(s.image, s.symbol, s.token)}<span class="nm">${esc(s.symbol || s.name || short(s.token))}</span><span class="band ${esc(s.band)}">${esc(bandLabel(s.band))} ${s.score ?? ''}</span></div>
    <div class="hl">${esc(s.headline || '')}</div>
    <div class="meta"><span>${esc(s.chain)}</span><span>${s.wallets ?? '—'}→${s.hands ?? '—'} hands</span><span>${ago(s.ts)}</span></div></a>`;
}
function radarCard(r) {
  const st = r.band ? `<span class="band ${esc(r.band)}">${esc(bandLabel(r.band))} ${r.score ?? ''}</span>` : `<span class="pending">${esc(r.status === 'scanning' ? t('scanning_s') : r.status === 'error' ? t('error_s') : t('queued'))}</span>`;
  return `<a class="rc" href="/t/${esc(r.chain)}/${esc(r.token)}"><span class="bar" style="background:${BANDC[r.band] || '#2a2a2a'}"></span>
    <div class="top">${tokImg(r.image, r.symbol || r.name, r.token)}<span class="nm">${esc(r.symbol || (r.name || '').split(' / ')[0] || short(r.token))}</span>${st}</div>
    <div class="hl">${esc(r.headline || r.error || short(r.token))}</div>
    <div class="meta"><span>${esc(r.chain)}</span><span>liq ${usd(r.liquidity_usd)}</span><span>${ago(r.created_ts || r.seen_ts)}</span></div></a>`;
}

// Launch radar: PPI radar scope + animated card deck (stagger entrance, counters, verdict scramble)
function mountScope(box, listSel) {
  if (!window.RadarScope) return { update() {} };
  const r = RadarScope(box, {
    chains: CHAINS,
    chain: CHAINS.length === 1 ? CHAINS[0].name : 'multi-chain',
    onOpen: it => go(`/t/${it.chain}/${it.token}`),
    onHover: it => document.querySelectorAll(listSel + ' .rc').forEach(c => c.classList.toggle('hot', !!it && c.dataset.k === it.chain + ':' + it.token)),
  });
  stages.push(r);
  return r;
}
function scramble(el, text, ms = 700) {
  const G = '01#$%&*<>/\\=+ABCDEFX', t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / ms), n = Math.floor(k * text.length);
    el.textContent = text.slice(0, n) + Array.from(text.slice(n), c => c === ' ' ? ' ' : G[Math.random() * G.length | 0]).join('');
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function radarDeck(el, max) {
  let prev = null;                                   // key -> band of the previous render
  return (feed, enabled) => {
    if (!el.isConnected) return;
    const list = feed.slice(0, max);
    if (!list.length) { el.innerHTML = `<div class="empty">${esc(enabled ? t('radar_empty') : t('radar_off'))}</div>`; prev = new Map(); return; }
    let i = 0;
    el.innerHTML = list.map(x => {
      const k = x.chain + ':' + x.token, isNew = !prev || !prev.has(k), landed = prev && prev.has(k) && !prev.get(k) && x.band;
      return radarCard(x).replace('class="rc"', `class="rc${isNew ? ' enter' : ''}${landed ? ' landed' : ''}" data-k="${esc(k)}" style="--i:${isNew ? i++ : 0}"`);
    }).join('');
    el.querySelectorAll('.rc.landed .band').forEach(b => scramble(b, b.textContent));
    if (!prev) el.querySelectorAll('.rc .band').forEach(b => scramble(b, b.textContent, 900));
    prev = new Map(list.map(x => [x.chain + ':' + x.token, x.band || '']));
  };
}

// ---------------------------------------------------------------- scan flow
async function startScan(ca, chain, fresh) {
  $('#err') && ($('#err').textContent = '');
  const btn = $('#go'); if (btn) { btn.disabled = true; btn.textContent = t('scanning'); }
  try {
    const d = await api('/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: ca, chain, fresh: !!fresh }) });
    const ev = await api('/api/events?job=' + d.job + '&after=0');
    history.pushState(null, '', `/t/${ev.chain}/${ev.token}`);
    crawlView(d.job, ev.chain, ev.token);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = t('scan'); }
    if ($('#err')) $('#err').textContent = '✕ ' + e.message; else toast(e.message);
  }
}
async function tokenView(chain, token) {
  token = token.startsWith('0x') ? token.toLowerCase() : token;
  // a stored scan younger than 10 min is shown directly; otherwise start one (the server dedups)
  try {
    const d = await api(`/api/token/${chain}/${token}`);
    if (d.result && Date.now() / 1000 - d.result.scanned_at < 600) return resultView(d.result, d.history);
  } catch (e) {}
  $('#view').innerHTML = pageHead({ title: 'SCAN', sub: esc(short(token)), tail: searchBox(token, chain) });
  applyI18n(); bindSearch();
  startScan(token, chain);
}
function crawlView(job, chain, token) {
  clearTimers();
  $('#view').innerHTML = `${pageHead({ title: 'LIVE CRAWL', sub: `<span class="mono" style="color:#fff">${esc(short(token))}</span> · ${esc(chain || 'auto')} · six agents crawl the holder ring, the judge decides`, crumbs: ['RESOLVE', 'SCOUT', 'TRACE', 'LINK', 'AUDIT', 'JUDGE'], on: 0, tail: searchBox(token, chain) })}
    <div class="arena">
      <div class="stagebox"><canvas id="torus"></canvas><canvas id="stage" hidden></canvas>
        <div class="stage-tabs"><button class="on" data-tab="torus">${esc(t('tab_torus'))}</button><button data-tab="stage">${esc(t('tab_agents'))}</button></div>
        <button class="btn sm viewbtn" id="viewres" hidden>${esc(t('view_result'))}</button></div>
      <div class="side-col">
        <div class="card roster"><h2 style="margin-bottom:8px">${esc(t('agents_t'))} <span class="dim">· ${esc(t('agents_sub'))}</span></h2><div id="roster"></div></div>
        <div class="term" id="term"></div>
      </div>
    </div>`;
  applyI18n(); bindSearch();
  $('#go').disabled = true; $('#go').textContent = t('scanning');
  const roster = list => { const el = $('#roster'); if (!el) return; el.innerHTML = list.map(a => `<div class="agent ${a.status}"><span class="adot" style="background:${a.color}"></span><b class="mono">${esc(a.name)}</b><span class="dim role">${esc(a.role)}</span><span class="sp"></span><span class="mono ast">${a.status === 'working' ? '● ' + a.count : a.status === 'done' ? '✓ ' + a.count : 'idle'}</span></div>`).join(''); };
  const torus = DecisionTorus($('#torus'), { chain, title: 'SWARM ENGINE // ' + short(token) });
  const stage = SwarmStage($('#stage'), { token, onAgents: roster });
  stages.push(torus, stage); roster(stage.agents());
  $('#view').querySelectorAll('.stage-tabs button').forEach(b => b.addEventListener('click', () => {
    $('#view').querySelectorAll('.stage-tabs button').forEach(x => x.classList.toggle('on', x === b));
    $('#torus').hidden = b.dataset.tab !== 'torus'; $('#stage').hidden = b.dataset.tab !== 'stage';
    window.dispatchEvent(new Event('resize'));
  }));
  let after = 0, result = null;
  const crumb = e => { const i = e.type === 'stage' ? { token: 0, holders: 1, wallets: 2, funders: 2, analysis: 3, security: 4 }[e.detail] : e.type === 'judge' || e.type === 'done' ? 5 : null;
    if (i != null) $('#view').querySelectorAll('[data-cr]').forEach(x => x.classList.toggle('on', +x.dataset.cr === i)); };
  const show = () => { if (result) resultView(result.r, result.hist); };
  const poll = async () => {
    try {
      const d = await api(`/api/events?job=${job}&after=${after}`);
      (d.events || []).forEach(e => { logEvent(e); stage.push(e); torus.push(e); crumb(e); });
      after += (d.events || []).length;
      if (d.done) {
        const r = await api('/api/result?job=' + job);
        if (r.error) { $('#go').disabled = false; $('#go').textContent = t('scan'); $('#err').textContent = '✕ ' + r.error; return; }
        let hist = [];
        try { hist = (await api(`/api/token/${r.result.chain}/${r.result.token}`)).history; } catch (e) {}
        result = { r: r.result, hist };
        const btn = $('#viewres'); if (btn) { btn.hidden = false; btn.addEventListener('click', show); }
        const wait = () => { if (!result || !$('#stage')) return; if (stage.pending()) return timers.push(setTimeout(wait, 300)); timers.push(setTimeout(show, 2600)); };
        wait();
        return;
      }
    } catch (e) { $('#err') && ($('#err').textContent = '✕ ' + e.message); return; }
    timers.push(setTimeout(poll, 350));
  };
  poll();
}
function logEvent(e) {
  const term = $('#term'); if (!term) return;
  let msg = e.detail || '';
  const who = { stage: 'SWARM', holders: 'SCOUT', wallet: 'TRACER', link: 'LINKER', cluster: 'LINKER', memory: 'MEMORY', judge: 'JUDGE', done: 'JUDGE', info: 'SWARM', error: 'ERROR' }[e.type] || e.type.toUpperCase();
  if (e.type === 'stage') msg = '▸ ' + msg;
  if (e.type === 'wallet') msg = short(e.wallet) + '  ' + msg + (e.funder ? '  ← ' + short(e.funder) : '');
  if (e.type === 'link') msg = `${e.detail}  ${short(e.a)} ⇄ ${short(e.b)}`;
  if (e.type === 'judge') msg = `{"decision":"${e.decision}","confidence":${e.confidence}}`;
  if (e.type === 'done') msg = `${bandLabel(e.band)} ${e.score ?? ''}/100 — ${e.headline}`;
  const d = document.createElement('div');
  d.innerHTML = `<span class="t">${(e.t / 1000).toFixed(1)}s</span><span class="who">${esc(who)}</span><span class="k-${esc(e.type)}">${esc(msg)}</span>`;
  term.appendChild(d); term.scrollTop = term.scrollHeight;
}
function judgeCard(j) {
  if (!j) return '';
  const col = '#ffffff';
  const bar = (k, v) => `<div class="jrow"><span class="mono">${k}</span><span class="b"><i style="width:${(v * 100).toFixed(0)}%;background:${{ avoid: '#ffffff', caution: '#9a9a9a', ok: '#4a4a4a' }[k]}"></i></span><span class="mono">${(v * 100).toFixed(1)}%</span></div>`;
  const f = j.features || {};
  const json = JSON.stringify({ model: j.model, decision: j.decision, confidence: j.confidence, p: j.p }, null, 0);
  return `<div class="card judge"><div class="row"><h2>${esc(t('judge_t'))}</h2><span class="dim mono" style="font-size:11px">${esc(t('judge_sub'))}</span></div>
    <div class="jdec" style="color:${col};text-shadow:0 0 22px ${col}66">${esc(j.decision)}</div>
    ${['avoid', 'caution', 'ok'].map(k => bar(k, j.p[k] || 0)).join('')}
    ${evidenceHtml(j)}
    <div class="row" style="margin:8px 0 2px"><span class="chip ${j.escalate ? 'honey' : 'mint'}">${esc(j.escalate ? t('tri_esc') : t('tri_act'))}</span><span class="chip">bar ${j.bar ?? '—'}</span><span class="chip">${j.latency_ms ?? '—'} ms</span><span class="chip">$${(j.cost_usd ?? 0).toFixed(2)}</span></div>
    <div class="mono dim" style="font-size:11px;margin:4px 0">${esc(t('receipt'))} <span style="color:#fff">${esc(j.receipt || '')}</span></div>
    <pre class="code jjson">${esc(json)}</pre>
    ${j.escalate ? `<button class="btn ghost sm" id="copyllm">⧉ ${esc(t('copy_llm'))}</button>` : ''}
    <div class="dim mono" style="font-size:11px">${Object.entries(f).filter(([, v]) => v != null).map(([k, v]) => `${esc(k)}=${esc(typeof v === 'number' ? +v.toFixed(3) : v)}`).join(' · ')}</div></div>`;
}
// decision X-ray: waterfall of the raw mass each piece of evidence added before normalisation
function evidenceHtml(j) {
  const ev = j.evidence || []; if (!ev.length) return '';
  const base = ev[0], rows = [['base avoid · ' + base.k, base.avoid, 0]];
  let acc = base.avoid;
  ev.slice(1).forEach(e => { rows.push(['+ ' + e.k, e.avoid, acc]); acc += e.avoid; });
  const tot = acc + (base.caution || 0) + (base.ok || 0), max = Math.max(acc, 1);
  return `<div class="xr"><div class="xr-h mono">decision x-ray <span class="dim">raw avoid mass → normalised</span></div>
    ${rows.map(([k, v, off], i) => `<div class="xr-r" style="--i:${i}"><span class="mono xr-k">${esc(k)}</span><span class="xr-b"><i style="left:${(off / max * 100).toFixed(1)}%;width:${(v / max * 100).toFixed(1)}%"></i></span><span class="mono">+${v.toFixed(2)}</span></div>`).join('')}
    <div class="xr-r xr-sum"><span class="mono xr-k">= avoid ${acc.toFixed(2)} / total ${tot.toFixed(2)}</span><span class="xr-b"><i style="left:0;width:${(acc / max * 100).toFixed(1)}%"></i></span><span class="mono">${((acc / tot) * 100).toFixed(1)}%</span></div></div>`;
}
function mcpBox() {
  const url = location.origin + '/mcp';
  return `<section class="section"><div class="card mcp"><div class="row"><span class="chip mint">MCP</span><h2>${esc(t('mcp_t'))}</h2></div>
    <p class="muted" style="margin:8px 0 10px">${esc(t('mcp_sub'))}</p>
    <pre class="code">{ "mcpServers": { "swarm": { "type": "http", "url": "${esc(url)}" } } }</pre>
    <div class="dim mono" style="font-size:12px">tools: swarm_scan · swarm_radar · swarm_wallet · swarm_cabals · feed: <a href="https://app-server-sandy.vercel.app/api/agent/feed" target="_blank">/api/agent/feed</a></div></div></section>`;
}

// shared page header: same grammar as the decision engine header
function pageHead({ title, sub = '', kpis = [], crumbs = null, on = -1, tail = '', live = true }) {
  return `<section class="phead"><div class="phead-top"><div class="eng-title"><h1 class="scr">SWARM <em>// ${esc(title)}</em></h1>${sub ? `<p>${sub}</p>` : ''}</div>
    ${kpis.length || live ? `<div class="eng-kpis">${kpis.map(([l, v]) => `<div><span>${esc(l)}</span><b class="cnt">${v}</b></div>`).join('')}${live ? '<div class="eng-live"><i></i>LIVE</div>' : ''}</div>` : ''}</div>
    ${crumbs ? `<div class="crumbs">${crumbs.map((c, i) => `<span class="${i === on ? 'on' : ''}" data-cr="${i}">${esc(c)}</span>`).join('<b>›</b>')}</div>` : ''}
    ${tail ? `<div class="tail">${tail}</div>` : ''}</section>`;
}

// ---------------------------------------------------------------- result
function resultView(r, hist) {
  clearTimers();
  const h = r.header || {}, m = r.metrics || {};
  const col = '#ffffff', C = 2 * Math.PI * 72, dash = r.score == null ? 0 : C * r.score / 100;
  const multi = (r.clusters || []).filter(c => c.wallets.length > 1);
  const ccol = {}; multi.forEach((c, i) => ccol[c.id] = SW[i % SW.length]);
  const tokUrl = explorer(r, r.token, 'token');
  const W = { swarm: 30, fresh: 20, insiders: 15, concentration: 15, snipers: 10, dev: 10 };
  const chg = h.change24h;
  const shareUrl = location.origin + `/t/${r.chain}/${r.token}?s=${r.scanned_at}`;   // one URL per scan: X / Telegram fetch a fresh verdict card instead of a cached one
  const tweet = `${h.symbol ? '$' + h.symbol + ' ' : ''}${m.wallets ?? ''} holders → ${m.hands ?? '?'} real hands. ${bandLabel(r.band)} ${r.score ?? ''}/100 on SWARM 🐝\n${r.reason || ''}`;
  $('#view').innerHTML = `
  ${pageHead({ title: 'VERDICT', live: false, kpis: [['score', `${r.score ?? '—'}`], ['hands', `${m.hands ?? '—'}/${m.wallets ?? '—'}`], ['judge', esc(r.judge?.decision || '—')]], crumbs: ['RESOLVE', 'SCOUT', 'TRACE', 'LINK', 'AUDIT', 'JUDGE'], on: 5,
    tail: `<div class="tokhead">${tokImg(h.image, h.symbol, r.token)}
    <div style="flex:1;min-width:220px"><div class="row"><span class="nm">${esc(h.name || 'Unknown')}</span><span class="sym">${h.symbol ? '$' + esc(h.symbol) : ''}</span><span class="chip">${esc(r.chain_name)}</span><span class="band ${esc(r.band)}">${esc(bandLabel(r.band))}</span></div>
      <div class="ca">${esc(r.token)} <button data-copy="${esc(r.token)}" title="copy">⧉</button>${tokUrl ? ` · <a href="${esc(tokUrl)}" target="_blank" rel="noopener">explorer ↗</a>` : ''}${h.dex_url ? ` · <a href="${esc(h.dex_url)}" target="_blank" rel="noopener">dexscreener ↗</a>` : ''}
      ${(h.socials || []).slice(0, 3).map(s => ` · <a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.type || 'link')} ↗</a>`).join('')}</div></div>
    <div class="row" style="gap:8px"><button class="btn ghost sm${isWatched(r.chain, r.token) ? ' on' : ''}" id="watch">${isWatched(r.chain, r.token) ? '◉ watching' : '◎ watch'}</button><button class="btn ghost sm" id="rescan">↻ ${esc(t('fresh'))}</button></div></div>` })}
  <div class="kpis">${[['price', usd(h.price_usd)], ['mcap', usd(h.mcap)], ['liq', usd(h.liquidity_usd)], ['vol', usd(h.vol24h) + (chg != null ? ` <span class="${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%</span>` : '')], ['age', age(h.age_h)], ['holders_n', h.holders_count != null ? h.holders_count.toLocaleString() : '—']].map(([k, v]) => `<div class="kpi"><div class="l">${esc(t(k))}</div><div class="v">${v}</div></div>`).join('')}</div>
  <div class="main">
    <div class="mapbox" id="mapbox"><canvas id="map"></canvas><div class="tip" id="tip"></div>
      <div class="maptitle"><b>${m.wallets ?? 0}</b> ${esc(t('hands_a'))} <b>${m.hands ?? 0}</b> ${esc(t('hands_b'))} · <span class="dim">${esc(t('map_hint'))}</span></div>
      <div class="maplegend"><span><b class="lg-star">✦</b>${esc(t('lg_funder'))}</span><span><i style="background:#fff"></i>${esc(t('lg_bundle'))}</span><span><i style="background:repeating-linear-gradient(90deg,#bbb 0 4px,transparent 4px 7px)"></i>${esc(t('lg_pack'))}</span><span><i class="lg-ring"></i>${esc(t('lg_dev'))}</span><span><i class="lg-moon"></i>fresh</span><span><i class="lg-hole"></i>swarm = gravity well</span></div></div>
    <div class="grid" style="align-content:start">
      <div class="card verdict">
        <div class="ring"><svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="72" fill="none" stroke="#161616" stroke-width="14"/><circle cx="85" cy="85" r="72" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${dash} ${C}"/></svg>
          <div class="n"><b style="color:${col}">${r.score ?? '—'}</b><span>/ 100</span></div></div>
        <div style="margin-top:10px"><span class="band ${esc(r.band)}">${esc(bandLabel(r.band))}</span></div>
        <div class="hands"><b>${m.wallets ?? 0}</b> ${esc(t('hands_a'))} <b>${m.hands ?? 0}</b> ${esc(t('hands_b'))}</div>
        <div class="reason">${esc(r.reason)}</div>
      </div>
      ${judgeCard(r.judge)}
      <div class="card"><h2 style="margin-bottom:8px">${esc(t('parts'))}</h2>
        ${Object.keys(W).map(k => { const v = (r.parts || {})[k], q = v == null ? 0 : v / W[k]; const c = q >= .75 ? '#5a5a5a' : q >= .4 ? '#b4b4b4' : '#ffffff'; return `<div class="part"><span class="k">${k}</span><span class="b"><i style="width:${(q * 100).toFixed(0)}%;background:${c}"></i></span><span class="p"><b>${v ?? '—'}</b>/${W[k]}</span></div>`; }).join('')}
        <h2 style="margin:14px 0 6px">${esc(t('rules'))}</h2>
        ${(r.gates || []).length ? `<ul class="gates">${r.gates.map(g => `<li class="${g.startsWith('soft:') ? '' : 'hard'}">${esc(g.replace(/^soft: /, ''))}</li>`).join('')}</ul>` : `<div class="empty">${esc(t('none_rules'))}</div>`}
      </div>
    </div>
  </div>
  ${timeMachineHtml(r)}
  <div class="grid g2 section">
    <div class="card"><h2 style="margin-bottom:6px">${esc(t('swarms'))} · ${multi.length}</h2>
      ${multi.length ? multi.map(c => `<div class="sw" data-cluster="${c.id}"><div class="row"><span class="dot" style="background:${ccol[c.id]}"></span><b class="mono">${c.wallets.length} ${esc(t('wallets_'))}</b><span class="chip ${c.level === 'proven' ? 'mint' : 'honey'}">${esc(c.level)}</span><span class="sp"></span><b class="mono">${pct(c.share)}</b><span class="dim mono" style="font-size:11px">float</span></div>
        <div class="dim mono" style="font-size:11px;margin-top:4px">${c.wallets.slice(0, 8).map(short).join(' · ')}${c.wallets.length > 8 ? ' …' : ''}</div>
        <div class="mono" style="font-size:11px;margin-top:3px;color:var(--muted)">${[...new Set((r.links || []).filter(l => c.wallets.includes(l.a)).map(l => l.kind))].join(' · ')}</div></div>`).join('') : `<div class="empty">${esc(t('no_swarms'))}</div>`}
    </div>
    <div class="card"><h2 style="margin-bottom:6px">${esc(t('security'))}</h2>
      ${(r.security?.checks || []).length ? r.security.checks.map(c => `<div class="check"><div>${icon(c.level)}</div><div><div class="t">${esc(c.title)}</div>${c.detail ? `<div class="d">${esc(c.detail)}</div>` : ''}</div></div>`).join('') : `<div class="empty">${esc(t('sec_na'))}</div>`}
    </div>
  </div>
  <div class="section"><div class="head"><h2>${esc(t('holders'))} · ${(r.holders || []).length}</h2></div>
    <div class="card tblwrap" style="padding:6px 8px"><table class="tbl"><thead><tr><th>#</th><th>${esc(t('wallet'))}</th><th class="num">${esc(t('float'))}</th><th>${esc(t('entry'))}</th><th class="num hide-sm">${esc(t('txs'))}</th><th>${esc(t('flags'))}</th><th>${esc(t('swarm'))}</th></tr></thead><tbody>
    ${(r.holders || []).map((x, i) => { const s = x.signals || {}; const fl = [s.dev && '<span class="chip sky">creator</span>', s.fresh && '<span class="chip honey">fresh</span>', s.sniper && '<span class="chip rose">sniper</span>', s.insider && '<span class="chip violet">insider</span>', s.contract && '<span class="chip">contract</span>', s.unread && '<span class="chip">unread</span>'].filter(Boolean).join(' ');
      return `<tr><td class="dim mono">${i + 1}</td><td><a href="/w/${esc(x.address)}" class="w" title="${esc(x.address)}">${esc(short(x.address))}</a>${x.label ? ` <span class="dim" style="font-size:11px">${esc(x.label)}</span>` : ''}</td><td class="num">${pct(x.share)}</td>
      <td><span class="chip ${s.kind === 'buy' ? 'mint' : s.kind === 'transfer' ? 'honey' : ''}">${esc(s.kind || '?')}</span></td><td class="num hide-sm">${s.tx_count ?? '—'}</td><td>${fl || '<span class="dim">—</span>'}</td>
      <td>${ccol[x.cluster] ? `<span class="dot" style="background:${ccol[x.cluster]}"></span>` : '<span class="dim">—</span>'}</td></tr>`; }).join('')}</tbody></table></div></div>
  <div class="grid g2 section">
    <div class="card"><h2 style="margin-bottom:6px">${esc(t('memory'))}</h2>${memoryHtml(r)}</div>
    <div class="card"><h2 style="margin-bottom:6px">${esc(t('infra'))}</h2>${(r.infra || []).filter(x => x.share_supply).map(x => `<div class="row mono" style="font-size:12px;padding:4px 0"><span>${esc(short(x.address))}</span><span class="dim">${esc(x.label)}</span><span class="sp"></span><span>${pct(x.share_supply)}</span></div>`).join('') || '<div class="empty">—</div>'}</div>
  </div>
  <div class="section" id="rpsec" hidden><div class="head"><h2 id="rph">Rug Replay</h2></div><div class="card" id="rp"></div></div>
  <div class="section"><div class="head"><h2>Deployer DNA</h2><span class="chip">beta</span></div><div class="card" id="dna"><div class="empty">reading the creator's past launches…</div></div></div>
  <div class="section"><div class="head"><h2>${esc(t('share'))}</h2></div>
    <div class="grid g2"><img class="cardprev" id="cardimg" src="/api/card/${esc(r.chain)}/${esc(r.token)}.svg?v=${r.scanned_at}" alt="share card">
      <div class="toolbar" style="align-content:start">
        <a class="btn sm" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}">𝕏 ${esc(t('share_x'))}</a>
        <button class="btn ghost sm" id="dl">⬇ ${esc(t('dl_card'))}</button>
        <button class="btn ghost sm" id="getbadge">🕷 Get badge</button>
        <button class="btn ghost sm" data-copy="${esc(shareUrl)}">⧉ ${esc(t('copy'))}</button>
        <a class="btn ghost sm" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(tweet)}">Telegram ↗</a>
        <div class="dim mono" style="font-size:11px;width:100%;margin-top:6px">${r.elapsed_s}s · ${r.requests} requests · ${new Date(r.scanned_at * 1000).toLocaleString()}</div>
      </div></div></div>
  ${(hist || []).length > 1 ? `<div class="section"><div class="head"><h2>${esc(t('history'))}</h2></div><div class="card tblwrap" style="padding:6px 8px"><table class="tbl"><tbody>${hist.map(x => `<tr><td class="mono dim">${new Date(x.ts * 1000).toLocaleString()}</td><td><span class="band ${esc(x.band)}">${esc(bandLabel(x.band))} ${x.score ?? ''}</span></td><td class="num">${x.wallets ?? '—'}→${x.hands ?? '—'}</td><td class="num">${usd(x.mcap)}</td><td class="num">${usd(x.liquidity_usd)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
  $('#view').querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); copy(b.dataset.copy); }));
  $('#rescan').addEventListener('click', () => startScan(r.token, r.chain, true));
  $('#watch').addEventListener('click', () => { const on = watchToggle(r); $('#watch').classList.toggle('on', on); $('#watch').textContent = on ? '◉ watching' : '◎ watch'; toast(on ? 'watching · alerts on verdict / swarm changes' : 'removed from watchlist'); });
  { const L = watchList(), it = L.find(x => x.chain === r.chain && x.token === r.token); if (it && (it.changed || (r.scanned_at > (it.ts || 0)))) { delete it.changed; it.snap = snap(r); it.ts = r.scanned_at; watchSave(L); } }
  $('#dl').addEventListener('click', () => downloadCard(r));
  loadDna(r); loadReplay(r);
  $('#getbadge').addEventListener('click', () => badgePanel(r));
  $('#copyllm')?.addEventListener('click', () => copy(`You are reviewing a token for a trader. SWARM's fast judge was not confident enough and escalated this case to you. Read the facts and answer in 3 short bullet points: the main risk, what would change the decision, and a final call (avoid / small size / ok).\n\n${JSON.stringify({ token: r.token, chain: r.chain, symbol: h.symbol, judge: { decision: r.judge.decision, p: r.judge.p, receipt: r.judge.receipt }, features: r.judge.features, rules: r.gates, swarms: multi.slice(0, 3).map(c => ({ size: c.wallets.length, share: +c.share.toFixed(3), evidence: c.level })), contract: (r.security?.checks || []).filter(c => c.level === 'warn' || c.level === 'danger').map(c => c.title) }, null, 1)}`));
  const bm = bubbleMap($('#map'), r, ccol);
  $('#view').querySelectorAll('[data-cluster]').forEach(el => el.addEventListener('click', () => bm.focus(+el.dataset.cluster)));
  timeMachine(r, bm, multi);
}
// ---------------------------------------------------------------- holder time machine
function timeMachineHtml(r) {
  const tl = r.timeline;
  if (!tl || !tl.blocks || tl.blocks.length < 2 || !Object.keys(tl.share || {}).length) return '';
  const n = tl.blocks.length;
  return `<div class="card tm"><div class="row"><h2>time machine</h2><span class="dim mono" style="font-size:11px">replay of every holder since launch</span></div>
    <div class="tm-row"><button class="btn sm" id="tmplay" aria-label="play">▶</button><input type="range" id="tmr" min="0" max="${n - 1}" value="${n - 1}" aria-label="time">
      <span class="mono tm-t" id="tmt">now</span></div>
    <canvas id="tmspark"></canvas>
    <div class="tm-kv mono"><span>top holders <b id="tmtop">—</b></span><span>biggest swarm <b id="tmsw">—</b></span><span>block <b id="tmb">—</b></span><span class="dim">% of total supply · solid = top holders · dashed = biggest swarm</span></div></div>`;
}
function timeMachine(r, bm, multi) {
  const tl = r.timeline, rng = $('#tmr'); if (!rng) return;
  const n = tl.blocks.length, ids = Object.keys(tl.share), last = n - 1;
  const top = Array.from({ length: n }, (_, i) => ids.reduce((a, w) => a + tl.share[w][i], 0));
  const big = multi.length ? multi.reduce((a, c) => (c.share > a.share ? c : a), multi[0]) : null;
  const swl = Array.from({ length: n }, (_, i) => big ? big.wallets.reduce((a, w) => a + ((tl.share[w] || [])[i] || 0), 0) : 0);
  const cv = $('#tmspark'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const draw = i => {
    const w = cv.clientWidth, h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mx = Math.max(0.01, ...top);
    const line = (arr, st, dash) => { g.beginPath(); arr.forEach((v, k) => { const x = k / last * (w - 2) + 1, y = h - 3 - v / mx * (h - 8); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = st; g.setLineDash(dash); g.lineWidth = 1.4; g.stroke(); g.setLineDash([]); };
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, i / last * w, h);
    line(top, '#fff', []); if (big) line(swl, '#9a9a9a', [3, 3]);
    const x = i / last * (w - 2) + 1; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, h - 3 - top[i] / mx * (h - 8), 3, 0, 6.29); g.fill();
  };
  const set = i => {
    i = Math.max(0, Math.min(last, i)); rng.value = i;
    const fin = w => tl.share[w][last];
    bm.scale(i === last ? null : id => { const s = tl.share[id]; if (!s) return 1; const f = fin(id); return f > 0 ? Math.min(2.2, Math.sqrt(s[i] / f)) : (s[i] > 0 ? 1 : 0); });
    $('#tmt').textContent = i === last ? 'now' : tl.t[i] ? new Date(tl.t[i] * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : `frame ${i + 1}/${n}`;
    $('#tmtop').textContent = (top[i] * 100).toFixed(1) + '%'; $('#tmsw').textContent = big ? (swl[i] * 100).toFixed(1) + '%' : '—';
    $('#tmb').textContent = tl.blocks[i].toLocaleString();
    draw(i);
  };
  let playing = 0;
  const stop = () => { clearInterval(playing); playing = 0; $('#tmplay').textContent = '▶'; };
  $('#tmplay').addEventListener('click', () => {
    if (playing) return stop();
    let i = +rng.value >= last ? 0 : +rng.value; $('#tmplay').textContent = '❚❚'; set(i);
    playing = setInterval(() => { i++; set(i); if (i >= last) stop(); }, 110); timers.push(playing);
  });
  rng.addEventListener('input', () => { stop(); set(+rng.value); });
  set(last);
}

const DNA_LABEL = { danger: 'DANGER', dead: 'DEAD', faded: 'FADED', alive: 'ALIVE', unknown: '?' };
const BCOL = { DANGER: '#ffffff', RISKY: '#d6d6d6', OK: '#19e3c4', CLEAN: '#2f7dff', TOO_EARLY: '#6a6a6a' };
function replayChart(d) {
  const P = d.points.filter(p => p.mcap), W = 900, H = 220, L = 70, R = 20, T = 18, B = 34;
  if (P.length < 1) return '';
  const t0 = Math.min(...d.points.map(p => p.ts)), t1 = Math.max(...d.points.map(p => p.ts), t0 + 60);
  const mx = Math.max(...P.map(p => p.mcap)) * 1.15, X = t => L + (W - L - R) * (t - t0) / (t1 - t0), Y = v => T + (H - T - B) * (1 - v / mx);
  let g = [0, .5, 1].map(k => `<line x1="${L}" x2="${W - R}" y1="${Y(mx * k / 1.15)}" y2="${Y(mx * k / 1.15)}" stroke="#1d1d1d"/><text x="${L - 8}" y="${Y(mx * k / 1.15) + 4}" fill="#666" font-size="10" text-anchor="end" font-family="JetBrains Mono">${usd(mx * k / 1.15)}</text>`).join('');
  const evc = { warning: '#ffffff', collapse: '#ffffff', peak: '#19e3c4', first_scan: '#555' };
  d.events.forEach(e => { const x = X(e.ts); g += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="${evc[e.kind] || '#555'}" stroke-dasharray="${e.kind === 'collapse' ? '0' : '3 4'}" opacity="${e.kind === 'first_scan' ? .5 : .8}"/>`; });
  if (P.length > 1) g += `<path d="M${P.map(p => X(p.ts).toFixed(1) + ',' + Y(p.mcap).toFixed(1)).join(' L')}" fill="none" stroke="#bbb" stroke-width="2"/>`;
  d.points.forEach(p => { if (!p.mcap) return; const c = p.kind === 'now' ? '#000' : (BCOL[p.band] || '#888'); g += `<circle cx="${X(p.ts)}" cy="${Y(p.mcap)}" r="${p.kind === 'now' ? 6 : 5}" fill="${c}" stroke="${p.kind === 'now' ? '#fff' : '#000'}" stroke-width="2"/>`; });
  g += `<text x="${L}" y="${H - 10}" fill="#666" font-size="10" font-family="JetBrains Mono">${new Date(t0 * 1000).toLocaleString()}</text><text x="${W - R}" y="${H - 10}" fill="#666" font-size="10" text-anchor="end" font-family="JetBrains Mono">${d.points[d.points.length - 1].kind === 'now' ? 'now' : new Date(t1 * 1000).toLocaleString()}</text>`;
  return `<svg class="rp-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${g}</svg>`;
}
async function loadReplay(r) {
  const sec = $('#rpsec'); if (!sec) return;
  try {
    const d = await api(`/api/replay/${r.chain}/${r.token}`);
    if (!d.points || d.points.length < 2) return;                       // one scan, nothing to replay yet
    sec.hidden = false; $('#rph').textContent = d.collapsed ? 'Rug Replay' : 'Verdict timeline';
    $('#rp').innerHTML = `<div class="rp-head ${esc(d.tone)}">${esc(d.headline)}</div>${replayChart(d)}
      <div class="rp-ev">${d.events.map(e => `<div class="rp-e ${esc(e.kind)}"><span class="mono dim">${new Date(e.ts * 1000).toLocaleString()}</span><b>${esc(e.label)}</b></div>`).join('')}</div>
      <div class="dim mono" style="font-size:11px;margin-top:10px">${esc(d.note || '')}</div>`;
  } catch (e) { /* replay is a bonus: stay quiet on errors */ }
}
async function replayView() {
  $('#view').innerHTML = `${pageHead({ title: 'RUG REPLAY', sub: 'Tokens SWARM warned about in the last 7 days whose market is gone today. What we said, when we said it, and what happened next.', kpis: [['caught', '<span id="k_rc">0</span>'], ['checked', '<span id="k_rk">0</span>'], ['days', '7']], crumbs: ['SCAN', 'WARN', 'WAIT', 'COLLAPSE', 'REPLAY'], on: 4, live: false })}<div id="rpl" class="rpl"><div class="empty">checking which warned tokens collapsed…</div></div>`;
  try {
    const d = await api('/api/replay?days=7');
    countTo($('#k_rc'), d.items.length); countTo($('#k_rk'), d.checked);
    $('#rpl').innerHTML = d.items.map(x => `<a class="card rpi" href="/t/${esc(x.chain)}/${esc(x.token)}">
      <div class="row"><b class="rpi-s">${esc(x.symbol ? '$' + x.symbol : short(x.token))}</b><span class="dim mono" style="font-size:11px">${esc(x.chain)}</span><span class="sp"></span><span class="dna-out dead">${esc(x.how)}</span></div>
      <div class="rpi-l"><span class="band ${esc(x.warned_band)}" style="font-size:10px;padding:1px 6px">${esc(bandLabel(x.warned_band))} ${x.warned_score ?? ''}</span> SWARM warned ${esc(x.warned_ago)} ago${x.warned_mcap ? ` at ${usd(x.warned_mcap)}` : ''}</div>
      <div class="dim mono" style="font-size:12px">peak ${usd(x.peak_mcap)} → now ${usd(x.mcap_now)} · liquidity ${usd(x.liq_now)}</div></a>`).join('')
      || '<div class="empty">No collapsed tokens among this week\'s warnings. Good week.</div>';
  } catch (e) { $('#rpl').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
async function loadDna(r) {
  const box = $('#dna'); if (!box) return;
  try {
    const d = await api(`/api/dna/${r.chain}/${r.token}`);
    if (!d.creator) { box.innerHTML = '<div class="empty">Creator unknown for this token, so there is no launch history to show.</div>'; return; }
    const S = d.summary || {};
    box.innerHTML = `<div class="dna-head"><span class="dna-flag ${esc(S.flag)}"></span><div><div class="dna-line">${esc(S.line)}</div>
      <div class="dim mono" style="font-size:11px;margin-top:4px">creator <a href="/w/${esc(d.creator)}">${esc(short(d.creator))}</a>${S.count ? ` · ${S.danger} danger · ${S.dead} dead · ${S.faded} faded · ${S.alive} alive` : ''}</div></div></div>
      ${(d.tokens || []).length ? `<div class="tblwrap"><table class="tbl dna-tbl"><thead><tr><th>token</th><th>launched</th><th>verdict</th><th class="num">peak</th><th class="num">now</th><th>how it ended</th></tr></thead><tbody>${d.tokens.map(x => `<tr>
        <td><a href="/t/${esc(r.chain)}/${esc(x.token)}">${esc(x.symbol ? '$' + x.symbol : short(x.token))}</a></td><td class="mono dim">${ago(x.launched)} ago</td>
        <td><span class="band ${esc(x.band)}" style="font-size:10px;padding:1px 6px">${esc(bandLabel(x.band))} ${x.score ?? ''}</span></td>
        <td class="num mono">${usd(x.peak_mcap)}</td><td class="num mono">${usd(x.mcap_now)}</td>
        <td><span class="dna-out ${esc(x.outcome)}">${esc(DNA_LABEL[x.outcome] || x.outcome)}</span> <span class="dim" style="font-size:12px">${esc(x.why)}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
      <div class="dim mono" style="font-size:11px;margin-top:10px">${esc(d.note || '')}</div>`;
  } catch (e) { box.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
function memoryHtml(r) {
  const g = r.memory_groups || [], rw = r.repeat_wallets || [];
  if (!g.length && !rw.length) return `<div class="empty">${esc(t('mem_none'))}</div>`;
  return g.map(x => `<div class="check"><div><span class="ico mem">M</span></div><div><div class="t">${x.wallets.length} ${esc(t('mem_group'))} <a href="/t/${esc(x.chain)}/${esc(x.token)}" class="mono">${esc(short(x.token))}</a></div><div class="d">${x.wallets.map(short).join(' · ')}</div></div></div>`).join('')
    + (rw.length ? `<div class="check"><div><span class="ico mem">R</span></div><div><div class="t">${rw.length} ${esc(t('mem_repeat'))}</div><div class="d">${rw.slice(0, 8).map(x => `<a href="/w/${esc(x.wallet)}">${esc(short(x.wallet))}</a> (${x.count})`).join(' · ')}</div></div></div>` : '');
}
async function downloadCard(r) {
  try {
    const svg = await (await fetch(`/api/card/${r.chain}/${r.token}.svg`)).text();
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
      c.getContext('2d').drawImage(img, 0, 0, 1200, 630);
      c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `swarm-${(r.header?.symbol || r.token.slice(0, 8)).toLowerCase()}.png`; a.click(); });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  } catch (e) { toast(e.message); }
}

// ---------------------------------------------------------------- bubble map (force-directed, canvas)
function bubbleMap(cv, r, ccol) {
  const box = cv.parentElement, tip = $('#tip'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  const size = () => { const b = cv.getBoundingClientRect(); W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size();
  const nodes = (r.map?.nodes || []).map((n, i) => {
    const holder = n.type === 'holder';
    const rad = holder ? Math.max(4, Math.min(40, Math.sqrt(n.share) * 122 * Math.min(1, Math.max(0.55, W / 700)))) : 4;
    const a = i * 2.39996, d = 20 + 9 * Math.sqrt(i);
    return { ...n, r: rad, r0: rad, k: 1, x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d, vx: 0, vy: 0 };
  });
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const edges = (r.map?.edges || []).map(e => ({ ...e, A: byId[e.a], B: byId[e.b] })).filter(e => e.A && e.B);
  const holders = Object.fromEntries((r.holders || []).map(h => [h.address, h]));
  let hover = null, drag = null, focus = null, alpha = 1;
    function tick() {
    const cx = W / 2, cy = H / 2;
    // cluster centroids pull members together
    const cen = {};
    for (const n of nodes) { const k = n.cluster; (cen[k] ||= { x: 0, y: 0, c: 0 }); cen[k].x += n.x; cen[k].y += n.y; cen[k].c++; }
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.0016 * alpha; n.vy += (cy - n.y) * 0.0016 * alpha;
      const c = cen[n.cluster]; if (c.c > 1) { n.vx += (c.x / c.c - n.x) * 0.012 * alpha; n.vy += (c.y / c.c - n.y) * 0.012 * alpha; }
    }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]; let dx = b.x - a.x, dy = b.y - a.y; let d = Math.hypot(dx, dy) || .01;
      const min = a.r + b.r + 6;
      if (d < min) { const k = (min - d) / d * .5; dx *= k; dy *= k; a.x -= dx; a.y -= dy; b.x += dx; b.y += dy; }
      else if (a.cluster !== b.cluster) { const f = 140 * alpha / (d * d); a.vx -= dx * f / d; a.vy -= dy * f / d; b.vx += dx * f / d; b.vy += dy * f / d; }
    }
    for (const e of edges) { const dx = e.B.x - e.A.x, dy = e.B.y - e.A.y, d = Math.hypot(dx, dy) || 1, want = e.A.r + e.B.r + 26, f = (d - want) / d * 0.02 * alpha; e.A.vx += dx * f; e.A.vy += dy * f; e.B.vx -= dx * f; e.B.vy -= dy * f; }
    // swarms are gravity wells: members keep clear of the horizon and slowly orbit it
    for (const n of nodes) {
      const c = cen[n.cluster]; if (!ccol[n.cluster] || !c || c.c < 2 || n === drag || n.type !== 'holder') continue;
      const ox = c.x / c.c, oy = c.y / c.c, dx = n.x - ox, dy = n.y - oy, d = Math.hypot(dx, dy) || .01, hr = holeR(c.c), min = hr * 2.7 + n.r;
      if (d < min) { n.x = ox + dx / d * min; n.y = oy + dy / d * min; }
      n.vx += -dy / d * 0.045 - dx * 0.0016; n.vy += dx / d * 0.045 - dy * 0.0016;
    }
    for (const n of nodes) { if (n.type === 'holder') { const tr = n.r0 * n.k; n.r += (tr - n.r) * 0.18; }
      if (n === drag) continue; n.vx *= .82; n.vy *= .82; n.x += n.vx; n.y += n.vy; const mg = n.r * (n.flags && n.flags.includes('dev') ? 1.9 : 1) + 4; n.x = Math.max(mg, Math.min(W - mg, n.x)); n.y = Math.max(n.r + 40, Math.min(H - n.r - 34, n.y)); }
    alpha = Math.max(0.08, alpha * 0.995);
  }
  const holeR = n => 7 + 3 * Math.sqrt(n);
  const disks = {};
  // swarm index (1..n) for hull labels
  const swIdx = {}; Object.keys(ccol).forEach((k, i) => swIdx[k] = i + 1);
  const shareOf = {}; (r.clusters || []).forEach(c => shareOf[c.id] = c.share);
  let T = 0;
  function draw() {
    T += 1;
    ctx.clearRect(0, 0, W, H);
    // radar-like backdrop rings
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.12 * k, 0, 6.29); ctx.stroke(); }
    // swarm hulls: dashed rotating ring around each multi-wallet swarm
    const groups = {}, labels = [];
    for (const n of nodes) if (n.type === 'holder' && ccol[n.cluster]) (groups[n.cluster] ||= []).push(n);
    for (const [cid, g] of Object.entries(groups)) {
      if (g.length < 2) continue;
      const dim = focus != null && +cid !== focus;
      let cx = 0, cy = 0; g.forEach(n => { cx += n.x; cy += n.y; }); cx /= g.length; cy /= g.length;
      let rad = 0; g.forEach(n => { rad = Math.max(rad, Math.hypot(n.x - cx, n.y - cy) + n.r); }); rad += 12;
      ctx.globalAlpha = dim ? .12 : 1;
      const hr = holeR(g.length);
      const dk = disks[cid] || (disks[cid] = new Planets.Disk(70 + g.length * 30, hr * 1.05, rad * 1.05, { tilt: 0.62, speed: 0.7 }));
      if (Math.abs(dk.outer - rad * 1.05) > rad * 0.1) dk.resize(hr * 1.05, rad * 1.05);
      ctx.globalCompositeOperation = 'lighter'; dk.draw(ctx, cx, cy, 1 / 60, { alpha: dim ? 0.3 : 0.9, trail: 1.3 }); ctx.globalCompositeOperation = 'source-over';
      Planets.hole(ctx, cx, cy, hr, performance.now() / 1000);
      ctx.setLineDash([2, 6]); ctx.lineDashOffset = -T * 0.3; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 0.62, 0, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
      labels.push([`SWARM ${swIdx[cid]} · ${g.length}w · ${((shareOf[cid] || 0) * 100).toFixed(1)}%`, cx, cy - rad, dim]);
    }
    ctx.globalAlpha = 1;
    for (const e of edges) {
      if ((e.A.type === 'holder' && e.A.r < 1.5) || (e.B.type === 'holder' && e.B.r < 1.5)) continue;   // not holding yet
      const dim = focus != null && e.A.cluster !== focus;
      const hot = hover && (e.A === hover || e.B === hover);
      ctx.globalAlpha = dim ? .06 : (hot ? 1 : .5);
      ctx.strokeStyle = e.kind === 'pack' ? '#bbbbbb' : (e.kind === 'funder' || e.kind === 'distributor') ? 'rgba(255,255,255,0.45)' : '#ffffff';
      ctx.lineWidth = e.kind === 'funder' ? 1 : 1.5; ctx.setLineDash(e.kind === 'pack' ? [4, 3] : []);
      ctx.beginPath(); ctx.moveTo(e.A.x, e.A.y); ctx.lineTo(e.B.x, e.B.y); ctx.stroke();
      if (!dim && e.kind !== 'pack') {     // a packet of light travelling along the evidence
        const k = ((T * 0.012 + (e.A.x + e.B.y) * 0.001) % 1);
        const px = e.A.x + (e.B.x - e.A.x) * k, py = e.A.y + (e.B.y - e.A.y) * k;
        ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(px, py, 0, px, py, 6);
        gl.addColorStop(0, 'rgba(255,255,255,.9)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(px, py, 6, 0, 6.29); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.setLineDash([]);
    for (const n of nodes) {
      const dim = focus != null && n.cluster !== focus;
      ctx.globalAlpha = dim ? .15 : 1;
      if (n.type !== 'holder') {   // shared funder / distributor: a star feeding the swarm
        const tw = 7 + Math.sin(T * 0.08 + n.x) * 1.5;
        const gl = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, tw * 2.4); gl.addColorStop(0, 'rgba(255,255,255,.5)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(n.x, n.y, tw * 2.4, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath();
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + T * 0.004, rr = k % 2 ? tw * 0.28 : tw; ctx[k ? 'lineTo' : 'moveTo'](n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); continue;
      }
      if (n.r < 1.5) continue;
      const inSw = !!ccol[n.cluster], isDev = n.flags.includes('dev');
      const tone = isDev ? 0.9 : inSw ? parseInt(ccol[n.cluster].slice(1, 3), 16) / 255 * 0.82 : 0.28;
      const ring = (from, to) => { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1.2, n.r * 0.09); ctx.beginPath(); ctx.ellipse(n.x, n.y, n.r * 1.85, n.r * 0.46, -0.35, from, to); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, n.r * 0.05); ctx.beginPath(); ctx.ellipse(n.x, n.y, n.r * 1.55, n.r * 0.36, -0.35, from, to); ctx.stroke(); };
      if (isDev) ring(Math.PI, Math.PI * 2);                          // creator: ringed planet (back half)
      if (inSw && n.r > 8) { ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(n.x, n.y, n.r * .8, n.x, n.y, n.r * 1.8); gl.addColorStop(0, 'rgba(255,255,255,.16)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 1.8, 0, 6.29); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      const D = n.r / 0.46, sz = Math.max(16, Math.ceil(D * dpr / 8) * 8);
      ctx.drawImage(Planets.sprite(n.id, sz, { tone }), n.x - D / 2, n.y - D / 2, D, D);
      if (n === hover) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 4, 0, 6.29); ctx.stroke(); }
      if (isDev) ring(0, Math.PI);                                    // front half over the planet
      if (n.flags.includes('fresh')) {                                // fresh wallet: a small moon
        const a = T * 0.025 + (n.x % 7), mr = Math.max(2.2, n.r * 0.17);
        const mx = n.x + Math.cos(a) * n.r * 1.5, my = n.y + Math.sin(a) * n.r * 0.55;
        const mg = ctx.createRadialGradient(mx - mr * .4, my - mr * .4, 0, mx, my, mr); mg.addColorStop(0, '#fff'); mg.addColorStop(1, '#666');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.29); ctx.fill();
      }
      if (n.r >= 15) { const txt = ((n.st ?? n.share) * 100).toFixed(1) + '%'; ctx.font = `700 ${Math.min(13, n.r * .42)}px JetBrains Mono, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(txt, n.x, n.y + 1); ctx.fillStyle = '#fff'; ctx.fillText(txt, n.x, n.y + 1); }
    }
    // swarm labels on top, nudged apart so they never stack
    ctx.font = '600 10px JetBrains Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const placed = [];
    labels.sort((a, b) => a[2] - b[2]).forEach(([lab, cx, top, dim]) => {
      const tw = ctx.measureText(lab).width + 10; let lx = Math.max(4, Math.min(W - tw - 4, cx - tw / 2)), ly = Math.max(44, top - 10);
      while (placed.some(p => Math.abs(p[1] - ly) < 17 && lx < p[0] + p[2] && p[0] < lx + tw)) ly += 17;
      placed.push([lx, ly, tw]);
      ctx.globalAlpha = dim ? .15 : 1;
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, ly + 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(lx, ly - 8, tw, 15); ctx.fillStyle = '#000'; ctx.fillText(lab, lx + 5, ly);
    });
    ctx.globalAlpha = 1;
  }
  const loop = () => { tick(); draw(); timers.push(requestAnimationFrame(loop)); };
  loop();
  const at = (x, y) => { for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes[i]; if (Math.hypot(n.x - x, n.y - y) <= Math.max(n.r, 7)) return n; } return null; };
  const pos = e => { const b = cv.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return [p.clientX - b.left, p.clientY - b.top]; };
  cv.addEventListener('pointermove', e => {
    const [x, y] = pos(e);
    if (drag) { drag.x = x; drag.y = y; alpha = Math.max(alpha, .3); return; }
    hover = at(x, y);
    if (hover) {
      const h = holders[hover.id], s = h?.signals || {};
      tip.style.display = 'block'; tip.style.left = Math.min(x + 14, W - 270) + 'px'; tip.style.top = (y + 14) + 'px';
      tip.innerHTML = hover.type === 'holder'
        ? `<b>${esc(short(hover.id))}</b>${hover.label ? ' · ' + esc(hover.label) : ''}<br>${pct(hover.share)} of float${hover.cluster_size > 1 ? ` · swarm of ${hover.cluster_size}` : ''}<br>${esc([s.kind, s.fresh && 'fresh', s.sniper && 'sniper', s.insider && 'insider', s.dev && 'creator'].filter(Boolean).join(' · '))}${s.tx_count != null ? `<br>${s.tx_count} txs` : ''}${s.funder ? `<br>funded by ${esc(short(s.funder))}` : ''}`
        : `<b>${esc(short(hover.id))}</b><br>${hover.type === 'funder' ? 'shared funder' : 'shared distributor'}`;
    } else tip.style.display = 'none';
  });
  cv.addEventListener('pointerdown', e => { const [x, y] = pos(e); drag = at(x, y); if (drag) cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', e => {
    const [x, y] = pos(e); const n = at(x, y);
    if (drag && n === drag && Math.hypot(drag.vx, drag.vy) < 50) { if (n.type === 'holder') openWallet(n.id, r); }
    drag = null;
  });
  cv.addEventListener('pointerleave', () => { hover = null; tip.style.display = 'none'; });
  window.addEventListener('resize', size, { once: true });
  return {
    focus(c) { focus = focus === c ? null : c; alpha = .4; },
    scale(fn) { for (const n of nodes) if (n.type === 'holder') { n.k = fn ? fn(n.id) : 1; n.st = fn ? n.share * n.k * n.k : null; } alpha = Math.max(alpha, .35); },
  };
}

// ---------------------------------------------------------------- side panel (wallet in a scan)
function openWallet(addr, r) {
  const h = (r.holders || []).find(x => x.address === addr); if (!h) return;
  const s = h.signals || {};
  const side = $('#side');
  side.innerHTML = `<button class="x" id="sx">×</button><h2>${esc(t('wallet'))}</h2>
    <div class="mono" style="font-size:13px;margin:8px 0;word-break:break-all">${esc(addr)}</div>
    <div class="row">${s.dev ? '<span class="chip sky">creator</span>' : ''}${s.fresh ? '<span class="chip honey">fresh</span>' : ''}${s.sniper ? '<span class="chip rose">sniper</span>' : ''}${s.insider ? '<span class="chip violet">insider</span>' : ''}</div>
    <div class="kv" style="margin-top:14px;grid-template-columns:120px 1fr">
      <span class="dim">${esc(t('float'))}</span><span class="mono">${pct(h.share, 2)}</span>
      <span class="dim">${esc(t('entry'))}</span><span class="mono">${esc(s.kind || '?')} ${s.entry_ts ? new Date(s.entry_ts * 1000).toLocaleString() : ''}</span>
      <span class="dim">from</span><span class="mono">${esc(short(s.entry_from))}</span>
      <span class="dim">${esc(t('txs'))}</span><span class="mono">${s.tx_count ?? '—'}</span>
      <span class="dim">${esc(t('w_funder'))}</span><span class="mono">${s.funder ? `<a href="/w/${esc(s.funder)}">${esc(short(s.funder))}</a>${s.funder_hub ? ' (' + esc(t('w_hub')) + ')' : ''}` : '—'}</span>
    </div>
    <div class="toolbar" style="margin-top:16px"><a class="btn sm" href="/w/${esc(addr)}">X-ray →</a>${explorer(r, addr) ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(explorer(r, addr))}">explorer ↗</a>` : ''}</div>`;
  side.classList.add('on');
  $('#sx').addEventListener('click', closeSide);
}
function badgePanel(r) {
  const o = location.origin, page = `${o}/t/${r.chain}/${r.token}`, img = `${o}/badge/${r.chain}/${r.token}.svg`;
  const snips = [['HTML · website', `<a href="${page}" target="_blank" rel="noopener"><img src="${img}" alt="Scanned by SWARM" width="400" height="64"></a>`],
    ['Markdown · GitHub', `[![Scanned by SWARM](${img}?style=flat)](${page})`],
    ['Image URL', img], ['Scan link · X / Telegram', page]];
  const side = $('#side');
  side.innerHTML = `<button class="x" id="sx">×</button><h2>Scanned by SWARM badge</h2>
    <p class="dim" style="font-size:13px;line-height:1.55;margin:8px 0 14px">A live badge for your site or README. It always shows the <b style="color:#fff">latest</b> scan, refreshes itself, and links back here so anyone can check it. If the verdict changes, the badge changes too.</p>
    <div class="badge-prev"><img src="${img}?v=${r.scanned_at}" alt="badge"><img src="${img}?style=flat&v=${r.scanned_at}" alt="badge flat"></div>
    ${snips.map(([k, v], i) => `<div class="badge-sn"><div class="row"><span class="mono dim" style="font-size:11px;letter-spacing:.08em">${esc(k)}</span><span class="sp"></span><button class="btn ghost sm" data-bs="${i}">⧉ copy</button></div><pre class="code">${esc(v)}</pre></div>`).join('')}
    <p class="dim mono" style="font-size:11px;line-height:1.6;margin-top:10px">"Scanned", not "verified": SWARM reads holders, it does not audit projects. Not financial advice.</p>`;
  side.classList.add('on');
  $('#sx').addEventListener('click', closeSide);
  side.querySelectorAll('[data-bs]').forEach(b => b.addEventListener('click', () => copy(snips[+b.dataset.bs][1])));
}
let HOLDER = null;
function holderButton() {
  const b = $('#holderbtn'); if (!b || !HOLDER || !HOLDER.enabled) return;
  const ps = passGet(), on = ps && ps.exp * 1000 > Date.now();
  b.hidden = false; b.classList.toggle('on', !!on);
  b.innerHTML = on ? '<span>◆ HOLDER</span>' : '<span>◇ HOLDER PASS</span>';
}
function holderPanel() {
  const ps = passGet(), on = ps && ps.exp * 1000 > Date.now(), side = $('#side'), H = HOLDER || {};
  const need = H.min_tokens > 0 ? `${H.min_tokens} $SWARM` : `${H.min_pct}% of supply`;
  side.innerHTML = `<button class="x" id="sx">×</button><h2>Holder Pass</h2>
    <p class="dim" style="font-size:13px;line-height:1.55;margin:8px 0 14px">Hold $SWARM, sign one message, get more out of SWARM. <b style="color:#fff">No transaction, no gas, no approval.</b> Everything that is free stays free.</p>
    <div class="hp-perks">${(H.perks || []).map(p => `<div><b>◆</b>${esc(p)}</div>`).join('')}</div>
    <div class="kv mono" style="font-size:12px;margin:14px 0;grid-template-columns:110px 1fr"><span class="dim">needs</span><span>${esc(need)}</span><span class="dim">chain</span><span>${esc(H.chain || '—')}</span><span class="dim">pass lasts</span><span>${esc(H.pass_h)}h, then sign again</span></div>
    <div id="hpst">${on ? `<div class="hp-on"><div class="mono" style="font-size:11px;letter-spacing:.12em">◆ HOLDER PASS ACTIVE</div><div class="mono" style="font-size:12px;margin-top:6px;word-break:break-all">${esc(ps.address)}</div><div class="dim mono" style="font-size:11px;margin-top:4px">${ps.pct}% of supply · until ${new Date(ps.exp * 1000).toLocaleString()}</div></div>
      <div class="toolbar" style="margin-top:12px"><button class="btn ghost sm" id="hpout">sign out</button></div>`
      : `<button class="btn" id="hpgo" style="width:100%">Connect wallet & sign</button>
      <p class="dim mono" style="font-size:11px;line-height:1.6;margin-top:10px">${window.ethereum ? 'Your wallet will ask you to sign a plain text message. Read it: it never asks to move funds.' : 'No wallet found in this browser. Open swarmengine.tech inside your wallet app (MetaMask, Rabby, OKX…) or a browser with a wallet extension.'}</p>`}</div>
    <p class="dim mono" style="font-size:11px;line-height:1.6;margin-top:14px">SWARM never asks for keys or seed phrases, and never sends a transaction for the pass.</p>`;
  side.classList.add('on');
  $('#sx').addEventListener('click', closeSide);
  $('#hpout')?.addEventListener('click', () => { passSet(null); holderButton(); holderPanel(); toast('Holder Pass removed from this browser'); });
  $('#hpgo')?.addEventListener('click', async () => {
    const st = $('#hpst'), btn = $('#hpgo');
    if (!window.ethereum) { toast('no wallet in this browser'); return; }
    try {
      btn.disabled = true; btn.textContent = 'waiting for wallet…';
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const { message } = await api('/api/holder/challenge?address=' + encodeURIComponent(addr));
      btn.textContent = 'sign the message in your wallet…';
      const hex = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
      const signature = await window.ethereum.request({ method: 'personal_sign', params: [hex, addr] });
      btn.textContent = 'checking balance…';
      const r = await fetch('/api/holder/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: addr, message, signature }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
      passSet({ pass: d.pass, address: d.address, exp: d.exp, pct: d.pct });
      holderButton(); holderPanel(); toast('◆ Holder Pass active');
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Connect wallet & sign';
      st.insertAdjacentHTML('beforeend', `<div class="err" style="margin-top:10px">${esc(e.message || String(e))}</div>`);
    }
  });
}
function closeSide() { $('#side')?.classList.remove('on'); }

// ---------------------------------------------------------------- radar, cabals, wallet, docs
function radarView() {
  $('#view').innerHTML = `${pageHead({ title: t('radar_head').toUpperCase(), sub: esc(t('radar_lead')), kpis: [['tracked', '<span id="k_tr">0</span>'], ['scanned', '<span id="k_sc">0</span>'], ['danger', '<span id="k_dg">0</span>']], crumbs: ['GECKOTERMINAL', 'QUEUE', 'SCAN', 'JUDGE', 'FEED'], on: 2 })}
    <div class="rsbox big" id="scope"></div>
    <div class="row" style="margin:18px 0 14px" id="rf"></div><div class="radar" id="rad"></div>`;
  let filter = '';
  const scope = mountScope($('#scope'), '#rad'), deck = radarDeck($('#rad'), 60);
  $('#rf').innerHTML = ['', ...CHAINS.map(c => c.id)].map(c => `<button class="btn ghost sm${c ? '' : ' on'}" data-f="${c}">${c || 'all'}</button>`).join('');
  $('#rf').querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; $('#rf').querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); load(); }));
  const load = () => document.hidden ? 0 : api('https://app-server-sandy.vercel.app/api/radar').then(d => {
    const feed = (d.feed || []).filter(x => !filter || x.chain === filter);
    scope.update(feed, d.enabled); deck(feed, d.enabled);
    const all = d.feed || []; [['#k_tr', all.length], ['#k_sc', all.filter(x => x.band).length], ['#k_dg', all.filter(x => x.band === 'DANGER').length]].forEach(([k, v]) => countTo($(k), v));
  }).catch(e => { $('#rad').innerHTML = `<div class="err">${esc(e.message)}</div>`; });
  load(); timers.push(setInterval(load, 3000));
}
async function cabalsView() {
  $('#view').innerHTML = `${pageHead({ title: t('cab_head').toUpperCase(), sub: esc(t('cab_lead')), kpis: [['crews', '<span id="k_cr">0</span>'], ['wallets', '<span id="k_cw">0</span>'], ['danger', '<span id="k_cd">0</span>']], crumbs: ['SCANS', 'SWARMS', 'MEMORY', 'REPEAT', 'CABAL'], on: 4 })}<div class="card" id="cab"><div class="empty">…</div></div>`;
  try {
    const d = await api('https://app-server-sandy.vercel.app/api/cabals');
    const cb = d.cabals || []; countTo($('#k_cr'), cb.length); countTo($('#k_cw'), cb.reduce((a, c) => a + c.wallets.length, 0)); countTo($('#k_cd'), cb.reduce((a, c) => a + (c.danger || 0), 0));
    $('#cab').innerHTML = (d.cabals || []).map((c, i) => `<div class="crew"><div class="row"><span class="dot" style="background:${SW[i % SW.length]}"></span><b class="mono">crew #${i + 1}</b><span class="chip">${c.wallets.length} ${esc(t('wallets_'))}</span><span class="chip honey">${c.tokens.length} ${esc(t('tokens'))}</span>${c.danger ? `<span class="chip rose">${c.danger} DANGER</span>` : ''}</div>
      <div class="mono" style="font-size:12px;margin-top:6px">${c.tokens.map(x => `<a href="/t/${esc(x.chain)}/${esc(x.token)}">${esc(x.symbol || short(x.token))}</a> <span class="band ${esc(x.band)}" style="font-size:10px;padding:1px 6px">${esc(bandLabel(x.band))}</span>`).join(' &nbsp; ')}</div>
      <div class="dim mono" style="font-size:11px;margin-top:6px">${c.wallets.map(w => `<a href="/w/${esc(w)}" class="dim">${esc(short(w))}</a>`).join(' · ')}</div></div>`).join('') || `<div class="empty">${esc(t('cab_empty'))}</div>`;
  } catch (e) { $('#cab').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
function camView() {
  $('#view').innerHTML = `${pageHead({ title: 'SPIDER CAM', sub: 'Watch the agents work. Every new scan on SWARM, live: a spider walks out, reads the wallets, walks back, and the Judge stamps a verdict. Click a planet to open its scan.', kpis: [['watched', '<span id="k_cw2">0</span>'], ['avoid', '<span id="k_ca">0</span>'], ['agents', '7']], crumbs: ['WALK', 'READ', 'TRACE', 'LINK', 'AUDIT', 'JUDGE'], on: 1 })}
  <div class="cam"><div class="card cam-stage"><canvas id="camcv"></canvas><div class="cam-leg mono"><span><i style="background:#2f7dff"></i>CLEAN</span><span><i style="background:#19e3c4;border-radius:50%"></i>OK</span><span><i style="background:#d6d6d6"></i>RISKY</span><span><i style="background:#fff"></i>DANGER</span><span><i style="background:#6a6a6a"></i>TOO EARLY</span></div></div>
  <div class="card cam-side"><div class="molt-top"><span class="mono">THOUGHT STREAM</span><em>live</em></div><div class="cam-log mono" id="camlog"></div></div></div>`;
  if (!window.SpiderCam) { $('#camlog').innerHTML = '<div class="err">spider cam failed to load</div>'; return; }
  stages.push(window.SpiderCam($('#camcv'), $('#camlog'), { onCount: c => { $('#k_cw2').textContent = c.watched; $('#k_ca').textContent = c.avoid; }, open: p => go(p) }));
}
// ---------------------------------------------------------------- wallet spider
function spiderView(addr) {
  const v = addr || '';
  $('#view').innerHTML = `${pageHead({ title: 'WALLET SPIDER', sub: 'Every wallet hatches one spider, drawn from what the chain says about it: how old it is, how busy, how many tokens it touched, who funded it and how many swarms it sat in. Same wallet, same spider.', crumbs: ['PASTE', 'READ', 'HATCH', 'SHARE'], on: addr ? 2 : 0, live: false })}
    <div class="card sp-in"><input id="spa" spellcheck="false" autocomplete="off" placeholder="your wallet · 0x… or a Solana address" value="${esc(v)}"><button class="btn" id="spgo">HATCH</button></div>
    <div id="spout" class="section"></div>`;
  const goSp = () => { const a = $('#spa').value.trim(); if (a) go('/spider/' + a); };
  $('#spgo').onclick = goSp; $('#spa').onkeydown = e => { if (e.key === 'Enter') goSp(); };
  if (!addr) { $('#spout').innerHTML = `<div class="sp-grid"><div class="card sp-cv"><canvas id="spcv" width="1080" height="1080"></canvas></div><div class="card sp-side">${spiderLegend()}</div></div>`; spiderEgg($('#spcv'), null); return; }
  $('#spout').innerHTML = `<div class="sp-grid"><div class="card sp-cv"><canvas id="spcv" width="1080" height="1080"></canvas></div><div class="card sp-side" id="spside"><div class="empty">reading the wallet…</div></div></div>`;
  const egg = { on: true }; spiderEgg($('#spcv'), egg);
  api('/api/spider/' + encodeURIComponent(addr)).then(d => {
    egg.on = false; drawSpiderLoop($('#spcv'), d);
    const T = d.traits || {}, n = (x, m) => x == null ? '?' : Number(x).toLocaleString() + (m ? '+' : '');
    const age = T.age_days == null ? '?' : (T.age_days >= 365 ? (T.age_days / 365).toFixed(1) + ' years' : T.age_days + ' days') + (T.age_min ? '+' : '');
    const url = location.origin + '/spider/' + d.wallet;
    const tw = `My wallet hatched ${d.look.name}, a ${d.class.toLowerCase()} 🕷️\n\nWhat does yours look like?`;
    $('#spside').innerHTML = `<div class="sp-cls" style="color:${esc(d.color)}">${esc(d.class)}</div><h2 class="sp-name">${esc(d.look.name)}</h2>
      <div class="dim mono" style="font-size:12px">${esc(short(d.wallet))} · ${esc(d.chain_name || d.chain)}</div>
      <div class="sp-stats">
        <div><span>age</span><b>${esc(age)}</b></div>
        <div><span>${esc(T.tx_label || 'transactions')}</span><b>${esc(n(T.tx_count, T.tx_more))}</b></div>
        <div><span>${esc(T.tokens_label || 'tokens')}</span><b>${esc(n(T.tokens, T.tokens_more))}</b></div>
        <div><span>swarms it sat in</span><b>${esc(n(T.swarms))}</b></div>
        <div><span>seen by SWARM in</span><b>${esc(n(T.seen_tokens))} tokens</b></div>
        <div><span>funder</span><b>${T.funder ? (T.funder_hub ? 'hub (exchange / bridge)' : `<a href="/w/${esc(T.funder)}">${esc(short(T.funder))}</a>`) : '?'}</b></div>
      </div>
      ${(d.partial || []).length ? `<div class="dim mono" style="font-size:11px;margin-top:8px">couldn't read: ${esc(d.partial.join(', ').replace('age_days', 'age'))}. Drawn as zero, nothing made up.</div>` : ''}
      <div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap">
        <a class="btn" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(tw)}&url=${encodeURIComponent(url)}">SHARE ON X</a>
        <button class="btn ghost" id="spdl">DOWNLOAD CARD</button><button class="btn ghost" id="spcp">COPY LINK</button></div>
      ${spiderLegend()}`;
    $('#spdl').onclick = () => $('#spcv').toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `swarm-spider-${short(d.wallet).replace('…', '-')}.png`; a.click(); });
    $('#spcp').onclick = () => { navigator.clipboard?.writeText(url); $('#spcp').textContent = 'COPIED'; };
  }).catch(e => { egg.on = false; $('#spside').innerHTML = `<div class="err">${esc(e.message)}</div>`; });
}
function spiderLegend() {
  return `<div class="sp-leg"><b>how it hatches</b>
    <div><span>age</span>size, and a ring on the body for every ~10 months</div>
    <div><span>transactions</span>spikes on the legs, and faster legs</div>
    <div><span>tokens</span>one glowing eye per ~40 tokens (2 to 8)</div>
    <div><span>swarms</span>a denser web and its swarm mates around it</div>
    <div><span>hub funder</span>a gold crown</div>
    <div><span>class</span>Hatchling (under 30 days) · Weaver · Hunter · Elder · Queen of the Web</div>
    <div class="dim" style="margin-top:6px">Legs, body pattern and name come from the address itself. Public chain data only, nothing is stored about you beyond what SWARM already saw in scans.</div></div>`;
}
function spiderEgg(cv, st) {
  const x = cv.getContext('2d'), alive = { on: true }; stages.push({ stop() { alive.on = false; } });
  const f = ts => { if (!alive.on || (st && !st.on)) return; const t = ts / 1000; x.fillStyle = '#000'; x.fillRect(0, 0, 1080, 1080); spiderWeb(x, 6, t);
    x.save(); x.translate(540, 520 + Math.sin(t * 2) * 6); x.rotate(Math.sin(t * 9) * (st ? .06 : .02)); x.strokeStyle = '#fff'; x.shadowColor = '#19e3c4'; x.shadowBlur = 30; x.lineWidth = 6; x.fillStyle = '#000';
    x.beginPath(); x.ellipse(0, 0, 120, 156, 0, 0, 7); x.fill(); x.stroke();
    if (st) { x.beginPath(); x.moveTo(-100, -50); x.lineTo(-55, -80); x.lineTo(-20, -40); x.lineTo(15, -88); x.lineTo(45, -42); x.lineTo(80, -78); x.lineTo(112, -40); x.stroke(); }
    x.restore(); x.fillStyle = '#8a8a8a'; x.font = '500 26px "JetBrains Mono",monospace'; x.textAlign = 'center'; x.fillText(st ? 'hatching…' : 'paste a wallet to hatch its spider', 540, 800); x.textAlign = 'left';
    requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
function spiderWeb(x, sw, t) {
  const cx = 540, cy = 500, spokes = 8 + Math.min(12, sw) * 2, rings = 3 + Math.min(12, sw);
  x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1.2;
  for (let k = 0; k < spokes; k++) { const a = k / spokes * Math.PI * 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 470, cy + Math.sin(a) * 470); x.stroke(); }
  for (let q = 1; q <= rings; q++) { const rr = 470 * q / rings; x.beginPath(); for (let k = 0; k <= spokes; k++) { const a = k / spokes * Math.PI * 2, w = rr * (k % 2 ? .96 : 1); k ? x.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w) : x.moveTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w); } x.stroke(); }
}
function drawSpiderLoop(cv, d) {
  const x = cv.getContext('2d'), alive = { on: true }; stages.push({ stop() { alive.on = false; } });
  const f = ts => { if (!alive.on) return; drawSpider(x, d, ts / 1000); requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
function drawSpider(x, d, t) {
  const T = d.traits || {}, L = d.look, col = d.color || '#fff', W = 1080, cx = 540, cy = 500, sw = Math.min(12, T.swarms || 0);
  x.setTransform(1, 0, 0, 1, 0, 0); x.shadowBlur = 0; x.fillStyle = '#000'; x.fillRect(0, 0, W, W);
  x.fillStyle = 'rgba(255,255,255,.025)'; for (let y = 0; y < W; y += 3) x.fillRect(0, y, W, 1);
  spiderWeb(x, sw, t);
  L.mates.slice(0, sw).forEach(([a, dist, sc], i) => {
    x.save(); x.translate(cx + Math.cos(a) * dist * 560, cy + Math.sin(a) * dist * 560); x.scale(sc, sc); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3;
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const w = Math.sin(t * 4 + k + i) * 3; x.beginPath(); x.moveTo(s * 10, -6 + k * 6); x.lineTo(s * 34, -28 + k * 14 + w); x.lineTo(s * 48, -4 + k * 18 + w); x.stroke(); }
    x.fillStyle = '#000'; x.beginPath(); x.ellipse(0, 14, 14, 18, 0, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.arc(0, -10, 8, 0, 7); x.fillStyle = 'rgba(255,255,255,.7)'; x.fill(); x.restore();
  });
  const fresh = d.class === 'HATCHLING', age = T.age_days || 0, size = fresh ? .55 : .75 + Math.min(1, age / 1500) * .55;
  const speed = 1 + Math.min(1, (T.tx_count || 0) / 3000) * 3, spikes = Math.min(6, Math.floor((T.tx_count || 0) / 700)), fat = L.fat;
  x.save(); x.translate(cx, cy + Math.sin(t * 1.3) * 6); x.scale(size * 3.1, size * 3.1);
  x.shadowColor = col; x.shadowBlur = 14; x.strokeStyle = col; x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round';
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const w = Math.sin(t * speed * 3 + i * 1.3 + (s > 0 ? 1.6 : 0)) * 4, ang = -.95 + i * .55;
    const A = [s * 10, -8 + i * 6], B = [A[0] + s * Math.cos(ang) * 22 * L.leg, A[1] + Math.sin(ang) * 22 * L.leg - 14 * L.leg + w];
    const C = [B[0] + s * 20 * L.leg, B[1] + (i - 1.2) * 10 * L.leg + w], D = [C[0] + s * (6 + L.bend * 8) * L.leg, C[1] + 18 * L.leg + w * 1.4];
    x.beginPath(); x.moveTo(...A); x.quadraticCurveTo(A[0] + s * 6, B[1], B[0], B[1]); x.lineTo(...C); x.lineTo(...D); x.stroke();
    for (let k = 0; k < spikes; k++) { const u = (k + 1) / (spikes + 1), px = B[0] + (C[0] - B[0]) * u, py = B[1] + (C[1] - B[1]) * u; x.beginPath(); x.moveTo(px, py); x.lineTo(px + s * 3, py - 6); x.stroke(); }
  }
  x.shadowBlur = 18; x.fillStyle = '#000'; x.beginPath(); x.ellipse(0, 18, 20 * fat, 26, 0, 0, 7); x.fill(); x.stroke();
  const rings = Math.min(5, Math.floor(age / 300)); x.lineWidth = 1.6; x.globalAlpha = .35;
  for (let k = 1; k <= rings; k++) { x.beginPath(); x.ellipse(0, 18, (20 + k * 3) * fat, 26 + k * 3.5, 0, 0, 7); x.stroke(); } x.globalAlpha = 1;
  x.lineWidth = 2; x.shadowBlur = 6; x.fillStyle = col;
  if (L.pattern === 0) for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(-9 * fat, 10 + k * 8); x.lineTo(0, 16 + k * 8); x.lineTo(9 * fat, 10 + k * 8); x.stroke(); }
  else if (L.pattern === 1) [[0, 8], [-7, 16], [7, 16], [0, 26], [-5, 34], [5, 34]].forEach(([a, b]) => { x.beginPath(); x.arc(a * fat, b, 2.2, 0, 7); x.fill(); });
  else if (L.pattern === 2) { x.beginPath(); x.moveTo(0, -4); x.lineTo(0, 42); x.moveTo(-12 * fat, 18); x.lineTo(12 * fat, 18); x.stroke(); }
  else { x.beginPath(); x.moveTo(0, 4); x.lineTo(8 * fat, 18); x.lineTo(0, 32); x.lineTo(-8 * fat, 18); x.closePath(); x.stroke(); }
  x.lineWidth = 3; x.shadowBlur = 18; x.fillStyle = '#000'; x.beginPath(); x.arc(0, -14, 12, 0, 7); x.fill(); x.stroke();
  const ne = Math.max(2, Math.min(8, 2 + Math.floor((T.tokens || 0) / 40))); x.shadowColor = '#19e3c4'; x.shadowBlur = 10; x.fillStyle = '#19e3c4';
  for (let k = 0; k < ne; k++) { const row = k < 4 ? 0 : 1, c = k % 4, cnt = Math.min(4, ne - row * 4), blink = Math.sin(t * 2 + k) > .97 ? .3 : 1; x.beginPath(); x.arc((c - (cnt - 1) / 2) * 5.2, -17 + row * 6, 1.9 * blink, 0, 7); x.fill(); }
  if (T.funder_hub) { x.shadowColor = '#ffd36b'; x.strokeStyle = '#ffd36b'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-10, -27); x.lineTo(-10, -35); x.lineTo(-5, -30); x.lineTo(0, -38); x.lineTo(5, -30); x.lineTo(10, -35); x.lineTo(10, -27); x.closePath(); x.stroke(); }
  if (fresh) { x.shadowBlur = 0; x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-22, 52); x.lineTo(-14, 44); x.lineTo(-6, 52); x.lineTo(2, 44); x.lineTo(10, 52); x.lineTo(22, 52); x.stroke(); }
  x.restore(); x.shadowBlur = 0;
  const mono = s => `${s}px "JetBrains Mono",ui-monospace,monospace`;
  x.fillStyle = '#fff'; x.font = '800 ' + mono(22); x.fillText('SWARM // WALLET SPIDER', 56, 72);
  x.fillStyle = '#8a8a8a'; x.font = '500 ' + mono(16); x.fillText(short(d.wallet) + ' · ' + (d.chain_name || ''), 56, 102);
  x.textAlign = 'right'; x.fillStyle = col; x.font = '800 ' + mono(22); x.fillText(d.class, 1024, 72); x.textAlign = 'left';
  x.fillStyle = '#fff'; x.font = '700 54px "Space Grotesk",system-ui,sans-serif'; x.fillText(L.name, 56, 880);
  const num = (v, m) => v == null ? '?' : Number(v).toLocaleString() + (m ? '+' : '');
  const st = [['AGE', T.age_days == null ? '?' : (T.age_days >= 365 ? (T.age_days / 365).toFixed(1) + 'y' : T.age_days + 'd') + (T.age_min ? '+' : '')], [(T.tx_label || 'txs').toUpperCase().slice(0, 12), num(T.tx_count, T.tx_more)], ['TOKENS', num(T.tokens, T.tokens_more)], ['SWARMS', num(T.swarms)], ['FUNDER', T.funder_hub ? 'HUB' : T.funder ? 'DIRECT' : '?']];
  st.forEach(([k, v], i) => { const px = 56 + i * 196; x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.strokeRect(px, 912, 182, 86); x.fillStyle = '#8a8a8a'; x.font = '500 ' + mono(14); x.fillText(k, px + 14, 940); x.fillStyle = '#fff'; x.font = '800 ' + mono(26); x.fillText(String(v), px + 14, 978); });
  x.fillStyle = '#8a8a8a'; x.font = '500 ' + mono(14); x.textAlign = 'right'; x.fillText('swarmengine.tech/spider', 1024, 1040); x.textAlign = 'left';
}
async function moltView() {
  $('#view').innerHTML = `${pageHead({ title: 'MOLT', sub: 'Every molt, the swarm gets bigger. What shipped, what is spinning, what is next.', kpis: [['shipped', '<span id="k_ms">0</span>'], ['spinning', '<span id="k_mp">0</span>'], ['next', '<span id="k_mn">0</span>']], crumbs: ['SHIPPED', 'SPINNING', 'NEXT'], on: 0, live: false })}<div class="molt" id="molt"><div class="empty">…</div></div>`;
  try {
    const d = await api('/api/molt'), S = d.shipped || [], P = d.spinning || [], N = d.next || [];
    countTo($('#k_ms'), S.length); countTo($('#k_mp'), P.length); countTo($('#k_mn'), N.length);
    const item = (x, i, k) => `<div class="molt-i ${k}"><div class="molt-h">${x.date ? `<span class="mono dim">${esc(x.date)}</span>` : ''}${k === 'ship' && i === 0 ? '<span class="molt-new">NEW</span>' : ''}<b>${esc(x.title || '')}</b></div>${x.body ? `<p>${esc(x.body)}</p>` : ''}</div>`;
    const col = (name, tag, list, k) => `<div class="card molt-col ${k}"><div class="molt-top"><span class="mono">${name}</span><em>${tag}</em></div>${list.map((x, i) => item(x, i, k)).join('') || '<div class="empty">—</div>'}</div>`;
    $('#molt').innerHTML = col('SHIPPED', 'live now', S, 'ship') + col('SPINNING', 'on the loom', P, 'spin') + col('NEXT', 'ideas, no dates', N, 'next');
  } catch (e) { $('#molt').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
async function walletView(w) {
  w = w.startsWith('0x') ? w.toLowerCase() : w;
  const opts = CHAINS.filter(c => c.id !== 'solana');
  $('#view').innerHTML = `${pageHead({ title: 'WALLET X-RAY', sub: `<span class="mono" style="color:#fff;word-break:break-all">${esc(w)}</span><br>${esc(t('w_head'))}`, crumbs: ['ADDRESS', 'FUNDER', 'ACTIVITY', 'TOKENS', 'SWARMS'], on: 1,
    tail: w.startsWith('0x') ? `<div class="row">${opts.map(c => `<button class="btn ghost sm" data-c="${c.id}">${esc(c.name)}</button>`).join('')}</div>` : '' })}<div id="wx" class="section"><div class="empty">…</div></div>`;
  const load = async ch => {
    $('#wx').innerHTML = '<div class="empty">…</div>';
    try {
      const d = await api(`/api/wallet/${w}${ch ? '?chain=' + ch : ''}`), x = d.xray;
      $('#wx').innerHTML = `<div class="grid g2">
        <div class="card"><h2>${esc(t('w_seen'))} ${d.count} ${esc(t('tokens'))}</h2>${d.tokens.map(r => `<div class="row mono" style="font-size:12px;padding:6px 0;border-top:1px solid var(--line)"><a href="/t/${esc(r.chain)}/${esc(r.token)}">${esc(r.symbol || short(r.token))}</a><span class="dim">${esc(r.chain)}</span><span class="band ${esc(r.band)}" style="font-size:10px;padding:1px 6px">${esc(bandLabel(r.band))}</span><span class="sp"></span><span>${pct(r.share)}</span>${r.cluster_size > 1 ? `<span class="chip honey">swarm ${r.cluster_size}</span>` : ''}</div>`).join('') || `<div class="empty">${esc(t('w_none'))}</div>`}</div>
        <div class="card"><h2>${x ? esc(x.chain) : 'live'} X-ray</h2>${!x ? '<div class="empty">—</div>' : x.error ? `<div class="err">${esc(x.error)}</div>` : `
          <div class="kv" style="grid-template-columns:130px 1fr;margin-top:10px"><span class="dim">${esc(t('txs'))}</span><span class="mono">${x.counters?.tx_count ?? '—'}</span>
          <span class="dim">${esc(t('w_funder'))}</span><span class="mono">${x.funder ? `<a href="/w/${esc(x.funder.address)}">${esc(short(x.funder.address))}</a> ${x.funder.label ? esc(x.funder.label) : ''} ${x.funder.hub ? '(' + esc(t('w_hub')) + ')' : ''}` : '—'}</span>
          <span class="dim">first seen</span><span class="mono">${x.first_seen ? new Date(x.first_seen * 1000).toLocaleString() : '—'}</span></div>
          <h2 style="margin:14px 0 6px">${esc(t('w_recent'))}</h2>${(x.recent_tokens || []).map(k => `<div class="row mono" style="font-size:12px;padding:3px 0"><a href="/t/${esc(x.chain)}/${esc(k.token)}">${esc(short(k.token))}</a><span class="sp"></span><span class="up">in ${k.in}</span><span class="down">out ${k.out}</span><span class="dim">${ago(k.last_ts)}</span></div>`).join('') || '<div class="empty">—</div>'}`}</div></div>`;
    } catch (e) { $('#wx').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  };
  $('#view').querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => load(b.dataset.c)));
  load();
}
function docsView() {
  const host = location.origin;
  $('#view').innerHTML = `${pageHead({ title: 'API', sub: 'JSON, CORS open, no key needed (rate limited per IP). Read-only.', kpis: [['cost', '$0.000'], ['auth', 'none'], ['mcp', 'on']], crumbs: ['REST', 'JOBS', 'MCP', 'FEED'], on: 2, live: false })}
  <div class="card"><pre class="code">curl "${esc(host)}/api/v1/scan?token=0x...&chain=base&wait=40"</pre>
  <div class="kv" style="margin-top:14px">
    <code>POST /api/scan</code><span>{"token", "chain"?, "fresh"?} → {"job"}; then /api/events?job=&after= and /api/result?job=</span>
    <code>GET /api/v1/scan</code><span>synchronous scan (token, chain, wait ≤ 90 s, fresh)</span>
    <code>GET /api/token/&lt;chain&gt;/&lt;token&gt;</code><span>latest stored result + history</span>
    <code>GET /api/card/&lt;chain&gt;/&lt;token&gt;.svg</code><span>share card (1200×630)</span>
    <code>GET /api/replay · /api/replay/&lt;chain&gt;/&lt;token&gt;</code><span>Rug Replay: rugs SWARM warned about, or one token's verdict timeline</span>
    <code>GET /api/dna/&lt;chain&gt;/&lt;token&gt;</code><span>Deployer DNA: the creator's other tokens and how each one ended</span>
    <code>X-Holder-Pass: &lt;pass&gt;</code><span>optional header: Holder Pass gets higher scan limits and priority (see the HOLDER PASS button)</span>
    <code>GET /badge/&lt;chain&gt;/&lt;token&gt;.svg</code><span>live "Scanned by SWARM" badge · ?style=flat for READMEs</span>
    <code>GET /api/wallet/&lt;address&gt;?chain=</code><span>swarm memory + live X-ray (EVM)</span>
    <code>GET https://app-server-sandy.vercel.app/api/radar</code><span>launch radar feed</span>
    <code>GET /api/cabals</code><span>crews seen as one swarm in ≥ 2 tokens</span>
    <code>GET /api/recent · https://app-server-sandy.vercel.app/api/stats · https://app-server-sandy.vercel.app/api/chains</code><span>lists and totals</span>
  </div></div>
  ${mcpBox()}
  <div class="section card"><h2 style="margin-bottom:10px">how the verdict works</h2>
  <div class="kv"><code>swarm 30</code><span>price drop if the biggest hand sold everything into the pool</span><code>fresh 20</code><span>share of top holders with ≤ 10 transactions ever</span><code>insiders 15</code><span>float that arrived before trading or from the creator</span><code>concentration 15</code><span>top-10 hands' share of float</span><code>snipers 10</code><span>float bought in the first minute</span><code>dev 10</code><span>creator + creator-funded wallets</span></div>
  <p class="muted" style="font-size:13px">Hard rules → DANGER: one hand can dump ≥ 50%, ≥ 80% fresh wallets, honeypot, owner can seize balances, freeze authority. Soft rules cap at RISKY (59): swarms of ≥ 3 wallets, packs, creator ≥ 10%, thin liquidity, active owner powers, unverified-proxy, swarm seen in another token.</p></div>`;
}

// ---------------------------------------------------------------- watchlist (local) + alerts
const WATCH_KEY = 'swarm_watch';
const watchList = () => { try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '[]'); } catch (e) { return []; } };
const watchSave = l => { try { localStorage.setItem(WATCH_KEY, JSON.stringify(l)); } catch (e) {} watchBadge(); };
const isWatched = (c, tk) => watchList().some(w => w.chain === c && w.token === tk);
const snap = r => ({ band: r.band, score: r.score, hands: r.metrics?.hands ?? r.hands, swarms: (r.clusters || []).filter(c => c.wallets.length > 1).length, decision: r.judge?.decision });
function watchBadge() {
  const l = watchList(), n = $('#watchn'); if (!n) return;
  n.textContent = l.length; $('#watchbtn').classList.toggle('alert', l.some(w => w.changed));
}
function watchToggle(r) {
  let l = watchList();
  if (isWatched(r.chain, r.token)) l = l.filter(w => !(w.chain === r.chain && w.token === r.token));
  else {
    l.unshift({ chain: r.chain, token: r.token, symbol: r.header?.symbol || '', image: r.header?.image || null, snap: snap(r), ts: r.scanned_at, added: Date.now() });
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  }
  watchSave(l.slice(0, 30));
  return isWatched(r.chain, r.token);
}
function alertUser(w, msg) {
  toast(`◎ ${w.symbol || short(w.token)}: ${msg}`);
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(`SWARM · ${w.symbol || short(w.token)}`, { body: msg, icon: '/favicon.png', tag: w.chain + w.token }); } catch (e) {}
}
let watchIdx = 0;
async function watchTick() {               // one token per tick: read the stored result, rescan it when stale
  const l = watchList(); if (!l.length || document.hidden) return;
  const w = l[watchIdx++ % l.length];
  try {
    const d = await api(`/api/token/${w.chain}/${w.token}`); const r = d.result; if (!r) return;
    if (r.scanned_at > (w.ts || 0)) {
      const now = snap(r), was = w.snap || {}, diff = [];
      if (now.band !== was.band) diff.push(`${was.band || '—'} → ${now.band}`);
      if (now.swarms > (was.swarms || 0)) diff.push(`new swarm (${now.swarms})`);
      if (now.hands != null && was.hands != null && now.hands < was.hands) diff.push(`hands ${was.hands} → ${now.hands}`);
      const L = watchList(), it = L.find(x => x.chain === w.chain && x.token === w.token);
      if (it) { it.snap = now; it.ts = r.scanned_at; if (diff.length) { it.changed = diff.join(' · '); } watchSave(L); }
      if (diff.length) alertUser(w, diff.join(' · '));
    } else if (Date.now() / 1000 - r.scanned_at > 15 * 60) {
      api('/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: w.token, chain: w.chain, fresh: true }) }).catch(() => {});
    }
  } catch (e) {}
}
setInterval(watchTick, 60000); setTimeout(watchTick, 4000);

// ---------------------------------------------------------------- command palette (Ctrl+K)
const cmd = (() => {
  const box = $('#cmd'), q = $('#cmdq'), list = $('#cmdl'); let items = [], sel = 0, recent = null;
  const isEvm = s => /^0x[0-9a-fA-F]{40}$/.test(s), isSol = s => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
  const pages = () => [['scan', 'decision engine · home', '/'], ['radar', 'launch radar', '/radar'], ['cabals', 'cabal board', '/cabals'], ['spider cam', 'watch the agents work live', '/cam'], ['replay', 'rugs SWARM warned about', '/replay'], ['molt', 'changelog · what shipped', '/molt'], ['api', 'docs · mcp', '/docs']];
  function build(s) {
    s = s.trim(); const lo = s.toLowerCase(), out = [];
    if (isEvm(s) || isSol(s)) {
      out.push({ k: 'SCAN', t: short(s), d: 'map holders → real hands', run: () => startScan(s, null) });
      out.push({ k: 'X-RAY', t: short(s), d: 'wallet x-ray', run: () => go('/w/' + s) });
    }
    watchList().filter(w => !lo || lo === 'watch' || (w.symbol || '').toLowerCase().includes(lo) || w.token.includes(lo))
      .forEach(w => out.push({ k: w.changed ? 'CHANGED' : 'WATCH', t: (w.symbol ? '$' + w.symbol : short(w.token)), d: w.changed || `${w.snap?.band || ''} ${w.snap?.score ?? ''} · ${w.chain}`, run: () => { const L = watchList(); const it = L.find(x => x.token === w.token); if (it) { delete it.changed; watchSave(L); } go(`/t/${w.chain}/${w.token}`); } }));
    pages().filter(([n, d]) => !lo || n.includes(lo) || d.includes(lo)).forEach(([n, d, p]) => out.push({ k: 'GO', t: n, d, run: () => go(p) }));
    (recent || []).filter(x => !lo || (x.symbol || '').toLowerCase().includes(lo) || (x.name || '').toLowerCase().includes(lo) || x.token.includes(lo)).slice(0, 8)
      .forEach(x => out.push({ k: x.band || 'SCAN', t: (x.symbol ? '$' + x.symbol : short(x.token)), d: `${x.score ?? ''} · ${x.wallets ?? '—'}→${x.hands ?? '—'} hands · ${x.chain}`, run: () => go(`/t/${x.chain}/${x.token}`) }));
    return out.slice(0, 14);
  }
  function paint() {
    items = build(q.value); sel = Math.min(sel, Math.max(0, items.length - 1));
    list.innerHTML = items.map((it, i) => `<div class="ci${i === sel ? ' on' : ''}" data-i="${i}"><span class="ck ${esc(it.k)}">${esc(it.k)}</span><b>${esc(it.t)}</b><span class="cd">${esc(it.d)}</span><span class="ce">↵</span></div>`).join('') || '<div class="ci empty">no match · paste a 0x address or a Solana mint</div>';
    $('#cmdst').textContent = `${items.length} result${items.length === 1 ? '' : 's'}`;
  }
  function open(prefill = '') {
    box.hidden = false; q.value = prefill; sel = 0; paint(); requestAnimationFrame(() => { box.classList.add('on'); q.focus(); });
    if (!recent) api('https://app-server-sandy.vercel.app/api/recent?limit=40').then(d => { recent = d.scans || []; if (!box.hidden) paint(); }).catch(() => { recent = []; });
  }
  function close() { box.classList.remove('on'); box.hidden = true; }
  function run(i) { const it = items[i]; if (!it) return; close(); it.run(); }
  q.addEventListener('input', () => { sel = 0; paint(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); paint(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
    else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('click', e => { const el = e.target.closest('[data-i]'); if (el) run(+el.dataset.i); });
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); box.hidden ? open() : close(); }
    else if (e.key === '/' && !typing && box.hidden) { e.preventDefault(); open(); }
  });
  $('#cmdk').addEventListener('click', () => open());
  $('#watchbtn').addEventListener('click', () => open('watch'));
  return { open, close };
})();
watchBadge();

// ---------------------------------------------------------------- boot
api('https://app-server-sandy.vercel.app/api/chains').then(d => { CHAINS = d.chains || []; projectInfo(d.project); }).catch(() => {}).finally(() => { applyI18n(); render(); });
api('https://app-server-sandy.vercel.app/api/holder/config').then(d => { HOLDER = d; holderButton(); const ps = passGet(); if (ps && ps.pass) api('/api/holder/me').then(m => { if (!m.holder) { passSet(null); holderButton(); } }).catch(() => {}); }).catch(() => {});
$('#holderbtn')?.addEventListener('click', holderPanel);
})();
