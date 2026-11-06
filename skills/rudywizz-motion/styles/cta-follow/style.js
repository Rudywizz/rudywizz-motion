// cta-follow — a profile card pops in, a cursor glides to the button and
// clicks: the button squashes, flips to its "done" state with a check, and a
// burst of confetti + a '+1' fly out. Generic UI, no platform branding.
// Line 1 = handle, line 2 = button label (optional line 3 = subtitle).

function fitText(api, lines, { family, weight = 400, maxW, maxH = Infinity, lh = 1.1, max = 400, min = 12 }) {
  // largest size where the text fits; words wrap and over-long words hyphenate
  const { ctx } = api;
  const size = api.fitSize(ctx, lines, { family, weight, maxW, maxH, lineHeight: lh, max, min: 1 });
  if (size >= min) return { lines, size };
  const layout = (sz) => {
    ctx.font = api.font(sz, family, weight);
    const out = [];
    for (const l of lines) {
      for (const w of api.wrap(ctx, l, maxW)) {
        if (ctx.measureText(w).width <= maxW) {
          out.push(w);
          continue;
        }
        let cur = '';
        for (const g of api.graphemes(w)) {
          if (cur && ctx.measureText(cur + g + '-').width > maxW) {
            out.push(cur + '-');
            cur = g;
          } else cur += g;
        }
        if (cur) out.push(cur);
      }
    }
    return out;
  };
  for (let sz = max; sz > min; sz *= 0.93) {
    const out = layout(Math.floor(sz));
    if (out.length * Math.floor(sz) * lh <= maxH) return { lines: out, size: Math.floor(sz) };
  }
  return { lines: layout(min), size: min };
}

const THEMES = {
  dark: { bg0: '#0d0b1a', bg1: '#24124a', card: 'rgba(255,255,255,0.07)', cardLine: 'rgba(255,255,255,0.14)', ink: '#ffffff', muted: 'rgba(255,255,255,0.6)', done: 'rgba(255,255,255,0.10)', doneLine: 'rgba(255,255,255,0.35)', shadow: 'rgba(0,0,0,0.45)' },
  light: { bg0: '#f6f3ff', bg1: '#e3dcff', card: '#ffffff', cardLine: 'rgba(30,20,80,0.08)', ink: '#14112a', muted: 'rgba(20,17,42,0.55)', done: '#f1eef9', doneLine: 'rgba(20,17,42,0.25)', shadow: 'rgba(60,40,140,0.18)' },
};

