// captions — short-form video captions: 1–3 word chunks spring in, the word
// being spoken sits on a coloured pill. Render with --alpha (.mov/.webm) to lay
// it over your own footage.

export default {
  id: 'captions',
  title: 'Captions',
  tagline: 'Reel-style captions, active word on a colour pill',
  fonts: [['Bricolage Grotesque', 800]],
  defaults: {
    text: 'Bu altyazılar tamamen kodla üretildi ve şeffaf arka planla dışa aktarılabilir',
    duration: 6,
    maxWords: 3,
    position: 0.68,
    ink: '#ffffff',
    pill: '#7c3aed',
    outline: '#000000',
    times: null,
  },
  options: {
    maxWords: 'Words per caption chunk (1–4)',
    position: 'Vertical position, 0 = top, 1 = bottom',
    pill: 'Highlight colour behind the active word',
    times: 'Optional array of start seconds per word (from your transcript)',
  },

  setup(api) {
    const { ctx, W, p } = api;
    const ws = api.words(api.upper(p.text, p.lang));
    const D = p.duration;
    let starts;
    if (Array.isArray(p.times) && p.times.length >= ws.length) starts = p.times.map(Number);
    else {
      const weight = ws.map((w) => 2 + w.length);
      const tot = weight.reduce((a, b) => a + b, 0);
      let acc = 0;
      starts = weight.map((w) => {
        const st = 0.2 + (acc / tot) * (D - 0.5);
        acc += w;
        return st;
      });
    }
    const per = Math.max(1, Math.min(4, p.maxWords | 0));
    const chunks = [];
    for (let i = 0; i < ws.length; ) {
      let j = i;
      let len = 0;
      while (j < ws.length && j - i < per && len + ws[j].length <= 16) len += ws[j++].length + 1;
      if (j === i) j++;
      chunks.push({ from: i, to: j, start: starts[i], end: j < ws.length ? starts[j] : D });
      i = j;
    }
    const size = Math.min(W * 0.11, api.fitSize(ctx, chunks.map((c) => ws.slice(c.from, c.to).join(' ')), { family: 'Bricolage Grotesque', weight: 800, maxW: W * 0.82, max: W * 0.11 }));
    return { ws, starts, chunks, size, grain: api.makeGrain(W, api.H, p.seed) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S } = api;
    if (!p.alpha) {
      // placeholder "footage": slow, blurry colour fields
      ctx.fillStyle = '#20232b';
      ctx.fillRect(0, 0, W, H);
      const blobs = [['#3d5a80', 0.3, 0.3], ['#ee6c4d', 0.75, 0.55], ['#98c1d9', 0.4, 0.85]];
      blobs.forEach(([c, x, y], i) => {
        const g = ctx.createRadialGradient(W * (x + 0.08 * Math.sin(t * 0.6 + i)), H * y, 0, W * x, H * y, W * 0.7);
        g.addColorStop(0, api.rgba(c, 0.7));
        g.addColorStop(1, api.rgba(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });
      s.grain(ctx, api.frameOf(t), 0.08);
    } else api.bg(null);

    const ch = s.chunks.findLast((c) => t >= c.start);
    if (!ch) return;
    const u = t - ch.start;
    const sp = api.spring(u, { freq: 3.2, damping: 0.5 });
    const size = s.size;
    ctx.font = api.font(size, 'Bricolage Grotesque', 800);
    ctx.textBaseline = 'middle';
    const words = s.ws.slice(ch.from, ch.to);
    const space = size * 0.32;
    const widths = words.map((w) => ctx.measureText(w).width);
    const totalW = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
    const y = H * p.position;
    let x = W / 2 - totalW / 2;
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(0.6 + 0.4 * sp, 0.6 + 0.4 * sp);
    ctx.translate(-W / 2, -y);
    ctx.globalAlpha = Math.min(1, u / 0.06);
    words.forEach((w, k) => {
      const wi = ch.from + k;
      const active = t >= s.starts[wi] && (wi + 1 >= s.starts.length || t < s.starts[wi + 1] || k === words.length - 1);
      const ww = widths[k];
      if (active) {
        const pp = api.spring(t - s.starts[wi], { freq: 4, damping: 0.55 });
        ctx.fillStyle = p.pill;
        api.roundRect(ctx, x - 18 * S, y - size * 0.62 * pp, ww + 36 * S, size * 1.24 * pp, 18 * S);
        ctx.fill();
      }
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.16;
      ctx.strokeStyle = p.outline;
      if (!active) ctx.strokeText(w, x, y + size * 0.04);
      ctx.fillStyle = p.ink;
      ctx.fillText(w, x, y + size * 0.04);
      x += ww + space;
    });
    ctx.restore();
  },
};
