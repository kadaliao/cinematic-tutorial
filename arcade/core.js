'use strict';
/* 共享内核：数据、存档、路由、舞台演出、提示。各街机文件按顺序加载，共用全局作用域。 */
const D = window.DATA;
const MAP = {};
D.items.forEach(r => { MAP[r[0]] = { s: r[0], z: r[1], e: r[2], c: r[3], v: r[4], t: r[5], m: r[6], d: r[7] || '', d2: r[8] || '' }; });
const TOTAL = D.items.length;
const app = document.getElementById('app');
const $ = s => document.querySelector(s);

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  kids.flat(9).forEach(c => { if (c != null && c !== false) n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
  return n;
}
const B = t => h('b', null, t);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const pad = n => String(n).padStart(2, '0');
function rng(seed) {                       // mulberry32：每日片单与固定分包要稳定
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashStr = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
function seededShuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

/* ---------- 存档 ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('arc-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('arc-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
};
const SV = Object.assign({
  xp: 0, match: {}, pack: {}, dir: {}, lab: {}, mast: {}, seen: {}, ach: {},
  daily: { last: '', streak: 0, best: 0 }, endless: 0, bestCombo: 0, plays: 0,
  sound: true, motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}, store.get('save', {}));
const save = () => store.set('save', SV);
ARC.sound = SV.sound;
const levelOf = xp => 1 + Math.floor(Math.sqrt(xp / 80));
const xpFloor = lv => (lv - 1) * (lv - 1) * 80;
const sumStars = o => Object.keys(o).reduce((a, k) => a + (o[k] || 0), 0);
const mastCount = () => Object.keys(SV.mast).filter(s => SV.mast[s] > 0 && MAP[s]).length;
const seenCount = () => Object.keys(SV.seen).filter(s => MAP[s]).length;
function markSeen(slugs) { slugs.forEach(s => { SV.seen[s] = 1; }); }
function markMast(slug) { SV.mast[slug] = (SV.mast[slug] || 0) + 1; SV.seen[slug] = 1; }

/* ---------- 提示 ---------- */
let toastQ = [], toastBusy = false;
function toast(title, sub, kind) {
  toastQ.push({ title, sub, kind });
  if (!toastBusy) nextToast();
}
function nextToast() {
  const t = toastQ.shift();
  if (!t) { toastBusy = false; return; }
  toastBusy = true;
  const el = h('div', { class: 'toast ' + (t.kind || ''), role: 'status' }, h('b', null, t.title), t.sub ? h('span', null, t.sub) : null);
  document.body.appendChild(el);
  AU.ensure(); AU.star(2);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); nextToast(); }, 350); }, 2300);
}
function addXp(n) {
  const before = levelOf(SV.xp);
  SV.xp += n; save();
  const after = levelOf(SV.xp);
  if (after > before) toast('升级！Lv.' + after, '解锁更高的片场热度，继续冲', 'lv');
}

/* ---------- 路由 ---------- */
const ROUTES = [];
let cleanups = [];
const onLeave = fn => cleanups.push(fn);
const route_add = (re, fn) => ROUTES.push([re, fn]);
function route() {
  cleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } });
  cleanups = [];
  AU.stop();
  document.querySelectorAll('.modal').forEach(m => m.remove());
  app.textContent = '';
  const path = location.hash.replace(/^#/, '') || '/';
  for (const [re, fn] of ROUTES) { const m = path.match(re); if (m) { fn(...m.slice(1)); window.scrollTo(0, 0); return; } }
  go('#/');
}
window.addEventListener('hashchange', route);
const go = p => { location.hash = p; };

