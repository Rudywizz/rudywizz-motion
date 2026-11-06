// retro-grid — 80s synthwave night drive: a neon grid floor scrolls toward the
// camera under a striped sunset sun and layered mountain ridges. The title lands
// in chrome with a light sweep and a reflection on the floor; extra lines are
// written underneath in a glowing script.

const TITLE_FONT = 'Unbounded';
const SCRIPT_FONT = 'Caveat';

export default {
  id: 'retro-grid',
  title: 'Retro Grid',
  tagline: '80s synthwave: neon grid floor, striped sun, chrome title',
  fonts: [[TITLE_FONT, 900], [SCRIPT_FONT, 600]],
  defaults: {
    text: 'Night drive / side B',
    duration: 6,
    sky: ['#07021a', '#2b0b4f', '#ff3d8b'],
    sun: ['#ffe86b', '#ff7a59', '#ff2fa0'],
    grid: '#ff3df2',
    script: '#38f2ff',
    speed: 1,
  },
  options: {
    sky: 'Sky gradient top → horizon (array of 3 hex)',
    sun: 'Sun gradient top → bottom (array of 3 hex)',
    grid: 'Grid line colour',
    script: 'Colour of the script subtitle',
    speed: 'Grid scroll speed multiplier',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    let lines = api.splitLines(p.text);
    if (!lines.length) lines = [' '];
    const portrait = H > W;
    const horizon = H * (portrait ? 0.55 : 0.6);
    const title = api.upper(lines[0], p.lang);
    const sub = lines.slice(1).join(' ');

    // ---- title block (chrome), rendered once
    let tl = [title];
    let ts = api.fitSize(ctx, tl, { family: TITLE_FONT, weight: 900, maxW: W * 0.8, maxH: H * (portrait ? 0.12 : 0.2), max: W * 0.2, min: 2 });
    if (api.words(title).length > 1) {
      ctx.font = api.font(100, TITLE_FONT, 900);
      const cand = api.wrap(ctx, title, (ctx.measureText(title).width / 2) * 1.1);
      const s2 = api.fitSize(ctx, cand, { family: TITLE_FONT, weight: 900, maxW: W * 0.8, maxH: H * (portrait ? 0.2 : 0.3), lineHeight: 1.0, max: W * 0.2, min: 2 });
      if (s2 > ts * 1.25) {
        ts = s2;
        tl = cand;
      }
    } else if (ts < W * 0.06) {
      const g = api.graphemes(title);
      for (let n = 2; n <= 3 && ts < W * 0.06; n++) {
        const per = Math.ceil(g.length / n);
        const cand = Array.from({ length: n }, (_, i) => g.slice(i * per, (i + 1) * per).join('') + (i < n - 1 ? '-' : ''));
        const s2 = api.fitSize(ctx, cand, { family: TITLE_FONT, weight: 900, maxW: W * 0.8, maxH: H * 0.24, lineHeight: 1.0, max: W * 0.2, min: 2 });
        if (s2 > ts) {
          ts = s2;
          tl = cand;
        }
      }
    }
    const lh = ts * 1.0;
    const blockH = tl.length * lh;
    const pad = ts * 0.4;
    const tw = Math.ceil(W);
    const th = Math.ceil(blockH + pad * 2);
    const tc = api.offscreen(tw, th);
    const g = tc.getContext('2d');
    g.font = api.font(ts, TITLE_FONT, 900);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const rows = tl.map((l, i) => pad + (i + 0.5) * lh);
    const skew = -0.18;
    g.setTransform(1, 0, skew, 1, -skew * th * 0.5, 0);
    // dark outline + magenta glow
    g.lineJoin = 'round';
    g.shadowColor = p.grid;
    g.shadowBlur = 30 * S;
    g.strokeStyle = '#1a0630';
    g.lineWidth = ts * 0.12;
    tl.forEach((l, i) => g.strokeText(l, tw / 2, rows[i]));
    g.shadowBlur = 0;
    g.strokeStyle = api.mixHex(p.grid, '#ffffff', 0.4);
    g.lineWidth = ts * 0.035;
    tl.forEach((l, i) => g.strokeText(l, tw / 2, rows[i]));
    // chrome face per row: sky / hard horizon / ground
    tl.forEach((l, i) => {
      const y0 = rows[i] - ts * 0.42;
      const y1 = rows[i] + ts * 0.42;
      const cg = g.createLinearGradient(0, y0, 0, y1);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.3, '#8fd9ff');
      cg.addColorStop(0.5, '#e9f8ff');
      cg.addColorStop(0.52, '#2a0f55');
      cg.addColorStop(0.7, '#a2489f');
      cg.addColorStop(0.95, '#ffd1f0');
      g.fillStyle = cg;
      g.fillText(l, tw / 2, rows[i]);
    });
    g.setTransform(1, 0, 0, 1, 0, 0);
    // reflection: flipped + faded, built once
    const rc = api.offscreen(tw, th);
    const r = rc.getContext('2d');
    r.translate(0, th);
    r.scale(1, -1);
    r.drawImage(tc, 0, 0);
    r.setTransform(1, 0, 0, 1, 0, 0);
    r.globalCompositeOperation = 'destination-in';
    const rg = r.createLinearGradient(0, 0, 0, th);
    rg.addColorStop(0, 'rgba(0,0,0,0.45)');
    rg.addColorStop(0.7, 'rgba(0,0,0,0)');
    r.fillStyle = rg;
    r.fillRect(0, 0, tw, th);

    // ---- script subtitle
    let ss = 0;
    if (sub) ss = api.fitSize(ctx, [sub], { family: SCRIPT_FONT, weight: 600, maxW: W * 0.7, maxH: H * 0.08, max: ts * 0.75, min: 2 });

    // ---- sun (striped, with gaps cut out of its lower half)
    const sunR = Math.min(W, H) * (portrait ? 0.34 : 0.3);
    const sunC = api.offscreen(sunR * 2 + 4, sunR * 2 + 4);
    const sg = sunC.getContext('2d');
    const sgr = sg.createLinearGradient(0, 0, 0, sunR * 2);
    sgr.addColorStop(0, p.sun[0]);
    sgr.addColorStop(0.55, p.sun[1]);
    sgr.addColorStop(1, p.sun[2]);
    sg.fillStyle = sgr;
    sg.beginPath();
    sg.arc(sunR + 2, sunR + 2, sunR, 0, Math.PI * 2);
    sg.fill();

    // ---- mountains: two ridges from value noise
    const ridge = (seed, base, amp, rough) => {
      const pts = [];
      const n = 90;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * W;
        const u = i / n;
        let h = 0;
        h += api.noise1(u * 4 * rough, seed) * 0.6;
        h += api.noise1(u * 11 * rough, seed + 7) * 0.3;
        h += api.noise1(u * 27 * rough, seed + 13) * 0.1;
        // keep the middle low so the sun shows through
        const mid = 1 - 0.75 * Math.exp(-Math.pow((u - 0.5) / 0.18, 2));
        pts.push([x, base - h * amp * mid]);
      }
      return pts;
    };
    const back = ridge(p.seed + 3, horizon, H * 0.12, 1);
    const front = ridge(p.seed + 9, horizon, H * 0.07, 1.6);
    const r0 = api.rng(p.seed);
    const stars = Array.from({ length: 140 }, () => ({ x: r0() * W, y: r0() * horizon * 0.8, s: 0.5 + r0() * 1.6, ph: r0() * 6 }));
    return { horizon, tc, rc, tw, th, sub, ss, ts, blockH, sunC, sunR, back, front, stars };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, prog, ease, clamp } = api;
    const hz = s.horizon;
    const D = p.duration;
    if (!p.alpha) {
      const sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, p.sky[0]);
      sky.addColorStop(0.6, p.sky[1]);
      sky.addColorStop(1, p.sky[2]);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hz + 1);
      for (const st of s.stars) {
        const tw = 0.45 + 0.55 * Math.sin(t * 2 + st.ph);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.6 * tw * (1 - st.y / hz)})`;
        ctx.fillRect(st.x, st.y, st.s * S * 2, st.s * S * 2);
      }
    } else api.bg(null);

    // sun: rises, stripes drift upward
    const rise = ease.outCubic(prog(t, 0, 1.8));
    const sunY = hz - s.sunR * 0.72 + (1 - rise) * s.sunR * 1.1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, hz);
    ctx.clip();
    if (!p.alpha) {
      const glow = ctx.createRadialGradient(W / 2, sunY, s.sunR * 0.6, W / 2, sunY, s.sunR * 2.2);
      glow.addColorStop(0, api.rgba(p.sun[2], 0.35));
      glow.addColorStop(1, api.rgba(p.sun[2], 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, hz);
    }
    ctx.drawImage(s.sunC, W / 2 - s.sunR - 2, sunY - s.sunR - 2);
    // stripe gaps (punched through to the sky colour)
    const gaps = 9;
    const flow = (t * 0.35 * p.speed) % 1;
    for (let k = 0; k < gaps; k++) {
      const u = (k + flow) / gaps; // 0 = just above centre, 1 = bottom
      const y = sunY - s.sunR * 0.12 + u * s.sunR * 1.1;
      const hgt = (2 + u * 22) * S;
      ctx.fillStyle = p.alpha ? 'rgba(0,0,0,1)' : api.mixHex(p.sky[1], p.sky[2], 0.35);
      if (p.alpha) ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(W / 2 - s.sunR, y, s.sunR * 2, hgt);
      ctx.globalCompositeOperation = 'source-over';
    }
    // mountains
    const drawRidge = (pts, fill, stroke) => {
      ctx.beginPath();
      ctx.moveTo(0, hz);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(W, hz);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5 * S;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    };
    drawRidge(s.back, '#1d0838', api.rgba(p.grid, 0.35));
    drawRidge(s.front, '#0d0420', api.rgba(p.grid, 0.8));
    ctx.restore();

    // floor
    if (!p.alpha) {
      const fl = ctx.createLinearGradient(0, hz, 0, H);
      fl.addColorStop(0, '#1a0536');
      fl.addColorStop(1, '#05010d');
      ctx.fillStyle = fl;
      ctx.fillRect(0, hz, W, H - hz);
    }
    const camH = 1;
    const f = (H - hz) * 0.9; // y = hz + f*camH/z
    const zNear = f * camH / (H - hz);
    const scroll = (t * 2.2 * p.speed) % 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, hz, W, H - hz);
    ctx.clip();
    ctx.lineCap = 'round';
    const lines = [];
    for (let k = 0; k < 40; k++) {
      const z = zNear + k - scroll;
      if (z < zNear * 0.98) continue;
      const y = hz + (f * camH) / z;
      if (y - hz < 1.5 * S) break;
      lines.push([y, z]);
    }
    const strokeGlow = (draw, w, a) => {
      ctx.strokeStyle = api.rgba(p.grid, a * 0.25);
      ctx.lineWidth = w * 4;
      draw();
      ctx.strokeStyle = api.rgba(p.grid, a);
      ctx.lineWidth = w;
      draw();
    };
    for (const [y, z] of lines) {
      const a = clamp(1 - z / 30) * 0.95;
      strokeGlow(() => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }, Math.max(1, 3 * S * clamp(4 / z, 0.3, 1)), a);
    }
    const cols = 22;
    const spacing = Math.max(W, H) * 0.11;
    for (let i = -cols; i <= cols; i++) {
      // every column runs from the vanishing point to the bottom edge
      const xb = W / 2 + i * spacing;
      strokeGlow(() => {
        ctx.beginPath();
        ctx.moveTo(W / 2, hz);
        ctx.lineTo(xb, H);
        ctx.stroke();
      }, 2.2 * S, 0.8);
    }
    // horizon haze
    const hzg = ctx.createLinearGradient(0, hz, 0, hz + (H - hz) * 0.35);
    hzg.addColorStop(0, api.rgba(p.sky[2], 0.55));
    hzg.addColorStop(1, api.rgba(p.sky[2], 0));
    ctx.fillStyle = hzg;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.restore();
    // horizon line
    ctx.fillStyle = api.rgba('#ffffff', 0.85);
    ctx.fillRect(0, hz - 1 * S, W, 2 * S);

    // ---- title: slams in from big + flash, then a light sweep
    const tIn = prog(t, 0.5, 1.3);
    const k = 1 + 0.9 * (1 - ease.outExpo(tIn));
    const a = clamp(tIn * 3);
    const ty = hz - s.sunR * 0.55 - s.th / 2 + (H > W ? -s.ts * 0.2 : 0);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, ty + s.th / 2);
      ctx.scale(k, k);
      ctx.drawImage(s.tc, -s.tw / 2, -s.th / 2);
      ctx.restore();
      // reflection on the floor
      ctx.save();
      ctx.globalAlpha = a * 0.8;
      ctx.beginPath();
      ctx.rect(0, hz, W, H - hz);
      ctx.clip();
      const ry = hz + (hz - (ty + s.th)) * 0.4;
      ctx.drawImage(s.rc, 0, ry, s.tw, s.th * 0.75);
      ctx.restore();
      // sweep: a bright diagonal band, only over the title's pixels
      const sw = prog(t, 1.4, 2.6);
      if (sw > 0 && sw < 1) {
        const tmp = api.offscreen(s.tw, s.th);
        const g = tmp.getContext('2d');
        g.drawImage(s.tc, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        const bx = -s.tw * 0.3 + sw * s.tw * 1.6;
        const bg = g.createLinearGradient(bx - s.th, 0, bx + s.th, s.th);
        bg.addColorStop(0, 'rgba(255,255,255,0)');
        bg.addColorStop(0.5, 'rgba(255,255,255,0.85)');
        bg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = bg;
        g.fillRect(0, 0, s.tw, s.th);
        ctx.drawImage(tmp, 0, ty);
      }
      // flash on landing
      const fl = 1 - prog(t, 1.25, 1.6);
      if (tIn >= 1 && fl > 0 && !p.alpha) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 * fl})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    // ---- script subtitle: wipes on left to right
    if (s.sub) {
      const w = prog(t, 1.6, 2.8);
      if (w > 0) {
        const sy = ty + s.th - s.ts * 0.15;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, sy - s.ss, W * (0.12 + 0.88 * ease.outCubic(w)), s.ss * 2);
        ctx.clip();
        ctx.translate(W / 2, sy);
        ctx.rotate(-0.07);
        ctx.font = api.font(s.ss, SCRIPT_FONT, 600);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = p.script;
        ctx.shadowBlur = 24 * S;
        ctx.fillStyle = api.mixHex(p.script, '#ffffff', 0.55);
        ctx.fillText(s.sub, 0, 0);
        ctx.shadowBlur = 8 * S;
        ctx.fillText(s.sub, 0, 0);
        ctx.restore();
      }
    }
    if (!p.alpha) {
      api.scanlines(ctx, W, H, { gap: 4 * S, alpha: 0.08 });
      api.vignette(ctx, W, H, 0.5);
    }
    void D;
  },
};
