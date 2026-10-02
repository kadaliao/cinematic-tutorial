(() => {
'use strict';
const D = window.DATA;
const MAP = {};
D.items.forEach(r => { MAP[r[0]] = { s: r[0], z: r[1], e: r[2], c: r[3], v: r[4], t: r[5], m: r[6], d: r[7] || '' }; });
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
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const pad = n => String(n).padStart(2, '0');

/* ---------- 存档 ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('arc-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('arc-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
};
const SV = Object.assign({ xp: 0, match: {}, dir: {}, plays: 0, sound: true, motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }, store.get('save', {}));
const save = () => store.set('save', SV);
ARC.sound = SV.sound;
const levelOf = xp => 1 + Math.floor(Math.sqrt(xp / 80));
const xpFloor = lv => (lv - 1) * (lv - 1) * 80;
function addXp(n) { SV.xp += n; save(); }
const sumStars = o => Object.keys(o).reduce((a, k) => a + (o[k] || 0), 0);

/* ---------- 路由与清理 ---------- */
let cleanups = [];
const onLeave = fn => cleanups.push(fn);
function route() {
  cleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } });
  cleanups = [];
  AU.stop();
  app.textContent = '';
  const m = location.hash.replace(/^#\/?/, '').split('/');
  if (m[0] === 'match') { if (m[1] != null && m[1] !== '') matchPlay(+m[1]); else matchMap(); }
  else if (m[0] === 'dir') { if (m[1] != null && m[1] !== '') dirPlay(+m[1]); else dirMap(); }
  else hub();
  window.scrollTo(0, 0);
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
    h('div', { class: 'lvl' }, h('div', { class: 'xp', title: SV.xp + ' XP' }, h('span', { style: 'width:' + Math.round((SV.xp - a) / (b - a) * 100) + '%' })), h('b', null, lv)),
    toggles());
}

/* ---------- 舞台：分层演出（共用）---------- */
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
const meterBox = (label, valEl) => h('div', { class: 'grow' }, h('div', { class: 'lab' }, h('span', null, label), valEl || null));

