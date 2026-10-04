'use strict';
// ---------------------------------------------------------------------------
// RYOMEN SUKUNA
// 1 Cleave (捌) · 2 Dismantle (解) · 3 Örümcek Ağı (蜘蛛の巣) · 4 Kara Şimşek (黒閃)
// R Ters Lanet Tekniği (iyileşme) · G Lanetlerin Kralı: dört kollu form
// Ulti: 1 Dünya Kesişi · 2 Çapraz Dünya Kesişi · 3 Kare Dünya Kesişi
//       4 Alan Açılımı: Fukuma Mizushi · alan bitince R = ■開 Fuga
// ---------------------------------------------------------------------------

const SUKUNA_PAL = {
  skin: '#f3d2bd', skinShade: '#d2a690', hair: '#f59ab3', hairShade: '#b9557a',
  sleeve: '#efede6', sleeveShade: '#b9b4a8', sleeveHi: '#ffffff',
  cloth: '#efede6', clothShade: '#c4beb2', pants: '#e0dcd2', pantsShade: '#aaa498', pantsHi: '#ffffff',
  shoe: '#2a1d18', shoeShade: '#1a120f', sash: '#17121a', mark: '#14090c', eye: '#ff2238', line: '#0b0708', scarf: '#16111a',
};
const SUKUNA_PAL_H = { ...SUKUNA_PAL, skin: '#ead0c4', skinShade: '#c49c8e', cloth: '#f4f2ec', sleeve: '#f4f2ec', hairShade: '#a8406a' };

const SUKUNA_LINES = [
  { ja: '身の程を知れ', ro: 'Mi no hodo wo shire', tr: 'Haddini bil.' },
  { ja: '誇れ。お前は強い', ro: 'Hokore. Omae wa tsuyoi', tr: 'Gurur duy... Sen güçlüsün.' },
  { ja: 'ケヒッ…脆いな', ro: 'Kehi... moroi na', tr: 'Kehe... Ne kadar da kırılgansın.' },
  { ja: '退屈させるな', ro: 'Taikutsu saseru na', tr: 'Beni sıkma.' },
];

const SUKUNA_HAIR = [[-14, 6, 10], [-34, 10, 11], [-54, 13, 11], [-76, 14, 11], [-98, 14, 11], [-122, 13, 12], [-146, 11, 12], [-170, 8, 12], [-192, 5, 12]];
const SUKUNA_HAIR_BACK = [[-60, 15, 13], [-100, 16, 13], [-140, 13, 13], [-178, 8, 13]];

class Sukuna extends Fighter {
  constructor(game, o) {
    super(game, o);
    this.name = 'RYOMEN SUKUNA';
    this.jpName = '両面宿儺';
    this.short = 'SUKUNA';
    this.color = '#ff2a3a';
    this.accent = '#e3243b';
    this.speed = 410;
    this.form = 'base';
    this.ultTime = 0;
    this.domainUsed = false;
    this.fugaReady = false;
    this.fugaTime = 0;
    this.healGlow = 0;
    this.bowT = 0;
    this.kindleT = 0;
    this.lineIdx = (Math.random() * SUKUNA_LINES.length) | 0;
    this.chanted = false;
    this.aiRange = 230;
    this.snapPose('sukunaIdle');
  }

  idlePose() { return this.victory || this.form === 'heian' ? 'armsCross' : 'sukunaIdle'; }
  inUlt() { return this.form === 'heian'; }
  palette() { return this.form === 'heian' ? SUKUNA_PAL_H : SUKUNA_PAL; }

  update(dt) {
    if (dt <= 0) return;
    super.update(dt);
    this.armGrow = approach(this.armGrow, this.form === 'heian' ? 1 : 0, dt * 2.4);
    if (this.form === 'heian' && this.state !== 'ko') {
      const dom = this.game.domain;
      if (!(dom && dom.owner === this) && !this.game.cinematic) this.ultTime -= dt;
      if (this.fugaReady) {
        this.fugaTime -= dt;
        if (this.fugaTime <= 0) this.fugaReady = false;
      }
      if (this.ultTime <= 0 && this.state !== 'action') this.endUlt();
      if (Math.random() < 0.6) {
        FX.add({ type: 'glow', x: this.x + rand(-45, 45), y: this.y - rand(10, 210), vy: -rand(60, 170), size: rand(12, 26), life: rand(0.35, 0.6), color: '#ff1030', add: true, back: true });
      }
      if (Math.random() < 0.25) FX.add({ type: 'smoke', x: this.x + rand(-40, 40), y: this.y - rand(0, 160), vy: -rand(40, 100), size: rand(8, 16), grow: 20, life: 0.8, color: '#120006', alpha: 0.5, back: true });
    }
  }

  endUlt() {
    if (this.form !== 'heian') return;
    this.form = 'base';
    this.fugaReady = false;
    this.ultTime = 0;
    FX.ring(this.x, this.y - 110, { r0: 30, r1: 180, color: '#ff3040', life: 0.4, w: 5 });
    FX.smoke(this.x, this.y - 100, 10, { color: '#1a0006', size: 30 });
  }

  onDomainEnd() {
    this.fugaReady = true;
    this.fugaTime = 9;
    this.ultTime = Math.max(this.ultTime, 9.5);
    FX.callout('■開', 'R · FUGA HAZIR', { color: '#ff6a1a', side: this.side, size: 54, dur: 1.6, style: 'small' });
  }

  getSkill(k) {
    if (this.form === 'heian') {
      switch (k) {
        case '1': return { name: 'Dünya Kesişi', cd: 4, fn: this.worldSlash };
        case '2': return { name: 'Çapraz Dünya Kesişi', cd: 5.5, fn: this.crossWorldSlash };
        case '3': return { name: 'Kare Dünya Kesişi', cd: 7.5, fn: this.squareWorldSlash };
        case '4': return { name: 'Alan Açılımı', cd: 0, armor: true, fn: this.domainExpansion, ready: () => !this.domainUsed && !this.game.domain };
        case 'R':
          if (this.fugaReady) return { name: 'Fuga', ignoreCd: true, noAutoCd: true, armor: true, fn: this.fuga, ready: () => this.fugaReady };
          return { name: 'İyileşme', cd: 16, fn: this.heal };
        default: return null;
      }
    }
    switch (k) {
      case '1': return { name: 'Cleave', cd: 6, fn: this.cleave };
      case '2': return { name: 'Dismantle', cd: 6.5, fn: this.dismantle };
      case '3': return { name: 'Örümcek Ağı', cd: 9, fn: this.spiderweb };
      case '4': return { name: 'Kara Şimşek', cd: 9, fn: this.blackFlash };
      case 'R': return { name: 'İyileşme', cd: 16, fn: this.heal };
      case 'G': return { name: 'Lanetlerin Kralı', cd: 0, armor: true, fn: this.transform, ready: () => this.ult >= 100, onUse: () => { this.ult = 0; } };
      default: return null;
    }
  }

  skillInfo() {
    const H = this.form === 'heian';
    const rows = H
      ? [
          ['1', '界', 'DÜNYA KESİŞİ'],
          ['2', '斬', 'ÇAPRAZ KESİŞ'],
          ['3', '匣', 'KARE KESİŞ'],
          ['4', '域', this.domainUsed ? 'KULLANILDI' : 'ALAN AÇILIMI'],
          ['R', this.fugaReady ? '開' : '治', this.fugaReady ? 'FUGA' : 'İYİLEŞME'],
          ['G', '王', `FORM ${Math.max(0, Math.ceil(this.ultTime))} SN`],
        ]
      : [
          ['1', '捌', 'CLEAVE'],
          ['2', '解', 'DISMANTLE'],
          ['3', '網', 'ÖRÜMCEK AĞI'],
          ['4', '黒', 'KARA ŞİMŞEK'],
          ['R', '治', 'İYİLEŞME'],
          ['G', '王', 'ULTİ'],
        ];
    return rows.map(([key, kanji, name]) => {
      const s = this.getSkill(key);
      let ready = !!s && (!s.ready || s.ready()) && (s.ignoreCd || this.cd[key] <= 0);
      let cd = s && !s.ignoreCd ? this.cd[key] : 0;
      let highlight = false;
      if (key === 'G') {
        if (H) { ready = false; cd = 0; highlight = false; }
        else highlight = this.ult >= 100;
      }
      if (H && key === 'R' && this.fugaReady) highlight = true;
      if (H && key === '4' && !this.domainUsed) highlight = !this.game.domain;
      return { key, kanji, name, ready, cd, cdMax: this.cdMax[key], highlight, active: H && key === 'G', ult: key === 'G' && !H ? this.ult / 100 : null };
    });
  }

