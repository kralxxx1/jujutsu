'use strict';
// ---------------------------------------------------------------------------
// GOJO SATORU
// 1 Ao (蒼): çeker, tekrar basınca sert tekme · 2 Aka (赫): sarsan kırmızı
// 3 Seri Darbe: tekme-yumruk, karna iki vuruş, yukarı savuran tekme
// 4 Karşı Saldırı: vurulunca Mavi ile yere çökertir, arkasına ışınlanıp tekme
// R Işınlanma (fare imlecine) · G Sonsuz Boşluk: 0.2 sn alan → 3 sn koşu
// → tek ulti yeteneği: %200 Hollow Purple (茈)
// ---------------------------------------------------------------------------

const GOJO_PAL = {
  skin: '#f6e2d2', skinShade: '#d9b8a3', hair: '#f4f7ff', hairShade: '#aebee4',
  sleeve: '#1e2439', sleeveShade: '#11152a', sleeveHi: '#353f64',
  cloth: '#1e2439', clothShade: '#131829', pants: '#1a1f33', pantsShade: '#0f121f', pantsHi: '#2d3554',
  shoe: '#0c0d12', shoeShade: '#07080b', band: '#0d0d13', line: '#06060b', eye: '#8fe8ff',
};

const GOJO_HAIR = [[-18, 7, 10], [-38, 15, 11], [-58, 22, 11], [-78, 26, 11], [-98, 25, 11], [-118, 22, 12], [-140, 17, 12], [-163, 12, 12], [-186, 8, 12]];
const GOJO_HAIR_BACK = [[-48, 20, 13], [-88, 24, 13], [-128, 20, 13], [-168, 12, 13]];

class Gojo extends Fighter {
  constructor(game, o) {
    super(game, o);
    this.name = 'GOJO SATORU';
    this.jpName = '五条悟';
    this.short = 'GOJO';
    this.color = '#6fc8ff';
    this.accent = '#4fb6ff';
    this.speed = 440;
    this.blind = true;
    this.ultOn = false;
    this.runMode = 0;
    this.purpleReady = false;
    this.purpleTime = 0;
    this.aoFollow = 0;
    this.aoTarget = null;
    this.infinityFx = 0;
    this.chargeRed = 0;
    this.orbBlue = 0;
    this.orbRed = 0;
    this.orbMerge = 0;
    this.counterTriggered = false;
    this.counterTarget = null;
    this.aiRange = 260;
    this.snapPose('gojoIdle');
  }

  idlePose() { return this.victory ? 'peace' : 'gojoIdle'; }
  inUlt() { return this.ultOn; }
  palette() { return GOJO_PAL; }

  update(dt) {
    if (dt <= 0) return;
    super.update(dt);
    if (this.aoFollow > 0) {
      this.aoFollow -= dt;
      if (this.aoFollow <= 0) this.aoTarget = null;
    }
    if (this.purpleReady && this.state !== 'action') {
      this.purpleTime -= dt;
      if (this.purpleTime <= 0) {
        this.purpleReady = false;
        this.endUlt();
      }
    }
    if (this.ultOn && Math.random() < 0.5) FX.add({ type: 'glow', x: this.x + rand(-40, 40), y: this.y - rand(10, 210), vy: -rand(40, 120), size: rand(10, 20), life: 0.5, color: '#7fd0ff', add: true, back: true });
  }

  endUlt() {
    this.ultOn = false;
    this.runMode = 0;
    this.purpleReady = false;
    this.blind = true;
  }

  getSkill(k) {
    if (this.purpleReady) {
      if (k === '1' || k === 'G') return { name: 'Hollow Purple', ignoreCd: true, noAutoCd: true, armor: true, fn: this.purple };
      return null;
    }
    if (this.ultOn) return null;
    switch (k) {
      case '1':
        if (this.aoFollow > 0 && this.aoTarget && this.aoTarget.state !== 'ko') return { name: 'Tekme', ignoreCd: true, noAutoCd: true, fn: this.aoKick };
        return { name: 'Ao', cd: 7, fn: this.ao };
      case '2': return { name: 'Aka', cd: 6, fn: this.aka };
      case '3': return { name: 'Seri Darbe', cd: 7.5, fn: this.combo };
      case '4': return { name: 'Karşı Saldırı', cd: 8, fn: this.counter };
      case 'R': return { name: 'Işınlanma', cd: 2.2, fn: this.teleport };
      case 'G': return { name: 'Sonsuz Boşluk', cd: 0, armor: true, fn: this.ultVoid, ready: () => this.ult >= 100, onUse: () => { this.ult = 0; this.ultOn = true; } };
      default: return null;
    }
  }

  skillInfo() {
    if (this.purpleReady || this.runMode > 0 || this.ultOn) {
      const P = this.purpleReady;
      return [
        { key: '1', kanji: '茈', name: P ? 'HOLLOW PURPLE' : 'KOŞ!', ready: P, cd: 0, cdMax: 1, highlight: P, active: !P },
        { key: '2', kanji: '・', name: '—', ready: false, cd: 0, cdMax: 1 },
        { key: '3', kanji: '・', name: '—', ready: false, cd: 0, cdMax: 1 },
        { key: '4', kanji: '・', name: '—', ready: false, cd: 0, cdMax: 1 },
        { key: 'R', kanji: '・', name: '—', ready: false, cd: 0, cdMax: 1 },
        { key: 'G', kanji: '無', name: P ? `%200 · ${Math.ceil(this.purpleTime)} SN` : this.runMode > 0 ? `KOŞU ${this.runMode.toFixed(1)}` : 'ALAN', ready: P, cd: 0, cdMax: 1, active: true, highlight: P },
      ];
    }
    const rows = [
      ['1', '蒼', this.aoFollow > 0 ? 'TEKME!' : 'AO · MAVİ'],
      ['2', '赫', 'AKA · KIRMIZI'],
      ['3', '撃', 'SERİ DARBE'],
      ['4', '返', 'KARŞI SALDIRI'],
      ['R', '瞬', 'IŞINLANMA'],
      ['G', '無', 'ULTİ'],
    ];
    return rows.map(([key, kanji, name]) => {
      const s = this.getSkill(key);
      const ready = !!s && (!s.ready || s.ready()) && (s.ignoreCd || this.cd[key] <= 0);
      return {
        key, kanji, name, ready, cd: s && !s.ignoreCd ? this.cd[key] : 0, cdMax: this.cdMax[key],
        highlight: (key === '1' && this.aoFollow > 0) || (key === 'G' && this.ult >= 100),
        ult: key === 'G' ? this.ult / 100 : null,
      };
    });
  }

