/* ----- game：看片连击（借鉴 dopa-drill：答对越多演出越盛大，答错不扣分、不结束） ----- */
const GAME = { round: null };
const GS = store.get('game', { best: 0, played: 0, combo: 0, master: {} });   // master: slug -> 首答即对次数
const gsave = () => store.set('game', GS);
const FX = {
  sound: store.get('g-sound', true),
  motion: store.get('g-motion', !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
};
const STAGE_NAMES = ['开机', '第 1 幕 · 胶片边', '第 2 幕 · 颗粒', '第 3 幕 · 镜头光', '终幕 · 首映'];
const stageOf = (correct, total) => Math.min(4, Math.floor(correct * 5 / Math.max(1, total)));
const gMastered = s => (GS.master[s] || 0) > 0;

/* 合成音效与分层 BGM：全部 Web Audio，不用音频文件 */
const AU = {
  ctx: null, out: null, nbuf: null, timer: 0, nextT: 0, step: 0, stage: 0,
  CH: [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]],
  ensure() {
    if (!FX.sound) return false;
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return false;
      this.ctx = new C();
      this.out = this.ctx.createGain(); this.out.gain.value = 0.55; this.out.connect(this.ctx.destination);
      const b = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.nbuf = b;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },
  tone(f, t, d, type, v) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + d + 0.05);
  },
  noise(t, d, v, f) {
    const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.nbuf; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 0.8;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(this.out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  },
  kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.2);
  },
  hit(combo) {                                   // 快门声 + 随连击爬升的五声音阶
    if (!this.ensure()) return;
    const t = this.ctx.currentTime, sc = [0, 2, 4, 7, 9], i = Math.min(Math.max(combo, 1) - 1, 14);
    this.noise(t, 0.03, 0.45, 2600); this.noise(t + 0.055, 0.04, 0.3, 1900);
    const f = 523.25 * Math.pow(2, (sc[i % 5] + 12 * Math.floor(i / 5)) / 12);
    this.tone(f, t + 0.02, 0.28, 'triangle', 0.24); this.tone(f * 2, t + 0.02, 0.16, 'sine', 0.07);
  },
  miss() {                                       // 柔和的下行双音，不刺耳
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.tone(247, t, 0.18, 'sine', 0.16); this.tone(196, t + 0.12, 0.26, 'sine', 0.13);
  },
  stageUp() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.05, 0.6, 1200); this.noise(t + 0.09, 0.07, 0.8, 900);   // 打板
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => this.tone(f, t + 0.14 + k * 0.07, 0.4, 'triangle', 0.2));
  },
  fin() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392, 523.25, 659.25].forEach((f, k) => this.tone(f, t + k * 0.09, 1.1, 'triangle', 0.16));
  },
  start(stage) {
    this.stage = stage;
    if (this.timer || !stage || !this.ensure()) return;
    this.nextT = this.ctx.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.sched(), 80);
  },
  stop() { clearInterval(this.timer); this.timer = 0; },
  sched() {
    while (this.nextT < this.ctx.currentTime + 0.25) { this.play(this.step, this.nextT); this.nextT += 0.3; this.step++; }
  },
  play(s, t) {
    const st = this.stage, ch = this.CH[Math.floor(s / 8) % 4];
    if (st >= 1) { if (s % 4 === 0) this.kick(t); if (s % 2 === 1) this.noise(t, 0.03, 0.06, 7000); }
    if (st >= 2 && s % 2 === 0) this.tone(ch[0] / 2, t, 0.26, 'sine', 0.2);
    if (st >= 3) this.tone(ch[s % 3] * 2, t, 0.2, 'triangle', 0.06);
    if (st >= 4) {
      if (s % 8 === 0) ch.forEach(f => this.tone(f, t, 2.2, 'sine', 0.05));
      if (s % 8 === 4) this.noise(t, 0.09, 0.14, 1800);
    }
  }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) AU.stop(); else if (GAME.round && curPath === '/game' && GAME.round.stage) AU.start(GAME.round.stage); });
function gameLeave() { AU.stop(); }

