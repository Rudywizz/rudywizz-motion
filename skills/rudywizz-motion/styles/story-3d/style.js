// story-3d — a little 3D film from a script. Toy-like characters built from
// code act out each line (poses, emotions, lip-sync), and a virtual director
// cuts between wide, medium, close-up and over-the-shoulder shots.
//
// Script, one beat per line:
//   Rudy [wave, happy]: Hi! I'm Rudy.
//   Ada [surprised, close]: Wait… you're 3D?
//   Rudy [walk 0.8]:              ← move (0 = left … 1 = right), no dialogue
//   * Meanwhile, across town…     ← narration card
//   [wide]                        ← a pure camera beat
import * as THREE from '../../engine/vendor/three.bundle.min.js';
import { createCharacter, poseAt, blendPose, visemeAt, POSE_NAMES, EMOTIONS } from './character.js';
import { buildSet, SETS } from './sets.js';
import { applyLook, lookTime, jitter, LOOKS } from './looks.js';
import { parseScript, timeBeats, TRANSIENT, attachVoices, voiceOpen } from '../../engine/story.js';

const DEFAULT_CAST = [
  { name: 'Rudy', hairStyle: 'spiky', hair: '#2a1d16', shirt: '#ff6b4a', pants: '#2d3a5a', skin: '#f2c29b' },
  { name: 'Ada', hairStyle: 'bun', hair: '#7a3b1d', shirt: '#3da5ff', pants: '#3b2f5c', skin: '#e3a882', accessory: 'glasses', accent: '#e0503a' },
];

