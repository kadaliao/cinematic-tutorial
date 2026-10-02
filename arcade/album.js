'use strict';
/* 片库图鉴（收集册）+ 成就 */
const SITE = 'https://cinematic-tutorial.vercel.app/';
const state = slug => (SV.mast[slug] > 0 ? 2 : SV.seen[slug] ? 1 : 0);

const ACH = [
  { id: 'first', n: '开机大吉', d: '完成任意一个对片关卡', ok: () => sumStars(SV.match) + sumStars(SV.pack) > 0 },
  { id: 'tri', n: '三星导演', d: '任意对片关卡拿到 3 星', ok: () => Object.keys(SV.match).some(k => SV.match[k] >= 3) || Object.keys(SV.pack).some(k => SV.pack[k] >= 3) },
  { id: 'combo10', n: '十连击', d: '单局最长连击达到 10', ok: () => SV.bestCombo >= 10 },
  { id: 'combo18', n: '一气呵成', d: '单局最长连击达到 18（一整关不失误）', ok: () => SV.bestCombo >= 18 },
  { id: 'ch12', n: '十二章通关', d: '课程线 12 关全部通关', ok: () => D.chapters.every((c, i) => (SV.match[i] || 0) >= 1) },
  { id: 'ch36', n: '课程线满星', d: '课程线 12 关全部 3 星', ok: () => D.chapters.every((c, i) => (SV.match[i] || 0) >= 3) },
  { id: 'm50', n: '入门影迷', d: '认熟 50 个手法', ok: () => mastCount() >= 50 },
  { id: 'm150', n: '资深影迷', d: '认熟 150 个手法', ok: () => mastCount() >= 150 },
  { id: 'm300', n: '片库活字典', d: '认熟 300 个手法', ok: () => mastCount() >= 300 },
  { id: 'm424', n: '全库认熟', d: '认熟全部 ' + TOTAL + ' 个手法', ok: () => mastCount() >= TOTAL },
  { id: 'dir6', n: '摄影助理', d: '拍成 6 个镜头任务', ok: () => DT.filter((t, i) => SV.dir[i]).length >= 6 },
  { id: 'dirAll', n: '摄影指导', d: '拍成全部镜头任务', ok: () => DT.every((t, i) => SV.dir[i]) },
  { id: 'dir3', n: '一条过', d: '全部镜头任务 3 星', ok: () => DT.every((t, i) => (SV.dir[i] || 0) >= 3) },
  { id: 'lab6', n: '灯光学徒', d: '完成 6 个布光任务', ok: () => LT.filter((t, i) => SV.lab[i]).length >= 6 },
  { id: 'labAll', n: '灯光师', d: '完成全部布光任务', ok: () => LT.every((t, i) => SV.lab[i]) },
  { id: 'trio', n: '街机三连', d: '对片、导演椅、灯光台都通过关', ok: () => sumStars(SV.match) + sumStars(SV.pack) > 0 && sumStars(SV.dir) > 0 && sumStars(SV.lab) > 0 },
  { id: 'lv5', n: 'Lv.5', d: '玩家等级达到 5', ok: () => levelOf(SV.xp) >= 5 },
  { id: 'lv10', n: 'Lv.10', d: '玩家等级达到 10', ok: () => levelOf(SV.xp) >= 10 },
  { id: 'end5k', n: '无尽达人', d: '无尽模式得分 5000', ok: () => (SV.endless || 0) >= 5000 },
  { id: 'daily3', n: '三日连签', d: '每日片单连续 3 天', ok: () => (SV.daily.best || 0) >= 3 },
  { id: 'daily7', n: '一周全勤', d: '每日片单连续 7 天', ok: () => (SV.daily.best || 0) >= 7 }
].concat(D.order.map(cat => ({
  id: 'cat-' + cat, n: D.cats[cat] + '大师', d: '认熟「' + D.cats[cat] + '」的全部手法',
  ok: () => D.items.filter(r => r[3] === cat).every(r => SV.mast[r[0]] > 0)
})));
checkAch = function () {
  ACH.forEach(a => {
    if (SV.ach[a.id]) return;
    let ok = false; try { ok = a.ok(); } catch (e) { ok = false; }
    if (ok) { SV.ach[a.id] = Date.now(); save(); toast('成就解锁：' + a.n, a.d, 'ach'); }
  });
};

