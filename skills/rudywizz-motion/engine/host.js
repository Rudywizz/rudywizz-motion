// Host page: builds a composition (one or more scenes), renders every scene to
// its own 2D canvas, then hands them to the WebGL compositor for camera,
// transitions and the cinematic post chain. Exposes window.RM for the CLI.
import * as rm from './rm.js';
import { normalizeComp, activeAt, clipTime } from './timeline.js';
import { cameraAt } from './camera.js';
import { Compositor } from './gl/compositor.js';

const styles = {};
async function loadStyle(id) {
  const safe = String(id).replace(/[^a-z0-9-]/gi, '');
  if (!styles[safe]) styles[safe] = (await import(`../styles/${safe}/style.js`)).default;
  return styles[safe];
}

function readParams() {
  const raw = decodeURIComponent(location.hash.slice(1) || '');
  return raw ? JSON.parse(raw) : {};
}

function showError(err) {
  const el = document.createElement('div');
  el.id = 'err';
  el.textContent = 'rudywizz-motion error:\n' + (err && err.stack ? err.stack : String(err));
  document.body.appendChild(el);
  window.RM = { ready: true, error: String(err && err.message ? err.message : err) };
}

const imgCache = new Map();
function loadImage(url) {
  if (imgCache.has(url)) return imgCache.get(url);
  const pr = new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('Cannot load image ' + url));
    im.src = url;
  });
  imgCache.set(url, pr);
  if (imgCache.size > 24) imgCache.delete(imgCache.keys().next().value);
  return pr;
}

function drawCover(ctx, img, W, H, { fit = 'cover', scale = 1, dx = 0, dy = 0, bg } = {}) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const k = (fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih)) * scale;
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(img, (W - iw * k) / 2 + dx, (H - ih * k) / 2 + dy, iw * k, ih * k);
}

function makeApi(canvas, W, H, p) {
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
  return {
    ...rm,
    // clean mode (GIF output): no per-frame grain, which would defeat GIF compression
    ...(p.clean ? { makeGrain: () => () => {} } : {}),
    canvas,
    ctx,
    W,
    H,
    p,
    S: Math.min(W, H) / 1080,
    fps: p.fps,
    duration: p.duration,
    frameOf: (t) => Math.round(t * p.fps),
    rand: rm.rng(p.seed),
    bg(color) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (p.overlay) return; // drawing on top of another scene: never wipe it
      ctx.clearRect(0, 0, W, H);
      if (!p.alpha && color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, H);
      }
    },
    loadImage,
    asset: (path) => `/engine/${path}`,
  };
}

async function styleRuntime(id, canvas, W, H, base) {
  const style = await loadStyle(id);
  const p = { ...style.defaults, ...base };
  if (p.text == null || p.text === '') p.text = style.defaults.text ?? '';
  p.text = String(p.text);
  if (p.lang == null || p.lang === 'auto') p.lang = /[ğĞşŞıİ]/.test(p.text) ? 'tr' : undefined;
  const api = makeApi(canvas, W, H, p);
  const state = (await style.setup?.(api)) || {};
  return {
    style,
    p,
    async draw(t) {
      const ctx = api.ctx;
      ctx.save();
      await style.frame(api, Math.max(0, Math.min(t, p.duration)), state);
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
    },
  };
}

