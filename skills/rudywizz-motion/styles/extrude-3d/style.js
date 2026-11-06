// extrude-3d — chunky block letters with a real extruded body. Each glyph swings
// in on its own Y axis, then the whole word settles into a slow camera turn.
// The side walls are stacked, shaded layers that recede toward a vanishing point.

const FAMILY = 'Unbounded';
const WEIGHT = 900;
const SHADES = 10;

/** Fit lines (wrapping one long line into 2–3 if it makes the type bigger). */
function fitLines(api, text, maxW, maxH, lh, max) {
  const { ctx } = api;
  let lines = api.splitLines(text);
  if (!lines.length) lines = [' '];
  let size = api.fitSize(ctx, lines, { family: FAMILY, weight: WEIGHT, maxW, maxH, lineHeight: lh, max, min: 2 });
  if (lines.length === 1) {
    const n = api.words(lines[0]).length;
    ctx.font = api.font(100, FAMILY, WEIGHT);
    const total = ctx.measureText(lines[0]).width;
    for (let k = 2; k <= Math.min(3, n); k++) {
      ctx.font = api.font(100, FAMILY, WEIGHT);
      const cand = api.wrap(ctx, lines[0], (total / k) * 1.12);
      const s = api.fitSize(ctx, cand, { family: FAMILY, weight: WEIGHT, maxW, maxH, lineHeight: lh, max });
      if (s > size * 1.15) {
        size = s;
        lines = cand;
      }
    }
  }
  if (lines.length === 1 && api.words(lines[0]).length === 1 && size < maxW * 0.09) {
    // one very long word: hyphenate it into chunks instead of shrinking it to dust
    const g = api.graphemes(lines[0]);
    for (let k = 2; k <= 3 && size < maxW * 0.09; k++) {
      const per = Math.ceil(g.length / k);
      const cand = Array.from({ length: k }, (_, i) => g.slice(i * per, (i + 1) * per).join('') + (i < k - 1 ? '-' : ''));
      const s = api.fitSize(ctx, cand, { family: FAMILY, weight: WEIGHT, maxW, maxH, lineHeight: lh, max, min: 2 });
      if (s > size) {
        size = s;
        lines = cand;
      }
    }
  }
  return { lines, size };
}

