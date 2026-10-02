(() => {
'use strict';
const CT = window.CT;
const CH = CT.chapters, IDX = CT.index, CATS = CT.cats, CATORDER = CT.catorder;
const IDXMAP = {};
IDX.forEach(r => { IDXMAP[r[0]] = r; });
const TOTAL = IDX.length;
const LESSON_COUNT = CH.reduce((n, c) => n + c.lessons.length, 0);
// slug -> [[章, 课], …]：图鉴详情里显示「在课程中」
const LESSON_OF = {};
CH.forEach((c, ci) => c.lessons.forEach((l, li) => l.s.forEach(s => { (LESSON_OF[s] = LESSON_OF[s] || []).push([ci, li]); })));
const CAT_COUNT = {};
IDX.forEach(r => { CAT_COUNT[r[3]] = (CAT_COUNT[r[3]] || 0) + 1; });

/* ---------- storage（隐私模式下可能抛错，全部兜住） ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('ct-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ct-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
};
const S = {
  done: store.get('done', {}),
  fav: store.get('fav', []),
  subject: store.get('subject', ''),
  zh: store.get('zh', true),
  tab: store.get('tab', 'pi'),
  bodyEn: store.get('body-en', false),
  pick: store.get('pick', {}),
  wrong: store.get('wrong', {}),        // 错题本：slug -> {n: 答错次数, t: 最近答错时间}          // 收藏夹里被勾选进组合的条目（默认全选）
  lib: { q: '', cat: '', kind: '', favOnly: false }
};

/* ---------- dom helpers ---------- */
function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  kids.flat(9).forEach(c => { if (c != null && c !== false) n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
  return n;
}
const $ = s => document.querySelector(s);
const ICON = {
  play: 'M8 6.5v11l9-5.5z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  star: 'M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z',
  ext: 'M14 5h5v5M19 5l-8 8M17 13.5V19H5V7h5.5',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  search: 'M11 11m-6.5 0a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0M20 20l-4.2-4.2',
  target: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
  wand: 'M5 19L15 9M14 4v2M19 9h2M17.5 5.5l1.5-1.5M14 11l-2-2'
};
function icon(name, cls) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', ICON[name]);
  svg.appendChild(p);
  return svg;
}
const pad = n => String(n).padStart(2, '0');
const catZh = c => (CATS[c] ? CATS[c].zh : c);

/* ---------- toast / copy ---------- */
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
function copyText(text, what) {
  const ok = () => toast('已复制' + (what ? '：' + what : ''));
  const fallback = () => {
    const ta = h('textarea', { style: 'position:fixed;opacity:0;top:0' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let done = false;
    try { done = document.execCommand('copy'); } catch (e) { done = false; }
    ta.remove();
    if (done) ok(); else toast('复制失败，请手动选中文本复制');
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback);
  else fallback();
}

/* ---------- full library (lazy) ---------- */
let FULL = null, fullPromise = null;
function loadFull() {
  if (FULL) return Promise.resolve(FULL);
  if (fullPromise) return fullPromise;
  fullPromise = new Promise((resolve, reject) => {
    const s = h('script', { src: 'data-library.js?v=__LIBV__' });
    s.onload = () => { FULL = window.CT_LIB; resolve(FULL); };
    s.onerror = () => { fullPromise = null; s.remove(); reject(new Error('data-library.js 载入失败')); };
    document.head.appendChild(s);
  });
  return fullPromise;
}
// 原站讲解的中文全文索引（约 1.3MB），只在真正输入搜索词时才加载
let BODYTXT = null, bodyTxtPromise = null;
function loadBodyIndex() {
  if (BODYTXT) return Promise.resolve(BODYTXT);
  if (bodyTxtPromise) return bodyTxtPromise;
  bodyTxtPromise = new Promise((resolve, reject) => {
    const s = h('script', { src: 'data-search.js?v=__SEARCHV__' });
    s.onload = () => { BODYTXT = window.CT_BODYTXT; resolve(BODYTXT); };
    s.onerror = () => { bodyTxtPromise = null; s.remove(); reject(new Error('data-search.js 载入失败')); };
    document.head.appendChild(s);
  });
  return bodyTxtPromise;
}
const entryOf = slug => (FULL && FULL[slug]) || CT.lib[slug] || null;

/* ---------- favorites / progress ---------- */
const isFav = slug => S.fav.indexOf(slug) >= 0;
function toggleFav(slug) {
  const i = S.fav.indexOf(slug);
  if (i >= 0) S.fav.splice(i, 1); else S.fav.push(slug);
  store.set('fav', S.fav);
  syncFavUI();
  toast(i >= 0 ? '已移出收藏夹' : '已加入收藏夹');
}
function syncFavUI() {
  const b = $('#fav-count');
  b.hidden = S.fav.length === 0;
  b.textContent = S.fav.length;
  document.querySelectorAll('[data-fav-slug]').forEach(n => {
    const on = isFav(n.dataset.favSlug);
    n.classList.toggle('on', on);
    if (n.tagName === 'BUTTON') n.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
const lessonKey = (ci, li) => ci + '-' + li;
const isDone = (ci, li) => Boolean(S.done[lessonKey(ci, li)]);
const doneCount = () => CH.reduce((n, c, ci) => n + c.lessons.filter((_, li) => isDone(ci, li)).length, 0);
const chapterDone = ci => CH[ci].lessons.filter((_, li) => isDone(ci, li)).length;
function nextLesson() {
  for (let ci = 0; ci < CH.length; ci++)
    for (let li = 0; li < CH[ci].lessons.length; li++)
      if (isDone(ci, li) === false) return [ci, li];
  return null;
}

/* ---------- prompt text rendering ---------- */
const SUBJ_RE = /(\[Subject\]|\[主体\])/;
const SEG_EN = /\s+(?=(?:Still clause|Still|Video|For motion|For video|Motion|Quote|Add|Example):\s)/g;
const SEG_ZH = /(?=(?:静帧|视频|用于动态时|动态时|照抄这句|再补|示例)[：:])/g;
function fillSubject(text) {
  const s = S.subject.trim();
  return s ? text.replace(/\[Subject\]|\[主体\]/g, s) : text;
}
// 展示用：按 Still / Video 等分段换行、高亮 [Subject]；复制时仍用原文（仅替换主体）
function promptView(text, lang) {
  const p = h('p', { class: 'ptext ' + lang, lang: lang === 'en' ? 'en' : 'zh-CN' });
  const lines = lang === 'en' ? text.split(SEG_EN) : text.split(SEG_ZH).filter(Boolean);
  const labelRe = lang === 'en' ? /^((?:Still clause|Still|Video|For motion|For video|Motion|Quote|Add|Example):)(\s*)/ : /^((?:静帧|视频|用于动态时|动态时|照抄这句|再补|示例)[：:])/;
  lines.forEach((line, i) => {
    if (i) p.appendChild(document.createTextNode('\n'));
    const m = line.match(labelRe);
    if (m) { p.appendChild(h('span', { class: 'seg' }, m[1])); p.appendChild(document.createTextNode(' ')); line = line.slice(m[0].length); }
    line.split(SUBJ_RE).forEach(part => {
      if (SUBJ_RE.test(part)) {
        const s = S.subject.trim();
        p.appendChild(h('mark', { class: s ? 'subj set' : 'subj', title: s ? '已替换为你的主体' : '主体占位：在上方填入你的主体即可替换' }, s || part));
      } else if (part) p.appendChild(document.createTextNode(part));
    });
  });
  return p;
}

/* ---------- media tiles ---------- */
const canHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
function thumbImg(src, alt) {
  const img = h('img', { src, alt: alt || '', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => { img.parentElement && img.parentElement.classList.add('noimg'); img.remove(); });
  return img;
}
function attachPreview(box, mp4) {
  if (canHover === false || mp4 === 0 || mp4 == null) return;
  let timer = 0, vid = null;
  box.addEventListener('mouseenter', () => {
    timer = setTimeout(() => {
      vid = h('video', { class: 'preview', src: mp4, muted: true, loop: true, playsinline: true, autoplay: true, preload: 'auto' });
      vid.muted = true;
      vid.addEventListener('playing', () => vid && vid.classList.add('on'));
      box.appendChild(vid);
      const pr = vid.play();
      if (pr && pr.catch) pr.catch(() => {});
    }, 160);
  });
  box.addEventListener('mouseleave', () => { clearTimeout(timer); if (vid) { vid.remove(); vid = null; } });
}
// opts: list（详情里上一条/下一条的范围）, def（显示一句中文定义）, cat（显示分类）, note
function tile(slug, opts) {
  opts = opts || {};
  const r = IDXMAP[slug];
  const e = entryOf(slug);
  const thumb = h('div', { class: 'thumb' }, thumbImg(r[5], ''),
    h('span', { class: 'badge ' + (r[4] ? 'v' : 's') }, r[4] ? icon('play') : null, r[4] ? '视频' : '静帧'),
    h('span', { class: 'fav-dot', 'data-fav-slug': slug, title: '已收藏' }, icon('star')));
  attachPreview(thumb, r[6]);
  const body = h('div', { class: 'tile-body' },
    opts.cat ? h('span', { class: 'tile-cat' }, catZh(r[3])) : null,
    h('span', { class: 'tile-zh' }, r[2]),
    h('span', { class: 'tile-en', lang: 'en' }, r[1]),
    opts.def && e ? h('span', { class: 'tile-def' }, e.d[1] || e.d[0]) : null,
    opts.note ? h('span', { class: 'tile-def', lang: 'en' }, opts.note) : null,
    opts.snip ? snipView(opts.snip) : null);
  const a = h('a', { class: 'tile' + (opts.small ? ' small' : ''), href: '#' + curPath + '?e=' + slug, 'data-slug': slug },
    thumb, body);
  a.addEventListener('click', ev => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    openEntry(slug, opts.list);
  });
  if (isFav(slug)) thumb.querySelector('.fav-dot').classList.add('on');
  return a;
}

/* ---------- router ---------- */
const main = $('#main');
let curPath = null, modalList = null, modalPushed = false;
function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const i = raw.indexOf('?');
  const path = (i >= 0 ? raw.slice(0, i) : raw) || '/';
  const q = new URLSearchParams(i >= 0 ? raw.slice(i + 1) : '');
  return { path, e: q.get('e') };
}
function route() {
  const { path, e } = parseHash();
  if (path !== curPath) {
    const prev = curPath;
    curPath = path;
    renderView(path, prev);
  }
  if (e && IDXMAP[e]) renderModal(e); else hideModal();
}
function go(path) { location.hash = path; }
function openEntry(slug, list) {
  modalList = list && list.length ? list : null;
  const target = '#' + curPath + '?e=' + slug;
  if ($('#modal').hidden) { modalPushed = true; location.hash = target; }
  else location.replace(target);
}
function closeEntry() {
  if (modalPushed) { modalPushed = false; history.back(); }
  else location.replace('#' + curPath);
}

/* ---------- views ---------- */
function setNav(key) {
  document.querySelectorAll('[data-nav]').forEach(a => {
    const on = a.dataset.nav === key;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
function renderView(path, prev) {
  stopViewMedia();
  main.textContent = '';
  let m, anchor = null;
  if ((m = path.match(/^\/learn\/(\d+)(?:\/(\d+))?$/)) && CH[+m[1]]) {
    setNav('learn');
    const ci = +m[1];
    viewChapter(ci);
    if (m[2] != null) anchor = document.getElementById('l-' + ci + '-' + m[2]);
    document.title = CH[ci].n + '｜电影语言入门';
  } else if (path === '/library') {
    setNav('library'); viewLibrary(); document.title = '手法图鉴｜电影语言入门';
  } else if (path === '/quiz') {
    setNav('quiz'); viewQuiz(); document.title = '看片测验｜电影语言入门';
  } else if (path === '/board') {
    setNav('board'); viewBoard(); document.title = '收藏夹｜电影语言入门';
  } else {
    setNav('home'); viewHome(); document.title = '电影语言入门｜从看懂到拍出来';
  }
  const sameChapter = prev && m && prev.indexOf('/learn/' + m[1]) === 0 && path.indexOf('/learn/') === 0;
  if (anchor) requestAnimationFrame(() => anchor.scrollIntoView({ block: 'start', behavior: sameChapter ? 'smooth' : 'auto' }));
  else window.scrollTo(0, 0);
}
function stopViewMedia() { main.querySelectorAll('video').forEach(v => { try { v.pause(); } catch (e) { /* ignore */ } }); }

/* ----- home ----- */
function progressBar(done, total, label) {
  const pct = total ? Math.round(done / total * 100) : 0;
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done), 'aria-label': label || '学习进度' },
    h('span', { style: 'width:' + pct + '%' }));
}
function viewHome() {
  const nx = nextLesson();
  const done = doneCount();
  const heroSlug = 'dolly-in';
  const heroR = IDXMAP[heroSlug];
  const heroVid = h('video', { src: heroR[6], poster: heroR[5], muted: true, loop: true, autoplay: true, playsinline: true, preload: 'metadata', 'aria-label': '示例片段：推轨推进' });
  heroVid.muted = true;
  main.appendChild(h('section', { class: 'hero' },
    h('div', { class: 'hero-copy' },
      h('p', { class: 'eyebrow' }, 'CINEMATIC LANGUAGE · 零基础'),
      h('h1', null, '把「电影感」拆成', h('br'), '你能练习的动作'),
      h('p', { class: 'lead' }, '12 章、48 课，每课一段真实片例 + 一个手机就能完成的 10 秒练习。看懂之后，还能直接复制原站提示词，用在 AI 视频和图像创作里。'),
      h('div', { class: 'hero-actions' },
        h('a', { class: 'btn primary', href: nx ? '#/learn/' + nx[0] + '/' + nx[1] : '#/learn/0' },
          done === 0 ? '从第 1 课开始' : nx ? '继续：' + CH[nx[0]].lessons[nx[1]].t : '复习课程', icon('right')),
        h('a', { class: 'btn', href: '#/library' }, icon('grid'), '浏览 ' + TOTAL + ' 条手法')),
      h('div', { class: 'hero-progress' },
        h('div', { class: 'hp-top' }, h('span', null, '已练习 ', h('b', null, done), ' / ' + LESSON_COUNT + ' 课'),
          h('span', { class: 'muted' }, done ? Math.round(done / LESSON_COUNT * 100) + '%' : '进度只存在本机浏览器')),
        progressBar(done, LESSON_COUNT))),
    h('figure', { class: 'hero-reel' },
      h('div', { class: 'reel-frame' }, heroVid),
      h('figcaption', null, h('span', null, '推轨推进 · Dolly In'), h('a', { href: '#/?e=' + heroSlug, onclick: ev => { ev.preventDefault(); openEntry(heroSlug); } }, '看提示词', icon('right'))))));

  main.appendChild(h('section', { class: 'band how' },
    h('div', { class: 'band-in steps' },
      step('01', 'book', '看懂', '每课先读一段白话讲解，再看原站真实片例。鼠标悬停缩略图就能预览视频。'),
      step('02', 'phone', '拍出来', '照着「手机练习」拍 10 秒，完成后点「标记已练习」，进度会记在本机。'),
      step('03', 'wand', '用起来', '详情页可复制英文提示词，填入你的主体自动替换 [Subject]；常用的收进收藏夹，一键组合。'))));

  const grid = h('div', { class: 'chapter-grid' });
  CH.forEach((c, ci) => {
    const first = c.lessons[0].s[0];
    const cd = chapterDone(ci), n = c.lessons.length;
    grid.appendChild(h('a', { class: 'chapter-card' + (cd === n ? ' complete' : ''), href: '#/learn/' + ci },
      h('div', { class: 'cc-cover' }, first ? thumbImg(IDXMAP[first][5], '') : null, h('span', { class: 'cc-num' }, pad(ci + 1))),
      h('div', { class: 'cc-body' },
        h('h3', null, c.n),
        h('p', null, c.sub),
        h('ul', { class: 'cc-lessons' }, c.lessons.map((l, li) => h('li', { class: isDone(ci, li) ? 'done' : '' }, l.t))),
        h('div', { class: 'cc-foot' }, progressBar(cd, n, c.n + ' 进度'), h('span', null, cd + '/' + n)))));
  });
  main.appendChild(h('section', { class: 'section' },
    h('div', { class: 'section-head' },
      h('div', null, h('h2', null, '学习路线'), h('p', null, '建议按顺序学，每次只学一课：读讲解 → 看片例 → 拍 10 秒练习 → 标记已练习。')),
      h('a', { class: 'link-more', href: '#/quiz' }, wrongList().length ? '错题本还有 ' + wrongList().length + ' 个，去复习' : '学完几章？来测一测', icon('right'))),
    grid));

  // 按原站分类快速进入图鉴
  main.appendChild(h('section', { class: 'section' },
    h('div', { class: 'section-head' },
      h('div', null, h('h2', null, '手法图鉴'), h('p', null, 'Melies 原站全部 ' + TOTAL + ' 条手法，按 13 个分类浏览；每条都有片例、中英定义和可复制的提示词。')),
      h('a', { class: 'link-more', href: '#/library' }, '打开图鉴', icon('right'))),
    h('div', { class: 'cat-links' }, CATORDER.map(c => h('a', {
      href: '#/library', onclick: () => { S.lib.cat = c; S.lib.q = ''; S.lib.kind = ''; S.lib.favOnly = false; }
    }, h('span', null, catZh(c)), h('small', null, CAT_COUNT[c]))))));
}
function step(num, ic, title, text) {
  return h('div', { class: 'step' }, h('span', { class: 'step-ic' }, icon(ic)), h('div', null, h('b', null, num + ' · ' + title), h('p', null, text)));
}

/* ----- chapter ----- */
let spy = null;
function viewChapter(ci) {
  const c = CH[ci];
  const side = h('nav', { class: 'side', 'aria-label': '章节目录' });
  const sideList = h('ol', { class: 'side-list' });
  CH.forEach((cc, i) => {
    const li = h('li', { class: i === ci ? 'cur' : '' },
      h('a', { class: 'side-ch', href: '#/learn/' + i }, h('span', { class: 'sn' }, pad(i + 1)), h('span', { class: 'st' }, cc.n),
        h('span', { class: 'sc', 'data-ch-count': i }, chapterDone(i) + '/' + cc.lessons.length)));
    if (i === ci) li.appendChild(h('ol', { class: 'side-lessons' }, cc.lessons.map((l, j) =>
      h('li', null, h('a', { href: '#/learn/' + ci + '/' + j, 'data-lesson-link': ci + '-' + j, class: isDone(ci, j) ? 'done' : '' },
        h('span', { class: 'chk' }, icon('check')), l.t)))));
    sideList.appendChild(li);
  });
  side.appendChild(h('div', { class: 'side-title' }, '学习路线'));
  side.appendChild(sideList);

  // 窄屏：章节横向切换条
  const chips = h('div', { class: 'chapter-chips', role: 'navigation', 'aria-label': '切换章节' },
    CH.map((cc, i) => h('a', { href: '#/learn/' + i, class: i === ci ? 'on' : '' }, pad(i + 1) + ' ' + cc.n)));

  const art = h('article', { class: 'chapter' });
  const cd = chapterDone(ci);
  art.appendChild(h('header', { class: 'chapter-head' },
    h('p', { class: 'eyebrow' }, '第 ' + pad(ci + 1) + ' 章 / 共 ' + CH.length + ' 章'),
    h('h1', null, c.n),
    h('p', { class: 'lead' }, c.sub),
    h('p', { class: 'chapter-desc' }, c.desc),
    h('div', { class: 'chapter-progress' }, progressBar(cd, c.lessons.length, '本章进度'), h('span', { id: 'ch-prog-text' }, '本章已练习 ' + cd + ' / ' + c.lessons.length))));

  c.lessons.forEach((l, li) => {
    const done = isDone(ci, li);
    const btn = h('button', { class: 'done-btn' + (done ? ' on' : ''), type: 'button', 'aria-pressed': done ? 'true' : 'false' },
      icon('check'), h('span', null, done ? '已练习' : '标记已练习'));
    btn.addEventListener('click', () => {
      const k = lessonKey(ci, li);
      if (S.done[k]) delete S.done[k]; else S.done[k] = Date.now();
      store.set('done', S.done);
      const on = Boolean(S.done[k]);
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.lastChild.textContent = on ? '已练习' : '标记已练习';
      sec.classList.toggle('is-done', on);
      const link = document.querySelector('[data-lesson-link="' + k + '"]');
      if (link) link.classList.toggle('done', on);
      const n = chapterDone(ci);
      document.querySelectorAll('[data-ch-count="' + ci + '"]').forEach(x => { x.textContent = n + '/' + c.lessons.length; });
      $('#ch-prog-text').textContent = '本章已练习 ' + n + ' / ' + c.lessons.length;
      const bar = art.querySelector('.chapter-progress .progress span');
      bar.style.width = Math.round(n / c.lessons.length * 100) + '%';
      if (on) toast(n === c.lessons.length ? '本章完成！' : '已记下，继续下一课');
    });
    const sec = h('section', { class: 'lesson' + (done ? ' is-done' : ''), id: 'l-' + ci + '-' + li, 'data-lesson': ci + '-' + li },
      h('div', { class: 'lesson-head' },
        h('span', { class: 'lesson-num' }, (ci + 1) + '.' + (li + 1)),
        h('h2', null, l.t),
        btn),
      h('p', { class: 'lesson-text' }, l.x),
      h('div', { class: 'practice' },
        h('span', { class: 'practice-ic' }, icon('phone')),
        h('div', null, h('b', null, '手机练习 · 10 秒'), h('p', null, l.p), h('p', { class: 'practice-q' }, '拍完问自己：这个镜头让观众感到了什么？和不这样拍相比，差别在哪？'))),
      l.s.length ? h('div', { class: 'samples-head' }, h('b', null, '原站片例'), h('span', null, '点开看定义与可复制提示词' + (canHover ? '，悬停预览' : ''))) : null,
      h('div', { class: 'tile-grid lesson-tiles' }, l.s.map(s => tile(s, { list: l.s, def: true }))));
    art.appendChild(sec);
  });

  const prev = CH[ci - 1], next = CH[ci + 1];
  art.appendChild(h('nav', { class: 'pager', 'aria-label': '上一章 / 下一章' },
    prev ? h('a', { href: '#/learn/' + (ci - 1), class: 'pg prev' }, h('small', null, '上一章'), h('span', null, icon('left'), pad(ci) + ' ' + prev.n)) : h('span'),
    next ? h('a', { href: '#/learn/' + (ci + 1), class: 'pg next' }, h('small', null, '下一章'), h('span', null, pad(ci + 2) + ' ' + next.n, icon('right')))
      : h('a', { href: '#/quiz', class: 'pg next' }, h('small', null, '全部学完'), h('span', null, '去做看片测验', icon('right')))));

  main.appendChild(chips);
  main.appendChild(h('div', { class: 'learn-layout' }, side, art));
  const cur = chips.querySelector('.on');
  if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });

  // 目录跟随滚动高亮当前课
  if (spy) spy.disconnect();
  spy = new IntersectionObserver(es => {
    es.forEach(e => {
      if (e.isIntersecting === false) return;
      document.querySelectorAll('[data-lesson-link]').forEach(a => a.classList.toggle('here', a.dataset.lessonLink === e.target.dataset.lesson));
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  art.querySelectorAll('.lesson').forEach(s => spy.observe(s));
}

/* ----- library ----- */
function searchEntries(q, pool) {
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = pool || IDX;
  for (const k in SNIP) delete SNIP[k];
  if (toks.length === 0) return rows.map(r => r[0]);
  const out = [];
  rows.forEach(r => {
    const e = FULL && FULL[r[0]];
    const head = [r[1], r[2], r[0].replace(/-/g, ' '), r[7] || ''].join(' ').toLowerCase();
    const body = head + ' ' + [catZh(r[3]), CATS[r[3]] ? CATS[r[3]].en : '',
      e ? [e.d[0], e.d[1], e.pi[0], e.pi[1], e.cp[0], e.cp[1]].join(' ') : ''].join(' ').toLowerCase();
    if (toks.every(t => body.indexOf(t) >= 0)) { out.push([toks.every(t => head.indexOf(t) >= 0) ? 0 : 1, r[0]]); return; }
    // 第三档：只在原站讲解正文里提到
    const txt = BODYTXT && BODYTXT[r[0]];
    if (txt) {
      const low = txt.toLowerCase();
      if (toks.every(t => body.indexOf(t) >= 0 || low.indexOf(t) >= 0)) {
        const t0 = toks.find(t => body.indexOf(t) < 0) || toks[0];
        const at = low.indexOf(t0);
        if (at >= 0) {
          SNIP[r[0]] = { text: (at > 24 ? '…' : '') + txt.slice(Math.max(0, at - 24), at + t0.length + 36) + (at + t0.length + 36 < txt.length ? '…' : ''), tok: t0 };
          out.push([2, r[0]]);
        }
      }
    }
  });
  return out.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
const SNIP = {};   // slug -> {text, tok}：仅在讲解正文命中时的上下文片段
function snipView(sn) {
  const p = h('span', { class: 'tile-snip' }, h('b', null, '讲解中提到'));
  const low = sn.text.toLowerCase();
  let i = 0, at;
  while ((at = low.indexOf(sn.tok, i)) >= 0) {
    p.appendChild(document.createTextNode(sn.text.slice(i, at)));
    p.appendChild(h('mark', null, sn.text.slice(at, at + sn.tok.length)));
    i = at + sn.tok.length;
  }
  p.appendChild(document.createTextNode(sn.text.slice(i)));
  return p;
}
function viewLibrary() {
  const L = S.lib;
  const input = h('input', { type: 'search', class: 'input', placeholder: '搜名称、定义、提示词或讲解正文：推轨、dutch、halation、库布里克…', 'aria-label': '搜索手法', value: L.q, autocomplete: 'off' });
  const count = h('span', { class: 'result-count', 'aria-live': 'polite' });
  const status = h('span', { class: 'lib-status' });
  const grid = h('div', { class: 'tile-grid lib-tiles' });
  const kindSeg = h('div', { class: 'seg-ctl', role: 'group', 'aria-label': '素材类型' },
    [['', '全部'], ['v', '视频'], ['s', '静帧']].map(([k, t]) => h('button', { type: 'button', 'data-k': k, class: L.kind === k ? 'on' : '' }, t)));
  const favBtn = h('button', { type: 'button', class: 'chip-toggle' + (L.favOnly ? ' on' : ''), 'aria-pressed': L.favOnly ? 'true' : 'false' }, icon('star'), '只看收藏');
  const cats = h('div', { class: 'chips', role: 'group', 'aria-label': '分类' },
    [['', '全部', TOTAL]].concat(CATORDER.map(c => [c, catZh(c), CAT_COUNT[c]])).map(([c, t, n]) =>
      h('button', { type: 'button', 'data-c': c, class: L.cat === c ? 'on' : '', title: c ? CATS[c].en : '' }, t, h('small', null, n))));

  function apply() {
    let list = searchEntries(L.q.trim());
    list = list.filter(s => {
      const r = IDXMAP[s];
      if (L.cat && r[3] !== L.cat) return false;
      if (L.kind === 'v' && r[4] !== 1) return false;
      if (L.kind === 's' && r[4] !== 0) return false;
      if (L.favOnly && isFav(s) === false) return false;
      return true;
    });
    grid.textContent = '';
    const frag = document.createDocumentFragment();
    const q = L.q.trim();
    list.forEach(s => frag.appendChild(tile(s, { list, cat: L.cat === '', snip: q ? SNIP[s] : null })));
    grid.appendChild(frag);
    const inBody = q ? list.filter(s => SNIP[s]).length : 0;
    count.textContent = list.length + ' 条' + (inBody ? '（其中 ' + inBody + ' 条是讲解正文提到）' : '');
    if (q && BODYTXT == null) {
      status.textContent = '· 正在载入讲解全文…';
      loadBodyIndex().then(() => { status.textContent = ''; if (curPath === '/library' && L.q.trim()) apply(); },
        () => { status.textContent = '· 讲解全文索引载入失败'; });
    }
    if (list.length === 0) grid.appendChild(h('div', { class: 'empty' },
      h('p', null, L.favOnly && S.fav.length === 0 ? '收藏夹还是空的：打开任意手法，点「收藏」即可加入。' : '没有匹配的手法。'),
      h('button', { type: 'button', class: 'btn', onclick: () => { L.q = ''; L.cat = ''; L.kind = ''; L.favOnly = false; input.value = ''; syncCtl(); apply(); } }, '清除筛选')));
  }
  function syncCtl() {
    kindSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === L.kind));
    cats.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.c === L.cat));
    favBtn.classList.toggle('on', L.favOnly);
    favBtn.setAttribute('aria-pressed', L.favOnly ? 'true' : 'false');
  }
  let t = 0;
  input.addEventListener('input', () => { L.q = input.value; clearTimeout(t); t = setTimeout(apply, 90); });
  kindSeg.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { L.kind = b.dataset.k; syncCtl(); apply(); } });
  cats.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { L.cat = b.dataset.c; syncCtl(); apply(); } });
  favBtn.addEventListener('click', () => { L.favOnly = L.favOnly === false; syncCtl(); apply(); });

  main.appendChild(h('section', { class: 'page-head' },
    h('p', { class: 'eyebrow' }, 'MELIES · CINEMATIC TECHNIQUES'),
    h('h1', null, '手法图鉴'),
    h('p', { class: 'lead' }, '原站全部 ' + TOTAL + ' 条手法。点开任一条：大图片例、中英定义、可复制的提示词（通用模板 / 片例原句 / 其他写法）和相关手法。')));
  main.appendChild(h('div', { class: 'toolbar' },
    h('div', { class: 'toolbar-row' },
      h('label', { class: 'search-box' }, icon('search', 'ic-search'), input),
      kindSeg, favBtn, h('span', { class: 'tb-meta' }, count, status)),
    cats));
  main.appendChild(grid);
  apply();
  if (FULL == null) {
    status.textContent = '· 正在载入全文索引…';
    loadFull().then(() => { if (status.textContent.indexOf('全文索引') >= 0) status.textContent = ''; if (L.q.trim() && curPath === '/library') apply(); },
      () => { status.textContent = '· 全文索引载入失败，只能按名称搜索'; });
  }
  if (canHover && L.q) input.focus();
}

/* ----- entry modal ----- */
const modal = $('#modal'), panel = modal.querySelector('.modal-panel');
let modalSlug = null, lastFocus = null;
const TABS = [
  ['pi', '通用模板', 'Prompt it 全文：原站给的可复用写法，含 Still / Video 等分段。'],
  ['cp', '片例原句', '左侧这段片例实际使用的提示词，最短、最直接。'],
  ['hp', '正文写法', '原站正文「How it works」里给出的提示词行。'],
  ['fq', 'FAQ 写法', '原站 FAQ「怎么写提示词」里的示例与注意点。']
];
function renderModal(slug) {
  if (modal.hidden) {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('locked');
  }
  if (modalSlug !== slug) panel.scrollTop = 0;
  modalSlug = slug;
  const e = entryOf(slug);
  panel.textContent = '';
  if (e == null) {
    panel.appendChild(h('div', { class: 'm-loading' }, '正在载入词条…'));
    loadFull().then(() => { if (modalSlug === slug) renderModal(slug); },
      () => { panel.textContent = ''; panel.appendChild(h('div', { class: 'm-loading' }, '词条数据载入失败，请检查网络后重试。', h('button', { class: 'btn', type: 'button', onclick: () => renderModal(slug) }, '重试'))); });
    return;
  }
  const r = IDXMAP[slug];
  const list = modalList && modalList.indexOf(slug) >= 0 ? modalList : null;
  const pos = list ? list.indexOf(slug) : -1;
  const nav = (d) => { if (list == null) return; const n = list[(pos + d + list.length) % list.length]; openEntry(n, list); };

  const head = h('div', { class: 'm-bar' },
    h('span', { class: 'm-crumb' }, catZh(e.c), h('small', { lang: 'en' }, CATS[e.c] ? CATS[e.c].en : '')),
    h('div', { class: 'm-bar-r' },
      list ? h('span', { class: 'm-pos' }, (pos + 1) + ' / ' + list.length) : null,
      list ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': '上一条（←）', onclick: () => nav(-1) }, icon('left')) : null,
      list ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': '下一条（→）', onclick: () => nav(1) }, icon('right')) : null,
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': '关闭（Esc）', onclick: closeEntry }, icon('close'))));

  // 媒体
  const media = h('div', { class: 'm-media' });
  if (e.m[0]) {
    const v = h('video', { src: e.m[1], poster: e.m[2] || null, controls: true, muted: true, loop: true, autoplay: true, playsinline: true, preload: 'auto', 'aria-label': e.z + ' 片例' });
    v.muted = true;
    v.addEventListener('error', () => media.classList.add('noimg'));
    media.appendChild(h('div', { class: 'm-frame' }, v));
  } else {
    media.appendChild(h('div', { class: 'm-frame' }, thumbImg(e.m[1], e.t + ' 片例静帧')));
  }
  media.appendChild(h('p', { class: 'm-media-note' }, e.m[0] ? '原站片例 · 视频（静音循环，可开声）' : '原站片例 · 静帧（原站该条只提供静帧）'));
  if (e.st) media.appendChild(h('figure', { class: 'm-strip' }, thumbImg(e.st, e.t + ' 分镜帧'), h('figcaption', null, '分镜帧：同一镜头的连续画面')));

  // 信息
  const favBtn = h('button', { type: 'button', class: 'btn fav-btn' + (isFav(slug) ? ' on' : ''), 'data-fav-slug': slug, 'aria-pressed': isFav(slug) ? 'true' : 'false', onclick: () => toggleFav(slug) }, icon('star'), h('span', null, '收藏'));
  const lessonLinks = (LESSON_OF[slug] || []).map(([ci, li]) =>
    h('a', { class: 'in-lesson', href: '#/learn/' + ci + '/' + li, onclick: ev => { ev.preventDefault(); modalPushed = false; location.hash = '#/learn/' + ci + '/' + li; } },
      icon('book'), '在课程中：第 ' + (ci + 1) + ' 章 · ' + CH[ci].lessons[li].t, icon('right')));

  const info = h('div', { class: 'm-info' },
    h('h2', { id: 'm-title' }, e.z),
    h('p', { class: 'm-en', lang: 'en' }, e.t, e.g ? h('span', { class: 'm-tag' }, 'aka ' + e.g) : null),
    h('div', { class: 'm-actions' }, favBtn,
      h('a', { class: 'btn', href: e.u, target: '_blank', rel: 'noopener' }, '原站条目', icon('ext')),
      h('button', { type: 'button', class: 'btn', onclick: () => copyText(location.href.split('#')[0] + '#/library?e=' + slug, '本条链接') }, icon('link'), '复制链接')),
    lessonLinks,
    h('div', { class: 'm-def' },
      h('p', { class: 'def-zh' }, e.d[1]),
      h('p', { class: 'def-en', lang: 'en' }, e.d[0]),
      h('button', { type: 'button', class: 'jump', onclick: () => { const t = panel.querySelector('.m-text'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
        '读完整讲解：叙事作用 · 怎么拍 · 常见错误', icon('right'))),
    promptPanel(e));

  const rel = e.r && e.r.length ? h('section', { class: 'm-related' },
    h('h3', null, '相关手法', h('small', null, '原站在「Compared with similar shots」里拿来对比的条目')),
    h('div', { class: 'tile-grid rel-tiles' }, e.r.map(x => {
      const s = x[1].replace(/\/$/, '').split('/').pop();
      return IDXMAP[s] ? tile(s, { small: true, note: x[3] }) : null;
    }))) : null;

  panel.appendChild(head);
  panel.appendChild(h('div', { class: 'm-body' }, media, info));
  panel.appendChild(bodySection(slug));
  if (rel) panel.appendChild(rel);
  if (list) panel.appendChild(h('p', { class: 'm-hint' }, '快捷键：← → 切换 · F 收藏 · Esc 关闭'));
  panel.focus({ preventScroll: true });
}
function promptPanel(e) {
  const tabs = TABS.filter(t => e[t[0]]);
  let cur = tabs.some(t => t[0] === S.tab) ? S.tab : tabs[0][0];
  const wrap = h('section', { class: 'prompts' });
  const subj = h('input', { class: 'input subj-input', type: 'text', value: S.subject, placeholder: '例如 a woman in a red raincoat', 'aria-label': '替换 [Subject] 的主体', autocomplete: 'off' });
  const zhToggle = h('button', { type: 'button', class: 'chip-toggle' + (S.zh ? ' on' : ''), 'aria-pressed': S.zh ? 'true' : 'false' }, '中文对照');
  const tablist = h('div', { class: 'tabs', role: 'tablist', 'aria-label': '提示词版本' });
  const body = h('div', { class: 'tab-body', role: 'tabpanel' });
  function draw() {
    tablist.textContent = '';
    tabs.forEach(t => tablist.appendChild(h('button', {
      type: 'button', role: 'tab', 'aria-selected': t[0] === cur ? 'true' : 'false', class: t[0] === cur ? 'on' : '',
      onclick: () => { cur = t[0]; S.tab = cur; store.set('tab', cur); draw(); }
    }, t[1])));
    const t = TABS.find(x => x[0] === cur);
    const pair = e[cur];
    body.textContent = '';
    body.appendChild(h('p', { class: 'tab-note' }, t[2]));
    body.appendChild(h('div', { class: 'pbox' },
      promptView(pair[0], 'en'),
      h('button', { type: 'button', class: 'btn primary copy-btn', onclick: () => copyText(fillSubject(pair[0]), t[1] + '（英文）') }, icon('copy'), '复制英文')));
    if (S.zh && pair[1]) body.appendChild(h('div', { class: 'pbox zh' }, promptView(pair[1], 'zh'),
      h('button', { type: 'button', class: 'btn ghost copy-btn', onclick: () => copyText(fillSubject(pair[1]), t[1] + '（中文）') }, icon('copy'), '复制中文')));
  }
  let tm = 0;
  subj.addEventListener('input', () => { S.subject = subj.value; clearTimeout(tm); tm = setTimeout(() => { store.set('subject', S.subject); draw(); }, 120); });
  zhToggle.addEventListener('click', () => { S.zh = S.zh === false; store.set('zh', S.zh); zhToggle.classList.toggle('on', S.zh); zhToggle.setAttribute('aria-pressed', S.zh ? 'true' : 'false'); draw(); });
  wrap.appendChild(h('div', { class: 'prompts-head' }, h('h3', null, '提示词'), zhToggle));
  wrap.appendChild(h('label', { class: 'subj-row' }, h('span', null, '把 ', h('mark', { class: 'subj' }, '[Subject]'), ' 换成'), subj));
  wrap.appendChild(tablist);
  wrap.appendChild(body);
  draw();
  return wrap;
}
/* ----- 原站讲解（逐条 JSON，打开详情时才加载） ----- */
const BODY_SECS = [
  ['narrative', '叙事作用', '这个手法在故事里做什么'],
  ['how', '怎么拍', '机位、器材与执行要点'],
  ['when', '什么时候用', '适合与不适合的场景'],
  ['vs', '和相近手法的区别', '容易混淆的邻居'],
  ['examples_film', '电影里的例子', '去哪些片子里看'],
  ['mistakes', '常见错误', '通常哪里会出问题，怎么修'],
  ['faq', '常见问题', '']
];
const bodyCache = {};
function loadBody(slug) {
  if (bodyCache[slug] == null) {
    bodyCache[slug] = fetch('body/' + slug + '.json?v=__BODYV__').then(r => { if (r.ok === false) throw new Error(r.status); return r.json(); });
    bodyCache[slug].catch(() => { delete bodyCache[slug]; });
  }
  return bodyCache[slug];
}
function bodySection(slug) {
  const enBtn = h('button', { type: 'button', class: 'chip-toggle' + (S.bodyEn ? ' on' : ''), 'aria-pressed': S.bodyEn ? 'true' : 'false' }, '对照英文原文');
  const grid = h('div', { class: 'bt-grid' }, h('p', { class: 'muted' }, '正在载入讲解…'));
  const sec = h('section', { class: 'm-text' },
    h('div', { class: 'bt-head' }, h('div', null, h('h3', null, '原站讲解'), h('small', null, '译自 Melies 原站正文，英文可对照')), enBtn),
    grid);
  let data = null;
  function draw() {
    grid.textContent = '';
    BODY_SECS.forEach(([k, title, sub]) => {
      const zh = data.zh[k] || [], en = data.en[k] || [];
      if (zh.length === 0) return;
      const card = h('article', { class: 'bt-card bt-' + k }, h('h4', null, title, sub ? h('small', null, sub) : null));
      zh.forEach((p, i) => {
        if (k === 'faq') {
          card.appendChild(h('div', { class: 'qa' },
            h('p', { class: 'q' }, p.q), h('p', null, p.a),
            S.bodyEn && en[i] ? h('p', { class: 'en', lang: 'en' }, en[i].q + ' — ' + en[i].a) : null));
        } else {
          card.appendChild(h('p', null, p));
          if (S.bodyEn && en[i]) card.appendChild(h('p', { class: 'en', lang: 'en' }, en[i]));
        }
      });
      grid.appendChild(card);
    });
  }
  enBtn.addEventListener('click', () => {
    S.bodyEn = S.bodyEn === false;
    store.set('body-en', S.bodyEn);
    enBtn.classList.toggle('on', S.bodyEn);
    enBtn.setAttribute('aria-pressed', S.bodyEn ? 'true' : 'false');
    if (data) draw();
  });
  function load() {
    loadBody(slug).then(b => { data = b; draw(); }, () => {
      grid.textContent = '';
      grid.appendChild(h('p', { class: 'muted' }, '讲解载入失败。', h('button', { type: 'button', class: 'btn', onclick: () => { grid.textContent = '正在载入讲解…'; load(); } }, '重试')));
    });
  }
  load();
  return sec;
}
function hideModal() {
  if (modal.hidden) return;
  modal.querySelectorAll('video').forEach(v => { try { v.pause(); } catch (e) { /* ignore */ } });
  modal.hidden = true;
  panel.textContent = '';
  modalSlug = null;
  modalPushed = false;
  document.documentElement.classList.remove('locked');
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  // 详情里可能改了收藏，刷新当前页上的星标
  syncFavUI();
  if (curPath === '/board') { main.textContent = ''; viewBoard(); }
}
modal.addEventListener('click', ev => { if (ev.target.hasAttribute('data-close')) closeEntry(); });

/* ----- quiz ----- */
const Q = { round: null };
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// 错题本：按最近答错排序；答对一次即移出
const wrongList = () => Object.keys(S.wrong).filter(s => CT.lib[s]).sort((x, y) => S.wrong[y].t - S.wrong[x].t);
function markWrong(slug) {
  const w = S.wrong[slug] || { n: 0, t: 0 };
  S.wrong[slug] = { n: w.n + 1, t: Date.now() };
  store.set('wrong', S.wrong);
}
function clearWrong(slug) {
  if (S.wrong[slug] == null) return false;
  delete S.wrong[slug];
  store.set('wrong', S.wrong);
  return true;
}
function quizPool(scope) {
  if (scope === 'wrong') return wrongList();
  const s = [];
  CH.forEach((c, ci) => { if (scope === 'all' || String(ci) === scope) c.lessons.forEach(l => l.s.forEach(x => { if (s.indexOf(x) < 0) s.push(x); })); });
  return s;
}
function viewQuiz() {
  const wrap = h('div', { class: 'quiz' });
  main.appendChild(h('section', { class: 'page-head' },
    h('p', { class: 'eyebrow' }, 'QUIZ · 看片识手法'),
    h('h1', null, '看片测验'),
    h('p', { class: 'lead' }, '看一段片例，从 4 个选项里认出它用的手法。选完立刻看到定义；答错的会进错题本，下次可以只练错题。')));
  main.appendChild(wrap);
  if (Q.round && Q.round.i < Q.round.qs.length) quizQuestion(wrap); else quizStart(wrap);
}
function quizStart(wrap) {
  wrap.textContent = '';
  const sel = h('select', { class: 'input', 'aria-label': '出题范围' },
    h('option', { value: 'all' }, '全部 12 章（' + quizPool('all').length + ' 个片例）'),
    CH.map((c, ci) => h('option', { value: String(ci) }, '第 ' + (ci + 1) + ' 章 · ' + c.n + '（' + quizPool(String(ci)).length + '）')));
  const wl = wrongList();
  if (wl.length) sel.insertBefore(h('option', { value: 'wrong' }, '错题本（' + wl.length + ' 个）'), sel.firstChild.nextSibling);
  const best = store.get('quiz-best', null);
  const start = scope => {
    const pool = scope === 'wrong' ? quizPool('wrong') : shuffle(quizPool(scope).slice());
    Q.round = { scope, qs: pool.slice(0, Math.min(10, pool.length)), i: 0, score: 0, wrong: [], cleared: 0, answered: null };
    quizQuestion(wrap);
  };
  wrap.appendChild(h('div', { class: 'quiz-start card' },
    h('label', { class: 'field' }, h('span', null, '出题范围'), sel),
    h('button', { class: 'btn primary', type: 'button', onclick: () => start(sel.value) }, '开始 10 题', icon('right')),
    best ? h('p', { class: 'muted' }, '最近一轮：' + best) : null));

  // 错题本
  const book = h('section', { class: 'wrongbook' });
  if (wl.length === 0) {
    book.appendChild(h('div', { class: 'wb-head' }, h('div', null, h('h2', null, '错题本'), h('p', { class: 'muted' }, '答错的片例会自动收进来（只存在本机），答对一次就移出。现在是空的。'))));
  } else {
    const clearBtn = h('button', { class: 'btn ghost', type: 'button' }, '清空错题本');
    clearBtn.addEventListener('click', () => {
      if (clearBtn.dataset.armed) { S.wrong = {}; store.set('wrong', S.wrong); toast('错题本已清空'); quizStart(wrap); return; }
      clearBtn.dataset.armed = '1';
      clearBtn.textContent = '再点一次确认清空';
      setTimeout(() => { if (clearBtn.isConnected) { delete clearBtn.dataset.armed; clearBtn.textContent = '清空错题本'; } }, 3000);
    });
    book.appendChild(h('div', { class: 'wb-head' },
      h('div', null, h('h2', null, '错题本 ', h('span', { class: 'wb-count' }, wl.length)),
        h('p', { class: 'muted' }, '按最近答错排序；答对一次就移出。先点开看定义和讲解，再来一轮只练错题。')),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => start('wrong') }, '只练错题（' + Math.min(10, wl.length) + ' 题）'),
        clearBtn)));
    book.appendChild(h('div', { class: 'tile-grid' }, wl.map(s => {
      const t = tile(s, { list: wl, def: true });
      t.querySelector('.tile-body').appendChild(h('span', { class: 'wb-times' }, '答错 ' + S.wrong[s].n + ' 次'));
      return t;
    })));
  }
  wrap.appendChild(book);
}
function quizQuestion(wrap) {
  const R = Q.round;
  wrap.textContent = '';
  const slug = R.qs[R.i];
  const e = CT.lib[slug], r = IDXMAP[slug];
  if (R.opts == null || R.optsFor !== slug) {
    // 干扰项优先取同一原站分类，难度更接近实战
    const others = IDX.filter(x => x[0] !== slug && x[2] !== r[2]);
    const same = shuffle(others.filter(x => x[3] === r[3] && CT.lib[x[0]]));
    const rest = shuffle(others.filter(x => CT.lib[x[0]] && x[3] !== r[3]));
    const picks = same.slice(0, 2).concat(rest).slice(0, 3).map(x => x[0]);
    R.opts = shuffle([slug].concat(picks));
    R.optsFor = slug;
    R.answered = null;
  }
  const media = r[4]
    ? h('video', { src: r[6], poster: r[5], muted: true, loop: true, autoplay: true, playsinline: true, controls: true, preload: 'auto' })
    : thumbImg(e.m[1], '测验静帧');
  if (media.tagName === 'VIDEO') media.muted = true;
  const opts = h('div', { class: 'quiz-opts', role: 'group', 'aria-label': '选项' });
  R.opts.forEach((s, k) => {
    const x = IDXMAP[s];
    const cls = R.answered == null ? '' : s === slug ? 'right' : s === R.answered ? 'wrong' : 'dim';
    opts.appendChild(h('button', { type: 'button', class: 'quiz-opt ' + cls, disabled: R.answered != null, onclick: () => answer(s) },
      h('kbd', null, k + 1), h('span', null, h('b', null, x[2]), h('small', { lang: 'en' }, x[1]))));
  });
  function answer(s) {
    if (R.answered != null) return;
    R.answered = s;
    if (s === slug) { R.score++; if (clearWrong(slug)) { R.cleared++; R.justCleared = slug; } }
    else { R.wrong.push(slug); markWrong(slug); }
    quizQuestion(wrap);
  }
  wrap.appendChild(h('div', { class: 'quiz-top' },
    h('span', null, '第 ' + (R.i + 1) + ' / ' + R.qs.length + ' 题'),
    progressBar(R.i + (R.answered ? 1 : 0), R.qs.length, '测验进度'),
    h('span', null, '得分 ' + R.score),
    h('button', { type: 'button', class: 'btn ghost quiz-quit', onclick: () => { Q.round = null; quizStart(wrap); } }, '结束本轮')));
  const card = h('div', { class: 'quiz-card' },
    h('div', { class: 'quiz-media' }, media),
    h('div', { class: 'quiz-side' },
      h('h2', null, '这个镜头用的是哪种手法？'),
      opts,
      R.answered != null ? h('div', { class: 'quiz-feedback ' + (R.answered === slug ? 'ok' : 'no') },
        h('b', null, R.answered === slug ? '答对了' : '正确答案：' + e.z),
        R.answered === slug && R.justCleared === slug ? h('span', { class: 'fb-note' }, '已移出错题本') : null,
        R.answered !== slug ? h('span', { class: 'fb-note' }, '已收进错题本') : null,
        h('p', null, e.d[1]),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', id: 'quiz-next', onclick: () => {
            R.i++;
            if (R.i >= R.qs.length) quizEnd(wrap); else quizQuestion(wrap);
          } }, R.i + 1 >= R.qs.length ? '看结果' : '下一题', icon('right')),
          h('a', { class: 'btn', href: '#/quiz?e=' + slug, onclick: ev => { ev.preventDefault(); openEntry(slug); } }, '看详情与提示词'))) : null));
  wrap.appendChild(card);
  const nb = $('#quiz-next');
  if (nb) nb.focus({ preventScroll: true });
}
function quizEnd(wrap) {
  const R = Q.round;
  wrap.textContent = '';
  const msg = R.score + ' / ' + R.qs.length;
  store.set('quiz-best', msg + '（' + new Date().toLocaleDateString('zh-CN') + '）');
  wrap.appendChild(h('div', { class: 'quiz-end card' },
    h('p', { class: 'eyebrow' }, '本轮结果'),
    h('p', { class: 'quiz-score' }, msg),
    h('p', null, R.score === R.qs.length ? '全对！可以换一章，或者去图鉴里挑战更多手法。' : R.wrong.length + ' 个没认出来，已收进错题本，点开复习一下：'),
    R.cleared ? h('p', { class: 'muted' }, '本轮从错题本移出 ' + R.cleared + ' 个。') : null,
    R.wrong.length ? h('div', { class: 'tile-grid' }, R.wrong.map(s => tile(s, { list: R.wrong, def: true }))) : null,
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => { Q.round = null; quizStart(wrap); } }, wrongList().length ? '再来一轮 / 看错题本（' + wrongList().length + '）' : '再来一轮'),
      h('a', { class: 'btn', href: '#/learn/0' }, '回到学习路线'))));
  Q.round = null;
}

