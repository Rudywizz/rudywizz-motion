// neon-sign — glass tubes on a brick wall stutter on letter by letter; one
// tube is faulty and keeps buzzing. The wall picks up the coloured light.

export default {
  id: 'neon-sign',
  title: 'Neon Sign',
  tagline: 'Neon tubes stutter on over a brick wall, one stays faulty',
  fonts: [['Tilt Neon', 400]],
  defaults: {
    text: 'Still / awake',
    duration: 6,
    colors: ['#ff2fa0', '#31e7ff', '#ffe14a'],
    wall: '#2a1b19',
    broken: true,
  },
  options: {
    colors: 'Tube colour per line (array of hex)',
    wall: 'Brick colour',
    broken: 'One faulty, buzzing letter (true/false)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const r = api.rng(p.seed);
    const lines = api.splitLines(p.text).slice(0, 4);
    const size = api.fitSize(ctx, lines, { family: 'Tilt Neon', maxW: W * 0.72, maxH: H * 0.4, lineHeight: 1.12, max: W * 0.32 });
    ctx.font = api.font(size, 'Tilt Neon');
    const lh = size * 1.12;
    const top = H * 0.45 - (lines.length * lh) / 2;
    const glyphs = [];
    lines.forEach((l, li) => {
      const lay = api.layoutChars(ctx, l);
      lay.chars.forEach((c) => {
        if (!c.c.trim()) return;
        glyphs.push({ c: c.c, x: W / 2 - lay.width / 2 + c.x, y: top + (li + 0.5) * lh, li, on: 0.35 + glyphs.length * 0.09 + r() * 0.35, k: glyphs.length });
      });
    });
    const brokenIdx = p.broken && glyphs.length > 2 ? 1 + Math.floor(r() * (glyphs.length - 2)) : -1;
    // brick wall
    const wall = api.offscreen(W, H);
    const g = wall.getContext('2d');
    g.fillStyle = '#120c0b';
    g.fillRect(0, 0, W, H);
    const bw = 150 * S;
    const bh = 62 * S;
    const mortar = 7 * S;
    for (let row = 0; row * bh < H + bh; row++) {
      for (let x = -(row % 2) * bw * 0.5; x < W; x += bw) {
        const v = 0.75 + r() * 0.35;
        g.fillStyle = api.mixHex(p.wall, '#000000', 1 - v);
        g.fillRect(x + mortar / 2, row * bh + mortar / 2, bw - mortar, bh - mortar);
        // grit
        for (let k = 0; k < 6; k++) {
          g.fillStyle = `rgba(0,0,0,${r() * 0.25})`;
          g.fillRect(x + r() * bw, row * bh + r() * bh, 6 * S * r() + 2, 4 * S * r() + 2);
        }
      }
    }
    return { glyphs, size, brokenIdx, wall, lines };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, hash } = api;
    api.bg('#000');
    const colors = p.colors;
    const lit = s.glyphs.map((gph) => {
      const u = t - gph.on;
      if (u < 0) return 0;
      if (gph.k === s.brokenIdx) {
        const b = Math.floor(t * 18);
        return hash(b, 3) < 0.25 ? 0.08 : hash(b, 4) < 0.3 ? 0.5 : 1;
      }
      if (u < 0.55) return hash(Math.floor(u * 22), gph.k) > 0.45 ? 1 : 0.06;
      return 1;
    });
    const avg = lit.reduce((a, b) => a + b, 0) / Math.max(1, lit.length);

    if (!p.alpha) {
      ctx.globalAlpha = 0.35 + avg * 0.55;
      ctx.drawImage(s.wall, 0, 0);
      ctx.globalAlpha = 1;
      // coloured light on the wall
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      s.lines.forEach((_, li) => {
        const c = colors[li % colors.length];
        const lineLit = s.glyphs.filter((g) => g.li === li).reduce((a, g) => a + lit[g.k], 0) / Math.max(1, s.glyphs.filter((g) => g.li === li).length);
        const y = s.glyphs.find((g) => g.li === li)?.y ?? H / 2;
        const gr = ctx.createRadialGradient(W / 2, y, 0, W / 2, y, W * 0.8);
        gr.addColorStop(0, api.rgba(c, 0.32 * lineLit));
        gr.addColorStop(1, api.rgba(c, 0));
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
      });
      ctx.restore();
    }

    ctx.font = api.font(s.size, 'Tilt Neon');
    ctx.textBaseline = 'middle';
    for (const gph of s.glyphs) {
      const c = colors[gph.li % colors.length];
      const L = lit[gph.k];
      // unlit glass tube
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillText(gph.c, gph.x, gph.y);
      if (L <= 0.06) continue;
      ctx.save();
      ctx.globalAlpha = L;
      ctx.shadowColor = c;
      ctx.shadowBlur = 60 * S;
      ctx.fillStyle = c;
      ctx.fillText(gph.c, gph.x, gph.y);
      ctx.shadowBlur = 18 * S;
      ctx.fillText(gph.c, gph.x, gph.y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = api.mixHex(c, '#ffffff', 0.65);
      ctx.lineWidth = 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, gph.y - s.size, W, s.size * 2);
      ctx.clip();
      ctx.globalAlpha = L * 0.9;
      ctx.translate(gph.x, gph.y);
      ctx.scale(0.985, 0.985);
      ctx.fillText(gph.c, 0, 0);
      ctx.restore();
      ctx.restore();
    }
    if (!p.alpha) api.vignette(ctx, W, H, 0.7);
  },
};
