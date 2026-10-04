'use strict';
// ---------------------------------------------------------------------------
// Görsel efektler: parçacıklar, ekran sarsıntısı, anime "impact frame"leri,
// dünya yarılması, kare parçalanma, hız çizgileri, replik/yazı gösterimleri.
// ---------------------------------------------------------------------------

const FX = {
  parts: [],
  callouts: [],
  nums: [],
  splits: [],
  shatters: [],
  subtitle: null,
  shakeAmt: 0,
  shakeX: 0,
  shakeY: 0,
  flashA: 0,
  flashColor: '#ffffff',
  impactT: 0,
  impactMode: 'invert',
  letterbox: 0,
  letterboxTarget: 0,
  speedT: 0,
  speedColor: '#ffffff',
  tint: null,
  tmp: null,
  ground: 620,
  time: 0,

  reset() {
    this.parts.length = 0;
    this.callouts.length = 0;
    this.nums.length = 0;
    this.splits.length = 0;
    this.shatters.length = 0;
    this.subtitle = null;
    this.shakeAmt = this.flashA = this.impactT = this.speedT = 0;
    this.letterbox = this.letterboxTarget = 0;
    this.tint = null;
  },

  add(p) {
    if (this.parts.length > 1600) this.parts.splice(0, 200);
    p.max = p.life;
    p.vx = p.vx || 0;
    p.vy = p.vy || 0;
    p.g = p.g || 0;
    p.drag = p.drag || 0;
    p.rot = p.rot || 0;
    p.vr = p.vr || 0;
    p.grow = p.grow || 0;
    p.alpha = p.alpha ?? 1;
    this.parts.push(p);
    return p;
  },

  // --- Hazır parçacık kalıpları ------------------------------------------------
  sparks(x, y, n, o = {}) {
    const { color = '#ffffff', speed = 700, size = 3, life = 0.35, angle = 0, spread = TAU, g = 900, len = 0.03 } = o;
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * rand(0.35, 1);
      this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * rand(0.6, 1.2), size: size * rand(0.6, 1.3), color, g, drag: 2, len, add: true });
    }
  },
  glow(x, y, r, color, life = 0.3, o = {}) {
    return this.add({ type: 'glow', x, y, size: r, life, color, grow: o.grow || 0, add: true, vx: o.vx, vy: o.vy, back: o.back });
  },
  ring(x, y, o = {}) {
    const { r0 = 10, r1 = 160, color = '#ffffff', life = 0.35, w = 6, sy = 1, add = true } = o;
    return this.add({ type: 'ring', x, y, size: r0, r1, life, color, w, sy, add });
  },
  dust(x, y, n = 8, o = {}) {
    const { color = '#8a8496', spread = 1, speed = 160 } = o;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      const s = speed * rand(0.3, 1) * spread;
      this.add({ type: 'smoke', x: x + rand(-14, 14), y: y - rand(0, 10), vx: Math.cos(a) * s * 1.6, vy: Math.sin(a) * s * 0.5, life: rand(0.4, 0.9), size: rand(10, 22), grow: rand(30, 60), color, alpha: 0.45, drag: 3, back: true });
    }
  },
  smoke(x, y, n = 6, o = {}) {
    const { color = '#2a2430', size = 30, life = 1.4, vy = -60, spread = 40, alpha = 0.5 } = o;
    for (let i = 0; i < n; i++) {
      this.add({ type: 'smoke', x: x + rand(-spread, spread), y: y + rand(-spread, spread) * 0.5, vx: rand(-30, 30), vy: vy * rand(0.5, 1.4), life: life * rand(0.7, 1.2), size: size * rand(0.6, 1.2), grow: size * 0.8, color, alpha, drag: 0.6, back: true });
    }
  },
  debris(x, y, n = 10, o = {}) {
    const { color = '#5a5560', speed = 700, up = 1, size = 7 } = o;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.1, 1.1);
      const s = speed * rand(0.3, 1);
      this.add({ type: 'debris', x: x + rand(-20, 20), y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * up, life: rand(0.8, 1.6), size: size * rand(0.5, 1.4), color, g: 2200, rot: rand(0, TAU), vr: rand(-12, 12), bounce: true });
    }
  },
  embers(x, y, n, o = {}) {
    const { color = '#ff7a1a', spread = 60, vy = -160, life = 1.0, size = 3 } = o;
    for (let i = 0; i < n; i++) {
      this.add({ type: 'ember', x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-60, 60), vy: vy * rand(0.4, 1.3), life: life * rand(0.5, 1.2), size: size * rand(0.6, 1.4), color, add: true, drag: 0.8 });
    }
  },
  slashMark(x, y, ang, len, o = {}) {
    const { color = '#ff2a3a', core = '#ffffff', life = 0.22, w = 4 } = o;
    const c = Math.cos(ang) * len / 2, s = Math.sin(ang) * len / 2;
    this.add({ type: 'line', x: x - c, y: y - s, x2: x + c, y2: y + s, life, color, core, w, add: true, grow: 0 });
  },
  shard(x, y, n, o = {}) {
    const { color = '#ffffff', speed = 600, size = 10, life = 0.8, g = 1400 } = o;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = speed * rand(0.3, 1);
      this.add({ type: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * rand(0.6, 1.2), size: size * rand(0.5, 1.5), color, g, rot: rand(0, TAU), vr: rand(-14, 14), add: o.add ?? false });
    }
  },

  // --- Ekran efektleri ------------------------------------------------------------
  shake(a) { this.shakeAmt = Math.min(42, this.shakeAmt + a); },
  flash(color = '#ffffff', a = 0.8) { this.flashColor = color; this.flashA = Math.max(this.flashA, a); },
  impact(dur = 0.12, mode = 'invert') { this.impactT = Math.max(this.impactT, dur); this.impactMode = mode; },
  speedLines(t = 0.5, color = '#ffffff') { this.speedT = Math.max(this.speedT, t); this.speedColor = color; },
  worldSplit(x, y, ang, o = {}) { this.splits.push({ x, y, ang, t: 0, dur: o.dur ?? 0.45, off: o.off ?? 18, color: o.color ?? '#ffffff' }); },
  shatter(x, y, size, o = {}) {
    const tiles = [];
    const n = o.n ?? 3;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) tiles.push({ i, j, dx: rand(-1, 1), dy: rand(-1, 1), r: rand(-0.25, 0.25) });
    this.shatters.push({ x, y, size, t: 0, dur: o.dur ?? 0.7, n, tiles });
  },

  callout(kanji, sub, o = {}) {
    // aynı anda çok fazla yazı birikmesin
    if (this.callouts.length > 4) this.callouts.shift();
    const jag = [];
    for (let i = 0; i < 14; i++) jag.push(rand(-1, 1));
    this.callouts.push({
      kanji, sub, color: o.color || '#e3243b', side: o.side ?? 0, size: o.size || 86, t: 0, dur: o.dur || 1.5,
      style: o.style || 'skill', yOff: o.yOff ?? 0, jag, rot: o.rot ?? rand(-0.08, 0.02),
    });
  },
  say(speaker, text, color = '#e3243b', dur = 2.4) {
    this.subtitle = { speaker, text, color, t: 0, dur };
  },
  damageNum(x, y, v, color = '#ffffff') {
    const last = this.nums[this.nums.length - 1];
    // art arda gelen küçük vuruşları tek sayıda topla
    if (last && last.t < 0.12 && Math.abs(last.x - x) < 80 && Math.abs(last.y - y) < 100) {
      last.v += v;
      last.t = 0;
      return;
    }
    this.nums.push({ x: x + rand(-20, 20), y, v, color, t: 0, dur: 0.9 });
  },

  update(dt, rdt) {
    this.time += rdt;
    const G = this.ground;
    const ps = this.parts;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size += p.grow * dt;
      if (p.type === 'ring') p.size = lerp(p.size, p.r1, 1 - Math.exp(-9 * dt));
      if (p.bounce && p.y > G) {
        p.y = G;
        p.vy *= -0.35;
        p.vx *= 0.6;
        p.vr *= 0.5;
      }
      ps[w++] = p;
    }
    ps.length = w;

    for (const c of this.callouts) c.t += rdt;
    this.callouts = this.callouts.filter((c) => c.t < c.dur);
    for (const n of this.nums) n.t += rdt;
    this.nums = this.nums.filter((n) => n.t < n.dur);
    for (const s of this.splits) s.t += rdt;
    this.splits = this.splits.filter((s) => s.t < s.dur);
    for (const s of this.shatters) s.t += rdt;
    this.shatters = this.shatters.filter((s) => s.t < s.dur);
    if (this.subtitle) {
      this.subtitle.t += rdt;
      if (this.subtitle.t > this.subtitle.dur) this.subtitle = null;
    }

    this.shakeAmt *= Math.exp(-7 * rdt);
    if (this.shakeAmt < 0.3) this.shakeAmt = 0;
    this.shakeX = (Math.random() * 2 - 1) * this.shakeAmt;
    this.shakeY = (Math.random() * 2 - 1) * this.shakeAmt;
    this.flashA = Math.max(0, this.flashA - rdt * 3.2);
    this.impactT = Math.max(0, this.impactT - rdt);
    this.speedT = Math.max(0, this.speedT - rdt);
    this.letterbox = damp(this.letterbox, this.letterboxTarget, 8, rdt);
  },

  // --- Dünya katmanı çizimi ----------------------------------------------------------
  drawParticles(ctx, back) {
    const ps = this.parts;
    // önce normal karışımlılar
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.add || !!p.back !== back) continue;
      const a = Math.max(0, p.life / p.max);
      switch (p.type) {
        case 'smoke':
          ctx.globalAlpha = a * p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, TAU);
          ctx.fill();
          break;
        case 'debris':
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
          break;
        case 'shard':
          ctx.globalAlpha = Math.min(1, a * 1.5);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, p.size * 0.5);
          ctx.lineTo(-p.size * 0.5, p.size * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        case 'ring':
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.w * a + 0.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, Math.max(0.1, p.size), Math.max(0.1, p.size * p.sy), 0, 0, TAU);
          ctx.stroke();
          break;
      }
    }
    ctx.globalAlpha = 1;
    // eklemeli (ışıklı) olanlar
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.add || !!p.back !== back) continue;
      const a = Math.max(0, p.life / p.max);
      switch (p.type) {
        case 'spark': {
          ctx.globalAlpha = Math.min(1, a * 1.6);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * p.len, p.y - p.vy * p.len);
          ctx.stroke();
          break;
        }
        case 'glow':
          Glow.draw(ctx, p.x, p.y, p.size, p.color, a);
          break;
        case 'ember':
          ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(this.time * 30 + p.x));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        case 'line': {
          const k = Math.min(1, (1 - a) * 6); // hızla uzar
          const mx = (p.x + p.x2) / 2, my = (p.y + p.y2) / 2;
          const x1 = lerp(mx, p.x, k), y1 = lerp(my, p.y, k), x2 = lerp(mx, p.x2, k), y2 = lerp(my, p.y2, k);
          ctx.lineCap = 'round';
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.w * 3 * a + 1;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.strokeStyle = p.core;
          ctx.lineWidth = Math.max(1, p.w * a);
          ctx.stroke();
          break;
        }
        case 'ring':
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.w * a + 0.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, Math.max(0.1, p.size), Math.max(0.1, p.size * p.sy), 0, 0, TAU);
          ctx.stroke();
          break;
        case 'shard':
          ctx.globalAlpha = Math.min(1, a * 1.5);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, p.size * 0.5);
          ctx.lineTo(-p.size * 0.5, p.size * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },

  // --- Ekran sonrası işlemler (cihaz pikseli düzleminde) --------------------------
  post(ctx, canvas, toDevice, pxScale) {
    const W = canvas.width, H = canvas.height;
    if (!this.tmp) this.tmp = document.createElement('canvas');
    const needSnap = this.splits.length || this.shatters.length;
    if (needSnap) {
      if (this.tmp.width !== W || this.tmp.height !== H) {
        this.tmp.width = W;
        this.tmp.height = H;
      }
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    for (const s of this.splits) {
      const tctx = this.tmp.getContext('2d');
      tctx.clearRect(0, 0, W, H);
      tctx.drawImage(canvas, 0, 0);
      const p = toDevice(s.x, s.y);
      const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
      const k = s.t / s.dur;
      const open = (k < 0.25 ? ease.outCubic(k / 0.25) : 1 - ease.inCubic((k - 0.25) / 0.75)) * s.off * pxScale;
      const L = (W + H) * 2;
      const nx = -sa, ny = ca;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p.x - ca * L, p.y - sa * L);
        ctx.lineTo(p.x + ca * L, p.y + sa * L);
        ctx.lineTo(p.x + ca * L + nx * L * side, p.y + sa * L + ny * L * side);
        ctx.lineTo(p.x - ca * L + nx * L * side, p.y - sa * L + ny * L * side);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(this.tmp, ca * open * side * 1.4 + nx * open * side * 0.35, sa * open * side * 1.4 + ny * open * side * 0.35);
        ctx.restore();
      }
      // yarığın içindeki ışık
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(s.color, 1 - k);
      ctx.lineWidth = Math.max(1, open * 0.5);
      ctx.beginPath();
      ctx.moveTo(p.x - ca * L, p.y - sa * L);
      ctx.lineTo(p.x + ca * L, p.y + sa * L);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    for (const s of this.shatters) {
      const tctx = this.tmp.getContext('2d');
      tctx.clearRect(0, 0, W, H);
      tctx.drawImage(canvas, 0, 0);
      const c = toDevice(s.x, s.y);
      const size = s.size * pxScale;
      const k = s.t / s.dur;
      const push = ease.outCubic(Math.min(1, k * 1.4)) * size * 0.16;
      const x0 = c.x - size / 2, y0 = c.y - size / 2, ts = size / s.n;
      ctx.fillStyle = '#050003';
      ctx.fillRect(x0, y0, size, size);
      for (const tile of s.tiles) {
        const sx = x0 + tile.i * ts, sy = y0 + tile.j * ts;
        const cx = (tile.i - (s.n - 1) / 2), cy = (tile.j - (s.n - 1) / 2);
        ctx.save();
        ctx.translate(sx + ts / 2 + (cx + tile.dx * 0.4) * push, sy + ts / 2 + (cy + tile.dy * 0.4) * push + k * k * size * 0.15);
        ctx.rotate(tile.r * k);
        ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
        ctx.drawImage(this.tmp, sx, sy, ts, ts, -ts / 2, -ts / 2, ts, ts);
        ctx.strokeStyle = 'rgba(255,240,240,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-ts / 2, -ts / 2, ts, ts);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    if (this.impactT > 0) {
      const frame = Math.floor(this.time * 30) % 3;
      if (frame !== 2) {
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        if (this.impactMode === 'blackflash') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = '#ff2236';
          ctx.fillRect(0, 0, W, H);
        } else if (this.impactMode === 'red') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = '#ff6060';
          ctx.fillRect(0, 0, W, H);
        } else if (this.impactMode === 'blue') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = '#7fd0ff';
          ctx.fillRect(0, 0, W, H);
        } else if (this.impactMode === 'purple') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = '#c58bff';
          ctx.fillRect(0, 0, W, H);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
  },

  // --- Arayüz katmanı (mantıksal ekran koordinatı) ----------------------------------
  drawScreen(ctx, VW, VH, worldToScreen) {
    // hız çizgileri
    if (this.speedT > 0) {
      const a = Math.min(1, this.speedT * 2);
      const cx = VW / 2, cy = VH / 2;
      const R = Math.hypot(VW, VH) * 0.6;
      ctx.save();
      ctx.globalAlpha = 0.55 * a;
      ctx.fillStyle = this.speedColor;
      for (let i = 0; i < 46; i++) {
        const ang = Math.random() * TAU;
        const r1 = R * rand(0.45, 0.75), w = rand(0.004, 0.012);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang - w) * R * 1.2, cy + Math.sin(ang - w) * R * 1.2);
        ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.lineTo(cx + Math.cos(ang + w) * R * 1.2, cy + Math.sin(ang + w) * R * 1.2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.tint) {
      ctx.fillStyle = this.tint;
      ctx.fillRect(0, 0, VW, VH);
    }

    if (this.flashA > 0) {
      ctx.globalAlpha = Math.min(1, this.flashA);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = 1;
    }

    // hasar sayıları
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of this.nums) {
      const p = worldToScreen(n.x, n.y);
      const k = n.t / n.dur;
      const big = n.v >= 60;
      const s = (big ? 40 : 28) * (k < 0.1 ? 1.5 - k * 5 : 1);
      ctx.globalAlpha = 1 - Math.max(0, (k - 0.6) / 0.4);
      ctx.font = `${s}px Anton, Impact, sans-serif`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#0b0710';
      const y = p.y - k * 60;
      ctx.strokeText(String(Math.round(n.v)), p.x, y);
      ctx.fillStyle = n.color;
      ctx.fillText(String(Math.round(n.v)), p.x, y);
    }
    ctx.restore();

    // sinema bantları
    if (this.letterbox > 0.01) {
      const h = VH * 0.11 * this.letterbox;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, VW, h);
      ctx.fillRect(0, VH - h, VW, h);
    }

    for (const c of this.callouts) this.drawCallout(ctx, c, VW, VH);

    if (this.subtitle) this.drawSubtitle(ctx, this.subtitle, VW, VH);
  },

  drawCallout(ctx, c, VW, VH) {
    const k = c.t / c.dur;
    const appear = Math.min(1, c.t / 0.16);
    const fade = 1 - Math.max(0, (c.t - (c.dur - 0.35)) / 0.35);
    const scale = c.t < 0.16 ? lerp(1.7, 1, ease.outBack(appear)) : 1 + k * 0.05;
    let x, y;
    if (c.style === 'domain') {
      x = VW / 2;
      y = VH * 0.42 + c.yOff;
    } else if (c.style === 'small') {
      x = c.side < 0 ? VW * 0.27 : c.side > 0 ? VW * 0.73 : VW / 2;
      y = VH * 0.24 + c.yOff;
    } else {
      x = c.side < 0 ? VW * 0.3 : c.side > 0 ? VW * 0.7 : VW / 2;
      y = VH * 0.3 + c.yOff;
    }
    const size = c.size;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(c.rot);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${size}px "Shippori Mincho B1", "Noto Serif JP", "Yu Mincho", serif`;
    const tw = ctx.measureText(c.kanji).width;

    // fırça darbesi zemin
    const bw = tw + size * 1.1, bh = size * 0.95;
    ctx.fillStyle = c.style === 'domain' ? 'rgba(0,0,0,0.82)' : rgba(c.color, 0.92);
    ctx.beginPath();
    const n = c.jag.length / 2;
    for (let i = 0; i <= n; i++) {
      const px = -bw / 2 + (bw * i) / n;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](px, -bh / 2 + c.jag[i % c.jag.length] * size * 0.08);
    }
    for (let i = n; i >= 0; i--) {
      const px = -bw / 2 + (bw * i) / n + size * 0.12;
      ctx.lineTo(px, bh / 2 + c.jag[(i + n) % c.jag.length] * size * 0.08);
    }
    ctx.closePath();
    ctx.fill();
    if (c.style === 'domain') {
      ctx.strokeStyle = rgba(c.color, 0.9);
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      // fırça kılı çizgileri
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const yy = -bh / 2 + bh * (0.15 + i * 0.18);
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + size * 0.2 * c.jag[i], yy);
        ctx.lineTo(bw / 2 - size * 0.3 * Math.abs(c.jag[i + 4]), yy + c.jag[i + 2] * 4);
        ctx.stroke();
      }
    }

    ctx.lineJoin = 'round';
    ctx.lineWidth = size / 9;
    ctx.strokeStyle = '#08050a';
    ctx.strokeText(c.kanji, 0, -size * 0.02);
    ctx.fillStyle = c.style === 'domain' ? '#ffffff' : '#fff8f2';
    ctx.fillText(c.kanji, 0, -size * 0.02);

    if (c.sub) {
      const ss = Math.max(14, size * 0.24);
      ctx.font = `${ss}px Anton, Impact, sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(ss * 0.18)}px`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#08050a';
      const sy = bh / 2 + ss * 0.85;
      ctx.strokeText(c.sub, 0, sy);
      ctx.fillStyle = c.style === 'domain' ? c.color : '#ffffff';
      ctx.fillText(c.sub, 0, sy);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    ctx.restore();
  },

  drawSubtitle(ctx, s, VW, VH) {
    const k = s.t / s.dur;
    const a = Math.min(1, s.t * 6) * (1 - Math.max(0, (k - 0.85) / 0.15));
    const shown = s.text.slice(0, Math.ceil(s.text.length * Math.min(1, s.t / 0.35)));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = VH - Math.max(150, VH * 0.11 * this.letterbox + 40);
    ctx.font = '600 28px "Barlow Condensed", "Arial Narrow", sans-serif';
    const full = `${s.speaker}:  ${s.text}`;
    const tw = ctx.measureText(full).width;
    const grd = ctx.createLinearGradient(VW / 2 - tw, 0, VW / 2 + tw, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.25, 'rgba(0,0,0,0.7)');
    grd.addColorStop(0.75, 'rgba(0,0,0,0.7)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(VW / 2 - tw, y - 22, tw * 2, 44);
    const nameW = ctx.measureText(`${s.speaker}:  `).width;
    const x0 = VW / 2 - tw / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = s.color;
    ctx.fillText(`${s.speaker}:`, x0, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(shown, x0 + nameW, y);
    ctx.restore();
  },
};
