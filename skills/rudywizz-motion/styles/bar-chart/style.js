// bar-chart — a race-style horizontal bar chart: bars grow at their own pace,
// overtake each other (rows glide to their new rank), values count up and the
// axis rescales live, ending sorted. Data: items: [["Label", value], …].

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

function ellipsize(api, text, maxW) {
  const { ctx } = api;
  if (ctx.measureText(text).width <= maxW) return text;
  const g = api.graphemes(text);
  while (g.length > 1 && ctx.measureText(g.join('') + '…').width > maxW) g.pop();
  return g.join('') + '…';
}

const DEFAULT_ITEMS = [['İstanbul', 15.7], ['Ankara', 5.86], ['İzmir', 4.49], ['Bursa', 3.24], ['Antalya', 2.72], ['Konya', 2.32]];
const DEFAULT_NOTE = 'Population, millions (2024)';

function niceStep(range) {
  const raw = range / 4;
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}

export default {
  id: 'bar-chart',
  title: 'Bar Chart Race',
  tagline: 'Race-style bar chart: bars overtake, values count up, axis rescales',
  fonts: [['Bricolage Grotesque', 800], ['Bricolage Grotesque', 400], ['Space Grotesk', 700], ['Big Shoulders Display', 900]],
  defaults: {
    text: 'Largest cities in Türkiye',
    note: DEFAULT_NOTE,
    source: '',
    items: DEFAULT_ITEMS,
    unit: 'M',
    duration: 7,
    bg: '#0c0e14',
    ink: '#ffffff',
    colors: ['#ff3b5c', '#ff8a3d', '#ffd23f', '#3ddc97', '#3da5ff', '#9b5cff', '#ff5cc8', '#5cf2ff', '#c8ff5c', '#f0f0f0'],
  },
  options: {
    items: 'Data: [["Label", value], …] (max 10 rows)',
    unit: 'Suffix after each value (e.g. "M", "%", " km")',
    note: 'Small line under the title',
    source: 'Source credit at the bottom',
    colors: 'Bar colours, in item order (array of hex)',
    bg: 'Background colour',
    ink: 'Text colour',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    // the sample note only belongs to the sample data
    if (p.note === DEFAULT_NOTE && JSON.stringify(p.items) !== JSON.stringify(DEFAULT_ITEMS)) p.note = '';
    const items = (Array.isArray(p.items) ? p.items : [])
      .map((it) => (Array.isArray(it) ? { label: String(it[0]), value: Number(it[1]) } : { label: String(it.label ?? it.name ?? ''), value: Number(it.value) }))
      .filter((it) => Number.isFinite(it.value))
      .slice(0, 10);
    if (!items.length) items.push({ label: '—', value: 1 });
    const decimals = Math.min(2, Math.max(...items.map((it) => (String(it.value).split('.')[1] || '').length)));
    const vmax = Math.max(...items.map((it) => it.value), 1e-9);
    const r = api.rng(p.seed);
    items.forEach((it, i) => {
      it.color = p.colors[i % p.colors.length];
      it.exp = 0.55 + r() * 1.35;
      it.i = i;
    });
    const locale = p.lang === 'tr' ? 'tr-TR' : 'en-US';
    const fmt = (v) => v.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (p.unit ? (p.unit.startsWith(' ') || /^[%a-zA-Z]{1,2}$/.test(p.unit) ? '' : ' ') + p.unit : '');

    const marginX = W * 0.07;
    const portrait = H > W;
    const tf = fitText(api, api.splitLines(p.text), { family: 'Bricolage Grotesque', weight: 800, maxW: W - marginX * 2, maxH: H * (portrait ? 0.16 : 0.18), lh: 1.08, max: (portrait ? 92 : 72) * S, min: 30 * S });
    const titleTop = H * (portrait ? 0.1 : 0.07);
    const titleH = tf.lines.length * tf.size * 1.08;
    const noteSize = Math.max(18 * S, tf.size * 0.36);
    const chartTop = titleTop + titleH + (p.note ? noteSize * 1.6 : 0) + 70 * S;
    const chartBottom = H - (portrait ? 0.1 : 0.08) * H - (p.source ? 30 * S : 0);
    const rowH = (chartBottom - chartTop) / items.length;
    const barH = Math.min(rowH * 0.46, 92 * S);
    const labelSize = Math.min(rowH * 0.24, 40 * S);
    const rankW = 64 * S;
    const barX = marginX + rankW;
    ctx.font = api.font(labelSize * 1.05, 'Space Grotesk', 700);
    const valueW = Math.max(...items.map((it) => ctx.measureText(fmt(it.value)).width)) + 24 * S;
    const maxLen = W - marginX - barX - valueW;
    ctx.font = api.font(labelSize, 'Bricolage Grotesque', 800);
    items.forEach((it) => (it.shown = ellipsize(api, it.label, W - marginX - barX)));

    let back = null;
    if (!p.alpha) {
      back = api.offscreen(W, H);
      const g = back.getContext('2d');
      const lg = g.createLinearGradient(0, 0, 0, H);
      lg.addColorStop(0, api.mixHex(p.bg, '#ffffff', 0.05));
      lg.addColorStop(1, api.mixHex(p.bg, '#000000', 0.35));
      g.fillStyle = lg;
      g.fillRect(0, 0, W, H);
    }
    return { items, vmax, fmt, tf, titleTop, noteSize, chartTop, rowH, barH, labelSize, rankW, barX, maxLen, marginX, back };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, ease, prog } = api;
    api.bg(p.bg);
    if (s.back) ctx.drawImage(s.back, 0, 0);
    const D = p.duration;
    const g0 = 0.7;
    const G = Math.max(1, Math.min(3.2, D - 1.8));

    // title + note
    const ti = ease.outExpo(prog(t, 0.05, 0.8));
    ctx.save();
    ctx.globalAlpha = ti;
    ctx.translate(0, (1 - ti) * 30 * S);
    ctx.font = api.font(s.tf.size, 'Bricolage Grotesque', 800);
    ctx.fillStyle = p.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    s.tf.lines.forEach((l, i) => ctx.fillText(l, s.marginX, s.titleTop + i * s.tf.size * 1.08));
    if (p.note) {
      ctx.font = api.font(s.noteSize, 'Bricolage Grotesque', 400);
      ctx.fillStyle = api.rgba(p.ink, 0.6);
      ctx.fillText(p.note, s.marginX, s.titleTop + s.tf.lines.length * s.tf.size * 1.08 + s.noteSize * 0.5);
    }
    ctx.restore();

    const valAt = (it, tt) => it.value * Math.pow(ease.outCubic(prog(tt, g0, g0 + G)), it.exp);
    const rankAt = (tt) => {
      const order = [...s.items].sort((a, b) => valAt(b, tt) - valAt(a, tt) || a.i - b.i);
      const rk = {};
      order.forEach((it, k) => (rk[it.i] = k));
      return rk;
    };
    // smooth rank: average of recent ranks -> rows glide when they overtake
    const N = 12;
    const pos = {};
    for (let k = 0; k < N; k++) {
      const rk = rankAt(t - k * 0.025);
      for (const it of s.items) pos[it.i] = (pos[it.i] || 0) + rk[it.i] / N;
    }
    const cur = s.items.map((it) => valAt(it, t));
    const scale = Math.max(Math.max(...cur), s.vmax * 0.12);

    // grid
    const step = niceStep(scale);
    const gi = prog(t, 0.4, 0.9);
    ctx.font = api.font(18 * S, 'Space Grotesk', 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let v = 0; v <= scale * 1.0001; v += step) {
      const x = s.barX + (v / scale) * s.maxLen;
      ctx.fillStyle = api.rgba(p.ink, 0.08 * gi);
      ctx.fillRect(x, s.chartTop - 10 * S, 1.5 * S, s.rowH * s.items.length);
      ctx.fillStyle = api.rgba(p.ink, 0.4 * gi);
      ctx.fillText(s.fmt(v).replace(/[.,]0+(?=\D*$)/, ''), x, s.chartTop - 18 * S);
    }

    // rows
    for (const it of s.items) {
      const k = pos[it.i];
      const y = s.chartTop + k * s.rowH;
      const enter = ease.outExpo(prog(t, 0.25 + it.i * 0.06, 0.9 + it.i * 0.06));
      const v = valAt(it, t);
      const len = Math.max(s.barH * 0.2, (v / scale) * s.maxLen);
      ctx.save();
      ctx.globalAlpha = enter;
      ctx.translate((1 - enter) * -40 * S, 0);
      // rank
      ctx.font = api.font(s.labelSize * 1.5, 'Big Shoulders Display', 900);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = api.rgba(p.ink, k < 0.5 ? 0.95 : 0.35);
      ctx.fillText(String(Math.round(k) + 1), s.marginX, y + s.labelSize * 0.9 + s.barH * 0.5);
      // label
      ctx.font = api.font(s.labelSize, 'Bricolage Grotesque', 800);
      ctx.fillStyle = p.ink;
      ctx.fillText(it.shown, s.barX, y + s.labelSize * 0.5);
      // bar
      const by = y + s.labelSize * 0.9;
      const bg = ctx.createLinearGradient(s.barX, 0, s.barX + len, 0);
      bg.addColorStop(0, api.mixHex(it.color, '#000000', 0.25));
      bg.addColorStop(1, it.color);
      ctx.fillStyle = bg;
      if (k < 0.5) {
        ctx.shadowColor = it.color;
        ctx.shadowBlur = 30 * S;
      }
      api.roundRect(ctx, s.barX, by, len, s.barH, Math.min(s.barH / 2, 14 * S));
      ctx.fill();
      ctx.shadowBlur = 0;
      // gloss
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      api.roundRect(ctx, s.barX, by, len, s.barH * 0.42, Math.min(s.barH / 2, 14 * S));
      ctx.fill();
      // value
      ctx.font = api.font(s.labelSize * 1.05, 'Space Grotesk', 700);
      ctx.fillStyle = p.ink;
      ctx.fillText(s.fmt(v), s.barX + len + 14 * S, by + s.barH / 2);
      ctx.restore();
    }

    if (p.source) {
      ctx.font = api.font(20 * S, 'Bricolage Grotesque', 400);
      ctx.fillStyle = api.rgba(p.ink, 0.45);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.source, s.marginX, H - H * 0.05);
    }
  },
};
