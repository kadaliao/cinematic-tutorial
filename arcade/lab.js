'use strict';
/* =====================================================
   街机 03 · 灯光台：用真的光照模型布光、调色，达到指定的光线风格
   ===================================================== */
const LW = 320, LH = 180;
const LASP = LW / LH;
const LDEF = { az: 35, el: 25, key: 0.9, hard: 0.5, temp: 0, fill: 0.35, rim: 0, hue: 200, bg: 0.3, sat: 1 };
const LRNG = { az: [-180, 180, 1], el: [-70, 85, 1], key: [0, 1.5, 0.01], hard: [0, 1, 0.01], temp: [-1, 1, 0.01], fill: [0, 1, 0.01], rim: [0, 1, 0.01], hue: [0, 360, 1], bg: [0, 1, 0.01], sat: [0, 1.6, 0.01] };
const LLAB = {
  az: ['光向', v => (Math.abs(v) < 8 ? '正面' : Math.abs(v) > 172 ? '正背面' : (v > 0 ? '右 ' : '左 ') + Math.abs(Math.round(v)) + '°')],
  el: ['高度', v => Math.round(v) + '°'], key: ['主光强度', v => v.toFixed(2)], hard: ['硬度', v => (v > 0.7 ? '硬' : v < 0.3 ? '柔' : '中')],
  temp: ['色温', v => (v > 0.15 ? '暖 ' : v < -0.15 ? '冷 ' : '中 ') + v.toFixed(2)], fill: ['补光', v => v.toFixed(2)], rim: ['轮廓光', v => v.toFixed(2)],
  hue: ['轮廓光色', v => Math.round(v) + '°'], bg: ['背景亮度', v => v.toFixed(2)], sat: ['饱和度', v => v.toFixed(2)]
};
const inR = (v, a, b) => v >= a && v <= b;
const aa = v => Math.abs(v);
const LT = [
  { slug: 'backlight', name: '逆光', init: { az: 0 }, goal: ['把主光挪到', B('人物背后'), '（光向偏离正面 135° 以上），主光别太弱。'], ok: P => aa(P.az) >= 135 && P.key >= 0.7 },
  { slug: 'side-lighting', name: '侧光', init: { az: 0, el: 20 }, goal: ['光从', B('正侧面'), '打来：光向 70°–110°，高度别太高。'], ok: P => inR(aa(P.az), 70, 110) && aa(P.el) <= 35 && P.key >= 0.7 },
  { slug: 'top-light', name: '顶光', init: { az: 0, el: 20 }, goal: ['光从', B('头顶'), '直下：高度 68° 以上。眼窝会变黑。'], ok: P => P.el >= 68 && P.key >= 0.7 },
  { slug: 'under-light', name: '底光', init: { az: 0, el: 20 }, goal: ['光从', B('下巴下面'), '往上打：高度 −35° 以下。恐怖片常用。'], ok: P => P.el <= -35 && P.key >= 0.7 },
  { slug: 'butterfly-lighting', name: '蝴蝶光', init: { az: 40, el: 20 }, goal: ['光在', B('正前上方'), '：光向基本居中，高度 38°–65°，鼻下会出现蝴蝶形阴影。'], ok: P => aa(P.az) <= 12 && inR(P.el, 38, 65) && P.key >= 0.7 },
  { slug: 'loop-lighting', name: '环形光', init: { az: 0, el: 5 }, goal: ['光在', B('斜前方偏上'), '：光向 20°–45°，高度 15°–40°，鼻影成一个小环。'], ok: P => inR(aa(P.az), 20, 45) && inR(P.el, 15, 40) && P.key >= 0.7 },
  { slug: 'rembrandt', name: '伦勃朗光', init: { az: 0, el: 10, fill: 0.5 }, goal: ['光更斜、更高：光向 30°–60°，高度 30°–55°，补光压低，暗侧脸颊亮出一个', B('小三角'), '。'], ok: P => inR(aa(P.az), 30, 60) && inR(P.el, 30, 55) && P.fill <= 0.35 && P.key >= 0.7 && P.hard >= 0.4 },
  { slug: 'split-lighting', name: '分割光', init: { az: 0, el: 20, fill: 0.4, hard: 0.3 }, goal: ['脸一半亮一半暗：光向 80°–100°，补光关到 0.08 以下，光调', B('硬'), '。'], ok: P => inR(aa(P.az), 80, 100) && P.fill <= 0.08 && P.hard >= 0.7 && aa(P.el) <= 25 && P.key >= 0.8 },
  { slug: 'rim-light', name: '轮廓光', init: { az: 20, rim: 0, fill: 0.5, bg: 0.4 }, goal: ['给人物勾一圈亮边：', B('轮廓光'), '拉到 0.7 以上，补光不要太亮，背景压暗一些。'], ok: P => P.rim >= 0.7 && P.fill <= 0.3 && P.bg <= 0.5 },
  { slug: 'silhouette', name: '剪影', init: { az: 20, bg: 0.3 }, goal: ['人物黑成一团、背景亮：光放到', B('背后'), '，补光关掉，背景亮度拉到 0.65 以上。'], ok: P => aa(P.az) >= 140 && P.fill <= 0.06 && P.bg >= 0.65 },
  { slug: 'low-key', name: '低调布光', init: { bg: 0.35, fill: 0.4 }, goal: ['整体偏暗、反差大：', B('背景几乎全黑'), '（0.12 以下），补光很小，主光不要太软。'], ok: P => P.bg <= 0.12 && P.fill <= 0.18 && P.hard >= 0.5 && P.key >= 0.55 },
  { slug: 'high-key', name: '高调布光', init: { bg: 0.3, hard: 0.7, fill: 0.2 }, goal: ['明亮、少阴影：背景拉亮到 0.85 以上，补光 0.6 以上，光调', B('柔'), '。'], ok: P => P.bg >= 0.85 && P.fill >= 0.6 && P.hard <= 0.4 && P.key >= 0.6 },
  { slug: 'hard-light', name: '硬光', init: { hard: 0.2 }, goal: ['阴影边缘像刀切：硬度拉到', B('0.9 以上'), '，主光足够亮。'], ok: P => P.hard >= 0.9 && P.key >= 0.8 },
  { slug: 'soft-light', name: '柔光', init: { hard: 0.9 }, goal: ['阴影渐变得没有边：硬度压到', B('0.12 以下'), '。'], ok: P => P.hard <= 0.12 && P.key >= 0.6 },
  { slug: 'chiaroscuro', name: '明暗对照', init: { az: 5, fill: 0.5, bg: 0.4, hard: 0.3 }, goal: ['像巴洛克油画：光斜打，', B('硬光 + 无补光 + 近黑背景'), '。'], ok: P => P.hard >= 0.7 && P.fill <= 0.08 && P.key >= 0.9 && P.bg <= 0.15 && aa(P.az) >= 25 },
  { slug: 'golden-hour', name: '黄金时刻', init: { temp: 0, el: 40, az: 0 }, goal: ['日落前的低角度暖光：色温', B('偏暖 0.6 以上'), '，高度压到 3°–25°，光从侧后方来（光向 50° 以上）。'], ok: P => P.temp >= 0.6 && inR(P.el, 3, 25) && aa(P.az) >= 50 && P.key >= 0.7 },
  { slug: 'blue-hour', name: '蓝调时刻', init: { temp: 0, key: 0.9 }, goal: ['日落后的冷蓝天光：色温', B('偏冷 −0.6 以下'), '，主光调弱（0.25–0.65），背景偏暗。'], ok: P => P.temp <= -0.6 && inR(P.key, 0.25, 0.65) && P.bg <= 0.45 },
  { slug: 'candlelight', name: '烛光', init: { temp: 0, key: 0.9, el: 30, bg: 0.4 }, goal: ['一点暖暖的微光：色温', B('很暖'), '，主光很弱，光位偏低，背景昏暗。'], ok: P => P.temp >= 0.7 && inR(P.key, 0.25, 0.55) && P.el <= 10 && P.bg <= 0.2 && P.hard <= 0.6 },
  { slug: 'neon-practical', name: '霓虹光', init: { rim: 0, bg: 0.4, sat: 1 }, goal: ['夜店的霓虹：轮廓光开到 0.6 以上，色相调到', B('品红 / 青色'), '，背景压暗，饱和度拉高。'], ok: P => P.rim >= 0.6 && P.bg <= 0.3 && P.sat >= 1.2 && (inR(P.hue, 290, 340) || inR(P.hue, 170, 200)) },
  { slug: 'film-noir', name: '黑色电影', init: { fill: 0.4, bg: 0.4, sat: 1, hard: 0.3 }, goal: ['黑白、硬光、没补光、背景近黑：', B('饱和度 0.05 以下'), '，硬度 0.7 以上。'], ok: P => P.sat <= 0.05 && P.hard >= 0.7 && P.fill <= 0.1 && P.bg <= 0.2 },
  { slug: 'monochrome', name: '黑白', init: { sat: 1 }, goal: ['把色彩全部抽掉：饱和度', B('降到 0.03 以下'), '。'], ok: P => P.sat <= 0.03 },
  { slug: 'desaturation', name: '低饱和', init: { sat: 1 }, goal: ['留一点色但很灰：饱和度在', B('0.05–0.4'), '之间。'], ok: P => inR(P.sat, 0.05, 0.4) },
  { slug: 'hyper-saturation', name: '高饱和', init: { sat: 1 }, goal: ['颜色要溢出来：饱和度', B('1.45 以上'), '。'], ok: P => P.sat >= 1.45 },
  { slug: 'warm-amber', name: '暖琥珀', init: { temp: 0 }, goal: ['整体偏暖：色温拉到', B('0.8 以上'), '。'], ok: P => P.temp >= 0.8 },
  { slug: 'cool-blue', name: '冷蓝', init: { temp: 0 }, goal: ['整体偏冷：色温拉到', B('−0.8 以下'), '。'], ok: P => P.temp <= -0.8 },
  { slug: 'overexposed', name: '过曝', init: { key: 0.9, fill: 0.2 }, goal: ['亮到发白：主光', B('1.4 以上'), '，补光 0.4 以上。'], ok: P => P.key >= 1.4 && P.fill >= 0.4 }
];

