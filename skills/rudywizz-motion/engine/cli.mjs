#!/usr/bin/env node
// rudywizz-motion CLI — cinematic, code-rendered motion graphics.
// Every frame is computed (no real-time capture), so renders are exact and repeatable.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeComp, clipTime, TRANSITIONS, LOOKS, GRADES } from './timeline.js';
import { CAMERA_PRESETS } from './camera.js';
import { validateComp, suggest } from './validate.js';
import { synthMusic, writeWav, MOODS } from './music.mjs';

const ENGINE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(ENGINE_DIR, '..');
const STYLES_DIR = path.join(ROOT, 'styles');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '0.0.0';

const FORMATS = { '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350], '16:9': [1920, 1080] };

const HELP = `rudywizz-motion — cinematic motion graphics rendered from code.

Usage
  rudywizz-motion list                          Styles, cameras, transitions, looks, grades
  rudywizz-motion templates                     Ready-made compositions
  rudywizz-motion render <style> [options]      One style → video
  rudywizz-motion render <comp.json|template>   A whole composition (scenes, clips, maps…)
  rudywizz-motion still <style|comp> --at <s>   One frame → PNG
  rudywizz-motion preview <style|comp>          Live looping preview in your browser
  rudywizz-motion music [mood] --duration <s>   Code-made, royalty-free music → .wav
  rudywizz-motion doctor                        Check ffmpeg / browser / WebGL
  rudywizz-motion init [reel.json]              Write a starter composition to edit
  rudywizz-motion --version

Content
  --text "..."           Text (use "\\n" or " / " for line breaks)
  --image <file>         Animate an image instead of a style (jpg/png/svg)
  --clip <file>          Animate a video clip instead of a style
  --set key=value        Style option (repeatable, JSON values ok)
  --params <file.json>   Style options from a file

Camera & look
  --camera <preset>      e.g. punch-in, drift, orbit, tilt-reveal, handheld, beat-punch
  --look <name>          Image/clip filter: engrave, sketch, oldphoto, duotone, halftone, noir…
  --grade <name>         Colour grade: teal-orange, kodak, fuji, sepia, noir, bleach, cyber, sunset, matte
  --bloom <0-1>  --grain <0-0.2>  --leak <0-1>  --film <0-1>  --aberration <0-1>  --vignette <0-1>
  --motion-blur <n>      Sub-frames per frame (4–8 = filmic, slower)
  --bpm <n>              Tempo for beat-synced cameras/styles

Output
  --out <file>           .mp4 (H.264) | .mov (ProRes 4444, alpha) | .webm (VP9, alpha) | .gif | .webp (animated)
  --format <ratio>       9:16 (default) | 1:1 | 4:5 | 16:9
  --size <px>            Short side in px (default 1080)
  --duration <s>  --fps <n>  --seed <n>  --lang <tr|en…>
  --alpha                Transparent background (.mov / .webm)
  --audio <file>         Mux an audio track
  --music <mood>         Add code-made music: upbeat | chill | retro | cinematic (ducks under voices)
  --crf <n>              H.264 quality (default 18)
  --clean                No animated grain/film (automatic for .gif / .webp)
  --quiet  --json  --strict (treat warnings as errors)

Docs: https://github.com/Rudywizz/rudywizz-motion
`;

// ---------------------------------------------------------------- args
const FLAGS = new Set(['alpha', 'quiet', 'help', 'no-open', 'json', 'keep-frames', 'clean', 'version', 'strict', 'force']);
const OPTIONS = new Set([
  'text', 'image', 'clip', 'set', 'params', 'camera', 'look', 'grade', 'bloom', 'grain', 'leak', 'film', 'aberration', 'vignette',
  'distortion', 'weave', 'motion-blur', 'bpm', 'out', 'format', 'size', 'duration', 'fps', 'seed', 'lang', 'audio', 'crf', 'at', 'music', 'key',
]);
function parseArgs(argv) {
  const args = { _: [], set: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-v') {
      args.version = true;
      continue;
    }
    if (a === '-h') {
      args.help = true;
      continue;
    }
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    let key = a.slice(2);
    let val;
    const eq = key.indexOf('=');
    if (eq > -1 && key !== 'set') {
      val = key.slice(eq + 1);
      key = key.slice(0, eq);
    } else if (FLAGS.has(key)) {
      args[key] = true;
      continue;
    } else if (!OPTIONS.has(key)) {
      const hint = suggest(key, [...OPTIONS, ...FLAGS]);
      die(`Unknown option --${key}.${hint ? ` Did you mean --${hint}?` : ''} Run \`rudywizz-motion help\`.`);
    } else {
      val = argv[++i];
      if (val === undefined) die(`Missing value for --${key}`);
    }
    if (key === 'set') {
      const j = val.indexOf('=');
      if (j < 1) die(`--set expects key=value, got "${val}"`);
      args.set[val.slice(0, j)] = parseValue(val.slice(j + 1));
    } else args[key] = val;
  }
  // numbers: fail loudly instead of silently falling back to defaults
  const NUM = {
    size: [16, 4320], duration: [0.1, 3600], fps: [1, 120], seed: [-1e9, 1e9], bpm: [20, 400], crf: [0, 51], at: [0, 3600],
    'motion-blur': [1, 16], bloom: [0, 2], grain: [0, 1], leak: [0, 2], film: [0, 2], aberration: [0, 2], vignette: [0, 2], distortion: [-2, 2], weave: [0, 4],
  };
  for (const [k, [lo, hi]] of Object.entries(NUM)) {
    if (args[k] == null) continue;
    const n = Number(args[k]);
    if (!Number.isFinite(n) || n < lo || n > hi) die(`--${k} expects a number between ${lo} and ${hi}, got "${args[k]}".`);
  }
  return args;
}
const parseValue = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};
function die(msg, code = 1) {
  process.stderr.write(`\x1b[31merror\x1b[0m ${msg}\n`);
  process.exit(code);
}
const say = (quiet, m) => !quiet && process.stderr.write(m + '\n');

