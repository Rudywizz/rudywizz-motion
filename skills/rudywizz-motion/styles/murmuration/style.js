// murmuration — a starling flock folds and ripples across a dusk sky, then
// settles bird by bird into the words.

export default {
  id: 'murmuration',
  title: 'Murmuration',
  tagline: 'A starling flock folds into your words',
  fonts: [['Bricolage Grotesque', 800]],
  defaults: {
    text: 'Flock together',
    duration: 7,
    skyTop: '#1d2b4f',
    skyMid: '#b5677a',
    skyLow: '#f2b07d',
    bird: '#16141a',
    birds: 3200,
  },
  options: {
    birds: 'Number of birds (1000–5000)',
    skyTop: 'Sky colour at the top',
    skyMid: 'Sky colour in the middle',
    skyLow: 'Sky colour at the horizon',
    bird: 'Bird colour',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    const r = api.rng(p.seed);
    // text target points
    let lines = api.splitLines(p.text);
    if (lines.length === 1 && api.words(lines[0]).length > 1) lines = api.words(lines[0]);
    const size = api.fitSize(ctx, lines, { family: 'Bricolage Grotesque', weight: 800, maxW: W * 0.84, maxH: H * 0.36, lineHeight: 1.05, max: W * 0.26 });
    const m = api.offscreen(W, H);
    const g = m.getContext('2d');
    g.font = api.font(size, 'Bricolage Grotesque', 800);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    const top = H * 0.46 - (lines.length * size * 1.05) / 2;
    lines.forEach((l, i) => g.fillText(l, W / 2, top + (i + 0.5) * size * 1.05));
    const data = g.getImageData(0, 0, W, H).data;
    const N = Math.max(300, Math.min(6000, Number(p.birds) || 2600));
    // pick a grid step so the number of target points ~= number of birds
    let area = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i] > 128) area += 4;
    const step = Math.max(2, Math.sqrt(area / N));
    const pts = [];
    for (let y = 0; y < H; y += step)
      for (let x = 0; x < W; x += step) {
        const jx = Math.round(x + (r() - 0.5) * step * 0.6);
        const jy = Math.round(y + (r() - 0.5) * step * 0.6);
        if (data[(Math.min(H - 1, jy) * W + Math.min(W - 1, jx)) * 4 + 3] > 128) pts.push([jx, jy]);
      }
    // shuffle (deterministic) so birds pick targets evenly
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    const birds = [];
    for (let i = 0; i < N; i++) {
      // point inside a squashed sphere -> projected density waves
      let x, y, z;
      do {
        x = r() * 2 - 1;
        y = r() * 2 - 1;
        z = r() * 2 - 1;
      } while (x * x + y * y + z * z > 1);
      const tg = pts[i % Math.max(1, pts.length)] || [W / 2, H / 2];
      birds.push({
        o: [x, y, z],
        tx: tg[0] + (i >= pts.length ? (r() - 0.5) * step * 2 : 0),
        ty: tg[1] + (i >= pts.length ? (r() - 0.5) * step * 2 : 0),
        delay: r() * 0.9,
        ph: r() * Math.PI * 2,
        sz: 0.7 + r() * 0.6,
      });
    }
    return { birds, grain: api.makeGrain(W, H, p.seed + 5) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S } = api;
    // sky
    if (!p.alpha) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, p.skyTop);
      g.addColorStop(0.6, p.skyMid);
      g.addColorStop(1, p.skyLow);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const sun = ctx.createRadialGradient(W * 0.7, H * 0.86, 0, W * 0.7, H * 0.86, W * 0.7);
      sun.addColorStop(0, 'rgba(255,224,170,0.55)');
      sun.addColorStop(1, 'rgba(255,224,170,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, W, H);
      // distant hills
      ctx.fillStyle = 'rgba(30,22,40,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, H * 0.9 - api.noise1(x / (W * 0.2), 3) * H * 0.06);
      ctx.lineTo(W, H);
      ctx.fill();
    } else api.bg(null);

    const D = p.duration;
    const settleA = D * 0.38;
    const settleB = D * 0.78;
    // flock centre wanders
    const cx = W * (0.5 + 0.22 * Math.sin(t * 0.55));
    const cy = H * (0.42 + 0.12 * Math.sin(t * 0.8 + 1));
    const rx = W * 0.36;
    const ry = H * 0.12;
    const rz = W * 0.3;
    const a = t * 0.7;
    const b = Math.sin(t * 0.45) * 1.2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cb = Math.cos(b);
    const sb = Math.sin(b);

    ctx.strokeStyle = p.bird;
    ctx.fillStyle = p.bird;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6 * S;
    ctx.beginPath();
    for (const bd of s.birds) {
      const [ox, oy, oz] = bd.o;
      // fold: a travelling wave squeezes the ellipsoid
      const wave = 1 + 0.35 * Math.sin(ox * 3 + t * 2.4) * Math.cos(oz * 2 - t * 1.3);
      let x = ox * rx * wave;
      let y = oy * ry * (1 + 0.6 * Math.sin(ox * 2.2 + t * 1.7));
      let z = oz * rz;
      // rotate around y then x
      const x1 = x * ca + z * sa;
      const z1 = -x * sa + z * ca;
      const y1 = y * cb - z1 * sb;
      const fx = cx + x1;
      const fy = cy + y1 + Math.sin(x1 / W * 6 + t * 3) * H * 0.02;

      const k = ease.inOutCubic(prog(t, settleA + bd.delay * (settleB - settleA) * 0.6, settleB - (0.9 - bd.delay) * 0.2));
      const swirl = Math.sin(k * Math.PI) * W * 0.12;
      const px = api.lerp(fx, bd.tx, k) + swirl * Math.cos(bd.ph);
      const py = api.lerp(fy, bd.ty, k) + swirl * Math.sin(bd.ph) * 0.5;
      const flap = Math.sin(t * 22 + bd.ph) * (1 - k * 0.85);
      const w = 4.2 * S * bd.sz * (1 - k * 0.45);
      ctx.moveTo(px - w, py - flap * w * 0.7);
      ctx.lineTo(px, py);
      ctx.lineTo(px + w, py - flap * w * 0.7);
    }
    ctx.stroke();

    if (!p.alpha) {
      api.vignette(ctx, W, H, 0.35);
      s.grain(ctx, api.frameOf(t), 0.05);
    }
  },
};