/* ----- board (收藏夹 + 提示词组合) ----- */
function viewBoard() {
  main.appendChild(h('section', { class: 'page-head' },
    h('p', { class: 'eyebrow' }, 'MY BOARD'),
    h('h1', null, '收藏夹'),
    h('p', { class: 'lead' }, '把想用的手法收进来，勾选后自动拼成一条提示词。适合给 AI 视频 / 图像工具写镜头语言。')));
  if (S.fav.length === 0) {
    main.appendChild(h('div', { class: 'empty card' },
      h('p', null, '还没有收藏。打开任意手法详情，点「收藏」（或按 F）即可加入。'),
      h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/library' }, '去手法图鉴'), h('a', { class: 'btn', href: '#/learn/0' }, '从课程开始'))));
    return;
  }
  const need = S.fav.filter(s => entryOf(s) == null);
  if (need.length) {
    const hold = h('p', { class: 'muted' }, '正在载入收藏的词条…');
    main.appendChild(hold);
    loadFull().then(() => { if (curPath === '/board') { main.textContent = ''; viewBoard(); } },
      () => { hold.textContent = '词条数据载入失败，请刷新重试。'; });
    return;
  }
  const picked = s => S.pick[s] !== false;
  let src = store.get('board-src', 'hp');
  const pairOf = e => (src === 'hp' ? (e.hp || e.cp) : e[src]);
  const subj = h('input', { class: 'input', type: 'text', value: S.subject, placeholder: '例如 a woman in a red raincoat', 'aria-label': '主体', autocomplete: 'off' });
  const out = h('textarea', { class: 'input out', rows: '7', 'aria-label': '组合后的提示词', spellcheck: 'false' });
  const zhOut = h('p', { class: 'muted zh-out' });
  const srcSeg = h('div', { class: 'seg-ctl', role: 'group', 'aria-label': '取哪种提示词' },
    [['hp', '简洁写法'], ['cp', '片例原句'], ['pi', '通用模板（长）']].map(([k, t]) => h('button', { type: 'button', 'data-k': k, class: src === k ? 'on' : '' }, t)));
  function compose() {
    const chosen = S.fav.filter(picked).map(entryOf).filter(Boolean);
    out.value = chosen.map(e => fillSubject(pairOf(e)[0]).trim()).join('\n\n');
    zhOut.textContent = chosen.length ? '中文参考：' + chosen.map(e => fillSubject(pairOf(e)[1] || '')).join(' / ') : '勾选左侧的手法来组合。';
  }
  srcSeg.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b == null) return; src = b.dataset.k; store.set('board-src', src); srcSeg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); compose(); });
  subj.addEventListener('input', () => { S.subject = subj.value; store.set('subject', S.subject); compose(); });

  const list = h('div', { class: 'board-list' });
  S.fav.forEach(s => {
    const cb = h('input', { type: 'checkbox', 'aria-label': '加入组合：' + IDXMAP[s][2] });
    cb.checked = picked(s);
    cb.addEventListener('change', () => { S.pick[s] = cb.checked; store.set('pick', S.pick); compose(); });
    const rm = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '移出收藏', title: '移出收藏', onclick: () => { toggleFav(s); main.textContent = ''; viewBoard(); } }, icon('close'));
    list.appendChild(h('div', { class: 'board-item' }, h('label', { class: 'bi-check' }, cb), tile(s, { list: S.fav.slice(), cat: true }), rm));
  });
  main.appendChild(h('div', { class: 'board' },
    list,
    h('aside', { class: 'composer card' },
      h('h2', null, '组合提示词'),
      h('label', { class: 'field' }, h('span', null, '主体（替换 [Subject]）'), subj),
      h('div', { class: 'field' }, h('span', null, '每条取'), srcSeg, h('small', { class: 'muted' }, '简洁写法 = 原站正文里的通用提示词行（没有则用片例原句），最适合拼接。')),
      out,
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => copyText(out.value, '组合提示词') }, icon('copy'), '复制组合'),
        h('button', { type: 'button', class: 'btn', onclick: () => {
          const md = S.fav.map(s => { const e = entryOf(s); return '- ' + e.z + '（' + e.t + '）' + e.u; }).join('\n');
          copyText(md, '收藏清单');
        } }, '复制清单')),
      zhOut)));
  compose();
}

