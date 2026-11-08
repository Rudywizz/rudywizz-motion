// Builds promo/tanitim/tanitim-tr.json: the full product film, made with rudywizz-motion itself.
// Rudy (pixel host) and Bit (robot) talk in a 3D studio loft (the `room` style); the camera dives into
// the TV / monitor / map poster and the styles they talk about play full screen. Editorial captions
// (the `editorial` overlay) carry every voice line, with a masthead, section counter and style tags.
//
// The words live in metinson.txt (edit freely); this file only says where each line is said.
//   node promo/tanitim/build.mjs            → JSON (+ renders missing screen stills into kareler/)
//   node promo/tanitim/build.mjs --script   → voice-over list (file name, tone, words)
//   node promo/tanitim/build.mjs --wide     → 16:9 version for YouTube
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(DIR, '../../skills/rudywizz-motion/engine/cli.mjs');
const FORMAT = process.argv.includes('--wide') ? '16:9' : '9:16';

// ── metinson.txt → sections of lines ────────────────────────────────────────
function readScript() {
  const sections = [];
  for (const raw of fs.readFileSync(path.join(DIR, fs.existsSync(path.join(DIR, 'metinson.txt')) ? 'metinson.txt' : 'metin.txt'), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (/^##\s/.test(line)) sections.push({ title: line.replace(/^##\s*/, '').replace(/^\d+\s*·\s*/, ''), lines: [] });
    const m = line.match(/^(RUDY|BIT)\s*(?:\[([^\]]*)\])?\s*:\s*(.+)$/i);
    if (m && sections.length) sections.at(-1).lines.push({ who: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), tag: (m[2] || '').trim(), text: m[3].trim() });
  }
  return sections;
}

