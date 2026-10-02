'use strict';
/* =====================================================
   街机 01 · 对片：课程线 12 关 + 图鉴线（覆盖全部 424 条）+ 无尽 + 每日片单
   ===================================================== */
const ROUND_TIME = [45, 40, 35];

// 图鉴线：按原站 13 个分类切成 18 张一包，最后一包用同类（不足再用别类）补满
const PACKS = [];
D.order.forEach(cat => {
  const list = D.items.filter(r => r[3] === cat).map(r => r[0]);
  const total = Math.ceil(list.length / 18);
  for (let n = 0; n < total; n++) {
    const fresh = list.slice(n * 18, n * 18 + 18);
    let sl = fresh.slice();
    if (sl.length < 18) {
      const r = rng(hashStr(cat + n));
      sl = sl.concat(seededShuffle(list.filter(s => sl.indexOf(s) < 0), r)).slice(0, 18);
      if (sl.length < 18) sl = sl.concat(seededShuffle(D.items.map(x => x[0]).filter(s => sl.indexOf(s) < 0), r)).slice(0, 18);
    }
    PACKS.push({ key: cat + '#' + n, cat, catZh: D.cats[cat], n, total, slugs: sl, fresh });
  }
});
const PACK_STARS_MAX = PACKS.length * 3;

function chapterSlugs(li) {
  const pool = D.chapters[li].s.filter(s => MAP[s]);
  const cats = {}; pool.forEach(s => { cats[MAP[s].c] = 1; });
  const extra = shuffle(D.items.map(r => r[0]).filter(s => pool.indexOf(s) < 0));
  extra.sort((a, b) => (cats[MAP[b].c] ? 1 : 0) - (cats[MAP[a].c] ? 1 : 0));
  return pool.concat(extra.slice(0, Math.max(0, 18 - pool.length))).slice(0, 18);
}
const chapterOpen = i => i === 0 || (SV.match[i - 1] || 0) >= 1;
const packIdx = key => PACKS.findIndex(p => p.key === key);
const packOpen = i => PACKS[i].n === 0 || (SV.pack[PACKS[i - 1].key] || 0) >= 1;

function chapterDef(i) {
  return {
    mode: 'level', title: pad(i + 1) + ' · ' + D.chapters[i].n, sub: D.chapters[i].sub, slugs: chapterSlugs(i),
    stars: () => SV.match[i] || 0, commit(s) { if (s > (SV.match[i] || 0)) SV.match[i] = s; },
    next: () => (i < 11 && (SV.match[i] || 0) >= 1 ? '#/match/c/' + (i + 1) : null), again: '#/match/c/' + i, back: '#/match'
  };
}
function packDef(idx) {
  const p = PACKS[idx];
  return {
    mode: 'level', title: p.catZh + ' · 第 ' + (p.n + 1) + ' / ' + p.total + ' 包', sub: '图鉴线：这一包里的 ' + p.fresh.length + ' 个手法都是新面孔', slugs: p.slugs.slice(),
    stars: () => SV.pack[p.key] || 0, commit(s) { if (s > (SV.pack[p.key] || 0)) SV.pack[p.key] = s; },
    next: () => (idx + 1 < PACKS.length && PACKS[idx + 1].n > 0 && (SV.pack[p.key] || 0) >= 1 ? '#/match/k/' + (idx + 1) : null), again: '#/match/k/' + idx, back: '#/match'
  };
}
function dailySlugs() {
  const r = rng(hashStr('daily-' + todayStr()));
  return seededShuffle(D.items.map(x => x[0]), r).slice(0, 18);
}
function dailyDef() {
  const today = todayStr();
  return {
    mode: 'daily', title: '每日片单 · ' + today, sub: '每天一份，全站同款。当天首次配完有额外 XP，连续天数越久奖励越多。', slugs: dailySlugs(),
    stars: () => 0, commit() {}, next: () => null, again: '#/daily', back: '#/'
  };
}
function endlessDef() {
  return { mode: 'endless', title: '无尽模式', sub: '全部 424 个手法随机轮番上阵，优先出还没认熟的。一直配到某回合超时为止。', slugs: [], stars: () => 0, commit() {}, next: () => null, again: '#/match/endless', back: '#/match' };
}
function endlessRound(rn) {
  const all = D.items.map(r => r[0]);
  const fresh = shuffle(all.filter(s => !(SV.mast[s] > 0)));
  const rest = shuffle(all.filter(s => SV.mast[s] > 0));
  const out = fresh.slice(0, 4);
  rest.concat(fresh.slice(4)).slice(0, 6 - out.length).forEach(s => out.push(s));
  return shuffle(out.slice(0, 6));
}

