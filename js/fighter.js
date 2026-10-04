'use strict';
// ---------------------------------------------------------------------------
// Savaşçı temel sınıfı: fizik, durum makinesi, yetenek (coroutine) çalıştırıcı,
// hasar alma, tutma/fırlatma ve iskelet tabanlı anime tarzı çizim.
// Pozlar derece cinsinden yazılır; 0 = uzuv dümdüz aşağı, + = ileri doğru.
// ---------------------------------------------------------------------------

const GRAVITY = 2700;

const BASE_POSE = { t: 4, h: 0, fu: 12, fl: 22, bu: 18, bl: 26, xu: 35, xl: 60, yu: 45, yl: 70, lfu: 16, lfl: -18, lbu: -14, lbl: -10, rot: 0, drop: 0 };
const NON_ANGLE = new Set(['drop']);

const POSE_DEF = {
  idle: { t: 6, h: 0, fu: 20, fl: 95, bu: 34, bl: 100, lfu: 18, lfl: -22, lbu: -16, lbl: -14 },
  gojoIdle: { t: 2, h: 3, fu: -4, fl: 34, bu: -6, bl: 32, lfu: 10, lfl: -6, lbu: -10, lbl: -4, xu: 20, xl: 40, yu: 20, yl: 40 },
  sukunaIdle: { t: 0, h: -6, fu: 10, fl: 18, bu: 14, bl: 22, lfu: 14, lfl: -8, lbu: -14, lbl: -6, xu: 40, xl: 70, yu: 30, yl: 80 },
  jumpUp: { t: 10, fu: -30, fl: 60, bu: 40, bl: 90, lfu: 70, lfl: -100, lbu: 20, lbl: -80 },
  fall: { t: 4, fu: 60, fl: 40, bu: -40, bl: 50, lfu: 30, lfl: -40, lbu: -10, lbl: -30 },
  crouch: { t: 26, fu: 30, fl: 80, bu: 40, bl: 90, lfu: 62, lfl: -104, lbu: 12, lbl: -100 },
  dash: { t: 38, h: 10, fu: -50, fl: 20, bu: -60, bl: 20, lfu: 50, lfl: -70, lbu: -40, lbl: -50 },
  block: { t: -6, h: 6, fu: 70, fl: 120, bu: 60, bl: 128, lfu: 26, lfl: -32, lbu: -26, lbl: -16 },
  punchA: { t: 18, h: 4, fu: 88, fl: 0, bu: 20, bl: 110, lfu: 32, lfl: -22, lbu: -32, lbl: -10 },
  punchB: { t: 24, h: 4, fu: 10, fl: 120, bu: 86, bl: 0, lfu: 36, lfl: -26, lbu: -36, lbl: -6 },
  kickA: { t: -16, fu: 40, fl: 80, bu: -30, bl: 60, lfu: 96, lfl: -4, lbu: -10, lbl: -10 },
  kickB: { t: -24, h: -4, fu: 60, fl: 60, bu: -20, bl: 70, lfu: 78, lfl: 4, lbu: -12, lbl: -8 },
  highKick: { t: -36, h: -12, fu: -40, fl: 30, bu: 30, bl: 60, lfu: 160, lfl: 0, lbu: -6, lbl: -10 },
  roundKick: { t: -30, h: -6, fu: 70, fl: 50, bu: -40, bl: 60, lfu: 110, lfl: -20, lbu: -14, lbl: -6 },
  stomachPunch: { t: 28, h: 6, fu: 66, fl: 30, bu: 20, bl: 100, lfu: 42, lfl: -44, lbu: -40, lbl: -10 },
  bigKick: { t: -32, h: -6, fu: 50, fl: 60, bu: -40, bl: 50, lfu: 100, lfl: 0, lbu: -16, lbl: -10 },
  kickWind: { t: 10, fu: 40, fl: 70, bu: 50, bl: 80, lfu: 70, lfl: -110, lbu: -14, lbl: -10 },
  hurt: { t: -24, h: -20, fu: -40, fl: 60, bu: -60, bl: 70, lfu: 22, lfl: -30, lbu: -22, lbl: -20 },
  hurt2: { t: 42, h: 28, fu: 40, fl: 80, bu: 50, bl: 90, lfu: 24, lfl: -34, lbu: -22, lbl: -30 },
  launched: { t: -26, h: -30, fu: -120, fl: 20, bu: -150, bl: 20, lfu: 40, lfl: -30, lbu: -20, lbl: -40 },
  down: { t: 0, h: 6, fu: 20, fl: 10, bu: 30, bl: 20, lfu: 4, lfl: -4, lbu: 0, lbl: 0, rot: -90, drop: 72, xu: 20, xl: 10, yu: 30, yl: 10 },
  getup: { t: 30, h: 10, fu: 60, fl: 30, bu: 40, bl: 30, lfu: 70, lfl: -120, lbu: 10, lbl: -110 },
  ko: { t: 0, h: 10, fu: 160, fl: 10, bu: 170, bl: 10, lfu: 8, lfl: -6, lbu: 2, lbl: 0, rot: -90, drop: 72, xu: 120, xl: 10, yu: 140, yl: 10 },
  held: { t: -12, h: -24, fu: -70, fl: 40, bu: -100, bl: 30, lfu: 14, lfl: -16, lbu: -10, lbl: -6 },
  heldHead: { t: -16, h: -40, fu: -80, fl: 40, bu: -110, bl: 30, lfu: 10, lfl: -10, lbu: -14, lbl: -5 },
  crushed: { t: 72, h: 38, fu: 80, fl: 10, bu: 70, bl: 20, lfu: 90, lfl: -150, lbu: 80, lbl: -150 },
  paralyzed: { t: -4, h: -18, fu: 6, fl: 4, bu: 8, bl: 6, lfu: 6, lfl: -2, lbu: -6, lbl: -2 },
  // Sukuna
  slashWind: { t: -12, fu: -70, fl: 40, bu: 40, bl: 80, lfu: 26, lfl: -22, lbu: -26, lbl: -10, xu: -50, xl: 40, yu: 60, yl: 70 },
  slashWide: { t: 24, fu: 106, fl: -6, bu: -30, bl: 40, lfu: 42, lfl: -32, lbu: -36, lbl: -6, xu: 90, xl: 0, yu: -40, yl: 30 },
  slashA: { t: 16, fu: 132, fl: -20, bu: 30, bl: 90, lfu: 30, lfl: -30, lbu: -30, lbl: -10, xu: 70, xl: 10, yu: 100, yl: -10 },
  slashB: { t: 22, fu: 62, fl: 12, bu: 76, bl: 30, lfu: 36, lfl: -34, lbu: -34, lbl: -8, xu: 120, xl: -10, yu: 40, yl: 20 },
  dismantleWind: { t: -6, fu: 152, fl: 30, bu: 20, bl: 60, lfu: 50, lfl: -80, lbu: 10, lbl: -60, xu: 130, xl: 20, yu: 30, yl: 60 },
  dismantleCast: { t: 22, fu: 96, fl: 0, bu: -20, bl: 40, lfu: 40, lfl: -60, lbu: -10, lbl: -40, xu: 80, xl: 0, yu: -30, yl: 40 },
  groundSlamWind: { t: -10, fu: 172, fl: 10, bu: 40, bl: 60, lfu: 30, lfl: -30, lbu: -20, lbl: -10, xu: 150, xl: 10, yu: 30, yl: 60 },
  groundSlam: { t: 64, h: 14, fu: 52, fl: 4, bu: 30, bl: 60, lfu: 76, lfl: -112, lbu: -22, lbl: -58, xu: 40, xl: 10, yu: 20, yl: 40 },
  leap: { t: 14, fu: 142, fl: 20, bu: 40, bl: 60, lfu: 60, lfl: -90, lbu: 0, lbl: -60 },
  grabHigh: { t: 6, fu: 122, fl: 30, bu: 40, bl: 80, lfu: 30, lfl: -60, lbu: -10, lbl: -40 },
  slamDown: { t: 46, h: 10, fu: 70, fl: 6, bu: 30, bl: 60, lfu: 50, lfl: -80, lbu: -10, lbl: -50 },
  bfWind: { t: -6, fu: -52, fl: 112, bu: 50, bl: 90, lfu: 32, lfl: -40, lbu: -32, lbl: -20 },
  dashPunch: { t: 36, h: 6, fu: 92, fl: 0, bu: -40, bl: 70, lfu: 56, lfl: -30, lbu: -56, lbl: -24 },
  heal: { t: 0, h: -16, fu: 36, fl: 110, bu: 40, bl: 106, lfu: 12, lfl: -6, lbu: -12, lbl: -6, xu: 60, xl: 80, yu: 70, yl: 70 },
  mudraSukuna: { t: 0, h: -4, fu: 46, fl: 114, bu: 50, bl: 110, lfu: 22, lfl: -10, lbu: -22, lbl: -10, xu: 30, xl: 100, yu: 40, yl: 95 },
  powerUp: { t: -16, h: -26, fu: 122, fl: 20, bu: 132, bl: 14, lfu: 26, lfl: -16, lbu: -26, lbl: -10, xu: 80, xl: 30, yu: 95, yl: 30 },
  worldCut: { t: 22, h: 4, fu: 100, fl: 0, bu: -60, bl: 20, xu: 80, xl: 10, yu: -40, yl: 30, lfu: 40, lfl: -40, lbu: -30, lbl: -8 },
  worldCutX: { t: 10, h: -6, fu: 150, fl: 0, bu: -60, bl: 20, xu: 40, xl: 0, yu: 130, yl: 10, lfu: 30, lfl: -30, lbu: -30, lbl: -8 },
  incant: { t: 0, h: -6, fu: 62, fl: 120, bu: 60, bl: 116, xu: 30, xl: 90, yu: 40, yl: 80, lfu: 20, lfl: -10, lbu: -20, lbl: -8 },
  fugaKindle: { t: -6, h: -10, fu: 152, fl: 10, bu: 30, bl: 90, xu: 60, xl: 60, yu: 40, yl: 80, lfu: 22, lfl: -10, lbu: -22, lbl: -8 },
  fugaBow: { t: 4, h: 0, fu: 90, fl: 0, bu: 82, bl: 160, xu: 60, xl: 30, yu: 30, yl: 60, lfu: 34, lfl: -12, lbu: -32, lbl: -6 },
  armsCross: { t: 0, h: -10, fu: 60, fl: 120, bu: 66, bl: 114, lfu: 14, lfl: -6, lbu: -14, lbl: -6, xu: 30, xl: 80, yu: 40, yl: 80 },
  // Gojo
  aoCast: { t: 6, fu: 86, fl: 10, bu: -6, bl: 32, lfu: 22, lfl: -16, lbu: -18, lbl: -8 },
  akaCharge: { t: 0, h: 2, fu: 90, fl: 0, bu: 14, bl: 100, lfu: 24, lfl: -18, lbu: -24, lbl: -8 },
  akaFire: { t: -12, h: -4, fu: 102, fl: 0, bu: 10, bl: 60, lfu: 30, lfl: -24, lbu: -30, lbl: -8 },
  counterStance: { t: 0, h: 2, fu: 40, fl: 138, bu: -6, bl: 32, lfu: 12, lfl: -6, lbu: -12, lbl: -4 },
  mudraGojo: { t: 0, h: 0, fu: 58, fl: 132, bu: -6, bl: 32, lfu: 12, lfl: -6, lbu: -12, lbl: -4 },
  purpleSpread: { t: 0, h: -6, fu: 100, fl: 0, bu: -100, bl: 0, lfu: 24, lfl: -10, lbu: -24, lbl: -6 },
  purpleMerge: { t: 10, h: 0, fu: 86, fl: 6, bu: 80, bl: 10, lfu: 30, lfl: -20, lbu: -30, lbl: -6 },
  purpleFire: { t: 16, h: 2, fu: 92, fl: -6, bu: 90, bl: -4, lfu: 36, lfl: -30, lbu: -34, lbl: -4 },
  peace: { t: -2, h: 4, fu: 150, fl: 30, bu: -6, bl: 32, lfu: 10, lfl: -6, lbu: -10, lbl: -4 },
  blink: { t: 10, fu: 20, fl: 40, bu: -20, bl: 40, lfu: 20, lfl: -30, lbu: -20, lbl: -20 },
};