/* ---------- 大厅 ---------- */
function hub() {
  app.appendChild(topbar());
  const mS = sumStars(SV.match), dS = sumStars(SV.dir);
  app.appendChild(h('div', { class: 'marquee' }, h('h1', null, '片场街机'), h('p', null, '不读讲义，上手就玩：玩着玩着，电影语言就进脑子里了。')));
  app.appendChild(h('div', { class: 'cabs' },
    cabinet('#/match', 'var(--pink)', '街机 01', '对片', '12 秒内把「手法名」和它的「片例」配成对。连消越多，片场越疯。', '★ ' + mS + ' / 36', icon('match')),
    cabinet('#/dir', 'var(--cyan)', '街机 02', '导演椅', '别猜了，自己拍：拖动取景器，亲手演出荷兰角、推镜、甩镜、跟拍……', '★ ' + dS + ' / 36', icon('dir'))));
  app.appendChild(h('p', { class: 'foot' }, '片例与手法定义取自 ',
    h('a', { href: 'https://melies.co/cinematic-techniques', target: '_blank', rel: 'noopener' }, 'Melies · Cinematic techniques'),
    '，中文为学习用对照翻译，版权归原站所有。进度只保存在你的浏览器里。　',
    h('a', { href: 'https://cinematic-tutorial.vercel.app/' }, '← 看图文教程版')));
}
function cabinet(href, color, tag, title, desc, stars, ico) {
  return h('a', { class: 'cab', href, style: '--c:' + color },
    ico, h('span', { class: 'tag' }, tag), h('h2', null, title), h('p', null, desc), h('div', { class: 'stars' }, stars),
    h('span', { class: 'btn play ' + (color.indexOf('pink') > 0 ? 'pink' : '') }, '开始 ▶'));
}
function icon(kind) {
  const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true');
  const add = (tag, a) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); s.appendChild(e); };
  if (kind === 'match') {
    add('rect', { x: 6, y: 14, width: 22, height: 30, rx: 5, fill: '#ff4f9a' }); add('rect', { x: 32, y: 22, width: 24, height: 30, rx: 5, fill: '#ffc247' });
    add('path', { d: 'M20 29 L44 37', stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 7' });
  } else {
    add('rect', { x: 8, y: 20, width: 36, height: 26, rx: 5, fill: '#3de1ff' }); add('path', { d: 'M44 28 L58 20 V46 L44 38 Z', fill: '#3de1ff' });
    add('circle', { cx: 20, cy: 33, r: 6, fill: '#0a0912' }); add('path', { d: 'M18 12 L28 20 M34 10 L36 20', stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round' });
  }
  return s;
}

/* =====================================================
   街机 01 · 对片
   ===================================================== */
const ROUND_TIME = [45, 40, 35];
function matchMap() {
  app.appendChild(topbar('#/'));
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, '对片'), h('p', null, '12 个片场关卡，对应 12 章。一关 3 回合，每回合 6 对。过一关解锁下一关。')));
  app.appendChild(h('div', { class: 'map' }, D.chapters.map((c, i) => {
    const open = i === 0 || (SV.match[i - 1] || 0) >= 1, st = SV.match[i] || 0;
    return h('button', { type: 'button', class: 'node' + (open ? '' : ' lock') + (st ? ' done' : ''), disabled: !open, onclick: () => open && go('#/match/' + i) },
      h('span', { class: 'no' }, pad(i + 1)), h('span', { class: 'nm' }, c.n), h('span', { class: 'sb' }, c.sub), h('span', { class: 'st' }, starStr(st)));
  })));
}
function buildLevel(li) {
  const pool = D.chapters[li].s.filter(s => MAP[s]);
  const cats = {}; pool.forEach(s => { cats[MAP[s].c] = 1; });
  const extra = D.items.map(r => r[0]).filter(s => pool.indexOf(s) < 0);
  shuffle(extra);
  extra.sort((a, b) => (cats[MAP[b].c] ? 1 : 0) - (cats[MAP[a].c] ? 1 : 0));
  const all = pool.concat(extra.slice(0, Math.max(0, 18 - pool.length))).slice(0, 18);
  shuffle(all);
  return [all.slice(0, 6), all.slice(6, 12), all.slice(12, 18)];
}
function matchPlay(li) {
  if (!D.chapters[li] || (li > 0 && !(SV.match[li - 1] >= 1))) { go('#/match'); return; }
  const G = { li, rounds: buildLevel(li), r: 0, matches: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, live: false, sel: null, tiles: [], left: 0, tl: 0, timer: 0, rm: {} };
  const stage = makeStage();
  const comboEl = h('b', null, '×0'), scoreEl = h('b', null, '0'), roundEl = h('span', null, ''), timeEl = h('span', null, '');
  const meterIn = h('span');
  const meter = h('div', { class: 'meter' }, meterIn);
  const comboBox = h('div', { class: 'num combo' }, comboEl, h('small', null, '连击'));
  const board = h('div', { class: 'board', role: 'group', 'aria-label': '配对棋盘' });
  const cap = h('div', { class: 'cap' }, '点一张「名字牌」，再点它对应的「片例牌」。');
  stage.el.append(
    h('div', { class: 'hud' }, h('div', { class: 'grow' }, h('div', { class: 'lab' }, roundEl, timeEl), meter), comboBox, h('div', { class: 'num' }, scoreEl, h('small', null, '得分'))),
    board, cap);
  stage.finish();
  app.appendChild(topbar('#/match'));
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, pad(li + 1) + ' · ' + D.chapters[li].n), h('p', null, D.chapters[li].sub)));
  app.appendChild(stage.el);
  onLeave(() => { clearInterval(G.timer); G.live = false; });

  const upd = () => {
    comboEl.textContent = '×' + G.combo; scoreEl.textContent = G.score;
    comboBox.classList.toggle('hot', G.combo >= 3);
    roundEl.textContent = '第 ' + (G.r + 1) + ' / 3 回合 · 已配 ' + G.matches + ' / 18';
  };
  function countdown(done) {
    const num = h('span', null, '3'), cd = h('div', { class: 'cd' }, num);
    stage.el.appendChild(cd);
    let n = 3; AU.blip(false);
    const iv = setInterval(() => {
      n--;
      if (n > 0) { num.textContent = String(n); num.style.animation = 'none'; void num.offsetWidth; num.style.animation = ''; AU.blip(false); }
      else { clearInterval(iv); num.textContent = '开拍！'; AU.blip(true); AU.clap(); setTimeout(() => { cd.remove(); done(); }, 450); }
    }, 800);
    onLeave(() => clearInterval(iv));
  }
  function startRound() {
    const slugs = G.rounds[G.r];
    board.textContent = '';
    G.sel = null; G.rm = {};
    const specs = [];
    slugs.forEach(s => { specs.push({ s, k: 'name' }); specs.push({ s, k: 'frame' }); });
    shuffle(specs);
    G.tiles = specs.map(sp => {
      const it = MAP[sp.s];
      const el = sp.k === 'name'
        ? h('button', { type: 'button', class: 'tile name' }, h('b', null, it.z), h('small', { lang: 'en' }, it.e))
        : h('button', { type: 'button', class: 'tile frame', 'aria-label': '片例：' + it.e }, h('img', { src: it.t, alt: '', draggable: 'false' }), it.v ? h('i', { class: 'pl' }) : null);
      const t = { slug: sp.s, kind: sp.k, el, done: false };
      el.addEventListener('click', () => pick(t));
      if (sp.k === 'frame') el.querySelector('img').addEventListener('error', () => { el.textContent = ''; el.appendChild(h('small', { lang: 'en', style: 'color:var(--dim)' }, it.e)); });
      board.appendChild(el);
      return t;
    });
    G.tl = ROUND_TIME[G.r]; G.left = G.tl;
    upd(); setMeter();
    countdown(() => { G.live = true; clearInterval(G.timer); G.timer = setInterval(tick, 100); });
  }
  function setMeter() { meterIn.style.transform = 'scaleX(' + clamp(G.left / G.tl, 0, 1) + ')'; meter.classList.toggle('low', G.left < 10); timeEl.textContent = Math.ceil(G.left) + ' 秒'; }
  function tick() {
    if (!G.live) return;
    G.left -= 0.1; setMeter();
    if (G.left <= 0) { G.left = 0; setMeter(); timeUp(); }
  }
  function mark(t, on) { t.el.classList.toggle('sel', on); }
  function pick(t) {
    if (!G.live || t.done) return;
    AU.ensure();
    if (!G.sel) { G.sel = t; mark(t, true); AU.pick(); return; }
    if (G.sel === t) { mark(t, false); G.sel = null; return; }
    if (G.sel.kind === t.kind) { mark(G.sel, false); G.sel = t; mark(t, true); AU.pick(); return; }
    const a = G.sel; mark(a, false); G.sel = null;
    if (a.slug === t.slug) hit(a, t); else miss(a, t);
  }
  function hit(a, b) {
    a.done = b.done = true;
    a.el.classList.add('gone'); b.el.classList.add('gone');
    G.matches++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.score += 100 + 20 * Math.min(G.combo, 10) + Math.round(G.left);
    if (G.combo >= 3) G.left = Math.min(G.tl, G.left + 1.5);
    const it = MAP[a.slug];
    cap.textContent = ''; cap.appendChild(B(it.z)); cap.appendChild(document.createTextNode(it.d || it.e));
    cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop');
    AU.hit(G.combo);
    const r = (a.kind === 'frame' ? a : b).el.getBoundingClientRect();
    stage.burst(8 + stage.tier * 5, r.left + r.width / 2, r.top + r.height / 2);
    upd(); setMeter();
    stage.setTier(Math.min(4, Math.floor(G.matches * 5 / 18)));
    if (G.tiles.every(x => x.done)) roundDone(false);
  }
  function miss(a, b) {
    G.miss++; G.combo = 0; AU.miss();
    [a, b].forEach(t => { t.el.classList.remove('nope'); void t.el.offsetWidth; t.el.classList.add('nope'); setTimeout(() => t.el.classList.remove('nope'), 420); });
    G.rm[a.slug] = (G.rm[a.slug] || 0) + 1; G.rm[b.slug] = (G.rm[b.slug] || 0) + 1;
    // 同一对失误两次：悄悄亮起它的搭档，不扣分
    [a, b].forEach(t => {
      if (G.rm[t.slug] >= 2) {
        const partner = G.tiles.find(x => x.slug === t.slug && x.kind !== t.kind && !x.done);
        if (partner) partner.el.classList.add('hint');
      }
    });
    upd();
  }
  function timeUp() {
    G.live = false; clearInterval(G.timer);
    const cols = ['#ff4f9a', '#3de1ff', '#b6ff5c', '#ffc247', '#c58bff', '#ff8a5c'];
    const seen = {};
    G.tiles.forEach(t => {
      if (t.done) return;
      if (seen[t.slug] == null) seen[t.slug] = cols[Object.keys(seen).length % cols.length];
      t.el.style.setProperty('--pc', seen[t.slug]); t.el.classList.add('rev'); t.el.classList.remove('sel', 'hint');
    });
    G.combo = 0; upd(); AU.miss();
    cap.textContent = ''; cap.appendChild(B('时间到')); cap.appendChild(document.createTextNode('没配完的牌按颜色亮出了答案，看一遍再继续。不扣分。'));
    setTimeout(() => roundDone(true), 3200);
  }
  function roundDone(timed) {
    G.live = false; clearInterval(G.timer);
    if (G.r >= 2) { setTimeout(levelEnd, timed ? 0 : 500); return; }
    G.r++;
    setTimeout(() => { if (G.live === false) startRound(); }, timed ? 0 : 600);
  }
  function levelEnd() {
    AU.stop(); AU.fin();
    const all = G.matches >= 18;
    const stars = all ? (G.miss <= 1 ? 3 : G.miss <= 4 ? 2 : 1) : 0;
    const prev = SV.match[li] || 0;
    if (stars > prev) SV.match[li] = stars;
    const xp = stars * 60 + G.matches * 5; addXp(xp); SV.plays++; save();
    const starEls = [0, 1, 2].map(k => h('i', null, '★'));
    const next = li < 11 && (SV.match[li] || 0) >= 1;
    board.replaceWith(h('div', { class: 'res' },
      h('p', { class: 'xpg' }, stars ? '过关！' : '差一点，再来一次'),
      h('div', { class: 'stars', 'aria-label': stars + ' 星' }, starEls),
      h('div', { class: 'big' }, G.score),
      h('p', null, '配对 ' + G.matches + ' / 18 · 失误 ' + G.miss + ' 次 · 最长 ' + G.maxCombo + ' 连击'),
      h('p', { class: 'xpg' }, '+' + xp + ' XP'),
      h('div', { class: 'row', style: 'justify-content:center' },
        next ? h('button', { type: 'button', class: 'btn', onclick: () => go('#/match/' + (li + 1)) }, '下一关 ▶') : null,
        h('button', { type: 'button', class: 'btn alt', onclick: () => { if (location.hash === '#/match/' + li) route(); else go('#/match/' + li); } }, '再玩一次'),
        h('button', { type: 'button', class: 'btn alt', onclick: () => go('#/match') }, '关卡图'))));
    cap.textContent = ''; cap.appendChild(B('小提示')); cap.appendChild(document.createTextNode('星级只看失误次数：失误 ≤1 三星，≤4 两星，配完就一星。'));
    if (stars) stage.setTier(4, true);
    stage.burst(46);
    starEls.forEach((el, k) => { if (k < stars) setTimeout(() => { el.classList.add('on'); AU.star(k); }, 500 + k * 450); });
  }
  AU.ensure();
  startRound();
}