/* ---------- palette search ---------- */
const pal = $('#palette'), palQ = $('#palette-q'), palList = $('#palette-list');
let palItems = [], palSel = 0;
function openPalette(prefill) {
  if (modal.hidden === false) closeEntry();
  pal.hidden = false;
  document.documentElement.classList.add('locked');
  palQ.value = prefill || '';
  renderPalette();
  palQ.focus();
  loadFull().then(() => { if (pal.hidden === false && palQ.value.trim()) renderPalette(); }, () => {});
}
function closePalette() {
  pal.hidden = true;
  if (modal.hidden) document.documentElement.classList.remove('locked');
}
function renderPalette() {
  const q = palQ.value.trim();
  const ql = q.toLowerCase();
  palItems = [];
  if (q === '') {
    const nx = nextLesson();
    if (nx) palItems.push({ kind: '继续', t: CH[nx[0]].lessons[nx[1]].t, sub: '第 ' + (nx[0] + 1) + ' 章 · ' + CH[nx[0]].n, go: () => go('/learn/' + nx[0] + '/' + nx[1]) });
    CH.forEach((c, ci) => palItems.push({ kind: '章节', t: pad(ci + 1) + ' ' + c.n, sub: c.sub, go: () => go('/learn/' + ci) }));
  } else {
    CH.forEach((c, ci) => c.lessons.forEach((l, li) => {
      if ([c.n, l.t, l.x, l.p].join(' ').toLowerCase().indexOf(ql) >= 0)
        palItems.push({ kind: '课程', t: l.t, sub: '第 ' + (ci + 1) + ' 章 · ' + c.n, go: () => go('/learn/' + ci + '/' + li) });
    }));
    const hits = searchEntries(q);
    hits.slice(0, 40).forEach(s => {
      const r = IDXMAP[s];
      palItems.push({ kind: SNIP[s] ? '讲解' : catZh(r[3]), t: r[2], en: SNIP[s] ? null : r[1], snip: SNIP[s], thumb: r[5], go: () => openEntry(s, hits.slice(0, 40)) });
    });
    if (BODYTXT == null) loadBodyIndex().then(() => { if (pal.hidden === false && palQ.value.trim()) renderPalette(); }, () => {});
  }
  palSel = 0;
  palList.textContent = '';
  if (palItems.length === 0) palList.appendChild(h('p', { class: 'pal-empty' }, '没有结果。试试英文名，或更短的关键词。'));
  palItems.forEach((it, i) => {
    const row = h('div', { class: 'pal-item', role: 'option', id: 'pal-' + i, 'aria-selected': i === 0 ? 'true' : 'false',
      onclick: () => pick(i), onmousemove: () => select(i) },
      it.thumb ? h('span', { class: 'pal-thumb' }, thumbImg(it.thumb, '')) : h('span', { class: 'pal-thumb ph' }, icon('book')),
      h('span', { class: 'pal-main' }, h('b', null, it.t), it.snip ? snipView(it.snip) : it.en ? h('small', { lang: 'en' }, it.en) : it.sub ? h('small', null, it.sub) : null),
      h('span', { class: 'pal-kind' }, it.kind));
    palList.appendChild(row);
  });
  if ((FULL == null || BODYTXT == null) && q) palList.appendChild(h('p', { class: 'pal-empty' }, '全文索引载入中，稍后会包含提示词与讲解正文里的匹配…'));
}
function select(i) {
  if (palItems.length === 0) return;
  palSel = (i + palItems.length) % palItems.length;
  palList.querySelectorAll('.pal-item').forEach((n, k) => n.setAttribute('aria-selected', k === palSel ? 'true' : 'false'));
  const n = $('#pal-' + palSel);
  if (n) n.scrollIntoView({ block: 'nearest' });
}
function pick(i) { const it = palItems[i]; if (it == null) return; closePalette(); it.go(); }
let palT = 0;
palQ.addEventListener('input', () => { clearTimeout(palT); palT = setTimeout(renderPalette, 70); });
palQ.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown') { ev.preventDefault(); select(palSel + 1); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); select(palSel - 1); }
  else if (ev.key === 'Enter') { ev.preventDefault(); pick(palSel); }
});
pal.addEventListener('click', ev => { if (ev.target.hasAttribute('data-close')) closePalette(); });
$('#open-palette').addEventListener('click', () => openPalette());

