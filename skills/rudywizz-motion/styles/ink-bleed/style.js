// ink-bleed — ink drops fall onto paper, spread, and merge until they have
// filled in the letters. Gooey edges come from a blurred field + threshold.

export default {
  id: 'ink-bleed',
  title: 'Ink Bleed',
  tagline: 'Ink drops land, spread and merge into the words',
  fonts: [['Fraunces', 900]],
  defaults: {
    text: 'Slow / is / smooth',
    duration: 7,
    paper: '#f1ece1',
    ink: '#1b2140',
    splatter: true,
  },
  options: {
    paper: 'Paper colour',
    ink: 'Ink colour',
    splatter: 'Small satellite splashes around each drop (true/false)',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    const r = api.rng(p.seed);
    const k = 2; // field is computed at 1/k resolution
    const w2 = Math.round(W / k);
    const h2 = Math.round(H / k);
    let lines = api.splitLines(p.text);
    if (lines.length === 1 && api.words(lines[0]).length > 1) lines = api.words(lines[0]);
    const size = api.fitSize(ctx, lines, { family: 'Fraunces', weight: 900, maxW: W * 0.82, maxH: H * 0.55, lineHeight: 1.04, max: W * 0.3 });
    const mask = api.offscreen(w2, h2);
    const mg = mask.getContext('2d');
    mg.fillStyle = '#000';
    mg.fillRect(0, 0, w2, h2);
    mg.font = api.font(size / k, 'Fraunces', 900);
    mg.textAlign = 'center';
    mg.textBaseline = 'middle';
    mg.fillStyle = '#fff';
    const top = h2 / 2 - (lines.length * (size / k) * 1.04) / 2;
    lines.forEach((l, i) => mg.fillText(l, w2 / 2, top + (i + 0.5) * (size / k) * 1.04));
    const maskBlur = api.offscreen(w2, h2);
    const bg = maskBlur.getContext('2d');
    bg.filter = `blur(${Math.max(2, size / k / 40)}px)`;
    bg.drawImage(mask, 0, 0);

    // drops: sample inside letters, roughly left-to-right, top-to-bottom
    const md = mg.getImageData(0, 0, w2, h2).data;
    const rmax = (size / k) * 0.2;
    const gap = rmax * 1.05;
    const drops = [];
    for (let y = gap / 2; y < h2; y += gap)
      for (let x = gap / 2; x < w2; x += gap) {
        const jx = x + (r() - 0.5) * gap * 0.7;
        const jy = y + (r() - 0.5) * gap * 0.7;
        const ix = Math.min(w2 - 1, Math.max(0, Math.round(jx)));
        const iy = Math.min(h2 - 1, Math.max(0, Math.round(jy)));
        // accept if the drop lands inside, or close to, a letter
        let hit = md[(iy * w2 + ix) * 4] > 120;
        if (!hit) for (const [ox, oy] of [[gap * 0.5, 0], [-gap * 0.5, 0], [0, gap * 0.5], [0, -gap * 0.5]]) {
          const qx = Math.min(w2 - 1, Math.max(0, Math.round(jx + ox)));
          const qy = Math.min(h2 - 1, Math.max(0, Math.round(jy + oy)));
          if (md[(qy * w2 + qx) * 4] > 120) { hit = true; break; }
        }
        if (hit) drops.push({ x: jx, y: jy, rm: rmax * (0.85 + r() * 0.5), seed: r() * 100 });
      }
    const D = p.duration;
    drops.sort((a, b) => a.y / h2 + (a.x / w2) * 0.6 - (b.y / h2 + (b.x / w2) * 0.6));
    drops.forEach((d, i) => {
      d.t = 0.3 + (i / drops.length) * D * 0.5 + r() * 0.3;
      d.splats = [];
      if (p.splatter && r() < 0.12) {
        const n = 2 + Math.floor(r() * 4);
        for (let j = 0; j < n; j++) {
          const a = r() * Math.PI * 2;
          const dist = d.rm * (0.9 + r() * 1.2);
          d.splats.push({ x: d.x + Math.cos(a) * dist, y: d.y + Math.sin(a) * dist, r: 1 + r() * d.rm * 0.09 });
        }
      }
    });
    const field = api.offscreen(w2, h2);
    const ink = api.offscreen(w2, h2);
    return { k, w2, h2, maskBlur, drops, field, ink, img: ink.getContext('2d').createImageData(w2, h2), grain: api.makeGrain(W, H, p.seed + 4, 3) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S } = api;
    const { w2, h2, k } = s;
    api.bg(p.paper);
    // paper fibres
    if (!p.alpha) s.grain(ctx, 0, 0.09, 'multiply');

    // 1) soft blobs
    const f = s.field.getContext('2d');
    f.globalCompositeOperation = 'source-over';
    f.fillStyle = '#000';
    f.fillRect(0, 0, w2, h2);
    f.globalCompositeOperation = 'lighter';
    for (const d of s.drops) {
      if (t < d.t) continue;
      const g = ease.outCubic(prog(t, d.t, d.t + 1.1));
      const rr = d.rm * g * (1 + 0.6 * prog(t, d.t + 1.1, p.duration)); // keeps creeping a little
      const grad = f.createRadialGradient(d.x, d.y, 0, d.x, d.y, rr + 1);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      f.fillStyle = grad;
      f.beginPath();
      f.arc(d.x, d.y, rr + 1, 0, Math.PI * 2);
      f.fill();
    }
    // 2) keep it (mostly) inside the letters
    f.globalCompositeOperation = 'multiply';
    f.drawImage(s.maskBlur, 0, 0);

    // 3) threshold -> gooey ink
    const src = f.getImageData(0, 0, w2, h2).data;
    const out = s.img.data;
    const [ir, ig, ib] = api.hexToRgb(p.ink);
    for (let i = 0; i < src.length; i += 4) {
      const v = src[i] / 255;
      const a = v < 0.28 ? 0 : v > 0.36 ? 1 : (v - 0.28) / 0.08;
      const edge = v < 0.5 ? 0.78 : 1; // pooling: edges slightly darker
      out[i] = ir * edge;
      out[i + 1] = ig * edge;
      out[i + 2] = ib * edge;
      out[i + 3] = a * 240;
    }
    const ic = s.ink.getContext('2d');
    ic.putImageData(s.img, 0, 0);
    // splatters are not masked
    ic.fillStyle = p.ink;
    for (const d of s.drops) {
      if (t < d.t) continue;
      const g = ease.outExpo(prog(t, d.t, d.t + 0.25));
      for (const sp of d.splats) {
        ic.beginPath();
        ic.arc(api.lerp(d.x, sp.x, g), api.lerp(d.y, sp.y, g), sp.r * g, 0, Math.PI * 2);
        ic.fill();
      }
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(s.ink, 0, 0, W, H);

    // 4) falling drops just before impact
    for (const d of s.drops) {
      const u = prog(t, d.t - 0.28, d.t);
      if (u <= 0 || u >= 1) continue;
      const x = d.x * k;
      const y = d.y * k;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(x, y, d.rm * k * 0.15 * u, d.rm * k * 0.07 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.ink;
      ctx.beginPath();
      ctx.ellipse(x, y - (1 - u) * 160 * S, 7 * S * (1.2 - u * 0.4), 10 * S, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!p.alpha) api.vignette(ctx, W, H, 0.22, '60,40,20');
  },
};
