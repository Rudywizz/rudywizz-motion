// Builds promo/tanitim/tanitim-tr.json: the full product film. Rudy (pixel host)
// and Bit (robot) narrate while every style in the repo plays behind them.
//
// The words live in metin.txt (edit freely); this file only says what plays
// behind each section and how the hosts act.
//   node promo/tanitim/build.mjs            → JSON (line timings from ses/*.mp3 when present)
//   node promo/tanitim/build.mjs --script   → voice-over list (file name, tone, words)
//   node promo/tanitim/build.mjs --wide     → 16:9 version for YouTube
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FORMAT = process.argv.includes('--wide') ? '16:9' : '9:16';

// ── metin.txt → sections of lines ───────────────────────────────────────────
function readScript() {
  const sections = [];
  for (const raw of fs.readFileSync(path.join(DIR, fs.existsSync(path.join(DIR, 'metinson.txt')) ? 'metinson.txt' : 'metin.txt'), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (/^##\s/.test(line)) sections.push({ title: line.replace(/^##\s*/, ''), lines: [] });
    const m = line.match(/^(RUDY|BIT)\s*(?:\[([^\]]*)\])?\s*:\s*(.+)$/i);
    if (m && sections.length) sections.at(-1).lines.push({ who: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), tag: (m[2] || '').trim(), text: m[3].trim() });
  }
  return sections;
}

