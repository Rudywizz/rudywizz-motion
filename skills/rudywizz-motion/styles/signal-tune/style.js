// signal-tune — an old tube TV hunting for a channel: snow, a rolling picture,
// a test card, a channel flip, then your message on air with an OSD overlay.

export default {
  id: 'signal-tune',
  title: 'Signal Tune',
  tagline: 'Old TV finds the channel: snow, test card, on air',
  fonts: [['Syne', 800], ['VT323', 400]],
  defaults: {
    text: 'Now / on air',
    duration: 7,
    channel: '07',
    station: 'MOTION TV',
    screen: '#16204a',
    ink: '#ffffff',
    bezel: '#1c1a17',
  },
  options: {
    channel: 'Channel number shown in the green OSD',
    station: 'Label on the test card',
    screen: 'On-air background colour',
    bezel: 'TV body colour',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    const r = api.rng(p.seed);
    // pre-baked snow frames at low res
    const sw = Math.round(W / 4);
    const sh = Math.round(H / 4);
    const snow = [];
    for (let k = 0; k < 8; k++) {
      const c = api.offscreen(sw, sh);
      const g = c.getContext('2d');
      const img = g.createImageData(sw, sh);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = r() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      snow.push(c);
    }
    let lines = api.splitLines(api.upper(p.text, p.lang));
    const size = api.fitSize(ctx, lines, { family: 'Syne', weight: 800, maxW: W * 0.74, maxH: H * 0.4, lineHeight: 1.05, max: W * 0.24 });
    return { snow, lines, size, frameC: api.offscreen(W, H) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, prog, S } = api;
    const f = api.frameOf(t);
    const D = p.duration;
    // screen rect (inside the bezel)
    const m = 70 * S;
    const sx = m;
    const sy = H * 0.12;
    const sw = W - m * 2;
    const sh = H * 0.7;
    const T1 = D * 0.18; // snow -> rolling test card
    const T2 = D * 0.32; // test card locked
    const T3 = D * 0.5; // channel flip
    const T4 = D * 0.56; // on air

    // --- draw the picture into an offscreen canvas ---
    const pc = s.frameC;
    const g = pc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    const snowAmt =
      t < T1 ? 1 : t < T2 ? 1 - prog(t, T1, T2) * 0.85 : t < T3 ? 0.08 : t < T4 ? 1 : 0.06 * (1 - prog(t, T4, T4 + 0.6)) + 0.03;

    const picture = (gg) => {
      if (t < T3) testCard(api, gg, sx, sy, sw, sh);
      else onAir(api, gg, s, sx, sy, sw, sh, t - T4);
    };
    if (t >= T1 && t < T2) {
      // vertical roll that slows down to lock
      const k = prog(t, T1, T2);
      const roll = ((1 - api.ease.outCubic(k)) * 3.2 * sh) % sh;
      g.save();
      g.beginPath();
      g.rect(sx, sy, sw, sh);
      g.clip();
      g.translate(0, roll);
      picture(g);
      g.translate(0, -sh);
      picture(g);
      g.restore();
    } else if (t >= T1) {
      g.save();
      g.beginPath();
      g.rect(sx, sy, sw, sh);
      g.clip();
      picture(g);
      g.restore();
    }
    // snow
    g.save();
    g.globalAlpha = snowAmt;
    g.imageSmoothingEnabled = false;
    g.drawImage(s.snow[f % s.snow.length], sx, sy, sw, sh);
    g.restore();

    // --- composite with ghosting + chroma offset + scanlines ---
    api.bg(p.bezel);
    ctx.save();
    api.roundRect(ctx, sx, sy, sw, sh, 60 * S);
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 0.25;
    ctx.drawImage(pc, 18 * S, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(pc, 0, 0);
    api.scanlines(ctx, W, H, { gap: 5 * S, alpha: 0.28 });
    // glass bulge shading
    const gl = ctx.createRadialGradient(W / 2, sy + sh / 2, sw * 0.3, W / 2, sy + sh / 2, sw * 0.85);
    gl.addColorStop(0, 'rgba(0,0,0,0)');
    gl.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = gl;
    ctx.fillRect(sx, sy, sw, sh);
    // reflection streak
    const rf = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh * 0.5);
    rf.addColorStop(0, 'rgba(255,255,255,0.10)');
    rf.addColorStop(0.35, 'rgba(255,255,255,0)');
    ctx.fillStyle = rf;
    ctx.fillRect(sx, sy, sw, sh);
    // flip flash
    if (t > T3 && t < T3 + 0.12) {
      ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - (t - T3) / 0.12)})`;
      ctx.fillRect(sx, sy, sw, sh);
    }
    // OSD
    const osdOn = (t > T2 - 0.2 && t < T2 + 1.4) || (t > T3 && t < T3 + 2.0);
    if (osdOn) {
      ctx.font = api.font(84 * S, 'VT323');
      ctx.fillStyle = '#5dff7a';
      ctx.shadowColor = '#5dff7a';
      ctx.shadowBlur = 12 * S;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`CH ${t > T3 ? String(Number(p.channel) + 1).padStart(2, '0') : p.channel}`, sx + sw - 60 * S, sy + 50 * S);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // bezel details
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 6 * S;
    api.roundRect(ctx, sx - 14 * S, sy - 14 * S, sw + 28 * S, sh + 28 * S, 70 * S);
    ctx.stroke();
    const ky = sy + sh + (H - sy - sh) * 0.45;
    for (let i = 0; i < 2; i++) {
      const kx = W - m - 90 * S - i * 150 * S;
      ctx.fillStyle = '#2b2824';
      ctx.beginPath();
      ctx.arc(kx, ky, 48 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(i === 0 ? prog(t, T1, T3) * 4 : 0.6);
      ctx.fillStyle = '#4a453e';
      ctx.fillRect(-6 * S, -44 * S, 12 * S, 30 * S);
      ctx.restore();
    }
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = '#100f0d';
      ctx.fillRect(m + 10 * S, ky - 40 * S + i * 10 * S, W * 0.4, 4 * S);
    }
    ctx.fillStyle = t > 0.1 ? '#ff4836' : '#401410';
    ctx.beginPath();
    ctx.arc(W - m - 40 * S, ky + 70 * S, 6 * S, 0, Math.PI * 2);
    ctx.fill();
  },
};

function testCard(api, g, x, y, w, h) {
  const { p, S } = api;
  const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  const bw = w / bars.length;
  bars.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(x + i * bw, y, bw + 1, h * 0.62);
  });
  const rev = ['#0000c0', '#111', '#c000c0', '#111', '#00c0c0', '#111', '#c0c0c0'];
  rev.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(x + i * bw, y + h * 0.62, bw + 1, h * 0.08);
  });
  for (let i = 0; i < 6; i++) {
    const v = Math.round((i / 5) * 235 + 10);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x + (i * w) / 6, y + h * 0.7, w / 6 + 1, h * 0.3);
  }
  const cx = x + w / 2;
  const cy = y + h * 0.44;
  const R = w * 0.32;
  g.strokeStyle = '#fff';
  g.lineWidth = 6 * S;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(cx - R, cy);
  g.lineTo(cx + R, cy);
  g.moveTo(cx, cy - R);
  g.lineTo(cx, cy + R);
  g.stroke();
  g.fillStyle = '#111';
  g.fillRect(cx - R * 0.8, cy + R * 0.25, R * 1.6, R * 0.38);
  g.fillStyle = '#fff';
  g.font = api.font(R * 0.24, 'VT323');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(p.station, cx, cy + R * 0.44);
  g.textAlign = 'left';
}

function onAir(api, g, s, x, y, w, h, u) {
  const { p, ease, prog, S } = api;
  g.fillStyle = p.screen;
  g.fillRect(x, y, w, h);
  const gr = g.createRadialGradient(x + w / 2, y + h * 0.4, 0, x + w / 2, y + h * 0.4, w);
  gr.addColorStop(0, 'rgba(120,140,255,0.35)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  g.font = api.font(s.size, 'Syne', 800);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = s.size * 1.05;
  const top = y + h / 2 - (s.lines.length * lh) / 2;
  s.lines.forEach((l, i) => {
    const e = ease.outExpo(prog(u, 0.1 + i * 0.18, 0.8 + i * 0.18));
    g.save();
    g.globalAlpha = e;
    g.translate(x + w / 2, top + (i + 0.5) * lh);
    g.scale(1, 0.2 + 0.8 * e);
    g.fillStyle = '#ff2d55';
    g.fillText(l, -6 * S, 0);
    g.fillStyle = '#29e1ff';
    g.fillText(l, 6 * S, 0);
    g.fillStyle = p.ink;
    g.fillText(l, 0, 0);
    g.restore();
  });
  // lower-third bug
  const lb = ease.outCubic(prog(u, 0.8, 1.3));
  g.fillStyle = '#ff3b30';
  g.fillRect(x + 50 * S, y + h - 130 * S, (w * 0.32) * lb, 60 * S);
  g.fillStyle = '#fff';
  g.font = api.font(48 * S, 'VT323');
  g.textAlign = 'left';
  g.globalAlpha = lb;
  g.fillText('LIVE', x + 70 * S, y + h - 100 * S);
  g.globalAlpha = 1;
}
