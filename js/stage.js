'use strict';
// ---------------------------------------------------------------------------
// Harita: Shibuya, 31 Ekim gecesi. "Tobari" (帳) perdesinin altındaki şehir;
// paralaks katmanlar bir kez çizilip önbelleğe alınır, neon/ekran/ateş gibi
// hareketli parçalar her karede üstüne eklenir.
// ---------------------------------------------------------------------------

const JP_FONT = '"Shippori Mincho B1", "Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif';

const Stage = {
  arena: null,
  layers: [],
  ash: [],
  clouds: [],
  stars: [],
  t: 0,
  skyCache: null,
  streetBack: 560, // sokağın arka kenarı (kaldırım)

  build(arena) {
    this.arena = arena;
    const rnd = mulberry32(1031);
    this.layers = [this.buildFar(rnd, 0.2), this.buildMid(rnd, 0.48), this.buildNear(rnd, 0.78)];
    this.asphalt = this.makeAsphalt(rnd);
    this.ash = [];
    for (let i = 0; i < 90; i++) this.ash.push({ x: Math.random(), y: Math.random(), s: rand(0.6, 2.4), v: rand(8, 30), d: rand(0, TAU), ember: Math.random() < 0.18 });
    this.clouds = [];
    for (let i = 0; i < 7; i++) this.clouds.push({ x: rand(0, 1), y: rand(0.05, 0.35), w: rand(220, 520), h: rand(30, 70), v: rand(2, 6), a: rand(0.12, 0.25) });
    this.stars = [];
    for (let i = 0; i < 70; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.45, s: rand(0.4, 1.4), p: rand(0, TAU) });
    this.puddles = [];
    for (let i = 0; i < 9; i++) this.puddles.push({ x: rand(arena.left - 300, arena.right + 300), y: rand(600, 700), w: rand(70, 180), c: pick(['#ff3d8b', '#3dc8ff', '#ffb347', '#b06bff']) });
    this.props = [];
    for (let i = 0; i < 26; i++) this.props.push({ x: rand(arena.left - 400, arena.right + 400), y: rand(585, 720), k: pick(['cup', 'cup', 'cone', 'glass', 'mask']), r: rand(-0.6, 0.6) });
  },

  newLayer(p, extraTop = 0) {
    const pad = 1300;
    const H = 900 + extraTop;
    const c = document.createElement('canvas');
    c.width = Math.ceil(this.arena.width * p + pad * 2);
    c.height = H;
    return { p, pad, canvas: c, g: c.getContext('2d'), baseY: H - 140, signs: [], screens: [], blinkers: [], fires: [], lamps: [] };
  },

  // --- Uzak siluet: Shibuya Scramble Square ve gökdelenler --------------------
  buildFar(rnd, p) {
    const L = this.newLayer(p);
    const g = L.g, B = L.baseY, W = L.canvas.width;
    const center = L.pad + this.arena.width * p * 0.5;
    let x = 0;
    while (x < W) {
      const w = 60 + rnd() * 130, h = 140 + rnd() * 300;
      this.silhouette(g, rnd, x, B, w, h, '#0c0e1f', '#3b3f6e', 0.12);
      x += w - 10 + rnd() * 30;
    }
    // Scramble Square
    const sx = center + 120, sw = 150, sh = 690;
    const gr = g.createLinearGradient(sx, 0, sx + sw, 0);
    gr.addColorStop(0, '#141a33');
    gr.addColorStop(0.5, '#1d2546');
    gr.addColorStop(1, '#0d1126');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(sx, B);
    g.lineTo(sx + 8, B - sh);
    g.lineTo(sx + sw - 8, B - sh + 18);
    g.lineTo(sx + sw, B);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(140,170,255,0.12)';
    g.lineWidth = 1;
    for (let i = 1; i < 9; i++) {
      g.beginPath();
      g.moveTo(sx + (sw * i) / 9, B);
      g.lineTo(sx + 8 + ((sw - 16) * i) / 9, B - sh + 6);
      g.stroke();
    }
    for (let y = B - sh + 40; y < B - 20; y += 14) {
      for (let i = 0; i < 9; i++) if (rnd() < 0.35) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(150,190,255,0.35)' : 'rgba(255,220,160,0.3)';
        g.fillRect(sx + 6 + i * 15.5, y, 8, 5);
      }
    }
    g.fillStyle = 'rgba(160,210,255,0.5)';
    g.fillRect(sx + 10, B - sh + 4, sw - 20, 6);
    L.blinkers.push({ x: sx + sw / 2, y: B - sh - 4 }, { x: sx + 14, y: B - sh + 2 });
    // Cerulean benzeri kule
    const cx2 = center - 560;
    g.fillStyle = '#10142a';
    g.fillRect(cx2, B - 520, 90, 520);
    g.fillStyle = '#151b38';
    g.fillRect(cx2 + 20, B - 560, 50, 40);
    L.blinkers.push({ x: cx2 + 45, y: B - 566 });
    for (let y = B - 500; y < B - 20; y += 13) for (let i = 0; i < 6; i++) if (rnd() < 0.3) {
      g.fillStyle = 'rgba(255,214,150,0.28)';
      g.fillRect(cx2 + 6 + i * 14, y, 7, 5);
    }
    // uzak ateş/duman sütunları (olayın izleri)
    for (let i = 0; i < 3; i++) L.fires.push({ x: center - 900 + i * 900 + rnd() * 300, y: B - 120 - rnd() * 80, s: 0.6 + rnd() * 0.5, smokeOnly: true });
    // ufuk sisi
    const fog = g.createLinearGradient(0, B - 260, 0, B);
    fog.addColorStop(0, 'rgba(60,20,50,0)');
    fog.addColorStop(1, 'rgba(70,26,58,0.55)');
    g.fillStyle = fog;
    g.fillRect(0, B - 260, W, 260);
    return L;
  },

  silhouette(g, rnd, x, B, w, h, col, win, density) {
    g.fillStyle = col;
    g.fillRect(x, B - h, w, h);
    if (rnd() < 0.4) g.fillRect(x + w * 0.3, B - h - 30, w * 0.25, 30);
    if (rnd() < 0.3) {
      g.fillRect(x + w * 0.5, B - h - 60, 3, 60);
    }
    for (let y = B - h + 10; y < B - 10; y += 12) {
      for (let xx = x + 5; xx < x + w - 8; xx += 10) {
        if (rnd() < density) {
          g.fillStyle = rgba(win, 0.4 + rnd() * 0.4);
          g.fillRect(xx, y, 5, 4);
        }
      }
    }
  },

  // --- Orta katman: 109, QFRONT, neon tabelalar, JR viyadüğü --------------------
  buildMid(rnd, p) {
    const L = this.newLayer(p);
    const g = L.g, B = L.baseY, W = L.canvas.width;
    const center = L.pad + this.arena.width * p * 0.5;
    const palette = ['#171a31', '#1b1e38', '#1f1d33', '#15182c', '#211a30', '#191c2f'];
    const signWords = ['渋谷', 'カラオケ', '居酒屋', 'ラーメン', '薬', 'ホテル', 'ゲーム', '焼肉', '書店', '映画', '寿司', '喫茶'];
    const signCols = ['#ff3d8b', '#3dc8ff', '#ffcf3d', '#7dff6a', '#ff6a3d', '#c78bff'];
    const reserved = [[center - 560, center - 330], [center + 170, center + 470]];
    let x = 0;
    while (x < W) {
      let w = 130 + rnd() * 190;
      const blocked = reserved.find(([a, b]) => x + w > a && x < b);
      if (blocked) {
        x = blocked[1] + 6;
        continue;
      }
      const h = 260 + rnd() * 330;
      this.building(g, rnd, x, B, w, h, pick(palette), 0.32);
      if (rnd() < 0.75) {
        const vertical = rnd() < 0.65;
        const word = pick(signWords);
        const col = pick(signCols);
        if (vertical) {
          const sh = 44 * word.length + 20;
          this.neon(g, L, x + w - 50 - rnd() * 30, B - h + 40 + rnd() * 60, 40, sh, word, col, true);
        } else {
          const sw = 42 * word.length + 30;
          if (sw < w - 10) this.neon(g, L, x + (w - sw) / 2, B - h + 24, sw, 50, word, col, false);
        }
      }
      if (rnd() < 0.35) {
        // reklam panosu
        const bw = w * 0.7, bh = 90;
        const bx = x + w * 0.15, by = B - h * 0.55;
        const gr = g.createLinearGradient(bx, by, bx + bw, by + bh);
        const c1 = pick(signCols), c2 = pick(signCols);
        gr.addColorStop(0, rgba(c1, 0.55));
        gr.addColorStop(1, rgba(c2, 0.35));
        g.fillStyle = '#0a0a12';
        g.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
        g.fillStyle = gr;
        g.fillRect(bx, by, bw, bh);
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.font = `800 34px ${JP_FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(pick(['新作', '限定', '祭', '夜', '呪']), bx + bw / 2, by + bh / 2);
      }
      x += w + 4 + rnd() * 10;
    }

    // SHIBUYA 109 silindir kulesi
    const tx = center - 520, tw = 170, th = 560;
    const cyl = g.createLinearGradient(tx, 0, tx + tw, 0);
    cyl.addColorStop(0, '#2d3040');
    cyl.addColorStop(0.35, '#9aa0b4');
    cyl.addColorStop(0.55, '#c9cede');
    cyl.addColorStop(0.8, '#5b6074');
    cyl.addColorStop(1, '#262838');
    g.fillStyle = '#1a1c2c';
    g.fillRect(tx + tw - 30, B - 300, 230, 300);
    this.windowsGrid(g, rnd, tx + tw - 20, B - 290, 210, 270, 0.4);
    g.fillStyle = cyl;
    g.beginPath();
    g.moveTo(tx, B);
    g.lineTo(tx, B - th);
    g.ellipse(tx + tw / 2, B - th, tw / 2, 16, 0, Math.PI, 0);
    g.lineTo(tx + tw, B);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(20,20,30,0.35)';
    g.lineWidth = 2;
    for (let y = B - th + 30; y < B; y += 28) {
      g.beginPath();
      g.ellipse(tx + tw / 2, y, tw / 2, 10, 0, 0, Math.PI);
      g.stroke();
    }
    // dikey tabela
    g.fillStyle = '#0c0b10';
    g.fillRect(tx + tw / 2 - 26, B - th + 90, 52, 380);
    this.neonText(g, 'SHIBUYA', tx + tw / 2, B - th + 120, '#ffffff', 30, true, '"Anton", Impact, sans-serif');
    L.signs.push({ x: tx + tw / 2 - 26, y: B - th + 90, w: 52, h: 380, color: '#ffffff', phase: 0, flick: false });
    // tepe "109"
    g.fillStyle = '#0c0b10';
    g.fillRect(tx + 10, B - th - 70, tw - 20, 64);
    this.neonText(g, '109', tx + tw / 2, B - th - 38, '#ff2a55', 54, false, '"Anton", Impact, sans-serif');
    L.signs.push({ x: tx + 10, y: B - th - 70, w: tw - 20, h: 64, color: '#ff2a55', phase: 1.3, flick: false });

    // QFRONT dev ekranlı cam bina
    const qx = center + 190, qw = 270, qh = 450;
    const glass = g.createLinearGradient(qx, B - qh, qx + qw, B);
    glass.addColorStop(0, '#1d2a4a');
    glass.addColorStop(1, '#101626');
    g.fillStyle = glass;
    g.fillRect(qx, B - qh, qw, qh);
    g.strokeStyle = 'rgba(130,170,255,0.18)';
    g.lineWidth = 1;
    for (let i = 1; i < 12; i++) {
      g.beginPath();
      g.moveTo(qx + (qw * i) / 12, B - qh);
      g.lineTo(qx + (qw * i) / 12, B);
      g.stroke();
    }
    for (let y = B - qh + 20; y < B; y += 26) {
      g.beginPath();
      g.moveTo(qx, y);
      g.lineTo(qx + qw, y);
      g.stroke();
    }
    g.fillStyle = '#05060a';
    g.fillRect(qx + 18, B - qh + 40, qw - 36, 160);
    L.screens.push({ x: qx + 24, y: B - qh + 46, w: qw - 48, h: 148 });
    this.windowsGrid(g, rnd, qx + 10, B - qh + 230, qw - 20, 180, 0.55);

    // JR viyadüğü + Yamanote treni (dünya şehrin önünde, binaların altında)
    const vy = B - 200;
    g.fillStyle = '#20222c';
    g.fillRect(0, vy, W, 34);
    g.fillStyle = '#2c2f3c';
    g.fillRect(0, vy, W, 6);
    for (let px = 40; px < W; px += 230) {
      g.fillStyle = '#1a1b24';
      g.fillRect(px, vy + 34, 30, 166);
      g.fillStyle = 'rgba(255,255,255,0.04)';
      g.fillRect(px, vy + 34, 5, 166);
    }
    // tren vagonları
    const trainX = center - 300;
    for (let i = 0; i < 4; i++) {
      const cx = trainX + i * 205;
      g.fillStyle = '#b8bcc8';
      g.beginPath();
      g.roundRect ? g.roundRect(cx, vy - 66, 198, 64, 8) : g.rect(cx, vy - 66, 198, 64);
      g.fill();
      g.fillStyle = '#7ac943';
      g.fillRect(cx, vy - 24, 198, 8);
      for (let k = 0; k < 6; k++) {
        g.fillStyle = rnd() < 0.7 ? '#ffe9b0' : '#3a3f52';
        g.fillRect(cx + 12 + k * 31, vy - 56, 22, 22);
      }
      g.fillStyle = '#2a2d38';
      g.fillRect(cx + 4, vy - 6, 190, 6);
    }
    L.lamps.push({ x: trainX + 400, y: vy - 40, r: 420, c: '#ffe9b0', a: 0.08 });

    // alt kat dükkân ışıkları
    const fog = g.createLinearGradient(0, B - 200, 0, B);
    fog.addColorStop(0, 'rgba(255,120,80,0)');
    fog.addColorStop(1, 'rgba(255,120,90,0.12)');
    g.fillStyle = fog;
    g.fillRect(0, B - 200, W, 200);
    L.fires.push({ x: center - 120, y: B - 230, s: 1.1, smokeOnly: false }, { x: center + 760, y: B - 300, s: 0.8, smokeOnly: true });
    return L;
  },

  building(g, rnd, x, B, w, h, col, lit) {
    const top = B - h;
    const gr = g.createLinearGradient(x, top, x, B);
    gr.addColorStop(0, mixHex(col, '#3a3560', 0.25));
    gr.addColorStop(1, col);
    g.fillStyle = gr;
    g.fillRect(x, top, w, h);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(x + w * 0.84, top, w * 0.16, h);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(x, top, 3, h);
    g.fillRect(x, top, w, 3);
    this.windowsGrid(g, rnd, x + 8, top + 16, w * 0.82 - 10, h - 46, lit);
    if (rnd() < 0.6) {
      g.fillStyle = mixHex(col, '#000000', 0.3);
      g.fillRect(x + w * 0.15, top - 22, 34, 22);
      g.fillRect(x + w * 0.15 + 4, top - 30, 26, 8);
    }
    if (rnd() < 0.5) {
      g.fillStyle = mixHex(col, '#000000', 0.2);
      g.fillRect(x + w * 0.6, top - 70, 3, 70);
      g.fillRect(x + w * 0.6 - 10, top - 50, 23, 2);
    }
  },

  windowsGrid(g, rnd, x, y, w, h, lit) {
    const cw = 17, ch = 22;
    for (let yy = y; yy < y + h - ch; yy += ch) {
      const floorOn = rnd() < 0.72;
      const warm = rnd() < 0.6;
      for (let xx = x; xx < x + w - cw + 4; xx += cw) {
        if (floorOn && rnd() < lit) {
          const a = 0.35 + rnd() * 0.5;
          g.fillStyle = warm ? `rgba(255,${200 + ((rnd() * 40) | 0)},140,${a})` : `rgba(150,${190 + ((rnd() * 40) | 0)},255,${a})`;
        } else g.fillStyle = 'rgba(8,10,22,0.55)';
        g.fillRect(xx, yy, cw - 6, ch - 9);
      }
    }
  },

  neon(g, L, x, y, w, h, text, color, vertical) {
    g.save();
    g.fillStyle = '#0b0a12';
    g.fillRect(x, y, w, h);
    g.shadowColor = color;
    g.shadowBlur = 16;
    g.strokeStyle = color;
    g.lineWidth = 2.5;
    g.strokeRect(x + 4, y + 4, w - 8, h - 8);
    g.restore();
    if (vertical) {
      const chars = [...text];
      chars.forEach((ch, i) => this.neonText(g, ch, x + w / 2, y + 30 + i * 44, color, 30, false));
    } else this.neonText(g, text, x + w / 2, y + h / 2 + 2, color, 32, false);
    L.signs.push({ x, y, w, h, color, phase: Math.random() * 10, flick: Math.random() < 0.35 });
  },

  neonText(g, text, x, y, color, size, vertical, font = JP_FONT) {
    g.save();
    g.font = `800 ${size}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.fillStyle = color;
    if (vertical) {
      [...text].forEach((ch, i) => {
        g.fillText(ch, x, y + i * (size + 8));
        g.fillText(ch, x, y + i * (size + 8));
      });
    } else {
      g.fillText(text, x, y);
      g.shadowBlur = 4;
      g.fillStyle = mixHex(color, '#ffffff', 0.55);
      g.fillText(text, x, y);
    }
    g.restore();
  },

  // --- Yakın katman: sokak seviyesi, Hachikō, sinyaller, otomatlar --------------
  buildNear(rnd, p) {
    const L = this.newLayer(p);
    const g = L.g, B = L.baseY, W = L.canvas.width;
    const center = L.pad + this.arena.width * p * 0.5;
    // dükkân cepheleri
    let x = 0;
    const shopWords = ['コンビニ', '薬局', '花屋', 'カフェ', '靴', '服', '時計', '酒'];
    while (x < W) {
      const w = 180 + rnd() * 160, h = 150 + rnd() * 70;
      const col = pick(['#22202e', '#1d2030', '#262233', '#1c1c28']);
      g.fillStyle = col;
      g.fillRect(x, B - h, w, h);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(x, B - h, w, 8);
      const lit = rnd() < 0.7;
      const shopCol = pick(['#ffe2a8', '#bfe3ff', '#ffd0e4', '#d8ffd0']);
      if (lit) {
        const gr = g.createLinearGradient(0, B - h + 50, 0, B);
        gr.addColorStop(0, rgba(shopCol, 0.85));
        gr.addColorStop(1, rgba(shopCol, 0.35));
        g.fillStyle = gr;
      } else g.fillStyle = '#121219';
      g.fillRect(x + 12, B - h + 52, w - 24, h - 56);
      if (!lit || rnd() < 0.4) {
        // yarı kapalı kepenk
        const sh = lit ? (h - 56) * 0.5 : h - 56;
        g.fillStyle = '#3a3a46';
        g.fillRect(x + 12, B - h + 52, w - 24, sh);
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1;
        for (let yy = B - h + 56; yy < B - h + 52 + sh; yy += 6) {
          g.beginPath();
          g.moveTo(x + 12, yy);
          g.lineTo(x + w - 12, yy);
          g.stroke();
        }
      }
      // tabela bandı
      const sc = pick(['#d4142c', '#1450d4', '#f5a623', '#118a5a', '#2a2a2a']);
      g.fillStyle = sc;
      g.fillRect(x + 6, B - h + 12, w - 12, 34);
      g.fillStyle = '#ffffff';
      g.font = `800 22px ${JP_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(pick(shopWords), x + w / 2, B - h + 30);
      x += w + 2;
    }

    // Hachikō heykeli
    const hx = center - 260;
    g.fillStyle = '#2a2a33';
    g.fillRect(hx - 50, B - 110, 100, 110);
    g.fillStyle = '#34343f';
    g.fillRect(hx - 58, B - 118, 116, 12);
    g.fillStyle = '#c9b27a';
    g.fillRect(hx - 30, B - 80, 60, 26);
    g.fillStyle = '#2a2a33';
    g.font = `800 14px ${JP_FONT}`;
    g.textAlign = 'center';
    g.fillText('忠犬ハチ公', hx, B - 66);
    this.dog(g, hx, B - 118);
    // ağaç
    g.fillStyle = '#2b1f1a';
    g.fillRect(hx - 160, B - 210, 14, 210);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(${20 + rnd() * 20},${40 + rnd() * 30},${40 + rnd() * 20},0.95)`;
      g.beginPath();
      g.arc(hx - 153 + rand(-60, 60), B - 230 + rand(-50, 30), 40 + rnd() * 30, 0, TAU);
      g.fill();
    }

    // otomatlar
    for (let i = 0; i < 3; i++) {
      const vx = center + 420 + i * 56;
      g.fillStyle = i === 1 ? '#d6202c' : '#e8eef8';
      g.fillRect(vx, B - 150, 52, 150);
      g.fillStyle = '#ffffff';
      g.fillRect(vx + 5, B - 140, 42, 70);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        g.fillStyle = pick(['#f44', '#4af', '#fd3', '#4d4', '#f8a', '#fff']);
        g.fillRect(vx + 8 + c * 10, B - 134 + r * 22, 6, 16);
      }
      g.fillStyle = '#1a1a22';
      g.fillRect(vx + 8, B - 50, 36, 16);
      L.lamps.push({ x: vx + 26, y: B - 100, r: 120, c: '#cfe8ff', a: 0.35 });
    }

    // sokak lambaları ve trafik sinyalleri
    for (let lx = 120; lx < W; lx += 520) {
      g.fillStyle = '#15151c';
      g.fillRect(lx, B - 330, 9, 330);
      g.fillRect(lx, B - 330, 70, 7);
      g.fillStyle = '#ffd9a0';
      g.fillRect(lx + 50, B - 324, 26, 7);
      L.lamps.push({ x: lx + 63, y: B - 318, r: 260, c: '#ffb46a', a: 0.32 });
    }
    for (let sx = 380; sx < W; sx += 780) {
      g.fillStyle = '#1a1a22';
      g.fillRect(sx, B - 280, 8, 280);
      g.fillRect(sx - 10, B - 285, 110, 34);
      const on = rnd() < 0.5 ? 0 : 2;
      for (let k = 0; k < 3; k++) {
        g.fillStyle = k === on ? ['#38ffb0', '#ffd23a', '#ff3a3a'][k] : '#2a2a30';
        g.beginPath();
        g.arc(sx + 8 + k * 32, B - 268, 11, 0, TAU);
        g.fill();
      }
      L.lamps.push({ x: sx + 8 + on * 32, y: B - 268, r: 70, c: on === 0 ? '#38ffb0' : '#ff3a3a', a: 0.6, blink: true });
      // yaya sinyali
      g.fillStyle = '#1a1a22';
      g.fillRect(sx + 14, B - 200, 30, 50);
      g.fillStyle = '#ff4040';
      g.fillRect(sx + 22, B - 192, 14, 16);
    }

    // yanmış araç
    const carX = center + 760;
    this.car(g, carX, B, true);
    L.fires.push({ x: carX + 90, y: B - 60, s: 1.0, smokeOnly: false });
    this.car(g, center - 860, B, false);

    // korkuluklar
    g.fillStyle = '#c9ccd6';
    for (let rx = 0; rx < W; rx += 4) {
      if (Math.floor(rx / 300) % 3 === 1) continue;
      if (rx % 60 === 0) g.fillRect(rx, B - 46, 5, 46);
    }
    g.fillRect(0, B - 46, W, 4);
    g.fillRect(0, B - 26, W, 3);
    for (let rx = 0; rx < W; rx += 900) {
      g.clearRect(rx + 300, B - 48, 300, 26);
    }
    return L;
  },

  dog(g, x, y) {
    g.save();
    g.translate(x, y);
    g.fillStyle = '#5b4a33';
    g.strokeStyle = '#2a2016';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(-4, -26, 26, 22, 0, 0, TAU);
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(14, -50, 13, 15, -0.2, 0, TAU);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(18, -48);
    g.lineTo(34, -44);
    g.lineTo(22, -38);
    g.fill();
    g.beginPath();
    g.moveTo(8, -62);
    g.lineTo(10, -76);
    g.lineTo(17, -63);
    g.fill();
    g.fillRect(12, -30, 7, 30);
    g.fillRect(2, -30, 7, 30);
    g.fillStyle = 'rgba(255,220,160,0.25)';
    g.beginPath();
    g.ellipse(-10, -34, 10, 8, -0.6, 0, TAU);
    g.fill();
    g.restore();
  },

  car(g, x, B, wrecked) {
    g.save();
    g.translate(x, B);
    if (wrecked) g.rotate(-0.05);
    g.fillStyle = wrecked ? '#2a201c' : '#3a4a6a';
    g.beginPath();
    g.moveTo(0, -18);
    g.lineTo(10, -48);
    g.lineTo(55, -52);
    g.lineTo(80, -84);
    g.lineTo(150, -84);
    g.lineTo(180, -52);
    g.lineTo(215, -46);
    g.lineTo(220, -18);
    g.closePath();
    g.fill();
    g.fillStyle = wrecked ? '#140e0c' : '#9fc6ff';
    g.beginPath();
    g.moveTo(86, -78);
    g.lineTo(146, -78);
    g.lineTo(168, -54);
    g.lineTo(66, -54);
    g.closePath();
    g.fill();
    g.fillStyle = '#0c0c10';
    g.beginPath();
    g.arc(50, -16, 18, 0, TAU);
    g.arc(170, -16, 18, 0, TAU);
    g.fill();
    if (wrecked) {
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(20, -50, 60, 20);
    } else {
      g.fillStyle = '#ffe9a8';
      g.fillRect(208, -42, 10, 8);
    }
    g.restore();
  },

  makeAsphalt(rnd) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#17161e';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = 20 + rnd() * 30;
      g.fillStyle = `rgba(${v},${v},${v + 8},${0.35 + rnd() * 0.4})`;
      g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 1.5);
    }
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      let px = rnd() * 256, py = rnd() * 256;
      g.moveTo(px, py);
      for (let k = 0; k < 6; k++) {
        px += rand(-20, 20);
        py += rand(-12, 12);
        g.lineTo(px, py);
      }
      g.stroke();
    }
    return c;
  },

  // --- Çizim -----------------------------------------------------------------------
  drawSky(ctx, cam, VW, VH, darken) {
    if (!this.skyCache || this.skyCache.h !== VH) {
      const gr = ctx.createLinearGradient(0, 0, 0, VH);
      gr.addColorStop(0, '#04040b');
      gr.addColorStop(0.35, '#0d0a1e');
      gr.addColorStop(0.62, '#2a1230');
      gr.addColorStop(0.8, '#4a1a35');
      gr.addColorStop(1, '#22101e');
      this.skyCache = { h: VH, gr };
    }
    ctx.fillStyle = this.skyCache.gr;
    ctx.fillRect(0, 0, VW, VH);
    // yıldızlar
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(this.t * 2 + s.p);
      ctx.fillRect(((s.x * VW * 1.3 - cam.x * 0.02) % (VW * 1.3) + VW * 1.3) % (VW * 1.3), s.y * VH, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    // ay
    const mx = VW * 0.8 - cam.x * 0.03, my = VH * 0.17;
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, mx, my, 170, '#ff9a8a', 0.22);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#f4e6dc';
    ctx.beginPath();
    ctx.arc(mx, my, 40, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,120,120,0.25)';
    ctx.beginPath();
    ctx.arc(mx - 12, my - 8, 9, 0, TAU);
    ctx.arc(mx + 10, my + 12, 6, 0, TAU);
    ctx.arc(mx + 14, my - 14, 4, 0, TAU);
    ctx.fill();
    // bulutlar
    for (const c of this.clouds) {
      const x = ((c.x * VW * 1.6 + this.t * c.v - cam.x * 0.05) % (VW * 1.6) + VW * 1.6) % (VW * 1.6) - VW * 0.3;
      ctx.fillStyle = `rgba(10,6,18,${c.a + 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, c.y * VH, c.w, c.h, 0, 0, TAU);
      ctx.fill();
    }
    // tobari (帳) perdesinin kubbe kenarı
    const vx = VW / 2 - cam.x * 0.03, vyc = VH * 1.75;
    const rx = VW * 1.25, ry = VH * 1.62;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VW, VH);
    ctx.ellipse(vx, vyc, rx, ry, 0, 0, TAU, true);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill('evenodd');
    ctx.restore();
    ctx.strokeStyle = 'rgba(150,90,255,0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(vx, vyc, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,90,255,0.07)';
    ctx.lineWidth = 14;
    ctx.stroke();
    if (darken) {
      ctx.fillStyle = `rgba(0,0,0,${darken})`;
      ctx.fillRect(0, 0, VW, VH);
    }
  },

  layerXform(L, cam, VW, VH) {
    const zl = lerp(1, cam.zoom, L.p);
    const backSY = VH / 2 + (this.streetBack - cam.y) * cam.zoom;
    const baseSY = lerp(VH * 0.78, backSY, Math.min(1, L.p + 0.12));
    const sx0 = VW / 2 - (cam.x * L.p + L.pad) * zl;
    const sy0 = baseSY - L.baseY * zl;
    return { zl, sx0, sy0 };
  },

  drawLayers(ctx, cam, VW, VH) {
    const t = this.t;
    for (const L of this.layers) {
      const { zl, sx0, sy0 } = this.layerXform(L, cam, VW, VH);
      ctx.drawImage(L.canvas, sx0, sy0, L.canvas.width * zl, L.canvas.height * zl);
      ctx.save();
      ctx.translate(sx0, sy0);
      ctx.scale(zl, zl);
      // neon titreşimi
      ctx.globalCompositeOperation = 'lighter';
      for (const s of L.signs) {
        let on = 0.5 + 0.18 * Math.sin(t * 3 + s.phase);
        if (s.flick) {
          const k = (t * 1.3 + s.phase) % 7;
          if (k < 0.12 || (k > 0.25 && k < 0.33)) on = 0;
        }
        if (on > 0) Glow.draw(ctx, s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) * 0.9, s.color, on * 0.35);
      }
      for (const l of L.lamps) {
        let a = l.a;
        if (l.blink) a *= 0.7 + 0.3 * Math.sin(t * 4);
        Glow.draw(ctx, l.x, l.y, l.r, l.c, a);
      }
      for (const b of L.blinkers) {
        const on = Math.sin(t * 2.5 + b.x) > 0.3;
        if (on) Glow.draw(ctx, b.x, b.y, 18, '#ff2020', 0.9);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const s of L.screens) this.drawScreenAd(ctx, s);
      for (const f of L.fires) this.drawFire(ctx, f);
      ctx.restore();
      if (L.p < 0.3) {
        // uzak katmanı atmosferle bastır
        ctx.fillStyle = 'rgba(30,10,40,0.18)';
        ctx.fillRect(0, 0, VW, VH);
      }
    }
  },

  drawScreenAd(ctx, s) {
    const t = this.t;
    const phase = Math.floor(t / 3.5) % 3;
    ctx.save();
    ctx.beginPath();
    ctx.rect(s.x, s.y, s.w, s.h);
    ctx.clip();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (phase === 0) {
      const blink = Math.sin(t * 8) > 0;
      ctx.fillStyle = blink ? '#b0101c' : '#4a0008';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 46px ${JP_FONT}`;
      ctx.fillText('緊急事態', s.x + s.w / 2, s.y + s.h * 0.4);
      ctx.font = `800 20px ${JP_FONT}`;
      ctx.fillText('避難してください', s.x + s.w / 2, s.y + s.h * 0.78);
    } else if (phase === 1) {
      const gr = ctx.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
      gr.addColorStop(0, '#ff7a1a');
      gr.addColorStop(1, '#6a1aff');
      ctx.fillStyle = gr;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = '44px Anton, Impact, sans-serif';
      ctx.fillText('HALLOWEEN', s.x + s.w / 2 + Math.sin(t * 2) * 6, s.y + s.h * 0.45);
      ctx.font = `800 22px ${JP_FONT}`;
      ctx.fillText('10.31 渋谷', s.x + s.w / 2, s.y + s.h * 0.8);
    } else {
      for (let i = 0; i < 40; i++) {
        const v = (Math.random() * 120) | 0;
        ctx.fillStyle = `rgb(${v},${v},${v + 10})`;
        ctx.fillRect(s.x, s.y + Math.random() * s.h, s.w, 2 + Math.random() * 6);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `800 40px ${JP_FONT}`;
      ctx.fillText('帳', s.x + s.w / 2 + rand(-3, 3), s.y + s.h / 2);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, s.x + s.w / 2, s.y + s.h / 2, s.w * 0.9, phase === 0 ? '#ff2030' : phase === 1 ? '#c070ff' : '#8090a0', 0.25);
    ctx.globalCompositeOperation = 'source-over';
  },

  drawFire(ctx, f) {
    const t = this.t;
    // duman
    for (let i = 0; i < 6; i++) {
      const k = ((t * 0.25 + i / 6) % 1);
      ctx.fillStyle = `rgba(20,14,22,${0.35 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(f.x + Math.sin(k * 6 + i) * 20 * f.s + k * 60 * f.s, f.y - k * 260 * f.s, (20 + k * 60) * f.s, 0, TAU);
      ctx.fill();
    }
    if (f.smokeOnly) return;
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, f.x, f.y, 140 * f.s, '#ff6a1a', 0.5 + 0.15 * Math.sin(t * 13));
    for (let i = 0; i < 7; i++) {
      const ph = t * 6 + i * 1.7;
      const h = (40 + 30 * Math.sin(ph)) * f.s;
      const x = f.x + (i - 3) * 9 * f.s;
      ctx.fillStyle = i % 2 ? 'rgba(255,170,60,0.7)' : 'rgba(255,90,30,0.7)';
      ctx.beginPath();
      ctx.moveTo(x - 10 * f.s, f.y);
      ctx.quadraticCurveTo(x + Math.sin(ph * 1.3) * 10 * f.s, f.y - h * 0.6, x + Math.sin(ph) * 6 * f.s, f.y - h);
      ctx.quadraticCurveTo(x + 4 * f.s, f.y - h * 0.4, x + 10 * f.s, f.y);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  },

  // Dünya koordinatında sokak zemini
  drawGround(ctx, cam, VW, VH) {
    const A = this.arena;
    const left = cam.x - VW / cam.zoom, right = cam.x + VW / cam.zoom;
    const top = this.streetBack, bot = cam.y + VH / cam.zoom + 50;
    // kaldırım
    ctx.fillStyle = '#26232f';
    ctx.fillRect(left, top - 6, right - left, 26);
    ctx.fillStyle = '#3a3646';
    ctx.fillRect(left, top + 18, right - left, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let x = Math.floor(left / 46) * 46; x < right; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, top - 6);
      ctx.lineTo(x - 6, top + 18);
      ctx.stroke();
    }
    // asfalt
    const pat = ctx.createPattern(this.asphalt, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(left, top + 23, right - left, bot - top);
    // derinlik gölgesi
    const sh = ctx.createLinearGradient(0, top + 23, 0, top + 120);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(left, top + 23, right - left, 100);

    // Scramble yaya geçidi
    const vpx = A.width / 2;
    ctx.fillStyle = 'rgba(225,225,232,0.78)';
    for (let i = -16; i <= 16; i++) {
      const xc = vpx + i * 74;
      if (xc < left - 200 || xc > right + 200) continue;
      const y1 = 588, y2 = 780;
      const spreadTop = (xc - vpx) * 0.04, spreadBot = (xc - vpx) * 0.22;
      ctx.beginPath();
      ctx.moveTo(xc - 17 + spreadTop, y1);
      ctx.lineTo(xc + 17 + spreadTop, y1);
      ctx.lineTo(xc + 24 + spreadBot, y2);
      ctx.lineTo(xc - 24 + spreadBot, y2);
      ctx.closePath();
      ctx.fill();
    }
    // çapraz geçit
    ctx.fillStyle = 'rgba(225,225,232,0.42)';
    for (let i = -6; i <= 6; i++) {
      const xc = vpx + 1500 + i * 70;
      ctx.beginPath();
      ctx.moveTo(xc, 590);
      ctx.lineTo(xc + 34, 590);
      ctx.lineTo(xc - 120 + 34, 780);
      ctx.lineTo(xc - 120, 780);
      ctx.closePath();
      ctx.fill();
      const xm = vpx - 1500 + i * 70;
      ctx.beginPath();
      ctx.moveTo(xm, 590);
      ctx.lineTo(xm + 34, 590);
      ctx.lineTo(xm + 154, 780);
      ctx.lineTo(xm + 120, 780);
      ctx.closePath();
      ctx.fill();
    }
    // şerit çizgisi
    ctx.fillStyle = 'rgba(255,210,80,0.55)';
    for (let x = Math.floor(left / 120) * 120; x < right; x += 120) {
      if (Math.abs(x - vpx) < 1300) continue;
      ctx.fillRect(x, 660, 60, 5);
    }
    // su birikintileri: neon yansıması
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.puddles) {
      if (p.x < left - 200 || p.x > right + 200) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, 0.18);
      Glow.draw(ctx, 0, 0, p.w, p.c, 0.22 + 0.05 * Math.sin(this.t * 2 + p.x));
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Cadılar Bayramı çöpleri
    for (const p of this.props) {
      if (p.x < left - 50 || p.x > right + 50) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      if (p.k === 'cup') {
        ctx.fillStyle = '#d8d4cc';
        ctx.fillRect(-6, -4, 13, 8);
        ctx.fillStyle = '#c0242c';
        ctx.fillRect(-6, -4, 4, 8);
      } else if (p.k === 'cone') {
        ctx.fillStyle = '#ff6a1a';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(0, -28);
        ctx.lineTo(10, 0);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-5, -16, 10, 4);
      } else if (p.k === 'mask') {
        ctx.fillStyle = '#f0a020';
        ctx.beginPath();
        ctx.ellipse(0, -5, 10, 7, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillRect(-5, -7, 3, 3);
        ctx.fillRect(2, -7, 3, 3);
      } else {
        ctx.fillStyle = 'rgba(190,220,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(0, -6);
        ctx.lineTo(6, 1);
        ctx.fill();
      }
      ctx.restore();
    }
    // ön kenar kararması
    const fg = ctx.createLinearGradient(0, 700, 0, 820);
    fg.addColorStop(0, 'rgba(5,3,10,0)');
    fg.addColorStop(1, 'rgba(5,3,10,0.85)');
    ctx.fillStyle = fg;
    ctx.fillRect(left, 700, right - left, Math.max(0, bot - 700));
  },

  drawAsh(ctx, VW, VH, dt) {
    ctx.save();
    for (const a of this.ash) {
      a.y += (a.v * dt) / VH;
      a.d += dt;
      if (a.y > 1.05) {
        a.y = -0.05;
        a.x = Math.random();
      }
      const x = (a.x * VW + Math.sin(a.d * 0.8) * 30 + VW) % VW;
      if (a.ember) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,140,60,${0.5 + 0.3 * Math.sin(a.d * 5)})`;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(150,140,160,0.45)';
      }
      ctx.fillRect(x, a.y * VH, a.s, a.s);
    }
    ctx.restore();
  },

  vignette(ctx, VW, VH) {
    if (!this.vig || this.vig.w !== VW || this.vig.h !== VH) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(VW);
      c.height = Math.ceil(VH);
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(VW / 2, VH * 0.55, VH * 0.35, VW / 2, VH * 0.55, VW * 0.75);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = gr;
      g.fillRect(0, 0, VW, VH);
      this.vig = { w: VW, h: VH, c };
    }
    ctx.drawImage(this.vig.c, 0, 0, VW, VH);
  },
};