// ── the storyboard ──────────────────────────────────────────────────────────
// Each section is a list of blocks, consuming its lines in order:
//   room: { lines, spot | spots[], cams[] (one per line: [cam, move]), pre: [cam, move, seconds], dive: tv | monitor | map, monitor: text, mood[] }
//   show: { lines, scenes[] }  (lines: 0 → the scenes play on the music alone, SHOW s each)
const STORY_TEXT = 'Ece [think, thinking]: Bunu nasıl anlatsam? / Kaan [present, excited]: Yaz, biz oynayalım.';
const STORY_CAST = [
  { name: 'Ece', hairStyle: 'long', hair: '#3b2416', shirt: '#7b5cff', pants: '#2b2f45', skin: '#e9b48f' },
  { name: 'Kaan', hairStyle: 'short', hair: '#1d1a19', shirt: '#2fbf8f', pants: '#34364a', skin: '#c98e68', accessory: 'glasses', accent: '#1d1a22' },
];
const BOARD = [
  [ // 1 kanca
    { room: { lines: 3, pre: ['establish', 'push', 2.2], spots: ['sofa', 'desk', 'desk'], cams: [['host', 'push'], ['desk', 'orbit'], ['monitor', 'push']], mood: ['curious', 'sad', 'blank'], monitor: '# video.mp4 / durum: beklemede… / ▍', dive: 'monitor' } },
    { show: { lines: 0, scenes: [{ style: 'glitch-title', text: 'Anlatacak / bir şeyin var', subtitle: 'HİKÂYE · BİLGİ · FİKİR', camera: 'handheld', duration: 2.6 }] } },
  ],
  [ // 2 eskiden
    { show: { lines: 1, scenes: [{ cap: 'top', style: 'receipt', text: 'Bir video / için', header: 'İHTİYAÇ LİSTESİ', items: [['KAMERA', '1'], ['IŞIK', '2'], ['MİKROFON', '1'], ['KURGU PROGRAMI', '1'], ['ZAMAN', '3 GÜN']], total: 'ÇOK', date: '09.11.2026  03:12', footer: 'ARTIK GEREK YOK', camera: 'push-in' }] } },
    { room: { lines: 1, spot: 'center', cams: [['wide', 'truck']], mood: ['happy'] } },
  ],
  [ // 3 nasıl
    { room: { lines: 1, spot: 'sofa', cams: [['neon', 'pull']], mood: ['happy'] } },
    { room: { lines: 1, spot: 'desk', cams: [['monitor', 'push']], monitor: 'npx rudywizz-motion / render neon-sign / --text "Hikâyem" / ✓ hikayem.mp4  (1080×1920)', dive: 'monitor' } },
    { show: { lines: 0, scenes: [{ style: 'neon-sign', text: 'Hikâyem', camera: 'push-in', duration: 2.4 }] } },
    { room: { lines: 1, spot: 'tv', cams: [['tv', 'orbit']], mood: ['happy'], dive: 'tv' } },
  ],
  [ // 4 başlıklar
    { show: { lines: 2, scenes: [
      { style: 'extrude-3d', text: 'Bölüm / bir', camera: 'orbit' },
      { style: 'ink-bleed', text: 'Yavaş / ve / zarif' },
      { style: 'split-flap', text: 'Yeni bölüm / yarın / 20:00', title: 'YAYIN · KALKIŞ' },
      { style: 'inflate', text: 'Tatlı / fikir' },
      { style: 'halftone-press', text: 'Baskı / hâlâ / yaşıyor', caption: 'RISO · 2 RENK · 1 BASKI' },
      { style: 'led-marquee', text: 'Hoş geldin / Bölüm 1' },
      { style: 'word-stack', text: 'Her / kare / sayılır' },
      { style: 'text-tunnel', text: 'Daha / derine' },
      { style: 'cube-spin', text: 'Yaz / Üret / Paylaş / Tekrarla' },
      { style: 'beat-cut', text: 'Yaz / kes / bas / paylaş' },
      { style: 'ticker-rows', text: 'Yeni / bölüm' },
    ] } },
  ],
  [ // 5 bilgi
    { show: { lines: 1, scenes: [
      { style: 'bar-chart', text: 'Türkiye’nin en kalabalık şehirleri', note: 'Nüfus, milyon (2024)' },
      { style: 'odometer', text: '4683 bölge', camera: 'punch-in' },
      { style: 'map-route', route: ['İstanbul', 'Paris', 'New York', 'Tokyo'], theme: 'dark' },
    ] } },
    { room: { lines: 1, spot: 'window', cams: [['map', 'push']], mood: ['happy'], dive: 'map', poster: { style: 'map-route', route: ['Tokyo', 'Kyoto', 'Hiroshima', 'Sapporo'], theme: 'light' } } },
    { show: { lines: 0, scenes: [
      { style: 'map-route', route: ['Tokyo', 'Kyoto', 'Hiroshima', 'Sapporo'], theme: 'light' },
      { style: 'map-route', route: ['Roma', 'Kartaca', 'Atina'], theme: 'atlas' },
    ] } },
  ],
  [ // 6 sosyal
    { show: { lines: 1, scenes: [
      { cap: 'top', style: 'chat-story', text: 'videonu gördüm! / >hangisi? / tarih anlattığın / >hepsini kodla yaptım / kamera yok mu?? / >yok :)', name: 'Ece', time: 'Bugün 21:14', seen: 'Görüldü' },
      { cap: 'top', style: 'captions', text: 'Altyazılar kelime kelime geliyor, arka plan şeffaf' },
      { style: 'lyric-video', credit: 'RUDYWIZZ — GECE' },
    ] } },
    { room: { lines: 1, spot: 'sofa', cams: [['sofa', 'orbit']], mood: ['happy'], dive: 'tv' } },
    { show: { lines: 0, scenes: [
      { cap: 'top', style: 'lower-third', text: 'Kendi adın / anlatıcı · İstanbul' },
      { style: 'highlight-quote', text: 'Önce sadeleştir, / sonra hareket ettir.', author: 'rudywizz-motion' },
    ] } },
  ],
  [ // 7 hava
    { room: { lines: 1, spot: 'gallery', cams: [['gallery', 'truck']], mood: ['curious'], dive: 'tv' } },
    { show: { lines: 1, scenes: [
      { style: 'parchment-letter' },
      { style: 'history-title', text: '1453 / Bir Çağ Kapanıyor / İstanbul' },
      { style: 'vhs-memory', text: 'Yaz / kasetleri', date: 'TEM. 14 1998' },
      { style: 'pixel-quest', text: 'Seviye atla', subtitle: 'BAŞLAMAK İÇİN TIKLA' },
      { image: '../../skills/rudywizz-motion/assets/demo/seyyah.svg', look: 'engrave', camera: 'push-in' },
      { style: 'retro-grid', text: 'Gece / sürüşü' },
      { style: 'signal-tune', text: 'Şimdi / yayında', station: 'RUDYWIZZ TV' },
      { style: 'murmuration', text: 'Birlikte' },
      { style: 'particle-sphere', text: 'Fikirler / şekil alır' },
      { style: 'orbit-ring', text: 'Merak et / anlat / paylaş' },
      { style: 'scramble', text: 'Şifre / çözüldü' },
      { style: 'card-carousel', text: 'Hikâye / Bilgi / Ders / Tarif / Gezi / Fikir' },
    ] } },
  ],
  [ // 8 karakterler
    { room: { lines: 1, spot: 'center', pre: ['table', 'crane', 1.6], cams: [['host', 'push']], mood: ['surprised'], dive: 'tv' } },
    { show: { lines: 2, scenes: [
      { style: 'story-3d', set: 'office', finish: 'vinyl', text: STORY_TEXT, cast: STORY_CAST, dialogue: 'none' },
      { style: 'story-3d', set: 'office', finish: 'clay', text: STORY_TEXT, cast: STORY_CAST, dialogue: 'none' },
      { style: 'story-3d', set: 'office', finish: 'brick', text: STORY_TEXT, cast: STORY_CAST, dialogue: 'none' },
      { style: 'doodle-story', text: STORY_TEXT, dialogue: 'none' },
    ] } },
  ],
  [ // 9 sunucular: the room itself is the proof
    { room: { lines: 2, spot: 'center', pre: ['wide', 'drift', 0.8], cams: [['top', 'crane'], ['host', 'push']], mood: ['love', 'happy'] } },
  ],
  [ // 10 claude
    { room: { lines: 1, spot: 'desk', cams: [['monitor', 'push']], mood: ['happy'], monitor: '# claude / Bana bir tanıtım videosu hazırla. / Konusu: rudywizz-motion, dikey, eğlenceli. / ✓ tanitim.mp4 hazır', dive: 'monitor' } },
    { show: { lines: 1, scenes: [{ style: 'extrude-3d', text: 'Video / hazır', camera: 'punch-in' }, { style: 'odometer', text: '0 TL', camera: 'punch-in' }] } },
  ],
  [ // 11 kapanış
    { room: { lines: 1, spot: 'sofa', cams: [['neon', 'pull']], mood: ['happy'], pre: ['establish', 'push', 0.4] } },
    { show: { lines: 2, tail: 1.6, scenes: [{ style: 'cta-follow', text: 'rudywizz-motion / Yıldızla / GitHub · link profilde', done: 'Yıldızlandı', accent: '#ff6b5a' }] } },
  ],
];