function openDetail(slug) {
  const it = MAP[slug], st = state(slug);
  const media = it.v && it.m
    ? h('video', { src: it.m, poster: it.t, muted: true, loop: true, autoplay: true, playsinline: true, controls: true })
    : h('img', { src: it.t, alt: it.e });
  if (media.tagName === 'VIDEO') media.muted = true;
  const close = () => { m.remove(); document.removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', onclick: e => { if (e.target === m) close(); } },
    h('div', { class: 'mpanel' },
      h('button', { type: 'button', class: 'mclose', 'aria-label': '关闭', onclick: close }, '×'),
      h('div', { class: 'mmedia' }, media),
      h('div', { class: 'mbody' },
        h('span', { class: 'chip' }, D.cats[it.c]), h('span', { class: 'chip ' + (st === 2 ? 'gold' : '') }, st === 2 ? '已认熟' : '见过'),
        h('h3', null, it.z, h('small', { lang: 'en' }, it.e)),
        h('p', null, it.d2 || it.d),
        h('a', { class: 'btn alt', href: SITE + '#/library?e=' + slug, target: '_blank', rel: 'noopener' }, '看完整讲解与提示词 ↗'))));
  document.body.appendChild(m);
  document.addEventListener('keydown', esc);
  onLeave(() => document.removeEventListener('keydown', esc));
}

const AL = { cat: '', st: '', q: '' };
function albumView() {
  app.appendChild(topbar('#/'));
  const mc = mastCount(), sc = seenCount();
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, '片库图鉴'), h('p', null, '认熟 ' + mc + ' / ' + TOTAL + ' · 见过 ' + sc + '。在游戏里遇到的手法会自动收进来，一次配对成功就算「认熟」。')));
  app.appendChild(h('div', { class: 'meter big' }, h('span', { style: 'transform:scaleX(' + (mc / TOTAL).toFixed(3) + ')' })));
  const grid = h('div', { class: 'al-grid' });
  const chips = h('div', { class: 'chips' });
  const stSel = h('select', { class: 'sel', 'aria-label': '收集状态', onchange: e => { AL.st = e.target.value; draw(); } },
    [['', '全部状态'], ['2', '已认熟'], ['1', '只见过'], ['0', '未遇到']].map(([v, t]) => h('option', { value: v, selected: AL.st === v }, t)));
  const q = h('input', { class: 'sel', type: 'search', placeholder: '搜手法名（中 / 英）', value: AL.q, 'aria-label': '搜索', oninput: e => { AL.q = e.target.value.trim().toLowerCase(); draw(); } });
  const catBtn = (v, t) => h('button', { type: 'button', class: 'chip-b' + (AL.cat === v ? ' on' : ''), onclick: () => { AL.cat = v; draw(); } }, t);
  app.appendChild(h('div', { class: 'al-tools' }, chips, h('div', { class: 'row' }, stSel, q)));
  app.appendChild(grid);
  function draw() {
    chips.textContent = '';
    chips.appendChild(catBtn('', '全部'));
    D.order.forEach(c => chips.appendChild(catBtn(c, D.cats[c])));
    grid.textContent = '';
    const list = D.items.filter(r => (!AL.cat || r[3] === AL.cat) && (AL.st === '' || String(state(r[0])) === AL.st) && (!AL.q || r[1].toLowerCase().indexOf(AL.q) >= 0 || r[2].toLowerCase().indexOf(AL.q) >= 0));
    if (!list.length) grid.appendChild(h('p', { class: 'muted' }, '没有符合条件的手法。'));
    list.forEach(r => {
      const s = state(r[0]), it = MAP[r[0]];
      grid.appendChild(h('button', { type: 'button', class: 'al-card s' + s, onclick: () => (s ? openDetail(r[0]) : toast('还没遇到这个手法', '去对片里玩玩，它出现过就会收进来')) },
        s ? h('img', { src: it.t, alt: '', loading: 'lazy', draggable: 'false' }) : h('div', { class: 'ph' }, '？'),
        h('b', null, s ? it.z : '？？？'), h('small', null, s ? it.e : D.cats[it.c]), s === 2 ? h('i', { class: 'gem', title: '已认熟' }, '★') : null));
    });
  }
  draw();
}

function achView() {
  app.appendChild(topbar('#/'));
  const got = ACH.filter(a => SV.ach[a.id]).length;
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, '成就'), h('p', null, '已解锁 ' + got + ' / ' + ACH.length)));
  app.appendChild(h('div', { class: 'ach-grid' }, ACH.map(a => {
    const on = !!SV.ach[a.id];
    return h('div', { class: 'ach' + (on ? ' on' : '') }, h('i', null, on ? '★' : '🔒'), h('b', null, a.n), h('small', null, a.d));
  })));
}
route_add(/^\/album$/, () => albumView());
route_add(/^\/ach$/, () => achView());