/* ---------- global keys ---------- */
const typing = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    if (pal.hidden === false) { closePalette(); return; }
    if (modal.hidden === false) { closeEntry(); return; }
  }
  if ((ev.key === 'k' || ev.key === 'K') && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); if (pal.hidden) openPalette(); else closePalette(); return; }
  if (typing(ev.target) || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (pal.hidden === false) return;
  if (ev.key === '/') { ev.preventDefault(); openPalette(); return; }
  if (modal.hidden === false && modalSlug) {
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      const list = modalList && modalList.indexOf(modalSlug) >= 0 ? modalList : null;
      if (list) { ev.preventDefault(); const p = list.indexOf(modalSlug); openEntry(list[(p + (ev.key === 'ArrowLeft' ? -1 : 1) + list.length) % list.length], list); }
    } else if (ev.key === 'f' || ev.key === 'F') { toggleFav(modalSlug); }
    return;
  }
  if (curPath === '/quiz' && Q.round && /^[1-4]$/.test(ev.key)) {
    const b = main.querySelectorAll('.quiz-opt')[+ev.key - 1];
    if (b && b.disabled === false) b.click();
  }
});

/* ---------- theme ---------- */
$('#theme-toggle').addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  try { localStorage.setItem('ct-theme', next); } catch (e) { /* ignore */ }
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = next === 'light' ? '#f6f3ee' : '#0d0e11';
});

// 顶栏滚动后加分隔线
const topbar = document.querySelector('.topbar');
window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 8), { passive: true });

syncFavUI();
window.addEventListener('hashchange', route);
route();
})();