export default {
  id: 'story-3d',
  title: 'Story 3D',
  tagline: 'A tiny 3D film from your script: toy characters act, talk and emote while a virtual director cuts the shots',
  fonts: [['Bricolage Grotesque', 700], ['Bricolage Grotesque', 800], ['Fraunces', 400, 'italic']],
  defaults: {
    text: 'Rudy [wave, happy]: Hey! I\'m Rudy. / Ada [surprised]: Wait. You\'re 3D? / Rudy [present, excited]: Every frame of me is code. / Ada [think, thinking]: So I can write a whole film... / Ada [celebrate, excited]: ...just by typing it?! / Rudy [dance, happy, wide]: Yep!',
    duration: 14,
    set: 'studio',
    cast: DEFAULT_CAST,
    finish: 'vinyl',
    dialogue: 'subtitles',
    voices: [],
    cuts: 'auto',
    bg: null,
    accent: '#ff6b4a',
  },
  options: {
    text: 'Script: one beat per line — `Name [pose, emotion, shot]: words`. `* text` = narration card, `[wide]` = camera-only beat, a number 0–1 in the tags walks there',
    set: SETS.join(' | '),
    finish: `${LOOKS.join(' | ')} — vinyl toys, hand-made clay (stop motion on twos) or glossy toy bricks (studded set)`,
    cast: 'Characters: [{ name, skin, hair, hairStyle (short|long|bun|curly|spiky|bob|bald), shirt, pants, shoes, accessory (none|glasses|cap|headphones|beard), accent, x (0–1), height }]',
    voices: 'Audio files, one per spoken line in script order (null skips a line). Each line lasts as long as its audio, the mouth follows its loudness, and the render mixes them in',
    dialogue: 'subtitles | bubbles | none',
    cuts: 'auto (director picks shots) | wide (one locked wide shot)',
    bg: 'Background colour (studio set / sky)',
    accent: 'Set accent colour (rug, picture, studio floor tint)',
  },

  setup(api) {
    const { W, H, p } = api;
    const portrait = H > W * 1.1;

    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

    const set = p.alpha ? { group: new THREE.Group(), bg: null, mood: { key: 1, fill: 0.6, warm: '#ffffff', env: 0.8 } } : buildSet(p.set, { bg: p.bg, accent: p.accent });
    scene.add(set.group);
    scene.background = set.bg && !p.alpha ? new THREE.Color(set.bg) : null;
    scene.environmentIntensity = set.mood.env * 0.55;
    if (set.bg && !p.alpha && p.set !== 'studio') scene.fog = new THREE.Fog(set.bg, 14, 40);

    const hemi = new THREE.HemisphereLight('#ffffff', '#8a7a6a', set.mood.fill * 0.6);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(set.mood.warm, 3.2 * set.mood.key);
    key.position.set(-3.5, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -3;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 25;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(set.mood.rim || '#cfe3ff', 1.6 * set.mood.key);
    rim.position.set(4, 3.5, -4);
    scene.add(rim);

    // cast
    const castIn = Array.isArray(p.cast) && p.cast.length ? p.cast : DEFAULT_CAST;
    const n = castIn.length;
    const spread = (portrait ? 1.05 : 1.5) * Math.max(1, n - 1);
    const chars = castIn.map((c, i) => {
      const ch = createCharacter(c);
      const x0 = c.x != null ? (Number(c.x) - 0.5) * spread * 2 : n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
      ch.root.position.set(x0, 0, 0);
      scene.add(ch.root);
      return { ...ch, name: c.name || `#${i + 1}`, color: c.shirt || '#ffffff', x0, seed: i * 1.7 + 0.3 };
    });
    applyLook(p.finish, { scene, set, chars });
    const xOf = (u) => (u - 0.5) * Math.max(spread, 1.2) * 2;

    // beats → timeline
    const beats = parseScript(p.text, chars.map((c) => c.name), { poses: POSE_NAMES, emotions: EMOTIONS });
    for (const b of beats) {
      const words = (b.text || b.narration || '').length;
      b.speak = b.text ? Math.min(7, 0.5 + words * 0.058) : 0;
      b.dur = b.dur || (b.narration ? Math.min(5, 1.6 + words * 0.045) : b.text ? b.speak + 0.55 : b.moveTo != null ? 1.6 : 1.3);
    }
    attachVoices(beats, p.voices);
    timeBeats(beats, p.duration, 0.35);
    for (const b of beats) if (b.voice) api.cue(b.voice, b.at);

    // walking: resolve positions per beat
    const pos = chars.map((c) => c.x0);
    for (const b of beats) {
      if (b.who >= 0 && b.moveTo != null) {
        b.fromX = pos[b.who];
        b.toX = xOf(b.moveTo);
        b.walk = Math.min(b.dur, Math.abs(b.toX - b.fromX) / 1.15 + 0.2);
        pos[b.who] = b.toX;
      }
    }

    // director: one shot per beat
    let prevWho = -1;
    let side = 1;
    beats.forEach((b, i) => {
      if (p.cuts === 'wide') b.cam = 'wide';
      else if (b.shot) b.cam = b.shot;
      else if (i === 0 || b.narration || b.who < 0) b.cam = 'wide';
      else if (b.pose === 'dance' || b.pose === 'jump' || b.pose === 'celebrate' || b.moveTo != null) b.cam = i % 2 ? 'wide' : 'medium';
      else if (b.emotion === 'surprised' || b.emotion === 'angry' || (b.text && b.text.length < 22)) b.cam = 'close';
      else if (n > 1 && b.who !== prevWho && i % 3 === 2) b.cam = 'ots';
      else b.cam = 'medium';
      if (b.who !== prevWho) side = -side;
      b.side = side;
      if (b.who >= 0) prevWho = b.who;
    });

    const camera = new THREE.PerspectiveCamera(portrait ? 34 : 26, W / H, 0.05, 200);
    const ui = { fs: Math.round(Math.min(W, H) * (portrait ? 0.052 : 0.04)) };
    return { renderer, scene, camera, chars, beats, portrait, ui, xOf };
  },

  frame(api, tIn, s) {
    const { ctx, W, H, p } = api;
    const t = lookTime(p.finish, tIn);
    const { renderer, scene, camera, chars, beats, portrait } = s;
    const cur = beatAt(beats, t);
    const tmpV = new THREE.Vector3();

    // ── characters ──
    chars.forEach((c, ci) => {
      // position (walks happen inside beats)
      let x = c.x0;
      let walking = null;
      for (const b of beats) {
        if (b.who !== ci || b.toX == null) continue;
        if (t >= b.at + b.walk) x = b.toX;
        else if (t >= b.at) {
          const k = (t - b.at) / b.walk;
          x = b.fromX + (b.toX - b.fromX) * (k * k * (3 - 2 * k));
          walking = b;
        }
      }
      c.root.position.x = x + jitter(p.finish, t, ci);
      c.root.position.z = jitter(p.finish, t, ci + 9);

      // own beats: current, previous
      let mine = null;
      let prev = null;
      let emotion = 'neutral';
      for (const b of beats) {
        if (b.at > t) break;
        if (b.who === ci) {
          prev = mine;
          mine = b;
          emotion = b.emotion && !TRANSIENT.has(b.emotion) ? b.emotion : b.emotion ? 'neutral' : emotion;
        }
      }
      const active = mine && t < mine.at + mine.dur ? mine : null;
      const local = active ? t - active.at : 0;
      const poseName = walking ? 'walk' : active ? active.pose || (active.text ? 'talk' : 'idle') : 'idle';
      const k = active ? local / Math.max(0.01, active.dur) : 0;
      let pose = poseAt(poseName, t + c.seed, k);
      // ease in from whatever came before, ease back out to idle after
      const since = mine ? t - mine.at : 99;
      if (since < 0.35) {
        const prevName = prev && t < prev.at + prev.dur + 0.35 ? prev.pose || 'idle' : 'idle';
        pose = blendPose(poseAt(prevName, t + c.seed), pose, smooth(since / 0.35));
      }
      if (mine && !active) {
        const after = t - (mine.at + mine.dur);
        if (after < 0.45) pose = blendPose(poseAt(mine.pose || (mine.text ? 'talk' : 'idle'), t + c.seed, 1), poseAt('idle', t + c.seed), smooth(after / 0.45));
      }

      // facing: towards the speaker / the middle, walking → direction of travel
      const speaker = cur && cur.who >= 0 && cur.who !== ci ? chars[cur.who] : null;
      let yaw;
      if (walking) yaw = Math.sign(walking.toX - walking.fromX) * 1.2;
      else if (speaker) yaw = Math.atan2(speaker.root.position.x - x, 2.2) * 0.9;
      else if (active && active.text) yaw = -x * 0.12;
      else yaw = chars.length > 1 ? -Math.sign(x) * 0.32 : 0;
      c.root.rotation.y += (yaw - c.root.rotation.y) * 0.25; // damped (render is sequential, deterministic per frame)
      c.root.rotation.y = yaw; // keep exact for frame-accurate renders

      // face
      const blinkPhase = (t + c.seed * 3.1) % 3.4;
      const blink = blinkPhase < 0.14 ? Math.abs(blinkPhase / 0.07 - 1) : 1;
      let mouth = 0;
      let round = 0;
      if (active && active.text && local < active.speak) {
        const vz = visemeAt(active.text, local / active.speak);
        mouth = active.voice ? voiceOpen(active.voice, local, p.fps) : vz.open;
        round = vz.round * (active.voice ? Math.min(1, mouth * 1.5) : 1);
      }
      const lookX = speaker ? Math.sign(speaker.root.position.x - x) * 0.6 : Math.sin(t * 0.7 + c.seed) * 0.25;
      c.apply(pose, { t, seed: c.seed, blink, mouth, round, emotion: active?.emotion || emotion, lookX, lookY: poseName === 'think' ? -0.8 : 0, headYaw: 0 });
    });

    // ── camera ──
    placeCamera(s, cur, t);
    renderer.render(scene, camera);
    api.bg(null);
    ctx.drawImage(renderer.domElement, 0, 0, W, H);

    // ── dialogue ──
    if (!cur) return;
    const local = t - cur.at;
    const fadeIn = smooth(local / 0.2);
    const fadeOut = 1 - smooth((local - cur.dur + 0.15) / 0.15);
    const a = fadeIn * fadeOut;
    if (cur.narration) drawNarration(api, s, cur.narration, a, local);
    else if (cur.text && p.dialogue !== 'none') {
      const who = chars[cur.who];
      const shown = Math.min(1, local / Math.max(0.01, cur.speak));
      if (p.dialogue === 'bubbles' && who) {
        who.headPos();
        const hp = who.headPos().clone();
        hp.y += 0.45;
        hp.project(camera);
        drawBubble(api, s, cur.text, shown, a, (hp.x * 0.5 + 0.5) * W, (-hp.y * 0.5 + 0.5) * H, who.color);
      } else drawSubtitle(api, s, who ? who.name : cur.name, who ? who.color : '#ffffff', cur.text, shown, a);
    }
  },
};

const smooth = (x) => {
  x = Math.min(1, Math.max(0, x));
  return x * x * (3 - 2 * x);
};

function beatAt(beats, t) {
  let cur = null;
  for (const b of beats) if (b.at <= t) cur = b;
  return cur || beats[0] || null;
}

const _v = new THREE.Vector3();
function placeCamera(s, b, t) {
  const { camera, chars, portrait } = s;
  const vfov = (camera.fov * Math.PI) / 180;
  const tanV = Math.tan(vfov / 2);
  const aspect = camera.aspect;
  const fit = (w, h) => Math.max(h / 2 / tanV, w / 2 / (tanV * aspect));
  const xs = chars.map((c) => c.root.position.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const cx = (minX + maxX) / 2;
  const cam = b ? b.cam : 'wide';
  const who = b && b.who >= 0 ? chars[b.who] : null;
  const local = b ? t - b.at : t;
  const drift = 1 - Math.min(1, local / 6) * 0.06; // slow push-in during a shot
  const side = b ? b.side : 1;

  let target;
  let dist;
  let az = side * 0.12;
  let el = 0.06;
  if (cam === 'wide' || !who) {
    target = _v.set(cx, portrait ? 0.8 : 0.8, 0);
    dist = fit(maxX - minX + (portrait ? 1.3 : 2.4), portrait ? 2.0 : 1.9);
    az = side * 0.08;
    el = 0.1;
  } else {
    const hp = who.headPos();
    if (cam === 'close') {
      target = _v.set(hp.x, hp.y - 0.04, hp.z);
      dist = fit(0.9, portrait ? 1.0 : 0.78);
      az = Math.max(-0.5, Math.min(0.5, who.root.rotation.y)) * 0.8 + side * 0.08;
    } else if (cam === 'ots') {
      target = _v.set(hp.x, hp.y - 0.12, hp.z);
      dist = fit(1.6, portrait ? 1.8 : 1.3);
      const other = chars.find((c) => c !== who);
      az = other ? Math.sign(other.root.position.x - who.root.position.x) * 0.55 : 0.4;
      el = 0.12;
    } else if (cam === 'low') {
      target = _v.set(hp.x, hp.y - 0.3, hp.z);
      dist = fit(1.4, portrait ? 1.9 : 1.4);
      el = -0.22;
    } else if (cam === 'high') {
      target = _v.set(hp.x, hp.y - 0.4, hp.z);
      dist = fit(1.6, portrait ? 2.2 : 1.6);
      el = 0.5;
    } else {
      target = _v.set(hp.x, hp.y - 0.3, hp.z);
      dist = fit(1.3, portrait ? 1.65 : 1.25);
      az = Math.max(-0.4, Math.min(0.4, who.root.rotation.y)) * 0.6 + side * 0.1;
    }
  }
  dist *= drift;
  az += Math.sin(t * 0.25) * 0.015;
  camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
  camera.lookAt(target);
  camera.updateMatrixWorld();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const tryL = cur ? cur + ' ' + w : w;
    if (ctx.measureText(tryL).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = tryL;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawSubtitle(api, s, name, color, text, shown, a) {
  const { ctx, W, H } = api;
  if (a <= 0) return;
  const fs = s.ui.fs;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = api.font(fs, 'Bricolage Grotesque', 800);
  const maxW = W * (s.portrait ? 0.84 : 0.7);
  const lines = wrapText(ctx, text, maxW);
  const lh = fs * 1.22;
  const total = lines.reduce((n, l) => n + l.split(/\s+/).length, 0);
  const visible = Math.ceil(total * shown);
  const by = H * (s.portrait ? 0.8 : 0.84) - (lines.length - 1) * lh;
  // speaker tag
  ctx.font = api.font(fs * 0.5, 'Bricolage Grotesque', 800);
  const tag = String(name).toLocaleUpperCase('tr');
  const tw = ctx.measureText(tag).width + fs * 0.6;
  const ty = by - fs * 1.25;
  ctx.fillStyle = color;
  api.roundRect(ctx, W / 2 - tw / 2, ty - fs * 0.36, tw, fs * 0.72, fs * 0.36);
  ctx.fill();
  ctx.fillStyle = isLight(color) ? '#14161c' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, W / 2, ty + fs * 0.02);
  // words
  ctx.font = api.font(fs, 'Bricolage Grotesque', 800);
  let wi = 0;
  lines.forEach((l, li) => {
    const ws = l.split(/\s+/);
    const lw = ctx.measureText(l).width;
    let x = W / 2 - lw / 2;
    const y = by + li * lh;
    ctx.textAlign = 'left';
    for (const w of ws) {
      const on = wi < visible;
      ctx.lineJoin = 'round';
      ctx.lineWidth = fs * 0.2;
      ctx.strokeStyle = 'rgba(10,10,16,0.85)';
      ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.28)';
      ctx.strokeText(w, x, y);
      ctx.fillText(w, x, y);
      x += ctx.measureText(w + ' ').width;
      wi++;
    }
  });
  ctx.restore();
}

function drawBubble(api, s, text, shown, a, hx, hy, color) {
  const { ctx, W, H } = api;
  if (a <= 0) return;
  const fs = s.ui.fs * 0.85;
  ctx.save();
  ctx.font = api.font(fs, 'Bricolage Grotesque', 700);
  const maxW = W * (s.portrait ? 0.62 : 0.4);
  const lines = wrapText(ctx, text, maxW);
  const lh = fs * 1.2;
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fs * 1.2;
  const bh = lines.length * lh + fs * 0.8;
  let bx = Math.min(W - bw - W * 0.04, Math.max(W * 0.04, hx - bw / 2));
  let by = Math.max(H * 0.05, hy - bh - fs * 0.9);
  const pop = 0.85 + 0.15 * Math.min(1, a * 1.4);
  ctx.globalAlpha = a;
  ctx.translate(hx, by + bh);
  ctx.scale(pop, pop);
  ctx.translate(-hx, -(by + bh));
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = fs * 0.6;
  ctx.shadowOffsetY = fs * 0.15;
  api.roundRect(ctx, bx, by, bw, bh, fs * 0.6);
  ctx.fill();
  ctx.beginPath();
  const tx = Math.min(bx + bw - fs, Math.max(bx + fs, hx));
  ctx.moveTo(tx - fs * 0.4, by + bh - 1);
  ctx.lineTo(tx + fs * 0.4, by + bh - 1);
  ctx.lineTo(tx, by + bh + fs * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = color;
  ctx.fillRect(bx + fs * 0.6, by + fs * 0.2, fs * 1.2, fs * 0.12);
  const total = lines.reduce((n, l) => n + l.split(/\s+/).length, 0);
  const visible = Math.ceil(total * shown);
  let wi = 0;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  lines.forEach((l, li) => {
    let x = bx + fs * 0.6;
    const y = by + fs * 0.4 + lh * (li + 0.5) + fs * 0.08;
    for (const w of l.split(/\s+/)) {
      ctx.fillStyle = wi < visible ? '#15171d' : 'rgba(21,23,29,0.18)';
      ctx.fillText(w, x, y);
      x += ctx.measureText(w + ' ').width;
      wi++;
    }
  });
  ctx.restore();
}

function drawNarration(api, s, text, a, local) {
  const { ctx, W, H } = api;
  if (a <= 0) return;
  const fs = s.ui.fs * 1.05;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(8,8,12,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.font = `italic 400 ${Math.round(fs)}px "Fraunces"`;
  ctx.fillStyle = '#fff7ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(ctx, text, W * 0.78);
  const lh = fs * 1.3;
  const y0 = H / 2 - ((lines.length - 1) * lh) / 2 - (1 - smooth(local / 0.6)) * fs * 0.4;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh));
  ctx.restore();
}

function isLight(hex) {
  const n = parseInt(String(hex).replace('#', '').padEnd(6, '0'), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 165;
}
