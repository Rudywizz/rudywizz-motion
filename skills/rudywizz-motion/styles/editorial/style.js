// editorial — magazine-style kinetic captions for voice-over, meant as an overlay. Each phrase lands word
// by word in time with the voice (timed from the audio's loudness), one hero word per phrase set huge in
// condensed caps, the rest in an italic serif; a mono speaker tag with a coloured bar. Above it all a
// masthead with a section counter, plus optional tags ("STYLE · neon-sign") so viewers know what they see.

const C = { ink: '#ffffff', teal: '#2ee6c8', dim: 'rgba(255,255,255,0.62)' };

export default {
  id: 'editorial',
  title: 'Editorial',
  tagline: 'Magazine-style kinetic captions synced to a voice-over, with masthead, section counter and tags',
  fonts: [['Big Shoulders Display', 900], ['Instrument Serif', 400, 'italic'], ['Instrument Serif', 400], ['JetBrains Mono', 700], ['Caveat', 600]],
  defaults: {
    text: 'Every word *lands* on time. / Captions that read like a *magazine.*',
    duration: 6,
    lines: [],
    masthead: 'RUDYWIZZ — MOTION',
    sections: [],
    tags: [],
    zones: [],
    pos: 'bottom',
    accent: '#ff6b5a',
    mixVoices: true,
    speakers: true,
  },
  options: {
    lines: 'Timed lines: [{ who, at, text, voice }]. *word* = hero word (otherwise the longest word is). The voice file times the words and is played (see mixVoices)',
    text: 'Without lines: phrases separated by " / " shown one after another',
    masthead: 'Masthead text (top left); "" hides the masthead',
    sections: 'Section counter: [{ at, title }] → "03 / 11  TITLE" top right',
    tags: 'Labels: [{ from, to, text, label }] e.g. { label: "STYLE", text: "neon-sign" }',
    zones: 'Caption position over time: [{ at, pos: top | middle | bottom }]',
    pos: 'Default caption position',
    accent: 'Hero word colour',
    mixVoices: 'false when the scene already plays the voices',
    speakers: 'Show the speaker tag above each phrase',
  },

  setup(api) {
    const { p, W, H } = api;
    const portrait = H > W;
    let lines = (p.lines || []).filter((l) => l && l.text && l.at != null);
    if (!lines.length) {
      const parts = api.splitLines(p.text);
      const per = p.duration / Math.max(1, parts.length);
      lines = parts.map((text, i) => ({ text, at: i * per + 0.2, dur: per - 0.5 }));
    }
    const fps = p.fps || 30;
    const phrases = [];
    for (const l of lines) {
      const dur = l.voice && l.voice.dur ? l.voice.dur : l.dur || Math.max(1.2, l.text.split(/\s+/).length * 0.36 + 0.3);
      if (l.voice && p.mixVoices !== false) api.cue(l.voice, l.at);
      const words = parseWords(l.text);
      const times = wordTimes(words, l.voice && l.voice.env, dur, fps);
      words.forEach((w, i) => (w.t = l.at + times[i]));
      // chunk into phrases
      let cur = [];
      const flush = () => {
        if (cur.length) phrases.push({ who: l.who || '', words: cur, at: cur[0].t, lineEnd: l.at + dur });
        cur = [];
      };
      words.forEach((w, i) => {
        cur.push(w);
        const chars = cur.reduce((n, x) => n + x.s.length + 1, 0);
        const next = words[i + 1];
        const punct = /[.!?…:;]$/.test(w.s) || (/,$/.test(w.s) && cur.length >= 3);
        if ((punct && cur.length >= 2) || cur.length >= (portrait ? 5 : 7) || chars > (portrait ? 30 : 44) || (next && next.hero && !w.hero && cur.length >= 3)) flush();
      });
      flush();
    }
    // merge 1-word tails into the previous phrase of the same line
    for (let i = phrases.length - 1; i > 0; i--) {
      const a = phrases[i - 1], b = phrases[i];
      if (b.words.length === 1 && a.lineEnd === b.lineEnd && a.words.length < 6) {
        a.words.push(...b.words);
        phrases.splice(i, 1);
      }
    }
    phrases.forEach((ph, i) => {
      const next = phrases[i + 1];
      const last = ph.words[ph.words.length - 1].t + 0.45;
      ph.end = next && next.at < ph.lineEnd + 0.4 ? next.at : Math.max(last, ph.lineEnd + 0.25);
      if (!ph.words.some((w) => w.hero)) {
        // auto hero: the longest word
        let best = null;
        for (const w of ph.words) if (!best || w.s.replace(/[^\p{L}\p{N}]/gu, '').length > best.s.replace(/[^\p{L}\p{N}]/gu, '').length) best = w;
        if (best && best.s.replace(/[^\p{L}\p{N}]/gu, '').length >= 4) best.hero = true;
      }
    });
    return { phrases, portrait, S: Math.min(W, H) / 1080, layouts: new Map() };
  },

  frame(api, t, s) {
    const { ctx, W, H, p } = api;
    api.bg(null);
    const S = s.S;
    const P = s.portrait;
    const mx = W * (P ? 0.075 : 0.06);

    // ── masthead ──
    if (p.masthead) {
      const y = H * (P ? 0.045 : 0.06);
      ctx.save();
      ctx.font = api.font(30 * S, 'JetBrains Mono', 700);
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = 0.9;
      spaced(ctx, String(p.masthead), mx, y, 4 * S);
      const sec = activeAt(p.sections, t);
      if (sec) {
        const idx = p.sections.indexOf(sec);
        const k = clamp01((t - sec.at) / 0.45);
        const num = `${String(idx + 1).padStart(2, '0')} / ${String(p.sections.length).padStart(2, '0')}`;
        const label = String(sec.title || '').toLocaleUpperCase(p.lang === 'tr' || p.lang === 'az' ? 'tr' : 'en');
        ctx.textAlign = 'right';
        // the counter rolls in from below on every new section
        ctx.save();
        ctx.beginPath();
        ctx.rect(W * 0.4, y - 22 * S, W * 0.6 - mx + 2, 44 * S);
        ctx.clip();
        const dy = (1 - ease(k)) * 30 * S;
        ctx.fillStyle = p.accent;
        ctx.fillText(num, W - mx, y + dy);
        ctx.restore();
        if (label) {
          ctx.font = api.font(24 * S, 'JetBrains Mono', 700);
          ctx.fillStyle = C.dim;
          const shown = label.slice(0, Math.ceil(label.length * clamp01((t - sec.at - 0.15) / 0.5)));
          ctx.fillText(shown, W - mx, y + 42 * S);
        }
        ctx.textAlign = 'left';
      }
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = C.ink;
      ctx.fillRect(mx, y + 24 * S, W - mx * 2, Math.max(1, 1.5 * S));
      ctx.restore();
    }

    // ── tags ──
    for (const tg of p.tags || []) {
      if (t < tg.from || t > tg.to) continue;
      const a = Math.min(clamp01((t - tg.from) / 0.3), clamp01((tg.to - t) / 0.25));
      const y = H * (P ? 0.125 : 0.16);
      ctx.save();
      ctx.globalAlpha = a;
      const lab = String(tg.label || 'STYLE').toUpperCase();
      ctx.font = api.font(20 * S, 'JetBrains Mono', 700);
      ctx.textBaseline = 'middle';
      const lw = ctx.measureText(lab).width + 24 * S;
      ctx.font = api.font(30 * S, 'JetBrains Mono', 700);
      const txt = String(tg.text);
      const typed = txt.slice(0, Math.ceil(txt.length * clamp01((t - tg.from - 0.15) / 0.4)));
      const tw = ctx.measureText(txt).width + 30 * S;
      const x = mx - (1 - ease(clamp01((t - tg.from) / 0.35))) * 40 * S;
      ctx.fillStyle = C.teal;
      ctx.fillRect(x, y - 22 * S, lw, 44 * S);
      ctx.fillStyle = 'rgba(6,14,16,0.82)';
      ctx.fillRect(x + lw, y - 22 * S, tw, 44 * S);
      ctx.font = api.font(20 * S, 'JetBrains Mono', 700);
      ctx.fillStyle = '#05110f';
      ctx.fillText(lab, x + 12 * S, y + 1);
      ctx.font = api.font(30 * S, 'JetBrains Mono', 700);
      ctx.fillStyle = C.ink;
      ctx.fillText(typed, x + lw + 15 * S, y + 1);
      ctx.restore();
    }

    // ── captions ──
    const ph = s.phrases.find((x) => t >= x.at - 0.05 && t < x.end);
    if (!ph) return;
    const zone = activeAt(p.zones, t);
    const pos = (zone && zone.pos) || p.pos || 'bottom';
    let lay = s.layouts.get(ph);
    if (!lay) {
      lay = layout(api, ph, W - mx * 2, S, P, p.speakers !== false);
      s.layouts.set(ph, lay);
    }
    const blockH = lay.h;
    const y0 = pos === 'top' ? H * (P ? 0.15 : 0.2) : pos === 'middle' ? (H - blockH) / 2 : H * (P ? 0.87 : 0.9) - blockH;
    const out = clamp01((ph.end - t) / 0.18);
    // legibility scrim
    if (pos !== 'middle') {
      ctx.save();
      const top = pos === 'top';
      const g = ctx.createLinearGradient(0, top ? 0 : y0 - H * 0.12, 0, top ? y0 + blockH + H * 0.08 : H);
      g.addColorStop(0, top ? 'rgba(3,8,10,0.72)' : 'rgba(3,8,10,0)');
      g.addColorStop(1, top ? 'rgba(3,8,10,0)' : 'rgba(3,8,10,0.78)');
      ctx.globalAlpha = Math.min(out, clamp01((t - ph.at + 0.05) / 0.2));
      ctx.fillStyle = g;
      ctx.fillRect(0, top ? 0 : y0 - H * 0.12, W, top ? y0 + blockH + H * 0.08 : H - y0 + H * 0.12);
      ctx.restore();
    }
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // speaker tag
    if (lay.tag) {
      const a = clamp01((t - ph.at + 0.05) / 0.2) * out;
      ctx.globalAlpha = a;
      const bit = /^bit$/i.test(ph.who);
      ctx.fillStyle = bit ? C.teal : p.accent;
      ctx.fillRect(mx, y0 + 4 * S, 8 * S, 30 * S);
      ctx.font = api.font(24 * S, 'JetBrains Mono', 700);
      ctx.fillStyle = C.ink;
      ctx.textBaseline = 'middle';
      spaced(ctx, (bit ? '> ' : '') + ph.who.toUpperCase(), mx + 20 * S, y0 + 20 * S, 3 * S);
      ctx.textBaseline = 'alphabetic';
    }
    for (const w of lay.words) {
      const k = clamp01((t - w.t + 0.04) / (w.hero ? 0.22 : 0.16));
      if (k <= 0) continue;
      const e = ease(k);
      ctx.save();
      ctx.globalAlpha = e * out;
      ctx.font = w.font;
      const x = mx + w.x;
      const y = y0 + w.y + (1 - e) * (w.hero ? 0 : 18 * S) - (1 - out) * 12 * S;
      if (w.hero) {
        const sc = 1 + (1 - e) * 0.35;
        ctx.translate(x, y);
        ctx.scale(sc, sc);
        ctx.fillStyle = p.accent;
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 18 * S;
        ctx.fillText(w.txt, 0, 0);
        // underline sweep
        ctx.shadowBlur = 0;
        ctx.fillRect(0, 10 * S, w.w * ease(clamp01((t - w.t - 0.1) / 0.35)), 6 * S);
      } else {
        ctx.fillStyle = C.ink;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 12 * S;
        ctx.fillText(w.txt, x, y);
      }
      ctx.restore();
    }
    ctx.restore();
  },
};