export default {
  id: 'extrude-3d',
  title: 'Extrude 3D',
  tagline: 'Chunky extruded 3D letters swing in and settle into a slow turn',
  fonts: [[FAMILY, WEIGHT]],
  defaults: {
    text: 'Make it / pop',
    duration: 6,
    face: '#ffd23f',
    side: '#ff4f2e',
    bg: ['#3a1d78', '#12082e'],
    depth: 1,
  },
  options: {
    face: 'Front face colour',
    side: 'Extrusion (side wall) colour',
    bg: 'Background colour, or [centre, edge] gradient',
    depth: 'Extrusion depth multiplier (0.3–2)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const text = api.upper(p.text, p.lang);
    const portrait = H > W;
    const { lines, size } = fitLines(api, text, W * 0.8, portrait ? H * 0.34 : H * 0.52, 1.12, W * 0.3);
    ctx.font = api.font(size, FAMILY, WEIGHT);
    const lh = size * 1.12;
    const depth = size * 0.42 * Math.max(0.2, Math.min(2.5, Number(p.depth) || 1));
    // shift the block up/left so the extrusion (down-right) stays centred
    const top = H * 0.47 - (lines.length * lh) / 2 - depth * 0.2;
    const pad = Math.ceil(size * 0.14);
    const sideShades = Array.from({ length: SHADES }, (_, k) => api.mixHex(p.side, '#000000', 0.08 + (k / (SHADES - 1)) * 0.6));
    const faceLight = api.mixHex(p.face, '#ffffff', 0.45);
    const faceDark = api.mixHex(p.face, '#000000', 0.18);
    const glyphs = [];
    const spriteCache = new Map();
    const sprite = (c) => {
      if (spriteCache.has(c)) return spriteCache.get(c);
      ctx.font = api.font(size, FAMILY, WEIGHT);
      const w = Math.ceil(ctx.measureText(c).width) + pad * 2;
      const h = Math.ceil(size * 1.3) + pad * 2;
      const mask = api.offscreen(w, h);
      const g = mask.getContext('2d');
      g.font = api.font(size, FAMILY, WEIGHT);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.fillText(c, w / 2, h / 2);
      // face: vertical gradient + bright rim on the top-left edge
      const face = api.offscreen(w, h);
      const f = face.getContext('2d');
      f.font = g.font;
      f.textAlign = 'center';
      f.textBaseline = 'middle';
      f.fillStyle = '#ffffff';
      f.fillText(c, w / 2, h / 2);
      f.globalCompositeOperation = 'source-atop';
      const gr = f.createLinearGradient(0, h * 0.2, 0, h * 0.8);
      gr.addColorStop(0, faceLight);
      gr.addColorStop(0.55, p.face);
      gr.addColorStop(1, faceDark);
      f.fillStyle = gr;
      f.fillText(c, w / 2 + 2.5 * S, h / 2 + 2.5 * S);
      const sides = sideShades.map((col) => api.tint(mask, col));
      const out = { w, h, face, sides, white: mask };
      spriteCache.set(c, out);
      return out;
    };
    lines.forEach((l, li) => {
      const lay = api.layoutChars(ctx, l);
      lay.chars.forEach((c) => {
        if (!c.c.trim()) return;
        glyphs.push({ ...sprite(c.c), x: W / 2 - lay.width / 2 + c.x + c.w / 2, y: top + (li + 0.5) * lh, li, i: glyphs.length });
      });
    });
    const layers = Math.max(10, Math.min(30, Math.round(depth / (2.2 * S))));
    return { glyphs, size, depth, layers, lines, lh, top };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, prog, ease, clamp } = api;
    if (!p.alpha) {
      const [c0, c1] = Array.isArray(p.bg) ? p.bg : [p.bg, api.mixHex(p.bg, '#000000', 0.55)];
      const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.6);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // floor glow under the word
      const fy = s.top + s.lines.length * s.lh + s.depth * 0.6;
      const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.45);
      fg.addColorStop(0, 'rgba(0,0,0,0.42)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(W / 2, fy);
      ctx.scale(1, 0.16);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(0, 0, W * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else api.bg(null);

    const D = p.duration;
    // global slow turn after the swing-in
    const turn = -0.32 + 0.5 * ease.inOutSine(prog(t, 1.2, D));
    const states = s.glyphs.map((g) => {
      const t0 = 0.15 + g.i * Math.min(0.08, 1.2 / Math.max(1, s.glyphs.length));
      const sp = api.spring(t - t0, { freq: 1.15, damping: 0.48 });
      const th = (1 - sp) * -1.45 + turn * clamp(sp);
      const cs = Math.max(0.02, Math.cos(th));
      const sn = Math.sin(th);
      // extrusion direction: toward a vanishing point below-right, swung by the glyph's rotation
      const vx = 0.3 + sn * 0.95 + ((W / 2 - g.x) / W) * 0.35;
      const vy = 0.62 + ((H * 0.45 - g.y) / H) * 0.25;
      const lift = (1 - clamp(sp)) * 60 * S + Math.sin(t * 1.6 + g.i * 0.55) * 6 * S * clamp(t - t0 - 0.8);
      return { g, cs, sn, vx, vy, a: clamp(sp * 4), lift };
    });

    const draw = (img, st, ox, oy, k) => {
      ctx.setTransform(st.cs * (1 - k * 0.0025), st.sn * 0.1, 0, 1 - k * 0.0025, st.g.x + ox, st.g.y + oy - st.lift);
      ctx.drawImage(img, -st.g.w / 2, -st.g.h / 2);
    };
    // pass 1: side walls, back to front
    const L = s.layers;
    const step = s.depth / L;
    for (const st of states) {
      if (st.a <= 0) continue;
      ctx.globalAlpha = st.a;
      for (let k = L; k >= 1; k--) {
        const shade = Math.min(SHADES - 1, Math.floor((k / L) * SHADES));
        draw(st.g.sides[shade], st, st.vx * step * k, st.vy * step * k, k);
      }
    }
    // pass 2: faces + angle-dependent sheen
    for (const st of states) {
      if (st.a <= 0) continue;
      ctx.globalAlpha = st.a;
      draw(st.g.face, st, 0, 0, 0);
      const sheen = clamp(-st.sn * 0.8) * 0.35;
      if (sheen > 0.01) {
        ctx.globalAlpha = st.a * sheen;
        draw(st.g.white, st, 0, 0, 0);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (!p.alpha) api.vignette(ctx, W, H, 0.45);
  },
};
