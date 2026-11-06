// highlight-quote — an editorial quote card: the quote fades in word by word,
// then a marker sweeps behind the key words; author line underneath.

const BODY = 'Instrument Serif';
const META = 'Space Grotesk';

const norm = (w, lang) => api_lower(w, lang).replace(/[^\p{L}\p{N}]/gu, '');
function api_lower(s, lang) {
  return lang ? s.toLocaleLowerCase(lang) : s.toLocaleLowerCase('tr');
}

export default {
  id: 'highlight-quote',
  title: 'Highlight Quote',
  tagline: 'Editorial quote fades in word by word, a marker sweeps the key words',
  fonts: [[BODY, 400], ['Fraunces', 900], [META, 700]],
  defaults: {
    text: 'Make it simple, / then make it move.',
    duration: 6,
    author: 'rudywizz-motion',
    highlight: null,
    paper: '#f3eee4',
    ink: '#1d1b18',
    marker: '#ffd23f',
    accent: '#e2552f',
    pace: 0.12,
  },
  options: {
    author: 'Author / source line (empty to hide)',
    highlight: 'Words to highlight (array). Default: the last line',
    paper: 'Background colour',
    ink: 'Text colour',
    marker: 'Highlighter colour',
    accent: 'Quote mark colour',
    pace: 'Seconds between words',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const paras = api.splitLines(p.text);
    const land = W > H;
    const maxW = W * (land ? 0.66 : 0.8);
    const maxH = H * (land ? 0.5 : 0.46);
    const lhK = 1.12;

    const layout = (size) => {
      ctx.font = api.font(size, BODY, 400);
      const space = ctx.measureText(' ').width;
      const lines = [];
      paras.forEach((para, pi) => {
        let cur = [];
        let w = 0;
        for (let word of api.words(para)) {
          const pieces = [];
          while (ctx.measureText(word).width > maxW) {
            const g = api.graphemes(word);
            let k = 1;
            while (k < g.length && ctx.measureText(g.slice(0, k + 1).join('') + '-').width <= maxW) k++;
            pieces.push(g.slice(0, k).join('') + '-');
            word = g.slice(k).join('');
          }
          pieces.push(word);
          for (const piece of pieces) {
            const ww = ctx.measureText(piece).width;
            if (cur.length && w + space + ww > maxW) {
              lines.push(cur);
              cur = [];
              w = 0;
            }
            cur.push({ s: piece, w: ww, x: cur.length ? w + space : 0, pi, src: para });
            w = cur.length > 1 ? w + space + ww : ww;
          }
        }
        if (cur.length) lines.push(cur);
      });
      return { lines, space };
    };
    let size = Math.min(W * 0.12, H * 0.085);
    let lay = layout(size);
    for (let k = 0; k < 40 && lay.lines.length * size * lhK > maxH; k++) {
      size *= 0.93;
      lay = layout(size);
    }
    const lh = size * lhK;
    const blockW = Math.max(...lay.lines.map((l) => l[l.length - 1].x + l[l.length - 1].w));
    const x0 = (W - blockW) / 2;
    const y0 = H * 0.5 - (lay.lines.length * lh) / 2 + size * 0.78;

    // which words get the marker
    const lang = p.lang;
    let keys;
    if (Array.isArray(p.highlight) && p.highlight.length) keys = new Set(p.highlight.flatMap((w) => api.words(String(w))).map((w) => norm(w, lang)));
    else if (paras.length > 1) keys = new Set(api.words(paras[paras.length - 1]).map((w) => norm(w, lang)));
    else {
      const ws = api.words(paras[0] || '');
      keys = new Set(ws.slice(-2).map((w) => norm(w, lang)));
    }
    const words = [];
    lay.lines.forEach((l, li) => {
      for (const w of l) {
        const isLastPara = !Array.isArray(p.highlight) && paras.length > 1 ? w.pi === paras.length - 1 : true;
        words.push({ ...w, x: x0 + w.x, y: y0 + li * lh, li, hl: isLastPara && keys.has(norm(w.s, lang)) });
      }
    });
    const pace = Math.min(p.pace, (p.duration * 0.42) / Math.max(1, words.length));
    words.forEach((w, i) => (w.t = 0.35 + i * pace));
    // merge contiguous highlighted words on the same line into marker segments
    const segs = [];
    for (const w of words) {
      const prev = segs[segs.length - 1];
      if (!w.hl) continue;
      if (prev && prev.li === w.li && prev.lastIdx === words.indexOf(w) - 1) {
        prev.x1 = w.x + w.w;
        prev.lastIdx = words.indexOf(w);
      } else segs.push({ li: w.li, y: w.y, x0: w.x, x1: w.x + w.w, lastIdx: words.indexOf(w) });
    }
    let tc = (words.length ? words[words.length - 1].t : 0.4) + 0.45;
    const speed = W * 1.6;
    for (const sg of segs) {
      sg.t0 = tc;
      sg.t1 = tc + Math.max(0.18, (sg.x1 - sg.x0 + size * 0.2) / speed);
      tc = sg.t1 + 0.04;
    }
    // paper
    let tex = null;
    if (!p.alpha) {
      tex = api.offscreen(W, H);
      const g = tex.getContext('2d');
      const r = api.rng(p.seed + 2);
      g.fillStyle = p.paper;
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 1800; i++) {
        g.fillStyle = `rgba(90,70,40,${r() * 0.05})`;
        g.fillRect(r() * W, r() * H, 1 + r() * 2 * S, 1 + r() * 2 * S);
      }
      api.vignette(g, W, H, 0.18, '80,60,30');
    }
    return { words, segs, size, lh, x0, y0, blockW, lines: lay.lines.length, tex, authorT: tc };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, ease, prog } = api;
    api.bg(p.paper);
    if (s.tex) ctx.drawImage(s.tex, 0, 0);
    const size = s.size;

    // big quote mark
    const qe = ease.outCubic(prog(t, 0.05, 0.6));
    ctx.globalAlpha = qe;
    ctx.fillStyle = p.accent;
    ctx.font = api.font(size * 2.4, 'Fraunces', 900);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('“', s.x0 - size * 0.12, s.y0 - size * 0.55 + (1 - qe) * 20 * S);
    ctx.globalAlpha = 1;

    // marker (behind the text)
    for (const sg of s.segs) {
      const e = ease.inOutCubic(prog(t, sg.t0, sg.t1));
      if (e <= 0) continue;
      const pad = size * 0.1;
      const x0 = sg.x0 - pad;
      const len = (sg.x1 - sg.x0 + pad * 2) * e;
      const top = sg.y - size * 0.5;
      const bot = sg.y + size * 0.1;
      ctx.save();
      ctx.globalCompositeOperation = p.alpha ? 'source-over' : 'multiply';
      ctx.globalAlpha = p.alpha ? 0.85 : 0.95;
      ctx.fillStyle = p.marker;
      ctx.beginPath();
      const steps = 6;
      ctx.moveTo(x0, top + api.hash(sg.li, 1) * size * 0.06);
      for (let k = 1; k <= steps; k++) ctx.lineTo(x0 + (len * k) / steps, top + (api.hash(sg.li, k, 2) - 0.3) * size * 0.06 - (k / steps) * size * 0.02);
      ctx.lineTo(x0 + len + size * 0.04, (top + bot) / 2);
      for (let k = steps; k >= 0; k--) ctx.lineTo(x0 + (len * k) / steps, bot + (api.hash(sg.li, k, 3) - 0.5) * size * 0.06 - (k / steps) * size * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // words
    ctx.font = api.font(size, 'Instrument Serif', 400);
    ctx.fillStyle = p.ink;
    for (const w of s.words) {
      const e = ease.outCubic(prog(t, w.t, w.t + 0.5));
      if (e <= 0) continue;
      ctx.globalAlpha = e;
      ctx.fillText(w.s, w.x, w.y + (1 - e) * size * 0.25);
    }
    ctx.globalAlpha = 1;

    // author
    if (p.author) {
      const ae = ease.outCubic(prog(t, s.authorT, s.authorT + 0.6));
      if (ae > 0) {
        const y = s.y0 + (s.lines - 1) * s.lh + size * 0.95;
        const fs = Math.max(12, size * 0.26);
        ctx.globalAlpha = ae;
        ctx.fillStyle = p.accent;
        ctx.fillRect(s.x0, y - fs * 0.35, size * 0.6 * ae, Math.max(2, 3 * S));
        ctx.fillStyle = p.ink;
        ctx.font = api.font(fs, 'Space Grotesk', 700);
        ctx.fillText(api.upper(p.author, p.lang), s.x0 + size * 0.8, y);
        ctx.globalAlpha = 1;
      }
    }
  },
};