/* 手法 → 命中演出：让画面做一次这个手法 */
function fxFor(slug) {
  if (/dutch/.test(slug)) return 'tilt';
  if (/whip/.test(slug)) return 'whip';
  if (/handheld|shake|earthquake/.test(slug)) return 'shake';
  if (/rack|diopter|tilt-shift|halation|fisheye/.test(slug)) return 'pull';
  if (/flare/.test(slug)) return 'flare';
  if (/noir|silhouette|low-key/.test(slug)) return 'noir';
  if (/slow/.test(slug)) return 'slow';
  if (/crane|rise|ascend/.test(slug)) return 'rise';
  if (/zoom|dolly-in|push|dolly/.test(slug)) return 'push';
  if (/pan|tilt|orbit|tracking/.test(slug)) return 'pan';
  return 'pop';
}
function replay(el, cls) { if (el.classList.contains('g-clap')) el.classList.remove('yes', 'no'); el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

function chapterMastery(ci) {
  const sl = quizPool(String(ci)), m = sl.filter(gMastered).length;
  return { m, n: sl.length, lit: sl.length > 0 && m / sl.length >= 0.8 };
}

function viewGame() {
  const wrap = h('div', { class: 'game' });
  main.appendChild(h('section', { class: 'page-head' },
    h('p', { class: 'eyebrow' }, 'COMBO · 看片连击'),
    h('h1', null, '看片连击'),
    h('p', { class: 'lead' }, '看片例，认手法。答对越多，片场越热闹：胶片边、颗粒、镜头光、首映灯光和配乐一层层叠上来。答错只提示，不扣分、不结束，也不会收回已经点亮的东西。')));
  main.appendChild(wrap);
  if (GAME.round) gameShell(wrap); else gameStart(wrap);
}

function toggleBtn(label, on, fn) {
  const b = h('button', { type: 'button', class: 'g-tog' + (on ? ' on' : ''), 'aria-pressed': String(on), onclick: () => {
    const v = fn();
    b.classList.toggle('on', v); b.setAttribute('aria-pressed', String(v));
  } }, label);
  return b;
}
function gameToggles() {
  return h('div', { class: 'g-togs' },
    toggleBtn('声音', FX.sound, () => {
      FX.sound = !FX.sound; store.set('g-sound', FX.sound);
      if (!FX.sound) AU.stop(); else if (GAME.round && GAME.round.stage) AU.start(GAME.round.stage);
      return FX.sound;
    }),
    toggleBtn('动效', FX.motion, () => {
      FX.motion = !FX.motion; store.set('g-motion', FX.motion);
      const st = main.querySelector('.g-stage'); if (st) st.classList.toggle('calm', !FX.motion);
      return FX.motion;
    }));
}

function gameStart(wrap) {
  wrap.textContent = '';
  const wl = wrongList();
  const sel = h('select', { class: 'input', 'aria-label': '出题范围' },
    h('option', { value: 'all' }, '全部 12 章（' + quizPool('all').length + ' 个片例）'),
    CH.map((c, ci) => h('option', { value: String(ci) }, '第 ' + (ci + 1) + ' 章 · ' + c.n + '（' + quizPool(String(ci)).length + '）')));
  if (wl.length) sel.insertBefore(h('option', { value: 'wrong' }, '错题本（' + wl.length + ' 个）'), sel.firstChild.nextSibling);
  const begin = () => {
    AU.ensure();
    let pool = quizPool(sel.value).slice();
    shuffle(pool);
    if (sel.value !== 'wrong') pool.sort((a, b) => (gMastered(a) ? 1 : 0) - (gMastered(b) ? 1 : 0));   // 先出还没认熟的
    pool = pool.slice(0, Math.min(12, pool.length));
    GAME.round = { qs: pool, i: 0, correct: 0, first: 0, combo: 0, maxCombo: 0, heat: 0, stage: 0, cleared: 0, missed: [], misses: 0, dead: [], state: 'ask', opts: null };
    gameShell(wrap);
  };
  const lamps = h('div', { class: 'g-lamps' }, CH.map((c, ci) => {
    const ms = chapterMastery(ci);
    return h('div', { class: 'g-lamp' + (ms.lit ? ' lit' : ''), title: ms.m + ' / ' + ms.n + ' 个认熟' },
      h('i', { 'aria-hidden': 'true' }), h('b', null, pad(ci + 1)), h('span', null, c.n),
      h('small', null, ms.lit ? '已点亮' : ms.m + '/' + ms.n));
  }));
  wrap.appendChild(h('div', { class: 'quiz-start card' },
    h('label', { class: 'field' }, h('span', null, '出题范围（每轮 12 题，优先出还没认熟的）'), sel),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', type: 'button', onclick: begin }, '开机', icon('right')),
      gameToggles()),
    h('p', { class: 'muted' }, GS.played ? '已玩 ' + GS.played + ' 轮 · 最高热度 ' + GS.best + ' · 最长连击 ' + GS.combo : '一轮 12 题，数字键 1–4 作答。声音默认开，可随时关。')));
  wrap.appendChild(h('section', { class: 'section g-lamps-sec' },
    h('div', { class: 'section-head' }, h('div', null, h('h2', null, '片场灯'), h('p', null, '一章里 80% 的片例首答就认对过，这盏灯就亮了，不会再熄。'))),
    lamps));
}

