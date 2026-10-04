'use strict';
// ---------------------------------------------------------------------------
// Kontrolcüler. Ortak arayüz:
//   move (-1..1), blockHeld (bool), aim ({x,y} dünya ya da null)
//   has(ad) / consume(ad): tamponlu basışlar
//   adlar: jump, dash, attack, 1, 2, 3, 4, R, G
// ---------------------------------------------------------------------------

const KEYMAP = {
  KeyW: 'jump', ArrowUp: 'jump', Space: 'jump',
  ShiftLeft: 'dash', ShiftRight: 'dash',
  KeyF: 'attack', KeyJ: 'attack',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
  Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4',
  KeyR: 'R', KeyG: 'G',
};

class PlayerController {
  constructor() {
    this.keys = new Set();
    this.buf = {};
    this.move = 0;
    this.blockHeld = false;
    this.aim = null;
    this.mouse = { x: 0, y: 0, has: false };
    this.touch = { left: false, right: false, block: false };
  }
  press(name) { this.buf[name] = performance.now(); }
  has(name) { return performance.now() - (this.buf[name] ?? -1e9) < 170; }
  consume(name) { this.buf[name] = -1e9; }
  clear() {
    this.keys.clear();
    this.buf = {};
    this.touch.left = this.touch.right = this.touch.block = false;
  }
  poll(game) {
    const k = this.keys;
    const r = k.has('KeyD') || k.has('ArrowRight') || this.touch.right;
    const l = k.has('KeyA') || k.has('ArrowLeft') || this.touch.left;
    this.move = (r ? 1 : 0) - (l ? 1 : 0);
    this.blockHeld = k.has('KeyS') || k.has('ArrowDown') || this.touch.block;
    this.aim = this.mouse.has ? game.screenToWorld(this.mouse.x, this.mouse.y) : null;
  }
}

class AIController {
  constructor(game, level) {
    this.game = game;
    this.level = clamp(level | 0, 0, 2);
    this.me = null;
    this.move = 0;
    this.blockHeld = false;
    this.buf = {};
    this.aim = null;
    this.thinkT = 0.6;
    this.blockT = 0;
    this.passive = false;
  }
  press(k) {
    this.buf[k] = true;
    return true;
  }
  has(k) { return !!this.buf[k]; }
  consume(k) { this.buf[k] = false; }

  poll(game, dt) {
    const me = this.me;
    if (!me || this.passive || game.inputLocked) {
      this.move = 0;
      this.blockHeld = false;
      this.buf = {};
      return;
    }
    if (dt <= 0) return;
    const t = me.nearestEnemy();
    if (!t) {
      this.move = 0;
      return;
    }
    const dx = t.x - me.x, dist = Math.abs(dx), dir = sign(dx);
    const L = this.level;
    // Gojo'nun ulti koşusu: hedefin içinden geçip geri dön
    if (me.runMode > 0) {
      if (dist > 130) this.move = dir;
      else if (!this.move) this.move = dir;
      return;
    }
    if (this.blockT > 0) {
      this.blockT -= dt;
      this.blockHeld = this.blockT > 0;
      this.move = 0;
      return;
    }
    if (me.canAct() && me.onGround) {
      const threat = (t.state === 'action' && dist < 260) || this.projectileThreat(me);
      if (threat && Math.random() < [0.02, 0.06, 0.13][L]) {
        if (Math.random() < 0.55) {
          this.blockT = rand(0.25, 0.55);
          return;
        }
        this.press(Math.random() < 0.5 ? 'jump' : 'dash');
        this.move = -dir;
        return;
      }
    }
    this.thinkT -= dt;
    if (this.thinkT > 0) return;
    this.thinkT = [0.55, 0.32, 0.18][L] + rand(0, 0.15);
    this.buf = {};
    this.aim = null;
    if (!me.canAct()) return;
    if (Math.random() < [0.45, 0.75, 0.95][L] && me.aiThink && me.aiThink(this, t, dist, dir)) return;
    const want = me.aiRange || 200;
    if (dist > want + 70) this.move = dir;
    else if (dist < want - 110) this.move = Math.random() < 0.5 ? -dir : 0;
    else this.move = Math.random() < 0.35 ? dir : 0;
    if (Math.random() < 0.05) this.press('jump');
    if (dist < 115 && Math.random() < [0.35, 0.6, 0.8][L]) this.press('attack');
  }

  projectileThreat(me) {
    for (const e of this.game.entities) {
      if (!e.owner || e.owner === me || e.owner.team === me.team) continue;
      if (typeof e.x !== 'number') continue;
      if (e instanceof CleaveWave || e instanceof RedOrb || e instanceof FugaArrow) {
        if (Math.abs(e.x - me.x) < 420) return true;
      }
    }
    return false;
  }
}
