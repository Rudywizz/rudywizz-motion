// typewriter — monospace text is typed key by key: uneven strikes, a blinking
// cursor, a little "ding" at every line end. Themes: paper (ink on a sheet)
// or terminal (phosphor green on a dark screen).

const THEMES = {
  paper: { font: ['Courier Prime', 700], bg: '#eee6d4', ink: '#211d18', accent: '#b8361f', lh: 1.32 },
  terminal: { font: ['JetBrains Mono', 700], bg: '#07100b', ink: '#5dff9e', accent: '#c8ffe0', lh: 1.35 },
};

export default {
  id: 'typewriter',
  title: 'Typewriter',
  tagline: 'Text types itself key by key, cursor blinking, ding at each line',
  fonts: [['Courier Prime', 700], ['JetBrains Mono', 700], ['JetBrains Mono', 400]],
  defaults: {
    text: 'Dear reader, / every frame of this / was typed by code.',
    duration: 6,
    theme: 'paper',
    speed: 16,
    delay: 0.4,
    prompt: '>',
    title: 'tty1',
    ink: null,
    bg: null,
  },
  options: {
    theme: 'paper | terminal',
    speed: 'Keys per second (typing is scaled down to fit the duration)',
    delay: 'Seconds before the first key',
    prompt: 'Prompt before each line (terminal theme)',
    title: 'Window title (terminal theme)',
    ink: 'Text colour (defaults to the theme)',
    bg: 'Background colour (defaults to the theme)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const T = { ...(THEMES[p.theme] || THEMES.paper) };
    if (p.ink) T.ink = p.ink;
    if (p.bg) T.bg = p.bg;
    const [fam, wt] = T.font;
    const term = p.theme === 'terminal';
    const paras = api.splitLines(p.text).map((l) => (term && p.prompt ? `${p.prompt} ${l}` : l));
    const maxW = W * (W > H ? 0.7 : 0.78);
    const maxH = H * (W > H ? 0.62 : 0.56);

    const wrapBreak = (size) => {
      ctx.font = api.font(size, fam, wt);
      const out = [];
      for (const para of paras) {
        let line = '';
        for (let w of api.words(para)) {
          // break words wider than the column
          while (ctx.measureText(w).width > maxW) {
            const g = api.graphemes(w);
            let k = 1;
            while (k < g.length && ctx.measureText(g.slice(0, k + 1).join('') + '-').width <= maxW) k++;
            if (line) out.push(line);
            out.push(g.slice(0, k).join('') + '-');
            line = '';
            w = g.slice(k).join('');
          }
          const test = line ? line + ' ' + w : w;
          if (line && ctx.measureText(test).width > maxW) {
            out.push(line);
            line = w;
          } else line = test;
        }
        out.push(line);
      }
      return out;
    };
    let size = Math.min(W * (W > H ? 0.06 : 0.088), H * 0.085);
    // commands and URLs read badly when split: shrink (up to ~45%) before breaking a word
    const widest = () => {
      ctx.font = api.font(size, fam, wt);
      return Math.max(...paras.flatMap((para) => api.words(para).map((w) => ctx.measureText(w).width)));
    };
    for (let k = 0, s0 = size; k < 20 && size > s0 * 0.55 && widest() > maxW; k++) size *= 0.94;
    let lines = wrapBreak(size);
    for (let k = 0; k < 40 && lines.length * size * T.lh > maxH; k++) {
      size *= 0.93;
      lines = wrapBreak(size);
    }
    ctx.font = api.font(size, fam, wt);
    const lh = size * T.lh;
    const blockW = Math.max(...lines.map((l) => ctx.measureText(l).width), size);
    const x0 = (W - blockW) / 2;
    const y0 = (H - lines.length * lh) / 2 + lh * 0.75;

    // schedule every key
    const chars = [];
    const ends = [];
    let tc = 0;
    lines.forEach((l, li) => {
      const lay = api.layoutChars(ctx, l);
      lay.chars.forEach((c, ci) => {
        const h = api.hash(li, ci, p.seed);
        let dt = (1 / p.speed) * (0.55 + h * 0.9);
        if (c.c === ' ') dt *= 0.6;
        if (/[.,!?;:]/.test(c.c)) dt += 0.16;
        chars.push({ c: c.c, x: x0 + c.x, w: c.w, y: y0 + li * lh, t: tc, li, jx: (api.hash(li, ci, 7) - 0.5) * size * 0.04, jy: (api.hash(li, ci, 9) - 0.5) * size * 0.06, rot: (api.hash(li, ci, 11) - 0.5) * 0.05, ink: 0.72 + api.hash(li, ci, 13) * 0.28 });
        tc += dt;
      });
      ends.push({ t: tc, y: y0 + li * lh, x: x0 + lay.width, li, last: li === lines.length - 1 });
      tc += 0.3;
    });
    const room = Math.max(0.5, p.duration - p.delay - 0.9);
    const k = tc > room ? room / tc : 1;
    for (const c of chars) c.t = p.delay + c.t * k;
    for (const e of ends) e.t = p.delay + e.t * k;

    // paper texture
    let tex = null;
    if (!p.alpha) {
      tex = api.offscreen(W, H);
      const g = tex.getContext('2d');
      const r = api.rng(p.seed + 5);
      g.fillStyle = T.bg;
      g.fillRect(0, 0, W, H);
      if (!term) {
        for (let i = 0; i < 2600; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? '80,60,30' : '255,255,255'},${r() * 0.08})`;
          g.fillRect(r() * W, r() * H, 1 + r() * 3 * S, 1 + r() * 3 * S);
        }
        for (let i = 0; i < 90; i++) {
          g.strokeStyle = `rgba(90,70,40,${0.03 + r() * 0.04})`;
          g.lineWidth = 1;
          g.beginPath();
          const x = r() * W;
          const y = r() * H;
          g.moveTo(x, y);
          g.lineTo(x + (r() - 0.5) * 120 * S, y + (r() - 0.5) * 30 * S);
          g.stroke();
        }
        api.vignette(g, W, H, 0.35, '60,40,15');
      } else {
        const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
        gr.addColorStop(0, 'rgba(40,120,70,0.18)');
        gr.addColorStop(1, 'rgba(0,0,0,0.6)');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
      }
    }
    return { T, fam, wt, size, lh, chars, ends, x0, y0, blockW, lines, tex, term };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, clamp } = api;
    const { T, term, size } = s;
    api.bg(T.bg);
    if (s.tex) ctx.drawImage(s.tex, 0, 0);

    // last struck key → tiny page bump
    let last = null;
    for (const c of s.chars) if (c.t <= t) last = c;
    const bump = last ? 2.5 * S * Math.exp(-(t - last.t) * 35) : 0;

    if (term) {
      // window bar
      const bx = s.x0 - size * 1.1;
      const bw = s.blockW + size * 2.4;
      const by = s.y0 - s.lh * 0.75 - size * 1.9;
      ctx.fillStyle = api.rgba(T.ink, 0.1);
      ctx.fillRect(bx, by, bw, size * 1.05);
      ctx.fillStyle = api.rgba(T.ink, 0.55);
      ctx.font = api.font(size * 0.5, 'JetBrains Mono', 400);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(p.title || '', bx + bw / 2, by + size * 0.53);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(bx + size * (0.5 + k * 0.45), by + size * 0.53, size * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = api.rgba(T.ink, 0.25);
      ctx.lineWidth = 2 * S;
      ctx.strokeRect(bx, by, bw, s.lines.length * s.lh + size * 2.6);
    }

    ctx.font = api.font(size, s.fam, s.wt);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (term) {
      ctx.shadowColor = T.ink;
      ctx.shadowBlur = 14 * S;
    }
    for (const c of s.chars) {
      if (c.t > t || c.c === ' ') continue;
      const fresh = clamp(1 - (t - c.t) / 0.08);
      ctx.save();
      ctx.translate(c.x + c.jx, c.y + c.jy + bump);
      ctx.rotate(c.rot);
      ctx.globalAlpha = term ? 1 : c.ink;
      ctx.fillStyle = term && fresh > 0 ? T.accent : T.ink;
      ctx.fillText(c.c, 0, 0);
      if (!term && fresh > 0) ctx.fillText(c.c, size * 0.02, 0);
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // ding: three ticks bursting at the right margin when a line ends
    for (const e of s.ends) {
      if (e.last) continue;
      const u = (t - e.t) / 0.4;
      if (u < 0 || u > 1) continue;
      const cx = e.x + size * 0.75;
      const cy = e.y - size * 0.35;
      ctx.strokeStyle = api.rgba(T.accent, 1 - u);
      ctx.lineWidth = 3 * S;
      ctx.lineCap = 'round';
      for (let k = -1; k <= 1; k++) {
        const a = k * 0.6;
        const r0 = size * (0.25 + u * 0.3);
        const r1 = r0 + size * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }
    }

    // cursor
    let cx;
    let cy;
    if (!last) {
      cx = s.x0;
      cy = s.y0;
    } else {
      const end = s.ends.find((e) => e.li === last.li);
      const moved = end && t >= end.t && !end.last;
      cx = moved ? s.x0 : last.x + last.w;
      cy = moved ? last.y + s.lh : last.y;
    }
    const typing = last && t - last.t < 0.3 && t < s.ends[s.ends.length - 1].t + 0.05;
    if (typing || Math.floor(t * 2.2) % 2 === 0) {
      ctx.fillStyle = term ? T.ink : T.accent;
      if (term) {
        ctx.globalAlpha = 0.85;
        ctx.fillRect(cx + size * 0.04, cy - size * 0.78, size * 0.58, size * 0.95);
      } else ctx.fillRect(cx + size * 0.04, cy + size * 0.12, size * 0.58, size * 0.09);
      ctx.globalAlpha = 1;
    }
    if (term && !p.alpha) api.scanlines(ctx, W, H, { gap: 4 * S, alpha: 0.18 });
  },
};