/* ---- 渲染器：椭球拼出的半身像，逐像素 Lambert 打光 ---- */
const ELL = [
  { id: 3, c: [0, -1.0, 0], r: [0.95, 0.5, 0.45] },          // 肩
  { id: 2, c: [0, -0.38, -0.02], r: [0.15, 0.3, 0.15] },     // 脖子
  { id: 1, c: [0, 0.12, 0], r: [0.34, 0.45, 0.36] },         // 头
  { id: 1, c: [0, -0.2, 0.2], r: [0.15, 0.12, 0.15] },       // 下巴
  { id: 1, c: [0, 0.27, 0.31], r: [0.2, 0.05, 0.1] },        // 眉弓
  { id: 1, c: [0, 0.07, 0.34], r: [0.07, 0.13, 0.1] }        // 鼻子
];
const GEO = (() => {
  const n = LW * LH, nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n), mat = new Uint8Array(n);
  for (let py = 0; py < LH; py++) for (let px = 0; px < LW; px++) {
    const u = (px / LW - 0.5) * 2 * LASP, i = py * LW + px;
    const vv = 1 - (py / LH) * 2;
    let bz = -1e9, bn = null, bid = 0, bw = null;
    for (const e of ELL) {
      const dx = (u - e.c[0]) / e.r[0], dy = (vv - e.c[1]) / e.r[1], q = dx * dx + dy * dy;
      if (q >= 1) continue;
      const z = e.c[2] + e.r[2] * Math.sqrt(1 - q);
      if (z > bz) { bz = z; bid = e.id; bn = [(u - e.c[0]) / (e.r[0] * e.r[0]), (vv - e.c[1]) / (e.r[1] * e.r[1]), (z - e.c[2]) / (e.r[2] * e.r[2])]; bw = [u, vv, z]; }
    }
    if (!bn) { mat[i] = 0; continue; }
    const l = Math.hypot(bn[0], bn[1], bn[2]) || 1;
    nx[i] = bn[0] / l; ny[i] = bn[1] / l; nz[i] = bn[2] / l;
    let m = bid;
    if (bid === 1 && bw[1] > 0.37) m = 4;                                                       // 头发
    else if (bid === 1 && Math.abs(Math.abs(bw[0]) - 0.13) < 0.045 && Math.abs(bw[1] - 0.17) < 0.022 && bw[2] > 0.2) m = 5;   // 眼
    else if (bid === 1 && Math.abs(bw[0]) < 0.09 && Math.abs(bw[1] + 0.06) < 0.012 && bw[2] > 0.2) m = 6;                         // 嘴
    mat[i] = m;
  }
  return { nx, ny, nz, mat };
})();
const ALB = [null, [0.86, 0.66, 0.55], [0.74, 0.55, 0.46], [0.2, 0.23, 0.34], [0.07, 0.055, 0.055], [0.1, 0.07, 0.07], [0.55, 0.22, 0.22]];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hueRgb(hh) {
  const k = n => (n + hh / 60) % 6, f = n => 1 - Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return [f(5), f(3), f(1)];
}
function tempRgb(t) { return t >= 0 ? [1, lerp(1, 0.72, t), lerp(1, 0.4, t)] : [lerp(1, 0.55, -t), lerp(1, 0.72, -t), 1]; }
function renderLight(ctx, img, P) {
  const d = img.data, az = P.az * Math.PI / 180, el = P.el * Math.PI / 180;
  const Lx = Math.sin(az) * Math.cos(el), Ly = Math.sin(el), Lz = Math.cos(az) * Math.cos(el);
  const lxy = Math.hypot(Lx, Ly) || 1, lxn = Lx / lxy, lyn = Ly / lxy;
  const kc = tempRgb(P.temp), rc = hueRgb(P.hue);
  const w = lerp(0.9, 0.03, Math.pow(P.hard, 0.8));
  const soft = 1 - P.hard;
  for (let py = 0; py < LH; py++) for (let px = 0; px < LW; px++) {
    const i = py * LW + px, o = i * 4, m = GEO.mat[i];
    let r, g, b;
    if (m === 0) {
      const u = (px / LW - 0.5) * 2 * LASP, v = 1 - (py / LH) * 2;
      const vig = 1 - 0.32 * (u * u / (LASP * LASP) + v * v * 0.5), base = P.bg * vig;
      const glow = P.rim * 0.22 * Math.exp(-(u * u + v * v * 1.2) * 0.9);
      r = base * (0.55 + 0.45 * kc[0]) + rc[0] * glow; g = base * (0.55 + 0.45 * kc[1]) + rc[1] * glow; b = base * (0.55 + 0.45 * kc[2]) + rc[2] * glow;
    } else {
      const nx = GEO.nx[i], ny = GEO.ny[i], nz = GEO.nz[i], al = ALB[m];
      const lam = nx * Lx + ny * Ly + nz * Lz;
      let sh = smooth(0, w, lam);
      sh = Math.max(sh, soft * 0.32 * (lam * 0.5 + 0.5));
      const fillT = P.fill * 0.6 * Math.max(0, nz * 0.85 + 0.15);
      const amb = 0.03 + 0.05 * P.bg;
      const edge = Math.pow(1 - Math.max(0, nz), 2.2), bias = 0.4 + 0.6 * Math.max(0, nx * lxn + ny * lyn);
      const rimT = P.rim * edge * bias * 1.5;
      const kk = P.key * sh;
      r = al[0] * (kc[0] * kk + fillT + amb) + rc[0] * rimT;
      g = al[1] * (kc[1] * kk + fillT + amb) + rc[1] * rimT;
      b = al[2] * (kc[2] * kk + fillT + amb) + rc[2] * rimT;
    }
    const gray = 0.3 * r + 0.59 * g + 0.11 * b;
    r = gray + (r - gray) * P.sat; g = gray + (g - gray) * P.sat; b = gray + (b - gray) * P.sat;
    r = Math.pow(clamp(r / (1 + r * 0.3), 0, 1), 0.8); g = Math.pow(clamp(g / (1 + g * 0.3), 0, 1), 0.8); b = Math.pow(clamp(b / (1 + b * 0.3), 0, 1), 0.8);
    d[o] = r * 255; d[o + 1] = g * 255; d[o + 2] = b * 255; d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function labMap() {
  app.appendChild(topbar('#/'));
  app.appendChild(h('div', { class: 'page-t' }, h('h2', null, '灯光台'), h('p', null, LT.length + ' 个布光 / 调色任务：照着参考片，把光「摆」出来。已完成 ' + LT.filter((t, i) => SV.lab[i]).length + ' / ' + LT.length)));
  app.appendChild(h('div', { class: 'dir-grid' }, LT.map((t, i) => {
    const it = MAP[t.slug], st = SV.lab[i] || 0;
    return h('button', { type: 'button', class: 'dir-card lab', onclick: () => go('#/lab/' + i) },
      h('div', { class: 'th' }, h('img', { src: it.t, alt: '', loading: 'lazy' })),
      h('b', null, pad(i + 1) + ' ' + t.name), h('small', null, it.e), h('span', { class: 'st' }, starStr(st)));
  })));
}
let labSession = 0;
function labPlay(i) {
  const T = LT[i];
  if (!T) { go('#/lab'); return; }
  const it = MAP[T.slug];
  const P = Object.assign({}, LDEF, T.init);
  const stage = makeStage();
  if (labSession) stage.setTier(Math.min(4, labSession), true);
  const cv = h('canvas', { width: LW, height: LH, class: 'lab-cv', 'aria-label': '灯光预览' });
  const ctx = cv.getContext('2d'), img = ctx.createImageData(LW, LH);
  const shotIn = h('span');
  const vf = h('div', { class: 'vf lab-vf' }, cv,
    h('div', { class: 'vfui', 'aria-hidden': 'true' }, h('i', { class: 'c tl' }), h('i', { class: 'c tr' }), h('i', { class: 'c bl' }), h('i', { class: 'c br' }), h('span', { class: 'rec' }, 'REC')),
    h('div', { class: 'shotbar' }, shotIn));
  // 光位示意（俯视）：拖动可改光向
  const dial = h('canvas', { width: 120, height: 120, class: 'dial', 'aria-label': '光位示意：拖动改光向' });
  const dctx = dial.getContext('2d');
  function drawDial() {
    dctx.clearRect(0, 0, 120, 120);
    dctx.strokeStyle = 'rgba(255,255,255,.25)'; dctx.lineWidth = 2; dctx.beginPath(); dctx.arc(60, 60, 46, 0, 7); dctx.stroke();
    dctx.fillStyle = '#ffd1a6'; dctx.beginPath(); dctx.arc(60, 60, 9, 0, 7); dctx.fill();
    dctx.fillStyle = 'rgba(255,255,255,.7)'; dctx.beginPath(); dctx.moveTo(60, 116); dctx.lineTo(50, 104); dctx.lineTo(70, 104); dctx.closePath(); dctx.fill();
    dctx.fillStyle = 'rgba(255,255,255,.5)'; dctx.font = '700 10px sans-serif'; dctx.textAlign = 'center'; dctx.fillText('镜头', 60, 100);
    const a = P.az * Math.PI / 180, e = Math.cos(P.el * Math.PI / 180), x = 60 + 46 * e * Math.sin(a), y = 60 + 46 * e * Math.cos(a);
    const kc = tempRgb(P.temp);
    dctx.fillStyle = 'rgb(' + Math.round(kc[0] * 255) + ',' + Math.round(kc[1] * 255) + ',' + Math.round(kc[2] * 255) + ')';
    dctx.shadowColor = '#ffc247'; dctx.shadowBlur = 14; dctx.beginPath(); dctx.arc(x, y, 8 + 4 * Math.min(1.5, P.key), 0, 7); dctx.fill(); dctx.shadowBlur = 0;
    dctx.strokeStyle = 'rgba(255,194,71,.5)'; dctx.setLineDash([3, 4]); dctx.beginPath(); dctx.moveTo(60, 60); dctx.lineTo(x, y); dctx.stroke(); dctx.setLineDash([]);
  }
  let dirty = true;
  const sliders = {};
  const mk = key => {
    const [lab, fmt] = LLAB[key], r = LRNG[key], val = h('em', null, '');
    const inp = h('input', { type: 'range', min: String(r[0]), max: String(r[1]), step: String(r[2]), 'aria-label': lab });
    inp.addEventListener('input', () => { P[key] = +inp.value; dirty = true; AU.ensure(); });
    sliders[key] = { inp, val, fmt };
    return h('label', null, h('span', null, lab, val), inp);
  };
  const ctl = h('div', { class: 'ctl lab-ctl' }, ['az', 'el', 'key', 'hard', 'temp', 'fill', 'rim', 'hue', 'bg', 'sat'].map(mk));
  let dd = false;
  const dset = e => {
    const r = dial.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    P.az = clamp(Math.round(Math.atan2(x, y) * 180 / Math.PI), -180, 180); dirty = true;
  };
  dial.addEventListener('pointerdown', e => { dd = true; dial.setPointerCapture(e.pointerId); dset(e); AU.ensure(); });
  dial.addEventListener('pointermove', e => { if (dd) dset(e); });
  dial.addEventListener('pointerup', () => { dd = false; }); dial.addEventListener('pointercancel', () => { dd = false; });

  const cutBox = h('div');
  stage.el.append(
    h('div', { class: 'hud' }, h('div', { class: 'grow' }, h('div', { class: 'lab' }, h('span', null, '布光任务 ' + (i + 1) + ' / ' + LT.length), h('span', null, TIER_NAMES[stage.tier].replace('\n', ' · '))))),
    h('div', { class: 'dplay' },
      h('div', null, vf, ctl, h('p', { class: 'tip' }, '右下角的小圆盘是俯视图：黄点 = 主光，朝下是镜头，可以拖。其余全靠滑杆。键盘：', h('kbd', null, 'R'), ' 复位')),
      h('div', { class: 'brief' },
        h('div', { class: 'reft' }, '照这个拍 ▸ 原片参考'),
        refBlock(T.slug),
        h('h3', null, T.name, h('small', { lang: 'en' }, it.e)),
        h('div', { class: 'goal' }, T.goal),
        h('div', { class: 'dialbox' }, dial, h('p', { class: 'tip', style: 'margin:0' }, it.d)))),
    cutBox);
  stage.finish();
  app.appendChild(topbar('#/lab'));
  app.appendChild(stage.el);

  const C = { h: 0, done: false, t0: 0 };
  let raf = 0, started = false, lastT = 0;
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const now = ts / 1000, dt = lastT ? Math.min(0.1, now - lastT) : 0.016; lastT = now;
    if (!started) { started = true; C.t0 = now; }
    if (dirty) {
      dirty = false;
      renderLight(ctx, img, P); drawDial();
      for (const k in sliders) { const s = sliders[k]; if (document.activeElement !== s.inp) s.inp.value = String(P[k]); s.val.textContent = s.fmt(P[k]); }
    }
    if (C.done || now - C.t0 < 0.6) return;
    C.h = T.ok(P) ? C.h + dt : 0;
    const p = clamp(C.h / 0.8, 0, 1);
    shotIn.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    if (p >= 1) done(now - C.t0);
  }
  function done(et) {
    C.done = true;
    const stars = et <= 10 ? 3 : et <= 25 ? 2 : 1;
    const first = !(SV.lab[i] >= 1);
    if (stars > (SV.lab[i] || 0)) SV.lab[i] = stars;
    const xp = stars * 40 + (first ? 30 : 0); markMast(T.slug); addXp(xp); SV.plays++; save(); checkAch();
    labSession++;
    AU.hit(6); AU.clap(); stage.setTier(Math.min(4, labSession)); stage.burst(30);
    const nextI = i + 1 < LT.length ? i + 1 : null;
    cutBox.replaceWith(h('div', { class: 'cut' },
      h('div', { class: 'big' }, '就是这个光！'),
      h('div', { class: 'stars' }, starStr(stars)),
      h('p', { class: 'sub' }, B(T.name), it.d2 || it.d),
      h('p', { style: 'color:var(--lime);font-weight:900;margin:0' }, '+' + xp + ' XP · 用时 ' + et.toFixed(1) + ' 秒'),
      h('div', { class: 'row' },
        nextI != null ? h('button', { type: 'button', class: 'btn', onclick: () => go('#/lab/' + nextI) }, '下一个 ▶') : null,
        h('button', { type: 'button', class: 'btn alt', onclick: () => route() }, '再布一遍'),
        h('button', { type: 'button', class: 'btn alt', onclick: () => go('#/lab') }, '任务列表'))));
    for (let k = 0; k < stars; k++) setTimeout(() => AU.star(k), 300 + k * 260);
  }
  const kd = e => { if (e.key === 'r' || e.key === 'R') { if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range') return; Object.assign(P, LDEF, T.init); dirty = true; } };
  document.addEventListener('keydown', kd);
  onLeave(() => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); });
  raf = requestAnimationFrame(frame);
}
route_add(/^\/lab$/, () => labMap());
route_add(/^\/lab\/(\d+)$/, i => labPlay(+i));
