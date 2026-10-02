'use strict';
/* 大厅与启动 */
function hub() {
  app.appendChild(topbar());
  const matchMax = 36 + PACK_STARS_MAX;
  const matchGot = sumStars(SV.match) + sumStars(SV.pack);
  app.appendChild(h('div', { class: 'marquee' }, h('h1', null, '片场街机'), h('p', null, '不读讲义，上手就玩：玩着玩着，电影语言就进脑子里了。')));
  app.appendChild(h('div', { class: 'cabs' },
    cabinet('#/match', 'var(--pink)', '街机 01', '对片', '把「手法名」和「片例」配成对，连消加分。课程线 12 关 + 图鉴线覆盖全部 ' + TOTAL + ' 个手法，另有无尽模式。', '★ ' + matchGot + ' / ' + matchMax, icon('match')),
    cabinet('#/dir', 'var(--cyan)', '街机 02', '导演椅', DT.length + ' 个镜头任务：别猜了，自己拍。亲手演出荷兰角、推镜、希区柯克变焦、跟拍……', '★ ' + sumStars(SV.dir) + ' / ' + DT.length * 3, icon('dir')),
    cabinet('#/lab', 'var(--lime)', '街机 03', '灯光台', LT.length + ' 个布光与调色任务：摆灯、调色温，亲手打出逆光、伦勃朗光、黄金时刻、黑色电影……', '★ ' + sumStars(SV.lab) + ' / ' + LT.length * 3, icon('lab'))));
  const d = SV.daily, done = d.last === todayStr();
  app.appendChild(h('div', { class: 'shelf' },
    shelf('#/daily', '每日片单', done ? '今天已完成 ✓ · 连续 ' + d.streak + ' 天' : '今天还没玩 · 完成有额外 XP', '📅'),
    shelf('#/album', '片库图鉴', '认熟 ' + mastCount() + ' / ' + TOTAL + ' · 见过 ' + seenCount(), '🎞'),
    shelf('#/ach', '成就', '已解锁 ' + ACH.filter(a => SV.ach[a.id]).length + ' / ' + ACH.length, '🏆')));
  app.appendChild(h('p', { class: 'foot' }, '片例与手法定义取自 ',
    h('a', { href: 'https://melies.co/cinematic-techniques', target: '_blank', rel: 'noopener' }, 'Melies · Cinematic techniques'),
    '，中文为学习用对照翻译，版权归原站所有。进度只保存在你的浏览器里。　',
    h('a', { href: SITE }, '← 看图文教程版')));
}
function cabinet(href, color, tag, title, desc, stars, ico) {
  return h('a', { class: 'cab', href, style: '--c:' + color },
    ico, h('span', { class: 'tag' }, tag), h('h2', null, title), h('p', null, desc), h('div', { class: 'stars' }, stars),
    h('span', { class: 'btn play' + (color.indexOf('pink') > 0 ? ' pink' : '') }, '开始 ▶'));
}
function shelf(href, title, sub, ic) {
  return h('a', { class: 'shelf-i', href }, h('span', { class: 'ic' }, ic), h('div', null, h('b', null, title), h('small', null, sub)));
}
function icon(kind) {
  const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true');
  const add = (tag, a) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); s.appendChild(e); };
  if (kind === 'match') {
    add('rect', { x: 6, y: 14, width: 22, height: 30, rx: 5, fill: '#ff4f9a' }); add('rect', { x: 32, y: 22, width: 24, height: 30, rx: 5, fill: '#ffc247' });
    add('path', { d: 'M20 29 L44 37', stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 7' });
  } else if (kind === 'dir') {
    add('rect', { x: 8, y: 20, width: 36, height: 26, rx: 5, fill: '#3de1ff' }); add('path', { d: 'M44 28 L58 20 V46 L44 38 Z', fill: '#3de1ff' });
    add('circle', { cx: 20, cy: 33, r: 6, fill: '#0a0912' }); add('path', { d: 'M18 12 L28 20 M34 10 L36 20', stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round' });
  } else {
    add('path', { d: 'M20 8 H44 L52 30 H12 Z', fill: '#b6ff5c' }); add('rect', { x: 29, y: 30, width: 6, height: 20, fill: '#b6ff5c' });
    add('path', { d: 'M20 56 H44', stroke: '#b6ff5c', 'stroke-width': 5, 'stroke-linecap': 'round' }); add('path', { d: 'M10 38 L4 44 M54 38 L60 44 M32 34 V40', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round' });
  }
  return s;
}
route_add(/^\/?$/, () => hub());
route();
