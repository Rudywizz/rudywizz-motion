// split-flap — a mechanical departures board. Every cell flips through the
// character drum (Turkish letters included) until it lands on its letter.

const DRUM = ' ABCÇDEFGĞHIİJKLMNOÖPQRSŞTUÜVWXYZ0123456789.,:!?-/&#';

export default {
  id: 'split-flap',
  title: 'Split Flap',
  tagline: 'Mechanical departures board flips into your words',
  fonts: [['JetBrains Mono', 800], ['Space Grotesk', 700]],
  defaults: {
    text: 'Next stop / big ideas / gate 7',
    duration: 6,
    title: 'DEPARTURES · KALKIŞ',
    cols: 0,
    board: '#0e0e10',
    flap: '#1e1e22',
    ink: '#f4e7c5',
    accent: '#ffb300',
  },
  options: {
    title: 'Header above the board ("" to hide)',
    cols: 'Columns (0 = fit the longest line)',
    ink: 'Letter colour',
    accent: 'Colour of the header + last row',
  },

  setup(api) {
    const { W, p } = api;
    const lines = api.splitLines(api.upper(p.text, p.lang)).slice(0, 7).map((l) => api.graphemes(l));
    const cols = Math.max(6, p.cols | 0 || Math.max(...lines.map((l) => l.length)) + 2);
    const cw = (W * 0.9) / cols;
    const cells = [];
    lines.forEach((l, r) => {
      const pad = Math.floor((cols - l.length) / 2);
      for (let c = 0; c < cols; c++) {
        const ch = l[c - pad] ?? ' ';
        let target = DRUM.indexOf(ch);
        if (target < 0) target = DRUM.indexOf('?');
        const flips = target === 0 ? 0 : Math.min(target, 10 + Math.floor(api.hash(r, c, p.seed) * 14));
        cells.push({ r, c, ch: DRUM[target], target, flips, delay: 0.2 + c * 0.04 + r * 0.16 + api.hash(c, r) * 0.25 });
      }
    });
    return { rows: lines.length, cols, cw, ch: cw * 1.5, cells };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S } = api;
    api.bg(p.board);
    const gap = s.cw * 0.08;
    const boardW = s.cols * s.cw;
    const boardH = s.rows * (s.ch + gap * 2);
    const x0 = (W - boardW) / 2;
    const y0 = H / 2 - boardH / 2;
    const flipDur = 0.065;

    if (p.title) {
      ctx.font = api.font(34 * S, 'Space Grotesk', 700);
      ctx.fillStyle = p.accent;
      ctx.textBaseline = 'bottom';
      ctx.fillText(api.upper(p.title, p.lang), x0, y0 - 30 * S);
      ctx.fillStyle = api.rgba(p.ink, 0.4);
      ctx.textAlign = 'right';
      const hh = String(9 + Math.floor(t / 60)).padStart(2, '0');
      ctx.fillText(`${hh}:${String(41 + Math.floor(t)).padStart(2, '0')}`, x0 + boardW, y0 - 30 * S);
      ctx.textAlign = 'left';
    }

    const fsize = s.ch * 0.72;
    const glyph = (g, ch, cx, cy, col) => {
      g.font = api.font(fsize, 'JetBrains Mono', 800);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = col;
      g.fillText(ch, cx, cy + fsize * 0.04);
    };

    for (const cell of s.cells) {
      const x = x0 + cell.c * s.cw + gap / 2;
      const y = y0 + cell.r * (s.ch + gap * 2) + gap;
      const w = s.cw - gap;
      const h = s.ch;
      const cx = x + w / 2;
      const mid = y + h / 2;
      const start = cell.target - cell.flips;
      const el = (t - cell.delay) / flipDur;
      const k = Math.max(0, Math.min(cell.flips, Math.floor(el)));
      const ph = el - Math.floor(el);
      const curI = start + k;
      const flipping = el > 0 && k < cell.flips;
      const cur = DRUM[curI];
      const nxt = DRUM[Math.min(cell.target, curI + 1)];
      const col = cell.r === s.rows - 1 && s.rows > 1 ? p.accent : p.ink;

      const half = (top, ch, scaleY, shade) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, top ? y : mid, w, h / 2);
        ctx.clip();
        ctx.translate(0, mid);
        ctx.scale(1, scaleY);
        ctx.translate(0, -mid);
        ctx.fillStyle = p.flap;
        api.roundRect(ctx, x, y, w, h, 6 * S);
        ctx.fill();
        glyph(ctx, ch, cx, mid, col);
        if (shade) {
          ctx.fillStyle = `rgba(0,0,0,${shade})`;
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore();
      };

      if (!flipping) {
        half(true, cur, 1, 0);
        half(false, cur, 1, 0.08);
      } else {
        half(true, nxt, 1, 0); // revealed behind
        half(false, cur, 1, 0.08);
        if (ph < 0.5) half(true, cur, 1 - ph * 2, ph * 0.8); // falling top
        else half(false, nxt, (ph - 0.5) * 2, (1 - ph) * 0.8); // landing bottom
      }
      // hinge line
      ctx.fillStyle = p.board;
      ctx.fillRect(x, mid - 1.5 * S, w, 3 * S);
    }
  },
};