const TRANS = ['whip', 'zoom', 'glitch', 'ink', 'pixelate', 'spin', 'liquid', 'blinds', 'leak', 'cube', 'ripple', 'wipe', 'stretch'];
const CAMS = ['drift', 'push-in', 'float', 'punch-in', 'pull-out', 'tilt-reveal', 'drift', 'rise'];
const GAP = 0.3; // pause after each line
const TR = 0.4; // transition
const SHOW = 1.7; // minimum time per showcased style
const DIVE = 1.3; // time to fly into a screen after the last line

function audioDur(f) {
  if (!fs.existsSync(f)) return null;
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]);
  return r.status === 0 ? Number(String(r.stdout).trim()) : null;
}

const SECTIONS = readScript();
const voiceFile = (n, who) => `ses/${String(n).padStart(2, '0')}-${who.toLowerCase()}.mp3`;
if (process.argv.includes('--script')) {
  let n = 0;
  for (const s of SECTIONS) for (const l of s.lines) console.log(`${voiceFile(++n, l.who)}\t${l.tag ? `[${l.tag}] ` : ''}${l.text.replace(/\*/g, '')}`);
  process.exit(0);
}
if (SECTIONS.length !== BOARD.length) console.warn(`metinson.txt has ${SECTIONS.length} sections, the board has ${BOARD.length}.`);