async function sceneRuntime(sc, comp) {
  const { width: W, height: H, fps, seed } = comp;
  const canvas = rm.offscreen(W, H);
  const ctx = canvas.getContext('2d', { alpha: true });
  const common = { fps, seed: seed + sc.i * 17, duration: sc.duration, clean: !!comp.clean, ...(comp.lang ? { lang: comp.lang } : {}) };
  let base;
  if (sc.type === 'style') {
    const r = await styleRuntime(sc.style, canvas, W, H, { ...sc.params, ...common, alpha: !!comp.alpha });
    base = (t) => r.draw(t);
  } else if (sc.type === 'image') {
    const layers = sc.layers ? sc.layers.map((l) => ({ depth: 0, ...l })) : [{ src: sc.src, depth: 0 }];
    for (const l of layers) l.img = await loadImage(l.src);
    base = (t, cam) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (sc.params.bg || sc.bg) {
        ctx.fillStyle = sc.params.bg || sc.bg;
        ctx.fillRect(0, 0, W, H);
      }
      const u = t / sc.duration;
      for (const l of layers) {
        // parallax: deeper layers (depth>0 = closer) move further with the camera
        const d = l.depth || 0;
        drawCover(ctx, l.img, W, H, {
          fit: l.fit || sc.fit || 'cover',
          scale: (l.scale || 1) * (1 + d * 0.06 + (cam.zoom - 1) * d * 0.6),
          dx: (-cam.x * W * d * 0.8) + (l.x || 0) * W + d * (u - 0.5) * W * 0.04,
          dy: (-cam.y * H * d * 0.8) + (l.y || 0) * H,
        });
      }
    };
  } else if (sc.type === 'clip') {
    const fr = sc.frames;
    if (!fr) throw new Error(`Clip "${sc.clip}" has no extracted frames (render through the CLI)`);
    base = async (t) => {
      const ct = clipTime(sc, t);
      const idx = Math.max(0, Math.min(fr.count - 1, Math.round(ct * fr.fps)));
      const im = await loadImage(`${fr.base}${String(idx + 1).padStart(6, '0')}.jpg`);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(im, 0, 0, W, H);
    };
  } else {
    base = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = sc.color || '#000';
      ctx.fillRect(0, 0, W, H);
    };
  }
  let overlay = null;
  if (sc.overlay && sc.overlay.style) {
    const { style, ...rest } = sc.overlay;
    overlay = await styleRuntime(style, canvas, W, H, { ...rest, ...common, alpha: true, overlay: true, duration: rest.duration ?? sc.duration });
  }
  const look = sc.look ? (typeof sc.look === 'string' ? { type: sc.look } : sc.look) : { type: 'none' };
  return {
    sc,
    canvas,
    look,
    async draw(t, cam) {
      await base(t, cam);
      if (overlay) await overlay.draw(t - (sc.overlay.at || 0));
    },
  };
}