// ---------------------------------------------------------------- styles
const styleIds = () =>
  fs.readdirSync(STYLES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(STYLES_DIR, d.name, 'style.js'))).map((d) => d.name).sort();
const styleCache = {};
async function styleMod(id) {
  if (!styleCache[id]) styleCache[id] = (await import(pathToFileURL(path.join(STYLES_DIR, id, 'style.js')).href)).default;
  return styleCache[id];
}

// ---------------------------------------------------------------- media server
// Local-only (127.0.0.1, random port). Every URL carries a random per-run token, so
// other local processes or web pages can't guess paths to the user's media.
const TOKEN = crypto.randomBytes(16).toString('hex');
const BASE = `/${TOKEN}`;
function startServer(media, comp) {
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.hdr': 'image/vnd.radiance' };
  const compJson = JSON.stringify(comp);
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel;
      try {
        rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      } catch {
        return res.writeHead(400).end();
      }
      if (req.method !== 'GET' || !rel.startsWith(BASE + '/')) return res.writeHead(404).end('not found');
      rel = rel.slice(BASE.length);
      if (rel === '/comp.json') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(compJson);
      }
      let file = null;
      const m = rel.match(/^\/media\/([a-z0-9]+)(?:\/([\w./ -]+))?$/);
      if (m && media.has(m[1])) {
        const ent = media.get(m[1]);
        if (ent.dir && m[2]) {
          // folders (clip frames, 3D model sets) may have sub-folders; never step outside the folder
          const f = path.resolve(ent.dir, m[2]);
          if (f.startsWith(path.resolve(ent.dir) + path.sep)) file = f;
        } else if (!ent.dir) file = ent.file;
      } else {
        const f = path.resolve(ROOT, '.' + rel);
        if (f.startsWith(ROOT + path.sep)) file = f;
      }
      if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('not found');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      server.pageUrl = `http://127.0.0.1:${server.address().port}${BASE}/engine/host.html`;
      resolve(server);
    });
  });
}

// ---------------------------------------------------------------- browser
async function launchBrowser({ soft = false } = {}) {
  let pw;
  try {
    pw = await import('playwright');
  } catch {
    try {
      pw = await import('playwright-core');
    } catch {
      die('Playwright is not installed. Run `npm install` in the rudywizz-motion folder.');
    }
  }
  const args = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--enable-webgl', '--font-render-hinting=none'];
  const attempts = [{}, { channel: 'chrome' }, { channel: 'msedge' }];
  if (process.env.RM_CHROME) attempts.unshift({ executablePath: process.env.RM_CHROME });
  let last;
  for (const extra of attempts) {
    try {
      return await pw.chromium.launch({ headless: true, args, ...extra });
    } catch (e) {
      last = e;
    }
  }
  if (soft) throw last;
  die('Could not start Chromium. Run `npx playwright install chromium`, install Chrome, or set RM_CHROME=/path/to/chrome.\n  ' + String(last?.message || last).split('\n')[0]);
}

function checkFfmpeg() {
  if (spawnSync('ffmpeg', ['-version']).error) die('ffmpeg not found. Install it: macOS `brew install ffmpeg`, Windows `winget install ffmpeg`, Linux `apt install ffmpeg`.');
}

