'use strict';
// ---------------------------------------------------------------------------
// Oyun döngüsü: maç/raunt akışı, kamera, sinematikler, alan yönetimi ve
// tüm katmanların çizim sırası.
// ---------------------------------------------------------------------------

const Game = {
  canvas: null,
  ctx: null,
  dpr: 1,
  VW: 1280,
  VH: 720,
  scale: 1,
  ox: 0,
  oy: 0,
  arena: { left: 140, right: 2660, width: 2800, ground: 620 },
  fighters: [],
  entities: [],
  scars: [],
  cam: { x: 1400, y: 390, zoom: 1 },
  hitstop: 0,
  timeScale: 1,
  slowT: 0,
  cinematic: null,
  domain: null,
  dt: 0,
  time: 0,
  last: 0,
  mode: 'menu',
  phase: 'idle',
  phaseT: 0,
  paused: false,
  training: false,
  cdMul: 1,
  inputLocked: true,
  round: 1,
  wins: [0, 0],
  timer: 99,
  difficulty: 1,
  player: null,
  cpu: null,
  playerCtrl: new PlayerController(),
  playerKind: 'gojo',
  cpuKind: 'sukuna',
  prevUlt: null,
  hintT: 0,
  onMatchEnd: null,
  koLoser: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    FX.ground = this.arena.ground;
    Stage.build(this.arena);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupMenuScene();
    requestAnimationFrame((t) => this.loop(t));
  },

  resize() {
    const c = this.canvas;
    const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(w * this.dpr);
    c.height = Math.round(h * this.dpr);
    this.VH = 720;
    this.VW = clamp((720 * w) / Math.max(1, h), 960, 1720);
    this.scale = Math.min(w / this.VW, h / this.VH);
    this.ox = (w - this.VW * this.scale) / 2;
    this.oy = (h - this.VH * this.scale) / 2;
    Stage.vig = null;
  },

  makeFighter(kind, o) {
    return kind === 'gojo' ? new Gojo(this, o) : new Sukuna(this, o);
  },

  setupMenuScene() {
    this.mode = 'menu';
    this.phase = 'idle';
    FX.reset();
    this.entities = [];
    this.scars = [];
    this.domain = null;
    this.cinematic = null;
    this.hitstop = 0;
    this.timeScale = 1;
    this.training = false;
    const c1 = new AIController(this, 1), c2 = new AIController(this, 1);
    c1.passive = c2.passive = true;
    const g = this.makeFighter('gojo', { x: 1250, facing: 1, ctrl: c1, team: 1, side: -1 });
    const s = this.makeFighter('sukuna', { x: 1550, facing: -1, ctrl: c2, team: 2, side: 1 });
    c1.me = g;
    c2.me = s;
    this.fighters = [g, s];
    this.player = this.cpu = null;
    this.inputLocked = true;
  },

  startMatch(o) {
    this.mode = 'fight';
    this.training = !!o.training;
    this.difficulty = o.difficulty ?? 1;
    this.cdMul = this.training ? 0.35 : 1;
    this.playerKind = o.player;
    this.cpuKind = o.player === 'gojo' ? 'sukuna' : 'gojo';
    this.wins = [0, 0];
    this.round = 1;
    this.prevUlt = null;
    this.hintT = 0;
    this.paused = false;
    this.startRound();
    Snd.startMusic(1);
  },

  startRound() {
    FX.reset();
    this.entities = [];
    this.scars = [];
    this.domain = null;
    this.cinematic = null;
    this.hitstop = 0;
    this.timeScale = 1;
    this.slowT = 0;
    this.koLoser = null;
    this.playerCtrl.clear();
    const ai = new AIController(this, this.difficulty);
    ai.passive = this.training;
    const p = this.makeFighter(this.playerKind, { x: 1400 - 280, facing: 1, ctrl: this.playerCtrl, team: 1, side: -1, isPlayer: true });
    const c = this.makeFighter(this.cpuKind, { x: 1400 + 280, facing: -1, ctrl: ai, team: 2, side: 1 });
    ai.me = c;
    if (this.prevUlt) {
      p.ult = this.prevUlt[0];
      c.ult = this.prevUlt[1];
    }
    if (this.training) p.ult = 100;
    this.fighters = [p, c];
    this.player = p;
    this.cpu = c;
    this.timer = 99;
    this.phase = 'intro';
    this.phaseT = 0;
    this.inputLocked = true;
    this.saidFight = false;
    this.cam.x = 1400;
    this.cam.zoom = 0.85;
    const kanji = this.training ? '修行' : ['一', '二', '三', '四', '五', '六'][Math.min(5, this.round - 1)] + '回戦';
    FX.callout(kanji, this.training ? 'ANTRENMAN' : `${this.round}. RAUND`, { color: '#d7192f', style: 'domain', size: 110, dur: 1.5 });
    Snd.sfx.gong();
  },

  backToMenu() {
    Snd.stopMusic();
    this.paused = false;
    this.setupMenuScene();
  },

  setDomain(d) {
    const old = this.domain;
    if (old && old !== d && old.kind === 'shrine' && !old.done) {
      old.done = true;
      old.owner.onDomainEnd();
    }
    this.domain = d;
  },

  startCinematic(owner, o = {}) {
    this.cinematic = { owner, zoom: o.zoom || 1.35 };
    FX.letterboxTarget = 1;
  },
  endCinematic(owner) {
    if (this.cinematic && this.cinematic.owner === owner) {
      this.cinematic = null;
      FX.letterboxTarget = 0;
    }
  },

  addEntity(e) {
    this.entities.push(e);
    return e;
  },

  addScar(o) {
    o.max = o.life;
    if (o.type === 'crater') {
      o.cracks = [];
      for (let i = 0; i < 9; i++) {
        const a = rand(0, TAU);
        o.cracks.push(boltPoints(0, 0, Math.cos(a) * o.r * rand(0.8, 1.5), Math.sin(a) * o.r * 0.25 * rand(0.8, 1.5), 5, 8));
      }
    }
    this.scars.push(o);
    if (this.scars.length > 70) this.scars.shift();
  },

  onKO(f) {
    if (this.mode !== 'fight' || this.phase !== 'fight') return;
    this.phase = 'ko';
    this.phaseT = 0;
    this.koLoser = f;
    this.inputLocked = true;
    this.timeScale = 0.3;
    this.slowT = 1.4;
    FX.callout('決着', 'K.O.', { color: '#d7192f', style: 'domain', size: 150, dur: 2.4 });
    FX.flash('#ffffff', 0.6);
    FX.shake(20);
    Snd.sfx.ko();
  },

  timeOver() {
    const [p, c] = this.fighters;
    FX.callout('時間切れ', 'SÜRE DOLDU', { color: '#d7192f', style: 'domain', size: 110, dur: 2.2 });
    this.inputLocked = true;
    this.phase = 'ko';
    this.phaseT = 0;
    const pr = p.hp / p.maxHp, cr = c.hp / c.maxHp;
    this.koLoser = pr === cr ? null : pr < cr ? p : c;
  },

  endRound() {
    const loser = this.koLoser;
    if (!loser) {
      this.round++;
      this.startRound();
      return;
    }
    const winner = this.fighters.find((f) => f !== loser);
    const wi = winner === this.player ? 0 : 1;
    this.wins[wi]++;
    this.prevUlt = [this.player.ult, this.cpu.ult];
    if (this.wins[wi] >= 2) {
      this.phase = 'matchEnd';
      this.phaseT = 0;
      winner.victory = true;
      FX.callout(winner === this.player ? '勝利' : '敗北', winner === this.player ? 'ZAFER' : 'YENİLGİ', { color: winner === this.player ? '#e8c45a' : '#7a7488', style: 'domain', size: 130, dur: 3 });
      Snd.stopMusic();
      Snd.sfx.gong();
      if (this.onMatchEnd) setTimeout(() => this.onMatchEnd(wi === 0, winner), 1600);
      return;
    }
    this.round++;
    this.startRound();
  },

  updatePhase(dt) {
    if (this.mode !== 'fight') return;
    this.phaseT += dt;
    if (this.phase === 'fight' || this.phase === 'intro') this.hintT += dt;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT > 1.4 && !this.saidFight) {
          this.saidFight = true;
          FX.callout('開始', 'DÖVÜŞ!', { color: '#d7192f', style: 'domain', size: 120, dur: 1.0 });
          Snd.sfx.heavy();
        }
        if (this.phaseT > 1.8) {
          this.phase = 'fight';
          this.inputLocked = false;
        }
        break;
      case 'fight':
        if (!this.training && !this.cinematic) {
          this.timer -= dt;
          if (this.timer <= 0) {
            this.timer = 0;
            this.timeOver();
          }
        }
        if (this.training) {
          const c = this.cpu;
          if (c && c.state !== 'ko' && c.comboT <= 0 && this.player.comboT <= 0) c.hp = Math.min(c.maxHp, c.hp + dt * 260);
        }
        break;
      case 'ko':
        if (this.phaseT > 2.4) this.endRound();
        break;
    }
  },

  pushApart() {
    const [a, b] = this.fighters;
    if (!a || !b) return;
    const solid = (f) => !['held', 'down', 'ko', 'launched', 'getup', 'paralyzed'].includes(f.state) && !f.holding && !(f.runMode > 0);
    if (!solid(a) || !solid(b)) return;
    if (Math.abs(a.y - b.y) > 140) return;
    const dx = b.x - a.x, min = 54;
    if (Math.abs(dx) >= min) return;
    const s = dx === 0 ? a.facing : sign(dx);
    const push = (min - Math.abs(dx)) / 2;
    const A = this.arena;
    a.x = clamp(a.x - push * s, A.left, A.right);
    b.x = clamp(b.x + push * s, A.left, A.right);
  },

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const rdt = Math.min(0.05, Math.max(0, (now - (this.last || now)) / 1000));
    this.last = now;
    if (!this.paused) this.step(rdt);
    this.render(rdt);
  },

  step(rdt) {
    this.time += rdt;
    Stage.t += rdt;
    if (this.mode === 'fight') this.playerCtrl.poll(this);
    let dt;
    if (this.hitstop > 0) {
      this.hitstop -= rdt;
      dt = 0;
    } else dt = rdt * this.timeScale;
    if (this.slowT > 0) {
      this.slowT -= rdt;
      if (this.slowT <= 0) this.timeScale = 1;
    }
    this.dt = dt;
    for (const f of this.fighters) if (f.ctrl instanceof AIController) f.ctrl.poll(this, dt);
    if (dt > 0) {
      const cin = this.cinematic;
      for (const f of this.fighters) if (!cin || f === cin.owner) f.update(dt);
      for (const e of this.entities) if (!cin || e.owner === cin.owner || e.alwaysUpdate) e.update(dt, this);
      this.entities = this.entities.filter((e) => !e.dead);
      if (this.domain) this.domain.update(dt, this);
      for (const s of this.scars) s.life -= dt;
      this.scars = this.scars.filter((s) => s.life > 0);
      this.pushApart();
      this.updatePhase(dt);
    } else {
      for (const e of this.entities) if (e.alwaysUpdate) e.update(0, this);
    }
    FX.update(dt, rdt);
    this.updateCamera(rdt);
  },

  updateCamera(rdt) {
    const VW = this.VW, VH = this.VH, A = this.arena;
    const cin = this.cinematic;
    let tx, tz;
    if (cin) {
      tx = cin.owner.x + cin.owner.facing * 50;
      tz = cin.zoom;
    } else if (this.mode === 'menu') {
      tx = 1400 + Math.sin(this.time * 0.12) * 160;
      tz = 1.02;
    } else {
      let minX = Infinity, maxX = -Infinity;
      for (const f of this.fighters) {
        minX = Math.min(minX, f.x);
        maxX = Math.max(maxX, f.x);
      }
      tx = (minX + maxX) / 2;
      tz = clamp((VW * 0.6) / (maxX - minX + 400), 0.6, 1.1);
    }
    this.cam.zoom = damp(this.cam.zoom, tz, cin ? 5 : 3, rdt);
    const z = this.cam.zoom;
    const half = VW / 2 / z;
    const minCx = A.left - 260 + half, maxCx = A.right + 260 - half;
    tx = minCx > maxCx ? (A.left + A.right) / 2 : clamp(tx, minCx, maxCx);
    const groundY = VH * (cin ? 0.8 : 0.83);
    let ty = A.ground - (groundY - VH / 2) / z;
    let top = Infinity;
    for (const f of this.fighters) top = Math.min(top, f.y - 250);
    const viewTop = ty - VH / 2 / z + 20;
    if (top < viewTop) ty -= viewTop - top;
    const k = cin ? 6 : 4.5;
    this.cam.x = damp(this.cam.x, tx, k, rdt);
    this.cam.y = damp(this.cam.y, ty, k, rdt);
  },

  worldToScreen(x, y) {
    return { x: (x - this.cam.x) * this.cam.zoom + this.VW / 2 + FX.shakeX, y: (y - this.cam.y) * this.cam.zoom + this.VH / 2 + FX.shakeY };
  },
  toDevice(x, y) {
    const p = this.worldToScreen(x, y);
    return { x: (p.x * this.scale + this.ox) * this.dpr, y: (p.y * this.scale + this.oy) * this.dpr };
  },
  screenToWorld(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    const lx = (cx - r.left - this.ox) / this.scale, ly = (cy - r.top - this.oy) / this.scale;
    return { x: (lx - this.VW / 2) / this.cam.zoom + this.cam.x, y: (ly - this.VH / 2) / this.cam.zoom + this.cam.y };
  },

  drawScars(ctx) {
    for (const s of this.scars) {
      const a = Math.min(1, s.life / 1.5);
      ctx.save();
      ctx.globalAlpha = a;
      if (s.type === 'line') {
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#050307';
        ctx.lineWidth = s.w + 2;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
        ctx.strokeStyle = rgba('#ff3040', 0.6);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (s.type === 'crater') {
        ctx.translate(s.x, s.y + 30);
        ctx.fillStyle = 'rgba(5,3,8,0.75)';
        ctx.beginPath();
        ctx.ellipse(0, 0, s.r, s.r * 0.22, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2.5;
        for (const c of s.cracks) strokePts(ctx, c);
        ctx.strokeStyle = 'rgba(140,130,150,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -2, s.r * 0.9, s.r * 0.18, 0, Math.PI, TAU);
        ctx.stroke();
      } else if (s.type === 'burn') {
        ctx.translate(s.x, s.y + 40);
        ctx.scale(1, 0.2);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.r);
        g.addColorStop(0, 'rgba(10,4,2,0.9)');
        g.addColorStop(0.7, 'rgba(20,8,4,0.6)');
        g.addColorStop(1, 'rgba(20,8,4,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, s.r, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        Glow.draw(ctx, 0, 0, s.r * 0.7, '#ff4a10', 0.25 * a * (0.7 + 0.3 * Math.sin(this.time * 5)));
      } else if (s.type === 'trench') {
        const x1 = Math.min(s.x1, s.x2), x2 = Math.max(s.x1, s.x2);
        ctx.fillStyle = 'rgba(4,2,8,0.85)';
        ctx.fillRect(x1, s.y + 6, x2 - x1, s.w * 0.28);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba('#9a3cff', 0.3);
        ctx.fillRect(x1, s.y + 6, x2 - x1, 3);
        ctx.fillRect(x1, s.y + 6 + s.w * 0.28 - 3, x2 - x1, 3);
      }
      ctx.restore();
    }
  },

  render(rdt) {
    const ctx = this.ctx, c = this.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    const s = this.dpr * this.scale;
    ctx.setTransform(s, 0, 0, s, this.dpr * this.ox, this.dpr * this.oy);
    const VW = this.VW, VH = this.VH;
    const dom = this.domain;
    const showStage = !dom || !dom.hideStage;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VW, VH);
    ctx.clip();
    ctx.save();
    ctx.translate(FX.shakeX, FX.shakeY);
    if (showStage) {
      Stage.drawSky(ctx, this.cam, VW, VH, 0);
      Stage.drawLayers(ctx, this.cam, VW, VH);
    }
    if (dom) dom.drawBack(ctx, VW, VH);
    ctx.save();
    ctx.translate(VW / 2, VH / 2);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);
    if (showStage) Stage.drawGround(ctx, this.cam, VW, VH);
    if (dom) dom.drawWorldBack(ctx);
    this.drawScars(ctx);
    FX.drawParticles(ctx, true);
    for (const e of this.entities) if (e.layer === 'back') e.draw(ctx);
    for (const f of this.fighters) f.drawShadow(ctx);
    const order = [...this.fighters].sort((a, b) => (a.state === 'action' ? 1 : 0) - (b.state === 'action' ? 1 : 0));
    for (const f of order) f.draw(ctx);
    for (const e of this.entities) if (e.layer !== 'back') e.draw(ctx);
    FX.drawParticles(ctx, false);
    if (dom) dom.drawWorldFront(ctx);
    ctx.restore();
    if (dom) dom.drawScreen(ctx, VW, VH);
    if (showStage) Stage.drawAsh(ctx, VW, VH, this.paused ? 0 : rdt);
    ctx.restore();
    Stage.vignette(ctx, VW, VH);
    ctx.restore();
    FX.post(ctx, c, (x, y) => this.toDevice(x, y), this.cam.zoom * s);
    ctx.setTransform(s, 0, 0, s, this.dpr * this.ox, this.dpr * this.oy);
    FX.drawScreen(ctx, VW, VH, (x, y) => this.worldToScreen(x, y));
    if (this.mode === 'fight') HUD.draw(ctx, this, VW, VH);
  },
};