/* ---------- 关卡图 ---------- */
function matchHub() {
  app.appendChild(topbar('#/'));
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, '对片'), h('p', null, '把「手法名」和「片例」配成对。一关 3 回合 × 6 对，限时，连消加分。')));
  app.appendChild(h('a', { class: 'banner-card', href: '#/match/endless' },
    h('div', null, h('b', null, '无尽模式'), h('span', null, '全库 ' + TOTAL + ' 个手法轮番上阵，没有关卡，只比能走多远')),
    h('div', { class: 'bc-r' }, h('small', null, '最高分'), h('b', null, SV.endless || '—'))));
  app.appendChild(h('h3', { class: 'sec' }, '课程线 · 12 章', h('small', null, '对应教程 12 章，过一关解锁下一关')));
  app.appendChild(h('div', { class: 'map' }, D.chapters.map((c, i) => {
    const open = chapterOpen(i), st = SV.match[i] || 0;
    const m = c.s.filter(s => SV.mast[s] > 0).length;
    return h('button', { type: 'button', class: 'node' + (open ? '' : ' lock') + (st ? ' done' : ''), disabled: !open, onclick: () => open && go('#/match/c/' + i) },
      h('span', { class: 'no' }, pad(i + 1)), h('span', { class: 'nm' }, c.n), h('span', { class: 'sb' }, c.sub), h('span', { class: 'st' }, starStr(st)), h('small', { class: 'mc' }, '认熟 ' + m + ' / ' + c.s.length));
  })));
  app.appendChild(h('h3', { class: 'sec' }, '图鉴线 · 全部 ' + TOTAL + ' 个手法', h('small', null, '按原站 13 个分类切包，每包 18 张。每类第 1 包直接开放')));
  D.order.forEach(cat => {
    const ps = PACKS.map((p, i) => [p, i]).filter(x => x[0].cat === cat);
    const all = ps.reduce((a, x) => a.concat(x[0].fresh), []);
    const m = all.filter(s => SV.mast[s] > 0).length;
    app.appendChild(h('div', { class: 'catrow' },
      h('div', { class: 'cat-h' }, h('b', null, D.cats[cat]), h('small', null, '认熟 ' + m + ' / ' + all.length)),
      h('div', { class: 'packs' }, ps.map(([p, i]) => {
        const open = packOpen(i), st = SV.pack[p.key] || 0;
        return h('button', { type: 'button', class: 'pack' + (open ? '' : ' lock') + (st ? ' done' : ''), disabled: !open, onclick: () => open && go('#/match/k/' + i) },
          h('span', null, '第 ' + (p.n + 1) + ' 包'), h('small', null, p.fresh.length + ' 张'), h('em', null, open ? starStr(st) : '🔒'));
      }))));
  });
}

