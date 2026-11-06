// parchment-letter — an old letter on burnt-edged parchment writes itself
// glyph by glyph behind a moving quill, then a wax seal is stamped on it.
// Text lines become the body; set `place`, `signature`, `seal`.

export default {
  id: 'parchment-letter',
  title: 'Parchment Letter',
  tagline: 'Burnt-edge letter writes itself, then a wax seal stamps',
  fonts: [['Caveat', 600], ['Cinzel', 900], ['Cormorant Garamond', 500, 'italic']],
  defaults: {
    text: 'Sevgili kardeşim,\nBurada kışlar uzun, ama şehir hâlâ güzel.\nHer akşam limana inip gemileri sayıyorum.\nYakında dönerim.',
    place: 'Selanik, 12 Mart 1897',
    signature: 'Ahmet',
    seal: 'A',
    duration: 9,
    ink: '#2a1a0e',
    wax: '#8e1b1b',
    table: '#1a120b',
  },
  options: {
    place: 'Place + date line (top right)',
    signature: 'Signature under the letter',
    seal: 'Letter(s) embossed in the wax seal ("" for none)',
    ink: 'Ink colour',
    wax: 'Seal colour',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const r = api.rng(p.seed);
    // ---- parchment sheet with burnt edges (built once) ----
    const pw = Math.round(W * 0.86);
    const ph = Math.round(H * 0.74);
    const sheet = api.offscreen(pw, ph);
    const g = sheet.getContext('2d');
    g.fillStyle = '#e8d6ad';
    g.fillRect(0, 0, pw, ph);
    for (let i = 0; i < 60; i++) {
      const x = r() * pw;
      const y = r() * ph;
      const rad = (40 + r() * 220) * S;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() < 0.6;
      gr.addColorStop(0, dark ? `rgba(120,80,30,${0.05 + r() * 0.1})` : `rgba(255,245,215,${0.1 + r() * 0.15})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const img = g.getImageData(0, 0, pw, ph);
    const d = img.data;
    const edgeN = (x, y) => api.noise1(x * 0.02 + y * 0.013, 5) * 0.6 + api.noise1(x * 0.07 - y * 0.05, 9) * 0.4;
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const i = (y * pw + x) * 4;
        const fib = (r() - 0.5) * 14;
        d[i] += fib;
        d[i + 1] += fib;
        d[i + 2] += fib * 0.8;
        const edge = Math.min(x, y, pw - 1 - x, ph - 1 - y) / S;
        const n = edgeN(x, y) * 60;
        const e = edge - n;
        if (e < 4) d[i + 3] = 0; // burnt away
        else if (e < 14) {
          const k = (e - 4) / 10; // charred rim
          d[i] = 30 + k * 60;
          d[i + 1] = 18 + k * 35;
          d[i + 2] = 8 + k * 15;
        } else if (e < 60) {
          const k = 1 - (e - 14) / 46; // scorch gradient
          d[i] -= 90 * k * k;
          d[i + 1] -= 75 * k * k;
          d[i + 2] -= 55 * k * k;
        }
      }
    }
    g.putImageData(img, 0, 0);

    // ---- layout ----
    const lines = api.splitLines(p.text);
    let fs = 80 * S;
    ctx.font = api.font(fs, 'Caveat', 600);
    const maxW = pw * 0.82;
    let wrapped = lines.flatMap((l) => api.wrap(ctx, l, maxW));
    while (wrapped.length * fs * 1.35 > ph * 0.62 && fs > 26 * S) {
      fs *= 0.93;
      ctx.font = api.font(fs, 'Caveat', 600);
      wrapped = lines.flatMap((l) => api.wrap(ctx, l, maxW));
    }
    const glyphs = [];
    const sx = (W - pw) / 2;
    const sy = (H - ph) / 2;
    let y = sy + ph * 0.2;
    for (const line of wrapped) {
      const lay = api.layoutChars(ctx, line);
      lay.chars.forEach((c) => glyphs.push({ ...c, x: sx + pw * 0.09 + c.x, y, j: (r() - 0.5) * 2 }));
      y += fs * 1.35;
    }
    return { sheet, pw, ph, sx, sy, glyphs, fs, endY: y, grain: api.makeGrain(W, H, p.seed + 7, 3) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S } = api;
    api.bg(p.table);
    const D = p.duration;
    const writeEnd = D * 0.72;
    // sheet (slides in slightly)
    const enter = ease.outCubic(prog(t, 0, 0.8));
    ctx.save();
    ctx.translate(0, (1 - enter) * 60 * S);
    ctx.globalAlpha = enter;
    if (!p.alpha) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 50 * S;
      ctx.shadowOffsetY = 20 * S;
    }
    ctx.drawImage(s.sheet, s.sx, s.sy);
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1;

    // place/date
    ctx.font = `italic 500 ${Math.round(40 * S)}px "Cormorant Garamond"`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = api.rgba(p.ink, 0.85 * ease.outCubic(prog(t, 0.5, 1.2)));
    ctx.fillText(p.place, s.sx + s.pw * 0.91, s.sy + s.ph * 0.1);
    ctx.textAlign = 'left';

    // handwriting: each glyph is wiped on left→right
    const total = s.glyphs.length;
    const per = (writeEnd - 1.0) / Math.max(1, total);
    ctx.font = api.font(s.fs, 'Caveat', 600);
    ctx.fillStyle = p.ink;
    let pen = null;
    s.glyphs.forEach((gph, i) => {
      const t0 = 1.0 + i * per;
      const k = prog(t, t0, t0 + per * 1.6);
      if (k <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(gph.x - 2 * S, gph.y - s.fs, gph.w * k + 4 * S, s.fs * 1.5);
      ctx.clip();
      ctx.globalAlpha = 0.88 + gph.j * 0.08;
      ctx.fillText(gph.c, gph.x, gph.y + gph.j * S);
      ctx.restore();
      if (k < 1) pen = { x: gph.x + gph.w * k, y: gph.y - s.fs * 0.25 };
    });
    // signature
    const sigA = prog(t, writeEnd, writeEnd + 0.8);
    if (sigA > 0 && p.signature) {
      ctx.font = api.font(s.fs * 1.35, 'Caveat', 600);
      ctx.textAlign = 'right';
      const sx2 = s.sx + s.pw * 0.86;
      const sw = ctx.measureText(p.signature).width;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx2 - sw - 10 * S, s.endY, sw * sigA + 20 * S, s.fs * 2);
      ctx.clip();
      ctx.fillText(p.signature, sx2, s.endY + s.fs * 1.1);
      ctx.restore();
      if (sigA < 1) pen = { x: sx2 - sw + sw * sigA, y: s.endY + s.fs * 0.8 };
      ctx.textAlign = 'left';
    }
    // quill
    if (pen) quill(ctx, pen.x, pen.y, S, t);

    // wax seal
    if (p.seal != null && p.seal !== '') {
      const st = writeEnd + 0.9;
      const u = t - st;
      if (u > 0) {
        const sp = api.spring(u, { freq: 2.2, damping: 0.5 });
        const scale = 1 + (1 - Math.min(1, u / 0.18)) * 0.8;
        const cx = s.sx + s.pw * 0.24;
        const cyy = s.sy + s.ph * 0.86;
        const R = 92 * S;
        ctx.save();
        ctx.translate(cx, cyy);
        ctx.scale(scale * (0.9 + 0.1 * sp), scale * (0.9 + 0.1 * sp));
        ctx.rotate(-0.12);
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 18 * S;
        ctx.shadowOffsetY = 8 * S;
        ctx.fillStyle = p.wax;
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) {
          const a = (k / 40) * Math.PI * 2;
          const rr = R * (1 + 0.08 * api.noise1(k * 0.7, 3) + 0.05 * Math.sin(k * 3.1));
          const x = Math.cos(a) * rr;
          const y = Math.sin(a) * rr;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.fill();
        ctx.shadowColor = 'transparent';
        const ig = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R * 0.8);
        ig.addColorStop(0, 'rgba(255,140,120,0.45)');
        ig.addColorStop(1, 'rgba(60,0,0,0.35)');
        ctx.fillStyle = ig;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,0,0,0.6)';
        ctx.lineWidth = 3 * S;
        ctx.stroke();
        ctx.font = api.font(R * 0.75, 'Cinzel', 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(40,0,0,0.55)';
        ctx.fillText(p.seal, 3 * S, 4 * S);
        ctx.fillStyle = 'rgba(255,170,150,0.45)';
        ctx.fillText(p.seal, -1.5 * S, -1.5 * S);
        ctx.restore();
      }
    }
    ctx.restore();
    if (!p.alpha) {
      api.vignette(ctx, W, H, 0.7);
      s.grain(ctx, api.frameOf(t), 0.06);
    }
  },
};

function quill(ctx, x, y, S, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.75 + Math.sin(t * 18) * 0.04);
  ctx.fillStyle = '#1b130c';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-5 * S, -26 * S);
  ctx.lineTo(5 * S, -26 * S);
  ctx.closePath();
  ctx.fill();
  const fg = ctx.createLinearGradient(-40 * S, -280 * S, 40 * S, -30 * S);
  fg.addColorStop(0, 'rgba(250,245,232,0.95)');
  fg.addColorStop(1, 'rgba(190,175,150,0.95)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, -24 * S);
  ctx.bezierCurveTo(-60 * S, -110 * S, -50 * S, -230 * S, 6 * S, -320 * S);
  ctx.bezierCurveTo(40 * S, -230 * S, 36 * S, -110 * S, 0, -24 * S);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,70,50,0.7)';
  ctx.lineWidth = 2.5 * S;
  ctx.beginPath();
  ctx.moveTo(0, -24 * S);
  ctx.quadraticCurveTo(-2 * S, -180 * S, 6 * S, -320 * S);
  ctx.stroke();
  ctx.restore();
}
