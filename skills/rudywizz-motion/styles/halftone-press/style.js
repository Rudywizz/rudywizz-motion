// halftone-press — a two-colour risograph print: rollers sweep each ink layer
// on as halftone dots at different screen angles, slightly mis-registered,
// overprinting into a third colour. Animated at "on twos" for a print feel.

export default {
  id: 'halftone-press',
  title: 'Halftone Press',
  tagline: 'Two-colour risograph print, rolled on dot by dot',
  fonts: [['Dela Gothic One', 400], ['Space Grotesk', 700]],
  defaults: {
    text: 'Print / is not / dead',
    duration: 6,
    paper: '#f3eee3',
    inkA: '#0078bf', // riso blue
    inkB: '#ff48b0', // riso fluorescent pink
    dot: 15,
    caption: 'RISO · 2 COLOURS · 1 PASS',
  },
  options: {
    inkA: 'First ink (type)',
    inkB: 'Second ink (sun + offset shadow)',
    dot: 'Halftone cell size in px at 1080 wide',
    caption: 'Small print at the bottom ("" to hide)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    let lines = api.splitLines(api.upper(p.text, p.lang));
    if (lines.length === 1 && api.words(lines[0]).length > 1) lines = api.words(lines[0]);
    const size = api.fitSize(ctx, lines, { family: 'Dela Gothic One', maxW: W * 0.8, maxH: H * 0.56, lineHeight: 1.12, max: W * 0.3 });
    const top = H * 0.48 - (lines.length * size * 1.12) / 2;
    const drawText = (g, dx, dy) => {
      g.font = api.font(size, 'Dela Gothic One');
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      lines.forEach((l, i) => g.fillText(l, W / 2 + dx, top + (i + 0.5) * size * 1.12 + dy));
    };
    // tone fields (0..1) for both inks
    const a = api.offscreen(W, H);
    const ga = a.getContext('2d');
    drawText(ga, 0, 0);
    const b = api.offscreen(W, H);
    const gb = b.getContext('2d');
    const sun = gb.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.46, W * 0.46);
    sun.addColorStop(0, 'rgba(255,255,255,0.95)');
    sun.addColorStop(1, 'rgba(255,255,255,0.12)');
    gb.fillStyle = sun;
    gb.beginPath();
    gb.arc(W * 0.5, H * 0.46, W * 0.46, 0, Math.PI * 2);
    gb.fill();
    gb.globalCompositeOperation = 'destination-out';
    drawText(gb, 0, 0);
    gb.globalCompositeOperation = 'source-over';
    drawText(gb, 18 * S, 18 * S);
    const sample = (c) => {
      const d = c.getContext('2d').getImageData(0, 0, W, H).data;
      return (x, y) => {
        const ix = Math.min(W - 1, Math.max(0, x | 0));
        const iy = Math.min(H - 1, Math.max(0, y | 0));
        return d[(iy * W + ix) * 4 + 3] / 255;
      };
    };
    const build = (tone, angle) => {
      const cell = p.dot * S;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const dots = [];
      const R = Math.hypot(W, H);
      for (let v = -R; v < R; v += cell)
        for (let u = -R; u < R; u += cell) {
          const x = W / 2 + u * ca - v * sa;
          const y = H / 2 + u * sa + v * ca;
          if (x < -cell || y < -cell || x > W + cell || y > H + cell) continue;
          const tv = tone(x, y);
          if (tv > 0.02) dots.push([x, y, tv, api.hash(x, y)]);
        }
      return { dots, cell };
    };
    return {
      A: build(sample(a), (15 * Math.PI) / 180),
      B: build(sample(b), (75 * Math.PI) / 180),
      grain: api.makeGrain(W, H, p.seed + 6, 2),
    };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S, hash } = api;
    const tf = Math.floor(t * 12) / 12; // "on twos"
    api.bg(p.paper);
    const D = p.duration;

    const layer = (L, ink, a0, a1, fromTop, reg) => {
      const sweep = ease.inOutCubic(prog(tf, a0, a1));
      if (sweep <= 0) return;
      const edge = fromTop ? sweep * (H + 200 * S) : H - sweep * (H + 200 * S);
      ctx.save();
      ctx.globalCompositeOperation = p.alpha ? 'source-over' : 'multiply';
      ctx.fillStyle = ink;
      ctx.translate(reg[0], reg[1]);
      ctx.beginPath();
      for (const [x, y, tone, h] of L.dots) {
        const dist = fromTop ? edge - y : y - edge;
        if (dist < 0) continue;
        const grow = Math.min(1, dist / (180 * S));
        const r = (L.cell / 2) * Math.sqrt(tone) * 1.08 * grow * (0.86 + h * 0.22);
        if (r < 0.4) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
      // roller
      if (sweep < 1 && !p.alpha) {
        ctx.fillStyle = 'rgba(30,30,30,0.18)';
        ctx.fillRect(0, edge - 10 * S, W, 20 * S);
        ctx.fillStyle = api.rgba(ink, 0.55);
        ctx.fillRect(0, edge - 4 * S, W, 8 * S);
      }
    };

    // mis-registration jitters while printing, then settles slightly off
    const j = (k) => (prog(tf, D * 0.75, D * 0.85) < 1 ? (hash(Math.floor(tf * 12), k) - 0.5) * 6 * S : 0);
    layer(s.B, p.inkB, 0.2, D * 0.42, true, [7 * S + j(1), -5 * S + j(2)]);
    layer(s.A, p.inkA, D * 0.38, D * 0.7, false, [j(3), j(4)]);

    if (p.caption && !p.alpha) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = p.inkA;
      ctx.font = api.font(22 * S, 'Space Grotesk', 700);
      ctx.textBaseline = 'bottom';
      ctx.globalAlpha = ease.outCubic(prog(tf, D * 0.7, D * 0.8));
      ctx.fillText(api.upper(p.caption, p.lang), 56 * S, H - 56 * S);
      ctx.textAlign = 'right';
      ctx.fillText(`NO. ${String(p.seed).padStart(3, '0')}`, W - 56 * S, H - 56 * S);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (!p.alpha) {
      s.grain(ctx, 0, 0.12, 'multiply');
      api.vignette(ctx, W, H, 0.12, '80,60,30');
    }
  },
};
