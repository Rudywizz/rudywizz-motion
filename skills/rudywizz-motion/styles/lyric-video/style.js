// lyric-video — lyrics line by line, each word lighting up on time, everything
// breathing with the beat. Pair with --audio song.mp3 and --set bpm=….
// Exact timing: --set times='[0,2.1,4.3]' (start second of every line).

export default {
  id: 'lyric-video',
  title: 'Lyric Video',
  tagline: 'Lyrics light up word by word, pulsing on the beat',
  fonts: [['Bricolage Grotesque', 800], ['Instrument Serif', 400, 'italic'], ['Space Grotesk', 700]],
  defaults: {
    text: 'Gece uzun, şehir susmuyor\nBeat’i aç, gerisi bende\nHer kare kodla çizildi',
    duration: 8,
    bpm: 92,
    times: null,
    credit: 'ARTIST — TRACK',
    bg: '#0b0a12',
    ink: '#f7f3ea',
    accent: '#ffcf3a',
    blobA: '#5b2bff',
    blobB: '#ff2e6d',
  },
  options: {
    text: 'One lyric line per line (or " / ")',
    bpm: 'Tempo for the pulse',
    times: 'Array of start seconds, one per line (default: evenly spread)',
    credit: 'Small artist/track credit ("" to hide)',
    accent: 'Colour of the active word',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    const lines = api.splitLines(p.text);
    const n = lines.length;
    const times = Array.isArray(p.times) && p.times.length >= n ? p.times.map(Number) : lines.map((_, i) => 0.3 + (i * (p.duration - 0.6)) / n);
    const ends = times.map((s, i) => (i < n - 1 ? times[i + 1] : p.duration - 0.2));
    const L = lines.map((line, i) => {
      const up = api.upper(line, p.lang);
      ctx.font = api.font(100, 'Bricolage Grotesque', 800);
      const wrapped = api.wrap(ctx, up, ((W * 0.84) / 100) * 100 * 1.6);
      const size = api.fitSize(ctx, wrapped, { family: 'Bricolage Grotesque', weight: 800, maxW: W * 0.84, maxH: H * 0.34, lineHeight: 1.05, max: W * 0.2 });
      ctx.font = api.font(size, 'Bricolage Grotesque', 800);
      const rows = api.wrap(ctx, up, W * 0.84);
      // word timings inside the line, weighted by length
      const ws = api.words(up);
      const total = ws.reduce((a, w) => a + w.length + 2, 0);
      const span = (ends[i] - times[i]) * 0.75;
      let acc = 0;
      const wt = ws.map((w) => {
        const st = times[i] + (acc / total) * span;
        acc += w.length + 2;
        return st;
      });
      return { rows, size, start: times[i], end: ends[i], wt, raw: line };
    });
    return { L };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S } = api;
    const beat = 60 / p.bpm;
    const bl = (t % beat) / beat;
    const pulse = Math.exp(-bl * 6);
    api.bg(p.bg);
    if (!p.alpha) {
      const blob = (x, y, r, c) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, api.rgba(c, 0.55));
        g.addColorStop(1, api.rgba(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      };
      blob(W * (0.3 + 0.1 * Math.sin(t * 0.5)), H * (0.32 + 0.05 * Math.cos(t * 0.4)), W * (0.75 + 0.08 * pulse), p.blobA);
      blob(W * (0.75 + 0.1 * Math.cos(t * 0.45)), H * (0.7 + 0.05 * Math.sin(t * 0.6)), W * (0.7 + 0.08 * pulse), p.blobB);
      ctx.fillStyle = `rgba(255,255,255,${0.04 * pulse})`;
      ctx.fillRect(0, 0, W, H);
    }

    const cur = Math.max(0, s.L.findLastIndex((l) => t >= l.start));
    const drawLine = (li, yC, mode) => {
      const L = s.L[li];
      const lh = L.size * 1.05;
      const top = yC - (L.rows.length * lh) / 2;
      ctx.font = api.font(L.size, 'Bricolage Grotesque', 800);
      ctx.textBaseline = 'middle';
      let wi = 0;
      L.rows.forEach((row, ri) => {
        const ws = api.words(row);
        const space = ctx.measureText(' ').width;
        const rowW = ctx.measureText(row).width;
        let x = W / 2 - rowW / 2;
        const y = top + (ri + 0.5) * lh;
        for (const w of ws) {
          const ww = ctx.measureText(w).width;
          const st = L.wt[wi] ?? L.start;
          const on = mode === 'current' ? prog(t, st, st + 0.12) : mode === 'past' ? 1 : 0;
          const pop = mode === 'current' ? 1 + 0.12 * (1 - ease.outCubic(prog(t, st, st + 0.25))) * (t >= st ? 1 : 0) : 1;
          ctx.save();
          ctx.translate(x + ww / 2, y);
          ctx.scale(pop, pop);
          ctx.fillStyle = mode === 'current' && t >= st && t < (L.wt[wi + 1] ?? L.end) ? p.accent : p.ink;
          ctx.globalAlpha = (0.22 + 0.78 * on) * (mode === 'past' ? 0.0 : 1);
          ctx.textAlign = 'center';
          ctx.fillText(w, 0, 0);
          ctx.restore();
          x += ww + space;
          wi++;
        }
      });
    };

    const L = s.L[cur];
    const enter = ease.outExpo(prog(t, L.start, L.start + 0.45));
    const scale = 1 + 0.025 * pulse;
    ctx.save();
    ctx.translate(W / 2, H * 0.47);
    ctx.scale(scale, scale);
    ctx.translate(-W / 2, -H * 0.47);
    // outgoing line
    if (cur > 0 && enter < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - enter;
      ctx.filter = `blur(${enter * 14 * S}px)`;
      drawLine(cur - 1, H * 0.47 - enter * H * 0.18, 'current');
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = enter;
    drawLine(cur, H * 0.47 + (1 - enter) * H * 0.12, 'current');
    ctx.restore();
    ctx.restore();

    // next line preview
    if (cur < s.L.length - 1) {
      ctx.font = `italic 400 ${Math.round(46 * S)}px "Instrument Serif"`;
      ctx.fillStyle = api.rgba(p.ink, 0.35 * enter);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.L[cur + 1].raw, W / 2, H * 0.72);
    }
    // progress + credit
    ctx.fillStyle = api.rgba(p.ink, 0.15);
    ctx.fillRect(80 * S, H - 150 * S, W - 160 * S, 4 * S);
    ctx.fillStyle = p.accent;
    ctx.fillRect(80 * S, H - 150 * S, (W - 160 * S) * (t / p.duration), 4 * S);
    if (p.credit) {
      ctx.font = api.font(26 * S, 'Space Grotesk', 700);
      ctx.fillStyle = api.rgba(p.ink, 0.7);
      ctx.textAlign = 'left';
      ctx.fillText(api.upper(p.credit, p.lang), 80 * S, H - 110 * S);
    }
    ctx.textAlign = 'left';
  },
};