// ---------------------------------------------------------------- build the composition
async function buildComp(args) {
  const target = args._[1];
  if (!target) die('Missing <style|comp.json|template>. Run `rudywizz-motion list`.');
  let comp;
  let baseDir = process.cwd();
  const tpl = path.join(TEMPLATES_DIR, `${target.replace(/^template:/, '')}.json`);
  if (target.endsWith('.json') || fs.existsSync(tpl)) {
    const file = target.endsWith('.json') ? path.resolve(target) : tpl;
    if (!fs.existsSync(file)) die(`File not found: ${file}`);
    try {
      comp = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    } catch (e) {
      die(`Invalid JSON in ${file}: ${e.message}`);
    }
    if (!comp || !Array.isArray(comp.scenes) || !comp.scenes.length) die(`${file} needs a non-empty "scenes" array. Run \`rudywizz-motion init\` for an example.`);
    baseDir = path.dirname(file);
    if (args.text != null && comp.scenes?.[0]) comp.scenes[0].text = String(args.text).replace(/\\n/g, '\n');
  } else {
    let scene;
    if (target === 'image' || args.image) scene = { image: args.image || args._[2] };
    else if (target === 'clip' || args.clip) scene = { clip: args.clip || args._[2] };
    else {
      if (!/^[a-z0-9-]+$/.test(target) || !styleIds().includes(target)) {
        const tpls = fs.existsSync(TEMPLATES_DIR) ? fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
        const s = suggest(target, [...styleIds(), ...tpls, 'image', 'clip']);
        die(`Unknown style, template or file "${target}".${s ? ` Did you mean "${s}"?` : ''} Run \`rudywizz-motion list\`.`);
      }
      scene = { style: target };
    }
    let fileParams = {};
    if (args.params) {
      try {
        fileParams = JSON.parse(fs.readFileSync(args.params, 'utf8'));
      } catch (e) {
        die(`Cannot read --params: ${e.message}`);
      }
    }
    Object.assign(scene, fileParams, args.set);
    if (args.text != null) scene.text = String(args.text).replace(/\\n/g, '\n');
    if (args.duration) scene.duration = Number(args.duration);
    if (args.camera) scene.camera = args.camera;
    if (args.look) scene.look = args.look;
    comp = { scenes: [scene] };
  }
  // global overrides
  const fmt = args.format || comp.format || '9:16';
  if (!FORMATS[fmt]) die(`Unknown --format "${fmt}". Use: ${Object.keys(FORMATS).join(', ')}`);
  let [w, h] = comp.width && comp.height && !args.format ? [comp.width, comp.height] : FORMATS[fmt];
  if (args.size) {
    const s = Number(args.size) / Math.min(w, h);
    w = Math.round((w * s) / 2) * 2;
    h = Math.round((h * s) / 2) * 2;
  } else if (comp.width && comp.height && !args.format) {
    // keep
  }
  comp.width = w;
  comp.height = h;
  if (args.fps) comp.fps = Number(args.fps);
  if (args.seed) comp.seed = Number(args.seed);
  if (args.lang) comp.lang = args.lang;
  if (args.alpha) comp.alpha = true;
  if (args.bpm) comp.bpm = Number(args.bpm);
  if (args['motion-blur']) comp.motionBlur = Number(args['motion-blur']);
  comp.look = { ...(comp.look || {}) };
  for (const k of ['grade', 'bloom', 'grain', 'leak', 'film', 'aberration', 'vignette', 'distortion', 'weave']) if (args[k] != null) comp.look[k] = k === 'grade' ? args[k] : Number(args[k]);
  if (args.duration && comp.scenes.length === 1) comp.scenes[0].duration = Number(args.duration);
  // GIFs compress badly with animated grain: render them clean unless asked otherwise
  if (args.clean || (/\.(gif|webp)$/i.test(String(args.out || '')) && args.grain == null)) {
    comp.clean = true;
    comp.look.grain = 0;
    comp.look.film = Math.min(comp.look.film ?? 0, 0.2);
  }
  if (args.audio) comp.audio = path.resolve(args.audio);
  else if (comp.audio) comp.audio = path.resolve(baseDir, comp.audio);
  if (args.music) comp.music = args.music;

  // validate everything (typos fail loudly instead of rendering a black scene)
  const mods = {};
  for (const id of styleIds()) {
    try {
      mods[id] = await styleMod(id);
    } catch (e) {
      process.stderr.write(`\x1b[33mwarning\x1b[0m style "${id}" failed to load: ${e.message}\n`);
    }
  }
  const { errors, warnings } = validateComp(comp, mods);
  for (const w of warnings) process.stderr.write(`\x1b[33mwarning\x1b[0m ${w}\n`);
  if (errors.length || (args.strict && warnings.length)) die(errors.concat(args.strict ? warnings : []).join('\n      '));
  return { comp, baseDir };
}

