// led-marquee — the scrolling LED signs of every corner shop and minibus
// ("kayan yazı"): stacked dot-matrix boards, each stepping its own line across,
// then the first word of each line blinks in place. Reflected in a wet street.

export default {
  id: 'led-marquee',
  title: 'LED Marquee',
  tagline: 'Corner-shop scrolling LED signs ("kayan yazı")',
  fonts: [['Press Start 2P', 400]],
  defaults: {
    text: 'Hoş geldiniz / Open 24/7 / Çay · Kahve · Tost',
    duration: 7,
    colors: ['#ffae1a', '#ff3b30', '#33ff7a'],
    cols: 34,
    bg: '#07070a',
  },
  options: {
    text: 'One board per line (split with " / " or new lines, max 4)',
    colors: 'LED colour per board (array of hex)',
    cols: 'LED columns per board (wider = smaller dots)',
  },

  setup(api) {
    const { W, H, p } = api;
    const rows = 12;
    const cols = Math.max(16, Math.min(80, p.cols | 0));
    const toBits = (str) => {
      const c = api.offscreen(Math.max(8, str.length * 9 + 8), rows);
      const g = c.getContext('2d');
      g.font = api.font(8, 'Press Start 2P');
      const w = Math.ceil(g.measureText(str).width);
      c.width = Math.max(1, w);
      g.font = api.font(8, 'Press Start 2P');
      g.textBaseline = 'alphabetic';
      g.fillStyle = '#fff';
      g.fillText(str, 0, 9);
      const d = g.getImageData(0, 0, c.width, rows).data;
      const bits = [];
      for (let x = 0; x < c.width; x++) {
        const col = [];
        for (let y = 0; y < rows; y++) col.push(d[(y * c.width + x) * 4 + 3] > 110);
        bits.push(col);
      }
      return bits;
    };
    const lines = api.splitLines(api.upper(p.text, p.lang)).slice(0, 4);
    const boards = lines.map((l) => ({
      scroll: toBits(l + '   '),
      hold: toBits((api.words(l)[0] || '').replace(/[·.,!:]+$/, '')),
    }));
    const pitch = (W * 0.86) / cols;
    return { rows, cols, pitch, boards, glow: api.offscreen(W / 4, H / 4), grain: api.makeGrain(W, H, p.seed + 2) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S } = api;
    const { rows, cols, pitch } = s;
    const D = p.duration;
    const scrollEnd = D * 0.74;
    const colors = Array.isArray(p.colors) && p.colors.length ? p.colors : ['#ffae1a'];
    api.bg(p.bg);

    const nb = s.boards.length;
    const pw = cols * pitch;
    const ph = rows * pitch;
    const gapY = 70 * S;
    const blockH = nb * ph + (nb - 1) * gapY;
    const px = (W - pw) / 2;
    const top = H * 0.4 - blockH / 2;
    const gctx = s.glow.getContext('2d');
    gctx.clearRect(0, 0, s.glow.width, s.glow.height);

    if (!p.alpha) {
      const [r, g, b] = api.hexToRgb(colors[0]);
      const spill = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, W);
      spill.addColorStop(0, `rgba(${r},${g},${b},0.14)`);
      spill.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = spill;
      ctx.fillRect(0, 0, W, H);
    }

    s.boards.forEach((bd, bi) => {
      const py = top + bi * (ph + gapY);
      const color = colors[bi % colors.length];
      const delay = bi * 0.35;
      let lit;
      if (t < scrollEnd) {
        const total = bd.scroll.length + cols;
        const u = Math.max(0, t - delay) / (scrollEnd - delay);
        const off = Math.floor(u * total);
        lit = (x, y) => {
          const sx = x - cols + off;
          return sx >= 0 && sx < bd.scroll.length && bd.scroll[sx][y];
        };
      } else {
        const u = t - scrollEnd;
        const on = Math.floor(u * 3.4 + bi) % 2 === 0 || u > (D - scrollEnd) * 0.65;
        const start = Math.floor((cols - bd.hold.length) / 2);
        lit = (x, y) => {
          const sx = x - start;
          return on && sx >= 0 && sx < bd.hold.length && bd.hold[sx][y];
        };
      }
      if (!p.alpha) {
        ctx.fillStyle = '#121216';
        api.roundRect(ctx, px - 22 * S, py - 22 * S, pw + 44 * S, ph + 44 * S, 12 * S);
        ctx.fill();
        ctx.strokeStyle = '#2b2b32';
        ctx.lineWidth = 4 * S;
        ctx.stroke();
      }
      const rad = pitch * 0.38;
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const cx = px + (x + 0.5) * pitch;
          const cy = py + (y + 0.5) * pitch;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          if (lit(x, y)) {
            ctx.fillStyle = color;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx - rad * 0.2, cy - rad * 0.2, rad * 0.42, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fill();
            gctx.fillStyle = color;
            gctx.fillRect(cx / 4 - 1.2, cy / 4 - 1.2, 2.6, 2.6);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.055)';
            ctx.fill();
          }
        }
      }
    });

    // bloom
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${10 * S}px)`;
    ctx.drawImage(s.glow, 0, 0, W, H);
    ctx.filter = `blur(${38 * S}px)`;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(s.glow, 0, 0, W, H);
    ctx.restore();

    if (!p.alpha) {
      // wet street reflection of the boards
      const srcY = top - 40 * S;
      const srcH = blockH + 80 * S;
      const mirror = srcY + srcH + 60 * S;
      const snap = api.offscreen(W, srcH);
      snap.getContext('2d').drawImage(api.canvas, 0, srcY, W, srcH, 0, 0, W, srcH);
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.filter = `blur(${7 * S}px)`;
      ctx.translate(0, 2 * mirror);
      ctx.scale(1, -1);
      ctx.drawImage(snap, 0, srcY);
      ctx.restore();
      const street = ctx.createLinearGradient(0, mirror, 0, H);
      street.addColorStop(0, 'rgba(7,7,10,0.2)');
      street.addColorStop(1, 'rgba(7,7,10,0.95)');
      ctx.fillStyle = street;
      ctx.fillRect(0, mirror, W, H - mirror);
      api.vignette(ctx, W, H, 0.6);
      s.grain(ctx, api.frameOf(t), 0.06);
    }
  },
};
