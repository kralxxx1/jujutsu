'use strict';
// ---------------------------------------------------------------------------
// Savaş arayüzü: can/ulti barları, portreler, süre, raunt işaretleri,
// yetenek çubuğu (1-2-3-4-R-G), kombo sayacı ve ipuçları.
// ---------------------------------------------------------------------------

const HUD_FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';
const HUD_DISPLAY = 'Anton, Impact, "Arial Narrow", sans-serif';

const HUD = {
  draw(ctx, game, VW, VH) {
    const [a, b] = game.fighters;
    if (!a || !b) return;
    const lb = FX.letterbox;
    ctx.save();
    // sinematiklerde arayüz geri çekilir
    ctx.globalAlpha = 1 - lb * 0.85;
    this.bar(ctx, a, 22, 18, false, VW);
    this.bar(ctx, b, VW - 22, 18, true, VW);
    this.timer(ctx, game, VW);
    this.skillBar(ctx, game.player, 26, VH - 108, VW);
    this.combo(ctx, a, VW * 0.16, VH * 0.42, false);
    this.combo(ctx, b, VW * 0.84, VH * 0.42, true);
    if (game.hintT < 14 && game.phase !== 'matchEnd') this.hint(ctx, VW, VH, game.hintT);
    ctx.restore();
  },

  slantPath(ctx, x, y, w, h, sk) {
    ctx.beginPath();
    ctx.moveTo(x + sk, y);
    ctx.lineTo(x + w + sk, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  },

  portrait(ctx, f, x, y, r, mirror) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 6 + (i * TAU) / 6;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, -r, 0, r);
    bg.addColorStop(0, mixHex(f.accent, '#000000', 0.55));
    bg.addColorStop(1, '#07060b');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.scale(mirror ? -r / 22 : r / 22, r / 22);
    ctx.translate(-2, 2);
    const sk = { head: { x: 0, y: 2 }, ha: 0.05, neck: { x: -3, y: 30 }, t: 0.08 };
    f.drawHead(ctx, sk, f.palette(), false);
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = f.accent;
    ctx.stroke();
    ctx.restore();
  },

  bar(ctx, f, x, y, right, VW) {
    const W = Math.min(500, VW * 0.34), H = 24, sk = 12;
    const pr = 38;
    const px = right ? x - pr : x + pr;
    const bx = right ? x - pr * 2 - 14 - W : x + pr * 2 + 14;
    const by = y + 22;
    this.portrait(ctx, f, px, y + pr, pr, right);

    // isim
    ctx.textBaseline = 'alphabetic';
    ctx.font = `24px ${HUD_DISPLAY}`;
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillStyle = '#f2ede6';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    const nameX = right ? bx + W : bx;
    ctx.fillText(f.name, nameX, by - 4);
    const nw = ctx.measureText(f.name).width;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.font = `800 17px ${JP_FONT}`;
    ctx.fillStyle = f.accent;
    ctx.fillText(f.jpName, right ? nameX - nw - 10 : nameX + nw + 10, by - 5);

    // can barı
    const skew = right ? -sk : sk;
    ctx.save();
    this.slantPath(ctx, bx, by, W, H, skew);
    ctx.fillStyle = 'rgba(6,5,10,0.88)';
    ctx.fill();
    ctx.clip();
    const frac = clamp(f.hp / f.maxHp, 0, 1), dfrac = clamp(f.dispHp / f.maxHp, 0, 1);
    const fillW = (fr) => W * fr + sk;
    ctx.fillStyle = 'rgba(255,240,230,0.85)';
    if (right) ctx.fillRect(bx + W + sk - fillW(dfrac), by, fillW(dfrac), H);
    else ctx.fillRect(bx, by, fillW(dfrac), H);
    const low = frac < 0.25;
    const g = ctx.createLinearGradient(0, by, 0, by + H);
    if (low) {
      g.addColorStop(0, '#ffd23a');
      g.addColorStop(1, '#d97a0a');
    } else {
      g.addColorStop(0, mixHex(f.accent, '#ffffff', 0.35));
      g.addColorStop(0.55, f.accent);
      g.addColorStop(1, mixHex(f.accent, '#000000', 0.45));
    }
    ctx.fillStyle = g;
    if (right) ctx.fillRect(bx + W + sk - fillW(frac), by, fillW(frac), H);
    else ctx.fillRect(bx, by, fillW(frac), H);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(bx, by + 2, W + sk, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 10; i++) {
      const tx = bx + (W * i) / 10 + sk / 2;
      ctx.beginPath();
      ctx.moveTo(tx, by + H - 7);
      ctx.lineTo(tx, by + H);
      ctx.stroke();
    }
    ctx.restore();
    this.slantPath(ctx, bx, by, W, H, skew);
    ctx.strokeStyle = 'rgba(242,237,230,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `700 16px ${HUD_FONT}`;
    ctx.textAlign = right ? 'left' : 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(Math.ceil(f.hp)), right ? bx + 14 : bx + W - 6, by + H - 6);

    // ulti barı
    const uw = W * 0.62, uh = 10, uy = by + H + 8;
    const ux = right ? bx + W - uw : bx;
    ctx.save();
    this.slantPath(ctx, ux, uy, uw, uh, right ? -6 : 6);
    ctx.fillStyle = 'rgba(6,5,10,0.85)';
    ctx.fill();
    ctx.clip();
    const uf = clamp(f.ult / 100, 0, 1);
    const full = uf >= 1 && !f.inUlt();
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 120);
    ctx.fillStyle = f.inUlt() ? '#ffffff' : full ? rgba('#ffd23a', pulse) : mixHex(f.accent, '#ffffff', 0.2);
    const uw2 = f.inUlt() ? uw + 6 : (uw + 6) * uf;
    if (right) ctx.fillRect(ux + uw + 6 - uw2, uy, uw2, uh);
    else ctx.fillRect(ux, uy, uw2, uh);
    ctx.restore();
    ctx.font = `700 14px ${HUD_FONT}`;
    ctx.textAlign = right ? 'right' : 'left';
    const lx = right ? ux - 10 : ux + uw + 14;
    ctx.textAlign = right ? 'right' : 'left';
    if (f.inUlt()) {
      ctx.fillStyle = f.accent;
      ctx.fillText('ULTİ AKTİF', lx, uy + 10);
    } else if (full) {
      ctx.fillStyle = rgba('#ffd23a', pulse);
      ctx.fillText(f.isPlayer ? 'G · ULTİ HAZIR' : 'ULTİ HAZIR', lx, uy + 10);
    } else {
      ctx.fillStyle = 'rgba(242,237,230,0.6)';
      ctx.fillText(`ULTİ ${Math.floor(uf * 100)}%`, lx, uy + 10);
    }
  },

  timer(ctx, game, VW) {
    const cx = VW / 2, cy = 52;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(42, 0);
    ctx.lineTo(0, 36);
    ctx.lineTo(-42, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(6,5,10,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#d7192f';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = game.timer < 10 && !game.training ? '#ff4a5a' : '#f2ede6';
    ctx.font = `34px ${HUD_DISPLAY}`;
    ctx.fillText(game.training ? '∞' : String(Math.ceil(game.timer)), 0, 2);
    ctx.restore();
    if (game.training) {
      ctx.font = `700 15px ${HUD_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8c45a';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
      ctx.fillText('ANTRENMAN', cx, cy + 56);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      return;
    }
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 2; i++) {
        const x = cx + (side ? 1 : -1) * (58 + i * 20);
        ctx.beginPath();
        ctx.arc(x, cy + 8, 6.5, 0, TAU);
        ctx.fillStyle = game.wins[side] > i ? '#e8c45a' : 'rgba(6,5,10,0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(242,237,230,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  },

  skillBar(ctx, f, x, y, VW) {
    if (!f) return;
    const infos = f.skillInfo();
    const S = Math.min(64, (VW - 80) / 8.2), gap = 12;
    const t = performance.now() / 1000;
    infos.forEach((s, i) => {
      const sx = x + i * (S + gap) + (i >= 4 ? 14 : 0) + (i >= 5 ? 6 : 0);
      this.slot(ctx, sx, y, S, s, f.accent, t);
    });
  },

  slot(ctx, x, y, S, s, accent, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.save();
    ctx.transform(1, 0, -0.16, 1, S * 0.08, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, S);
    if (s.ready || s.active) {
      bg.addColorStop(0, mixHex(accent, '#000000', 0.45));
      bg.addColorStop(1, '#0a0910');
    } else {
      bg.addColorStop(0, '#16141e');
      bg.addColorStop(1, '#09080d');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);
    if (s.ult != null && !s.ready) {
      ctx.fillStyle = rgba(accent, 0.35);
      ctx.fillRect(0, S * (1 - s.ult), S, S * s.ult);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(S * 0.52)}px ${JP_FONT}`;
    ctx.fillStyle = s.ready || s.active ? '#ffffff' : '#5e586c';
    ctx.fillText(s.kanji, S / 2, S / 2 + 2);
    if (s.cd > 0.05) {
      const fr = clamp(s.cd / (s.cdMax || 1), 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, 0, S, S * fr);
      ctx.font = `700 ${Math.round(S * 0.34)}px ${HUD_FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.cd >= 10 ? Math.ceil(s.cd) : s.cd.toFixed(1), S / 2, S / 2);
    }
    let border = s.ready ? accent : 'rgba(120,112,140,0.6)';
    let lw = 2;
    if (s.highlight) {
      border = rgba('#ffd23a', 0.6 + 0.4 * Math.sin(t * 9));
      lw = 3.5;
    } else if (s.active) {
      border = rgba(accent, 0.6 + 0.4 * Math.sin(t * 5));
      lw = 3;
    }
    ctx.strokeStyle = border;
    ctx.lineWidth = lw;
    ctx.strokeRect(0, 0, S, S);
    // tuş etiketi
    ctx.fillStyle = '#f2ede6';
    ctx.fillRect(-4, -8, 22, 18);
    ctx.fillStyle = '#08070d';
    ctx.font = `700 14px ${HUD_FONT}`;
    ctx.fillText(s.key, 7, 1.5);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${S < 56 ? 11 : 13}px ${HUD_FONT}`;
    ctx.fillStyle = s.highlight ? '#ffd23a' : s.ready || s.active ? '#e6e0ee' : '#7a7488';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    ctx.fillText(s.name, S / 2, S + 7);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  },

  combo(ctx, f, x, y, right) {
    if (f.combo < 3 || f.comboT <= 0) return;
    const a = Math.min(1, f.comboT * 2);
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y);
    ctx.rotate(right ? 0.06 : -0.06);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `64px ${HUD_DISPLAY}`;
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#08070d';
    ctx.strokeText(String(f.combo), 0, 0);
    ctx.fillStyle = f.accent;
    ctx.fillText(String(f.combo), 0, 0);
    ctx.font = `22px ${HUD_DISPLAY}`;
    ctx.lineWidth = 5;
    ctx.strokeText('VURUŞ', 0, 26);
    ctx.fillStyle = '#f2ede6';
    ctx.fillText('VURUŞ', 0, 26);
    ctx.restore();
  },

  hint(ctx, VW, VH, t) {
    const a = t < 11 ? 1 : 1 - (t - 11) / 3;
    ctx.save();
    ctx.globalAlpha *= a * 0.9;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font = `600 15px ${HUD_FONT}`;
    ctx.fillStyle = '#d8d2e2';
    const lines = ['A/D hareket · W zıpla (çift) · S blok · Shift atılma', 'F / sol tık vuruş · 1-2-3-4 yetenek · R özel · G ulti · Esc duraklat'];
    lines.forEach((l, i) => ctx.fillText(l, VW - 24, VH - 30 - (lines.length - 1 - i) * 20));
    ctx.restore();
  },
};
