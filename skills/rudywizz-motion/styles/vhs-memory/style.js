// vhs-memory — a home-video tape: blue PLAY screen, then soft warm "footage"
// with your title burnt in, chroma bleed, a rolling tracking band, head-switch
// noise at the bottom and the camcorder date stamp.

export default {
  id: 'vhs-memory',
  title: 'VHS Memory',
  tagline: 'Home-video tape: PLAY, tracking noise, date stamp',
  fonts: [['VT323', 400]],
  defaults: {
    text: 'Summer / tapes',
    duration: 6,
    date: 'JUL. 14 1998',
    clock: 'PM 6:42',
    warmA: '#f0a35e',
    warmB: '#5a3d7a',
  },
  options: {
    date: 'Date stamp (bottom right)',
    clock: 'Time stamp under the date',
    warmA: 'Footage colour 1',
    warmB: 'Footage colour 2',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    let lines = api.splitLines(api.upper(p.text, p.lang));
    const size = api.fitSize(ctx, lines, { family: 'VT323', maxW: W * 0.8, maxH: H * 0.36, lineHeight: 0.95, max: W * 0.3 });
    const r = api.rng(p.seed);
    const noise = [];
    for (let k = 0; k < 6; k++) {
      const c = api.offscreen(W / 4, 24);
      const g = c.getContext('2d');
      const img = g.createImageData(c.width, c.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = r() < 0.12 ? 255 : r() * 90;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      noise.push(c);
    }
    const bokeh = Array.from({ length: 18 }, () => ({ x: r(), y: r(), r: 0.04 + r() * 0.1, s: 0.3 + r() }));
    return { lines, size, noise, bokeh, frameC: api.offscreen(W, H) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, hash, prog } = api;
    const f = api.frameOf(t);
    const pc = s.frameC;
    const g = pc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    const blue = t < 0.9;
    if (blue) {
      g.fillStyle = '#0a2fd6';
      g.fillRect(0, 0, W, H);
    } else {
      // warm footage with drifting bokeh + handheld wobble
      const wx = Math.sin(t * 1.3) * 10 * S + api.noise1(t * 2, 1) * 8 * S;
      const wy = Math.cos(t * 1.1) * 8 * S;
      const gr = g.createLinearGradient(0, 0, W * 0.4, H);
      gr.addColorStop(0, p.warmA);
      gr.addColorStop(1, p.warmB);
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      for (const b of s.bokeh) {
        const x = (b.x * W + t * 20 * b.s * S + wx) % (W * 1.2);
        const y = b.y * H + wy;
        const rr = b.r * W;
        const bg = g.createRadialGradient(x, y, 0, x, y, rr);
        bg.addColorStop(0, 'rgba(255,230,190,0.28)');
        bg.addColorStop(0.7, 'rgba(255,230,190,0.18)');
        bg.addColorStop(1, 'rgba(255,230,190,0)');
        g.fillStyle = bg;
        g.beginPath();
        g.arc(x, y, rr, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      // burnt-in title (with chroma bleed)
      const tIn = prog(t, 1.4, 1.6);
      if (tIn > 0) {
        g.font = api.font(s.size, 'VT323');
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const lh = s.size * 0.95;
        const top = H * 0.46 - (s.lines.length * lh) / 2;
        s.lines.forEach((l, i) => {
          const y = top + (i + 0.5) * lh;
          const jx = (hash(f, i) - 0.5) * 6 * S;
          g.fillStyle = 'rgba(255,40,60,0.75)';
          g.fillText(l, W / 2 - 8 * S + jx, y);
          g.fillStyle = 'rgba(40,140,255,0.75)';
          g.fillText(l, W / 2 + 8 * S + jx, y);
          g.fillStyle = '#fffbea';
          g.fillText(l, W / 2 + jx, y);
        });
      }
    }
    // OSD
    g.font = api.font(70 * S, 'VT323');
    g.textBaseline = 'top';
    g.textAlign = 'left';
    g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowOffsetX = 3 * S;
    g.shadowOffsetY = 3 * S;
    const m = 70 * S;
    if (t < 3 || f % 30 < 20) {
      g.fillText('PLAY', m, m);
      g.beginPath();
      g.moveTo(m + 150 * S, m + 14 * S);
      g.lineTo(m + 190 * S, m + 36 * S);
      g.lineTo(m + 150 * S, m + 58 * S);
      g.fill();
    }
    g.textAlign = 'right';
    g.fillText('SP', W - m, m);
    if (!blue) {
      g.textBaseline = 'bottom';
      g.fillText(p.date, W - m, H - m - 70 * S);
      g.fillText(p.clock, W - m, H - m);
      g.textAlign = 'left';
      const secs = Math.floor(t - 0.9);
      g.fillText(`0:00:${String(secs).padStart(2, '0')}`, m, H - m);
    }
    g.shadowColor = 'transparent';

    // --- composite with tape artefacts ---
    api.bg('#000');
    ctx.filter = `saturate(0.8) blur(${1.2 * S}px)`;
    ctx.drawImage(pc, 0, 0);
    ctx.filter = 'none';
    // colour bleed
    ctx.globalAlpha = 0.25;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(pc, 6 * S, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // tracking band rolling down
    const bandY = ((t * 0.28 + 0.15) % 1.3) * H - H * 0.15;
    const bandH = 90 * S;
    for (let y = bandY; y < bandY + bandH; y += 6 * S) {
      const shift = (hash(Math.floor(y), f) - 0.5) * 50 * S;
      ctx.drawImage(pc, 0, y, W, 6 * S, shift, y, W, 6 * S);
    }
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(s.noise[f % s.noise.length], 0, bandY, W, bandH);
    // head-switching noise at the bottom
    ctx.drawImage(s.noise[(f + 3) % s.noise.length], 0, H - 26 * S, W, 26 * S);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    api.scanlines(ctx, W, H, { gap: 4 * S, alpha: 0.18 });
    api.vignette(ctx, W, H, 0.55);
    // tape start: static before the blue screen
    if (t < 0.25) {
      ctx.globalAlpha = 1 - t / 0.25;
      ctx.drawImage(s.noise[f % s.noise.length], 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
};