/** Rewrites media paths to /media/<id> URLs and extracts clip frames. */
function prepareMedia(comp, baseDir, quiet) {
  const media = new Map();
  let n = 0;
  const reg = (file) => {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(String(file)) || String(file).startsWith('data:'))
      die(`"${String(file).slice(0, 80)}" is a URL. rudywizz-motion never downloads anything: save the file locally and pass its path.`);
    const abs = path.resolve(baseDir, String(file));
    if (!fs.existsSync(abs)) die(`Media file not found: ${abs}`);
    const id = 'm' + n++;
    media.set(id, { file: abs });
    return `${BASE}/media/${id}`;
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-frames-'));
  const norm = normalizeComp(comp, (id) => styleCache[id]?.defaults);
  // style options that take image files (e.g. card-carousel `images`) are served like any other media
  // a folder of 3D models (room `models`): served whole, so .gltf files find their .bin and textures
  const regModels = (o) => {
    for (const host of [o, o?.params]) {
      if (!host || typeof host.models !== 'string') continue;
      const abs = path.resolve(baseDir, host.models);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) die(`Models folder not found: ${abs}`);
      const id = 'm' + n++;
      media.set(id, { dir: abs });
      host.models = `${BASE}/media/${id}/`;
    }
  };
  const regStyleImages = (o) => {
    if (o && Array.isArray(o.images)) o.images = o.images.map((f) => (f ? reg(f) : f));
    if (o?.params && Array.isArray(o.params.images)) o.params.images = o.params.images.map((f) => (f ? reg(f) : f));
  };
  // pixel character rigs (presenter `cast[].rig`): rig.json + the layer PNGs it lists, served as media
  const regRigs = (o) => {
    for (const host of [o, o?.params]) {
      if (!host || !Array.isArray(host.cast)) continue;
      host.cast = host.cast.map((c) => {
        if (!c || typeof c.rig !== 'string' || c.rig === 'bit') return c;
        const abs = path.resolve(baseDir, c.rig);
        if (!fs.existsSync(abs)) die(`Rig not found: ${abs}`);
        let rig;
        try { rig = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (e) { die(`Rig ${abs} is not valid JSON: ${e.message}`); }
        const dir = path.dirname(abs);
        const r = (f) => (f ? reg(path.resolve(dir, f)) : f);
        rig.layers = (rig.layers || []).map((l) => ({ ...l, src: r(l.src) }));
        rig.eyes = (rig.eyes || []).map((e) => ({ ...e, src: r(e.src) }));
        rig.brows = (rig.brows || []).map((b) => ({ ...b, src: r(b.src) }));
        rig.mouths = (rig.mouths || []).map((m) => r(m));
        rig.poses = Object.fromEntries(Object.entries(rig.poses || {}).map(([k, v]) => [k, { ...v, src: r(v.src) }]));
        return { ...c, rig };
      });
    }
  };
  for (const ov of comp.overlays || []) regStyleImages(ov);
  // dialogue audio (`voices`): served as a loudness envelope per frame; the files are mixed in after rendering
  const regLineVoices = (o) => {
    for (const host of [o, o?.params]) {
      if (!host || !Array.isArray(host.lines)) continue;
      host.lines = host.lines.map((l) => (l && typeof l.voice === 'string' ? (checkFfmpeg(), { ...l, voice: analyzeVoice(path.resolve(baseDir, l.voice), norm.fps) }) : l));
    }
  };
  for (const ov of comp.overlays || []) {
    regRigs(ov);
    regLineVoices(ov);
    if (Array.isArray(ov.voices)) ov.voices = ov.voices.map((f) => (f ? (checkFfmpeg(), analyzeVoice(path.resolve(baseDir, String(f)), norm.fps)) : null));
  }
  const regVoices = (o) => {
    regRigs(o);
    regLineVoices(o);
    if (!o || !Array.isArray(o.voices)) return;
    checkFfmpeg();
    o.voices = o.voices.map((f) => (f ? analyzeVoice(path.resolve(baseDir, String(f)), norm.fps) : null));
    if (o.duration == null && !(o.params && o.params.duration != null)) {
      // fit the scene to its dialogue: voiced lines + a beat for the rest
      const lines = String(o.text || o.params?.text || '').split(/\n|\s\/\s/).filter((l) => l.trim()).length;
      const voiced = o.voices.filter(Boolean);
      o.duration = Math.round((voiced.reduce((n, v) => n + v.dur + 0.45, 0) + Math.max(0, lines - voiced.length) * 1.4 + 0.9) * 100) / 100;
    }
  };
  comp.scenes.forEach((sc, i) => {
    regVoices(sc);
    regVoices(sc.params);
    regStyleImages(sc);
    regStyleImages(sc.overlay);
    regModels(sc);
    if (sc.image) sc.src = reg(sc.image);
    if (Array.isArray(sc.layers)) sc.layers = sc.layers.map((l) => ({ ...l, src: reg(l.src || l.image) }));
    if (sc.clip) {
      checkFfmpeg();
      const abs = path.resolve(baseDir, sc.clip);
      if (!fs.existsSync(abs)) die(`Clip not found: ${abs}`);
      const ns = norm.scenes[i];
      const need = clipTime(ns, ns.duration) + 0.2;
      const dir = path.join(tmp, 'c' + i);
      fs.mkdirSync(dir);
      say(quiet, `  extracting ${path.basename(abs)} (${need.toFixed(1)}s)…`);
      const fps = norm.fps * (typeof ns.speed === 'number' && ns.speed > 1 ? ns.speed : 2);
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(sc.in || 0), '-i', abs, '-t', String(need), '-vf', `fps=${fps},scale=${norm.width}:${norm.height}:force_original_aspect_ratio=increase,crop=${norm.width}:${norm.height}`, '-q:v', '3', path.join(dir, '%06d.jpg')]);
      if (r.status !== 0) die(`ffmpeg could not read ${abs}:\n${r.stderr}`);
      const count = fs.readdirSync(dir).length;
      if (!count) die(`No frames extracted from ${abs} (check "in" and duration).`);
      const id = 'c' + i;
      media.set(id, { dir });
      sc.frames = { base: `${BASE}/media/${id}/`, count, fps };
    }
  });
  return { media, tmp, norm };
}

