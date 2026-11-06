// orbit-ring — your lines wrap around tilted rings that spin around a glowing
// planet; letters on the far side pass behind it, mirrored and dimmed.

export default {
  id: 'orbit-ring',
  title: 'Orbit Ring',
  tagline: 'Text rings spin around a glowing planet',
  fonts: [['Syne', 800]],
  defaults: {
    text: 'Stay curious / keep moving / make things',
    duration: 6,
    bg: '#0c0b10',
    ink: '#f4f1ea',
    accent: '#d7ff3a',
    planetA: '#ff7a2f',
    planetB: '#ff2d8a',
  },
  options: {
    text: 'One ring per line (max 4)',
    ink: 'Ring text colour',
    accent: 'Colour of every other ring',
    planetA: 'Planet colour (light side)',
    planetB: 'Planet colour (dark side)',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    const lines = api.splitLines(api.upper(p.text, p.lang)).slice(0, 4);
    const R = W * 0.42;
    const rings = lines.map((l, i) => {
      // repeat the line until it fills the circumference
      const size = W * 0.075;
      ctx.font = api.font(size, 'Syne', 800);
      const circ = 2 * Math.PI * R;
      const reps = Math.max(1, Math.round(circ / ctx.measureText(l + '  —  ').width));
      const full = Array(reps).fill(l).join('  —  ') + '  —  ';
      const lay = api.layoutChars(ctx, full);
      return { lay, size, total: lay.width, dir: i % 2 ? -1 : 1, y: (i - (lines.length - 1) / 2) * W * 0.34 };
    });
    return { rings, R };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S } = api;
    api.bg(p.bg);
    const cx = W / 2;
    const cy = H * 0.48;
    const intro = ease.outExpo(prog(t, 0.05, 1.4));
    const R = s.R * (0.4 + 0.6 * intro);
    const tilt = 0.32 + 0.06 * Math.sin(t * 0.8);
    const planetR = W * 0.22 * ease.outBack(prog(t, 0, 0.9));

    // stars
    if (!p.alpha) {
      for (let i = 0; i < 90; i++) {
        const x = api.hash(i, 1) * W;
        const y = api.hash(i, 2) * H;
        ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.5 * api.noise1(t * 2 + i, i)})`;
        ctx.fillRect(x, y, 2.5 * S, 2.5 * S);
      }
    }

    // collect glyphs with depth
    const items = [];
    s.rings.forEach((ring, ri) => {
      const speed = 0.45 * ring.dir * (1 + ri * 0.15);
      const phase = t * speed + ri * 1.3;
      for (const ch of ring.lay.chars) {
        if (!ch.c.trim()) continue;
        const a = ((ch.x + ch.w / 2) / ring.total) * Math.PI * 2 + phase;
        const x = Math.sin(a) * R;
        const z = Math.cos(a) * R; // + = towards viewer
        items.push({ ch, a, x, z, ri, ring });
      }
    });
    items.sort((A, B) => A.z - B.z);

    const drawGlyph = (it) => {
      const { ring } = it;
      const facing = Math.cos(it.a); // 1 front, -1 back
      const persp = 1 + (it.z / R) * 0.18;
      const yy = cy + ring.y * (0.6 + 0.4 * intro) + it.z * Math.sin(tilt) * 0.55;
      ctx.save();
      ctx.translate(cx + it.x, yy);
      ctx.transform(facing * persp, -Math.sin(it.a) * Math.sin(tilt) * 0.5 * persp, 0, persp, 0, 0);
      ctx.font = api.font(ring.size, 'Syne', 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const col = it.ri % 2 ? p.accent : p.ink;
      ctx.fillStyle = facing > 0 ? col : api.rgba(col, 0.25);
      ctx.globalAlpha = intro;
      ctx.fillText(it.ch.c, 0, 0);
      ctx.restore();
    };

    for (const it of items) if (it.z < 0) drawGlyph(it);

    // planet
    const g = ctx.createRadialGradient(cx - planetR * 0.35, cy - planetR * 0.4, planetR * 0.1, cx, cy, planetR);
    g.addColorStop(0, '#ffe2a8');
    g.addColorStop(0.35, p.planetA);
    g.addColorStop(1, p.planetB);
    ctx.save();
    ctx.shadowColor = p.planetA;
    ctx.shadowBlur = 80 * S;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, planetR), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // terminator shade
    const sh = ctx.createLinearGradient(cx - planetR, cy - planetR, cx + planetR, cy + planetR);
    sh.addColorStop(0.45, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(10,0,30,0.55)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, planetR), 0, Math.PI * 2);
    ctx.fill();

    for (const it of items) if (it.z >= 0) drawGlyph(it);
  },
};