function gameShell(wrap) {
  const R = GAME.round;
  wrap.textContent = '';
  R.mascot = h('div', { class: 'g-clap', 'aria-hidden': 'true' },
    h('div', { class: 'clap-top' }),
    h('div', { class: 'clap-body' }, h('i', { class: 'eye' }), h('i', { class: 'eye' }), h('b', { class: 'mouth' })));
  R.el = {
    hud: h('div', { class: 'g-hud' }),
    body: h('div', { class: 'g-body' }),
    fx: h('div', { class: 'g-fx', 'aria-hidden': 'true' }),
    banner: h('div', { class: 'g-banner', role: 'status', 'aria-live': 'polite' })
  };
  R.el.stage = h('div', { class: 'g-stage' + (FX.motion ? '' : ' calm'), 'data-stage': R.stage },
    h('div', { class: 'g-bar top', 'aria-hidden': 'true' }), h('div', { class: 'g-bar bot', 'aria-hidden': 'true' }),
    h('div', { class: 'g-grain', 'aria-hidden': 'true' }), h('div', { class: 'g-flare', 'aria-hidden': 'true' }),
    h('div', { class: 'g-beam l', 'aria-hidden': 'true' }), h('div', { class: 'g-beam r', 'aria-hidden': 'true' }),
    R.el.hud, R.el.body, R.el.fx, R.el.banner);
  wrap.appendChild(R.el.stage);
  R.stage = Math.min(R.stage, 4);
  AU.start(R.stage);
  gameHud(); gameQuestion();
}

function gameHud() {
  const R = GAME.round;
  R.el.hud.textContent = '';
  R.el.hud.appendChild(R.mascot);
  R.el.hud.appendChild(h('div', { class: 'g-stats' },
    h('span', { class: 'g-act' }, '第 ' + Math.min(R.i + 1, R.qs.length) + ' / ' + R.qs.length + ' 镜'),
    progressBar(R.correct, R.qs.length, '本轮进度'),
    h('span', { class: 'g-stagename' }, STAGE_NAMES[R.stage])));
  R.el.hud.appendChild(h('div', { class: 'g-score' },
    h('b', { class: 'g-combo' + (R.combo >= 3 ? ' hot' : '') }, '×' + R.combo), h('small', null, '连击'),
    h('b', null, R.heat), h('small', null, '热度')));
  R.el.hud.appendChild(gameToggles());
  R.el.hud.appendChild(h('button', { type: 'button', class: 'btn ghost quiz-quit', onclick: () => { AU.stop(); GAME.round = null; gameStart(main.querySelector('.game')); } }, '结束'));
}

