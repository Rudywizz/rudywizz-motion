// cube-spin — a solid 3D cube turns face to face, one line of text per face.
// Faces are drawn in true perspective as thin vertical strips (a plane turning
// about a vertical axis keeps vertical lines vertical), lit from the front-left,
// with a glossy floor reflection.

const FAMILY = 'Unbounded';
const WEIGHT = 900;
const STRIPS = 36;

export default {
  id: 'cube-spin',
  title: 'Cube Spin',
  tagline: 'A 3D cube turns face to face, one line of text on each side',
  fonts: [[FAMILY, WEIGHT], ['Space Grotesk', 700]],
  defaults: {
    text: 'Plan / Build / Ship / Repeat',
    duration: 7,
    colors: ['#ff4f6d', '#2f6bff', '#11c48b', '#ffb020'],
    ink: '#ffffff',
    bg: ['#20232d', '#07080b'],
    floor: true,
  },
  options: {
    colors: 'Face colours, used in turn (array of hex)',
    ink: 'Text colour',
    bg: 'Background colour, or [centre, edge] gradient',
    floor: 'Glossy floor reflection (true/false)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    let lines = api.splitLines(api.upper(p.text, p.lang));
    if (!lines.length) lines = [' '];
    lines = lines.slice(0, 12);
    // face size on screen when it faces the camera
    const F = Math.round(Math.min(W * 0.56, H * (H > W ? 0.36 : 0.5)));
    const faces = [...lines, ''].map((line, k) => {
      const c = api.offscreen(F, F);
      const g = c.getContext('2d');
      const col = p.colors[k % p.colors.length];
      const gr = g.createLinearGradient(0, 0, F, F);
      gr.addColorStop(0, api.mixHex(col, '#ffffff', 0.18));
      gr.addColorStop(1, api.mixHex(col, '#000000', 0.2));
      g.fillStyle = gr;
      g.fillRect(0, 0, F, F);
      // bevel edge
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = F * 0.014;
      g.strokeRect(F * 0.007, F * 0.007, F * 0.986, F * 0.986);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.strokeRect(F * 0.03, F * 0.03, F * 0.94, F * 0.94);
      // index label
      if (!line) return c; // blank side for the faces beyond the text
      g.fillStyle = api.rgba(p.ink, 0.6);
      g.font = api.font(F * 0.055, 'Space Grotesk', 700);
      g.textBaseline = 'top';
      g.fillText(String(k + 1).padStart(2, '0') + ' / ' + String(lines.length).padStart(2, '0'), F * 0.08, F * 0.08);
      // text, wrapped to fit the face
      g.font = api.font(100, FAMILY, WEIGHT);
      let ls = [line];
      let size = api.fitSize(g, ls, { family: FAMILY, weight: WEIGHT, maxW: F * 0.8, maxH: F * 0.6, lineHeight: 1.08, max: F * 0.3, min: 2 });
      const wn = api.words(line).length;
      for (let n = 2; n <= Math.min(4, wn); n++) {
        g.font = api.font(100, FAMILY, WEIGHT);
        const cand = api.wrap(g, line, (g.measureText(line).width / n) * 1.1);
        const s2 = api.fitSize(g, cand, { family: FAMILY, weight: WEIGHT, maxW: F * 0.8, maxH: F * 0.6, lineHeight: 1.08, max: F * 0.3 });
        if (s2 > size * 1.12) {
          size = s2;
          ls = cand;
        }
      }
      // one very long word: break it into hyphenated chunks rather than shrinking it to dust
      if (ls.length === 1 && wn === 1 && size < F * 0.075) {
        const gs = api.graphemes(line);
        for (let n = 2; n <= 4 && size < F * 0.075; n++) {
          const per = Math.ceil(gs.length / n);
          const cand = Array.from({ length: n }, (_, i) => gs.slice(i * per, (i + 1) * per).join('') + (i < n - 1 ? '-' : '')).filter((x) => x !== '-');
          const s2 = api.fitSize(g, cand, { family: FAMILY, weight: WEIGHT, maxW: F * 0.8, maxH: F * 0.6, lineHeight: 1.08, max: F * 0.3, min: 2 });
          if (s2 > size) {
            size = s2;
            ls = cand;
          }
        }
      }
      g.font = api.font(size, FAMILY, WEIGHT);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const lh = size * 1.08;
      ls.forEach((l, i) => {
        const y = F / 2 + (i - (ls.length - 1) / 2) * lh + F * 0.03;
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillText(l, F / 2 + size * 0.05, y + size * 0.06);
        g.fillStyle = p.ink;
        g.fillText(l, F / 2, y);
      });
      return c;
    });
    const dark = faces.map((c) => api.tint(c, '#000'));
    const refl = api.offscreen(W, H);
    void S;
    return { lines, faces, dark, F, refl };
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

    const D = p.duration;
    const L = s.lines.length;
    // timeline in "face units": intro spin from -1.6 to 0, then one quarter turn per line
    const intro = Math.min(1.1, D * 0.2);
    const endHold = Math.min(0.9, D * 0.15);
    const seg = (D - intro - endHold) / Math.max(1, L - 1);
    let a = -1.6 * (1 - ease.outCubic(prog(t, 0, intro)));
    if (L > 1 && t > intro) {
      const k = Math.min(L - 1, Math.floor((t - intro) / seg));
      const local = (t - intro - k * seg) / seg;
      const turn = 0.55; // fraction of each segment spent turning
      const u = prog(local, 1 - turn, 1);
      // overshooting ease for a weighty snap
      const e = u <= 0 ? 0 : 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
      a = Math.min(L - 1, k + (k >= L - 1 ? 0 : e));
    }
    const sway = (0.34 + 0.07 * Math.sin(t * 0.8)) * clamp(prog(t, 0, intro * 1.2));
    const theta = a * (Math.PI / 2) + sway;
    const appear = ease.outBack(clamp(prog(t, 0, intro * 0.9)), 1.4);

    // world: cube half-size h = 1, centre at depth Dz; f maps front face to s.F px
    const h = 1;
    const Dz = 4.2;
    const f = (s.F / 2) * (Dz - h) / h;
    const cx = W / 2;
    const cy = H * 0.44 - (1 - appear) * 40 * S;
    const sc = Math.max(0.001, appear);
    const pitch = 0.12 * Math.sin(t * 0.7); // gentle nod (applied as vertical parallax)

    const project = (x, z) => {
      const k = (f / z) * sc;
      return { X: cx + x * k, k };
    };
    // visible faces: indexes around the current angle
    const base = Math.floor(theta / (Math.PI / 2));
    const list = [];
    for (let fi = base - 1; fi <= base + 2; fi++) {
      const psi = fi * (Math.PI / 2) - theta;
      const nx = Math.sin(psi);
      const nz = -Math.cos(psi);
      const ccx = h * nx;
      const ccz = Dz + h * nz;
      // facing camera if normal points toward the eye
      if (nx * ccx + nz * ccz >= -1e-4) continue;
      const tx = Math.cos(psi);
      const tz = Math.sin(psi);
      const li = fi < 0 || fi > L - 1 ? L : fi; // L = blank face
      const light = clamp(0.45 + 0.55 * (-nz * 0.85 - nx * 0.5));
      list.push({ li, x0: ccx - h * tx, z0: ccz - h * tz, x1: ccx + h * tx, z1: ccz + h * tz, light, depth: ccz });
    }
    list.sort((A, B) => B.depth - A.depth);

    const drawFaces = (c, mirror) => {
      for (const fc of list) {
        const img = s.faces[fc.li];
        const dk = s.dark[fc.li];
        const iw = img.width;
        for (let j = 0; j < STRIPS; j++) {
          const u0 = j / STRIPS;
          const u1 = (j + 1) / STRIPS;
          const xa = fc.x0 + (fc.x1 - fc.x0) * u0;
          const za = fc.z0 + (fc.z1 - fc.z0) * u0;
          const xb = fc.x0 + (fc.x1 - fc.x0) * u1;
          const zb = fc.z0 + (fc.z1 - fc.z0) * u1;
          const A = project(xa, za);
          const B = project(xb, zb);
          const k = (A.k + B.k) / 2;
          const x0 = Math.min(A.X, B.X);
          const w = Math.abs(B.X - A.X) + 0.8;
          const zc = (za + zb) / 2;
          const par = pitch * (zc - Dz) * k * 0.6;
          const top = cy - h * k + par;
          const hh = 2 * h * k;
          if (!mirror) {
            c.drawImage(img, u0 * iw, 0, iw / STRIPS, iw, x0, top, w, hh);
            if (fc.light < 1) {
              c.globalAlpha = (1 - fc.light) * 0.85;
              c.drawImage(dk, u0 * iw, 0, iw / STRIPS, iw, x0, top, w, hh);
              c.globalAlpha = 1;
            }
          } else {
            const bottom = cy + h * k + par;
            c.save();
            c.translate(0, bottom * 2);
            c.scale(1, -1);
            c.drawImage(img, u0 * iw, 0, iw / STRIPS, iw, x0, top, w, hh);
            c.globalAlpha = (1 - fc.light) * 0.85 + 0.15;
            c.drawImage(dk, u0 * iw, 0, iw / STRIPS, iw, x0, top, w, hh);
            c.restore();
          }
        }
      }
    };

    const floorY = cy + h * (f / (Dz - h)) * sc;
    // contact shadow
    ctx.save();
    ctx.translate(cx, floorY);
    ctx.scale(1, 0.12);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, s.F * 0.9 * sc);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(0, 0, s.F * 0.9 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (p.floor && !p.alpha) {
      const r = s.refl.getContext('2d');
      r.setTransform(1, 0, 0, 1, 0, 0);
      r.globalCompositeOperation = 'source-over';
      r.clearRect(0, 0, W, H);
      drawFaces(r, true);
      r.globalCompositeOperation = 'destination-in';
      const m = r.createLinearGradient(0, floorY - s.F * 0.1, 0, floorY + s.F * 0.75);
      m.addColorStop(0, 'rgba(0,0,0,0.38)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      r.fillStyle = m;
      r.fillRect(0, 0, W, H);
      r.globalCompositeOperation = 'source-over';
      ctx.drawImage(s.refl, 0, 0);
    }
    drawFaces(ctx, false);
    // front-edge highlight where two faces meet
    if (!p.alpha) api.vignette(ctx, W, H, 0.4);
  },
};