// ── what plays behind each section (by order) and how the hosts act ─────────
// act[i] applies to the section's i-th line: pose (Rudy: point | think | celebrate; Bit: wave),
// mood (neutral happy surprised angry sad curious · Bit: blank love loading question), place (corner | stage | hidden)
const STORY_TEXT = 'Ece [think, thinking]: Bunu nasıl anlatsam? / Kaan [present, excited]: Yaz, biz oynayalım.';
const STORY_CAST = [
  { name: 'Ece', hairStyle: 'long', hair: '#3b2416', shirt: '#7b5cff', pants: '#2b2f45', skin: '#e9b48f' },
  { name: 'Kaan', hairStyle: 'short', hair: '#1d1a19', shirt: '#2fbf8f', pants: '#34364a', skin: '#c98e68', accessory: 'glasses', accent: '#1d1a22' },
];
const BEHIND = [
  { // 1 kanca
    act: [{ mood: 'curious' }, { mood: 'sad' }, { mood: 'blank' }],
    over: true,
    scenes: [{ style: 'glitch-title', text: 'Anlatacak / bir şeyin var', subtitle: 'HİKÂYE · BİLGİ · FİKİR', camera: 'handheld' }],
  },
  { // 2 eskiden
    act: [{ pose: 'think', mood: 'curious' }, { mood: 'happy' }],
    scenes: [{ style: 'receipt', text: 'Bir video / için', header: 'İHTİYAÇ LİSTESİ', items: [['KAMERA', '1'], ['IŞIK', '2'], ['MİKROFON', '1'], ['KURGU PROGRAMI', '1'], ['ZAMAN', '3 GÜN']], total: 'ÇOK', date: '09.11.2026  03:12', footer: 'ARTIK GEREK YOK', camera: 'push-in' }],
  },
  { // 3 nasıl
    act: [{ pose: 'point', mood: 'happy' }, { mood: 'happy' }, { mood: 'happy' }],
    scenes: [
      { style: 'typewriter', text: 'npx rudywizz-motion / render neon-sign / --text "Hikâyem"', theme: 'terminal', title: 'zsh', speed: 22, camera: 'drift' },
      { style: 'neon-sign', text: 'Hikâyem', camera: 'push-in' },
    ],
  },
  { // 4 başlıklar
    act: [{ mood: 'happy' }, { mood: 'blank' }],
    scenes: [
      { style: 'extrude-3d', text: 'Bölüm / bir', camera: 'orbit' },
      { style: 'inflate', text: 'Tatlı / fikir' },
      { style: 'ink-bleed', text: 'Yavaş / ve / zarif' },
      { style: 'split-flap', text: 'Yeni bölüm / yarın / 20:00', title: 'YAYIN · KALKIŞ' },
      { style: 'halftone-press', text: 'Baskı / hâlâ / yaşıyor', caption: 'RISO · 2 RENK · 1 BASKI' },
      { style: 'led-marquee', text: 'Hoş geldin / Bölüm 1 / Hikâye başlıyor' },
      { style: 'word-stack', text: 'Her / kare / sayılır' },
      { style: 'text-tunnel', text: 'Daha / derine' },
      { style: 'cube-spin', text: 'Yaz / Üret / Paylaş / Tekrarla' },
      { style: 'beat-cut', text: 'Yaz / kes / bas / paylaş' },
      { style: 'ticker-rows', text: 'Yeni / bölüm' },
    ],
  },
  { // 5 bilgi
    act: [{ pose: 'point', mood: 'happy', place: 'corner' }, { mood: 'happy' }],
    scenes: [
      { style: 'bar-chart', text: 'Türkiye’nin en kalabalık şehirleri', note: 'Nüfus, milyon (2024)' },
      { style: 'odometer', text: '4683 bölge', camera: 'punch-in' },
      { style: 'map-route', route: ['İstanbul', 'Paris', 'New York', 'Tokyo'], theme: 'dark' },
      { style: 'map-route', route: ['Tokyo', 'Kyoto', 'Hiroshima', 'Sapporo'], theme: 'light' },
      { style: 'map-route', route: ['Roma', 'Kartaca', 'Atina'], theme: 'atlas' },
      { style: 'countdown', text: 'Anlatım / başlıyor' },
    ],
  },
  { // 6 sosyal
    act: [{ mood: 'happy' }, { mood: 'happy' }],
    scenes: [
      { style: 'chat-story', text: 'videonu gördüm! / >hangisi? / tarih anlattığın / >hepsini kodla yaptım / kamera yok mu?? / >yok :)', name: 'Ece', time: 'Bugün 21:14', seen: 'Görüldü' },
      { style: 'captions', text: 'Altyazılar kelime kelime geliyor, arka plan şeffaf' },
      { style: 'lyric-video', credit: 'RUDYWIZZ — GECE' },
      { style: 'lower-third', text: 'Kendi adın / anlatıcı · İstanbul' },
      { style: 'highlight-quote', text: 'Önce sadeleştir, / sonra hareket ettir.', author: 'rudywizz-motion' },
      { style: 'card-carousel', text: 'Hikâye / Bilgi / Ders / Tarif / Gezi / Fikir' },
    ],
  },
  { // 7 hava
    act: [{ pose: 'think', mood: 'curious' }, { mood: 'blank' }],
    scenes: [
      { style: 'history-title', text: '1453 / Bir Çağ Kapanıyor / İstanbul' },
      { image: '../../skills/rudywizz-motion/assets/demo/seyyah.svg', look: 'engrave', camera: 'push-in' },
      { style: 'parchment-letter' },
      { style: 'vhs-memory', text: 'Yaz / kasetleri', date: 'TEM. 14 1998' },
      { style: 'retro-grid', text: 'Gece / sürüşü' },
      { style: 'signal-tune', text: 'Şimdi / yayında', station: 'RUDYWIZZ TV' },
      { style: 'pixel-quest', text: 'Seviye atla', subtitle: 'BAŞLAMAK İÇİN TIKLA' },
      { style: 'murmuration', text: 'Birlikte' },
      { style: 'particle-sphere', text: 'Fikirler / şekil alır' },
      { style: 'orbit-ring', text: 'Merak et / anlat / paylaş' },
      { style: 'scramble', text: 'Şifre / çözüldü' },
    ],
  },
  { // 8 karakterler
    act: [{ mood: 'surprised' }, { mood: 'happy' }, { mood: 'happy' }],
    scenes: [
      { style: 'story-3d', set: 'office', finish: 'vinyl', text: STORY_TEXT, cast: STORY_CAST, dialogue: 'none' },
      { style: 'story-3d', set: 'office', finish: 'clay', text: STORY_TEXT, cast: STORY_CAST, dialogue: 'none' },
      { style: 'story-3d', set: 'office', finish: 'brick', text: STORY_TEXT, cast: STORY_CAST, dialogue: 'none' },
      { style: 'doodle-story', text: STORY_TEXT, dialogue: 'none' },
    ],
  },
  { // 9 sunucular
    act: [{ mood: 'love' }, { pose: 'celebrate', mood: 'happy' }],
    scenes: [],
  },
  { // 10 claude
    act: [{ mood: 'happy' }, { mood: 'happy' }],
    scenes: [
      { style: 'typewriter', text: 'Claude, bana bir / tanıtım videosu / hazırla', theme: 'terminal', title: 'claude', speed: 20 },
      { style: 'extrude-3d', text: 'Video / hazır', camera: 'punch-in' },
    ],
  },
  { // 11 kapanış
    act: [{ mood: 'happy' }, { pose: 'celebrate', mood: 'happy' }, { mood: 'loading' }],
    over: true,
    tail: 1.6,
    scenes: [{ style: 'cta-follow', text: 'rudywizz-motion / Yıldızla / GitHub · link profilde', done: 'Yıldızlandı', accent: '#ff6b5a' }],
  },
];