function gameQuestion() {
  const R = GAME.round, slug = R.qs[R.i], e = CT.lib[slug], r = IDXMAP[slug];
  R.state = 'ask'; R.misses = 0; R.dead = [];
  const others = IDX.filter(x => x[0] !== slug && x[2] !== r[2]);
  const same = shuffle(others.filter(x => x[3] === r[3] && CT.lib[x[0]]));
  const rest = shuffle(others.filter(x => CT.lib[x[0]] && x[3] !== r[3]));
  R.opts = shuffle([slug].concat(same.slice(0, 2).concat(rest).slice(0, 3).map(x => x[0])));
  const media = r[4]
    ? h('video', { class: 'g-vid', src: r[6], poster: r[5], muted: true, loop: true, autoplay: true, playsinline: true, controls: true, preload: 'auto' })
    : thumbImg(e.m[1], '片例静帧');
  media.classList.add('g-vid');
  if (media.tagName === 'VIDEO') media.muted = true;
  R.media = media;
  R.fb = h('div', { class: 'g-fbwrap' });
  const opts = h('div', { class: 'quiz-opts', role: 'group', 'aria-label': '选项' }, R.opts.map((s, k) => {
    const x = IDXMAP[s];
    return h('button', { type: 'button', class: 'quiz-opt g-opt', dataset: { slug: s }, onclick: () => gameAnswer(s) },
      h('kbd', null, k + 1), h('span', null, h('b', null, x[2]), h('small', { lang: 'en' }, x[1])));
  }));
  R.optsEl = opts;
  R.el.body.textContent = '';
  R.el.body.appendChild(h('div', { class: 'quiz-card g-card' },
    h('div', { class: 'quiz-media g-media' }, media),
    h('div', { class: 'quiz-side' }, h('h2', null, '这个镜头用的是哪种手法？'), opts, R.fb)));
}

function gameAnswer(s) {
  const R = GAME.round;
  if (!R || R.state !== 'ask' || R.dead.indexOf(s) >= 0) return;
  AU.ensure();
  const slug = R.qs[R.i], e = CT.lib[slug];
  const btn = R.optsEl.querySelector('[data-slug="' + s + '"]');
  if (s !== slug) {
    R.misses++; R.dead.push(s); R.combo = 0;
    if (R.misses === 1) { markWrong(slug); R.missed.push(slug); }
    btn.disabled = true; btn.classList.add('wrong');
    AU.miss(); replay(R.mascot, 'no'); replay(btn, 'g-nope');
    R.fb.textContent = '';
    R.fb.appendChild(h('div', { class: 'quiz-feedback no' },
      h('b', null, '再看一次'), h('span', { class: 'fb-note' }, '已收进错题本，不扣分'),
      h('p', null, R.misses === 1 ? '提示：它属于「' + catZh(IDXMAP[slug][3]) + '」。' : '提示：' + e.d[1])));
    gameHud();
    return;
  }
  // 答对
  R.state = 'done';
  const first = R.misses === 0;
  R.correct++;
  if (first) {
    R.combo++; R.maxCombo = Math.max(R.maxCombo, R.combo); R.first++;
    R.heat += 10 + 5 * Math.min(R.combo, 10);
    GS.master[slug] = (GS.master[slug] || 0) + 1;
    if (clearWrong(slug)) R.cleared++;
  } else R.heat += 5;
  R.optsEl.querySelectorAll('.g-opt').forEach(b => { b.disabled = true; b.classList.add(b.dataset.slug === slug ? 'right' : 'dim'); });
  const last = R.i + 1 >= R.qs.length;
  R.fb.textContent = '';
  R.fb.appendChild(h('div', { class: 'quiz-feedback ok' },
    h('b', null, first ? '漂亮！' + e.z : '认出来了：' + e.z), first && R.combo >= 3 ? h('span', { class: 'fb-note' }, R.combo + ' 连击') : null,
    h('p', null, e.d[1]),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', type: 'button', id: 'g-next', onclick: () => gameNext() }, last ? '看首映结果' : '下一镜', icon('right')),
      h('a', { class: 'btn', href: '#/game?e=' + slug, onclick: ev => { ev.preventDefault(); openEntry(slug); } }, '看详情与提示词'))));
  AU.hit(first ? R.combo : 1);
  replay(R.mascot, 'yes');
  if (FX.motion) { replay(R.media, 'fx-' + fxFor(slug)); burst(first ? 10 + R.stage * 6 : 6); }
  const ns = stageOf(R.correct, R.qs.length);
  if (ns > R.stage) stageUp(ns);
  gameHud();
  const nb = $('#g-next'); if (nb) nb.focus({ preventScroll: true });
}

