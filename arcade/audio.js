const ARC = { sound: true };
const AU = {
  ctx: null, out: null, nbuf: null, timer: 0, nextT: 0, step: 0, stage: 0,
  CH: [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]],
  ensure() {
    if (!ARC.sound) return false;
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
  },
  pick() { if (!this.ensure()) return; const t = this.ctx.currentTime; this.tone(880, t, 0.07, 'square', 0.07); },
  clap() { if (!this.ensure()) return; const t = this.ctx.currentTime; this.noise(t, 0.05, 0.6, 1200); this.noise(t + 0.09, 0.07, 0.8, 900); this.tone(160, t + 0.09, 0.08, 'square', 0.1); },
  blip(hi) { if (!this.ensure()) return; const t = this.ctx.currentTime; this.tone(hi ? 1175 : 587, t, hi ? 0.35 : 0.12, 'square', 0.1); },
  star(k) { if (!this.ensure()) return; const t = this.ctx.currentTime; this.tone(523.25 * Math.pow(2, [0, 4, 7][k] / 12) * 1.5, t, 0.5, 'triangle', 0.22); this.tone(1046.5 * Math.pow(2, [0, 4, 7][k] / 12), t, 0.3, 'sine', 0.08); },
  tick() { if (!this.ensure()) return; this.tone(1500, this.ctx.currentTime, 0.03, 'square', 0.04); }
};