  // ----------------------------------------------------------------- yetenekler
  *ao() {
    const t = this.nearestEnemy();
    this.face(t);
    this.lockFacing = true;
    this.setPose('aoCast', 30);
    Snd.sfx.blue();
    Snd.say('術式順転、蒼', 'Jutsushiki junten, Ao', { pitch: 1, rate: 1.25 });
    FX.callout('蒼', 'AO · MAVİ', { color: '#1f5fe0', side: this.side, size: 92, dur: 1.0 });
    yield 0.16;
    const inRange = t && Math.abs(t.x - this.x) < 560 && Math.abs(t.y - this.y) < 420 && t.state !== 'down' && t.state !== 'getup';
    const ox = inRange ? t.x : this.x + this.facing * 380;
    const oy = inRange ? t.cy : this.y - 110;
    const orb = this.spawn(new BlueOrb(this, ox, oy));
    if (!inRange) {
      yield 0.35;
      return;
    }
    const r = t.takeHit({ attacker: this, dmg: 28, stun: 1.0, hitstop: 0.05, shake: 6, numColor: '#7fc8ff', dir: -this.facing });
    if (r !== 'hit') {
      yield 0.3;
      return;
    }
    if (!this.grab(t, (t.x - this.x) * this.facing, t.y - this.y, 'held')) return;
    const h = this.holding;
    const sx = h.ox, sy = h.oy;
    let tt = 0;
    while (tt < 0.32) {
      yield null;
      tt += this.game.dt;
      if (!this.holding) break;
      const k = ease.inOut(Math.min(1, tt / 0.32));
      h.ox = lerp(sx, 82, k);
      h.oy = lerp(sy, 0, k);
      orb.x = t.x;
      orb.y = t.cy;
      FX.sparks(t.x, t.cy, 2, { color: '#7fc8ff', speed: 300, size: 2 });
    }
    this.release();
    orb.life = Math.min(orb.life, orb.t + 0.15);
    if (t.state === 'ko') return;
    if (t.state === 'hurt') {
      t.stun = 1.35;
      t.setPose('hurt2', 30);
    }
    this.aoTarget = t;
    this.aoFollow = 1.5;
    yield 0.12;
  }

  *aoKick() {
    const t = this.aoTarget;
    this.aoFollow = 0;
    this.aoTarget = null;
    this.face(t);
    this.lockFacing = true;
    if (t && Math.abs(t.x - this.x) > 110) {
      this.teleportFx(this.x, this.y, '#7fd0ff');
      this.x = clamp(t.x - this.facing * 90, this.game.arena.left, this.game.arena.right);
      this.teleportFx(this.x, this.y, '#7fd0ff');
    }
    this.setPose('kickWind', 30);
    yield 0.09;
    this.setPose('bigKick', 60);
    Snd.sfx.whoosh();
    const hits = this.melee(140, { dmg: 85, kbx: 1650, kby: -520, launch: true, spin: 10, hitstop: 0.16, shake: 22, numColor: '#9fd8ff', sparkColor: '#bfe8ff', glowColor: '#5ab8ff' }, { top: 220, height: 220 });
    if (hits.length) {
      const f = hits[0];
      Snd.sfx.heavy();
      FX.ring(f.x, f.cy, { r0: 20, r1: 220, color: '#9fd8ff', life: 0.35, w: 8 });
      FX.impact(0.08, 'blue');
      FX.speedLines(0.35, '#dff3ff');
      FX.callout('蹴', 'TEKME!', { color: '#1f5fe0', side: this.side, size: 70, dur: 0.8, style: 'small' });
    }
    yield 0.35;
  }

  *aka() {
    const t = this.nearestEnemy();
    this.face(t);
    this.lockFacing = true;
    this.setPose('akaCharge', 26);
    Snd.sfx.redCharge();
    Snd.say('術式反転、赫', 'Jutsushiki hanten, Aka', { pitch: 1, rate: 1.3 });
    FX.callout('赫', 'AKA · KIRMIZI', { color: '#d0102a', side: this.side, size: 92, dur: 1.0 });
    for (let i = 0; i < 8; i++) {
      this.chargeRed = (i + 1) / 8;
      const h = this.handWorld('f');
      for (let k = 0; k < 2; k++) {
        const a = rand(0, TAU), d = rand(40, 80);
        FX.add({ type: 'spark', x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, vx: -Math.cos(a) * d * 5, vy: -Math.sin(a) * d * 5, life: 0.18, size: 2, color: '#ff4060', len: 0.03, add: true });
      }
      yield 0.05;
    }
    this.setPose('akaFire', 50);
    const h = this.handWorld('f');
    let la = 0;
    if (t) la = clamp(Math.atan2(t.cy - h.y, (t.x - h.x) * this.facing), -0.4, 0.4);
    this.spawn(new RedOrb(this, h.x + this.facing * 14, h.y, this.facing > 0 ? la : Math.PI - la));
    this.chargeRed = 0;
    Snd.sfx.redFire();
    FX.shake(8);
    this.vx = -this.facing * 260;
    yield 0.3;
  }