  // ----------------------------------------------------------------- yetenekler
  *cleave() {
    const A = this.game.arena;
    const t0 = this.nearestEnemy();
    this.face(t0);
    this.lockFacing = true;
    this.setPose('slashWind', 24);
    Snd.sfx.whoosh();
    yield 0.17;
    this.setPose('slashWide', 45);
    Snd.sfx.bigSlash();
    const w = this.spawn(new CleaveWave(this, this.x + this.facing * 70, this.y - 120, this.facing));
    FX.callout('捌', 'CLEAVE · HACHI', { color: '#b0101e', side: this.side, size: 74, dur: 1.0, style: 'small' });
    yield { until: () => w.dead, max: 0.8 };
    const t = w.hitTarget;
    if (!t || (t.state !== 'hurt' && t.state !== 'launched')) {
      yield 0.18;
      return;
    }
    // hedefin üstüne ışınlan
    const ox = this.x;
    this.teleportFx(this.x, this.y, '#ff2a3a');
    Snd.sfx.teleport();
    const side = sign(ox - t.x);
    this.x = clamp(t.x + side * 86, A.left, A.right);
    this.y = t.y;
    this.vx = this.vy = 0;
    this.noGravity = true;
    this.face(t);
    this.teleportFx(this.x, this.y, '#ff2a3a');
    FX.speedLines(0.3, '#ffd6d6');
    if (!this.grab(t, Math.abs(t.x - this.x) || 86, 0, 'held')) return;
    yield 0.06;
    const line = SUKUNA_LINES[this.lineIdx++ % SUKUNA_LINES.length];
    Snd.say(line.ja, line.ro, { pitch: 0.3, rate: 0.9 });
    FX.say('SUKUNA', line.tr, '#ff4a5a', 2.6);
    for (let i = 0; i < 8; i++) {
      this.setPose(i % 2 ? 'slashA' : 'slashB', 55);
      t.setPose(i % 2 ? 'hurt' : 'hurt2', 50);
      const hx = t.x + rand(-22, 22), hy = t.y - rand(50, 185);
      FX.slashMark(hx, hy, rand(0, Math.PI), rand(90, 150), { color: '#ff2a3a', life: 0.22, w: 3 });
      FX.sparks(hx, hy, 4, { color: '#ff5060', speed: 420, size: 2 });
      t.takeHit({ attacker: this, dmg: 9, hitstop: 0.02, shake: 2, numColor: '#ff8090' });
      Snd.sfx.slash();
      yield 0.068;
      if (t.state === 'ko' || !this.holding) return;
    }
    this.setPose('slashWide', 45);
    this.release();
    t.takeHit({ attacker: this, dmg: 34, kbx: 650, kby: -520, launch: true, hitstop: 0.1, shake: 12, numColor: '#ff6070', dir: this.facing });
    FX.slashMark(t.x, t.y - 120, -0.45, 280, { w: 6, life: 0.3 });
    FX.sparks(t.x, t.y - 120, 16, { color: '#ff3a4a', speed: 800 });
    Snd.sfx.bigSlash();
    this.noGravity = false;
    yield 0.28;
  }

  *dismantle() {
    const t0 = this.nearestEnemy();
    this.face(t0);
    this.lockFacing = true;
    this.setPose('crouch', 30);
    yield 0.08;
    this.vy = -1520;
    this.onGround = false;
    this.vx = this.facing * 60;
    FX.dust(this.x, this.y, 10, { speed: 300 });
    FX.ring(this.x, this.y, { r0: 10, r1: 130, sy: 0.25, color: '#ff8090', life: 0.3 });
    Snd.sfx.jump();
    Snd.sfx.whoosh();
    this.setPose('jumpUp', 20);
    yield { until: () => this.vy > -240, max: 0.7 };
    this.noGravity = true;
    this.vy = 0;
    this.vx = 0;
    const t = this.nearestEnemy();
    this.face(t);
    this.setPose('dismantleWind', 30);
    yield 0.13;
    Snd.say('カイ', 'Kai!', { pitch: 0.35, rate: 1 });
    FX.callout('解', 'KAI', { color: '#b0101e', side: this.side, size: 104, dur: 1.15 });
    this.setPose('dismantleCast', 60);
    Snd.sfx.kai();
    const hp = this.handWorld('f');
    let la = 0.3;
    if (t) la = Math.atan2(t.y - 105 - hp.y, (t.x - hp.x) * this.facing);
    la = clamp(la, -0.45, 1.15);
    const ang = this.facing > 0 ? la : Math.PI - la;
    this.spawn(new DismantleLine(this, hp.x, hp.y, ang));
    FX.flash('#ffffff', 0.22);
    FX.shake(10);
    yield 0.34;
    this.noGravity = false;
    this.setPose('fall', 12);
    yield { until: () => this.onGround, max: 1.4 };
    this.setPose('crouch', 30);
    FX.dust(this.x, this.y, 8);
    yield 0.12;
  }

  *spiderweb() {
    const G = this.game.arena.ground;
    const t0 = this.nearestEnemy();
    this.face(t0);
    this.lockFacing = true;
    if (!this.onGround) yield { until: () => this.onGround, max: 1 };
    this.setPose('groundSlamWind', 22);
    yield 0.18;
    this.setPose('groundSlam', 55);
    yield 0.06;
    const cx = this.x + this.facing * 175;
    this.spawn(new SpiderWeb(this, cx, G));
    Snd.sfx.web();
    FX.shake(14);
    FX.debris(cx, G, 18, { speed: 800 });
    FX.dust(cx, G, 16, { speed: 320 });
    FX.callout('蜘蛛の巣', 'ÖRÜMCEK AĞI', { color: '#b0101e', side: this.side, size: 62, dur: 1.0, style: 'small' });
    const hits = [];
    for (const f of this.enemies()) {
      if (Math.abs(f.x - cx) < 255 && f.y > G - 95) {
        const r = f.takeHit({ attacker: this, dmg: 45, launch: true, kbx: 0, kby: -1650, hitstop: 0.08, shake: 8, numColor: '#ff6070', dir: this.facing });
        if (r === 'hit') hits.push(f);
      }
    }
    if (!hits.length) {
      yield 0.4;
      return;
    }
    const t = hits[0];
    yield 0.2;
    this.setPose('leap', 30);
    this.vy = -1780;
    this.onGround = false;
    this.keepVel = true;
    this.vx = (t.x - this.facing * 50 - this.x) / 0.36;
    Snd.sfx.whoosh();
    FX.dust(this.x, this.y, 8, { speed: 300 });
    yield { until: () => this.y <= t.y + 40 || this.vy > 0, max: 0.6 };
    this.keepVel = false;
    if (t.state !== 'launched') {
      this.vx = 0;
      yield { until: () => this.onGround, max: 1.2 };
      return;
    }
    this.vx = 0;
    this.vy = 0;
    this.noGravity = true;
    this.x = clamp(t.x - this.facing * 46, this.game.arena.left, this.game.arena.right);
    this.y = Math.min(t.y - 120, G - 160);
    this.face(t);
    if (!this.grab(t, 46, 140, 'heldHead')) return;
    this.setPose('grabHigh', 40);
    FX.glow(t.x, t.y - 180, 70, '#ff3040', 0.2);
    Snd.sfx.punch();
    FX.say('SUKUNA', 'Yerini bil, böcek.', '#ff4a5a', 1.6);
    yield 0.16;
    this.setPose('slamDown', 40);
    this.vy = 3000;
    FX.speedLines(0.35, '#ffd6d6');
    yield { until: () => this.y + 140 >= G - 2, max: 0.6 };
    this.vy = 0;
    this.noGravity = true;
    this.y = Math.min(this.y, G - 140);
    this.release();
    t.y = G;
    t.onGround = true;
    t.takeHit({ attacker: this, dmg: 95, kbx: 120, kby: -380, launch: true, otg: true, hitstop: 0.18, shake: 26, numColor: '#ff4050', dir: this.facing });
    FX.ring(t.x, G, { r0: 20, r1: 280, sy: 0.22, color: '#ff4a3a', life: 0.5, w: 8 });
    FX.debris(t.x, G, 26, { speed: 1000 });
    FX.dust(t.x, G, 20, { speed: 420 });
    FX.impact(0.08, 'invert');
    Snd.sfx.crush();
    this.game.addScar({ type: 'crater', x: t.x, y: G, r: 120, life: 6 });
    this.noGravity = false;
    yield { until: () => this.onGround, max: 1 };
    yield 0.15;
  }

  *blackFlash() {
    const t0 = this.nearestEnemy();
    this.face(t0);
    this.lockFacing = true;
    this.setPose('bfWind', 22);
    Snd.sfx.charge();
    for (let i = 0; i < 6; i++) {
      const h = this.handWorld('f');
      FX.glow(h.x, h.y, 30 + i * 4, '#ff1a2a', 0.1);
      FX.sparks(h.x, h.y, 3, { color: i % 2 ? '#ff2a3a' : '#ffffff', speed: 200, size: 2, life: 0.15 });
      yield 0.035;
    }
    this.setPose('dashPunch', 50);
    this.keepVel = true;
    this.vx = this.facing * 1500;
    this.trail = '#ff2a3a';
    Snd.sfx.dash();
    let hit = null, tt = 0;
    while (tt < 0.24 && !hit) {
      yield null;
      tt += this.game.dt;
      const box = { x: this.facing > 0 ? this.x : this.x - 80, y: this.y - 190, w: 80, h: 170 };
      for (const f of this.enemies()) if (rectHit(box, f.hurtbox())) { hit = f; break; }
    }
    this.keepVel = false;
    this.vx = this.facing * 100;
    this.trail = null;
    if (!hit) {
      yield 0.25;
      return;
    }
    const r = hit.takeHit({ attacker: this, dmg: 150, kbx: 1350, kby: -400, launch: true, hitstop: 0.26, shake: 28, numColor: '#ff2a3a' });
    if (r !== 'hit' && r !== 'ko') {
      yield 0.25;
      return;
    }
    const px = hit.x - this.facing * 22, py = hit.y - 120;
    this.spawn(new BlackFlashFx(px, py, this.facing));
    FX.impact(0.24, 'blackflash');
    FX.callout('黒閃', 'KOKUSEN · KARA ŞİMŞEK', { color: '#1a0306', side: this.side, size: 108, dur: 1.3 });
    Snd.sfx.blackFlash();
    Snd.say('黒閃', 'Kokusen', { pitch: 0.35 });
    FX.sparks(px, py, 30, { color: '#ff2a3a', speed: 1150, size: 3.5 });
    yield 0.42;
  }