export default {
  id: 'cta-follow',
  title: 'Follow CTA',
  tagline: 'A cursor clicks Follow: squash, check, confetti burst and a +1',
  fonts: [['Bricolage Grotesque', 800], ['Bricolage Grotesque', 400], ['Unbounded', 900]],
  defaults: {
    text: '@rudywizz / Follow / New videos every week',
    done: 'Following',
    duration: 5,
    theme: 'dark',
    accent: '#ff3b5c',
    accent2: '#7b5cff',
  },
  options: {
    done: 'Button label after the click',
    theme: 'dark | light',
    accent: 'Button + confetti colour',
    accent2: 'Second gradient colour (avatar ring, confetti)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const T = THEMES[p.theme] || THEMES.dark;
    const lines = api.splitLines(p.text);
    const handle = lines[0] || '@you';
    const btn = lines[1] || 'Follow';
    const sub = lines.slice(2).join(' ');
    const portrait = H > W * 1.2;
    const U = S * (portrait ? 1.55 : 1);
    const cardW = Math.min(W * 0.84, 860 * U);
    const inner = cardW - 100 * U;
    const hf = fitText(api, [handle], { family: 'Bricolage Grotesque', weight: 800, maxW: inner, maxH: 200 * U, lh: 1.1, max: 64 * U, min: 26 * U });
    const sf = sub ? fitText(api, [sub], { family: 'Bricolage Grotesque', weight: 400, maxW: inner, maxH: 140 * U, lh: 1.25, max: 34 * U, min: 18 * U }) : null;
    const btnW = Math.min(inner, 520 * U);
    const btnH = 104 * U;
    const labelMax = btnW - 130 * U;
    const bf = fitText(api, [btn], { family: 'Bricolage Grotesque', weight: 800, maxW: labelMax, maxH: btnH * 0.5, lh: 1, max: 42 * U, min: 16 * U });
    const df = fitText(api, [String(p.done || 'Following')], { family: 'Bricolage Grotesque', weight: 800, maxW: labelMax, maxH: btnH * 0.5, lh: 1, max: 42 * U, min: 16 * U });
    const avR = 92 * U;
    const handleH = hf.lines.length * hf.size * 1.1;
    const subH = sf ? sf.lines.length * sf.size * 1.25 : 0;
    const cardH = 70 * U + avR * 2 + 40 * U + handleH + (sf ? 16 * U + subH : 0) + 50 * U + btnH + 70 * U;
    const cardX = (W - cardW) / 2;
    const cardY = H * 0.47 - cardH / 2;
    const avY = cardY + 70 * U + avR;
    const handleY = avY + avR + 40 * U;
    const subY = handleY + handleH + 16 * U;
    const btnY = cardY + cardH - 70 * U - btnH;
    const btnX = W / 2 - btnW / 2;
    const initial = api.graphemes(api.upper(handle.replace(/^@/, ''), p.lang))[0] || '•';
    const r = api.rng(p.seed);
    const parts = Array.from({ length: 34 }, (_, i) => ({
      a: (i / 34) * Math.PI * 2 + r() * 0.3,
      v: (420 + r() * 700) * U,
      s: (8 + r() * 12) * U,
      spin: (r() - 0.5) * 14,
      c: [p.accent, p.accent2, '#ffd23f', '#3ddc97', '#ffffff'][i % 5],
      kind: i % 3,
    }));
    // timeline scales down for short durations
    const f = Math.max(0.55, Math.min(1, p.duration / 4.6));
    return { T, U, cardW, cardH, cardX, cardY, avR, avY, handleY, subY, btnX, btnY, btnW, btnH, hf, sf, bf, df, btn, initial, parts, f };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog } = api;
    const { T, U, f } = s;
    api.bg(p.alpha ? null : T.bg0);
    if (!p.alpha) {
      const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.hypot(W, H) * 0.6);
      g.addColorStop(0, T.bg1);
      g.addColorStop(1, T.bg0);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    const tCard = 0.0;
    const tMove0 = 0.7 * f;
    const tMove1 = 1.65 * f;
    const tDown = 1.72 * f;
    const tUp = 1.9 * f;
    const tExit = 2.5 * f;

    // card pop
    const pop = Math.min(1.04, api.spring(t - tCard, { freq: 1.8, damping: 0.55 }));
    if (pop <= 0.001) return;
    const cx = W / 2;
    const cy = s.cardY + s.cardH / 2;
    ctx.save();
    ctx.translate(cx, cy + (1 - Math.min(1, pop)) * 80 * U);
    ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = Math.min(1, t / 0.2);
    ctx.shadowColor = T.shadow;
    ctx.shadowBlur = 60 * U;
    ctx.shadowOffsetY = 20 * U;
    ctx.fillStyle = T.card;
    api.roundRect(ctx, s.cardX, s.cardY, s.cardW, s.cardH, 48 * U);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = T.cardLine;
    ctx.lineWidth = 2 * U;
    ctx.stroke();

    // avatar with rotating gradient ring
    const ring = ctx.createConicGradient ? ctx.createConicGradient(t * 1.5, cx, s.avY) : null;
    if (ring) {
      ring.addColorStop(0, p.accent);
      ring.addColorStop(0.5, p.accent2);
      ring.addColorStop(1, p.accent);
    }
    ctx.fillStyle = ring || p.accent;
    ctx.beginPath();
    ctx.arc(cx, s.avY, s.avR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.theme === 'light' ? '#ffffff' : '#120d24';
    ctx.beginPath();
    ctx.arc(cx, s.avY, s.avR - 9 * U, 0, Math.PI * 2);
    ctx.fill();
    const ig = ctx.createLinearGradient(cx - s.avR, s.avY - s.avR, cx + s.avR, s.avY + s.avR);
    ig.addColorStop(0, api.mixHex(p.accent2, '#ffffff', 0.2));
    ig.addColorStop(1, p.accent);
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(cx, s.avY, s.avR - 18 * U, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = api.font(s.avR * 0.85, 'Unbounded', 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.initial, cx, s.avY + 2 * U);

    // handle + subtitle
    ctx.fillStyle = T.ink;
    ctx.font = api.font(s.hf.size, 'Bricolage Grotesque', 800);
    ctx.textBaseline = 'top';
    s.hf.lines.forEach((l, i) => ctx.fillText(l, cx, s.handleY + i * s.hf.size * 1.1));
    if (s.sf) {
      ctx.fillStyle = T.muted;
      ctx.font = api.font(s.sf.size, 'Bricolage Grotesque', 400);
      s.sf.lines.forEach((l, i) => ctx.fillText(l, cx, s.subY + i * s.sf.size * 1.25));
    }

    // button
    const pressed = t >= tUp;
    const down = prog(t, tDown, tDown + 0.08) * (1 - prog(t, tUp, tUp + 0.05));
    const rebound = t >= tUp ? Math.min(1.05, api.spring(t - tUp, { freq: 2.6, damping: 0.4 })) : 1;
    const bsc = t < tUp ? 1 - 0.08 * down : 0.92 + 0.08 * rebound;
    const flip = ease.outCubic(prog(t, tUp, tUp + 0.25));
    const bx = s.btnX;
    const by = s.btnY;
    const bw = s.btnW;
    const bh = s.btnH;
    const bcx = bx + bw / 2;
    const bcy = by + bh / 2;
    ctx.save();
    ctx.translate(bcx, bcy);
    ctx.scale(bsc, bsc);
    ctx.translate(-bcx, -bcy);
    if (flip < 1) {
      ctx.globalAlpha = 1 - flip;
      const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      bg.addColorStop(0, p.accent);
      bg.addColorStop(1, api.mixHex(p.accent, p.accent2, 0.55));
      ctx.fillStyle = bg;
      ctx.shadowColor = api.rgba(p.accent, 0.5);
      ctx.shadowBlur = 30 * U;
      api.roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.font = api.font(s.bf.size, 'Bricolage Grotesque', 800);
      ctx.textBaseline = 'middle';
      const lw = ctx.measureText(s.bf.lines[0]).width;
      const pl = 30 * U;
      const x0 = bcx - (lw + pl + 18 * U) / 2;
      ctx.lineWidth = 6 * U;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x0, bcy);
      ctx.lineTo(x0 + pl, bcy);
      ctx.moveTo(x0 + pl / 2, bcy - pl / 2);
      ctx.lineTo(x0 + pl / 2, bcy + pl / 2);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillText(s.bf.lines[0], x0 + pl + 18 * U, bcy + 2 * U);
    }
    if (flip > 0) {
      ctx.globalAlpha = flip;
      ctx.fillStyle = T.done;
      api.roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fill();
      ctx.strokeStyle = T.doneLine;
      ctx.lineWidth = 2.5 * U;
      ctx.stroke();
      ctx.font = api.font(s.df.size, 'Bricolage Grotesque', 800);
      ctx.textBaseline = 'middle';
      const lw = ctx.measureText(s.df.lines[0]).width;
      const ck = 30 * U;
      const x0 = bcx - (lw + ck + 18 * U) / 2;
      // check mark draws on
      const dr = ease.outCubic(prog(t, tUp + 0.05, tUp + 0.35));
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 7 * U;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pts = [[x0, bcy + 1 * U], [x0 + ck * 0.38, bcy + ck * 0.38], [x0 + ck, bcy - ck * 0.4]];
      const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      const L = (l1 + l2) * dr;
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      if (L <= l1) ctx.lineTo(pts[0][0] + ((pts[1][0] - pts[0][0]) * L) / l1, pts[0][1] + ((pts[1][1] - pts[0][1]) * L) / l1);
      else {
        ctx.lineTo(...pts[1]);
        const k = (L - l1) / l2;
        ctx.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * k, pts[1][1] + (pts[2][1] - pts[1][1]) * k);
      }
      ctx.stroke();
      ctx.fillStyle = T.ink;
      ctx.textAlign = 'left';
      ctx.fillText(s.df.lines[0], x0 + ck + 18 * U, bcy + 2 * U);
    }
    ctx.restore();
    ctx.restore();

    // shockwave + confetti + +1
    if (pressed) {
      const u = t - tUp;
      const sw = ease.outCubic(prog(u, 0, 0.6));
      if (sw < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - sw;
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 6 * U * (1 - sw) + 1;
        api.roundRect(ctx, bx - sw * 60 * U, by - sw * 60 * U, bw + sw * 120 * U, bh + sw * 120 * U, bh / 2 + sw * 60 * U);
        ctx.stroke();
        ctx.restore();
      }
      for (const pt of s.parts) {
        if (u > 1.6) break;
        const d = pt.v * (u - 0.35 * u * u);
        const x = bcx + Math.cos(pt.a) * (bw * 0.35 + d);
        const y = bcy + Math.sin(pt.a) * (bh * 0.5 + d * 0.8) + 600 * U * u * u;
        const al = 1 - prog(u, 0.7, 1.4);
        if (al <= 0) continue;
        ctx.save();
        ctx.globalAlpha = al;
        ctx.translate(x, y);
        ctx.rotate(pt.spin * u);
        ctx.fillStyle = pt.c;
        if (pt.kind === 0) ctx.fillRect(-pt.s / 2, -pt.s * 0.25, pt.s, pt.s * 0.5);
        else if (pt.kind === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, pt.s * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -pt.s * 0.5);
          ctx.lineTo(pt.s * 0.45, pt.s * 0.4);
          ctx.lineTo(-pt.s * 0.45, pt.s * 0.4);
          ctx.fill();
        }
        ctx.restore();
      }
      const pl = ease.outCubic(prog(u, 0.1, 1.1));
      const pa = 1 - prog(u, 0.9, 1.4);
      if (pa > 0) {
        ctx.globalAlpha = pa * Math.min(1, u / 0.15);
        ctx.font = api.font(54 * U, 'Unbounded', 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = p.accent;
        ctx.fillText('+1', Math.min(W - 50 * U, bx + bw + 20 * U), bcy - 20 * U - pl * 120 * U);
        ctx.globalAlpha = 1;
      }
    }

    // cursor
    const mv = ease.inOutCubic(prog(t, tMove0, tMove1));
    const ex = ease.inOutCubic(prog(t, tExit, tExit + 0.9));
    if (t >= tMove0 && ex < 1) {
      const sx = W * 1.05;
      const sy = H * 0.95;
      const tx = bcx + bw * 0.18;
      const ty = bcy + bh * 0.12;
      // gentle arc
      let x = sx + (tx - sx) * mv;
      let y = sy + (ty - sy) * mv - Math.sin(mv * Math.PI) * H * 0.08;
      x += ex * W * 0.18;
      y += ex * H * 0.12;
      const csc = 1 - 0.14 * down;
      // click ripple
      if (t >= tDown && t < tDown + 0.5) {
        const rr = ease.outCubic(prog(t, tDown, tDown + 0.5));
        ctx.strokeStyle = api.rgba('#ffffff', 0.8 * (1 - rr));
        ctx.lineWidth = 4 * U;
        ctx.beginPath();
        ctx.arc(tx, ty, 14 * U + rr * 50 * U, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.save();
      ctx.globalAlpha = 1 - ex;
      ctx.translate(x, y);
      ctx.scale(csc * 1.6 * U, csc * 1.6 * U);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 46);
      ctx.lineTo(11, 35);
      ctx.lineTo(19, 53);
      ctx.lineTo(27, 49);
      ctx.lineTo(19, 32);
      ctx.lineTo(34, 32);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }
  },
};
