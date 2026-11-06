// particle-sphere — a few thousand glowing points spin as a 3D sphere, then
// peel off in a left-to-right wave, swirl toward the camera and settle into the
// shape of your text, which keeps a slow 3D sway so the depth stays readable.

const FAMILY = 'Unbounded';
const WEIGHT = 900;
const BUCKETS = 7;

export default {
  id: 'particle-sphere',
  title: 'Particle Sphere',
  tagline: 'A spinning sphere of glowing particles morphs into your words',
  fonts: [[FAMILY, WEIGHT]],
  defaults: {
    text: 'Ideas / take shape',
    duration: 6,
    colors: ['#5ee7ff', '#7b6dff', '#ff5ec8', '#ffd36e'],
    bg: ['#0b1030', '#020208'],
    count: 3600,
    morphAt: 1.6,
  },
  options: {
    colors: 'Particle colours, blended left → right (array of hex)',
    bg: 'Background colour, or [centre, edge] gradient',
    count: 'Number of particles (800–8000)',
    morphAt: 'Second at which the sphere starts turning into text',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const r = api.rng(p.seed);
    let lines = api.splitLines(api.upper(p.text, p.lang));
    if (!lines.length) lines = [' '];
    let size = api.fitSize(ctx, lines, { family: FAMILY, weight: WEIGHT, maxW: W * 0.84, maxH: H * (H > W ? 0.34 : 0.55), lineHeight: 1.08, max: W * 0.26, min: 2 });
    if (lines.length === 1 && api.words(lines[0]).length === 1 && size < W * 0.07) {
      const g = api.graphemes(lines[0]);
      for (let n = 2; n <= 3 && size < W * 0.07; n++) {
        const per = Math.ceil(g.length / n);
        const cand = Array.from({ length: n }, (_, i) => g.slice(i * per, (i + 1) * per).join('') + (i < n - 1 ? '-' : ''));
        const s2 = api.fitSize(ctx, cand, { family: FAMILY, weight: WEIGHT, maxW: W * 0.84, maxH: H * 0.4, lineHeight: 1.08, max: W * 0.26, min: 2 });
        if (s2 > size) {
          size = s2;
          lines = cand;
        }
      }
    } else if (lines.length === 1 && api.words(lines[0]).length > 1) {
      ctx.font = api.font(100, FAMILY, WEIGHT);
      const cand = api.wrap(ctx, lines[0], (ctx.measureText(lines[0]).width / 2) * 1.1);
      const s2 = api.fitSize(ctx, cand, { family: FAMILY, weight: WEIGHT, maxW: W * 0.84, maxH: H * 0.4, lineHeight: 1.08, max: W * 0.26, min: 2 });
      if (s2 > size * 1.2) {
        size = s2;
        lines = cand;
      }
    }

    // rasterise the text at a reduced scale and sample its pixels
    const k = Math.min(1, 540 / Math.min(W, H));
    const mw = Math.ceil(W * k);
    const mh = Math.ceil(H * k);
    const mask = api.offscreen(mw, mh);
    const g = mask.getContext('2d', { willReadFrequently: true });
    g.font = api.font(size * k, FAMILY, WEIGHT);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    const lh = size * 1.08 * k;
    lines.forEach((l, i) => g.fillText(l, mw / 2, mh / 2 + (i - (lines.length - 1) / 2) * lh));
    const data = g.getImageData(0, 0, mw, mh).data;
    const pts = [];
    for (let y = 0; y < mh; y += 1) for (let x = 0; x < mw; x += 1) if (data[(y * mw + x) * 4 + 3] > 140) pts.push([x / k - W / 2, y / k - H / 2]);
    const N = Math.max(800, Math.min(8000, Math.round(Number(p.count) || 3600)));
    // shuffle (seeded) and take N targets; repeat if the text is tiny
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    if (!pts.length) pts.push([0, 0]);
    const R = Math.min(W, H) * 0.34;
    const golden = Math.PI * (3 - Math.sqrt(5));
    let minX = Infinity;
    let maxX = -Infinity;
    for (const q of pts) {
      minX = Math.min(minX, q[0]);
      maxX = Math.max(maxX, q[0]);
    }
    const parts = [];
    for (let i = 0; i < N; i++) {
      const yy = 1 - (2 * (i + 0.5)) / N;
      const rad = Math.sqrt(1 - yy * yy);
      const th = golden * i;
      const q = pts[i % pts.length];
      const jit = 1 / k;
      const tx = q[0] + (r() - 0.5) * jit;
      const ty = q[1] + (r() - 0.5) * jit;
      const u = (tx - minX) / Math.max(1, maxX - minX);
      parts.push({
        sx: Math.cos(th) * rad * R,
        sy: yy * R,
        sz: Math.sin(th) * rad * R,
        tx,
        ty,
        tz: (r() - 0.5) * 14 * S,
        delay: u * 0.9 + r() * 0.35,
        hue: Math.max(0, Math.min(p.colors.length - 1, Math.floor(u * p.colors.length))),
        tw: r() * 6.28,
      });
    }
    // glowing dot sprites, one per colour
    const dot = 22;
    const sprites = p.colors.map((c) => {
      const cv = api.offscreen(dot * 2, dot * 2);
      const sg = cv.getContext('2d');
      const gr = sg.createRadialGradient(dot, dot, 0, dot, dot, dot);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.18, c);
      gr.addColorStop(0.45, api.rgba(c, 0.35));
      gr.addColorStop(1, api.rgba(c, 0));
      sg.fillStyle = gr;
      sg.fillRect(0, 0, dot * 2, dot * 2);
      return cv;
    });
    // background stars
    const stars = api.offscreen(W, H);
    const st = stars.getContext('2d');
    for (let i = 0; i < 220; i++) {
      st.fillStyle = `rgba(255,255,255,${0.1 + r() * 0.5})`;
      const s = (0.6 + r() * 1.6) * S;
      st.fillRect(r() * W, r() * H, s, s);
    }
    const buckets = Array.from({ length: BUCKETS * p.colors.length }, () => []);
    return { parts, R, sprites, dot, stars, buckets, dotR: Math.max(1.6, 3.4 * S * Math.sqrt(3600 / N)) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, prog, ease, clamp } = api;
    if (!p.alpha) {
      const [c0, c1] = Array.isArray(p.bg) ? p.bg : [p.bg, api.mixHex(p.bg, '#000000', 0.7)];
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(s.stars, Math.sin(t * 0.1) * 10 * S, 0);
    } else api.bg(null);

    const m0 = Number(p.morphAt) || 1.6;
    const grow = api.spring(t, { freq: 1.1, damping: 0.55 });
    const spin = t * 0.9;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    const tiltX = 0.35;
    const ctl = Math.cos(tiltX);
    const stl = Math.sin(tiltX);
    // whole-scene sway (keeps the finished text feeling 3D)
    const yaw = 0.28 * Math.sin(t * 0.55 + 0.4);
    const pitch = 0.1 * Math.sin(t * 0.43);
    const cy0 = Math.cos(yaw);
    const sy0 = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const Dz = s.R * 3.4;
    const cx = W / 2;
    const cyy = H / 2;
    for (const b of s.buckets) b.length = 0;
    const nb = BUCKETS;
    for (let i = 0; i < s.parts.length; i++) {
      const q = s.parts[i];
      // sphere point: spin around Y, tilt around X
      let x = (q.sx * cs + q.sz * sn) * grow;
      let z = (-q.sx * sn + q.sz * cs) * grow;
      let y = q.sy * grow;
      const y2 = y * ctl - z * stl;
      z = y * stl + z * ctl;
      y = y2;
      const m = ease.inOutCubic(prog(t, m0 + q.delay, m0 + q.delay + 1.4));
      // swirl toward the camera mid-flight
      const bulge = Math.sin(Math.PI * m) * s.R * 0.9;
      x = x + (q.tx - x) * m;
      y = y + (q.ty - y) * m;
      z = z + (q.tz - z) * m - bulge;
      // sway
      const x2 = x * cy0 + z * sy0;
      let z2 = -x * sy0 + z * cy0;
      const y3 = y * cp - z2 * sp;
      z2 = y * sp + z2 * cp;
      const k = Dz / (Dz + z2);
      if (k <= 0) continue;
      const depth = clamp((k - 0.7) / 0.7);
      const bi = Math.min(nb - 1, Math.floor(depth * nb));
      s.buckets[q.hue * nb + bi].push(cx + x2 * k, cyy + y3 * k, k, q.tw);
    }
    ctx.globalCompositeOperation = p.alpha ? 'source-over' : 'lighter';
    for (let bi = 0; bi < nb; bi++) {
      ctx.globalAlpha = 0.28 + 0.72 * (bi / (nb - 1));
      for (let h = 0; h < s.sprites.length; h++) {
        const arr = s.buckets[h * nb + bi];
        const spr = s.sprites[h];
        for (let j = 0; j < arr.length; j += 4) {
          const tw = 0.85 + 0.3 * Math.sin(t * 5 + arr[j + 3]);
          const rr = s.dotR * arr[j + 2] * tw * 2.4;
          ctx.drawImage(spr, arr[j] - rr, arr[j + 1] - rr, rr * 2, rr * 2);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (!p.alpha) api.vignette(ctx, W, H, 0.5);
    void S;
  },
};