  *combo() {
    const t = this.nearestEnemy();
    this.face(t);
    this.lockFacing = true;
    const ok = t && Math.abs(t.x - this.x) < 240 && Math.abs(t.y - this.y) < 170 && t.state !== 'down' && t.state !== 'getup' && t.state !== 'held' && t.invuln <= 0;
    if (!ok) {
      this.setPose('punchA', 40);
      this.vx = this.facing * 520;
      Snd.sfx.whoosh();
      yield 0.3;
      return;
    }
    if (t.counterWindow > 0) {
      // karşı saldırıya yakalandı
      t.takeHit({ attacker: this, dmg: 1 });
      yield 0.3;
      return;
    }
    this.teleportFx(this.x, this.y, '#7fd0ff');
    this.x = clamp(t.x - this.facing * 78, this.game.arena.left, this.game.arena.right);
    this.y = t.y;
    this.vy = 0;
    this.noGravity = true;
    if (!this.grab(t, 78, 0, 'hurt')) return;
    FX.callout('乱打', 'SERİ DARBE', { color: '#1f5fe0', side: this.side, size: 64, dur: 0.9, style: 'small' });
    const seq = ['punchA', 'kickA', 'punchB', 'roundKick', 'punchA', 'kickB', 'punchB', 'kickA'];
    for (let i = 0; i < seq.length; i++) {
      this.setPose(seq[i], 60);
      t.setPose(i % 2 ? 'hurt' : 'hurt2', 50);
      const hx = t.x - this.facing * 16 + rand(-6, 6), hy = t.y - rand(80, 175);
      FX.sparks(hx, hy, 5, { color: '#cfe9ff', speed: 520, size: 2.2, angle: this.facing > 0 ? 0 : Math.PI, spread: 1.4 });
      FX.glow(hx, hy, 34, '#7fd0ff', 0.1);
      t.takeHit({ attacker: this, dmg: 7, hitstop: 0.025, shake: 2.5, numColor: '#bfe6ff' });
      Snd.sfx.punch();
      if (t.state === 'ko' || !this.holding) return;
      yield 0.075;
    }
    for (let i = 0; i < 2; i++) {
      this.setPose('stomachPunch', 60);
      t.setPose('hurt2', 60);
      const hx = t.x - this.facing * 14, hy = t.y - 105;
      FX.ring(hx, hy, { r0: 8, r1: 90, color: '#cfe9ff', life: 0.22, w: 4 });
      FX.sparks(hx, hy, 12, { color: '#ffffff', speed: 700, angle: this.facing > 0 ? 0 : Math.PI, spread: 1.2 });
      t.takeHit({ attacker: this, dmg: 18, hitstop: 0.09, shake: 9, numColor: '#bfe6ff' });
      Snd.sfx.hit();
      if (t.state === 'ko' || !this.holding) return;
      yield 0.17;
      this.setPose('punchB', 30);
      yield 0.05;
    }
    this.setPose('highKick', 60);
    this.release();
    t.takeHit({ attacker: this, dmg: 36, kbx: 220, kby: -1550, launch: true, hitstop: 0.12, shake: 16, numColor: '#9fd8ff', dir: this.facing });
    Snd.sfx.heavy();
    FX.ring(t.x, t.y - 60, { r0: 10, r1: 150, sy: 0.4, color: '#bfe6ff', life: 0.3, w: 5 });
    FX.speedLines(0.3, '#dff3ff');
    this.noGravity = false;
    yield 0.35;
  }

  *counter() {
    this.setPose('counterStance', 26);
    this.counterWindow = 1.0;
    this.counterTriggered = false;
    this.counterTarget = null;
    this.infinityFx = 1;
    Snd.sfx.counter();
    FX.callout('無下限', 'SONSUZLUK · KARŞI SALDIRI', { color: '#2a6bd8', side: this.side, size: 60, dur: 1.0, style: 'small' });
    try {
      yield { until: () => this.counterTriggered || this.counterWindow <= 0, max: 1.05 };
    } finally {
      this.infinityFx = 0;
    }
    if (!this.counterTriggered) {
      this.counterWindow = 0;
      this.setPose('gojoIdle', 14);
      yield 0.18;
      return;
    }
    const a = this.counterTarget;
    this.counterTriggered = false;
    this.invuln = Math.max(this.invuln, 1.3);
    if (!a || a.state === 'ko') {
      yield 0.2;
      return;
    }
    this.game.hitstop = Math.max(this.game.hitstop, 0.12);
    FX.impact(0.1, 'blue');
    Snd.sfx.blue();
    Snd.say('蒼', 'Ao', { pitch: 1 });
    FX.callout('蒼', 'KARŞI SALDIRI!', { color: '#1f5fe0', side: this.side, size: 86, dur: 1.0 });
    const G = this.game.arena.ground;
    if (!this.grab(a, (a.x - this.x) * this.facing, a.y - this.y, 'held')) return;
    const hd = this.holding;
    this.spawn(new BlueCrush(this, a));
    const oy0 = hd.oy;
    let tt = 0;
    while (tt < 0.22) {
      yield null;
      tt += this.game.dt;
      if (!this.holding) return;
      hd.oy = lerp(oy0, G - this.y, ease.inCubic(Math.min(1, tt / 0.22)));
    }
    a.setPose('crushed', 40);
    Snd.sfx.crush();
    FX.shake(18);
    FX.ring(a.x, G, { r0: 20, r1: 230, sy: 0.22, color: '#7fc8ff', life: 0.45, w: 7 });
    FX.debris(a.x, G, 18, { speed: 700 });
    this.game.addScar({ type: 'crater', x: a.x, y: G, r: 100, life: 5 });
    a.takeHit({ attacker: this, dmg: 40, hitstop: 0.1, numColor: '#7fc8ff', uncounterable: true });
    if (a.state === 'ko') return;
    yield 0.3;
    const behind = sign(a.x - this.x);
    this.release();
    if (a.state === 'hurt') {
      a.stun = 0.6;
      a.setPose('crushed', 99);
    }
    this.teleportFx(this.x, this.y, '#7fd0ff');
    Snd.sfx.teleport();
    this.x = clamp(a.x + behind * 85, this.game.arena.left, this.game.arena.right);
    this.y = a.y;
    this.vy = 0;
    this.face(a);
    this.teleportFx(this.x, this.y, '#7fd0ff');
    this.setPose('kickWind', 40);
    yield 0.08;
    this.setPose('bigKick', 60);
    a.takeHit({ attacker: this, dmg: 72, kbx: 1300, kby: -620, launch: true, spin: 12, hitstop: 0.14, shake: 20, numColor: '#9fd8ff', dir: this.facing, uncounterable: true });
    Snd.sfx.heavy();
    FX.ring(a.x, a.cy, { r0: 20, r1: 200, color: '#9fd8ff', life: 0.35, w: 7 });
    FX.speedLines(0.3, '#dff3ff');
    yield 0.35;
  }

