'use strict';
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
  { slug: 'crash-zoom-in', name: '急推变焦', init: {}, goal: [B('急推'), '：用「变焦」滑杆，在 0.6 秒内猛地推进一大段。'] },
  { slug: 'dolly-zoom', name: '希区柯克变焦', init: { d: 0, lens: 1.8 }, goal: [B('一边推、一边拉'), '：推拉滑杆往前推，同时变焦滑杆往回拉，让人物大小几乎不变，背景却被拉扯变形。3 秒内推进 45% 以上。'] },
  { slug: 'crash-zoom-out', name: '急拉变焦', init: { lens: 2.6 }, goal: [B('急拉'), '：现在是特写，用变焦滑杆在 0.6 秒内猛地拉远一大段。'] },
  { slug: 'slow-zoom-in', name: '慢速变焦推近', init: { lens: 1 }, goal: ['平稳、缓慢地', B('推近变焦'), '：4 秒内推进 0.6 倍以上，别猛——太快就成急推了。'] },
  { slug: 'slow-zoom-out', name: '慢速变焦拉远', init: { lens: 2.4 }, goal: ['平稳、缓慢地', B('拉远变焦'), '：4 秒内拉远 0.6 倍以上，别猛。'] },
  { slug: 'whip-tilt', name: '上下甩', init: { y: -0.6 }, goal: [B('甩'), '到另一个方向：不到半秒，把镜头猛地从下甩到上。'] },
  { slug: 'yoyo-zoom', name: '往复变焦', init: { lens: 1.2 }, goal: ['先', B('推近'), '再', B('拉回'), '，像溜溜球：3 秒内变焦先涨 0.8 倍以上再回落 0.8 倍以上。'] },
  { slug: 'dutch-roll', name: '荷兰角滚转', init: {}, goal: [B('左右歪'), '：用滚转滑杆，3 秒内先歪到左边 10°，再歪到右边 10°。'] },
  { slug: 'extreme-close-up', name: '极特写', init: {}, goal: ['贴到', B('极致'), '：变焦推到 3 倍以上，并让人物保持在画面中央。'] },
  { slug: 'pan-left', name: '向左摇', init: { x: 0.7 }, goal: [B('向左摇'), '：缓缓向左摇过去，约 3 秒摇出一大段。别太快。'] },
  { slug: 'zoom', name: '变焦', init: { lens: 1 }, goal: ['平滑地', B('变焦'), '：3 秒内把变焦改变 0.9 倍以上（推近或拉远都行），别猛。'] },
  { slug: 'long-shot', name: '远景', init: { lens: 1.6 }, goal: ['退到', B('远景'), '：变焦拉到 0.9 倍以下，推拉回到起点，让人物缩成环境里的一个小人。'] },
  { slug: 'super-dolly-in', name: '超长推轨推进', init: { d: 0 }, goal: [B('一路推到底'), '：用推拉滑杆，3 秒内一口气推进 85% 以上。'] }
];
function dirMap() {
  app.appendChild(topbar('#/'));
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, '导演椅'), h('p', null, DT.length + ' 个镜头任务：照着参考片，自己动手拍出来。连拍越多，片场越热。已拍成 ' + DT.filter((t, i) => SV.dir[i]).length + ' / ' + DT.length)));
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
  const speed = (arr, f) => { let m = 0, j = 0; for (let k = 1; k < arr.length; k++) { while (arr[k].t - arr[j].t > 0.5) j++; if (j < k) m = Math.max(m, Math.abs(arr[k][f] - arr[j][f]) / (arr[k].t - arr[j].t)); } return m; };
  const hold = (key, cond, sec, dt) => { C.h[key] = cond ? (C.h[key] || 0) + dt : 0; return C.h[key] / sec; };
  function judge(now, dt, so) {
    const H = C.hist, win = sec => H.filter(s => s.t >= now - sec);
    const w3 = win(3), w25 = win(2.5), w15 = win(1.5), w06 = win(0.6), w05 = win(0.5);
    switch (T.slug) {
      case 'dutch-angle': return hold('a', Math.abs(S.roll) >= 12, 0.5, dt);
      case 'push-in': return (S.d - mn(w3, 'd')) / 0.55;
      case 'dolly-out': return (mx(w3, 'd') - S.d) / 0.55;
      case 'pan': {
        const dx = Math.abs(S.x - w3[0].x);
        return speed(w3, 'x') > 1.6 ? 0 : dx / 1.2;
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
      case 'dolly-zoom': {
        const sc = w3.map(q => q.lens * (1 + q.d * K[2])), ratio = Math.max.apply(null, sc) / Math.min.apply(null, sc);
        return ratio <= 1.2 ? (S.d - mn(w3, 'd')) / 0.45 : 0;
      }
      case 'crash-zoom-out': return (mx(w06, 'lens') - S.lens) / 1.2;
      case 'slow-zoom-in': case 'slow-zoom-out': {
        const w4 = win(4), vmax = speed(w4, 'lens');
        const dl = T.slug === 'slow-zoom-in' ? S.lens - mn(w4, 'lens') : mx(w4, 'lens') - S.lens;
        return vmax > 0.55 ? 0 : dl / 0.6;
      }
      case 'whip-tilt': return (S.y - w05[0].y) / 1.0;
      case 'yoyo-zoom': { const peak = mx(w3, 'lens'); return Math.min((peak - w3[0].lens) / 0.8, (peak - S.lens) / 0.8); }
      case 'dutch-roll': return Math.min(Math.max(0, -mn(w3, 'roll')) / 10, Math.max(0, mx(w3, 'roll')) / 10);
      case 'extreme-close-up': return hold('a', S.lens >= 3.0 && Math.abs(so) <= 0.2, 0.5, dt);
      case 'pan-left': {
        return speed(w3, 'x') > 1.6 ? 0 : (w3[0].x - S.x) / 1.2;
      }
      case 'zoom': {
        return speed(w3, 'lens') > 1.3 ? 0 : Math.abs(S.lens - w3[0].lens) / 0.9;
      }
      case 'long-shot': return hold('a', S.lens <= 0.9 && S.d <= 0.15, 0.6, dt);
      case 'super-dolly-in': return (S.d - mn(w3, 'd')) / 0.85;
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
    const xp = stars * 40 + (first ? 30 : 0); markMast(T.slug); addXp(xp); SV.plays++; save(); checkAch();
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

route_add(/^\/dir$/, () => dirMap());
route_add(/^\/dir\/(\d+)$/, i => dirPlay(+i));
