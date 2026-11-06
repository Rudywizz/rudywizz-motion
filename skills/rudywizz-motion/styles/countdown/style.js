// countdown — a punchy 3·2·1: every number slams in while a ring sweeps
// around it like a film leader, the frame flashes on each tick, then the
// ring collapses and your words land line by line.

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

export default {
  id: 'countdown',
  title: 'Countdown',
  tagline: 'Punchy 3·2·1 with a sweeping ring, then your words land',
  fonts: [['Big Shoulders Display', 900], ['Unbounded', 900], ['JetBrains Mono', 700]],
  defaults: {
    text: 'Here / we go',
    duration: 5,
    from: 3,
    tick: 0.8,
    bg: '#0b0b12',
    ink: '#ffffff',
    accent: '#ff3b5c',
  },
  options: {
    from: 'Number to count down from (1–9)',
    tick: 'Seconds per number',
    accent: 'Ring, flash and underline colour',
    ink: 'Number and text colour',
    bg: 'Background colour',
  },

  setup(api) {
    const { W, H, p, S } = api;
    const from = Math.max(1, Math.min(9, Math.round(Number(p.from) || 3)));
    const tick = Math.max(0.3, Math.min(Number(p.tick) || 0.8, (p.duration - 1.3) / from));
    const start = 0.15;
    const end = start + from * tick;
    const R = Math.min(W, H) * 0.3;
    const lines0 = api.splitLines(api.upper(p.text, p.lang));
    const fit = fitText(api, lines0.length ? lines0 : [' '], {
      family: 'Unbounded', weight: 900, maxW: W * 0.84, maxH: H * 0.34, lh: 1.1, max: Math.min(W, H) * 0.19, min: 30 * S,
    });

    let back = null;
    if (!p.alpha) {
      back = api.offscreen(W, H);
      const g = back.getContext('2d');
      const rg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * 0.55);
      rg.addColorStop(0, api.mixHex(p.bg, '#ffffff', 0.08));
      rg.addColorStop(1, api.mixHex(p.bg, '#000000', 0.5));
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
      // leader guides: crosshair + concentric rings
      g.strokeStyle = api.rgba(p.ink, 0.07);
      g.lineWidth = 2 * S;
      g.beginPath();
      g.moveTo(0, H / 2);
      g.lineTo(W, H / 2);
      g.moveTo(W / 2, 0);
      g.lineTo(W / 2, H);
      g.stroke();
      for (let k = 1; k <= 4; k++) {
        g.beginPath();
        g.arc(W / 2, H / 2, R * (0.55 + k * 0.32), 0, Math.PI * 2);
        g.stroke();
      }
      // corner registration marks
      g.strokeStyle = api.rgba(p.ink, 0.18);
      const m = 50 * S;
      const L = 46 * S;
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
        g.beginPath();
        g.moveTo(x, y + sy * L);
        g.lineTo(x, y);
        g.lineTo(x + sx * L, y);
        g.stroke();
      }
    }
    return { from, tick, start, end, R, lines: fit.lines, size: fit.size, back };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, ease, prog } = api;
    api.bg(p.bg);
    if (s.back) ctx.drawImage(s.back, 0, 0);
    const cx = W / 2;
    const cy = H / 2;
    const R = s.R;

    if (t < s.end) {
      const raw = (t - s.start) / s.tick;
      const k = Math.max(0, Math.min(s.from - 1, Math.floor(raw)));
      const u = t < s.start ? 0 : raw - k;
      const n = s.from - k;
      const intro = ease.outExpo(prog(t, 0, s.start + 0.25));

      // flash on every tick
      if (!p.alpha && t >= s.start && u < 0.14) {
        ctx.fillStyle = api.rgba(p.accent, 0.22 * (1 - u / 0.14));
        ctx.fillRect(0, 0, W, H);
      }
      const a0 = -Math.PI / 2;
      const sweep = a0 + Math.PI * 2 * ease.inOutSine(u);
      // radar wedge
      ctx.fillStyle = api.rgba(p.accent, 0.1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R * 0.98 * intro, a0, sweep);
      ctx.closePath();
      ctx.fill();
      // track
      ctx.lineWidth = 6 * S;
      ctx.strokeStyle = api.rgba(p.ink, 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy, R * intro, 0, Math.PI * 2);
      ctx.stroke();
      // tick marks
      for (let i = 0; i < 60; i++) {
        const a = a0 + (i / 60) * Math.PI * 2;
        const passed = a <= sweep;
        const r1 = R * 1.07 * intro;
        const r2 = R * (i % 5 === 0 ? 1.15 : 1.11) * intro;
        ctx.strokeStyle = passed ? api.rgba(p.accent, 0.95) : api.rgba(p.ink, 0.22);
        ctx.lineWidth = (i % 5 === 0 ? 4 : 2) * S;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }
      // sweep arc
      if (u > 0.001) {
        ctx.save();
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 30 * S;
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 14 * S;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, sweep);
        ctx.stroke();
        ctx.restore();
        // leading dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R, 9 * S, 0, Math.PI * 2);
        ctx.fill();
      }
      // the number
      if (t >= s.start - 0.05) {
        let sc = 1.55 - 0.55 * ease.outBack(prog(u, 0, 0.32));
        let alpha = Math.min(1, prog(u, 0, 0.06) * 1.0 + (t < s.start ? 0 : 1));
        if (u > 0.84) {
          const o = prog(u, 0.84, 1);
          sc *= 1 + 0.25 * o;
          alpha *= 1 - o;
        }
        const size = R * 1.3;
        ctx.font = api.font(size, 'Big Shoulders Display', 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const str = String(n);
        const m = ctx.measureText(str);
        const yOff = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(sc, sc);
        const split = 10 * S * Math.exp(-u * 9);
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = p.accent;
        ctx.fillText(str, -split, yOff);
        ctx.fillStyle = '#31e7ff';
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillText(str, split, yOff);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.ink;
        ctx.fillText(str, 0, yOff);
        ctx.restore();
      }
      // frame counter
      ctx.font = api.font(22 * S, 'JetBrains Mono', 700);
      ctx.fillStyle = api.rgba(p.ink, 0.45);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`00:00:0${n}:${String(Math.floor(u * 24)).padStart(2, '0')}`, cx, cy + R * 1.38);
      return;
    }

    // ---- reveal
    const v = t - s.end;
    const col = 1 - ease.outExpo(prog(v, 0, 0.45));
    if (col > 0.01) {
      ctx.save();
      ctx.globalAlpha = col;
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 14 * S * col;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (0.2 + 0.8 * col) + R * 0.6 * (1 - col), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (!p.alpha && v < 0.18) {
      ctx.fillStyle = api.rgba(p.accent, 0.3 * (1 - v / 0.18));
      ctx.fillRect(0, 0, W, H);
    }
    const lh = s.size * 1.1;
    const top = cy - (s.lines.length * lh) / 2;
    const settle = 1.06 - 0.06 * ease.outCubic(prog(v, 0, 1.2));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(settle, settle);
    ctx.translate(-cx, -cy);
    ctx.font = api.font(s.size, 'Unbounded', 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let widest = 0;
    s.lines.forEach((line, i) => {
      const e = ease.outExpo(prog(v, 0.05 + i * 0.09, 0.75 + i * 0.09));
      const y = top + (i + 0.5) * lh;
      widest = Math.max(widest, ctx.measureText(line).width);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y - lh * 0.56, W, lh * 1.12);
      ctx.clip();
      ctx.fillStyle = p.ink;
      ctx.fillText(line, cx, y + (1 - e) * lh);
      ctx.restore();
    });
    const ue = ease.outExpo(prog(v, 0.35 + s.lines.length * 0.09, 1.2 + s.lines.length * 0.09));
    const uw = Math.min(widest, W * 0.84) * 0.5 * ue;
    ctx.fillStyle = p.accent;
    ctx.fillRect(cx - uw, top + s.lines.length * lh + 18 * S, uw * 2, 12 * S);
    ctx.restore();
  },
};