function parseWords(text) {
  const raw = String(text).split(/\s+/).filter(Boolean);
  let on = false;
  return raw.map((w) => {
    if (w.startsWith('*') || w.startsWith('“*') || w.startsWith('"*')) on = true;
    const hero = on;
    if (/\*[.,!?…:;”"’']*$/.test(w)) on = false;
    return { s: w.replace(/\*/g, ''), hero };
  });
}

// Word start times inside a line: spread the words over the frames where the voice is actually loud,
// weighted by syllables (vowels), so pauses in the recording pause the captions too.
function wordTimes(words, env, dur, fps) {
  const weight = words.map((w) => Math.max(1, (w.s.match(/[aeıioöuüâîûAEIİOÖUÜ]/g) || []).length) + (/[.,!?…:;]$/.test(w.s) ? 0.6 : 0));
  const total = weight.reduce((a, b) => a + b, 0);
  const cum = [];
  let acc = 0;
  for (const w of weight) {
    cum.push(acc / total);
    acc += w;
  }
  if (!env || !env.length) return cum.map((c) => c * dur * 0.92);
  const n = Math.min(env.length, Math.round(dur * fps));
  const peak = Math.max(...env.slice(0, n), 0.001);
  const active = [];
  let a = 0;
  for (let i = 0; i < n; i++) {
    if (env[i] > peak * 0.12) a++;
    active.push(a);
  }
  if (!a) return cum.map((c) => c * dur * 0.92);
  return cum.map((c) => {
    const target = c * a;
    let i = 0;
    while (i < n - 1 && active[i] < target + 0.5) i++;
    // start each word slightly before its sound
    return Math.max(0, i / fps - 0.06);
  });
}

function layout(api, ph, maxW, S, P, tag) {
  const { ctx } = api;
  const base = (P ? 66 : 54) * S;
  const heroSize = base * (P ? 1.9 : 1.75);
  const serif = api.font(base, 'Instrument Serif', 400).replace(/^/, 'italic ');
  const hero = api.font(heroSize, 'Big Shoulders Display', 900);
  const out = [];
  let x = 0;
  let row = 0;
  const rows = [{ h: base * 1.12, words: [] }];
  const newRow = (h) => {
    rows.push({ h, words: [] });
    row++;
    x = 0;
  };
  ph.words.forEach((w, i) => {
    const isHero = w.hero;
    const txt = isHero ? w.s.toLocaleUpperCase(api.p.lang === 'tr' || api.p.lang === 'az' ? 'tr' : 'en').replace(/[.,!?…:;]+$/, '') : w.s;
    ctx.font = isHero ? hero : serif;
    let ww = ctx.measureText(txt).width;
    let font = isHero ? hero : serif;
    if (isHero && ww > maxW) {
      const k = maxW / ww;
      font = api.font(heroSize * k, 'Big Shoulders Display', 900);
      ww = maxW;
    }
    const space = ctx.measureText(' ').width;
    const prevHero = i > 0 && ph.words[i - 1].hero;
    // hero words sit on their own row (consecutive hero words share it)
    if ((isHero && !prevHero && x > 0) || (!isHero && prevHero) || (x > 0 && x + ww > maxW)) newRow(base * 1.12);
    if (isHero) rows[row].h = Math.max(rows[row].h, heroSize * 0.98);
    out.push({ txt, t: w.t, hero: isHero, font, x, row, w: ww });
    x += ww + (isHero ? heroSize * 0.18 : space);
  });
  let y = tag ? 52 * S : 0;
  const rowY = rows.map((r) => {
    y += r.h;
    const yy = y;
    y += base * 0.12;
    return yy;
  });
  for (const w of out) w.y = rowY[w.row] - (w.hero ? heroSize * 0.08 : base * 0.18);
  return { words: out, h: y, tag: tag && ph.who };
}

function spaced(ctx, text, x, y, sp) {
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + sp;
  }
}

function activeAt(list, t) {
  let cur = null;
  for (const e of list || []) if (e && e.at <= t) cur = e;
  return cur;
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (k) => 1 - Math.pow(1 - clamp01(k), 3);
