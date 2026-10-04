'use strict';
// ---------------------------------------------------------------------------
// Ortak yardımcılar: matematik, çarpışma testleri, renk ve parıltı önbelleği.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const sign = (v) => (v < 0 ? -1 : 1);
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Çarpışma ----------------------------------------------------------------
// Dikdörtgen: {x, y, w, h} (sol üst köşe)
function rectHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectHit(cx, cy, r, b) {
  const nx = clamp(cx, b.x, b.x + b.w);
  const ny = clamp(cy, b.y, b.y + b.h);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

// Kalın doğru parçası ile dikdörtgen (Liang-Barsky, dikdörtgen kalınlık kadar büyütülür)
function segRectHit(x1, y1, x2, y2, thick, b) {
  const h = thick / 2;
  const minX = b.x - h, maxX = b.x + b.w + h, minY = b.y - h, maxY = b.y + b.h + h;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

// Sonsuz doğru (dünya kesişi) ile dikdörtgen
function lineRectHit(px, py, ang, thick, b) {
  const L = 8000, c = Math.cos(ang), s = Math.sin(ang);
  return segRectHit(px - c * L, py - s * L, px + c * L, py + s * L, thick, b);
}

// --- Renk ------------------------------------------------------------------------
const _rgbCache = new Map();
function hexToRgb(hex) {
  let v = _rgbCache.get(hex);
  if (v) return v;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  _rgbCache.set(hex, v);
  return v;
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function mixHex(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  const r = Math.round(lerp(a[0], b[0], t)), g = Math.round(lerp(a[1], b[1], t)), bl = Math.round(lerp(a[2], b[2], t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

// --- Parıltı sprite önbelleği (eklemeli karışım için) --------------------------
const Glow = {
  cache: new Map(),
  get(color) {
    let c = this.cache.get(color);
    if (c) return c;
    const S = 128;
    c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, rgba(color, 1));
    gr.addColorStop(0.22, rgba(color, 0.65));
    gr.addColorStop(0.55, rgba(color, 0.18));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    this.cache.set(color, c);
    return c;
  },
  draw(ctx, x, y, r, color, alpha = 1) {
    if (r <= 0 || alpha <= 0) return;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * Math.min(1, alpha);
    ctx.drawImage(this.get(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = prev;
  },
};

// Zikzak şimşek noktaları
function boltPoints(x1, y1, x2, y2, segs, jitter) {
  const pts = [[x1, y1]];
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const off = (Math.random() * 2 - 1) * jitter * Math.sin(Math.PI * t);
    pts.push([x1 + dx * t + nx * off, y1 + dy * t + ny * off]);
  }
  pts.push([x2, y2]);
  return pts;
}

function strokePts(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}