const VOICES = new Map(); // id → absolute audio file
function analyzeVoice(abs, fps) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(abs)) die('rudywizz-motion never downloads anything: save the voice file locally.');
  if (!fs.existsSync(abs)) die(`Voice file not found: ${abs}`);
  const SR = 8000;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', abs, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) die(`ffmpeg could not read ${abs}:\n${r.stderr}`);
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2));
  const per = SR / fps;
  const n = Math.ceil(pcm.length / per);
  const env = new Array(n);
  for (let f = 0; f < n; f++) {
    let sum = 0;
    const a = Math.floor(f * per), b = Math.min(pcm.length, Math.floor((f + 1) * per));
    for (let i = a; i < b; i++) sum += pcm[i] * pcm[i];
    env[f] = Math.sqrt(sum / Math.max(1, b - a)) / 32768;
  }
  // normalise to the loud part of the line (95th percentile), gate the noise floor
  const sorted = [...env].sort((x, y) => x - y);
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const gate = ref * 0.12;
  const id = 'v' + VOICES.size;
  VOICES.set(id, abs);
  return { id, dur: Math.round((pcm.length / SR) * 1000) / 1000, env: env.map((v) => Math.round(Math.min(1, Math.max(0, (v - gate) / (ref - gate))) * 100) / 100) };
}

/** Mix voice cues (+ the music bed, ducked under the voices) into one track exactly `duration` long. */
function mixAudio(cues, music, duration, tmp, volume = 0.5) {
  const inputs = [];
  const voices = [];
  for (const c of cues) {
    const file = VOICES.get(c.id);
    if (!file) continue;
    inputs.push('-i', file);
    const ms = Math.max(0, Math.round(c.at * 1000));
    voices.push(`[${voices.length}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${voices.length}]`);
  }
  if (!voices.length) return music || null;
  const k = voices.length;
  const chains = [...voices, `${Array.from({ length: k }, (_, i) => `[v${i}]`).join('')}amix=inputs=${k}:normalize=0:dropout_transition=0[vox]`];
  let last = '[vox]';
  if (music) {
    inputs.push('-i', music);
    // the music dips while someone speaks and comes back up in the gaps
    chains.push(`[${k}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${volume}[mus]`, '[vox]asplit[va][vb]', '[mus][va]sidechaincompress=threshold=0.015:ratio=6:attack=25:release=450[duck]', '[duck][vb]amix=inputs=2:normalize=0:dropout_transition=0[all]');
    last = '[all]';
  }
  const out = path.join(tmp, 'mix.wav');
  const graph = `${chains.join(';')};${last}apad,atrim=0:${duration.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,alimiter=limit=0.89[out]`; // social-media loudness (-14 LUFS)
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[out]', '-ac', '2', out]);
  if (r.status !== 0) die(`ffmpeg could not mix the voices:\n${r.stderr}`);
  return out;
}