const POSES = {};
(function buildPoses() {
  for (const name in POSE_DEF) {
    const merged = { ...BASE_POSE, ...POSE_DEF[name] };
    const out = {};
    for (const k in merged) out[k] = NON_ANGLE.has(k) ? merged[k] : merged[k] * DEG;
    POSES[name] = out;
  }
})();

const DIMS = { thigh: 44, shin: 44, torso: 62, neck: 8, head: 16, ua: 32, fa: 30 };

function makeFlatPal(color) {
  return new Proxy({}, { get: () => color });
}
const WHITE_PAL = makeFlatPal('#ffffff');

class Fighter {
  constructor(game, o) {
    this.game = game;
    this.x = o.x;
    this.y = game.arena.ground;
    this.vx = 0;
    this.vy = 0;
    this.facing = o.facing || 1;
    this.ctrl = o.ctrl;
    this.team = o.team;
    this.isPlayer = !!o.isPlayer;
    this.side = o.side || 0;
    this.maxHp = 1000;
    this.hp = this.maxHp;
    this.dispHp = this.maxHp;
    this.ult = 0;
    this.cd = { 1: 0, 2: 0, 3: 0, 4: 0, R: 0, G: 0 };
    this.cdMax = { 1: 1, 2: 1, 3: 1, 4: 1, R: 1, G: 1 };
    this.state = 'idle';
    this.stateT = 0;
    this.onGround = true;
    this.jumps = 0;
    this.action = null;
    this.stun = 0;
    this.invuln = 0;
    this.armor = 0;
    this.noGravity = false;
    this.pose = { ...POSES.idle };
    this.poseTarget = POSES.idle;
    this.poseSpeed = 12;
    this.rotOverride = null;
    this.flashT = 0;
    this.after = [];
    this.afterT = 0;
    this.trail = null;
    this.holding = null;
    this.holder = null;
    this.combo = 0;
    this.comboT = 0;
    this.atkStep = 0;
    this.atkT = 0;
    this.dashCd = 0;
    this.runPhase = 0;
    this.scale = 1.18;
    this.hurtW = 58;
    this.hurtH = 205;
    this.counterWindow = 0;
    this.speed = 420;
    this.armGrow = 0;
    this.bounced = false;
    this.spin = 0;
    this.idleT = Math.random() * 10;
    this.dims = DIMS;
    this.scratch = { ...POSES.idle };
    this.lockFacing = false;
    this.color = '#ffffff';
  }

