// history-title — documentary chapter card: a gilded year rolls up to its
// value, ornamental rules draw out from the centre, the title tracks in and a
// subtitle fades up while dust drifts through the light.
// Text: "1453 / İstanbul'un Fethi / Bir çağın sonu"

export default {
  id: 'history-title',
  title: 'History Title',
  tagline: 'Documentary chapter card: gilded year counter + title',
  fonts: [['Cinzel', 900], ['Cinzel', 700], ['Cormorant Garamond', 500, 'italic'], ['Cormorant Garamond', 700]],
  defaults: {
    text: '1071 / Bir Kapı Aralanıyor / Anadolu’nun eşiğinde',
    duration: 6,
    from: null,
    bg: '#140e08',
    gold: ['#fff1c9', '#e2b863', '#8a5a1c'],
    ink: '#efe3c8',
  },
  options: {
    text: '"<year> / <title> / <subtitle>" — year optional (e.g. "1453", "MÖ 330")',
    from: 'Year the counter starts from (default: year − 120)',
    gold: 'Three-stop gold gradient for the year',
  },

  setup(api) {
    const { W, H, p } = api;
    const parts = api.splitLines(p.text);
    let year = null;
    let prefix = '';
    if (parts.length && /\d{2,4}/.test(parts[0]) && parts[0].length <= 12) {
      const m = parts[0].match(/(\D*?)(\d{2,4})(\D*)/);
      prefix = (m[1] || '').trim();
      year = Number(m[2]);
      parts.shift();
    }
    const r = api.rng(p.seed);
    const dust = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, s: 0.5 + r() * 2.2, v: 10 + r() * 30, ph: r() * 6 }));
    return { year, prefix, title: parts[0] || '', sub: parts.slice(1).join(' · '), dust, grain: api.makeGrain(W, H, p.seed + 41, 4) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S } = api;
    api.bg(p.bg);
    if (!p.alpha) {
      // warm light pool
      const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.95);
      g.addColorStop(0, 'rgba(120,80,30,0.55)');
      g.addColorStop(0.5, 'rgba(60,35,12,0.3)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // god rays
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = -0.35 + i * 0.16 + Math.sin(t * 0.3 + i) * 0.02;
        ctx.save();
        ctx.translate(W * 0.25, -H * 0.05);
        ctx.rotate(a);
        const rg = ctx.createLinearGradient(0, 0, 0, H * 1.2);
        rg.addColorStop(0, 'rgba(255,220,150,0.07)');
        rg.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(-40 * S, 0, 80 * S + i * 20 * S, H * 1.2);
        ctx.restore();
      }
      ctx.restore();
    }
    const cy = H * 0.44;
    // ---- year ----
    if (s.year != null) {
      const from = p.from ?? s.year - 120;
      const e = ease.outExpo(prog(t, 0.2, 2.4));
      const val = Math.round(from + (s.year - from) * e);
      const label = (s.prefix ? s.prefix + ' ' : '') + String(val);
      const fs = Math.min(W * 0.36, (W * 0.84) / Math.max(3, label.length * 0.72));
      ctx.font = api.font(fs, 'Cinzel', 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const y = cy - 30 * S;
      const a = ease.outCubic(prog(t, 0.1, 0.8));
      ctx.globalAlpha = a;
      // emboss shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(label, W / 2 + 6 * S, y + 8 * S);
      const gg = ctx.createLinearGradient(0, y - fs * 0.75, 0, y);
      gg.addColorStop(0, p.gold[0]);
      gg.addColorStop(0.5, p.gold[1]);
      gg.addColorStop(1, p.gold[2]);
      ctx.fillStyle = gg;
      ctx.fillText(label, W / 2, y);
      // moving sheen
      const sx = api.lerp(-W * 0.3, W * 1.3, prog(t, 2.3, 3.4));
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const sh = ctx.createLinearGradient(sx - 120 * S, 0, sx + 120 * S, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0)');
      sh.addColorStop(0.5, 'rgba(255,255,240,0.75)');
      sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(0, y - fs, W, fs * 1.2);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // ---- ornamental rules ----
    const ry = cy + 40 * S;
    const re = ease.inOutCubic(prog(t, 1.2, 2.2));
    ctx.strokeStyle = p.gold[1];
    ctx.fillStyle = p.gold[1];
    ctx.lineWidth = 2.5 * S;
    const half = W * 0.36 * re;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 26 * S - half, ry);
    ctx.lineTo(W / 2 - 26 * S, ry);
    ctx.moveTo(W / 2 + 26 * S, ry);
    ctx.lineTo(W / 2 + 26 * S + half, ry);
    ctx.stroke();
    if (re > 0) {
      ctx.save();
      ctx.translate(W / 2, ry);
      ctx.rotate(Math.PI / 4);
      ctx.globalAlpha = re;
      ctx.fillRect(-10 * S, -10 * S, 20 * S, 20 * S);
      ctx.restore();
      ctx.globalAlpha = 1;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(W / 2 + sgn * (26 * S + half), ry, 5 * S * re, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ---- title (tracking in) ----
    if (s.title) {
      const a = ease.outCubic(prog(t, 1.6, 2.8));
      const title = api.upper(s.title, p.lang || 'tr');
      let fs = 74 * S;
      ctx.font = api.font(fs, 'Cinzel', 700);
      const track = api.lerp(28, 6, ease.outExpo(prog(t, 1.6, 3.4))) * S;
      const chars = api.graphemes(title);
      const widthAt = () => chars.reduce((w, c) => w + ctx.measureText(c).width + track, -track);
      while (widthAt() > W * 0.9 && fs > 10 * S) {
        fs *= 0.94;
        ctx.font = api.font(fs, 'Cinzel', 700);
      }
      let x = W / 2 - widthAt() / 2;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.ink;
      ctx.globalAlpha = a;
      for (const c of chars) {
        ctx.fillText(c, x, ry + 90 * S);
        x += ctx.measureText(c).width + track;
      }
      ctx.globalAlpha = 1;
    }
    if (s.sub) {
      const a = ease.outCubic(prog(t, 2.6, 3.6));
      ctx.font = `italic 500 ${Math.round(52 * S)}px "Cormorant Garamond"`;
      ctx.textAlign = 'center';
      ctx.fillStyle = api.rgba(p.ink, 0.8 * a);
      ctx.fillText(s.sub, W / 2, ry + 170 * S + (1 - a) * 16 * S);
    }
    // ---- dust in the light ----
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of s.dust) {
      const y = (d.y - t * d.v * S + H) % H;
      const x = d.x + Math.sin(t * 0.8 + d.ph) * 14 * S;
      ctx.fillStyle = `rgba(255,225,170,${0.25 + 0.25 * Math.sin(t * 2 + d.ph)})`;
      ctx.beginPath();
      ctx.arc(x, y, d.s * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.textAlign = 'left';
    if (!p.alpha) {
      api.vignette(ctx, W, H, 0.75);
      s.grain(ctx, api.frameOf(t), 0.07);
    }
  },
};