/* ---------- 对局 ---------- */
function matchPlay(def) {
  const endless = def.mode === 'endless';
  const G = { rounds: endless ? [] : (() => { const a = shuffle(def.slugs.slice()); return [a.slice(0, 6), a.slice(6, 12), a.slice(12, 18)]; })(), r: 0, matches: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, live: false, sel: null, tiles: [], left: 0, tl: 0, timer: 0, rm: {}, rounds_done: 0 };
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
  app.appendChild(topbar(def.back));
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, def.title), h('p', null, def.sub)));
  app.appendChild(stage.el);
  onLeave(() => { clearInterval(G.timer); G.live = false; });

  const upd = () => {
    comboEl.textContent = '×' + G.combo; scoreEl.textContent = G.score;
    comboBox.classList.toggle('hot', G.combo >= 3);
    roundEl.textContent = endless ? '第 ' + (G.r + 1) + ' 回合 · 已配 ' + G.matches : '第 ' + (G.r + 1) + ' / 3 回合 · 已配 ' + G.matches + ' / 18';
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
    if (endless) G.rounds[G.r] = endlessRound(G.r);
    const slugs = G.rounds[G.r];
    markSeen(slugs); save();
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
    G.tl = endless ? Math.max(24, 40 - G.r) : ROUND_TIME[G.r]; G.left = G.tl;
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
    if (!G.rm[a.slug]) markMast(a.slug); else SV.seen[a.slug] = 1;      // 一次配对成功才算「认熟」
    const it = MAP[a.slug];
    cap.textContent = ''; cap.appendChild(B(it.z)); cap.appendChild(document.createTextNode(it.d || it.e));
    cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop');
    AU.hit(G.combo);
    const r = (a.kind === 'frame' ? a : b).el.getBoundingClientRect();
    stage.burst(8 + stage.tier * 5, r.left + r.width / 2, r.top + r.height / 2);
    upd(); setMeter();
    stage.setTier(Math.min(4, endless ? Math.floor(G.matches / 8) : Math.floor(G.matches * 5 / 18)));
    if (G.tiles.every(x => x.done)) roundDone(false);
  }
  function miss(a, b) {
    G.miss++; G.combo = 0; AU.miss();
    [a, b].forEach(t => { t.el.classList.remove('nope'); void t.el.offsetWidth; t.el.classList.add('nope'); setTimeout(() => t.el.classList.remove('nope'), 420); });
    G.rm[a.slug] = (G.rm[a.slug] || 0) + 1; G.rm[b.slug] = (G.rm[b.slug] || 0) + 1;
    [a, b].forEach(t => {                      // 同一对失误两次：悄悄亮起搭档，不扣分
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
    setTimeout(() => (endless ? levelEnd() : roundDone(true)), 3200);
  }
  function roundDone(timed) {
    G.live = false; clearInterval(G.timer);
    G.rounds_done++;
    if (!endless && G.r >= 2) { setTimeout(levelEnd, timed ? 0 : 500); return; }
    G.r++;
    setTimeout(() => { if (G.live === false) startRound(); }, timed ? 0 : 600);
  }
  function levelEnd() {
    AU.stop(); AU.fin();
    const full = endless ? 0 : 18;
    const all = !endless && G.matches >= full;
    const stars = all ? (G.miss <= 1 ? 3 : G.miss <= 4 ? 2 : 1) : 0;
    let xp, headline, detail = [];
    if (endless) {
      const best = G.score > (SV.endless || 0); if (best) SV.endless = G.score;
      xp = G.matches * 4; headline = best && G.score > 0 ? '新纪录！' : '本轮结束';
      detail.push('走过 ' + G.rounds_done + ' 回合 · 配对 ' + G.matches + ' 对 · 最长 ' + G.maxCombo + ' 连击');
    } else {
      def.commit(stars);
      xp = stars * 60 + G.matches * 5; headline = stars ? '过关！' : '差一点，再来一次';
      detail.push('配对 ' + G.matches + ' / 18 · 失误 ' + G.miss + ' 次 · 最长 ' + G.maxCombo + ' 连击');
      if (def.mode === 'daily' && all) {
        const t = todayStr(), y = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); })();
        if (SV.daily.last !== t) {
          SV.daily.streak = SV.daily.last === y ? SV.daily.streak + 1 : 1; SV.daily.last = t; SV.daily.best = Math.max(SV.daily.best || 0, SV.daily.streak);
          const bonus = 150 + SV.daily.streak * 10; xp += bonus; detail.push('今日首次完成：额外 +' + bonus + ' XP · 连续 ' + SV.daily.streak + ' 天');
        } else detail.push('今天已经领过奖励了，明天再来。');
        headline = '今日片单完成！';
      }
    }
    SV.bestCombo = Math.max(SV.bestCombo || 0, G.maxCombo);
    addXp(xp); SV.plays++; save();
    const starEls = [0, 1, 2].map(() => h('i', null, '★'));
    const nextHref = def.next();
    const mastNow = mastCount();
    board.replaceWith(h('div', { class: 'res' },
      h('p', { class: 'xpg' }, headline),
      endless ? null : h('div', { class: 'stars', 'aria-label': stars + ' 星' }, starEls),
      h('div', { class: 'big' }, G.score),
      detail.map(t => h('p', null, t)),
      h('p', { class: 'xpg' }, '+' + xp + ' XP · 片库认熟 ' + mastNow + ' / ' + TOTAL),
      h('div', { class: 'row', style: 'justify-content:center' },
        nextHref ? h('button', { type: 'button', class: 'btn', onclick: () => go(nextHref) }, '下一关 ▶') : null,
        h('button', { type: 'button', class: 'btn alt', onclick: () => { if (location.hash === def.again) route(); else go(def.again); } }, '再玩一次'),
        h('button', { type: 'button', class: 'btn alt', onclick: () => go(def.back) }, '返回'))));
    cap.textContent = ''; cap.appendChild(B('小提示')); cap.appendChild(document.createTextNode(endless ? '无尽模式不看星级，只比分数。' : '星级只看失误次数：失误 ≤1 三星，≤4 两星，配完就一星。'));
    if (stars || (endless && G.matches > 8)) stage.setTier(4, true);
    stage.burst(46);
    if (!endless) starEls.forEach((el, k) => { if (k < stars) setTimeout(() => { el.classList.add('on'); AU.star(k); }, 500 + k * 450); });
    checkAch();
  }
  AU.ensure();
  startRound();
}

route_add(/^\/match$/, () => matchHub());
route_add(/^\/match\/c\/(\d+)$/, i => { i = +i; if (!D.chapters[i] || !chapterOpen(i)) { go('#/match'); return; } matchPlay(chapterDef(i)); });
route_add(/^\/match\/k\/(\d+)$/, i => { i = +i; if (!PACKS[i] || !packOpen(i)) { go('#/match'); return; } matchPlay(packDef(i)); });
route_add(/^\/match\/endless$/, () => matchPlay(endlessDef()));
route_add(/^\/daily$/, () => matchPlay(dailyDef()));