function stageUp(ns) {
  const R = GAME.round;
  R.stage = ns;
  R.el.stage.setAttribute('data-stage', String(ns));
  AU.stageUp(); AU.start(ns); AU.stage = ns;
  R.el.banner.textContent = STAGE_NAMES[ns];
  replay(R.el.banner, 'show');
  if (FX.motion) { replay(R.el.stage, 'g-slam'); burst(26); }
}
function burst(n) {
  const fx = GAME.round.el.fx, cols = ['var(--accent)', '#fff', 'var(--ok)', '#ff7a8a', '#7fb7ff'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 230;
    const p = h('i', { class: 'g-p', style: '--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d - 60) + 'px;--r:' + Math.round(Math.random() * 540 - 270) + 'deg;--c:' + cols[i % cols.length] + ';--w:' + (6 + Math.round(Math.random() * 8)) + 'px' });
    p.addEventListener('animationend', () => p.remove());
    fx.appendChild(p);
  }
}

function gameNext() {
  const R = GAME.round;
  if (!R || R.state !== 'done') return;
  R.i++;
  if (R.i >= R.qs.length) gameEnd(); else { gameHud(); gameQuestion(); }
}

function gameEnd() {
  const R = GAME.round;
  AU.stop(); AU.fin();
  GS.played++; GS.best = Math.max(GS.best, R.heat); GS.combo = Math.max(GS.combo, R.maxCombo); gsave();
  const lit = CH.filter((_, ci) => chapterMastery(ci).lit).length;
  const rate = R.qs.length ? Math.round(R.first / R.qs.length * 100) : 0;
  R.el.hud.textContent = '';
  R.el.hud.appendChild(R.mascot); replay(R.mascot, 'yes');
  R.el.stage.setAttribute('data-stage', '4');
  R.el.stage.classList.add('fin');
  if (FX.motion) burst(40);
  R.el.body.textContent = '';
  R.el.body.appendChild(h('div', { class: 'g-end' },
    h('p', { class: 'eyebrow' }, 'FIN · 本轮首映'),
    h('p', { class: 'quiz-score' }, R.heat),
    h('p', { class: 'g-endsub' }, '热度 · 最长 ' + R.maxCombo + ' 连击 · 首答即对 ' + R.first + ' / ' + R.qs.length + '（' + rate + '%）'),
    R.cleared ? h('p', { class: 'muted' }, '从错题本移出 ' + R.cleared + ' 个。') : null,
    h('p', { class: 'muted' }, '片场灯已点亮 ' + lit + ' / ' + CH.length + ' 盏。' + (R.heat > 0 && R.heat >= GS.best ? '这是你的最高热度。' : '')),
    R.missed.length ? h('div', null, h('p', null, R.missed.length + ' 个先答错过，已收进错题本，点开看一眼：'), h('div', { class: 'tile-grid' }, R.missed.map(s => tile(s, { list: R.missed, def: true })))) : h('p', null, '全部首答即对，满分首映。'),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => { GAME.round = null; gameStart(main.querySelector('.game')); } }, '再来一轮'),
      h('a', { class: 'btn', href: '#/quiz' }, '去看片测验'))));
  GAME.round = null;
}

document.addEventListener('keydown', ev => {
  const R = GAME.round;
  if (curPath !== '/game' || !R || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (!modal.hidden || !pal.hidden || typing(ev.target)) return;
  if (/^[1-4]$/.test(ev.key)) {
    const b = R.optsEl && R.optsEl.querySelectorAll('.g-opt')[+ev.key - 1];
    if (b && !b.disabled) b.click();
  } else if ((ev.key === 'Enter' || ev.key === 'ArrowRight') && R.state === 'done' && ev.target.tagName !== 'BUTTON' && ev.target.tagName !== 'A') {
    ev.preventDefault(); gameNext();
  }
});