/* ---------- 通用部件 ---------- */
function toggles() {
  const mk = (label, key, after) => {
    const b = h('button', { type: 'button', class: 'tog' + (SV[key] ? ' on' : ''), 'aria-pressed': String(SV[key]), onclick: () => {
      SV[key] = !SV[key]; save(); if (key === 'sound') ARC.sound = SV.sound;
      b.classList.toggle('on', SV[key]); b.setAttribute('aria-pressed', String(SV[key]));
      if (after) after(SV[key]);
    } }, label);
    return b;
  };
  return h('div', { class: 'row', style: 'gap:8px' },
    mk('声音', 'sound', on => { if (!on) AU.stop(); }),
    mk('动效', 'motion', on => { const st = $('.stage'); if (st) st.classList.toggle('calm', !on); }));
}
function topbar(backTo) {
  const lv = levelOf(SV.xp), a = xpFloor(lv), b = xpFloor(lv + 1);
  return h('div', { class: 'bar' },
    backTo ? h('button', { type: 'button', class: 'back', onclick: () => go(backTo) }, '← 返回') : h('div', { class: 'logo' }, h('i'), h('span', null, '片场街机')),
    h('div', { class: 'sp' }),
    backTo ? h('a', { class: 'back', href: '#/' }, '大厅') : null,
    h('div', { class: 'lvl' }, h('div', { class: 'xp', title: SV.xp + ' XP · 距下一级 ' + (b - SV.xp) }, h('span', { style: 'width:' + Math.round((SV.xp - a) / (b - a) * 100) + '%' })), h('b', null, lv)),
    toggles());
}
function refBlock(slug) {
  const it = MAP[slug];
  const media = it.v && it.m
    ? h('video', { src: it.m, poster: it.t, muted: true, loop: true, autoplay: true, playsinline: true, preload: 'auto' })
    : h('img', { src: it.t, alt: '' });
  if (media.tagName === 'VIDEO') media.muted = true;
  return h('div', { class: 'ref' }, media);
}
function backdrop(t) { return h('p', { class: 'foot' }, t); }

/* ---------- 舞台：分层演出 ---------- */
const TIER_NAMES = ['开机', '第 1 幕\n胶片边', '第 2 幕\n颗粒', '第 3 幕\n镜头光', '终幕\n首映灯光'];
function makeStage() {
  const fx = h('div', { class: 'fx', 'aria-hidden': 'true' });
  const banner = h('div', { class: 'banner', role: 'status', 'aria-live': 'polite' });
  const el = h('div', { class: 'stage' + (SV.motion ? '' : ' calm'), 'data-tier': '0' },
    h('i', { class: 'lay bar-f t', 'aria-hidden': 'true' }), h('i', { class: 'lay bar-f b', 'aria-hidden': 'true' }),
    h('i', { class: 'lay grain', 'aria-hidden': 'true' }), h('i', { class: 'lay flare', 'aria-hidden': 'true' }),
    h('i', { class: 'lay beam l', 'aria-hidden': 'true' }), h('i', { class: 'lay beam r', 'aria-hidden': 'true' }));
  const S = {
    el, fx, banner, tier: 0,
    finish() { el.appendChild(fx); el.appendChild(banner); return el; },
    setTier(n, silent) {
      if (n <= S.tier) return;
      S.tier = n; el.setAttribute('data-tier', String(n));
      AU.start(n); AU.stage = n;
      if (silent) return;
      AU.stageUp();
      banner.textContent = TIER_NAMES[n]; banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
      if (SV.motion) { el.classList.remove('slam'); void el.offsetWidth; el.classList.add('slam'); S.burst(28); }
    },
    burst(n, ox, oy) {
      if (!SV.motion) return;
      const r = el.getBoundingClientRect(), cols = ['var(--amber)', '#fff', 'var(--lime)', 'var(--pink)', 'var(--cyan)'];
      const x = ox == null ? r.width / 2 : ox - r.left, y = oy == null ? r.height * 0.4 : oy - r.top;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 220;
        const p = h('i', { class: 'pc', style: 'left:' + x + 'px;top:' + y + 'px;--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d - 60) + 'px;--r:' + Math.round(Math.random() * 540 - 270) + 'deg;--c:' + cols[i % cols.length] + ';--w:' + (6 + Math.round(Math.random() * 8)) + 'px' });
        p.addEventListener('animationend', () => p.remove());
        fx.appendChild(p);
      }
    }
  };
  return S;
}

/* 成就钩子：album.js 里实现 */
let checkAch = () => {};
