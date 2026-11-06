// word-stack — a justified poster stack: every line is scaled to span the full
// width, rows slam in one per beat on alternating sides, with inverse and
// accent bands. Long words are split across rows so nothing leaves the frame.

const FAM = 'Big Shoulders Display';
const WT = 900;

export default {
  id: 'word-stack',
  title: 'Word Stack',
  tagline: 'Justified poster stack: each line slams in at full width',
  fonts: [[FAM, 900], ['Space Grotesk', 700]],
  defaults: {
    text: 'Make / every / frame / count',
    duration: 5,
    bg: '#efece4',
    ink: '#111111',
    accent: '#ff4a1c',
    beat: 0.28,
    kicker: '',
  },
  options: {
    bg: 'Background colour',
    ink: 'Text / band colour',
    accent: 'Accent band colour',
    beat: 'Seconds between rows (e.g. 60/bpm)',
    kicker: 'Small caption above the stack (optional)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    let lines = api.splitLines(api.upper(p.text, p.lang));
    if (lines.length === 1 && api.words(lines[0]).length > 1) lines = api.words(lines[0]);
    if (!lines.length) lines = ['—'];
    const maxW = W * 0.88;
    const maxH = H * (p.kicker ? 0.72 : 0.8);
    const sizeFor = (l) => {
      ctx.font = api.font(100, FAM, WT);
      return Math.min((maxW / Math.max(1, ctx.measureText(l).width)) * 100, H * 0.34, W * 0.9);
    };
    // split rows that would be too small (very long words) into hyphenated halves
    for (let guard = 0; guard < 12 && lines.length < 9; guard++) {
      const i = lines.findIndex((l) => sizeFor(l) < W * 0.13 && api.graphemes(l).length > 5);
      if (i < 0) break;
      const l = lines[i];
      const ws = api.words(l);
      let a;
      let b;
      if (ws.length > 1) {
        const m = Math.ceil(ws.length / 2);
        a = ws.slice(0, m).join(' ');
        b = ws.slice(m).join(' ');
      } else {
        const g = api.graphemes(l);
        const m = Math.ceil(g.length / 2);
        a = g.slice(0, m).join('') + '-';
        b = g.slice(m).join('');
      }
      lines.splice(i, 1, a, b);
    }
    lines = lines.slice(0, 9);

    const measure = (l, size) => {
      ctx.font = api.font(size, FAM, WT);
      const m = ctx.measureText(l);
      const ref = ctx.measureText('HÉÇ');
      const asc = Math.max(m.actualBoundingBoxAscent, ref.actualBoundingBoxAscent * 0.86);
      const desc = Math.max(m.actualBoundingBoxDescent, size * 0.02);
      const pad = size * 0.075;
      return { asc, desc, pad, band: asc + desc + pad * 2 };
    };
    const gap = 8 * S;
    let rows = lines.map((l) => ({ l, size: sizeFor(l) }));
    let total = rows.reduce((a, r) => a + measure(r.l, r.size).band, 0) + gap * (rows.length - 1);
    if (total > maxH) {
      const k = maxH / total;
      rows = rows.map((r) => ({ ...r, size: r.size * k }));
      total = rows.reduce((a, r) => a + measure(r.l, r.size).band, 0) + gap * (rows.length - 1);
    }
    let y = (H - total) / 2 + (p.kicker ? H * 0.03 : 0);
    rows = rows.map((r, i) => {
      const m = measure(r.l, r.size);
      const row = { ...r, ...m, y, base: y + m.pad + m.asc, mode: i % 3, i };
      y += m.band + gap;
      return row;
    });
    return { rows, top: rows[0].y, bottom: y - gap };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, ease, prog, clamp } = api;
    api.bg(p.bg);
    // impact shake from the most recent slam
    let shake = 0;
    for (const r of s.rows) {
      const u = t - (0.2 + r.i * p.beat);
      if (u > 0 && u < 0.35) shake += Math.exp(-u * 16);
    }
    const f = api.frameOf(t);
    const sx = (api.hash(f, 1) - 0.5) * 14 * S * Math.min(1, shake);
    const sy = (api.hash(f, 2) - 0.5) * 14 * S * Math.min(1, shake);
    ctx.translate(sx, sy);

    if (p.kicker) {
      const kt = ease.outCubic(prog(t, 0, 0.5));
      ctx.globalAlpha = kt;
      ctx.font = api.font(26 * S, 'Space Grotesk', 700);
      ctx.fillStyle = p.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(api.upper(p.kicker, p.lang), W / 2, s.top - 22 * S);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const r of s.rows) {
      const t0 = 0.2 + r.i * p.beat;
      const dir = r.i % 2 ? 1 : -1;
      // band wipe
      if (r.mode > 0) {
        const e = ease.outExpo(prog(t, t0 - 0.1, t0 + 0.28));
        if (e > 0) {
          ctx.fillStyle = r.mode === 1 ? p.ink : p.accent;
          const bw = W * 1.1 * e;
          ctx.fillRect(dir < 0 ? -W * 0.05 : W * 1.05 - bw, r.y, bw, r.band);
        }
      }
      if (t < t0) continue;
      const sp = api.spring(t - t0, { freq: 2.6, damping: 0.5 });
      const sc = 1 + (1 - sp) * 1.1;
      ctx.save();
      ctx.globalAlpha = clamp((t - t0) * 9);
      ctx.translate(W / 2 + dir * (1 - sp) * W * 0.12, r.base - r.asc / 2);
      ctx.scale(sc, sc);
      ctx.font = api.font(r.size, FAM, WT);
      ctx.fillStyle = r.mode === 1 ? p.bg : p.ink;
      if (p.alpha && r.mode === 1) ctx.fillStyle = '#ffffff';
      ctx.fillText(r.l, 0, r.asc / 2);
      ctx.restore();
    }

    // thin rules frame the stack once everything has landed
    const last = 0.2 + (s.rows.length - 1) * p.beat;
    const re = ease.outExpo(prog(t, last + 0.15, last + 0.9));
    if (re > 0) {
      ctx.fillStyle = p.ink;
      const lw = W * 0.88 * re;
      ctx.fillRect(W / 2 - lw / 2, s.top - 10 * S, lw, 3 * S);
      ctx.fillRect(W / 2 - lw / 2, s.bottom + 7 * S, lw, 3 * S);
    }
  },
};