// ── screen stills: a frame of a showcase, shown on the TV / monitor / walls before we dive in ──
const STILLS = path.join(DIR, 'kareler');
fs.mkdirSync(STILLS, { recursive: true });
function still(sc) {
  const key = crypto.createHash('sha1').update(JSON.stringify([FORMAT, sc])).digest('hex').slice(0, 10);
  const file = path.join(STILLS, `${key}.png`);
  if (!fs.existsSync(file)) {
    const tmp = path.join(DIR, `.still-${key}.json`);
    const { duration, ...rest } = sc;
    fs.writeFileSync(tmp, JSON.stringify({ format: '16:9', lang: 'tr', scenes: [{ ...rest, camera: 'static', duration: 4 }] }));
    const r = spawnSync('node', [CLI, 'still', tmp, '--at', '2.6', '--size', '540', '--out', file, '--quiet'], { stdio: 'inherit' });
    fs.rmSync(tmp, { force: true });
    if (r.status !== 0) {
      console.warn(`  still failed for ${sc.style || sc.image}`);
      return null;
    }
    console.log(`  still ${sc.style || path.basename(sc.image)} → kareler/${key}.png`);
  }
  return `kareler/${key}.png`;
}
const allShows = BOARD.flat().filter((b) => b.show).flatMap((b) => b.show.scenes);
const galleryStills = [...new Set(allShows.filter((s) => s.style !== 'map-route').map(still).filter(Boolean))].slice(0, 12);

// ── timeline ────────────────────────────────────────────────────────────────
const segs = []; // { kind: room | show, start, end, ... }
const lines = []; // every voice line, global time
const sectionsAt = [];
const tags = [];
const zones = [];
let t = 0;
let n = 0;
let ti = 0;

const lineDur = (file, text) => audioDur(path.join(DIR, file)) ?? text.split(/\s+/).length * 0.42 + 0.4;

SECTIONS.forEach((sec, si) => {
  const blocks = BOARD[Math.min(si, BOARD.length - 1)];
  sectionsAt.push({ at: +t.toFixed(2), title: sec.title });
  let li = 0;
  const take = (k) => {
    const out = [];
    for (let i = 0; i < k && li < sec.lines.length; i++, li++) {
      n++;
      const l = sec.lines[li];
      const file = voiceFile(n, l.who);
      out.push({ who: l.who, text: l.text, file: fs.existsSync(path.join(DIR, file)) ? file : null, dur: lineDur(file, l.text) });
    }
    return out;
  };
  blocks.forEach((b, bi) => {
    // any lines not claimed by the board go to the last block
    const last = bi === blocks.length - 1;
    if (b.room) {
      const r = b.room;
      const mine = take(last ? 99 : r.lines);
      // continue the previous room scene when two room blocks follow each other
      let seg = segs.at(-1);
      if (!seg || seg.kind !== 'room' || seg.closed) {
        seg = { kind: 'room', start: t, end: t, lines: [], shots: [], monitor: [], tv: [], images: [], poster: null };
        segs.push(seg);
      }
      if (r.pre) {
        seg.shots.push({ at: t - seg.start, cam: r.pre[0], move: r.pre[1], blend: seg.shots.length ? 0.9 : 0 });
        t += r.pre[2];
      } else t += 0.25;
      if (r.monitor) seg.monitor.push({ at: Math.max(0, t - seg.start - 0.6), text: r.monitor, speed: 26 });
      mine.forEach((l, k) => {
        const [cam, move] = (r.cams && r.cams[k]) || ['host', 'drift'];
        seg.shots.push({ at: +(t - seg.start - 0.25).toFixed(2), cam, move, blend: seg.shots.length ? 0.85 : 0 });
        const spot = (r.spots && r.spots[k]) || r.spot || 'sofa';
        const line = { who: l.who, at: +t.toFixed(2), text: l.text, voice: l.file, dur: l.dur };
        lines.push(line);
        seg.lines.push({ who: l.who, at: +(t - seg.start).toFixed(2), text: l.text.replace(/\*/g, ''), ...(l.file ? { voice: l.file } : {}), spot, mood: (r.mood && r.mood[k]) || 'happy' });
        t += l.dur + GAP;
      });
      if (r.dive) {
        // the next showcase appears on the screen we fly into
        const next = blocks[bi + 1]?.show?.scenes?.[0] || BOARD[si + 1]?.find((x) => x.show)?.show.scenes[0];
        const img = next ? still(next) : null;
        if (img) {
          seg.images.push(img);
          const idx = seg.images.length - 1;
          if (r.dive === 'tv') seg.tv.push({ at: 0, image: idx });
          if (r.dive === 'map') seg.poster = idx;
          if (r.dive === 'monitor') seg.monitor.push({ at: t - seg.start - 0.2, image: idx });
        }
        if (r.poster) {
          const pi = still(r.poster);
          if (pi) seg.images.push(pi), (seg.poster = seg.images.length - 1);
        }
        seg.shots.push({ at: +(t - seg.start - 0.1).toFixed(2), cam: r.dive, move: 'dive', blend: 0.7 });
        t += DIVE;
        seg.closed = true;
        seg.dive = true;
      }
      seg.end = t;
    } else if (b.show) {
      const s = b.show;
      const mine = take(last ? 99 : s.lines);
      const start = t;
      let lt = t + 0.15;
      for (const l of mine) {
        lines.push({ who: l.who, at: +lt.toFixed(2), text: l.text, voice: l.file, dur: l.dur });
        lt += l.dur + GAP;
      }
      const fixed = s.scenes.reduce((a, x) => a + (x.duration || 0), 0);
      const free = s.scenes.filter((x) => !x.duration).length;
      const len = Math.max(lt - start + (s.tail ?? 0.2), fixed + free * SHOW);
      const per = free ? (len - fixed) / free : 0;
      for (const sc of s.scenes) {
        const d = sc.duration || per;
        segs.push({ kind: 'show', start: t, end: t + d, scene: sc });
        t += d;
      }
      t = start + len;
      segs.at(-1).end = t;
    }
  });
});