  // --- Yardımcılar -------------------------------------------------------------------
  get cy() { return this.y - this.hurtH * 0.55 * (this.state === 'down' || this.state === 'ko' ? 0.2 : 1); }
  hurtbox() {
    if (this.state === 'down' || this.state === 'ko') return { x: this.x - 95, y: this.y - 48, w: 190, h: 48 };
    if (this.state === 'launched') return { x: this.x - 50, y: this.y - 150, w: 100, h: 150 };
    return { x: this.x - this.hurtW / 2, y: this.y - this.hurtH, w: this.hurtW, h: this.hurtH };
  }
  enemies() { return this.game.fighters.filter((f) => f !== this && f.team !== this.team && f.state !== 'ko'); }
  nearestEnemy() {
    let best = null, bd = Infinity;
    for (const f of this.enemies()) {
      const d = Math.abs(f.x - this.x) + Math.abs(f.y - this.y) * 0.5;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  distTo(f) { return f ? Math.abs(f.x - this.x) : Infinity; }
  face(f) { if (f && Math.abs(f.x - this.x) > 2) this.facing = sign(f.x - this.x); }
  setPose(name, speed = 16) {
    this.poseTarget = typeof name === 'string' ? POSES[name] || POSES.idle : name;
    this.poseSpeed = speed;
  }
  snapPose(name) {
    this.setPose(name, 999);
    Object.assign(this.pose, this.poseTarget);
  }
  idlePose() { return 'idle'; }
  spawn(e) { this.game.addEntity(e); return e; }
  isBusy() { return this.state === 'action' || this.state === 'held' || this.state === 'hurt' || this.state === 'launched' || this.state === 'down' || this.state === 'getup' || this.state === 'paralyzed' || this.state === 'ko'; }
  canAct() { return this.state === 'idle' || this.state === 'run' || this.state === 'air' || this.state === 'block'; }

  // yerel iskelet noktasını dünya koordinatına çevir
  localToWorld(lx, ly) {
    const S = this.scale;
    return { x: this.x + lx * this.facing * S, y: this.y + ly * S };
  }

  skeleton(P) {
    const D = this.dims;
    const grounded = this.onGround && this.state !== 'launched' && this.state !== 'held';
    const reachF = D.thigh * Math.cos(P.lfu) + D.shin * Math.cos(P.lfu + P.lfl);
    const reachB = D.thigh * Math.cos(P.lbu) + D.shin * Math.cos(P.lbu + P.lbl);
    let hipY = grounded ? -Math.max(reachF, reachB, 26) : -(D.thigh + D.shin) + 6;
    hipY += P.drop;
    const t = P.t, st = Math.sin(t), ct = Math.cos(t);
    const neck = { x: st * D.torso, y: -ct * D.torso };
    const sh = { x: neck.x - st * 8, y: neck.y + ct * 8 };
    const ha = t + P.h;
    const head = { x: neck.x + Math.sin(ha) * (D.neck + D.head), y: neck.y - Math.cos(ha) * (D.neck + D.head) };
    const arm = (u, l, ox, base, k = 1) => {
      const s = { x: base.x + ox, y: base.y };
      const e = { x: s.x + Math.sin(u) * D.ua * k, y: s.y + Math.cos(u) * D.ua * k };
      const a2 = u + l;
      const h = { x: e.x + Math.sin(a2) * D.fa * k, y: e.y + Math.cos(a2) * D.fa * k };
      return { s, e, h, u, a2 };
    };
    const leg = (u, l, ox) => {
      const s = { x: ox, y: 0 };
      const e = { x: s.x + Math.sin(u) * D.thigh, y: s.y + Math.cos(u) * D.thigh };
      const a2 = u + l;
      const h = { x: e.x + Math.sin(a2) * D.shin, y: e.y + Math.cos(a2) * D.shin };
      return { s, e, h, u, a2 };
    };
    const sk = { hipY, t, neck, sh, head, ha, rot: P.rot };
    sk.fArm = arm(P.fu, P.fl, 3, sh);
    sk.bArm = arm(P.bu, P.bl, -3, sh);
    sk.fLeg = leg(P.lfu, P.lfl, 4);
    sk.bLeg = leg(P.lbu, P.lbl, -4);
    if (this.armGrow > 0.01) {
      const sh2 = { x: st * D.torso * 0.62, y: -ct * D.torso * 0.62 };
      sk.xArm = arm(P.xu, P.xl, 4, sh2, 0.25 + 0.75 * this.armGrow);
      sk.yArm = arm(P.yu, P.yl, -4, sh2, 0.25 + 0.75 * this.armGrow);
    }
    return sk;
  }

  // iskelet noktası -> dünya
  jointWorld(p) {
    const sk = this._sk || this.skeleton(this.pose);
    let x = p.x, y = p.y;
    if (sk.rot) {
      const c = Math.cos(sk.rot), s = Math.sin(sk.rot);
      const nx = x * c - y * s, ny = x * s + y * c;
      x = nx;
      y = ny;
    }
    return this.localToWorld(x, y + sk.hipY);
  }
  handWorld(which = 'f') {
    const sk = this.skeleton(this.pose);
    this._sk = sk;
    const a = which === 'f' ? sk.fArm : which === 'b' ? sk.bArm : which === 'x' ? sk.xArm || sk.fArm : sk.yArm || sk.bArm;
    const r = this.jointWorld(a.h);
    this._sk = null;
    return r;
  }
  headWorld() {
    const sk = this.skeleton(this.pose);
    this._sk = sk;
    const r = this.jointWorld(sk.head);
    this._sk = null;
    return r;
  }

  // --- Eylem (coroutine) çalıştırıcı ------------------------------------------------------
  startAction(gen, o = {}) {
    this.cancelAction();
    this.action = { gen, wait: 0, until: null, untilMax: 0, armor: !!o.armor, name: o.name || '' };
    this.state = 'action';
    this.stateT = 0;
    this.runAction(0);
  }

  runAction(dt) {
    const a = this.action;
    if (!a) return;
    if (a.until) {
      a.untilMax -= dt;
      if (a.until() || a.untilMax <= 0) {
        a.until = null;
        a.wait = 0;
      } else return;
    } else a.wait -= dt;
    let guard = 0;
    while (this.action === a && a.wait <= 0 && !a.until && guard++ < 40) {
      let r;
      try {
        r = a.gen.next();
      } catch (e) {
        console.error(e);
        r = { done: true };
      }
      if (this.action !== a) return;
      if (r.done) {
        this.action = null;
        this.endActionState();
        return;
      }
      const v = r.value;
      if (typeof v === 'number') a.wait += v;
      else if (v && typeof v.until === 'function') {
        a.until = v.until;
        a.untilMax = v.max ?? 3;
      } else a.wait = 1e-4;
    }
  }

  endActionState() {
    this.noGravity = false;
    this.armor = 0;
    this.trail = null;
    this.lockFacing = false;
    if (this.state === 'action') this.state = this.onGround ? 'idle' : 'air';
    if (this.game.cinematic && this.game.cinematic.owner === this) this.game.endCinematic(this);
  }

  cancelAction() {
    const a = this.action;
    if (a) {
      this.action = null;
      try {
        a.gen.return();
      } catch (e) { /* yoksay */ }
    }
    this.noGravity = false;
    this.armor = 0;
    this.trail = null;
    this.counterWindow = 0;
    this.lockFacing = false;
    if (this.holding) this.release();
    if (this.state === 'action') this.state = this.onGround ? 'idle' : 'air';
    if (this.game.cinematic && this.game.cinematic.owner === this) this.game.endCinematic(this);
  }

  // --- Tutma ------------------------------------------------------------------------
  grab(t, ox, oy, pose = 'held') {
    if (!t || t.state === 'ko') return false;
    t.cancelAction();
    if (t.holding) t.release();
    t.state = 'held';
    t.stateT = 0;
    t.holder = this;
    t.vx = t.vy = 0;
    t.setPose(pose, 30);
    this.holding = { t, ox, oy };
    return true;
  }
  release() {
    const h = this.holding;
    this.holding = null;
    if (!h) return null;
    const t = h.t;
    t.holder = null;
    if (t.state === 'held') {
      t.state = t.onGround ? 'hurt' : 'launched';
      t.stun = 0.2;
      t.stateT = 0;
      t.bounced = false;
    }
    return t;
  }
  paralyze(sec) {
    if (this.state === 'ko') return;
    this.cancelAction();
    if (this.holding) this.release();
    this.state = 'paralyzed';
    this.stateT = 0;
    this.stun = sec;
    this.vx = 0;
    this.setPose('paralyzed', 20);
  }

  // --- Hasar ------------------------------------------------------------------------
  takeHit(h) {
    const a = h.attacker;
    if (this.state === 'ko') return 'none';
    if (this.invuln > 0 && !h.force) return 'none';
    if ((this.state === 'down' || this.state === 'getup') && !h.otg) return 'none';
    if (this.counterWindow > 0 && !h.uncounterable && a && a !== this) {
      this.counterWindow = 0;
      this.counterTriggered = true;
      this.counterTarget = a;
      return 'countered';
    }
    const dir = h.dir ?? (a ? (a.x === this.x ? a.facing : sign(this.x - a.x)) : 1);
    if (this.state === 'block' && !h.unblockable && a && sign(a.x - this.x) === this.facing) {
      const chip = Math.round(h.dmg * 0.12);
      this.hp = Math.max(1, this.hp - chip);
      this.vx = dir * 260;
      this.ult = Math.min(100, this.ult + h.dmg * 0.06);
      const hx = this.x + this.facing * 30, hy = this.y - 130;
      FX.sparks(hx, hy, 10, { color: '#9fd8ff', speed: 500, size: 2.5 });
      FX.ring(hx, hy, { r0: 10, r1: 60, color: '#bfe6ff', life: 0.2, w: 3 });
      Snd.sfx.block();
      this.game.hitstop = Math.max(this.game.hitstop, 0.03);
      return 'blocked';
    }
    const dmg = h.dmg * (this.dmgTakenMul || 1);
    if (!this.game.training || this.team !== 2) this.hp -= dmg;
    else this.hp = Math.max(1, this.hp - dmg);
    this.flashT = 0.07;
    if (a) {
      a.ult = Math.min(100, a.ult + dmg * (this.game.training ? 0.4 : 0.11));
      a.combo++;
      a.comboT = 1.3;
    }
    this.ult = Math.min(100, this.ult + dmg * 0.065);
    if (dmg >= 1) FX.damageNum(this.x, this.y - this.hurtH - 10, dmg, h.numColor || '#ffffff');
    if (h.hitstop) this.game.hitstop = Math.max(this.game.hitstop, h.hitstop);
    if (h.shake) FX.shake(h.shake);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die(dir, h);
      return 'ko';
    }
    if (this.state === 'held') return 'hit';
    if (this.armor > 0 || (this.action && this.action.armor)) return 'hit';
    if (this.state === 'paralyzed' && !h.breakParalyze) {
      this.vx += dir * (h.kbx || 0) * 0.15;
      return 'hit';
    }
    this.cancelAction();
    const kby = h.kby ?? 0;
    if (h.launch || kby < -250 || (!this.onGround && !h.ground)) {
      this.state = 'launched';
      this.stateT = 0;
      this.bounced = false;
      this.vx = dir * (h.kbx || 0);
      this.vy = h.launch || kby < 0 ? (kby || -420) : -260;
      this.onGround = false;
      this.y = Math.min(this.y, this.game.arena.ground - 2);
      this.spin = h.spin ? dir * h.spin : 0;
      this.setPose('launched', 14);
    } else {
      this.state = 'hurt';
      this.stateT = 0;
      this.stun = h.stun ?? 0.3;
      this.vx = dir * (h.kbx || 0);
      this.setPose(h.hurtPose || (Math.random() < 0.5 ? 'hurt' : 'hurt2'), 40);
    }
    return 'hit';
  }

  die(dir, h) {
    this.cancelAction();
    if (this.holding) this.release();
    if (this.holder && this.holder.holding && this.holder.holding.t === this) this.holder.holding = null;
    this.holder = null;
    this.state = 'ko';
    this.stateT = 0;
    this.vx = dir * Math.max(500, Math.abs(h.kbx || 0) * 0.7);
    this.vy = -720;
    this.onGround = false;
    this.y = Math.min(this.y, this.game.arena.ground - 2);
    this.setPose('launched', 14);
    this.game.onKO(this);
  }

  // --- Kare güncelleme ----------------------------------------------------------------
  update(dt) {
    if (dt <= 0) return;
    this.stateT += dt;
    this.idleT += dt;
    const cdRate = 1;
    for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] = Math.max(0, this.cd[k] - dt * cdRate);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.counterWindow > 0) this.counterWindow -= dt;
    if (this.atkT > 0) this.atkT -= dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.state !== 'ko' && !this.inUlt()) this.ult = Math.min(100, this.ult + dt * (this.game.training ? 12 : 0.55));
    this.rotOverride = null;

    switch (this.state) {
      case 'held':
        if (!this.holder || !this.holder.holding || this.holder.holding.t !== this) {
          this.holder = null;
          this.state = 'launched';
          this.bounced = false;
        }
        break;
      case 'paralyzed':
        this.stun -= dt;
        this.vx = damp(this.vx, 0, 6, dt);
        if (this.stun <= 0) this.state = this.onGround ? 'idle' : 'air';
        break;
      case 'hurt':
        this.stun -= dt;
        if (this.stun <= 0) this.state = this.onGround ? 'idle' : 'air';
        break;
      case 'launched':
        if (this.spin) {
          this.pose.rot += this.spin * dt;
          this.rotOverride = this.pose.rot;
        } else {
          this.rotOverride = lerp(-0.45, -1.45, clamp((this.vy + 900) / 1800, 0, 1));
        }
        break;
      case 'down':
        if (this.stateT > 0.75) {
          this.state = 'getup';
          this.stateT = 0;
          this.invuln = Math.max(this.invuln, 0.35);
          this.setPose('getup', 14);
        }
        break;
      case 'getup':
        if (this.stateT > 0.32) this.state = 'idle';
        break;
      case 'action':
        this.runAction(dt);
        break;
      case 'ko':
        break;
      default:
        this.handleInput(dt);
    }

    if (this.state !== 'held') this.physics(dt);
    this.updateHolding();
    this.updateTrail(dt);
    this.updatePose(dt);
    this.dispHp = this.dispHp > this.hp ? Math.max(this.hp, this.dispHp - dt * 260) : this.hp;
  }

  inUlt() { return false; }

  updateHolding() {
    const h = this.holding;
    if (!h) return;
    const t = h.t;
    if (t.state !== 'held' || t.holder !== this) {
      this.holding = null;
      return;
    }
    t.x = clamp(this.x + this.facing * h.ox, this.game.arena.left - 40, this.game.arena.right + 40);
    t.y = Math.min(this.game.arena.ground, this.y + h.oy);
    t.onGround = t.y >= this.game.arena.ground - 1;
    t.facing = -this.facing;
    t.vx = t.vy = 0;
  }

  handleInput(dt) {
    const c = this.ctrl;
    const G = this.game;
    const locked = G.inputLocked;
    const move = locked ? 0 : c.move;
    if (!this.lockFacing) {
      const e = this.nearestEnemy();
      if (e && Math.abs(e.x - this.x) > 8) this.facing = sign(e.x - this.x);
    }
    if (!locked) {
      for (const k of ['1', '2', '3', '4', 'R', 'G']) {
        if (c.has(k) && this.trySkill(k)) {
          c.consume(k);
          return;
        }
      }
      if (c.has('attack')) {
        c.consume('attack');
        this.startAction(this.basicAttack(this.atkT > 0 ? this.atkStep : 0), { name: 'basic' });
        return;
      }
      if (c.has('dash') && this.dashCd <= 0) {
        c.consume('dash');
        this.startAction(this.dashMove(move !== 0 ? sign(move) : this.facing), { name: 'dash' });
        return;
      }
    }
    if (!locked && c.blockHeld && this.onGround) {
      this.state = 'block';
      this.vx = damp(this.vx, 0, 12, dt);
      this.setPose('block', 22);
      return;
    }
    const target = move * this.speed;
    this.vx = damp(this.vx, target, this.onGround ? 14 : 5, dt);
    if (!locked && c.has('jump') && (this.onGround || this.jumps < 2)) {
      c.consume('jump');
      if (this.onGround) {
        this.vy = -1120;
        this.onGround = false;
        this.jumps = 1;
        FX.dust(this.x, this.y, 6);
        Snd.sfx.jump();
      } else if (this.jumps < 2) {
        this.vy = -960;
        this.jumps = 2;
        FX.ring(this.x, this.y - 20, { r0: 10, r1: 70, color: this.color, life: 0.3, w: 3, sy: 0.3 });
        Snd.sfx.jump();
      }
    }
    if (this.onGround) {
      if (Math.abs(this.vx) > 50) {
        this.state = 'run';
        this.runCycle(dt, Math.abs(this.vx) / this.speed);
      } else {
        this.state = 'idle';
        this.setPose(this.breathe(this.idlePose()), 10);
      }
    } else {
      this.state = 'air';
      this.setPose(this.vy < 0 ? 'jumpUp' : 'fall', 10);
    }
  }

  breathe(name) {
    const base = POSES[name] || POSES.idle;
    const p = this.scratch2 || (this.scratch2 = { ...base });
    Object.assign(p, base);
    const s = Math.sin(this.idleT * 2.2);
    p.t += s * 1.6 * DEG;
    p.fu += s * 3 * DEG;
    p.bu -= s * 3 * DEG;
    p.xu += s * 4 * DEG;
    p.yu -= s * 4 * DEG;
    p.h += s * 1.2 * DEG;
    return p;
  }

  runCycle(dt, k, lean = 0) {
    const back = sign(this.vx) !== this.facing;
    this.runPhase += dt * (back ? -1 : 1) * (9 + k * 5);
    const ph = this.runPhase;
    const s = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    const p = this.scratch;
    const amp = Math.min(1.25, 0.55 + k * 0.5);
    p.t = (14 + lean) * DEG * Math.min(1, k + 0.3);
    p.h = -6 * DEG;
    p.lfu = (12 + 42 * s * amp) * DEG;
    p.lfl = (-20 - 70 * Math.max(0, Math.cos(ph)) * amp) * DEG;
    p.lbu = (12 + 42 * s2 * amp) * DEG;
    p.lbl = (-20 - 70 * Math.max(0, Math.cos(ph + Math.PI)) * amp) * DEG;
    p.fu = (20 - 40 * s * amp) * DEG;
    p.fl = 80 * DEG;
    p.bu = (20 - 40 * s2 * amp) * DEG;
    p.bl = 80 * DEG;
    p.xu = (40 - 30 * s) * DEG;
    p.xl = 70 * DEG;
    p.yu = (40 - 30 * s2) * DEG;
    p.yl = 70 * DEG;
    p.rot = 0;
    p.drop = 2 + Math.abs(Math.sin(ph)) * 4;
    this.setPose(p, 30);
  }

  physics(dt) {
    const A = this.game.arena;
    if (!this.noGravity) this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < A.left) {
      if (this.state === 'launched' && this.vx < -700) {
        this.vx = -this.vx * 0.35;
        FX.debris(A.left, this.y - 80, 6, { up: 0.4 });
        FX.shake(6);
      } else this.vx = Math.max(0, this.vx);
      this.x = A.left;
    } else if (this.x > A.right) {
      if (this.state === 'launched' && this.vx > 700) {
        this.vx = -this.vx * 0.35;
        FX.debris(A.right, this.y - 80, 6, { up: 0.4 });
        FX.shake(6);
      } else this.vx = Math.min(0, this.vx);
      this.x = A.right;
    }
    if (this.y >= A.ground) {
      const v = this.vy;
      this.y = A.ground;
      const was = this.onGround;
      this.onGround = true;
      if (this.vy > 0) this.vy = 0;
      if (!was) this.land(v);
    } else this.onGround = false;
    if (this.onGround && (this.state === 'hurt' || this.state === 'down' || this.state === 'ko' || this.state === 'getup')) this.vx = damp(this.vx, 0, 7, dt);
    if (this.onGround && this.state === 'action' && !this.keepVel) this.vx = damp(this.vx, 0, 5, dt);
  }

  land(v) {
    if (this.state === 'launched') {
      if (v > 900 && !this.bounced) {
        this.bounced = true;
        this.vy = -v * 0.32;
        this.y = this.game.arena.ground - 1;
        this.onGround = false;
        this.spin = 0;
        FX.dust(this.x, this.y, 12, { speed: 260 });
        FX.shake(Math.min(14, v / 140));
        Snd.sfx.land();
        return;
      }
      this.state = 'down';
      this.stateT = 0;
      this.spin = 0;
      this.vx *= 0.45;
      this.invuln = Math.max(this.invuln, 1.05);
      this.setPose('down', 18);
      FX.dust(this.x, this.y, 10, { speed: 220 });
      Snd.sfx.land();
      return;
    }
    if (this.state === 'ko') {
      if (v > 700 && !this.bounced) {
        this.bounced = true;
        this.vy = -v * 0.3;
        this.y = this.game.arena.ground - 1;
        this.onGround = false;
        return;
      }
      this.setPose('ko', 16);
      FX.dust(this.x, this.y, 14, { speed: 260 });
      return;
    }
    this.jumps = 0;
    if (v > 500) FX.dust(this.x, this.y, 5);
  }

  updatePose(dt) {
    const tgt = this.poseTarget;
    const cur = this.pose;
    const k = this.poseSpeed >= 999 ? 1 : 1 - Math.exp(-this.poseSpeed * dt);
    for (const key in tgt) cur[key] += (tgt[key] - cur[key]) * k;
    if (this.state === 'ko' && !this.onGround) this.rotOverride = lerp(-0.45, -1.45, clamp((this.vy + 900) / 1800, 0, 1));
    if (this.rotOverride !== null) cur.rot = this.rotOverride;
  }

  updateTrail(dt) {
    if (this.trail) {
      this.afterT -= dt;
      if (this.afterT <= 0) {
        this.afterT = 0.028;
        this.after.push({ x: this.x, y: this.y, facing: this.facing, pose: { ...this.pose }, life: 0.28, max: 0.28, color: this.trail, onGround: this.onGround, state: this.state });
      }
    }
    for (const a of this.after) a.life -= dt;
    this.after = this.after.filter((a) => a.life > 0);
  }

  // --- Ortak hareketler ------------------------------------------------------------
  basicPoses() { return ['punchA', 'punchB', 'kickA']; }

  *basicAttack(step) {
    const poses = this.basicPoses();
    const fin = step === 2;
    this.setPose(poses[step], 40);
    this.vx = this.facing * (fin ? 340 : 220);
    Snd.sfx.whoosh();
    yield 0.07;
    const hits = this.melee(95, { dmg: fin ? 30 : 16, kbx: fin ? 560 : 110, kby: fin ? -260 : 0, stun: fin ? 0.5 : 0.34, hitstop: fin ? 0.07 : 0.04, shake: fin ? 6 : 2 });
    if (hits.length) Snd.sfx.punch();
    yield fin ? 0.22 : 0.15;
    this.atkStep = (step + 1) % 3;
    this.atkT = 0.42;
  }

  *dashMove(dir) {
    this.lockFacing = true;
    this.invuln = Math.max(this.invuln, 0.14);
    this.vx = dir * 1350;
    this.vy = 0;
    this.noGravity = true;
    this.keepVel = true;
    this.trail = this.color;
    this.facing = dir;
    this.setPose('dash', 40);
    Snd.sfx.dash();
    FX.dust(this.x, this.y, 5);
    try {
      yield 0.16;
    } finally {
      this.keepVel = false;
      this.noGravity = false;
      this.trail = null;
      this.dashCd = 0.5;
    }
    this.vx = dir * 300;
  }

  // Önündeki kutuda yakın dövüş vuruşu
  melee(range, h, o = {}) {
    const box = { x: this.facing > 0 ? this.x : this.x - range, y: this.y - (o.top ?? 190), w: range, h: o.height ?? 170 };
    const out = [];
    for (const f of this.enemies()) {
      if (!rectHit(box, f.hurtbox())) continue;
      const r = f.takeHit({ ...h, attacker: this });
      if (r !== 'none') {
        out.push(f);
        if (r === 'hit' || r === 'ko') {
          const hx = f.x - this.facing * 20, hy = f.y - 120;
          FX.sparks(hx, hy, 8, { color: h.sparkColor || '#ffffff', speed: 600, angle: this.facing > 0 ? 0 : Math.PI, spread: 1.6 });
          FX.glow(hx, hy, 50, h.glowColor || '#ffffff', 0.12);
        }
      }
    }
    return out;
  }

  trySkill(key) {
    const s = this.getSkill(key);
    if (!s) return false;
    if (s.ready && !s.ready()) return false;
    if (!s.ignoreCd && this.cd[key] > 0) return false;
    if (s.onUse && s.onUse() === false) return false;
    if (s.cd !== undefined && !s.noAutoCd) {
      this.cd[key] = s.cd * this.game.cdMul;
      this.cdMax[key] = Math.max(0.01, s.cd * this.game.cdMul);
    }
    this.startAction(s.fn.call(this), { armor: s.armor, name: s.name });
    return true;
  }
  getSkill() { return null; }
  skillInfo() { return []; }

  teleportFx(x, y, color) {
    FX.ring(x, y - 110, { r0: 20, r1: 120, color, life: 0.3, w: 5 });
    FX.glow(x, y - 110, 120, color, 0.25);
    for (let i = 0; i < 10; i++) FX.add({ type: 'spark', x: x + rand(-25, 25), y: y - rand(0, 200), vx: 0, vy: -rand(200, 600), life: 0.3, size: 2, color, len: 0.05, add: true });
  }

  // --- Çizim --------------------------------------------------------------------------
  drawShadow(ctx) {
    const A = this.game.arena;
    const hgt = Math.max(0, A.ground - this.y);
    const k = clamp(1 - hgt / 700, 0.25, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.45 * k})`;
    ctx.beginPath();
    const lying = this.state === 'down' || this.state === 'ko';
    ctx.ellipse(this.x, A.ground + 2, (lying ? 110 : 52) * k * this.scale, 11 * k, 0, 0, TAU);
    ctx.fill();
  }

  draw(ctx) {
    // ardıl görüntüler
    if (this.after.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const saved = { x: this.x, y: this.y, facing: this.facing, pose: this.pose, onGround: this.onGround, state: this.state };
      for (const a of this.after) {
        ctx.globalAlpha = (a.life / a.max) * 0.45;
        this.x = a.x;
        this.y = a.y;
        this.facing = a.facing;
        this.onGround = a.onGround;
        this.state = a.state;
        this.drawFigure(ctx, a.pose, makeFlatPal(a.color), true);
      }
      Object.assign(this, saved);
      ctx.restore();
    }
    this.drawAura(ctx);
    let pal = this.palette();
    if (this.flashT > 0) pal = WHITE_PAL;
    this.drawFigure(ctx, this.pose, pal, false);
    this.drawOverlay(ctx);
  }

  drawAura() {}
  drawOverlay() {}

  drawFigure(ctx, P, pal, ghost) {
    const sk = this.skeleton(P);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing * this.scale, this.scale);
    // ölçek değişse de taban çizgi kalınlığı sabit kalsın
    ctx.translate(0, sk.hipY);
    if (sk.rot) ctx.rotate(sk.rot);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.drawArm(ctx, sk.bArm, pal, true, ghost);
    if (sk.yArm) this.drawArm(ctx, sk.yArm, pal, true, ghost, true);
    this.drawLeg(ctx, sk.bLeg, pal, true, ghost);
    this.drawTorso(ctx, sk, pal, ghost);
    this.drawLeg(ctx, sk.fLeg, pal, false, ghost);
    this.drawHead(ctx, sk, pal, ghost);
    if (sk.xArm) this.drawArm(ctx, sk.xArm, pal, false, ghost, true);
    this.drawArm(ctx, sk.fArm, pal, false, ghost);
    ctx.restore();
  }

  limb(ctx, pts, w, col, line, hi) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = line;
    ctx.lineWidth = w + 4.5;
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
    if (hi) {
      ctx.save();
      ctx.translate(-w * 0.18, -w * 0.2);
      ctx.strokeStyle = hi;
      ctx.lineWidth = w * 0.3;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawArm(ctx, A, pal, back, ghost) {
    const col = back ? pal.sleeveShade : pal.sleeve;
    this.limb(ctx, [A.s, A.e, A.h], 12, col, pal.line, ghost || back ? null : pal.sleeveHi);
    this.drawHand(ctx, A, pal, back);
  }

  drawHand(ctx, A, pal, back) {
    ctx.fillStyle = back ? pal.skinShade : pal.skin;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(A.h.x, A.h.y, 6.2, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  drawLeg(ctx, Lg, pal, back, ghost) {
    const col = back ? pal.pantsShade : pal.pants;
    this.limb(ctx, [Lg.s, Lg.e, Lg.h], 16, col, pal.line, ghost || back ? null : pal.pantsHi);
    const fa = Lg.a2 + Math.PI / 2;
    const tip = { x: Lg.h.x + Math.sin(fa) * 15, y: Lg.h.y + Math.cos(fa) * 15 };
    this.limb(ctx, [{ x: Lg.h.x - Math.sin(fa) * 2, y: Lg.h.y - Math.cos(fa) * 2 }, tip], 9, back ? pal.shoeShade : pal.shoe, pal.line, null);
  }

  drawTorso() {}
  drawHead() {}
  palette() { return WHITE_PAL; }

  // Saç dikenleri: [açı (derece, -90 = yukarı, 0 = ileri), uzunluk, yarım genişlik]
  hairPath(ctx, spikes, R) {
    ctx.beginPath();
    for (let i = 0; i < spikes.length; i++) {
      const [a, len, w = 12] = spikes[i];
      const ar = a * DEG, wr = w * DEG;
      const b1x = Math.cos(ar + wr) * R * 0.92, b1y = Math.sin(ar + wr) * R * 0.92;
      const tx = Math.cos(ar) * (R + len), ty = Math.sin(ar) * (R + len);
      const b2x = Math.cos(ar - wr) * R * 0.92, b2y = Math.sin(ar - wr) * R * 0.92;
      if (i === 0) ctx.moveTo(b1x, b1y);
      else ctx.lineTo(b1x, b1y);
      ctx.lineTo(tx, ty);
      ctx.lineTo(b2x, b2y);
    }
    const last = spikes[spikes.length - 1][0] * DEG, first = spikes[0][0] * DEG;
    ctx.arc(0, 0, R * 0.55, last, first, false);
    ctx.closePath();
  }
}