/* =====================================================
   街机 02 · 导演椅
   ===================================================== */
const DT = [
  { slug: 'dutch-angle', name: '荷兰角', init: {}, goal: ['把地平线', B('歪过来'), '：用「滚转」滑杆让画面倾斜超过 12°，保持半秒。'] },
  { slug: 'push-in', name: '推镜头', init: { d: 0 }, goal: [B('推进'), '：用「推拉」滑杆（或滚轮）把镜头推向人物，3 秒内推进一大段。远处和近处的大小变化不一样——这才是真推。'] },
  { slug: 'dolly-out', name: '后拉', init: { d: 0.85 }, goal: [B('后拉'), '：镜头一开始已经贴近人物，3 秒内把它拉远。'] },
  { slug: 'pan', name: '摇镜头', init: { x: -0.7 }, goal: [B('摇'), '：缓缓向右摇过去，约 3 秒摇出一大段。太快就变成甩镜了。'] },
  { slug: 'whip-pan', name: '甩镜头', init: { x: -0.9 }, goal: [B('甩'), '：用不到半秒的时间，猛地把镜头甩到另一边。'] },
  { slug: 'tilt-up', name: '向上摇', init: { y: -0.5 }, goal: ['镜头从地面', B('向上摇'), '，把视线带到天空。'] },
  { slug: 'tilt-down', name: '向下摇', init: { y: 0.6 }, goal: ['镜头从天空', B('向下摇'), '，落到地面的人物身上。'] },
  { slug: 'rack-focus', name: '焦点转移', init: { focus: 0 }, goal: ['现在焦点在近处的树上。2.5 秒内用「对焦」滑杆', B('拉到远处'), '，让观众的视线跟过去。'] },
  { slug: 'handheld', name: '手持', init: {}, goal: ['模拟肩扛：在取景器里', B('小幅度来回抖'), '（拖着鼠标 / 手指小幅乱晃），1.5 秒内抖出足够多的往返。'] },
  { slug: 'tracking', name: '跟拍', init: { x: -0.9 }, goal: ['人物在走！', B('跟着他摇'), '，让他一直待在画面中间，坚持 3.5 秒。'], mover: true },
  { slug: 'close-up', name: '特写', init: {}, goal: [B('特写'), '：把变焦推到 2.2 倍以上，并让人物保持在画面中央。'] },
  { slug: 'crash-zoom-in', name: '急推变焦', init: {}, goal: [B('急推'), '：用「变焦」滑杆，在 0.6 秒内猛地推进一大段。'] }
];
function dirMap() {
  app.appendChild(topbar('#/'));
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, '导演椅'), h('p', null, '12 个镜头任务：照着参考片，自己动手拍出来。连拍越多，片场越热。')));
  app.appendChild(h('div', { class: 'dir-grid' }, DT.map((t, i) => {
    const it = MAP[t.slug], st = SV.dir[i] || 0;
    return h('button', { type: 'button', class: 'dir-card', onclick: () => go('#/dir/' + i) },
      h('div', { class: 'th' }, h('img', { src: it.t, alt: '', loading: 'lazy' })),
      h('b', null, pad(i + 1) + ' ' + t.name), h('small', null, it.e), h('span', { class: 'st' }, starStr(st)));
  })));
}
const RNG = { x: [-1.6, 1.6], y: [-0.9, 0.9], d: [0, 1], lens: [0.75, 3.2], roll: [-30, 30], focus: [0, 1] };
const K = [0.1, 0.35, 0.9, 2.0];       // 各景深层的推进（dolly）放大系数：越近越大 = 视差
const FPOS = [1, 0.8, 0.45, 0];        // 各层的合焦位置
let dirSession = 0;
function dirPlay(i) {
  const T = DT[i];
  if (!T) { go('#/dir'); return; }
  const it = MAP[T.slug];
  const S = Object.assign({ x: 0, y: 0, d: 0, lens: 1, roll: 0, focus: 0.45 }, T.init);
  const C = { hist: [], h: {}, t0: 0, done: false, last: 0 };
  const stage = makeStage();
  if (dirSession) stage.setTier(Math.min(4, dirSession), true);

  // ---- 场景：4 层景深 ----
  const L = [0, 1, 2, 3].map(() => h('div', { class: 'ly' }));
  const sceneBox = (cls, st, kids) => h('div', { class: cls, style: st }, kids || null);
  L[0].append(
    sceneBox('', 'position:absolute;inset:0;background:linear-gradient(180deg,#140f45 0%,#6a2a82 34%,#ff6f6b 52%,#ffd28a 64%,#ffd28a 100%)'),
    sceneBox('', 'position:absolute;left:62%;top:42%;width:12%;aspect-ratio:1;border-radius:50%;background:#fff3c4;box-shadow:0 0 0 18px rgba(255,243,196,.18),0 0 90px 30px rgba(255,200,120,.7)'),
    sceneBox('', 'position:absolute;left:18%;top:26%;width:20%;height:5%;border-radius:99px;background:rgba(255,160,160,.55)'),
    sceneBox('', 'position:absolute;left:52%;top:20%;width:26%;height:4%;border-radius:99px;background:rgba(255,190,170,.45)'));
  L[1].append(
    sceneBox('', 'position:absolute;left:0;right:0;top:44%;height:24%;background:#3a1f66;clip-path:polygon(0 100%,0 60%,8% 38%,16% 58%,26% 22%,38% 54%,48% 34%,58% 60%,70% 18%,82% 52%,92% 36%,100% 58%,100% 100%)'),
    sceneBox('', 'position:absolute;left:0;right:0;top:55%;height:14%;background:#2a1650;clip-path:polygon(0 100%,0 40%,5% 40%,5% 20%,10% 20%,10% 55%,16% 55%,16% 30%,22% 30%,22% 60%,70% 60%,70% 25%,76% 25%,76% 45%,84% 45%,84% 15%,90% 15%,90% 50%,100% 50%,100% 100%)'));
  const subj = h('div', { style: 'position:absolute;left:50%;top:50%;width:8%;height:24%;margin:-4% 0 0 -4%' },
    h('div', { style: 'position:absolute;left:25%;top:0;width:50%;aspect-ratio:1;border-radius:50%;background:#ffd1a6' }),
    h('div', { style: 'position:absolute;left:5%;top:34%;width:90%;height:38%;border-radius:30% 30% 12% 12%;background:#ff3d6e;box-shadow:inset 0 -6px 0 rgba(0,0,0,.18)' }),
    h('div', { style: 'position:absolute;left:18%;top:70%;width:24%;height:30%;background:#1c1a3a;border-radius:3px' }),
    h('div', { style: 'position:absolute;left:58%;top:70%;width:24%;height:30%;background:#1c1a3a;border-radius:3px' }));
  L[2].append(
    sceneBox('', 'position:absolute;left:0;right:0;top:62%;bottom:0;background:linear-gradient(180deg,#3d2a63,#1d1438)'),
    sceneBox('', 'position:absolute;left:34%;right:34%;top:62%;bottom:0;background:#52407e;clip-path:polygon(40% 0,60% 0,100% 100%,0 100%)'),
    sceneBox('', 'position:absolute;left:30%;top:45%;width:.9%;height:20%;background:#120d28'), sceneBox('', 'position:absolute;left:68%;top:45%;width:.9%;height:20%;background:#120d28'),
    sceneBox('', 'position:absolute;left:29.2%;top:43%;width:2.5%;aspect-ratio:1;border-radius:50%;background:#ffe9a3;box-shadow:0 0 22px 8px rgba(255,220,140,.55)'),
    sceneBox('', 'position:absolute;left:67.2%;top:43%;width:2.5%;aspect-ratio:1;border-radius:50%;background:#ffe9a3;box-shadow:0 0 22px 8px rgba(255,220,140,.55)'),
    subj);
  L[3].append(
    sceneBox('', 'position:absolute;left:6%;top:12%;width:4.5%;bottom:0;background:#0d0a1e;border-radius:6px 6px 0 0'),
    sceneBox('', 'position:absolute;left:-2%;top:6%;width:22%;aspect-ratio:1;border-radius:50%;background:#150f2e'),
    sceneBox('', 'position:absolute;right:6%;top:22%;width:3.5%;bottom:0;background:#0d0a1e;border-radius:6px 6px 0 0'),
    sceneBox('', 'position:absolute;right:-3%;top:14%;width:24%;aspect-ratio:1;border-radius:50%;background:#150f2e'),
    sceneBox('', 'position:absolute;left:0;right:0;bottom:0;height:14%;background:#0b0818'));
  const world = h('div', { class: 'world' }, L);
  const shotIn = h('span');
  const tcEl = h('span', { class: 'tc' }, '00:00:00');
  const vf = h('div', { class: 'vf', role: 'application', 'aria-label': '取景器：拖动来摇、摇（pan / tilt）' },
    world,
    h('div', { class: 'vfui', 'aria-hidden': 'true' }, h('i', { class: 'c tl' }), h('i', { class: 'c tr' }), h('i', { class: 'c bl' }), h('i', { class: 'c br' }), h('span', { class: 'rec' }, 'REC'), tcEl, h('i', { class: 'cross' })),
    h('div', { class: 'shotbar' }, shotIn));

  // ---- 控件 ----
  const sliders = {};
  const mkSlider = (key, label, min, max, step, fmt) => {
    const val = h('em', null, '');
    const inp = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), 'aria-label': label });
    inp.addEventListener('input', () => { S[key] = clamp(+inp.value, RNG[key][0], RNG[key][1]); AU.ensure(); });
    sliders[key] = { inp, val, fmt };
    return h('label', null, h('span', null, label, val), inp);
  };
  const ctl = h('div', { class: 'ctl' },
    mkSlider('d', '推拉 Dolly', 0, 1, 0.005, v => Math.round(v * 100) + '%'),
    mkSlider('lens', '变焦 Zoom', 0.75, 3.2, 0.01, v => v.toFixed(2) + '×'),
    mkSlider('roll', '滚转 Roll', -30, 30, 0.5, v => v.toFixed(0) + '°'),
    mkSlider('focus', '对焦 Focus', 0, 1, 0.005, v => (v < 0.2 ? '近' : v > 0.7 ? '远' : '中')));

  const refMedia = it.v && it.m
    ? h('video', { src: it.m, poster: it.t, muted: true, loop: true, autoplay: true, playsinline: true, preload: 'auto' })
    : h('img', { src: it.t, alt: '' });
  if (refMedia.tagName === 'VIDEO') refMedia.muted = true;
  const cutBox = h('div');
  const tierName = h('span', null, '');
  stage.el.append(
    h('div', { class: 'hud' }, h('div', { class: 'grow' }, h('div', { class: 'lab' }, h('span', null, '镜头 ' + (i + 1) + ' / ' + DT.length), tierName))),
    h('div', { class: 'dplay' },
      h('div', null, vf, ctl, h('p', { class: 'tip' }, '拖动取景器 = 摇 / 俯仰　·　滚轮 = 推拉　·　键盘：', h('kbd', null, '←↑↓→'), ' 摇摆　', h('kbd', null, 'W S'), ' 推拉　', h('kbd', null, 'Z X'), ' 变焦　', h('kbd', null, 'Q E'), ' 滚转　', h('kbd', null, 'R'), ' 复位')),
      h('div', { class: 'brief' },
        h('div', { class: 'reft' }, '照这个拍 ▸ 原片参考'),
        h('div', { class: 'ref' }, refMedia),
        h('h3', null, T.name, h('small', { lang: 'en' }, it.e)),
        h('div', { class: 'goal' }, T.goal),
        h('p', { class: 'tip', style: 'margin:0' }, it.d))),
    cutBox);
  stage.finish();
  app.appendChild(topbar('#/dir'));
  app.appendChild(stage.el);

  // ---- 渲染 ----
  let vw = 1, vh = 1;
  const measure = () => { const r = vf.getBoundingClientRect(); vw = r.width || 1; vh = r.height || 1; };
  const SUBJ_W = 0.9;
  const subjX = t => (T.mover ? SUBJ_W * Math.sin(t * 0.7 - Math.PI / 2) : 0);
  function render(t) {
    const sx = subjX(t);
    subj.style.left = (50 + sx * 22.7) + '%';
    world.style.transform = 'rotate(' + S.roll + 'deg)';
    for (let k = 0; k < 4; k++) {
      const s = S.lens * (1 + S.d * K[k]);
      L[k].style.transform = 'translate(' + (-S.x * vw / 2 * S.lens).toFixed(1) + 'px,' + (S.y * vh / 2 * S.lens).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
      const b = Math.abs(S.focus - FPOS[k]) * 14;
      L[k].style.filter = b > 0.6 ? 'blur(' + b.toFixed(1) + 'px)' : 'none';
    }
    for (const k in sliders) {
      const sl = sliders[k];
      if (document.activeElement !== sl.inp) sl.inp.value = String(S[k]);
      sl.val.textContent = sl.fmt(S[k]);
    }
    return sx;
  }
  const mx = (hs, f) => hs.reduce((a, s) => Math.max(a, s[f]), -1e9), mn = (hs, f) => hs.reduce((a, s) => Math.min(a, s[f]), 1e9);
  const hold = (key, cond, sec, dt) => { C.h[key] = cond ? (C.h[key] || 0) + dt : 0; return C.h[key] / sec; };
  function judge(now, dt, so) {
    const H = C.hist, win = sec => H.filter(s => s.t >= now - sec);
    const w3 = win(3), w25 = win(2.5), w15 = win(1.5), w06 = win(0.6), w05 = win(0.5);
    switch (T.slug) {
      case 'dutch-angle': return hold('a', Math.abs(S.roll) >= 12, 0.5, dt);
      case 'push-in': return (S.d - mn(w3, 'd')) / 0.55;
      case 'dolly-out': return (mx(w3, 'd') - S.d) / 0.55;
      case 'pan': {
        let vmax = 0; for (let k = 1; k < w3.length; k++) vmax = Math.max(vmax, Math.abs(w3[k].x - w3[k - 1].x) / Math.max(0.001, w3[k].t - w3[k - 1].t));
        const dx = Math.abs(S.x - w3[0].x);
        return vmax > 1.6 ? 0 : dx / 1.2;
      }
      case 'whip-pan': return Math.abs(S.x - w05[0].x) / 1.4;
      case 'tilt-up': return (S.y - mn(w3, 'y')) / 0.7;
      case 'tilt-down': return (mx(w3, 'y') - S.y) / 0.7;
      case 'rack-focus': return mn(w25, 'focus') <= 0.3 ? (S.focus - mn(w25, 'focus')) / 0.6 : 0;
      case 'handheld': {
        let rev = 0, pdx = 0, pdy = 0;
        for (let k = 1; k < w15.length; k++) {
          const dx = w15[k].x - w15[k - 1].x, dy = w15[k].y - w15[k - 1].y;
          if (Math.abs(dx) > 0.004) { if (pdx && Math.sign(dx) !== Math.sign(pdx)) rev++; pdx = dx; }
          if (Math.abs(dy) > 0.004) { if (pdy && Math.sign(dy) !== Math.sign(pdy)) rev++; pdy = dy; }
        }
        const small = mx(w15, 'x') - mn(w15, 'x') < 0.45 && mx(w15, 'y') - mn(w15, 'y') < 0.45;
        return small ? rev / 8 : 0;
      }
      case 'tracking': return hold('a', Math.abs(so) <= 0.22, 3.5, dt);
      case 'close-up': return hold('a', S.lens >= 2.2 && Math.abs(so) <= 0.18, 0.6, dt);
      case 'crash-zoom-in': return (S.lens - mn(w06, 'lens')) / 1.2;
      default: return 0;
    }
  }
  let raf = 0, lastT = 0, started = false;
  const keys = {};
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const now = ts / 1000, dt = lastT ? Math.min(0.1, now - lastT) : 0.016; lastT = now;
    if (!started) { started = true; C.t0 = now; }
    const et = now - C.t0;
    // 键盘持续输入
    const sp = dt * 1.2;
    if (keys.ArrowLeft) S.x -= sp; if (keys.ArrowRight) S.x += sp; if (keys.ArrowUp) S.y += sp; if (keys.ArrowDown) S.y -= sp;
    if (keys.w || keys.W) S.d += dt * 0.5; if (keys.s || keys.S) S.d -= dt * 0.5;
    if (keys.z || keys.Z) S.lens -= dt * 1.4; if (keys.x || keys.X) S.lens += dt * 1.4;
    if (keys.q || keys.Q) S.roll -= dt * 25; if (keys.e || keys.E) S.roll += dt * 25;
    for (const k in RNG) S[k] = clamp(S[k], RNG[k][0], RNG[k][1]);
    const lim = Math.max(0.3, 2.2 - 1 / S.lens); S.x = clamp(S.x, -lim, lim); S.y = clamp(S.y, -lim, lim);
    const sx = render(et);
    const so = S.lens * (sx * (1 + S.d * K[2]) - S.x);
    const mm = Math.floor(et); tcEl.textContent = '00:' + pad(Math.floor(mm / 60)) + ':' + pad(mm % 60);
    C.hist.push({ t: et, x: S.x, y: S.y, d: S.d, lens: S.lens, roll: S.roll, focus: S.focus, so });
    while (C.hist.length && C.hist[0].t < et - 4) C.hist.shift();
    if (C.done || et < 0.4) return;           // 开场 0.4 秒不判，避免初始姿态误触
    const p = clamp(judge(et, dt, so), 0, 1);
    shotIn.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    if (p >= 1) cutDone(et);
  }
  function cutDone(et) {
    C.done = true;
    const stars = et <= 8 ? 3 : et <= 18 ? 2 : 1;
    const first = !(SV.dir[i] >= 1);
    if (stars > (SV.dir[i] || 0)) SV.dir[i] = stars;
    const xp = stars * 40 + (first ? 30 : 0); addXp(xp); SV.plays++; save();
    dirSession++;
    AU.hit(6); AU.clap();
    stage.setTier(Math.min(4, dirSession));
    stage.burst(30);
    const nextI = i + 1 < DT.length ? i + 1 : null;
    cutBox.replaceWith(h('div', { class: 'cut' },
      h('div', { class: 'big' }, 'CUT！'),
      h('div', { class: 'stars' }, starStr(stars)),
      h('p', { class: 'sub' }, B(T.name), it.d),
      h('p', { class: 'xpg', style: 'color:var(--lime);font-weight:900' }, '+' + xp + ' XP · 用时 ' + et.toFixed(1) + ' 秒'),
      h('div', { class: 'row' },
        nextI != null ? h('button', { type: 'button', class: 'btn', onclick: () => go('#/dir/' + nextI) }, '下一个镜头 ▶') : null,
        h('button', { type: 'button', class: 'btn alt', onclick: () => route() }, '再拍一遍'),
        h('button', { type: 'button', class: 'btn alt', onclick: () => go('#/dir') }, '镜头列表'))));
    for (let k = 0; k < stars; k++) setTimeout(() => AU.star(k), 300 + k * 260);
  }
  tierName.textContent = TIER_NAMES[stage.tier].replace('\n', ' · ');

  // ---- 输入 ----
  let drag = null;
  vf.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; vf.setPointerCapture(e.pointerId); AU.ensure(); });
  vf.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    S.x -= dx / (vw / 2) / S.lens;
    S.y += dy / (vh / 2) / S.lens;
  });
  const up = () => { drag = null; };
  vf.addEventListener('pointerup', up); vf.addEventListener('pointercancel', up);
  vf.addEventListener('wheel', e => { e.preventDefault(); S.d = clamp(S.d - e.deltaY * 0.0012, 0, 1); }, { passive: false });
  const kd = e => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range')) return;
    if (/^(Arrow\w+|[wsxzqeWSXZQE])$/.test(e.key)) { keys[e.key] = true; e.preventDefault(); AU.ensure(); }
    else if (e.key === 'r' || e.key === 'R') { Object.assign(S, { x: 0, y: 0, d: 0, lens: 1, roll: 0, focus: 0.45 }, T.init); }
  };
  const ku = e => { keys[e.key] = false; };
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  const rs = () => measure(); window.addEventListener('resize', rs);
  onLeave(() => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); window.removeEventListener('resize', rs); });
  measure(); render(0);
  requestAnimationFrame(() => { measure(); raf = requestAnimationFrame(frame); });
}

route();
})();