  *heal() {
    this.setPose('heal', 18);
    this.healGlow = 1;
    Snd.sfx.heal();
    FX.callout('反転術式', 'TERS LANET TEKNİĞİ', { color: '#7a5060', side: this.side, size: 56, dur: 1.2, style: 'small' });
    try {
      for (let i = 0; i < 12; i++) {
        this.hp = Math.min(this.maxHp, this.hp + 15);
        for (let k = 0; k < 3; k++) FX.add({ type: 'glow', x: this.x + rand(-40, 40), y: this.y - rand(0, 200), vy: -rand(80, 200), size: rand(8, 16), life: 0.5, color: '#ffe0ea', add: true });
        yield 0.09;
      }
    } finally {
      this.healGlow = 0;
    }
  }

  *transform() {
    this.invuln = Math.max(this.invuln, 2.4);
    this.game.startCinematic(this, { zoom: 1.4 });
    this.setPose('powerUp', 10);
    Snd.sfx.transform();
    FX.say('SUKUNA', 'Gerçek formumu görme şerefine eriştin.', '#ff4a5a', 2.6);
    Snd.say('本来の姿を見せてやろう', 'Honrai no sugata wo misete yarou', { pitch: 0.3, rate: 0.9 });
    for (let i = 0; i < 20; i++) {
      FX.add({ type: 'glow', x: this.x + rand(-60, 60), y: this.y - rand(0, 220), vy: -rand(100, 300), size: rand(20, 40), life: 0.5, color: '#ff1030', add: true });
      FX.add({ type: 'smoke', x: this.x + rand(-60, 60), y: this.y - rand(0, 200), vy: -rand(40, 120), size: rand(14, 26), grow: 30, life: 0.8, color: '#140006', alpha: 0.6, back: true });
      if (i % 5 === 0) FX.shake(4);
      yield 0.04;
    }
    this.form = 'heian';
    this.ultTime = 20;
    this.domainUsed = false;
    this.fugaReady = false;
    this.chanted = false;
    Snd.sfx.roar();
    FX.callout('呪いの王', 'LANETLERİN KRALI', { color: '#ff2a3a', style: 'domain', size: 116, dur: 1.6 });
    FX.flash('#ff1020', 0.5);
    FX.shake(24);
    FX.impact(0.1, 'red');
    for (let i = 0; i < 3; i++) FX.ring(this.x, this.y - 110, { r0: 20, r1: 240 + i * 120, color: i ? '#ff3040' : '#ffffff', life: 0.5 + i * 0.15, w: 8 });
    FX.debris(this.x, this.game.arena.ground, 30, { speed: 1100 });
    for (const e of this.enemies()) {
      if (Math.abs(e.x - this.x) < 380) e.takeHit({ attacker: this, dmg: 30, kbx: 900, kby: -520, launch: true, unblockable: true, uncounterable: true });
    }
    yield 1.0;
    this.game.endCinematic(this);
    this.setPose('armsCross', 14);
    yield 0.2;
  }

  *worldSlash() {
    const t = this.nearestEnemy();
    this.face(t);
    this.lockFacing = true;
    this.setPose('incant', 22);
    FX.callout('龍鱗・反発・番いの流星', 'EJDER PULU · TEPKİ · EŞ METEORLAR', { color: '#5a0010', side: this.side, size: 40, dur: 1.0, style: 'small' });
    if (!this.chanted) {
      Snd.say('龍鱗、反発、番いの流星', 'Ryuurin, hanpatsu, tsugai no ryuusei', { pitch: 0.35, rate: 1.4 });
      this.chanted = true;
    }
    yield 0.4;
    this.setPose('worldCut', 50);
    const tx = t ? t.x : this.x + this.facing * 400;
    const ty = t ? t.cy : this.y - 110;
    this.spawn(new WorldCut(this, tx, ty, rand(-0.14, 0.14), 95));
    FX.callout('世界を断つ斬撃', 'DÜNYAYI KESEN KESİŞ', { color: '#ffffff', side: this.side, size: 58, dur: 1.2, yOff: 70 });
    Snd.sfx.bigSlash();
    yield 0.55;
  }

  *crossWorldSlash() {
    const t = this.nearestEnemy();
    this.face(t);
    this.lockFacing = true;
    this.setPose('worldCutX', 30);
    yield 0.24;
    const tx = t ? t.x : this.x + this.facing * 400;
    const ty = t ? t.cy : this.y - 110;
    this.spawn(new WorldCut(this, tx, ty, 0.72, 55));
    Snd.sfx.bigSlash();
    yield 0.14;
    this.setPose('worldCut', 55);
    this.spawn(new WorldCut(this, tx, ty, -0.72, 55));
    FX.callout('斬', 'ÇAPRAZ DÜNYA KESİŞİ', { color: '#5a0010', side: this.side, size: 96, dur: 1.1 });
    Snd.sfx.bigSlash();
    yield 0.5;
  }

  *squareWorldSlash() {
    const t = this.nearestEnemy();
    this.face(t);
    this.lockFacing = true;
    this.setPose('incant', 24);
    yield 0.28;
    this.setPose('worldCutX', 50);
    const tx = t ? t.x : this.x + this.facing * 400;
    const ty = t ? t.cy : this.y - 110;
    this.spawn(new SquareCut(this, tx, ty, 430));
    FX.callout('匣', 'KARE DÜNYA KESİŞİ', { color: '#5a0010', side: this.side, size: 100, dur: 1.2 });
    yield 0.35;
    this.setPose('worldCut', 40);
    yield 0.5;
  }

  *domainExpansion() {
    this.domainUsed = true;
    this.invuln = Math.max(this.invuln, 3.5);
    this.game.startCinematic(this, { zoom: 1.5 });
    this.setPose('mudraSukuna', 14);
    Snd.sfx.domain();
    Snd.say('領域展開', 'Ryouiki tenkai', { pitch: 0.3, rate: 0.8 });
    FX.callout('領域展開', 'RYŌIKI TENKAI · ALAN AÇILIMI', { color: '#ff2a3a', style: 'domain', size: 124, dur: 1.5 });
    for (let i = 0; i < 14; i++) {
      FX.add({ type: 'smoke', x: this.x + rand(-80, 80), y: this.y - rand(0, 100), vy: -rand(20, 80), size: rand(20, 40), grow: 40, life: 1.0, color: '#100004', alpha: 0.6, back: true });
      yield 0.1;
    }
    this.game.setDomain(new ShrineDomain(this));
    Snd.say('伏魔御廚子', 'Fukuma mizushi', { pitch: 0.3, rate: 0.8 });
    Snd.sfx.gong();
    FX.callout('伏魔御廚子', 'FUKUMA MIZUSHI · KÖTÜCÜL TAPINAK', { color: '#ff2a3a', style: 'domain', size: 132, dur: 2.0 });
    FX.flash('#ff0010', 0.5);
    FX.shake(20);
    yield 1.6;
    this.game.endCinematic(this);
    this.setPose('armsCross', 12);
    yield 0.1;
  }

  *fuga() {
    this.fugaReady = false;
    this.invuln = Math.max(this.invuln, 3);
    this.game.startCinematic(this, { zoom: 1.35 });
    const t = this.nearestEnemy();
    this.face(t);
    this.lockFacing = true;
    this.setPose('fugaKindle', 16);
    this.kindleT = 1;
    Snd.sfx.fireCharge();
    Snd.say('フーガ', 'Fuuga', { pitch: 0.3, rate: 0.8 });
    FX.callout('■開', 'FUGA · CEHENNEM ALEVİ', { color: '#ff6a1a', style: 'domain', size: 140, dur: 1.7 });
    for (let i = 0; i < 14; i++) {
      const h = this.handWorld('f');
      FX.embers(h.x, h.y, 4, { spread: 20, vy: -220 });
      yield 0.05;
    }
    this.setPose('fugaBow', 18);
    this.bowT = 1;
    Snd.sfx.fireCharge();
    for (let i = 0; i < 12; i++) {
      const h = this.handWorld('f');
      FX.embers(h.x, h.y, 3, { spread: 60, vy: -120 });
      yield 0.05;
    }
    this.game.endCinematic(this);
    const hp = this.handWorld('f');
    let la = 0;
    if (t) la = clamp(Math.atan2(t.cy - hp.y, (t.x - hp.x) * this.facing), -0.35, 0.35);
    this.spawn(new FugaArrow(this, hp.x + this.facing * 30, hp.y, this.facing > 0 ? la : Math.PI - la));
    Snd.sfx.whoosh();
    FX.flash('#ff8a2a', 0.3);
    FX.shake(10);
    this.bowT = 0;
    this.kindleT = 0;
    this.setPose('slashWide', 30);
    yield 0.7;
    this.ultTime = Math.min(this.ultTime, 1.0);
  }

  // ---------------------------------------------------------------------- yapay zekâ
  aiThink(ai, t, dist) {
    const r = Math.random;
    const ready = (k) => {
      const s = this.getSkill(k);
      return !!s && (!s.ready || s.ready()) && (s.ignoreCd || this.cd[k] <= 0);
    };
    if (this.form !== 'heian' && this.ult >= 100 && r() < 0.5) return ai.press('G');
    if (this.form === 'heian') {
      if (this.fugaReady && r() < 0.6) return ai.press('R');
      if (ready('4') && (this.ultTime < 15 || r() < 0.2)) return ai.press('4');
      const opts = ['1', '2', '3'].filter(ready);
      if (opts.length && r() < 0.55) return ai.press(pick(opts));
      return false;
    }
    if (this.hp < this.maxHp * 0.5 && ready('R') && dist > 300 && r() < 0.5) return ai.press('R');
    if (dist < 150 && ready('4') && r() < 0.35) return ai.press('4');
    if (dist > 110 && dist < 330 && ready('3') && r() < 0.3) return ai.press('3');
    if (dist > 200 && ready('1') && r() < 0.35) return ai.press('1');
    if (dist > 240 && ready('2') && r() < 0.3) return ai.press('2');
    return false;
  }