// ── segments → scenes ───────────────────────────────────────────────────────
const ROOM_BASE = {
  style: 'room',
  // Poly Haven furniture (CC0, not in the repo: put the glTF folders in promo/oda/); procedural furniture otherwise
  ...(fs.existsSync(path.join(DIR, '../oda')) ? { models: '../oda' } : {}),
  cast: [{ name: 'Rudy', rig: '../characters/rudy/rig.json' }, { name: 'Bit', rig: 'bit' }],
  mixVoices: false,
  bpm: 116,
  neon: 'rudywizz',
};
const scenes = segs.map((sg, i) => {
  const dur = +(sg.end - sg.start + TR).toFixed(2);
  const prev = segs[i - 1];
  const transition = { type: prev && prev.kind === 'room' && prev.dive ? 'flash' : TRANS[ti++ % TRANS.length], duration: prev && prev.dive ? 0.25 : TR };
  if (sg.kind === 'room') {
    const images = [...galleryStills, ...sg.images];
    const off = galleryStills.length;
    return {
      ...ROOM_BASE,
      duration: dur,
      camera: 'static',
      transition,
      images,
      gallery: galleryStills.map((_, k) => k),
      ...(sg.poster != null ? { poster: off + sg.poster } : {}),
      tv: sg.tv.map((x) => ({ ...x, image: off + x.image })),
      monitor: sg.monitor.map((x) => (x.image != null ? { ...x, image: off + x.image } : x)),
      lines: sg.lines,
      shots: sg.shots,
    };
  }
  const { duration, cap, ...sc } = sg.scene;
  void cap;
  void duration;
  return { ...sc, duration: dur, camera: sc.camera || CAMS[(i * 3) % CAMS.length], transition };
});
for (const sg of segs) {
  // captions go to the top in the room, to the bottom over showcases (unless the style lives down there: cap: 'top')
  zones.push({ at: +sg.start.toFixed(2), pos: sg.kind === 'room' ? 'top' : sg.scene.cap || 'bottom' });
  if (sg.kind === 'show') {
    const sc = sg.scene;
    tags.push({ from: +(sg.start + 0.2).toFixed(2), to: +(sg.end - 0.15).toFixed(2), label: 'STİL', text: sc.style ? (sc.finish ? `${sc.style} · ${sc.finish}` : sc.style) : `--look ${sc.look}` });
  }
}
const total = t;

const comp = {
  format: FORMAT,
  lang: 'tr',
  look: { bloom: 0.2, grain: 0.025, vignette: 0.2 },
  music: { mood: 'upbeat', seed: 7, volume: 0.42 },
  scenes,
  overlays: [
    {
      style: 'editorial',
      from: 0,
      to: +total.toFixed(2),
      masthead: 'RUDYWIZZ — MOTION',
      sections: sectionsAt,
      tags,
      zones,
      lines: lines.map(({ who, at, text, voice }) => ({ who, at, text, ...(voice ? { voice } : {}) })),
    },
  ],
};
const out = path.join(DIR, FORMAT === '16:9' ? 'tanitim-tr-yatay.json' : 'tanitim-tr.json');
fs.writeFileSync(out, JSON.stringify(comp, null, 2) + '\n');
console.log(`${path.relative(process.cwd(), out)}: ${scenes.length} scenes (${segs.filter((s) => s.kind === 'room').length} in the room), ${lines.length} lines (${lines.filter((l) => l.voice).length} voiced), ~${total.toFixed(1)}s`);
