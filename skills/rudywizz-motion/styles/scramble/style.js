// scramble — a decoder: every character cycles through random glyphs and
// locks into place left to right, with a live "decoding" readout.

const POOL = 'ABCDEFGHJKLMNOPRSTUVYZÇĞİÖŞÜ0123456789#$%&*+=?<>/'.split('');
const FONTS = { mono: ['JetBrains Mono', 800], display: ['Space Grotesk', 700] };

function fitLines(api, lines, { family, weight, maxW, maxH, lh, max, min }) {
  const { ctx } = api;
  let size = api.fitSize(ctx, lines, { family, weight, maxW, maxH, lineHeight: lh, max, min: 1 });
  if (size >= min) return { lines, size };
  ctx.font = api.font(min, family, weight);
  const out = [];
  for (const l of lines) {
    for (const wl of api.wrap(ctx, l, maxW)) {
      if (ctx.measureText(wl).width <= maxW) {
        out.push(wl);
        continue;
      }
      let cur = '';
      for (const g of api.graphemes(wl)) {
        if (cur && ctx.measureText(cur + g + '-').width > maxW) {
          out.push(cur + '-');
          cur = g.trim() ? g : '';
        } else cur += g;
      }
      if (cur) out.push(cur);
    }
  }
  return { lines: out, size: api.fitSize(ctx, out, { family, weight, maxW, maxH, lineHeight: lh, max, min: 1 }) };
}

export default {
  id: 'scramble',
  title: 'Scramble',
  tagline: 'Characters cycle through random glyphs and decode into your text',
  fonts: [['JetBrains Mono', 800], ['JetBrains Mono', 400], ['Space Grotesk', 700]],
  defaults: {
    text: 'Access / granted',
    duration: 5,
    font: 'mono',
    bg: '#06080b',
    ink: '#effff6',
    accent: '#3dff9a',
    delay: 0.5,
    resolve: 1.8,
    hud: true,
  },
  options: {
    font: 'mono | display',
    ink: 'Decoded text colour',
    accent: 'Scrambling glyph colour',
    bg: 'Background colour',
    delay: 'Seconds before characters start locking',
    resolve: 'Seconds for the whole text to decode',
    hud: 'Show the DECODING readout and progress bar (true/false)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const [fam, wt] = FONTS[p.font] || FONTS.mono;
    const lh = 1.18;
    const fit = fitLines(api, api.splitLines(api.upper(p.text, p.lang)), { family: fam, weight: wt, maxW: W * 0.84, maxH: H * 0.46, lh, max: W * 0.2, min: Math.min(W, H) * 0.06 });
    const size = fit.size;
    ctx.font = api.font(size, fam, wt);
    const top = H / 2 - (fit.lines.length * size * lh) / 2 + size * lh * 0.5;
    const cells = [];
    fit.lines.forEach((l, li) => {
      const lay = api.layoutChars(ctx, l);
      lay.chars.forEach((c) => {
        if (!c.c.trim()) return;
        cells.push({ ...c, x: W / 2 - lay.width / 2 + c.x + c.w / 2, y: top + li * size * lh });
      });
    });
    const N = cells.length;
    cells.forEach((c, i) => {
      c.i = i;
      c.appear = 0.05 + api.hash(i, 3, p.seed) * 0.45;
      c.lock = p.delay + (i / Math.max(1, N - 1)) * p.resolve + api.hash(i, 5, p.seed) * 0.22;
    });
    const end = Math.max(...cells.map((c) => c.lock), p.delay);
    // backdrop
    let back = null;
    if (!p.alpha) {
      back = api.offscreen(W, H);
      const g = back.getContext('2d');
      g.fillStyle = p.bg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = api.rgba(p.accent, 0.06);
      g.lineWidth = 1;
      const step = 60 * S;
      for (let x = (W / 2) % step; x < W; x += step) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, H);
        g.stroke();
      }
      for (let y = (H / 2) % step; y < H; y += step) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      api.vignette(g, W, H, 0.75);
    }
    const blockTop = top - size * 0.9;
    const blockBottom = top + (fit.lines.length - 1) * size * lh + size * 0.5;
    return { cells, size, fam, wt, back, end, blockTop, blockBottom };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, clamp } = api;
    api.bg(p.bg);
    if (s.back) ctx.drawImage(s.back, 0, 0);
    const tick = Math.floor(t * 20);
    ctx.font = api.font(s.size, s.fam, s.wt);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let locked = 0;
    for (const c of s.cells) {
      if (t < c.appear) continue;
      if (t >= c.lock) {
        locked++;
        const fl = clamp(1 - (t - c.lock) / 0.25);
        ctx.fillStyle = p.ink;
        if (fl > 0) {
          ctx.shadowColor = p.accent;
          ctx.shadowBlur = 30 * S * fl;
        }
        ctx.fillText(c.c, c.x, c.y);
        ctx.shadowBlur = 0;
        continue;
      }
      const g = POOL[Math.floor(api.hash(tick, c.i, p.seed) * POOL.length)];
      const gw = ctx.measureText(g).width;
      const k = gw > c.w * 1.05 && c.w > 0 ? (c.w * 1.05) / gw : 1;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(k, 1);
      ctx.globalAlpha = 0.45 + 0.45 * api.hash(tick, c.i, 9);
      ctx.fillStyle = p.accent;
      ctx.fillText(g, 0, 0);
      ctx.restore();
    }

    if (p.hud) {
      const pct = Math.round((locked / Math.max(1, s.cells.length)) * 100);
      const done = pct >= 100;
      const fs = Math.max(14, 24 * S);
      const y = Math.min(H - fs * 2, s.blockBottom + 60 * S);
      const bw = Math.min(W * 0.6, 520 * S);
      ctx.font = api.font(fs, 'JetBrains Mono', 400);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = api.rgba(done ? p.ink : p.accent, 0.85);
      const label = done ? 'DECODED' : `DECODING${'.'.repeat(1 + (tick % 3))}`;
      ctx.fillText(label, W / 2 - bw / 2, y);
      ctx.textAlign = 'right';
      ctx.fillText(`${String(pct).padStart(3, ' ')}%`, W / 2 + bw / 2, y);
      ctx.fillStyle = api.rgba(p.accent, 0.18);
      ctx.fillRect(W / 2 - bw / 2, y + fs * 0.6, bw, 4 * S);
      ctx.fillStyle = p.accent;
      ctx.fillRect(W / 2 - bw / 2, y + fs * 0.6, (bw * pct) / 100, 4 * S);
      ctx.textAlign = 'center';
      ctx.fillStyle = api.rgba(p.accent, 0.5);
      ctx.fillText(`0x${(api.hash(tick, 77) * 0xffffff | 0).toString(16).toUpperCase().padStart(6, '0')} · KEY ${String((p.seed * 7919) % 10000).padStart(4, '0')}`, W / 2, Math.max(fs * 2, s.blockTop - 50 * S));
    }
    if (!p.alpha) api.scanlines(ctx, W, H, { gap: 4 * S, alpha: 0.12 });
  },
};