  *teleport() {
    const A = this.game.arena;
    const c = this.ctrl;
    let tx, ty;
    if (c.aim) {
      tx = c.aim.x;
      ty = c.aim.y;
    } else {
      const e = this.nearestEnemy();
      tx = e ? e.x - e.facing * 95 : this.x + this.facing * 300;
      ty = A.ground;
    }
    tx = clamp(tx, A.left, A.right);
    ty = clamp(ty, A.ground - 560, A.ground);
    this.teleportFx(this.x, this.y, '#7fd0ff');
    Snd.sfx.teleport();
    this.after.push({ x: this.x, y: this.y, facing: this.facing, pose: { ...this.pose }, life: 0.35, max: 0.35, color: '#7fd0ff', onGround: this.onGround, state: 'idle' });
    this.x = tx;
    this.y = ty;
    this.vx = 0;
    this.vy = 0;
    this.onGround = ty >= A.ground - 1;
    this.invuln = Math.max(this.invuln, 0.2);
    this.teleportFx(this.x, this.y, '#7fd0ff');
    this.setPose('blink', 50);
    this.face(this.nearestEnemy());
    if (!this.onGround) {
      this.noGravity = true;
      this.setPose('fall', 20);
      yield 0.22;
      this.noGravity = false;
      return;
    }
    yield 0.1;
  }

  *ultVoid() {
    const A = this.game.arena;
    this.invuln = Math.max(this.invuln, 4.2);
    this.game.startCinematic(this, { zoom: 1.45 });
    const t0 = this.nearestEnemy();
    this.face(t0);
    this.setPose('mudraGojo', 14);
    yield 0.25;
    this.blind = false;
    FX.glow(this.headWorld().x, this.headWorld().y, 90, '#8fe8ff', 0.4);
    Snd.sfx.domain();
    Snd.say('領域展開', 'Ryouiki tenkai', { pitch: 0.95, rate: 0.9 });
    FX.callout('領域展開', 'RYŌIKI TENKAI · ALAN AÇILIMI', { color: '#7fd0ff', style: 'domain', size: 124, dur: 1.4 });
    yield 1.05;
    Snd.sfx.voidOpen();
    this.game.setDomain(new VoidDomain(this));
    Snd.say('無量空処', 'Muryoukuusho', { pitch: 0.95, rate: 0.9 });
    FX.callout('無量空処', 'MURYŌKŪSHO · SONSUZ BOŞLUK', { color: '#9fe0ff', style: 'domain', size: 132, dur: 1.6 });
    FX.flash('#ffffff', 0.8);
    for (const e of this.enemies()) e.paralyze(6.2);
    yield 1.4;
    FX.callout('0.2秒', '0.2 SANİYE', { color: '#1f5fe0', style: 'small', side: 0, size: 60, dur: 1.0, yOff: -40 });
    if (this.game.domain && this.game.domain.close) this.game.domain.close();
    yield 0.3;
    this.game.endCinematic(this);
    // 3 saniyelik koşu
    this.runMode = 3.0;
    let dir = this.facing;
    const lastHit = new Map();
    Snd.sfx.dash();
    this.keepVel = true;
    this.trail = '#7fd0ff';
    try {
      while (this.runMode > 0) {
        yield null;
        const dt = this.game.dt;
        this.runMode -= dt;
        const c = this.ctrl;
        if (c.move) dir = sign(c.move);
        if (this.x <= A.left + 4) dir = 1;
        if (this.x >= A.right - 4) dir = -1;
        this.facing = dir;
        this.vx = dir * 1500;
        this.runCycle(dt, 2.2, 22);
        FX.speedLines(0.1, '#dff3ff');
        if (Math.random() < 0.4) FX.dust(this.x, this.y, 1, { speed: 120 });
        for (const e of this.enemies()) {
          if (Math.abs(e.x - this.x) < 85 && Math.abs(e.y - this.y) < 220) {
            const last = lastHit.get(e) ?? -1;
            if (this.game.time - last > 0.12) {
              lastHit.set(e, this.game.time);
              const hy = e.y - rand(80, 170);
              e.takeHit({ attacker: this, dmg: 13, kbx: 0, hitstop: 0.02, shake: 4, unblockable: true, uncounterable: true, otg: true, numColor: '#bfe6ff' });
              FX.sparks(e.x, hy, 8, { color: '#dff3ff', speed: 650, size: 2.4 });
              FX.glow(e.x, hy, 50, '#7fd0ff', 0.12);
              Snd.sfx.punch();
            }
          }
        }
      }
    } finally {
      this.keepVel = false;
      this.trail = null;
      this.runMode = 0;
    }
    this.vx = dir * 200;
    this.purpleReady = true;
    this.purpleTime = 8;
    FX.callout('茈', '1 / G · HOLLOW PURPLE', { color: '#7a2cff', style: 'small', side: this.side, size: 64, dur: 1.4 });
    this.setPose('gojoIdle', 14);
    yield 0.1;
  }