  // ---------------------------------------------------------------------- çizim
  drawArm(ctx, A, pal, back, ghost, extra) {
    const col = back ? pal.sleeveShade : pal.sleeve;
    // geniş kimono yeni
    const m = { x: (A.e.x + A.h.x) / 2, y: (A.e.y + A.h.y) / 2 };
    if (!ghost && !extra) {
      ctx.fillStyle = col;
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(A.e.x - 2, A.e.y);
      ctx.lineTo(m.x + 3, m.y);
      ctx.lineTo(m.x + 1, m.y + 18);
      ctx.quadraticCurveTo(A.e.x - 4, A.e.y + 26, A.e.x - 8, A.e.y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (extra) {
      // fazladan kollar çıplak, dövmeli
      this.limb(ctx, [A.s, A.e, A.h], 11, back ? pal.skinShade : pal.skin, pal.line, null);
    } else this.limb(ctx, [A.s, A.e, A.h], 13, col, pal.line, ghost || back ? null : pal.sleeveHi);
    if (!ghost) {
      // bilek dövmeleri
      ctx.strokeStyle = pal.mark;
      ctx.lineWidth = 2;
      const dx = A.h.x - A.e.x, dy = A.h.y - A.e.y, L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      for (const k of extra ? [0.3, 0.55, 0.78] : [0.78]) {
        const px = A.e.x + dx * k, py = A.e.y + dy * k;
        ctx.beginPath();
        ctx.moveTo(px - nx * 5, py - ny * 5);
        ctx.lineTo(px + nx * 5, py + ny * 5);
        ctx.stroke();
      }
    }
    this.drawHand(ctx, A, pal, back);
  }

  drawLeg(ctx, Lg, pal, back, ghost) {
    const col = back ? pal.pantsShade : pal.pants;
    this.limb(ctx, [Lg.s, Lg.e, Lg.h], 19, col, pal.line, ghost || back ? null : pal.pantsHi);
    const fa = Lg.a2 + Math.PI / 2;
    const tip = { x: Lg.h.x + Math.sin(fa) * 14, y: Lg.h.y + Math.cos(fa) * 14 };
    this.limb(ctx, [{ x: Lg.h.x - Math.sin(fa) * 2, y: Lg.h.y - Math.cos(fa) * 2 }, tip], 8, back ? pal.shoeShade : pal.shoe, pal.line, null);
  }

  drawTorso(ctx, sk, pal, ghost) {
    const t = sk.t;
    const n = { x: Math.cos(t), y: Math.sin(t) };
    const u = { x: Math.sin(t), y: -Math.cos(t) };
    const N = sk.neck;
    const P = (bx, by, du, dn) => ({ x: bx + u.x * du + n.x * dn, y: by + u.y * du + n.y * dn });
    const pts = [
      P(0, 0, -30, -23), P(0, 0, -30, 23), P(0, 0, 0, 16), P(N.x, N.y, -14, 17), P(N.x, N.y, -2, 11), P(N.x, N.y, -2, -12), P(N.x, N.y, -16, -18), P(0, 0, 0, -16),
    ];
    ctx.fillStyle = pal.cloth;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (ghost) return;
    // kıvrım gölgeleri
    ctx.fillStyle = pal.clothShade;
    ctx.beginPath();
    [P(0, 0, -30, -23), P(0, 0, -30, -6), P(0, 0, 0, -4), P(N.x, N.y, -16, -6), P(N.x, N.y, -16, -18), P(0, 0, 0, -16)].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1.5;
    for (const d of [-10, 4]) {
      const a = P(0, 0, -28, d), b = P(0, 0, -6, d + 3);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // V yaka: göğüs ve dövme
    const v1 = P(N.x, N.y, -3, 10), v2 = P(N.x, N.y, -3, -4), v3 = P(N.x, N.y, -26, 8);
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.moveTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.lineTo(v3.x, v3.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.mark;
    ctx.lineWidth = 2;
    const m1 = P(N.x, N.y, -12, 2), m2 = P(N.x, N.y, -12, 8);
    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.lineTo(m2.x, m2.y);
    ctx.stroke();
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(v2.x, v2.y);
    ctx.lineTo(v3.x, v3.y);
    ctx.lineTo(P(0, 0, 4, 14).x, P(0, 0, 4, 14).y);
    ctx.stroke();
    // obi kuşak
    const o = [P(0, 0, 2, -17), P(0, 0, 2, 17), P(0, 0, 14, 18), P(0, 0, 14, -18)];
    ctx.fillStyle = pal.sash;
    ctx.beginPath();
    o.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,60,80,0.5)';
    ctx.lineWidth = 1.5;
    const s1 = P(0, 0, 8, -17), s2 = P(0, 0, 8, 17);
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();
    // karın ağzı (gerçek formda)
    if (this.armGrow > 0.6) {
      const c = P(0, 0, 28, 12);
      ctx.fillStyle = '#2a0408';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 4, 9, t, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#f4ece0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) {
        const p = P(0, 0, 28 + i * 2.5, 12);
        ctx.moveTo(p.x - 2, p.y);
        ctx.lineTo(p.x + 2, p.y);
      }
      ctx.stroke();
    }
    // atkı
    ctx.fillStyle = pal.scarf;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(N.x, N.y + 2, 12, 7, t, 0, TAU);
    ctx.fill();
    ctx.stroke();
    const wv = Math.sin(this.idleT * 6) * 4;
    const tail1 = P(N.x, N.y, -4, -12), tail2 = P(N.x, N.y, -10 + wv, -34), tail3 = P(N.x, N.y, -22 - wv, -30);
    ctx.beginPath();
    ctx.moveTo(tail1.x, tail1.y);
    ctx.quadraticCurveTo(tail2.x, tail2.y, tail3.x, tail3.y);
    ctx.lineTo(P(N.x, N.y, -10, -16).x, P(N.x, N.y, -10, -16).y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawHead(ctx, sk, pal, ghost) {
    const R = 16;
    ctx.save();
    ctx.translate(sk.head.x, sk.head.y);
    ctx.rotate(sk.ha);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pal.line;
    ctx.fillStyle = pal.hairShade;
    this.hairPath(ctx, SUKUNA_HAIR_BACK, R + 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 9);
    ctx.quadraticCurveTo(10, 17, 16, 9);
    ctx.lineTo(16, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.quadraticCurveTo(10, 17, 16, 9);
    ctx.stroke();
    if (!ghost) {
      ctx.fillStyle = pal.skinShade;
      ctx.beginPath();
      ctx.ellipse(-3, 2, 3.5, 5, 0, 0, TAU);
      ctx.fill();
      // gözler
      ctx.fillStyle = '#fff6f0';
      ctx.beginPath();
      ctx.moveTo(5, -3);
      ctx.quadraticCurveTo(10, -7, 15, -3.5);
      ctx.quadraticCurveTo(10, -1, 5, -3);
      ctx.fill();
      ctx.fillStyle = pal.eye;
      ctx.beginPath();
      ctx.arc(11.5, -3.6, 2.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, -8);
      ctx.lineTo(15, -5.5);
      ctx.stroke();
      // ikinci göz çifti
      ctx.strokeStyle = pal.eye;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(8, 2.5);
      ctx.lineTo(14.5, 2);
      ctx.stroke();
      // yüz işaretleri
      ctx.strokeStyle = pal.mark;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(1, 6.5);
      ctx.lineTo(12, 6.5);
      ctx.moveTo(5, -12);
      ctx.lineTo(11, -10.5);
      ctx.stroke();
      if (this.armGrow > 0.5) {
        ctx.beginPath();
        ctx.moveTo(-2, 10);
        ctx.lineTo(9, 11);
        ctx.moveTo(0, -4);
        ctx.lineTo(4, -2);
        ctx.stroke();
        ctx.fillStyle = pal.eye;
        ctx.beginPath();
        ctx.arc(12, 2.2, 1.4, 0, TAU);
        ctx.fill();
      }
      // sırıtış
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(8, 11);
      ctx.quadraticCurveTo(12, 13, 15.5, 9.5);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 10.6, 3, 1.6);
    }
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2.5;
    this.hairPath(ctx, SUKUNA_HAIR, R);
    ctx.fill();
    ctx.stroke();
    if (!ghost) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(2, -14, 6, 2.5, -0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawAura(ctx) {
    if (this.form === 'heian' || this.armGrow > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const p = 0.5 + 0.2 * Math.sin(this.idleT * 7);
      Glow.draw(ctx, this.x, this.y - 120, 190, '#c0001a', (0.35 + p * 0.2) * this.armGrow);
      ctx.restore();
    }
    if (this.healGlow) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      Glow.draw(ctx, this.x, this.y - 110, 170, '#ffd6e2', 0.35 + 0.1 * Math.sin(this.idleT * 12));
      ctx.restore();
    }
  }

  drawOverlay(ctx) {
    if (this.state === 'paralyzed') drawParalyze(ctx, this);
    if (this.kindleT || this.bowT) {
      const h = this.handWorld('f');
      const t = this.idleT;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      Glow.draw(ctx, h.x, h.y, 90, '#ff6a1a', 0.6 + 0.2 * Math.sin(t * 20));
      Glow.draw(ctx, h.x, h.y, 40, '#ffd060', 0.8);
      if (this.kindleT && !this.bowT) {
        for (let i = 0; i < 6; i++) {
          const ph = t * 9 + i * 1.3;
          ctx.fillStyle = i % 2 ? 'rgba(255,190,80,0.75)' : 'rgba(255,90,30,0.75)';
          ctx.beginPath();
          const hx = h.x + (i - 2.5) * 4;
          ctx.moveTo(hx - 8, h.y);
          ctx.quadraticCurveTo(hx + Math.sin(ph) * 10, h.y - 30, hx + Math.sin(ph * 1.4) * 5, h.y - 46 - 10 * Math.sin(ph));
          ctx.quadraticCurveTo(hx + 4, h.y - 20, hx + 8, h.y);
          ctx.fill();
        }
      }
      if (this.bowT) {
        const b = this.handWorld('b');
        const f = this.facing;
        ctx.lineCap = 'round';
        // yay
        const top = { x: h.x - f * 6, y: h.y - 84 }, bot = { x: h.x - f * 6, y: h.y + 84 };
        for (const [w, c] of [[16, 'rgba(255,90,20,0.45)'], [6, 'rgba(255,200,90,0.9)'], [2.5, '#fff6d0']]) {
          ctx.strokeStyle = c;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.quadraticCurveTo(h.x + f * 52, h.y, bot.x, bot.y);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,200,120,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(bot.x, bot.y);
        ctx.stroke();
        // ok
        for (const [w, c] of [[14, 'rgba(255,90,20,0.5)'], [5, 'rgba(255,210,100,0.95)'], [2, '#ffffff']]) {
          ctx.strokeStyle = c;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(h.x + f * 70, h.y);
          ctx.stroke();
        }
        Glow.draw(ctx, h.x + f * 70, h.y, 60, '#ffb040', 0.9);
      }
      ctx.restore();
    }
  }
}

// ===========================================================================
// Sukuna efekt/mermi varlıkları
// ===========================================================================

class CleaveWave {
  constructor(owner, x, y, dir) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.t = 0;
    this.life = 0.62;
    this.speed = 1350;
    this.hitSet = new Set();
    this.hitTarget = null;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    this.x += this.dir * this.speed * dt;
    if (this.t > this.life) this.dead = true;
    const s = 1 + this.t * 0.6;
    for (let i = 0; i < 2; i++) FX.add({ type: 'spark', x: this.x - this.dir * 20 + rand(-10, 10), y: this.y + rand(-85, 85) * s, vx: -this.dir * rand(100, 340), vy: rand(-60, 60), life: 0.25, size: 2, color: i ? '#ff3a4a' : '#ffffff', len: 0.04, add: true });
    const box = { x: this.x - 45, y: this.y - 88 * s, w: 90, h: 176 * s };
    for (const f of this.owner.enemies()) {
      if (this.hitSet.has(f)) continue;
      if (!rectHit(box, f.hurtbox())) continue;
      this.hitSet.add(f);
      const r = f.takeHit({ attacker: this.owner, dmg: 50, kbx: 120, stun: 0.85, hitstop: 0.09, shake: 10, dir: this.dir, numColor: '#ff6070' });
      if (r === 'none') continue;
      FX.sparks(f.x, f.y - 120, 14, { color: '#ff3a4a', speed: 700 });
      FX.slashMark(f.x, f.y - 120, rand(-0.5, 0.5) + Math.PI / 2, 190, { w: 5 });
      Snd.sfx.slash();
      if (r === 'hit') this.hitTarget = f;
      this.dead = true;
      break;
    }
  }
  draw(ctx) {
    const s = 1 + this.t * 0.6;
    const a = 1 - Math.max(0, (this.t - this.life + 0.15) / 0.15);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir * s, s);
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, 10, 0, 140, '#ff1a30', 0.5 * a);
    for (let i = 3; i >= 0; i--) {
      ctx.globalAlpha = a * (i === 0 ? 1 : 0.35 / i);
      const ox = -i * 34;
      ctx.beginPath();
      ctx.moveTo(ox + 4, -98);
      ctx.quadraticCurveTo(ox + 124, 0, ox + 4, 98);
      ctx.quadraticCurveTo(ox + 46, 0, ox + 4, -98);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? '#ffe8ea' : '#ff2a3a';
      ctx.fill();
      if (i === 0) {
        ctx.strokeStyle = '#ff1a2a';
        ctx.lineWidth = 5;
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = '#0a0003';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, -80);
    ctx.quadraticCurveTo(96, 0, 10, 80);
    ctx.stroke();
    ctx.restore();
  }
}

class DismantleLine {
  constructor(owner, x, y, ang) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.ang = ang;
    this.len = 0;
    this.maxLen = 1800;
    this.t = 0;
    this.life = 0.75;
    this.hitSet = new Set();
    this.groundHit = false;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    const k = Math.min(1, this.t / 0.09);
    this.len = this.maxLen * k;
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    const G = this.owner.game.arena.ground;
    let len = this.len;
    if (s > 0.01) len = Math.min(len, (G - this.y) / s);
    const x2 = this.x + c * len, y2 = this.y + s * len;
    if (this.t < 0.16) {
      for (const f of this.owner.enemies()) {
        if (this.hitSet.has(f)) continue;
        if (!segRectHit(this.x, this.y, x2, y2, 48, f.hurtbox())) continue;
        this.hitSet.add(f);
        const r = f.takeHit({ attacker: this.owner, dmg: 110, kbx: 720, kby: -380, launch: true, hitstop: 0.13, shake: 16, dir: sign(c), numColor: '#ff6070' });
        if (r === 'hit' || r === 'ko') {
          FX.sparks(f.x, f.y - 110, 22, { color: '#ff3040', speed: 900 });
          FX.glow(f.x, f.y - 110, 90, '#ff2030', 0.2);
          FX.slashMark(f.x, f.y - 110, this.ang, 240, { w: 6, life: 0.3 });
          Snd.sfx.slash();
        }
      }
    }
    if (!this.groundHit && s > 0.01 && this.len * s >= G - this.y) {
      this.groundHit = true;
      FX.debris(x2, G, 14, { speed: 700 });
      FX.sparks(x2, G - 4, 18, { color: '#ffb0b0', speed: 800, angle: -Math.PI / 2, spread: 2.2 });
      FX.dust(x2, G, 8, { speed: 300 });
      this.owner.game.addScar({ type: 'line', x1: x2 - c * 160, y1: G + 18, x2: x2 + c * 260, y2: G + 34, w: 4, life: 5 });
    }
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    const G = this.owner.game.arena.ground;
    let len = this.len;
    if (s > 0.01) len = Math.min(len, (G - this.y) / s);
    const x2 = this.x + c * len, y2 = this.y + s * len;
    const k = this.t < 0.09 ? 1 : 1 - (this.t - 0.09) / (this.life - 0.09);
    const w = this.t < 0.09 ? 3 : 3 + 16 * Math.sin(Math.min(1, (this.t - 0.09) / 0.12) * Math.PI * 0.5) * k;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#ff1a30', 0.35 * k);
    ctx.lineWidth = w * 3.2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ff4050', 0.9 * k);
    ctx.lineWidth = w * 1.3;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', k);
    ctx.lineWidth = Math.max(1, w * 0.4);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    // siyah kenar çizgileri
    const nx = -s, ny = c;
    ctx.strokeStyle = rgba('#000000', 0.7 * k);
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(this.x + nx * side * w * 0.9, this.y + ny * side * w * 0.9);
      ctx.lineTo(x2 + nx * side * w * 0.9, y2 + ny * side * w * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class SpiderWeb {
  constructor(owner, x, y) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.t = 0;
    this.life = 1.7;
    this.R = 270;
    this.dead = false;
    this.layer = 'back';
    const n = 12;
    this.spokes = [];
    for (let i = 0; i < n; i++) this.spokes.push({ a: (i / n) * TAU + rand(-0.12, 0.12), j: [rand(0.9, 1.1), rand(0.9, 1.1), rand(0.9, 1.1), rand(0.9, 1.1)], len: rand(0.85, 1.15) });
    this.rings = [0.22, 0.45, 0.7, 0.95];
    this.flares = [];
    for (let i = 0; i < 9; i++) this.flares.push({ x: rand(-1, 1) * this.R * 0.9, h: rand(70, 190), d: rand(0, 0.12) });
  }
  update(dt) {
    this.t += dt;
    if (this.t < 0.3 && Math.random() < 0.8) {
      const a = rand(0, TAU), r = rand(0, this.R);
      FX.sparks(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r * 0.26, 2, { color: '#ff4050', speed: 300, angle: -Math.PI / 2, spread: 1.4 });
    }
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    const grow = ease.outCubic(Math.min(1, this.t / 0.18));
    const a = 1 - Math.max(0, (this.t - 0.8) / (this.life - 0.8));
    ctx.save();
    ctx.translate(this.x, this.y);
    // zemin düzlemi (perspektif)
    ctx.save();
    ctx.scale(1, 0.26);
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, 0, 0, this.R * 1.2, '#ff1a30', 0.45 * a);
    const pt = (sp, r) => ({ x: Math.cos(sp.a) * r * this.R * grow * sp.len, y: Math.sin(sp.a) * r * this.R * grow * sp.len });
    for (const [w, col] of [[9, rgba('#ff1a30', 0.5 * a)], [3, rgba('#ffd0d4', 0.95 * a)]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (const sp of this.spokes) {
        const p = pt(sp, 1);
        ctx.moveTo(0, 0);
        ctx.lineTo(p.x, p.y);
      }
      this.rings.forEach((r, ri) => {
        this.spokes.forEach((sp, i) => {
          const p = pt(sp, r * sp.j[ri]);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        const p0 = pt(this.spokes[0], r * this.spokes[0].j[ri]);
        ctx.lineTo(p0.x, p0.y);
      });
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba('#000000', 0.6 * a);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const sp of this.spokes) {
      const p = pt(sp, 1);
      ctx.moveTo(0, 0);
      ctx.lineTo(p.x * 1.02, p.y * 1.02 + 6);
    }
    ctx.stroke();
    ctx.restore();
    // dikey kesik parlamaları
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const f of this.flares) {
      const lt = this.t - f.d;
      if (lt < 0 || lt > 0.35) continue;
      const k = lt / 0.35;
      const h = f.h * ease.outCubic(Math.min(1, k * 3));
      ctx.strokeStyle = rgba('#ff3040', 0.7 * (1 - k));
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(f.x * grow, 0);
      ctx.lineTo(f.x * grow + 8, -h);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 1 - k);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

class BlackFlashFx {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.t = 0;
    this.life = 0.6;
    this.bolts = [];
    this.regen = 0;
    this.dead = false;
    this.alwaysUpdate = true;
  }
  update(dt, game) {
    this.t += Math.max(dt, game && game.hitstop > 0 ? 1 / 60 : 0);
    this.regen -= 1 / 60;
    if (this.regen <= 0) {
      this.regen = 0.035;
      this.bolts = [];
      for (let i = 0; i < 8; i++) {
        const a = rand(0, TAU), L = rand(90, 240);
        this.bolts.push(boltPoints(this.x, this.y, this.x + Math.cos(a) * L, this.y + Math.sin(a) * L, 8, 26));
      }
    }
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    const a = 1 - this.t / this.life;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, this.x, this.y, 220, '#ff0a20', 0.7 * a);
    ctx.strokeStyle = rgba('#ff1a2a', 0.85 * a);
    ctx.lineWidth = 11;
    for (const b of this.bolts) strokePts(ctx, b);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba('#000000', a);
    ctx.lineWidth = 4.5;
    for (const b of this.bolts) strokePts(ctx, b);
    ctx.strokeStyle = rgba('#ff5060', a);
    ctx.lineWidth = 1;
    for (const b of this.bolts) strokePts(ctx, b);
    ctx.fillStyle = rgba('#000000', a);
    ctx.beginPath();
    ctx.arc(this.x, this.y, 26 * (1 - this.t), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

class WorldCut {
  constructor(owner, x, y, ang, dmg) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.ang = ang;
    this.dmg = dmg;
    this.t = 0;
    this.tele = 0.28;
    this.life = 1.0;
    this.did = false;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    if (!this.did && this.t >= this.tele) {
      this.did = true;
      FX.worldSplit(this.x, this.y, this.ang, { off: 24, dur: 0.5 });
      FX.impact(0.07, 'invert');
      FX.shake(22);
      FX.flash('#ffffff', 0.3);
      Snd.sfx.worldCut();
      const c = Math.cos(this.ang), s = Math.sin(this.ang);
      for (let i = 0; i < 26; i++) {
        const d = rand(-900, 900);
        FX.sparks(this.x + c * d, this.y + s * d, 1, { color: pick(['#ffffff', '#ff4050']), speed: 500, size: 2 });
      }
      for (const f of this.owner.enemies()) {
        if (!lineRectHit(this.x, this.y, this.ang, 70, f.hurtbox())) continue;
        const r = f.takeHit({ attacker: this.owner, dmg: this.dmg, unblockable: true, uncounterable: true, otg: true, kbx: 300, kby: -520, launch: true, hitstop: 0.16, shake: 10, numColor: '#ff4060' });
        if (r === 'hit' || r === 'ko') {
          FX.sparks(f.x, f.cy, 26, { color: '#ff2a3a', speed: 1000, size: 3 });
          FX.glow(f.x, f.cy, 120, '#ff1a2a', 0.25);
        }
      }
    }
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    const c = Math.cos(this.ang), s = Math.sin(this.ang), L = 5000;
    const x1 = this.x - c * L, y1 = this.y - s * L, x2 = this.x + c * L, y2 = this.y + s * L;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'lighter';
    if (this.t < this.tele) {
      const fl = 0.45 + 0.55 * Math.abs(Math.sin(this.t * 60));
      ctx.strokeStyle = rgba('#ff2030', 0.35 * fl);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.8 * fl);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      const k = (this.t - this.tele) / (this.life - this.tele);
      const w = 16 * Math.pow(1 - k, 1.4);
      ctx.strokeStyle = rgba('#ff1a30', 0.5 * (1 - k));
      ctx.lineWidth = w * 3.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 1 - k);
      ctx.lineWidth = Math.max(0.5, w);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class SquareCut {
  constructor(owner, cx, cy, size) {
    this.owner = owner;
    this.cx = cx;
    this.cy = cy;
    this.size = size;
    this.t = 0;
    this.life = 1.5;
    this.final = false;
    this.dead = false;
    const h = size / 2, ext = 140, x0 = cx - h, x1 = cx + h, y0 = cy - h, y1 = cy + h;
    const th = size / 3;
    this.lines = [
      [x0 - ext, y0, x1 + ext, y0], [x1, y0 - ext, x1, y1 + ext], [x1 + ext, y1, x0 - ext, y1], [x0, y1 + ext, x0, y0 - ext],
      [x0 + th, y0, x0 + th, y1], [x0 + th * 2, y0, x0 + th * 2, y1], [x0, y0 + th, x1, y0 + th], [x0, y0 + th * 2, x1, y0 + th * 2],
    ].map((l, i) => ({ l, at: 0.05 + i * 0.055, done: false }));
  }
  rect() { return { x: this.cx - this.size / 2, y: this.cy - this.size / 2, w: this.size, h: this.size }; }
  update(dt) {
    this.t += dt;
    for (const ln of this.lines) {
      if (ln.done || this.t < ln.at) continue;
      ln.done = true;
      Snd.sfx.slash();
      FX.shake(5);
      const [x1, y1, x2, y2] = ln.l;
      FX.sparks((x1 + x2) / 2, (y1 + y2) / 2, 8, { color: '#ffffff', speed: 500 });
      for (const f of this.owner.enemies()) {
        if (!rectHit(this.rect(), f.hurtbox())) continue;
        f.takeHit({ attacker: this.owner, dmg: 7, stun: 0.6, kbx: 0, unblockable: true, uncounterable: true, otg: true, hitstop: 0.02, numColor: '#ff8090' });
      }
    }
    if (!this.final && this.t >= 0.6) {
      this.final = true;
      FX.shatter(this.cx, this.cy, this.size, { n: 3, dur: 0.85 });
      FX.impact(0.1, 'red');
      FX.shake(26);
      FX.flash('#ff2030', 0.25);
      Snd.sfx.worldCut();
      Snd.sfx.explode();
      for (const f of this.owner.enemies()) {
        if (!rectHit(this.rect(), f.hurtbox())) continue;
        f.takeHit({ attacker: this.owner, dmg: 92, unblockable: true, uncounterable: true, otg: true, launch: true, kbx: 260, kby: -820, hitstop: 0.18, shake: 12, numColor: '#ff4060' });
        FX.sparks(f.x, f.cy, 30, { color: '#ff2a3a', speed: 1100, size: 3 });
      }
      FX.shard(this.cx, this.cy, 24, { color: '#ffe0e0', speed: 900, size: 14, add: true });
    }
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    const fade = this.final ? 1 - (this.t - 0.6) / (this.life - 0.6) : 1;
    const r = this.rect();
    Glow.draw(ctx, this.cx, this.cy, this.size * 0.9, '#ff1020', 0.25 * fade);
    for (const ln of this.lines) {
      if (this.t < ln.at) continue;
      const k = Math.min(1, (this.t - ln.at) / 0.06);
      const [x1, y1, x2, y2] = ln.l;
      const ex = lerp(x1, x2, k), ey = lerp(y1, y2, k);
      ctx.strokeStyle = rgba('#ff1a30', 0.5 * fade);
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', fade);
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    if (!this.final) {
      ctx.strokeStyle = rgba('#ff3040', 0.4 + 0.3 * Math.sin(this.t * 40));
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
  }
}

class FugaArrow {
  constructor(owner, x, y, ang) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.ang = ang;
    this.speed = 2000;
    this.t = 0;
    this.life = 0.75;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    this.x += c * this.speed * dt;
    this.y += s * this.speed * dt;
    FX.embers(this.x, this.y, 4, { spread: 12, vy: -80, life: 0.6 });
    FX.add({ type: 'glow', x: this.x, y: this.y, size: 50, life: 0.25, color: '#ff6a1a', add: true });
    const A = this.owner.game.arena;
    let hit = this.t > this.life || this.y >= A.ground || this.x < A.left - 300 || this.x > A.right + 300;
    for (const f of this.owner.enemies()) if (circleRectHit(this.x, this.y, 46, f.hurtbox())) hit = true;
    if (hit) {
      this.dead = true;
      this.owner.spawn(new FireExplosion(this.owner, this.x, Math.min(this.y, A.ground)));
    }
  }
  draw(ctx) {
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, col, L] of [[30, 'rgba(255,80,20,0.4)', 260], [12, 'rgba(255,170,60,0.9)', 200], [4, '#ffffff', 140]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(this.x - c * L, this.y - s * L);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }
    Glow.draw(ctx, this.x, this.y, 110, '#ff8a2a', 0.8);
    ctx.restore();
  }
}

class FireExplosion {
  constructor(owner, x, y) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.t = 0;
    this.life = 2.4;
    this.R = 390;
    this.did = false;
    this.burn = 0;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    const G = this.owner.game.arena.ground;
    if (!this.did) {
      this.did = true;
      FX.flash('#ff8a2a', 0.85);
      FX.impact(0.12, 'red');
      FX.shake(36);
      Snd.sfx.fire();
      Snd.sfx.explode();
      for (const f of this.owner.enemies()) {
        const hb = f.hurtbox();
        if (!circleRectHit(this.x, this.y - 80, this.R, hb)) continue;
        f.takeHit({ attacker: this.owner, dmg: 210, unblockable: true, uncounterable: true, otg: true, launch: true, kbx: 950, kby: -1150, spin: 14, hitstop: 0.22, shake: 20, numColor: '#ffb040', dir: sign(f.x - this.x) });
      }
      this.owner.game.addScar({ type: 'burn', x: this.x, y: G, r: 320, life: 9 });
      FX.debris(this.x, G, 40, { speed: 1300, color: '#3a2a28' });
      for (let i = 0; i < 4; i++) FX.ring(this.x, this.y - 60, { r0: 30, r1: 300 + i * 160, color: i ? '#ff7a2a' : '#fff0c0', life: 0.6 + i * 0.15, w: 10 });
    }
    if (this.t < 1.4) {
      FX.embers(this.x, this.y - 40, 8, { spread: this.R * 0.6, vy: -320, life: 1.3, size: 4 });
      if (Math.random() < 0.5) FX.smoke(this.x, this.y - 100, 2, { color: '#1a0e0a', size: 50, vy: -120, spread: this.R * 0.5 });
      this.burn -= dt;
      if (this.burn <= 0) {
        this.burn = 0.2;
        for (const f of this.owner.enemies()) {
          if (Math.abs(f.x - this.x) < this.R * 0.8 && f.y > G - 300) f.takeHit({ attacker: this.owner, dmg: 3, unblockable: true, uncounterable: true, otg: true, kbx: 0, stun: 0.15, numColor: '#ffb040' });
        }
      }
    }
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    const k = this.t / this.life;
    const grow = ease.outExpo(Math.min(1, this.t / 0.35));
    const a = 1 - Math.max(0, (k - 0.35) / 0.65);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, this.x, this.y - 100, this.R * 1.6 * grow, '#ff4a10', 0.7 * a);
    Glow.draw(ctx, this.x, this.y - 100, this.R * 0.9 * grow, '#ffb040', 0.8 * a);
    Glow.draw(ctx, this.x, this.y - 100, this.R * 0.4 * grow, '#fff4d0', a);
    // alev dilleri
    const tt = this.t;
    for (let i = 0; i < 16; i++) {
      const ph = tt * 7 + i * 2.1;
      const bx = this.x + (i - 7.5) * this.R * 0.11;
      const h = (180 + 120 * Math.sin(ph)) * grow * a + 40;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,220,120,0.55)' : 'rgba(255,100,30,0.5)';
      ctx.beginPath();
      ctx.moveTo(bx - 30, this.y);
      ctx.quadraticCurveTo(bx + Math.sin(ph) * 30, this.y - h * 0.6, bx + Math.sin(ph * 1.3) * 20, this.y - h);
      ctx.quadraticCurveTo(bx + 10, this.y - h * 0.4, bx + 30, this.y);
      ctx.fill();
    }
    // ateş sütunu
    if (this.t < 1.0) {
      const ca = 1 - this.t;
      const gr = ctx.createLinearGradient(0, this.y - 900, 0, this.y);
      gr.addColorStop(0, 'rgba(255,120,40,0)');
      gr.addColorStop(1, rgba('#ffc060', 0.8 * ca));
      ctx.fillStyle = gr;
      ctx.fillRect(this.x - 90 * grow, this.y - 900, 180 * grow, 900);
    }
    ctx.restore();
  }
}

// ===========================================================================
// Alan Açılımı: Fukuma Mizushi (Kötücül Tapınak) — bariyersiz, her şeyi keser
// ===========================================================================

let SHRINE_SPRITE = null;
function buildShrineSprite() {
  const W = 760, H = 820;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const cx = W / 2, B = H - 10;
  const dark = '#1a0a0e', red = '#7a0e18', bone = '#d9cfbd', line = '#050203';
  g.lineJoin = 'round';
  // kafatası yığını
  const skull = (x, y, r) => {
    g.fillStyle = bone;
    g.strokeStyle = line;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = '#1a0a0a';
    g.beginPath();
    g.arc(x - r * 0.38, y - r * 0.05, r * 0.26, 0, TAU);
    g.arc(x + r * 0.38, y - r * 0.05, r * 0.26, 0, TAU);
    g.fill();
    g.fillRect(x - r * 0.3, y + r * 0.45, r * 0.6, r * 0.18);
  };
  const rnd = mulberry32(666);
  // platform ve basamaklar
  g.fillStyle = '#140608';
  g.fillRect(cx - 300, B - 70, 600, 70);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? '#22090d' : '#1a0709';
    g.fillRect(cx - 110 + i * 8, B - 70 + i * 17, 220 - i * 16, 17);
  }
  // sütunlar
  for (const px of [-230, -120, 120, 230]) {
    const gr = g.createLinearGradient(cx + px - 16, 0, cx + px + 16, 0);
    gr.addColorStop(0, '#3a0610');
    gr.addColorStop(0.5, '#8a1420');
    gr.addColorStop(1, '#2a040a');
    g.fillStyle = gr;
    g.fillRect(cx + px - 16, B - 330, 32, 262);
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.strokeRect(cx + px - 16, B - 330, 32, 262);
  }
  // dev ağız kapısı
  g.fillStyle = '#5a0a12';
  g.beginPath();
  g.ellipse(cx, B - 190, 104, 120, 0, 0, TAU);
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = '#060103';
  g.beginPath();
  g.ellipse(cx, B - 190, 82, 98, 0, 0, TAU);
  g.fill();
  g.fillStyle = bone;
  for (let i = 0; i < 9; i++) {
    const tx = cx - 72 + i * 18;
    const topY = B - 190 - Math.sqrt(Math.max(0, 1 - Math.pow((tx - cx) / 82, 2))) * 98;
    const botY = B - 190 + Math.sqrt(Math.max(0, 1 - Math.pow((tx - cx) / 82, 2))) * 98;
    g.beginPath();
    g.moveTo(tx - 8, topY + 2);
    g.lineTo(tx, topY + 30);
    g.lineTo(tx + 8, topY + 2);
    g.fill();
    g.beginPath();
    g.moveTo(tx - 8, botY - 2);
    g.lineTo(tx, botY - 28);
    g.lineTo(tx + 8, botY - 2);
    g.fill();
  }
  // çatı katları
  const roof = (y, w, h) => {
    g.fillStyle = dark;
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - w / 2 - 40, y + 6);
    g.quadraticCurveTo(cx - w / 2, y - 4, cx - w / 2 + 30, y - h * 0.4);
    g.lineTo(cx - w * 0.2, y - h);
    g.lineTo(cx + w * 0.2, y - h);
    g.lineTo(cx + w / 2 - 30, y - h * 0.4);
    g.quadraticCurveTo(cx + w / 2, y - 4, cx + w / 2 + 40, y + 6);
    g.lineTo(cx + w / 2 + 10, y + 16);
    g.lineTo(cx - w / 2 - 10, y + 16);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = red;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - w / 2 - 34, y + 8);
    g.quadraticCurveTo(cx, y - 2, cx + w / 2 + 34, y + 8);
    g.stroke();
    // boynuzlar
    for (const sd of [-1, 1]) {
      g.fillStyle = bone;
      g.strokeStyle = line;
      g.lineWidth = 2;
      g.beginPath();
      const bx = cx + sd * (w / 2 + 30);
      g.moveTo(bx, y + 4);
      g.quadraticCurveTo(bx + sd * 40, y - 20, bx + sd * 30, y - 60);
      g.quadraticCurveTo(bx + sd * 22, y - 22, bx - sd * 8, y - 2);
      g.closePath();
      g.fill();
      g.stroke();
    }
  };
  // üst gövde
  g.fillStyle = '#2a0a10';
  g.fillRect(cx - 250, B - 400, 500, 72);
  g.strokeStyle = line;
  g.strokeRect(cx - 250, B - 400, 500, 72);
  for (let i = 0; i < 7; i++) {
    g.fillStyle = '#8a1420';
    g.fillRect(cx - 230 + i * 68, B - 388, 40, 48);
  }
  roof(B - 400, 600, 90);
  g.fillStyle = '#220810';
  g.fillRect(cx - 160, B - 540, 320, 60);
  roof(B - 540, 420, 80);
  g.fillStyle = '#220810';
  g.fillRect(cx - 100, B - 660, 200, 50);
  roof(B - 660, 280, 70);
  // tepe sivrisi
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(cx - 14, B - 730);
  g.lineTo(cx, B - 805);
  g.lineTo(cx + 14, B - 730);
  g.fill();
  // ellerin dua eden siluetleri
  for (const sd of [-1, 1]) {
    g.fillStyle = '#c9b8a4';
    g.strokeStyle = line;
    g.lineWidth = 2;
    g.beginPath();
    const hx = cx + sd * 300;
    g.moveTo(hx, B - 300);
    g.quadraticCurveTo(hx + sd * 30, B - 380, hx + sd * 6, B - 450);
    g.lineTo(hx - sd * 10, B - 445);
    g.quadraticCurveTo(hx + sd * 6, B - 380, hx - sd * 20, B - 300);
    g.closePath();
    g.fill();
    g.stroke();
  }
  // kafatası yığını önde
  for (let i = 0; i < 120; i++) {
    const x = cx + (rnd() * 2 - 1) * 360;
    const hmax = 110 * (1 - Math.pow(Math.abs(x - cx) / 380, 2));
    const y = B - rnd() * Math.max(10, hmax);
    if (Math.abs(x - cx) < 100 && y < B - 30) continue;
    skull(x, y, 9 + rnd() * 8);
  }
  SHRINE_SPRITE = c;
  return c;
}

class ShrineDomain {
  constructor(owner) {
    this.owner = owner;
    this.kind = 'shrine';
    this.t = 0;
    this.openT = 1.5;
    this.dur = 7.2;
    this.closeT = 1.0;
    this.x = clamp(owner.x - owner.facing * 240, owner.game.arena.left, owner.game.arena.right);
    this.tick = 0;
    this.bigTick = 0.4;
    this.sndTick = 0;
    this.slashes = [];
    this.cityCuts = [];
    for (let i = 0; i < 46; i++) this.cityCuts.push({ x: Math.random(), y: rand(0.05, 0.75), a: rand(-0.9, 0.9), l: rand(0.08, 0.32), at: rand(0, 1) });
    this.skulls = [];
    for (let i = 0; i < 40; i++) this.skulls.push({ x: rand(-1400, 1400), y: rand(4, 110), r: rand(5, 10) });
    this.done = false;
    if (!SHRINE_SPRITE) buildShrineSprite();
  }
  get alpha() {
    const t = this.t;
    if (t < this.openT) return ease.inOut(t / this.openT);
    if (t < this.openT + this.dur) return 1;
    return Math.max(0, 1 - (t - this.openT - this.dur) / this.closeT);
  }
  get activeK() { return clamp((this.t - this.openT) / this.dur, 0, 1); }
  update(dt, game) {
    this.t += dt;
    const active = this.t > this.openT && this.t < this.openT + this.dur && !game.cinematic;
    if (active) {
      this.tick -= dt;
      while (this.tick <= 0) {
        this.tick += 0.15;
        for (const f of this.owner.enemies()) {
          f.takeHit({ attacker: this.owner, dmg: 3.2, stun: 0.22, kbx: rand(-40, 40), unblockable: true, uncounterable: true, otg: true, numColor: '#ff8090' });
          FX.slashMark(f.x + rand(-30, 30), f.y - rand(30, 200), rand(0, Math.PI), rand(60, 120), { w: 2.5, life: 0.18 });
        }
      }
      this.bigTick -= dt;
      if (this.bigTick <= 0) {
        this.bigTick = 0.7;
        for (const f of this.owner.enemies()) {
          f.takeHit({ attacker: this.owner, dmg: 17, stun: 0.4, kbx: rand(-200, 200), unblockable: true, uncounterable: true, otg: true, hitstop: 0.04, shake: 6, numColor: '#ff5060' });
          FX.slashMark(f.x, f.y - 110, rand(0, Math.PI), 260, { w: 6, life: 0.25 });
          FX.sparks(f.x, f.y - 110, 12, { color: '#ff3040', speed: 700 });
        }
        FX.debris(game.cam.x + rand(-600, 600), game.arena.ground, 6, { speed: 600 });
      }
      this.sndTick -= dt;
      if (this.sndTick <= 0) {
        this.sndTick = rand(0.06, 0.14);
        Snd.sfx.slash();
      }
      for (let i = 0; i < 3; i++) this.slashes.push({ x: Math.random(), y: Math.random(), a: rand(0, Math.PI), l: rand(0.05, 0.22), t: 0, life: rand(0.14, 0.26) });
    }
    for (const s of this.slashes) s.t += dt;
    this.slashes = this.slashes.filter((s) => s.t < s.life);
    if (this.t > this.openT + this.dur + this.closeT && !this.done) {
      this.done = true;
      game.domain = null;
      this.owner.onDomainEnd();
    }
  }
  // gökyüzü ve şehir: kızıl ton + bina kesikleri
  drawBack(ctx, VW, VH) {
    const a = this.alpha;
    if (a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgba('#ff3a3a', a);
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'source-over';
    const gr = ctx.createLinearGradient(0, 0, 0, VH * 0.7);
    gr.addColorStop(0, rgba('#160003', 0.92 * a));
    gr.addColorStop(1, rgba('#5a0008', 0.35 * a));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, VW, VH * 0.7);
    // kızıl ay
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, VW * 0.5, VH * 0.2, 260, '#ff1020', 0.35 * a);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#c0101c', 0.9 * a);
    ctx.beginPath();
    ctx.arc(VW * 0.5, VH * 0.2, 60, 0, TAU);
    ctx.fill();
    // şehir kesikleri: zamanla artan
    const k = this.activeK;
    ctx.lineCap = 'round';
    for (const c of this.cityCuts) {
      if (c.at > k * 1.2) continue;
      const x = c.x * VW, y = c.y * VH, L = c.l * VW;
      const dx = Math.cos(c.a) * L / 2, dy = Math.sin(c.a) * L / 2;
      ctx.strokeStyle = rgba('#000000', 0.8 * a);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ff4050', 0.6 * a);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy - 2);
      ctx.lineTo(x + dx, y + dy - 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  drawWorldBack(ctx) {
    const a = this.alpha;
    if (a <= 0) return;
    const G = this.owner.game.arena.ground;
    const rise = ease.outCubic(Math.min(1, this.t / this.openT));
    const S = 1.2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x - 1200, G - 1400, 2400, 1400 + 30);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, this.x, G - 380, 700, '#ff0a1a', 0.45 * a);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a;
    const w = SHRINE_SPRITE.width * S, h = SHRINE_SPRITE.height * S;
    ctx.drawImage(SHRINE_SPRITE, this.x - w / 2, G - h + 30 + (1 - rise) * h * 0.8, w, h);
    ctx.restore();
    // kan gölü
    ctx.save();
    ctx.globalAlpha = 0.75 * a;
    const gr = ctx.createLinearGradient(0, G - 30, 0, G + 160);
    gr.addColorStop(0, '#3a0006');
    gr.addColorStop(1, '#120002');
    ctx.fillStyle = gr;
    ctx.fillRect(this.owner.game.cam.x - 2000, G - 30, 4000, 300);
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,60,70,0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const rr = ((this.t * 60 + i * 90) % 700);
      ctx.beginPath();
      ctx.ellipse(this.x, G + 40, rr, rr * 0.08, 0, 0, TAU);
      ctx.stroke();
    }
    for (const s of this.skulls) {
      ctx.fillStyle = '#cfc4b0';
      ctx.beginPath();
      ctx.arc(this.x + s.x, G + s.y, s.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#200';
      ctx.fillRect(this.x + s.x - s.r * 0.5, G + s.y - s.r * 0.2, s.r * 0.35, s.r * 0.35);
      ctx.fillRect(this.x + s.x + s.r * 0.15, G + s.y - s.r * 0.2, s.r * 0.35, s.r * 0.35);
    }
    ctx.restore();
  }
  drawWorldFront() {}
  drawScreen(ctx, VW, VH) {
    const a = this.alpha;
    if (a <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const k = s.t / s.life;
      const x = s.x * VW, y = s.y * VH, L = s.l * VW * Math.min(1, k * 4);
      const dx = Math.cos(s.a) * L / 2, dy = Math.sin(s.a) * L / 2;
      ctx.strokeStyle = rgba('#ff1a30', 0.6 * (1 - k) * a);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', (1 - k) * a);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
    // alan süresi
    if (this.t > this.openT && this.t < this.openT + this.dur) {
      const left = this.openT + this.dur - this.t;
      ctx.save();
      ctx.font = `800 26px ${JP_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba('#ffb0b8', 0.9);
      ctx.fillText(`伏魔御廚子  ${left.toFixed(1)}`, VW / 2, VH * 0.2 + 8);
      ctx.restore();
    }
  }
}

// Felç (Sonsuz Boşluk) görseli: bilgi bombardımanı glitch'i
function drawParalyze(ctx, f) {
  const hb = f.hurtbox();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const y = hb.y + Math.random() * hb.h;
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(80,220,255,0.35)' : 'rgba(255,80,220,0.3)';
    ctx.fillRect(hb.x - 20 + rand(-10, 10), y, hb.w + 40, rand(2, 7));
  }
  Glow.draw(ctx, f.x, f.y - 120, 120, '#9fe0ff', 0.25 + 0.1 * Math.sin(f.idleT * 20));
  ctx.restore();
  const h = f.headWorld();
  ctx.save();
  ctx.font = '700 18px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,245,255,0.85)';
  const syms = ['∞', '∞', '情', '報', '∞'];
  for (let i = 0; i < 3; i++) {
    const ph = f.idleT * 1.5 + i * 2.1;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(ph * 2);
    ctx.font = `800 ${16 + i * 3}px ${JP_FONT}`;
    ctx.fillText(syms[(Math.floor(ph) + i) % syms.length], h.x + Math.cos(ph) * 40, h.y - 30 - ((ph * 20) % 40));
  }
  ctx.restore();
}
