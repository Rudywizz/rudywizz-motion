// beat-cut — one rubber-stamped word per beat on a Swiss-grid poster. Old
// stamps stay as ghost layers, every bar (4 beats) the poster inverts.
// Set --set bpm=… to match your track and add --audio to mux it in.

export default {
  id: 'beat-cut',
  title: 'Beat Cut',
  tagline: 'One stamped word per beat on a Swiss-grid poster',
  fonts: [['Big Shoulders Display', 900], ['Instrument Serif', 400, 'italic'], ['Space Grotesk', 700]],
  defaults: {
    text: 'Write it / cut it / stamp it / ship it',
    duration: 6,
    bpm: 96,
    offset: 0,
    paper: '#efebe3',
    ink: '#141414',
    hot: '#ff4b1f',
  },
  options: {
    bpm: 'Tempo — one word per beat',
    offset: 'Seconds before the first beat (sync with your audio)',
    hot: 'Accent ink used on every 4th word',
    paper: 'Poster colour',
    ink: 'Main ink colour',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    const ws = api.words(api.upper(p.text.replace(/\s\/\s/g, ' '), p.lang));
    const r = api.rng(p.seed);
    // speckle mask for the rubber-stamp texture
    const sp = api.offscreen(W / 2, H / 2);
    const g = sp.getContext('2d');
    const dots = Math.round(1800 * ((W * H) / (1080 * 1920)));
    for (let i = 0; i < dots; i++) {
      g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.65})`;
      g.beginPath();
      g.arc(r() * sp.width, r() * sp.height, (0.4 + r() * 1.6) * api.S, 0, Math.PI * 2);
      g.fill();
    }
    const layouts = ['center', 'topLeft', 'bottomRight', 'vertical', 'band'];
    const items = ws.map((w, i) => {
      const lay = layouts[(i + Math.floor(r() * 2)) % layouts.length];
      const max = lay === 'vertical' ? H * 0.8 : W * 0.88;
      // every third word switches to an italic serif for contrast
      const serif = i % 3 === 1;
      const fam = serif ? 'Instrument Serif' : 'Big Shoulders Display';
      const word = serif ? api.lower(w, p.lang) : w;
      ctx.font = serif ? `italic 400 100px "${fam}"` : api.font(100, fam, 900);
      const size = Math.min((max / Math.max(1, ctx.measureText(word).width)) * 100, lay === 'vertical' ? W * 0.55 : H * 0.36, W * 0.6);
      return { w: word, lay, size, serif, rot: (r() - 0.5) * 0.08 };
    });
    return { items, speckle: sp, stamp: api.offscreen(W, H) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, prog } = api;
    const beat = 60 / p.bpm;
    const bt = (t - p.offset) / beat;
    const bi = Math.floor(bt);
    const local = (bt - bi) * beat; // seconds since the beat
    const bar = Math.floor(Math.max(0, bi) / 4);
    const inv = bar % 2 === 1;
    const paper = inv ? p.ink : p.paper;
    const ink = inv ? p.paper : p.ink;
    api.bg(paper);

    // grid
    ctx.strokeStyle = api.rgba(ink, 0.12);
    ctx.lineWidth = 2 * S;
    const m = 56 * S;
    for (let i = 0; i <= 4; i++) {
      const x = m + ((W - 2 * m) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, m);
      ctx.lineTo(x, H - m);
      ctx.stroke();
    }
    for (let j = 0; j <= 6; j++) {
      const y = m + ((H - 2 * m) * j) / 6;
      ctx.beginPath();
      ctx.moveTo(m, y);
      ctx.lineTo(W - m, y);
      ctx.stroke();
    }

    const n = s.items.length;
    const draw = (idx, alpha, fresh) => {
      const it = s.items[((idx % n) + n) % n];
      const g = s.stamp.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      const impact = fresh ? 1 + 0.18 * (1 - prog(local, 0, 0.07)) : 1;
      g.font = it.serif ? `italic 400 ${Math.round(it.size)}px "Instrument Serif"` : api.font(it.size, 'Big Shoulders Display', 900);
      g.textBaseline = 'middle';
      g.fillStyle = idx % 4 === 3 ? p.hot : ink;
      g.save();
      let x = W / 2;
      let y = H / 2;
      let rot = it.rot;
      g.textAlign = 'center';
      if (it.lay === 'topLeft') {
        g.textAlign = 'left';
        x = m + 10 * S;
        y = m + (H - 2 * m) / 6 + it.size * 0.45;
      } else if (it.lay === 'bottomRight') {
        g.textAlign = 'right';
        x = W - m - 10 * S;
        y = H - m - (H - 2 * m) / 6 - it.size * 0.4;
      } else if (it.lay === 'vertical') {
        rot = -Math.PI / 2 + it.rot * 0.3;
        x = m + (W - 2 * m) / 4 + it.size * 0.1;
      } else if (it.lay === 'band') {
        g.fillRect(0, y - it.size * 0.62, W, it.size * 1.24);
        g.fillStyle = paper;
      }
      g.translate(x, y);
      g.rotate(rot);
      g.scale(impact, impact);
      g.fillText(it.w, 0, 0);
      g.restore();
      // knock out speckles for a rubber-stamp texture
      g.globalCompositeOperation = 'destination-out';
      const ox = (api.hash(idx, 1) - 0.5) * 200;
      const oy = (api.hash(idx, 2) - 0.5) * 200;
      g.drawImage(s.speckle, ox - 100, oy - 100, W + 200, H + 200);
      g.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.drawImage(s.stamp, 0, 0);
      ctx.globalAlpha = 1;
    };
    if (bt >= 0) {
      for (let k = 3; k >= 1; k--) if (bi - k >= bar * 4) draw(bi - k, 0.1, false);
      draw(bi, 1, true);
    }

    // beat counter + metronome
    ctx.font = api.font(26 * S, 'Space Grotesk', 700);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (let k = 0; k < 4; k++) {
      const on = bt >= 0 && ((bi % 4) + 4) % 4 === k;
      ctx.fillStyle = on ? p.hot : api.rgba(ink, 0.35);
      ctx.fillText(String(k + 1), m + k * 40 * S, H - m + 14 * S);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = api.rgba(ink, 0.55);
    ctx.fillText(`${p.bpm} BPM`, W - m, H - m + 14 * S);
    ctx.fillText(`BAR ${String(bar + 1).padStart(2, '0')}`, W - m, m - 40 * S);
    const pulse = Math.exp(-local * 9);
    ctx.fillStyle = p.hot;
    ctx.beginPath();
    ctx.arc(m + 12 * S, m - 26 * S, (8 + 10 * pulse) * S, 0, Math.PI * 2);
    ctx.fill();
  },
};