  *purple() {
    this.purpleReady = false;
    this.invuln = Math.max(this.invuln, 3.2);
    this.game.startCinematic(this, { zoom: 1.35 });
    const t = this.nearestEnemy();
    this.face(t);
    this.lockFacing = true;
    this.setPose('purpleSpread', 14);
    this.orbBlue = 0.01;
    this.orbRed = 0.01;
    this.orbMerge = 0;
    Snd.sfx.purpleCharge();
    Snd.say('九綱、偏光、烏と声明、表裏の間', 'Kyuukou, henkou, karasu to shoumyou, hyouri no hazama', { pitch: 0.95, rate: 1.35 });
    const chant = [['九綱', 'DOKUZ İP'], ['偏光', 'KUTUPLANMIŞ IŞIK'], ['烏と声明', 'KARGA VE BİLDİRİ'], ['表裏の間', 'ÖN İLE ARKA ARASI']];
    for (let i = 0; i < 4; i++) {
      FX.callout(chant[i][0], chant[i][1], { color: '#5a1cc0', style: 'small', side: this.side, size: 54, dur: 0.7 });
      for (let k = 0; k < 6; k++) {
        this.orbBlue = this.orbRed = Math.min(1, this.orbBlue + 1 / 24);
        yield 0.055;
      }
    }
    this.setPose('purpleMerge', 12);
    for (let i = 0; i < 12; i++) {
      this.orbMerge = (i + 1) / 12;
      if (i % 3 === 0) FX.shake(4);
      yield 0.05;
    }
    Snd.say('虚式、茈', 'Kyoshiki, Murasaki', { pitch: 0.95 });
    FX.callout('虚式「茈」', 'HOLLOW PURPLE · %200', { color: '#9a3cff', style: 'domain', size: 124, dur: 1.8 });
    FX.flash('#d0a0ff', 0.6);
    yield 0.35;
    this.game.endCinematic(this);
    this.setPose('purpleFire', 50);
    this.orbBlue = this.orbRed = this.orbMerge = 0;
    this.spawn(new PurpleOrb(this, this.x + this.facing * 150, this.y - 130, this.facing));
    Snd.sfx.purpleFire();
    FX.shake(30);
    FX.impact(0.12, 'purple');
    this.vx = -this.facing * 320;
    yield 0.9;
    this.endUlt();
  }

  // ---------------------------------------------------------------------- yapay zekâ
  aiThink(ai, t, dist) {
    const r = Math.random;
    const ready = (k) => {
      const s = this.getSkill(k);
      return !!s && (!s.ready || s.ready()) && (s.ignoreCd || this.cd[k] <= 0);
    };
    if (this.purpleReady) return ai.press('1');
    if (this.ultOn) return false;
    if (this.ult >= 100 && r() < 0.5 && dist < 900) return ai.press('G');
    if (this.aoFollow > 0) return ai.press('1');
    if (dist < 220 && t.state === 'action' && ready('4') && r() < 0.35) return ai.press('4');
    if (dist < 180 && ready('3') && r() < 0.4) return ai.press('3');
    if (dist < 540 && dist > 160 && ready('1') && r() < 0.35) return ai.press('1');
    if (dist > 240 && ready('2') && r() < 0.35) return ai.press('2');
    if (dist > 600 && ready('R') && r() < 0.3) {
      ai.aim = { x: t.x - t.facing * 95, y: this.game.arena.ground };
      return ai.press('R');
    }
    return false;
  }

  // ---------------------------------------------------------------------- çizim
  drawTorso(ctx, sk, pal, ghost) {
    const t = sk.t;
    const n = { x: Math.cos(t), y: Math.sin(t) };
    const u = { x: Math.sin(t), y: -Math.cos(t) };
    const N = sk.neck;
    const P = (bx, by, du, dn) => ({ x: bx + u.x * du + n.x * dn, y: by + u.y * du + n.y * dn });
    const pts = [P(0, 0, -16, -17), P(0, 0, -16, 17), P(0, 0, 4, 16), P(N.x, N.y, -16, 18), P(N.x, N.y, -2, 12), P(N.x, N.y, -2, -12), P(N.x, N.y, -18, -18), P(0, 0, 4, -16)];
    ctx.fillStyle = pal.cloth;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (ghost) return;
    ctx.fillStyle = pal.clothShade;
    ctx.beginPath();
    [P(0, 0, -16, -17), P(0, 0, -16, -4), P(N.x, N.y, -18, -6), P(N.x, N.y, -18, -18), P(0, 0, 4, -16)].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    // fermuar ve düğmeler
    ctx.strokeStyle = 'rgba(160,180,230,0.35)';
    ctx.lineWidth = 1.5;
    const z1 = P(N.x, N.y, -4, 9), z2 = P(0, 0, -14, 10);
    ctx.beginPath();
    ctx.moveTo(z1.x, z1.y);
    ctx.lineTo(z2.x, z2.y);
    ctx.stroke();
    ctx.fillStyle = '#c9b46a';
    for (const k of [0.2, 0.5, 0.8]) {
      ctx.beginPath();
      ctx.arc(lerp(z1.x, z2.x, k), lerp(z1.y, z2.y, k), 1.6, 0, TAU);
      ctx.fill();
    }
    // kemer
    ctx.fillStyle = '#0b0d16';
    const b = [P(0, 0, -6, -17), P(0, 0, -6, 17), P(0, 0, 2, 17), P(0, 0, 2, -17)];
    ctx.beginPath();
    b.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }

  drawHead(ctx, sk, pal, ghost) {
    const R = 16;
    ctx.save();
    ctx.translate(sk.head.x, sk.head.y);
    ctx.rotate(sk.ha);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pal.line;
    ctx.fillStyle = pal.hairShade;
    this.hairPath(ctx, GOJO_HAIR_BACK, R + 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 9);
    ctx.quadraticCurveTo(11, 17, 16, 8);
    ctx.lineTo(16, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.quadraticCurveTo(11, 17, 16, 8);
    ctx.stroke();
    if (!ghost) {
      ctx.fillStyle = pal.skinShade;
      ctx.beginPath();
      ctx.ellipse(-3, 3, 3.5, 5, 0, 0, TAU);
      ctx.fill();
      if (this.blind) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, R + 1.5, 0, TAU);
        ctx.rect(R - 2, -10, 6, 12);
        ctx.clip();
        ctx.fillStyle = pal.band;
        ctx.fillRect(-R - 3, -9.5, R * 2 + 8, 10);
        ctx.restore();
        // düğüm kuyrukları
        const wv = Math.sin(this.idleT * 5) * 3;
        ctx.fillStyle = pal.band;
        ctx.beginPath();
        ctx.moveTo(-R + 1, -7);
        ctx.quadraticCurveTo(-R - 10, -4 + wv, -R - 18, 6 + wv);
        ctx.lineTo(-R - 13, 8 + wv);
        ctx.quadraticCurveTo(-R - 6, 0, -R + 1, -1);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-R + 1, -5);
        ctx.quadraticCurveTo(-R - 6, 2 - wv, -R - 10, 13 - wv);
        ctx.lineTo(-R - 6, 13 - wv);
        ctx.quadraticCurveTo(-R - 2, 3, -R + 2, 0);
        ctx.fill();
      } else {
        // Altı Göz
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(5, -3);
        ctx.quadraticCurveTo(10, -7.5, 15.5, -3.5);
        ctx.quadraticCurveTo(10, -0.5, 5, -3);
        ctx.fill();
        ctx.fillStyle = pal.eye;
        ctx.beginPath();
        ctx.arc(11.3, -3.6, 2.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(12, -4.3, 0.9, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#f4f7ff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(4.5, -4);
        ctx.quadraticCurveTo(10, -9, 16, -4.5);
        ctx.stroke();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        Glow.draw(ctx, 11, -3.6, 14, '#5fd8ff', 0.8);
        ctx.restore();
      }
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(10, 10.5);
      ctx.quadraticCurveTo(13, 11.5, 15, 9.5);
      ctx.stroke();
    }
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2.5;
    this.hairPath(ctx, GOJO_HAIR, R);
    ctx.fill();
    ctx.stroke();
    if (!ghost) {
      ctx.strokeStyle = 'rgba(150,170,220,0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, -16);
      ctx.lineTo(-6, -30);
      ctx.moveTo(6, -16);
      ctx.lineTo(8, -28);
      ctx.stroke();
    }
    ctx.restore();
    // yüksek yaka
    const t = sk.t, N = sk.neck;
    const n = { x: Math.cos(t), y: Math.sin(t) }, u = { x: Math.sin(t), y: -Math.cos(t) };
    const P = (du, dn) => ({ x: N.x + u.x * du + n.x * dn, y: N.y + u.y * du + n.y * dn });
    const col = [P(-4, -12), P(-4, 12), P(12, 11), P(14, 4), P(13, -11)];
    ctx.fillStyle = pal.cloth;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    col.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawAura(ctx) {
    if (this.ultOn || this.runMode > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      Glow.draw(ctx, this.x, this.y - 115, 180, '#4aa8ff', 0.3 + 0.08 * Math.sin(this.idleT * 9));
      ctx.restore();
    }
  }

  drawOverlay(ctx) {
    if (this.state === 'paralyzed') drawParalyze(ctx, this);
    const t = this.idleT;
    if (this.infinityFx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cx = this.x, cy = this.y - 115;
      for (let i = 0; i < 3; i++) {
        const r = 80 + i * 18 + Math.sin(t * 6 + i) * 6;
        ctx.strokeStyle = rgba('#7fd0ff', 0.35 - i * 0.08);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const a = (k / 6) * TAU + t * (0.6 + i * 0.3);
          const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 1.35;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      Glow.draw(ctx, cx, cy, 140, '#4aa8ff', 0.2);
      ctx.restore();
    }
    if (this.chargeRed > 0) {
      const h = this.handWorld('f');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = 10 + this.chargeRed * 18;
      Glow.draw(ctx, h.x + this.facing * 6, h.y, r * 4, '#ff1a3a', 0.8);
      ctx.fillStyle = '#ffd0d8';
      ctx.beginPath();
      ctx.arc(h.x + this.facing * 6, h.y, r * 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (this.orbBlue > 0 || this.orbRed > 0) {
      const hf = this.handWorld('f'), hb = this.handWorld('b');
      const m = ease.inOut(this.orbMerge);
      const cx = this.x + this.facing * 70, cy = this.y - 135;
      const bx = lerp(hb.x, cx, m), by = lerp(hb.y - 10, cy, m);
      const rx = lerp(hf.x, cx, m), ry = lerp(hf.y - 10, cy, m);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rb = 16 + this.orbBlue * 14;
      Glow.draw(ctx, bx, by, rb * 4, '#2a7bff', 0.8 * (1 - m * 0.5));
      Glow.draw(ctx, rx, ry, rb * 4, '#ff1a3a', 0.8 * (1 - m * 0.5));
      ctx.fillStyle = '#cfe6ff';
      ctx.beginPath();
      ctx.arc(bx, by, rb * 0.55, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd6dc';
      ctx.beginPath();
      ctx.arc(rx, ry, rb * 0.55, 0, TAU);
      ctx.fill();
      if (m > 0.3) {
        const pr = 20 + m * 60;
        Glow.draw(ctx, cx, cy, pr * 3, '#9a3cff', m);
        Glow.draw(ctx, cx, cy, pr * 1.2, '#f0d8ff', m);
        ctx.strokeStyle = rgba('#ffffff', 0.6 * m);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, pr, t * 8, t * 8 + 4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ===========================================================================
// Gojo efekt/mermi varlıkları
// ===========================================================================

class BlueOrb {
  constructor(owner, x, y) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.t = 0;
    this.life = 0.8;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    for (let i = 0; i < 3; i++) {
      const a = rand(0, TAU), d = rand(120, 190);
      FX.add({ type: 'spark', x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d, vx: -Math.cos(a) * d * 3.2, vy: -Math.sin(a) * d * 3.2, life: 0.28, size: 2, color: i ? '#6fb8ff' : '#ffffff', len: 0.03, add: true });
    }
    if (Math.random() < 0.3) FX.debris(this.x + rand(-60, 60), this.owner.game.arena.ground, 1, { speed: 300, size: 5 });
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    const k = this.t / this.life;
    const a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.7) / 0.3);
    const r = 46 * (0.85 + 0.15 * Math.sin(this.t * 30));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, this.x, this.y, 170, '#1a5aff', 0.6 * a);
    ctx.strokeStyle = rgba('#9fd8ff', 0.7 * a);
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * (1.3 + i * 0.35), this.t * (9 - i) + i, this.t * (9 - i) + i + 2.2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#01081c', 0.92 * a);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.75, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#4aa8ff', a);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.78, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.9 * a);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

class RedOrb {
  constructor(owner, x, y, ang) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.ang = ang;
    this.speed = 1550;
    this.t = 0;
    this.life = 0.75;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    this.x += c * this.speed * dt;
    this.y += s * this.speed * dt;
    FX.add({ type: 'spark', x: this.x + rand(-8, 8), y: this.y + rand(-8, 8), vx: -c * rand(200, 500), vy: -s * rand(200, 500) + rand(-80, 80), life: 0.25, size: 3, color: '#ff3050', len: 0.04, add: true });
    const A = this.owner.game.arena;
    if (this.y > A.ground - 4) this.explode(null);
    for (const f of this.owner.enemies()) {
      if (!circleRectHit(this.x, this.y, 36, f.hurtbox())) continue;
      this.explode(f);
      break;
    }
    if (!this.dead && this.t > this.life) {
      this.dead = true;
      FX.glow(this.x, this.y, 80, '#ff2040', 0.3);
    }
  }
  explode(f) {
    if (this.dead) return;
    this.dead = true;
    let r = 'none';
    if (f) r = f.takeHit({ attacker: this.owner, dmg: 95, kbx: 1650, kby: -470, launch: true, spin: 16, hitstop: 0.15, shake: 32, numColor: '#ff6070', dir: sign(Math.cos(this.ang)) });
    const big = r === 'hit' || r === 'ko';
    for (let i = 0; i < 3; i++) FX.ring(this.x, this.y, { r0: 10, r1: 160 + i * 90, color: i ? '#ff3050' : '#ffffff', life: 0.35 + i * 0.1, w: 8 });
    FX.glow(this.x, this.y, 220, '#ff1a3a', 0.4);
    FX.sparks(this.x, this.y, 36, { color: '#ff5070', speed: 1200, size: 3 });
    FX.smoke(this.x, this.y, 6, { color: '#3a0a12', size: 34 });
    Snd.sfx.explode();
    if (big) {
      FX.impact(0.1, 'red');
      FX.flash('#ff3050', 0.25);
    }
  }
  draw(ctx) {
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,40,70,0.45)';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(this.x - c * 110, this.y - s * 110);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    Glow.draw(ctx, this.x, this.y, 100, '#ff1a3a', 0.9);
    ctx.fillStyle = '#ffe0e6';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,110,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 24, this.t * 20, this.t * 20 + 3.5);
    ctx.stroke();
    ctx.restore();
  }
}

class BlueCrush {
  constructor(owner, target) {
    this.owner = owner;
    this.target = target;
    this.t = 0;
    this.life = 0.65;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    const k = this.t / this.life;
    const a = 1 - Math.max(0, (k - 0.6) / 0.4);
    const x = this.target.x, y = lerp(this.target.y - 260, this.target.y - 70, ease.inCubic(Math.min(1, k * 2.2)));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, x, y, 200, '#1a5aff', 0.6 * a);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#020a1e', 0.85 * a);
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#5ab8ff', a);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }
}

class PurpleOrb {
  constructor(owner, x, y, dir) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.t = 0;
    this.R = 120;
    this.speed = 820;
    this.life = 3.4;
    this.tick = 0;
    this.inside = new Map();
    this.finished = new Set();
    this.dead = false;
    this.scarX = x;
  }
  update(dt) {
    const game = this.owner.game, A = game.arena, G = A.ground;
    this.t += dt;
    this.R = Math.min(190, 120 + this.t * 140);
    this.speed += 260 * dt;
    this.x += this.dir * this.speed * dt;
    // zemin oyuğu
    if (Math.abs(this.x - this.scarX) > 60) {
      game.addScar({ type: 'trench', x1: this.scarX, x2: this.x, y: G, w: this.R * 0.9, life: 10 });
      this.scarX = this.x;
    }
    FX.debris(this.x - this.dir * this.R * 0.6, G, 2, { speed: 900, color: '#3a3446' });
    for (let i = 0; i < 4; i++) {
      const a = rand(0, TAU);
      FX.add({ type: 'spark', x: this.x + Math.cos(a) * this.R, y: this.y + Math.sin(a) * this.R, vx: -this.dir * rand(200, 600) + Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.35, size: 3, color: pick(['#c58bff', '#ffffff', '#ff4a8a', '#4a8aff']), len: 0.04, add: true });
    }
    this.tick -= dt;
    const doTick = this.tick <= 0;
    if (doTick) this.tick = 0.07;
    for (const f of this.owner.enemies()) {
      if (this.finished.has(f)) continue;
      const hit = circleRectHit(this.x, this.y, this.R * 0.9, f.hurtbox());
      if (!hit) continue;
      const acc = (this.inside.get(f) || 0) + dt;
      this.inside.set(f, acc);
      // hedefi kürenin içinde sürükle
      f.x = damp(f.x, this.x, 10, dt);
      if (doTick) {
        f.takeHit({ attacker: this.owner, dmg: 16, kbx: 0, stun: 0.4, unblockable: true, uncounterable: true, otg: true, force: true, shake: 3, numColor: '#d8b0ff' });
        FX.sparks(f.x, f.cy, 6, { color: '#e0c0ff', speed: 600 });
      }
      if (acc > 0.7) this.finishTarget(f);
    }
    const out = this.x < A.left - 500 || this.x > A.right + 500;
    if (out || this.t > this.life) {
      for (const f of this.inside.keys()) if (!this.finished.has(f)) this.finishTarget(f);
      this.dead = true;
      FX.flash('#e0c0ff', 0.5);
    }
  }
  finishTarget(f) {
    this.finished.add(f);
    if (f.state === 'ko') return;
    f.takeHit({ attacker: this.owner, dmg: 120, launch: true, kbx: 1400, kby: -950, spin: 18, breakParalyze: true, unblockable: true, uncounterable: true, otg: true, force: true, hitstop: 0.2, shake: 30, numColor: '#c58bff', dir: this.dir });
    FX.impact(0.12, 'purple');
    FX.flash('#ffffff', 0.5);
    Snd.sfx.explode();
    for (let i = 0; i < 3; i++) FX.ring(f.x, f.cy, { r0: 20, r1: 260 + i * 140, color: i ? '#b070ff' : '#ffffff', life: 0.5 + i * 0.12, w: 10 });
  }
  draw(ctx) {
    const R = this.R;
    const a = this.t < 0.15 ? this.t / 0.15 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // iz
    const gr = ctx.createLinearGradient(this.x - this.dir * R * 4, 0, this.x, 0);
    gr.addColorStop(0, 'rgba(120,40,255,0)');
    gr.addColorStop(1, 'rgba(160,80,255,0.55)');
    ctx.fillStyle = gr;
    ctx.fillRect(Math.min(this.x, this.x - this.dir * R * 4), this.y - R * 0.8, R * 4, R * 1.6);
    Glow.draw(ctx, this.x, this.y, R * 2.6, '#7a20ff', 0.75 * a);
    ctx.globalCompositeOperation = 'source-over';
    const body = ctx.createRadialGradient(this.x - R * 0.25, this.y - R * 0.25, R * 0.1, this.x, this.y, R);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.3, '#ecd4ff');
    body.addColorStop(0.7, '#9b30ff');
    body.addColorStop(1, '#3a0070');
    ctx.globalAlpha = 0.92 * a;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(this.x, this.y, R, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const rr = R * (0.35 + i * 0.1);
      const st = this.t * (6 + i) * (i % 2 ? 1 : -1);
      ctx.strokeStyle = i % 2 ? 'rgba(255,60,110,0.7)' : 'rgba(70,140,255,0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, rr, st, st + 2.4);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, R * (1.04 + 0.03 * Math.sin(this.t * 40)), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

// ===========================================================================
// Alan Açılımı: Muryōkūsho (Sonsuz Boşluk) — 0.2 saniyelik alan
// ===========================================================================

class VoidDomain {
  constructor(owner) {
    this.owner = owner;
    this.kind = 'void';
    this.t = 0;
    this.closing = -1;
    this.stars = [];
    for (let i = 0; i < 260; i++) this.stars.push({ a: rand(0, TAU), d: rand(0.02, 1.2), s: rand(0.2, 0.9), size: rand(0.6, 2.4), c: pick(['#ffffff', '#cfe6ff', '#a8c8ff', '#ffe6ff']) });
    this.neb = [];
    for (let i = 0; i < 7; i++) this.neb.push({ x: rand(0.1, 0.9), y: rand(0.1, 0.9), r: rand(0.18, 0.4), c: pick(['#3a2aff', '#8a2aff', '#1a8aff', '#ff4ad8']), p: rand(0, TAU) });
    this.glyphs = [];
    for (let i = 0; i < 40; i++) this.glyphs.push({ a: rand(0, TAU), d: rand(0, 1), s: rand(0.3, 0.8), ch: pick(['∞', '情', '報', '無', '量', '空', '処', '0', '1']) });
  }
  get alpha() {
    let a = Math.min(1, this.t / 0.2);
    if (this.closing >= 0) a *= Math.max(0, 1 - this.closing / 0.3);
    return a;
  }
  get hideStage() { return this.alpha > 0.98; }
  close() {
    if (this.closing >= 0) return;
    this.closing = 0;
    const g = this.owner.game;
    FX.flash('#ffffff', 1);
    FX.shatter(g.cam.x, g.cam.y, Math.max(g.VW, g.VH) * 1.1 / g.cam.zoom, { n: 5, dur: 0.6 });
    Snd.sfx.shatter();
  }
  update(dt, game) {
    this.t += dt;
    for (const s of this.stars) {
      s.d += s.s * dt * (0.25 + s.d) * 1.4;
      if (s.d > 1.3) {
        s.d = 0.02;
        s.a = rand(0, TAU);
      }
    }
    for (const g of this.glyphs) {
      g.d += g.s * dt * 0.6;
      if (g.d > 1.1) {
        g.d = 0;
        g.a = rand(0, TAU);
      }
    }
    if (this.closing >= 0) {
      this.closing += dt;
      if (this.closing > 0.3 && game.domain === this) game.domain = null;
    }
  }
  drawBack(ctx, VW, VH) {
    const a = this.alpha;
    if (a <= 0) return;
    const t = this.t;
    const cx = VW / 2, cy = VH * 0.45;
    const R = Math.hypot(VW, VH) * 0.6;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#01010a';
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'lighter';
    for (const n of this.neb) Glow.draw(ctx, n.x * VW + Math.cos(t * 0.3 + n.p) * 40, n.y * VH + Math.sin(t * 0.4 + n.p) * 30, n.r * VW, n.c, 0.35 * a);
    // sarmal galaksi
    for (let arm = 0; arm < 3; arm++) {
      for (let i = 0; i < 70; i++) {
        const k = i / 70;
        const ang = arm * (TAU / 3) + k * 5 + t * 0.6;
        const rr = k * R * 0.55;
        ctx.fillStyle = rgba(k < 0.3 ? '#ffffff' : '#9fc8ff', 0.8 * (1 - k) * a);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.55, 2.2 * (1 - k) + 0.6, 0, TAU);
        ctx.fill();
      }
    }
    Glow.draw(ctx, cx, cy, 260, '#ffffff', 0.7 * a);
    Glow.draw(ctx, cx, cy, 90, '#ffffff', a);
    // ışık hızı yıldızları
    ctx.lineCap = 'round';
    for (const s of this.stars) {
      const r1 = s.d * R, r0 = Math.max(0, r1 - s.d * s.d * 120);
      ctx.strokeStyle = rgba(s.c, Math.min(1, s.d * 1.5) * a);
      ctx.lineWidth = s.size * (0.4 + s.d);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0);
      ctx.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const g of this.glyphs) {
      const rr = g.d * R * 0.8;
      ctx.globalAlpha = a * Math.sin(Math.PI * Math.min(1, g.d)) * 0.6;
      ctx.fillStyle = '#dff0ff';
      ctx.font = `800 ${10 + g.d * 26}px ${JP_FONT}`;
      ctx.fillText(g.ch, cx + Math.cos(g.a) * rr, cy + Math.sin(g.a) * rr);
    }
    ctx.restore();
  }
  drawWorldBack() {}
  drawWorldFront() {}
  drawScreen() {}
}
