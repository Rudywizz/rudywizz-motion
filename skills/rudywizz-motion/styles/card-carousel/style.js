// card-carousel — 5–8 cards stand on a ring and the ring spins around a
// vertical axis in true perspective (cards are drawn as vertical strips), seen
// from slightly above so the far cards sit higher and darker. It decelerates and
// stops with the card of the last line facing the camera. Cards can hold your
// images (`images`) or one line of text each.

const FAMILY = 'Bricolage Grotesque';
const STRIPS = 20;

export default {
  id: 'card-carousel',
  title: 'Card Carousel',
  tagline: 'A 3D ring of cards spins and lands on your final line',
  fonts: [[FAMILY, 800], [FAMILY, 400], ['JetBrains Mono', 700]],
  defaults: {
    text: 'Design / Motion / Code / Sound / Story / Launch',
    duration: 7,
    colors: ['#ff6b4a', '#ffd166', '#06d6a0', '#3a86ff', '#8338ec', '#ff006e'],
    ink: '#ffffff',
    bg: ['#1f2433', '#07080c'],
    images: [],
    turns: 1,
  },
  options: {
    colors: 'Card colours, used in turn (array of hex)',
    ink: 'Text colour',
    bg: 'Background colour, or [centre, edge] gradient',
    images: 'Image paths/URLs, one per card (the line becomes its caption)',
    turns: 'Extra full turns before it settles (0–3)',
  },

  async setup(api) {
    const { W, H, p, S } = api;
    let lines = api.splitLines(p.text).slice(0, 8);
    if (!lines.length) lines = [' '];
    const imgs = [];
    for (const src of Array.isArray(p.images) ? p.images.slice(0, 8) : []) {
      try {
        imgs.push(await api.loadImage(src));
      } catch {
        imgs.push(null);
      }
    }
    const L = lines.length;
    const n = Math.max(5, Math.min(8, Math.max(L, imgs.length)));
    // on-screen size of the front card
    const cw = Math.round(Math.min(W * (W > H * 1.2 ? 0.26 : 0.4), H * (H > W ? 0.26 : 0.36)));
    const ch = Math.round(cw * 1.36);
    const rad = 0.06 * cw;

    const cardCanvas = (k) => {
      const c = api.offscreen(cw, ch);
      const g = c.getContext('2d');
      const col = p.colors[k % p.colors.length];
      const line = lines[k % L];
      const img = imgs.length ? imgs[k % imgs.length] : null;
      g.save();
      api.roundRect(g, 0, 0, cw, ch, rad);
      g.clip();
      if (img) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const sc = Math.max(cw / iw, ch / ih);
        g.drawImage(img, (cw - iw * sc) / 2, (ch - ih * sc) / 2, iw * sc, ih * sc);
        const sh = g.createLinearGradient(0, ch * 0.45, 0, ch);
        sh.addColorStop(0, 'rgba(0,0,0,0)');
        sh.addColorStop(1, 'rgba(0,0,0,0.75)');
        g.fillStyle = sh;
        g.fillRect(0, 0, cw, ch);
      } else {
        const gr = g.createLinearGradient(0, 0, cw, ch);
        gr.addColorStop(0, api.mixHex(col, '#ffffff', 0.15));
        gr.addColorStop(1, api.mixHex(col, '#000000', 0.3));
        g.fillStyle = gr;
        g.fillRect(0, 0, cw, ch);
        // soft shapes for depth
        g.globalAlpha = 0.18;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(cw * 0.85, ch * 0.12, cw * 0.45, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 0.12;
        g.fillStyle = '#000000';
        g.beginPath();
        g.arc(cw * 0.1, ch * 0.95, cw * 0.5, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      // label
      g.fillStyle = api.rgba(p.ink, 0.75);
      g.font = api.font(cw * 0.06, 'JetBrains Mono', 700);
      g.textBaseline = 'top';
      g.fillText(String((k % L) + 1).padStart(2, '0'), cw * 0.08, cw * 0.08);
      // text (wrapped, fitted; hyphenate one very long word)
      const maxW = cw * 0.84;
      const maxH = img ? ch * 0.25 : ch * 0.5;
      g.font = api.font(100, FAMILY, 800);
      let ls = [line];
      let size = api.fitSize(g, ls, { family: FAMILY, weight: 800, maxW, maxH, lineHeight: 1.05, max: cw * 0.24, min: 2 });
      const wn = api.words(line).length;
      for (let m = 2; m <= Math.min(4, wn); m++) {
        g.font = api.font(100, FAMILY, 800);
        const cand = api.wrap(g, line, (g.measureText(line).width / m) * 1.1);
        const s2 = api.fitSize(g, cand, { family: FAMILY, weight: 800, maxW, maxH, lineHeight: 1.05, max: cw * 0.24, min: 2 });
        if (s2 > size * 1.12) {
          size = s2;
          ls = cand;
        }
      }
      if (wn === 1 && size < cw * 0.09) {
        const gs = api.graphemes(line);
        for (let m = 2; m <= 4 && size < cw * 0.09; m++) {
          const per = Math.ceil(gs.length / m);
          const cand = Array.from({ length: m }, (_, i) => gs.slice(i * per, (i + 1) * per).join('') + (i < m - 1 ? '-' : ''));
          const s2 = api.fitSize(g, cand, { family: FAMILY, weight: 800, maxW, maxH, lineHeight: 1.05, max: cw * 0.24, min: 2 });
          if (s2 > size) {
            size = s2;
            ls = cand;
          }
        }
      }
      g.font = api.font(size, FAMILY, 800);
      g.fillStyle = p.ink;
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
      const lh = size * 1.05;
      const y0 = ch - cw * 0.1 - (ls.length - 1) * lh;
      ls.forEach((l, i) => g.fillText(l, cw * 0.08, y0 + i * lh));
      // bottom rule
      g.fillStyle = api.rgba(p.ink, 0.5);
      g.fillRect(cw * 0.08, ch - cw * 0.06, cw * 0.2, 2 * S);
      g.restore();
      // rim
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = Math.max(1, 2 * S);
      api.roundRect(g, 1, 1, cw - 2, ch - 2, rad);
      g.stroke();
      return c;
    };
    const backCanvas = () => {
      const c = api.offscreen(cw, ch);
      const g = c.getContext('2d');
      api.roundRect(g, 0, 0, cw, ch, rad);
      g.fillStyle = '#1a1d26';
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.06)';
      g.lineWidth = 6 * S;
      for (let x = -ch; x < cw + ch; x += 22 * S) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + ch, ch);
        g.stroke();
      }
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.lineWidth = Math.max(1, 2 * S);
      api.roundRect(g, 1, 1, cw - 2, ch - 2, rad);
      g.stroke();
      return c;
    };
    const cards = Array.from({ length: n }, (_, k) => cardCanvas(k));
    const darks = cards.map((c) => api.tint(c, '#000'));
    const back = backCanvas();
    const refl = api.offscreen(W, H);
    return { cards, darks, back, n, L, cw, ch, refl };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, prog, ease, clamp } = api;
    if (!p.alpha) {
      const [c0, c1] = Array.isArray(p.bg) ? p.bg : [p.bg, api.mixHex(p.bg, '#000000', 0.6)];
      const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.hypot(W, H) * 0.6);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else api.bg(null);

    const { n, cw, ch } = s;
    const D = p.duration;
    const step = (Math.PI * 2) / n;
    const target = (s.L - 1) * step;
    const turns = Math.max(0, Math.min(3, Number(p.turns ?? 1)));
    const travel = Math.PI * 2 * turns + step * 2.5;
    const u = prog(t, 0.15, D * 0.8);
    // smooth start, long decelerating settle
    const e = 1 - Math.pow(1 - ease.inOutSine(u), 2.2);
    const theta = target - travel * (1 - e);
    const appear = ease.outCubic(prog(t, 0, 0.8));

    // world units: card width 1; ring radius so neighbours don't overlap
    const R = Math.max(1.05, (n * 1.12) / (Math.PI * 2));
    const dist = 2.6; // camera → front card
    const Dz = dist + R;
    const f = cw * dist; // front card at scale cw px per unit
    const camH = 1.05; // camera height above card centre (world units = card widths)
    const hh = (ch / cw) / 2;
    const sFront = f / dist;
    const cx = W / 2;
    const cyBase = H * 0.46 - camH * sFront + (1 - appear) * 60 * S;
    const proj = (x, z) => {
      const k = f / z;
      return { X: cx + x * k, k, yc: cyBase + camH * k };
    };

    const items = [];
    for (let k = 0; k < n; k++) {
      const phi = k * step - theta;
      const nx = Math.sin(phi);
      const nz = -Math.cos(phi);
      const ccx = R * nx;
      const ccz = Dz + R * nz;
      const tx = Math.cos(phi);
      const tz = Math.sin(phi);
      const front = nx * ccx + nz * ccz < 0;
      items.push({ k, ccz, front, x0: ccx - 0.5 * tx, z0: ccz - 0.5 * tz, x1: ccx + 0.5 * tx, z1: ccz + 0.5 * tz });
    }
    items.sort((a, b) => b.ccz - a.ccz);
    const zMin = Dz - R;
    const zMax = Dz + R;

    const drawCard = (c, it, mirror) => {
      const img = it.front ? s.cards[it.k] : s.back;
      const dk = it.front ? s.darks[it.k] : null;
      const shade = clamp((it.ccz - zMin) / (zMax - zMin)) * 0.72;
      const iw = img.width;
      const ih = img.height;
      for (let j = 0; j < STRIPS; j++) {
        // back faces are seen mirrored: walk their texture the other way
        const u0 = j / STRIPS;
        const u1 = (j + 1) / STRIPS;
        const A = proj(it.x0 + (it.x1 - it.x0) * u0, it.z0 + (it.z1 - it.z0) * u0);
        const B = proj(it.x0 + (it.x1 - it.x0) * u1, it.z0 + (it.z1 - it.z0) * u1);
        const k = (A.k + B.k) / 2;
        const yc = (A.yc + B.yc) / 2;
        const x0 = Math.min(A.X, B.X);
        const w = Math.abs(B.X - A.X) + 0.7;
        const top = yc - hh * k;
        const hgt = 2 * hh * k;
        const su = it.front ? u0 : 1 - u1;
        if (mirror) {
          c.save();
          c.translate(0, (top + hgt) * 2);
          c.scale(1, -1);
        }
        c.drawImage(img, su * iw, 0, iw / STRIPS, ih, x0, top, w, hgt);
        if (dk && shade > 0.01) {
          c.globalAlpha = shade;
          c.drawImage(dk, su * iw, 0, iw / STRIPS, ih, x0, top, w, hgt);
          c.globalAlpha = 1;
        }
        if (mirror) c.restore();
      }
    };

    ctx.globalAlpha = appear;
    if (!p.alpha) {
      // reflections first, faded toward the bottom
      const r = s.refl.getContext('2d');
      r.setTransform(1, 0, 0, 1, 0, 0);
      r.globalCompositeOperation = 'source-over';
      r.clearRect(0, 0, W, H);
      for (const it of items) drawCard(r, it, true);
      r.globalCompositeOperation = 'destination-in';
      const fy = cyBase + camH * sFront + hh * sFront;
      const m = r.createLinearGradient(0, fy - ch * 0.4, 0, fy + ch * 0.6);
      m.addColorStop(0, 'rgba(0,0,0,0.3)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      r.fillStyle = m;
      r.fillRect(0, 0, W, H);
      r.globalCompositeOperation = 'source-over';
      ctx.drawImage(s.refl, 0, 0);
    }
    for (const it of items) drawCard(ctx, it, false);
    ctx.globalAlpha = 1;
    if (!p.alpha) api.vignette(ctx, W, H, 0.45);
  },
};
