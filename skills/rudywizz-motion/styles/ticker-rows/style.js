// ticker-rows — a kinetic poster: giant rows of your text scroll in
// alternating directions, filled and outlined, one row on a highlight band.
// The whole sheet is tilted; rows slide in on a stagger.

const FAM = 'Unbounded';
const WT = 900;

export default {
  id: 'ticker-rows',
  title: 'Ticker Rows',
  tagline: 'Giant rows of text scroll in alternating directions, poster style',
  fonts: [[FAM, 900]],
  defaults: {
    text: 'New drop / Out now',
    duration: 5,
    rows: 5,
    tilt: -7,
    speed: 0.35,
    bg: '#0d0d0d',
    ink: '#f2f2f2',
    accent: '#d4ff3a',
  },
  options: {
    rows: 'Visible rows, 4–6',
    tilt: 'Sheet rotation in degrees (0 = straight)',
    speed: 'Scroll speed in frame-widths per second',
    bg: 'Background colour',
    ink: 'Text colour',
    accent: 'Highlight band colour',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const lines = api.splitLines(api.upper(p.text, p.lang));
    if (!lines.length) lines.push('—');
    const n = Math.max(4, Math.min(6, Math.round(p.rows)));
    const h = H / n;
    ctx.font = api.font(100, FAM, WT);
    const ref = ctx.measureText('ÇĞİŞÖÜHgy');
    const em = (ref.actualBoundingBoxAscent + ref.actualBoundingBoxDescent) / 100;
    const size = Math.min((h * 0.72) / em, W * 0.5);
    ctx.font = api.font(size, FAM, WT);
    const capAsc = ctx.measureText('H').actualBoundingBoxAscent;
    const gap = size * 0.55;

    // one strip per (line, variant); variant 0 = fill, 1 = outline, 2 = highlight
    const strips = lines.map((l) => {
      const tw = Math.ceil(ctx.measureText(l).width);
      const unit = Math.min(30000, tw + gap);
      return [0, 1, 2].map((v) => {
        const c = api.offscreen(unit, Math.ceil(h));
        const g = c.getContext('2d');
        g.font = api.font(size, FAM, WT);
        g.textBaseline = 'alphabetic';
        const base = h / 2 + capAsc / 2;
        const col = v === 2 ? (p.alpha ? '#000000' : p.bg) : p.ink;
        if (v === 1) {
          // clean outline: dilate the filled glyphs, then cut the fill out
          // (strokeText shows overlapping contours of variable fonts)
          const rr = Math.max(1.5, 3 * S);
          g.fillStyle = col;
          for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2;
            g.fillText(l, Math.cos(a) * rr, base + Math.sin(a) * rr);
          }
          g.globalCompositeOperation = 'destination-out';
          g.fillText(l, 0, base);
          g.globalCompositeOperation = 'source-over';
        } else {
          g.fillStyle = col;
          g.fillText(l, 0, base);
        }
        // separator star
        const cx = tw + gap / 2;
        const cy = h / 2;
        const r = size * 0.16;
        g.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
          const rr = k % 2 ? r * 0.38 : r;
          g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        g.closePath();
        if (v === 1) {
          g.strokeStyle = col;
          g.lineWidth = Math.max(1.5, 3 * S);
          g.stroke();
        } else {
          g.fillStyle = v === 2 ? col : p.accent;
          g.fill();
        }
        return { c, unit };
      });
    });

    const ang = (p.tilt * Math.PI) / 180;
    const span = Math.abs(W * Math.sin(ang)) + Math.abs(H * Math.cos(ang));
    const half = Math.ceil(span / h / 2) + 1;
    const diag = Math.hypot(W, H);
    const rows = [];
    for (let r = -half; r <= half; r++) {
      const k = ((r % 2) + 2) % 2;
      rows.push({
        r,
        y: r * h - h / 2,
        dir: k ? 1 : -1,
        variant: r === 0 ? 2 : k,
        line: ((r % lines.length) + lines.length) % lines.length,
        speed: p.speed * W * (0.8 + api.hash(r, 4, p.seed) * 0.45),
        phase: api.hash(r, 6, p.seed),
        delay: Math.abs(r) * 0.08,
      });
    }
    return { strips, rows, h, ang, diag };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog } = api;
    api.bg(p.bg);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(s.ang);
    const L = s.diag / 2 + 10;
    for (const row of s.rows) {
      const st = s.strips[row.line][row.variant];
      const enter = 1 - ease.outExpo(prog(t, row.delay, row.delay + 1.1));
      if (row.variant === 2) {
        const bw = 2 * L * (1 - enter);
        ctx.fillStyle = p.accent;
        ctx.fillRect(-L, row.y, bw, s.h);
      }
      const travel = row.dir * (row.speed * t + enter * s.diag * 0.9);
      let off = ((row.phase * st.unit + travel) % st.unit + st.unit) % st.unit;
      for (let x = -L - off; x < L; x += st.unit) {
        if (x + st.unit < -L) continue;
        ctx.drawImage(st.c, Math.round(x), Math.round(row.y));
      }
    }
  },
};
