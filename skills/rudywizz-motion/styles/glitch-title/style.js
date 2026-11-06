// glitch-title — a heavy title fights its way onto a broken signal: RGB split,
// sliced horizontal displacement and blocky datamosh bursts, then it settles
// clean and only twitches now and then.

const FAM = 'Dela Gothic One';
const MONO = 'JetBrains Mono';

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
  id: 'glitch-title',
  title: 'Glitch Title',
  tagline: 'RGB split, sliced signal and datamosh blocks settle into a clean title',
  fonts: [[FAM, 400], [MONO, 400]],
  defaults: {
    text: 'Signal / lost',
    subtitle: 'TRANSMISSION 07 — RECOVERED',
    duration: 5,
    bg: '#07070b',
    ink: '#ffffff',
    colors: ['#ff2b5e', '#00f0ff', '#7a00ff'],
    every: 1.4,
  },
  options: {
    subtitle: 'Small mono line under the title (empty to hide)',
    bg: 'Background colour',
    colors: 'Datamosh block colours (array of hex)',
    every: 'Seconds between the small glitches after the intro',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const lh = 1.06;
    const fit = fitLines(api, api.splitLines(api.upper(p.text, p.lang)), { family: FAM, weight: 400, maxW: W * 0.84, maxH: H * 0.4, lh, max: W * 0.26, min: Math.min(W, H) * 0.07 });
    const size = fit.size;
    const mask = api.offscreen(W, H);
    const g = mask.getContext('2d');
    g.font = api.font(size, FAM, 400);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    const blockH = fit.lines.length * size * lh;
    const top = H / 2 - blockH / 2 + (size * lh) / 2;
    fit.lines.forEach((l, i) => g.fillText(l, W / 2, top + i * size * lh));
    let subY = top + blockH - (size * lh) / 2 + size * 0.75;
    if (p.subtitle) {
      const fs = Math.max(12, Math.min(28 * S, size * 0.22));
      g.font = api.font(fs, MONO, 400);
      let sub = api.upper(p.subtitle, p.lang);
      while (sub.length > 4 && g.measureText(sub).width > W * 0.86) sub = sub.slice(0, -2) + '…';
      g.fillText(sub, W / 2, subY);
    }
    const red = api.tint(mask, '#ff0000');
    const cyan = api.tint(mask, '#00ffff');
    const white = api.tint(mask, p.ink);
    const textTop = top - size * 0.6;
    const textBot = subY + size * 0.3;
    return { red, cyan, white, size, textTop, textBot };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, hash, ease, prog } = api;
    api.bg(p.bg);
    const f = Math.floor(t * 15);
    // glitch intensity: big intro, then short twitches
    let g = t < 0.12 ? 1 : 1 - ease.outCubic(prog(t, 0.12, 1.5));
    if (t > 1.6 && t < p.duration - 0.6) {
      const k = Math.floor((t - 1.6) / p.every);
      const ts = 1.6 + k * p.every + hash(k, 1) * p.every * 0.45;
      const len = 0.08 + hash(k, 2) * 0.1;
      if (t >= ts && t < ts + len) g = Math.max(g, 0.12 + hash(k, 3) * 0.28);
    }

    if (!p.alpha) {
      // dim signal noise lines
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      for (let i = 0; i < 26; i++) ctx.fillRect(0, hash(f, i, 4) * H, W, (1 + hash(f, i, 5) * 3) * S);
    }

    if (t >= 0.12) {
      const split = (2.5 + g * 30) * S;
      ctx.globalCompositeOperation = 'lighter';
      if (g < 0.02) {
        ctx.drawImage(s.red, -split, 0);
        ctx.drawImage(s.cyan, split, 0);
      } else {
        // horizontal slices with their own displacement
        let y = s.textTop - 20 * S;
        let i = 0;
        while (y < s.textBot + 20 * S) {
          const h = (8 + hash(f, i, 6) * 60) * S;
          const big = hash(f, i, 7) < 0.35;
          const dx = (hash(f, i, 8) - 0.5) * 2 * g * W * (big ? 0.14 : 0.02);
          const yy = Math.max(0, y);
          const hh = Math.min(H - yy, h);
          if (hh > 0) {
            ctx.drawImage(s.red, 0, yy, W, hh, dx - split, yy, W, hh);
            ctx.drawImage(s.cyan, 0, yy, W, hh, dx + split, yy, W, hh);
          }
          y += h;
          i++;
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      if (g < 0.02) {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(s.white, 0, 0);
        ctx.globalAlpha = 1;
      }
    }

    // datamosh blocks
    const blocks = Math.floor(g * 12) + (t < 0.12 ? 10 : 0);
    for (let i = 0; i < blocks; i++) {
      const bw = (40 + hash(f, i, 10) * 320) * S;
      const bh = (8 + hash(f, i, 11) * 70) * S;
      const bx = hash(f, i, 12) * (W - bw);
      const by = s.textTop + hash(f, i, 13) * (s.textBot - s.textTop);
      const kind = hash(f, i, 14);
      if (kind < 0.45) {
        const sx = Math.max(0, Math.min(W - bw, bx + (hash(f, i, 15) - 0.5) * 300 * S));
        ctx.drawImage(s.white, sx, by, bw, bh, bx, by + (hash(f, i, 16) - 0.5) * 40 * S, bw, bh);
      } else if (kind < 0.8) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = p.colors[Math.floor(hash(f, i, 17) * p.colors.length)];
        ctx.fillRect(bx, by, bw, bh);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let k = 0; k < bh; k += 4 * S) ctx.fillRect(bx, by + k, bw, 1.5 * S);
      }
    }
    // tear line
    if (g > 0.25) {
      const ty = s.textTop + hash(f, 99) * (s.textBot - s.textTop);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(0, ty, W, 2 * S);
    }
    if (!p.alpha) {
      api.scanlines(ctx, W, H, { gap: 4 * S, alpha: 0.16 });
      api.vignette(ctx, W, H, 0.6);
    }
  },
};
