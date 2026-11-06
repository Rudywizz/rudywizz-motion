// inflate — Y2K chrome balloon letters: each glyph puffs up with a springy
// squash & stretch, then bobs while sparkles twinkle around it.

export default {
  id: 'inflate',
  title: 'Inflate',
  tagline: 'Y2K chrome balloon letters puff up and bounce',
  fonts: [['Unbounded', 900]],
  defaults: {
    text: 'Feel / good',
    duration: 6,
    bgTop: '#c9b8ff',
    bgBottom: '#8ff0ff',
    chrome: ['#140f3a', '#3a2c9c', '#7f6dff', '#c6f3ff', '#ffffff'],
    face: ['#ffffff', '#bfe9ff', '#5a46d6', '#ff9ad8', '#ffffff'],
    sparkle: '#ffffff',
  },
  options: {
    chrome: 'Puff ramp from rim to crown (array of hex)',
    face: 'Chrome face gradient top→bottom: sky, horizon, ground (array of hex)',
    bgTop: 'Background gradient top',
    bgBottom: 'Background gradient bottom',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    let lines = api.splitLines(api.upper(p.text, p.lang));
    if (lines.length === 1 && api.words(lines[0]).length > 1) lines = api.words(lines[0]);
    lines = api.breakLongWords(ctx, lines, { family: 'Unbounded', weight: 900, maxW: W * 0.8, minSize: Math.min(W, H) * 0.09 });
    const size = api.fitSize(ctx, lines, { family: 'Unbounded', weight: 900, maxW: W * 0.8, maxH: H * 0.48, lineHeight: 1.18, max: W * 0.3 });
    ctx.font = api.font(size, 'Unbounded', 900);
    const lh = size * 1.15;
    const top = H * 0.47 - (lines.length * lh) / 2;
    const glyphs = [];
    lines.forEach((l, li) => {
      const lay = api.layoutChars(ctx, l);
      lay.chars.forEach((c) => {
        if (c.c.trim()) glyphs.push({ ...c, x: W / 2 - lay.width / 2 + c.x + c.w / 2, y: top + (li + 0.5) * lh, i: glyphs.length });
      });
    });
    const r = api.rng(p.seed);
    const sparkles = Array.from({ length: 22 }, () => ({ x: r() * W, y: r() * H, s: 0.4 + r(), ph: r() * 6 }));
    return { glyphs, size, sparkles };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, prog, S, mixHex } = api;
    if (!p.alpha) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, p.bgTop);
      g.addColorStop(1, p.bgBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // soft grid floor
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2 * S;
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + i * 30 * S, H * 0.74);
        ctx.lineTo(W / 2 + i * 220 * S, H);
        ctx.stroke();
      }
      for (let k = 0; k < 7; k++) {
        const y = H * 0.74 + (H * 0.26) * Math.pow(k / 6, 1.8);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    } else api.bg(null);

    const ramp = p.chrome;
    const colorAt = (u) => {
      const x = u * (ramp.length - 1);
      const i = Math.min(ramp.length - 2, Math.floor(x));
      return mixHex(ramp[i], ramp[i + 1], x - i);
    };
    const layers = 16;
    ctx.font = api.font(s.size, 'Unbounded', 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    for (const gph of s.glyphs) {
      const t0 = 0.25 + gph.i * 0.09;
      const puff = api.spring(t - t0, { freq: 1.5, damping: 0.32 });
      if (puff <= 0.001) continue;
      const bob = Math.sin((t - t0) * 2.6 + gph.i) * 10 * S * Math.min(1, Math.max(0, t - t0 - 1));
      const stretch = 1 + (puff - 1) * 0.6;
      const sxk = Math.max(0.05, puff) * (2 - stretch);
      const syk = Math.max(0.05, puff) * stretch;
      // floor shadow
      if (!p.alpha) {
        ctx.save();
        ctx.fillStyle = 'rgba(60,30,120,0.18)';
        ctx.beginPath();
        ctx.ellipse(gph.x, H * 0.78, gph.w * 0.45 * Math.min(1, puff), 14 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(gph.x, gph.y + bob);
      ctx.scale(sxk, syk);
      const fat = s.size * 0.16 * Math.min(1.15, puff);
      // puffy volume: stacked round strokes, dark rim -> bright crown
      for (let k = 0; k < layers; k++) {
        const u = k / layers;
        const lw = fat * (1 - u);
        const off = -u * s.size * 0.03;
        ctx.strokeStyle = colorAt(u);
        ctx.lineWidth = lw;
        ctx.strokeText(gph.c, off, off);
      }
      // chrome face: sky / hard horizon / ground
      const fc = p.face;
      const fg = ctx.createLinearGradient(0, -s.size * 0.5, 0, s.size * 0.45);
      fg.addColorStop(0, fc[0]);
      fg.addColorStop(0.46, fc[1]);
      fg.addColorStop(0.5, fc[2]);
      fg.addColorStop(0.78, fc[3]);
      fg.addColorStop(1, fc[4]);
      ctx.fillStyle = fg;
      ctx.fillText(gph.c, -s.size * 0.03, -s.size * 0.03);
      // specular blob
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-gph.w * 0.18, -s.size * 0.24, s.size * 0.06, s.size * 0.025, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // sparkles
    for (const sp of s.sparkles) {
      const tw = Math.max(0, Math.sin(t * 3 + sp.ph));
      if (tw < 0.05) continue;
      const r = 18 * S * sp.s * tw;
      ctx.fillStyle = p.sparkle;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - r);
      ctx.quadraticCurveTo(sp.x, sp.y, sp.x + r, sp.y);
      ctx.quadraticCurveTo(sp.x, sp.y, sp.x, sp.y + r);
      ctx.quadraticCurveTo(sp.x, sp.y, sp.x - r, sp.y);
      ctx.quadraticCurveTo(sp.x, sp.y, sp.x, sp.y - r);
      ctx.fill();
    }
    void prog;
  },
};