/** comp.music → a generated WAV as long as the video (null when there is none or a file was given). */
function musicFor(comp, duration, tmp, quiet) {
  if (!comp.music || comp.audio) return null;
  const m = typeof comp.music === 'string' ? { mood: comp.music } : comp.music;
  const t0 = Date.now();
  let track;
  try {
    track = synthMusic({ mood: m.mood, duration, bpm: m.bpm ?? comp.bpm, key: m.key, seed: m.seed ?? comp.seed });
  } catch (e) {
    die(e.message);
  }
  const file = path.join(tmp, 'music.wav');
  writeWav(file, track);
  say(quiet, `  music: ${track.mood}, ${track.bpm} bpm, ${duration.toFixed(1)}s (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  return file;
}

async function openPage(browser, server, comp, extra = {}) {
  const page = await browser.newPage({ viewport: { width: comp.width, height: comp.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  void extra;
  await page.goto(server.pageUrl);
  try {
    await page.waitForFunction(() => window.RM && window.RM.ready, null, { timeout: 120000 });
  } catch {
    die('Composition did not become ready in 120s.' + (errors.length ? '\n  ' + errors.join('\n  ') : ''));
  }
  const info = await page.evaluate(() => ({ error: window.RM.error, duration: window.RM.duration, fps: window.RM.fps, width: window.RM.width, height: window.RM.height }));
  if (info.error) die(`Render setup failed: ${info.error}${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  return { page, info, errors };
}

function ffmpegArgs(out, { fps, alpha, audio, crf, width }) {
  const ext = path.extname(out).toLowerCase();
  const input = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
  const aud = audio ? ['-i', audio] : [];
  const map = audio ? ['-map', '0:v', '-map', '1:a', '-shortest'] : [];
  switch (ext) {
    case '.mp4':
      if (alpha) die('MP4 cannot hold transparency. Use .mov or .webm with --alpha.');
      return [...input, ...aud, ...map, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ...(audio ? ['-c:a', 'aac', '-b:a', '192k'] : []), out];
    case '.mov':
      return [...input, ...aud, ...map, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', alpha ? 'yuva444p10le' : 'yuv444p10le', ...(audio ? ['-c:a', 'pcm_s16le'] : []), out];
    case '.webm':
      return [...input, ...aud, ...map, '-c:v', 'libvpx-vp9', '-pix_fmt', alpha ? 'yuva420p' : 'yuv420p', '-b:v', '0', '-crf', '30', '-row-mt', '1', ...(audio ? ['-c:a', 'libopus'] : []), out];
    case '.gif':
      return [...input, '-vf', `fps=${Math.min(fps, 15)},scale=${Math.min(width, 480)}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, '-loop', '0', out];
    case '.webp': // animated WebP: ~5–8× smaller than GIF, full colour, alpha; plays in browsers and GitHub READMEs
      return [...input, '-vf', `fps=${Math.min(fps, 24)},scale=${Math.min(width, 720)}:-2:flags=lanczos`, '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', '72', '-compression_level', '6', '-loop', '0', ...(alpha ? ['-pix_fmt', 'yuva420p'] : []), out];
    default:
      die(`Unsupported output "${ext}". Use .mp4, .mov, .webm, .gif or .webp`);
  }
}

async function withPage(args, fn, extra) {
  const { comp, baseDir } = await buildComp(args);
  const { media, tmp } = prepareMedia(comp, baseDir, args.quiet);
  const server = await startServer(media, { ...comp, ...(extra || {}) });
  const browser = await launchBrowser();
  try {
    const { page, info } = await openPage(browser, server, comp, extra);
    return await fn(page, info, comp, tmp);
  } finally {
    await browser.close();
    server.close();
    if (!args['keep-frames']) fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function render(args) {
  checkFfmpeg();
  const name = path.basename(args._[1] || 'out').replace(/\.json$/, '');
  const out = path.resolve(args.out || `${name}.mp4`);
  ffmpegArgs(out, { fps: 30, alpha: !!args.alpha, crf: 18, width: 1080 }); // fail fast on a bad extension / alpha combo
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const t0 = Date.now();
  await withPage(args, async (page, info, comp, tmp) => {
    const total = Math.round(info.duration * info.fps);
    const cues = await page.evaluate(() => window.RM.cues || []);
    const bed = comp.audio || musicFor(comp, info.duration, tmp, args.quiet);
    const vol = typeof comp.music === 'object' && comp.music.volume != null ? Number(comp.music.volume) : 0.5;
    const audio = cues.length ? mixAudio(cues, bed, info.duration, tmp, vol) : bed;
    if (cues.length && !args.quiet) say(args.quiet, `  mixed ${cues.length} voice line${cues.length > 1 ? 's' : ''}${bed ? ' over the music' : ''}`);
    const ff = spawn('ffmpeg', ffmpegArgs(out, { fps: info.fps, alpha: !!comp.alpha, audio, crf: Number(args.crf ?? 18), width: info.width }), { stdio: ['pipe', 'inherit', 'pipe'] });
    let ffErr = '';
    let ffDead = false;
    ff.stderr.on('data', (d) => (ffErr += d));
    ff.stdin.on('error', () => (ffDead = true)); // ffmpeg exited early (EPIPE): report its stderr below
    ff.on('error', (e) => die(`Could not start ffmpeg: ${e.message}`));
    const done = new Promise((r) => ff.on('close', (c) => ((ffDead = true), r(c))));
    for (let i = 0; i < total && !ffDead; i++) {
      await page.evaluate((t) => window.RM.render(t), i / info.fps);
      const buf = await page.screenshot({ type: 'png', omitBackground: !!comp.alpha });
      if (!ff.stdin.write(buf)) await Promise.race([new Promise((r) => ff.stdin.once('drain', r)), done]);
      if (!args.quiet && (i % 10 === 0 || i === total - 1)) process.stderr.write(`\r  ${name}  frame ${i + 1}/${total}  ${Math.round(((i + 1) / total) * 100)}%   `);
    }
    ff.stdin.end();
    const code = await done;
    if (!args.quiet) process.stderr.write('\n');
    if (code !== 0) die(`ffmpeg failed (exit ${code}):\n${ffErr.trim() || '(no output)'}`);
    say(args.quiet, `  \x1b[32m✓\x1b[0m ${out}  (${info.width}x${info.height}, ${info.duration.toFixed(2)}s @ ${info.fps}fps, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    if (args.json) process.stdout.write(JSON.stringify({ out, ...info, frames: total }) + '\n');
  });
}

function music(args) {
  const mood = args._[1];
  if (!mood) {
    process.stdout.write('Moods (code-made, royalty-free; same seed = same track):\n');
    for (const [k, v] of Object.entries(MOODS)) process.stdout.write(`  ${k.padEnd(10)} ${v.bpm} bpm  ${v.desc}\n`);
    process.stdout.write('\nrudywizz-motion music upbeat --duration 30 --out music.wav [--bpm n] [--key F#] [--seed n]\n');
    return;
  }
  const out = path.resolve(args.out || `${mood}.wav`);
  if (path.extname(out).toLowerCase() !== '.wav') die('music writes a .wav file (e.g. --out music.wav).');
  const t0 = Date.now();
  let track;
  try {
    track = synthMusic({ mood, duration: Number(args.duration ?? 30), bpm: args.bpm && Number(args.bpm), key: args.key, seed: args.seed && Number(args.seed) });
  } catch (e) {
    die(e.message);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  writeWav(out, track);
  say(args.quiet, `  \x1b[32m✓\x1b[0m ${out}  (${track.mood}, ${track.bpm} bpm, ${track.duration.toFixed(1)}s, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (args.json) process.stdout.write(JSON.stringify({ out, mood: track.mood, bpm: track.bpm, duration: track.duration }) + '\n');
}

async function still(args) {
  const out = path.resolve(args.out || `${path.basename(args._[1] || 'still').replace(/\.json$/, '')}.png`);
  const at = Number(args.at ?? 2);
  await withPage(args, async (page, info, comp) => {
    await page.evaluate((t) => window.RM.render(t), Math.min(at, info.duration - 1 / info.fps));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, type: 'png', omitBackground: !!comp.alpha });
    say(args.quiet, `  \x1b[32m✓\x1b[0m ${out}  (t=${at}s)`);
  });
}

async function preview(args) {
  const { comp, baseDir } = await buildComp(args);
  const { media } = prepareMedia(comp, baseDir, false);
  const server = await startServer(media, { ...comp, preview: true });
  const url = server.pageUrl; // the composition is served by the local server, never put on a command line
  say(false, `  Preview: ${url}\n  Ctrl+C to stop.`);
  if (!args['no-open']) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
}

async function doctor() {
  let good = true;
  const ok = (b, m, fix) => {
    good &&= !!b;
    process.stdout.write(`  ${b ? '\x1b[32m✓' : '\x1b[31m✗'}\x1b[0m ${m}${!b && fix ? `\n      → ${fix}` : ''}\n`);
  };
  process.stdout.write(`rudywizz-motion ${VERSION} · Node ${process.versions.node} · ${process.platform}-${process.arch}\n`);
  ok(Number(process.versions.node.split('.')[0]) >= 18, 'Node.js 18+', 'Install Node 18 or newer from https://nodejs.org');
  const ff = spawnSync('ffmpeg', ['-version']);
  ok(!ff.error, ff.error ? 'ffmpeg' : `ffmpeg ${String(ff.stdout).split(' ')[2] || ''}`, 'macOS `brew install ffmpeg` · Windows `winget install ffmpeg` · Linux `sudo apt install ffmpeg`');
  let pw = null;
  try {
    pw = await import('playwright');
  } catch {}
  ok(!!pw, 'playwright', 'Run `npm install` in the rudywizz-motion folder');
  if (pw) {
    let browser = null;
    try {
      browser = await launchBrowser({ soft: true });
    } catch {}
    ok(!!browser, browser ? `browser ${browser.version()}` : 'browser', '`npx playwright install chromium`, or install Chrome / Edge, or set RM_CHROME=/path/to/chrome');
    if (browser) {
      const page = await browser.newPage();
      const gl2 = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
      ok(gl2, 'WebGL2', 'Update your GPU drivers or Chrome; headless SwiftShader should normally work');
      await browser.close();
    }
  }
  process.stdout.write(good ? '\n  All good. Try: rudywizz-motion render neon-sign --text "Hello"\n' : '\n  Fix the ✗ items above, then run doctor again.\n');
  if (!good) process.exitCode = 1;
}

function init(args) {
  const file = path.resolve(args._[1] || 'reel.json');
  if (fs.existsSync(file) && !args.force) die(`${file} already exists (use --force to overwrite).`);
  const starter = {
    $schema: 'https://raw.githubusercontent.com/Rudywizz/rudywizz-motion/main/skills/rudywizz-motion/schema/composition.schema.json',
    format: '9:16',
    look: { grade: 'teal-orange', bloom: 0.3, grain: 0.04, vignette: 0.3 },
    scenes: [
      { style: 'map-route', route: ['İstanbul', 'Roma'], text: 'Summer trip', duration: 5, transition: { type: 'whip', duration: 0.45 } },
      { style: 'split-flap', text: 'NEXT STOP / ROMA', duration: 3, camera: 'push-in', transition: { type: 'zoom', duration: 0.6 } },
      { style: 'neon-sign', text: 'See you / soon', duration: 3, camera: 'orbit' },
    ],
  };
  fs.writeFileSync(file, JSON.stringify(starter, null, 2) + '\n');
  say(false, `  \x1b[32m✓\x1b[0m ${file}\n  Edit it (your editor autocompletes from the schema), then:\n    rudywizz-motion still ${path.basename(file)} --at 2 --size 540\n    rudywizz-motion render ${path.basename(file)} --out reel.mp4`);
}

// ---------------------------------------------------------------- main
const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
if (args.version || cmd === 'version') process.stdout.write(`${VERSION}\n`);
else if (!cmd || args.help || cmd === 'help') process.stdout.write(HELP);
else if (cmd === 'init') init(args);
else if (cmd === 'list') {
  const ids = styleIds();
  const rows = [];
  for (const id of ids) rows.push({ id, tagline: (await styleMod(id)).tagline });
  if (args.json) process.stdout.write(JSON.stringify({ styles: rows, cameras: Object.keys(CAMERA_PRESETS), transitions: TRANSITIONS, looks: LOOKS, grades: GRADES }, null, 2) + '\n');
  else {
    process.stdout.write('Styles\n');
    for (const r of rows) process.stdout.write(`  ${r.id.padEnd(17)} ${r.tagline}\n`);
    process.stdout.write(`\nCameras      ${Object.keys(CAMERA_PRESETS).join(', ')}\nTransitions  ${TRANSITIONS.join(', ')}\nLooks        ${LOOKS.join(', ')}\nGrades       ${GRADES.join(', ')}\n`);
  }
} else if (cmd === 'templates') {
  for (const f of fs.existsSync(TEMPLATES_DIR) ? fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json')) : []) {
    const j = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8'));
    process.stdout.write(`  ${f.replace('.json', '').padEnd(18)} ${j.description || ''}\n`);
  }
} else if (cmd === 'render') await render(args);
else if (cmd === 'still') await still(args);
else if (cmd === 'preview') await preview(args);
else if (cmd === 'doctor') await doctor();
else if (cmd === 'music') music(args);
else {
  const s = suggest(cmd, ['list', 'templates', 'render', 'still', 'preview', 'doctor', 'init', 'help', 'version']);
  die(`Unknown command "${cmd}".${s ? ` Did you mean "${s}"?` : ''} Run \`rudywizz-motion help\`.`);
}
