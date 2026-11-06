// text-tunnel — the camera races down a tunnel whose walls are rings of your
// words, alternating spin direction, fading into depth fog. It decelerates and
// arrives on the title (line 1), which grows from a speck at the vanishing point.

const RING_FONT = 'Big Shoulders Display';
const TITLE_FONT = 'Unbounded';

export default {
  id: 'text-tunnel',
  title: 'Text Tunnel',
  tagline: 'Fly down a tunnel built from rings of your words, arrive on the title',
  fonts: [[RING_FONT, 900], [TITLE_FONT, 900], ['Space Grotesk', 700]],
  defaults: {
    text: 'Deeper / into the signal',
    duration: 6,
    colors: ['#7cf7ff', '#ff4fd8', '#ffffff'],
    ink: '#ffffff',
    bg: '#04030c',
    rings: 36,
    ring: '',
  },
  options: {
    colors: 'Ring colours, alternating (array of hex)',
    ink: 'Title colour',
    bg: 'Background colour',
    rings: 'Number of rings (10–60)',
    ring: 'Text repeated on the rings (default: all lines)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    let lines = api.splitLines(api.upper(p.text, p.lang));
    if (!lines.length) lines = [' '];
    const ringText = api.upper(p.ring || lines.join(' • '), p.lang) + ' • ';
    const gs = api.graphemes(ringText);
    // glyph sprites per colour at a fixed raster size
    const R = 110;
    ctx.font = api.font(R, RING_FONT, 900);
    const widths = gs.map((c) => ctx.measureText(c).width);
    const uniq = [...new Set(gs)];
    const sprites = p.colors.map((col) => {
      const m = new Map();
      for (const c of uniq) {
        const w = Math.ceil(ctx.measureText(c).width) + 8;
        const cv = api.offscreen(Math.max(2, w), Math.ceil(R * 1.25));
        const g = cv.getContext('2d');
        g.font = api.font(R, RING_FONT, 900);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = col;
        g.fillText(c, cv.width / 2, cv.height / 2);
        m.set(c, cv);
      }
      return m;
    });

    // title card: line 1 big, the rest as a subtitle
    const title = api.offscreen(W, H);
    const tg = title.getContext('2d');
    const head = [lines[0]];
    let hs = api.fitSize(tg, head, { family: TITLE_FONT, weight: 900, maxW: W * 0.82, maxH: H * 0.2, max: W * 0.22, min: 2 });
    let headLines = head;
    if (api.words(lines[0]).length > 1) {
      tg.font = api.font(100, TITLE_FONT, 900);
      const cand = api.wrap(tg, lines[0], (tg.measureText(lines[0]).width / 2) * 1.1);
      const s2 = api.fitSize(tg, cand, { family: TITLE_FONT, weight: 900, maxW: W * 0.82, maxH: H * 0.26, lineHeight: 1.05, max: W * 0.22, min: 2 });
      if (s2 > hs * 1.2) {
        hs = s2;
        headLines = cand;
      }
    }
    if (headLines.length === 1 && api.words(lines[0]).length === 1 && hs < W * 0.07) {
      // one very long word: hyphenate into chunks instead of shrinking it to dust
      const g = api.graphemes(lines[0]);
      for (let n = 2; n <= 3 && hs < W * 0.07; n++) {
        const per = Math.ceil(g.length / n);
        const cand = Array.from({ length: n }, (_, i) => g.slice(i * per, (i + 1) * per).join('') + (i < n - 1 ? '-' : ''));
        const s2 = api.fitSize(tg, cand, { family: TITLE_FONT, weight: 900, maxW: W * 0.82, maxH: H * 0.3, lineHeight: 1.05, max: W * 0.22, min: 2 });
        if (s2 > hs) {
          hs = s2;
          headLines = cand;
        }
      }
    }
    const sub = lines.slice(1).join(' ');
    const ss = sub ? api.fitSize(tg, [sub], { family: 'Space Grotesk', weight: 700, maxW: W * 0.8, maxH: H * 0.05, max: hs * 0.32, min: 2 }) : 0;
    const blockH = headLines.length * hs * 1.05 + (sub ? ss * 2 : 0);
    let y = H / 2 - blockH / 2 + hs * 0.52;
    tg.textAlign = 'center';
    tg.textBaseline = 'middle';
    tg.font = api.font(hs, TITLE_FONT, 900);
    tg.shadowColor = p.colors[0];
    tg.shadowBlur = 40 * S;
    for (const l of headLines) {
      tg.fillStyle = p.ink;
      tg.fillText(l, W / 2, y);
      y += hs * 1.05;
    }
    tg.shadowBlur = 0;
    if (sub) {
      tg.font = api.font(ss, 'Space Grotesk', 700);
      tg.fillStyle = api.rgba(p.colors[1 % p.colors.length], 0.95);
      tg.fillText(sub.split('').join(String.fromCharCode(8202)), W / 2, y - hs * 0.05 + ss * 0.6);
    }

    // world: tunnel radius 1; f fits the ring at depth 1 to the short side
    const f = Math.min(W, H) * 0.62;
    const charH = 0.2; // world height of ring glyphs
    const scale = charH / R;
    const strW = widths.reduce((a, b) => a + b, 0) * scale;
    const circ = Math.PI * 2;
    const reps = Math.max(1, Math.floor(circ / strW));
    const spread = circ / (strW * reps); // stretch to close the ring
    const ring = [];
    let a = 0;
    for (let r = 0; r < reps; r++) {
      gs.forEach((c, i) => {
        const w = widths[i] * scale * spread;
        if (c.trim()) ring.push({ c, a: a + w / 2 });
        a += w;
      });
    }
    const nRings = Math.max(10, Math.min(60, Math.round(Number(p.rings) || 36)));
    const r0 = api.rng(p.seed);
    const dust = Array.from({ length: 160 }, () => ({ a: r0() * Math.PI * 2, r: 0.3 + r0() * 0.65, z: r0() * (nRings * 0.5 + 2) }));
    return { lines, sprites, ring, R, f, charH, nRings, title, dust };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, prog, ease, clamp } = api;
    api.bg(p.bg);
    const D = p.duration;
    const gap = 0.5;
    const zTitle = (s.nRings + 1) * gap;
    const arrive = 0.78; // distance to the title at rest (scale 1)
    const zEnd = zTitle - arrive;
    const u = prog(t, 0, D * 0.86);
    // steady cruise that brakes into the title
    const zc = zEnd * (1 - Math.pow(1 - u, 1.9));
    const speed = (zEnd * 1.9 * Math.pow(1 - u, 0.9)) / (D * 0.86);
    const cx = W / 2 + Math.sin(t * 0.9) * 18 * S * (1 - u);
    const cy = H / 2 + Math.cos(t * 0.7) * 14 * S * (1 - u);
    const roll = Math.sin(t * 0.5) * 0.12 * (1 - u);
    const near = 0.12;
    const far = 7;

    if (!p.alpha) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
      g.addColorStop(0, api.rgba(p.colors[0], 0.16));
      g.addColorStop(0.3, api.rgba(p.colors[1 % p.colors.length], 0.06));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);
    // title: drawn first (always the farthest thing)
    const dzT = zTitle - zc;
    const ts = arrive / dzT;
    const tA = clamp((far - dzT) / 3) * (0.35 + 0.65 * clamp(prog(t, D * 0.6, D * 0.9)));
    if (tA > 0.01) {
      ctx.globalAlpha = tA;
      ctx.drawImage(s.title, -W / 2 * ts, -H / 2 * ts, W * ts, H * ts);
      ctx.globalAlpha = 1;
    }
    // speed dust
    ctx.fillStyle = '#ffffff';
    for (const d of s.dust) {
      const span = s.nRings * gap + 2;
      const dz = d.z - (zc % span);
      const z = dz < near ? dz + span : dz;
      if (z > far) continue;
      const k = s.f / z;
      const x = Math.cos(d.a) * d.r * k;
      const y = Math.sin(d.a) * d.r * k;
      const len = Math.min(60 * S, speed * 0.04 * k);
      ctx.globalAlpha = clamp(1 - z / far) * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.a);
      ctx.fillRect(0, -1 * S, Math.max(2 * S, len), 2 * S);
      ctx.restore();
    }
    // rings, far to near
    for (let k = s.nRings; k >= 1; k--) {
      const z = k * gap - zc;
      if (z < near || z > far) continue;
      const sc = s.f / z;
      const fog = clamp(1 - z / far) * clamp((z - near) / 0.35);
      if (fog < 0.02) continue;
      const pxH = s.charH * sc;
      if (pxH < 1.2) continue;
      const spin = (k % 2 ? 1 : -1) * (t * 0.35 + k * 0.4);
      const sprites = s.sprites[k % s.sprites.length];
      const gscale = pxH / s.R;
      ctx.globalAlpha = fog;
      for (const ch of s.ring) {
        const a = ch.a + spin;
        const x = Math.cos(a) * sc;
        const y = Math.sin(a) * sc;
        // cheap off-screen cull
        if (Math.abs(x) > W && Math.abs(y) > H) continue;
        const spr = sprites.get(ch.c);
        const c = Math.cos(a + Math.PI / 2);
        const sn = Math.sin(a + Math.PI / 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(cx, cy);
        ctx.rotate(roll);
        ctx.transform(c * gscale, sn * gscale, -sn * gscale, c * gscale, x, y);
        ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
      }
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (!p.alpha) api.vignette(ctx, W, H, 0.6);
  },
};