const TRANS = ['whip', 'zoom', 'glitch', 'flash', 'ink', 'pixelate', 'spin', 'liquid', 'blinds', 'leak', 'cube', 'ripple', 'wipe', 'stretch'];
const CAMS = ['drift', 'push-in', 'float', 'punch-in', 'pull-out', 'tilt-reveal', 'drift', 'rise'];

function audioDur(f) {
  if (!fs.existsSync(f)) return null;
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]);
  return r.status === 0 ? Number(String(r.stdout).trim()) : null;
}

const SECTIONS = readScript();
if (SECTIONS.length !== BEHIND.length) console.warn(`metin.txt has ${SECTIONS.length} sections, build.mjs has scenes for ${BEHIND.length}: extra sections reuse the last one's scenes.`);
const voiceFile = (n, who) => `ses/${String(n).padStart(2, '0')}-${who.toLowerCase()}.mp3`;

if (process.argv.includes('--script')) {
  let n = 0;
  for (const s of SECTIONS) for (const l of s.lines) console.log(`${voiceFile(++n, l.who)}\t${l.tag ? `[${l.tag}] ` : ''}${l.text.replace(/\*/g, '')}`);
  process.exit(0);
}

const scenes = [];
const lines = [];
let t = 0;
let n = 0;
let ti = 0;
const GAP = 0.35;
const TR = 0.4;
const SHOW = 1.8; // every showcased style gets at least this long, full screen
const pushScene = (sc, dur) => {
  const s = { ...sc, duration: +(dur + TR).toFixed(2) };
  if (!s.camera) s.camera = CAMS[(scenes.length * 3) % CAMS.length];
  s.transition = { type: TRANS[ti++ % TRANS.length], duration: TR };
  scenes.push(s);
};
// Each section: the hosts say the first line(s) on the studio stage, then the section's styles play
// full screen with the hosts out of frame (their voice goes on as subtitles). `over: true` sections keep
// the hosts small in the corner over the scene instead.
SECTIONS.forEach((sec, si) => {
  const bh = BEHIND[Math.min(si, BEHIND.length - 1)];
  const hostN = bh.over ? 0 : bh.scenes.length ? bh.host ?? 1 : sec.lines.length;
  const start = t;
  let lt = start + 0.35;
  let hostEnd = start;
  sec.lines.forEach((l, li) => {
    n++;
    const file = voiceFile(n, l.who);
    const dur = audioDur(path.join(DIR, file)) ?? l.text.split(/\s+/).length * 0.5 + 0.4;
    const { place, ...act } = bh.act?.[li] || {};
    const line = { who: l.who, at: +lt.toFixed(2), text: l.text, ...act };
    if (l.who === 'Bit' && line.pose && line.pose !== 'wave') delete line.pose;
    if (fs.existsSync(path.join(DIR, file))) line.voice = file;
    if (li === 0) line.place = bh.over ? 'corner' : 'stage';
    if (li === hostN && hostN > 0) line.place = 'hidden';
    lines.push(line);
    lt += dur + GAP;
    if (li === hostN - 1) hostEnd = lt;
  });
  const label = `RUDYWIZZ MOTION · ${sec.title.replace(/^\s*(\d+)\s*·\s*/, (m, d) => d.padStart(2, '0') + ' · ')}`;
  if (hostN > 0) pushScene({ style: 'presenter', backdrop: 'studio', label, cast: [], text: '', camera: 'float' }, hostEnd - start + 0.1);
  if (bh.scenes.length) {
    const from = hostN > 0 ? hostEnd + 0.1 : start;
    const len = Math.max(lt - from + (bh.tail ?? 0.3), bh.scenes.length * SHOW);
    for (const sc of bh.scenes) pushScene(sc, len / bh.scenes.length);
    t = from + len;
  } else t = hostEnd + 0.1;
});

const comp = {
  format: FORMAT,
  lang: 'tr',
  look: { bloom: 0.18, grain: 0.025, vignette: 0.22 },
  music: { mood: 'upbeat', seed: 7, volume: 0.45 },
  scenes,
  overlays: [
    {
      style: 'presenter',
      cast: [{ name: 'Rudy', rig: '../characters/rudy/rig.json' }, { name: 'Bit', rig: 'bit' }],
      place: 'corner',
      lines,
    },
  ],
};
const out = path.join(DIR, FORMAT === '16:9' ? 'tanitim-tr-yatay.json' : 'tanitim-tr.json');
fs.writeFileSync(out, JSON.stringify(comp, null, 2) + '\n');
const total = scenes.reduce((s, x) => s + x.duration - TR, TR);
console.log(`${path.relative(process.cwd(), out)}: ${scenes.length} scenes, ${lines.filter((l) => l.text).length} lines (${lines.filter((l) => l.voice).length} voiced), ~${total.toFixed(1)}s`);