async function main() {
  const input = readParams();
  // preload styles referenced anywhere (needed for default durations + fonts)
  const ids = new Set();
  const scan = (o) => {
    if (!o || typeof o !== 'object') return;
    if (typeof o.style === 'string') ids.add(o.style);
    for (const v of Object.values(o)) if (typeof v === 'object') scan(v);
  };
  scan(input);
  await Promise.all([...ids].map(loadStyle));
  const comp = normalizeComp(input, (id) => styles[id]?.defaults);
  const W = comp.width;
  const H = comp.height;

  // fonts
  const sample = 'AaĞğŞşİıÇçÖöÜü' + JSON.stringify(input).slice(0, 400);
  const fonts = new Set();
  for (const id of ids) for (const f of styles[id].fonts || []) fonts.add(JSON.stringify(Array.isArray(f) ? f : [f, 400]));
  await Promise.all([...fonts].map((s) => {
    const [family, weight = 400, style = 'normal'] = JSON.parse(s);
    return document.fonts.load(`${style} ${weight} 100px "${family}"`, sample);
  }));
  await document.fonts.ready;

  const comp2d = new Compositor(document.getElementById('c'), W, H);
  const scenes = [];
  for (const sc of comp.scenes) scenes.push(await sceneRuntime(sc, comp));
  const overlayCanvas = comp.overlays.length ? rm.offscreen(W, H) : null;
  const overlays = [];
  for (const [k, ov] of comp.overlays.entries()) {
    const { style, from = 0, to = comp.duration, ...rest } = ov;
    overlays.push({ from, to, r: await styleRuntime(style, overlayCanvas, W, H, { ...rest, fps: comp.fps, seed: comp.seed + 99 + k, duration: to - from, alpha: true, overlay: true, clean: !!comp.clean, ...(comp.lang ? { lang: comp.lang } : {}) }) });
  }

  const post = { grain: 0.035, vignette: 0.25, ...comp.look, opaque: !comp.alpha };
  const camCtx = { bpm: comp.bpm || comp.look.bpm, seed: comp.seed };
  const shutter = comp.shutter ?? 0.5; // fraction of a frame the "shutter" is open

  const camSamples = (rt, lt) => {
    const spec = rt.sc.camera;
    const now = cameraAt(spec, lt, rt.sc.duration, camCtx);
    if (!comp.cameraBlur || !spec) return { cams: [now], lens: now.lens };
    const prev = cameraAt(spec, lt - shutter / comp.fps, rt.sc.duration, camCtx);
    const motion = Math.max(
      Math.abs(now.x - prev.x) * W, Math.abs(now.y - prev.y) * H,
      Math.abs(now.zoom - prev.zoom) * H * 0.5, Math.abs(now.rot - prev.rot) * H * 0.5,
      Math.abs(now.tx - prev.tx) * H * 0.6, Math.abs(now.ty - prev.ty) * H * 0.6,
    );
    const n = Math.max(1, Math.min(16, Math.ceil(motion / 2.5)));
    const cams = [];
    for (let k = 0; k < n; k++) cams.push(cameraAt(spec, lt - (k / Math.max(1, n - 1)) * (shutter / comp.fps) * (n > 1 ? 1 : 0), rt.sc.duration, camCtx));
    return { cams, lens: now.lens };
  };

  const sceneInput = async (rt, lt, t) => {
    const { cams, lens } = camSamples(rt, lt);
    await rt.draw(lt, cams[0]);
    const lk = rt.look;
    const revealDur = lk.reveal ?? rt.sc.duration * 0.75;
    return {
      canvas: rt.canvas,
      look: lk.type,
      lookOpts: lk,
      reveal: rm.clamp((lt - (lk.delay ?? 0.15)) / Math.max(0.01, revealDur)),
      cams,
      lens,
      seed: rt.sc.i + 1,
      time: t,
    };
  };

  const renderAt = async (t, scale, accumulate) => {
    const act = activeAt(comp, t);
    const ra = scenes[act.a.i];
    const A = await sceneInput(ra, t - act.a.start, t);
    let B = null;
    if (act.b) B = await sceneInput(scenes[act.b.i], t - act.b.start, t);
    if (overlayCanvas) {
      const octx = overlayCanvas.getContext('2d');
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, W, H);
      for (const ov of overlays) if (t >= ov.from && t <= ov.to) await ov.r.draw(t - ov.from);
    }
    const fr = Math.floor(t * 24);
    const weave = post.weave ? [(rm.hash(fr, 1) - 0.5) * 0.003 * post.weave, (rm.hash(fr, 2) - 0.5) * 0.004 * post.weave] : [0, 0];
    comp2d.frame({
      a: A,
      b: B,
      tr: act.b ? { type: act.tr.type, dir: act.tr.dir, p: act.p } : null,
      overlay: overlayCanvas,
      post,
      time: t,
      seed: comp.seed,
      lens: A.lens + (B ? B.lens * act.p : 0),
      weave,
      scale,
      accumulate,
    });
  };

  const render = async (t) => {
    const M = comp.motionBlur;
    if (M <= 1) return renderAt(t, 1, false);
    comp2d.clearAccum();
    for (let m = 0; m < M; m++) await renderAt(Math.max(0, t + ((m + 0.5) / M - 0.5) * (shutter / comp.fps)), 1 / M, true);
    comp2d.presentAccum();
  };

  window.RM = { ready: true, duration: comp.duration, fps: comp.fps, width: W, height: H, render };

  if (input.preview) {
    document.body.classList.add('preview');
    const bar = document.createElement('div');
    bar.id = 'bar';
    document.body.appendChild(bar);
    let paused = false;
    let t0 = performance.now();
    let pausedAt = 0;
    addEventListener('keydown', (e) => {
      if (e.code !== 'Space') return;
      paused = !paused;
      if (paused) pausedAt = (performance.now() - t0) / 1000;
      else t0 = performance.now() - pausedAt * 1000;
    });
    const loop = async () => {
      const now = paused ? pausedAt : (performance.now() - t0) / 1000;
      const t = now % comp.duration;
      await render(Math.floor(t * comp.fps) / comp.fps);
      bar.textContent = `${t.toFixed(2)}s / ${comp.duration.toFixed(2)}s  ·  space = pause`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}

main().catch(showError);
