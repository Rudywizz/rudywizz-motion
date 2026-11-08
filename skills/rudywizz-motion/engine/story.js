// Shared script language for the story styles (story-3d, doodle-story).
//   Name [pose, emotion, shot]: words      one beat
//   * text                                 narration card
//   [wide]                                 camera-only beat
//   Name [walk 0.8]:                       move to 0 (left) … 1 (right)
// Tags can be English or Turkish (el-salla, mutlu, yakın…).

export const SHOTS = ['wide', 'medium', 'close', 'ots', 'low', 'high'];
// Turkish (and a few casual) aliases so scripts can be written naturally
export const ALIAS = {
  'el-salla': 'wave', selam: 'wave', 'işaret': 'point', 'yukarı': 'point-up', 'düşün': 'think', 'düşünceli': 'thinking',
  'omuz-silk': 'shrug', kutla: 'celebrate', sevin: 'celebrate', 'eller-belde': 'hips', sun: 'present', 'göster': 'present',
  'şaşır': 'surprised', 'şaşkın': 'surprised', 'üzgün': 'sad', 'yüz-kapat': 'facepalm', dans: 'dance', 'zıpla': 'jump',
  'yürü': 'walk', otur: 'sit', konuş: 'talk', bekle: 'idle',
  mutlu: 'happy', 'heyecanlı': 'excited', 'kızgın': 'angry', 'endişeli': 'worried', yorgun: 'tired', utanga: 'shy', 'utangaç': 'shy', normal: 'neutral',
  geniş: 'wide', orta: 'medium', yakın: 'close', omuz: 'ots', alt: 'low', üst: 'high',
  hi: 'wave', clap: 'celebrate', cheer: 'celebrate', yay: 'celebrate', 'thinking-pose': 'think',
};


export function parseScript(text, castNames, { poses = [], emotions = [] } = {}) {
  const lines = String(text).split(/\n|\s\/\s/).map((l) => l.trim()).filter(Boolean);
  const beats = [];
  const lower = castNames.map((n) => n.toLocaleLowerCase('tr'));
  for (const line of lines) {
    if (line.startsWith('*')) {
      beats.push({ narration: line.replace(/^\*\s*/, ''), tags: [] });
      continue;
    }
    const m = line.match(/^([^[:]*?)\s*(?:\[([^\]]*)\])?\s*(?::\s*(.*))?$/);
    if (!m) continue;
    const name = (m[1] || '').trim();
    const tags = (m[2] || '').split(/[,\s]+/).map((s) => s.trim().toLocaleLowerCase('tr')).filter(Boolean).map((s) => ALIAS[s] || s);
    const who = lower.indexOf(name.toLocaleLowerCase('tr'));
    if (m[3] == null && who < 0 && !m[2]) {
      beats.push({ narration: line, tags: [] }); // free text = narration
      continue;
    }
    beats.push({ who, name, text: (m[3] || '').trim(), tags });
  }
  for (const b of beats) {
    for (let i = 0; i < b.tags.length; i++) {
      const tg = b.tags[i];
      if (poses.includes(tg)) b.pose = tg;
      else if (emotions.includes(tg)) b.emotion = tg;
      else if (SHOTS.includes(tg)) b.shot = tg;
      else if (/^\d+(\.\d+)?s$/.test(tg)) b.dur = parseFloat(tg);
      else if (/^(0?\.\d+|0|1(\.0+)?)$/.test(tg)) b.moveTo = parseFloat(tg);
      else if (tg.startsWith('look:')) b.look = tg.slice(5);
    }
    if (b.moveTo != null && !b.pose) b.pose = 'walk';
  }
  return beats;
}


/** Mouth shapes from text: progress k (0..1) through `text` → { open, round }. */
export function visemeAt(text, k) {
  const chars = Array.from(text);
  if (!chars.length) return { open: 0, round: 0 };
  const pos = Math.min(1, Math.max(0, k)) * chars.length;
  const i = Math.min(chars.length - 1, Math.floor(pos));
  const v = (ch) => {
    const c = (ch || ' ').toLocaleLowerCase('tr');
    if ('aâáàä'.includes(c)) return [0.95, 0];
    if ('eéıi'.includes(c)) return [0.6, 0];
    if ('oöuüóú'.includes(c)) return [0.7, 1];
    if ('mbpv'.includes(c)) return [0, 0];
    if ('fw'.includes(c)) return [0.15, 0.3];
    if (/[\s.,!?;:…]/.test(c)) return [0.05, 0];
    return [0.35, 0.1];
  };
  const a = v(chars[i]);
  const b = v(chars[i + 1]);
  const w = pos - i;
  return { open: a[0] + (b[0] - a[0]) * w, round: a[1] + (b[1] - a[1]) * w };
}

/** Emotions that belong to one moment; mood emotions (sad, angry…) carry over to later beats. */
export const TRANSIENT = new Set(['idea', 'shocked', 'surprised', 'wink', 'laughing', 'silly', 'curious', 'dizzy', 'excited', 'starstruck']);

/**
 * Lay beats out in time. Short scripts stretch their pauses to fill the scene
 * (speech keeps its natural speed); long scripts are compressed to fit.
 */
export function timeBeats(beats, duration, start = 0.3) {
  let t = start;
  for (const b of beats) {
    b.at = t;
    t += b.dur;
  }
  let k = (duration - 0.5 - start) / Math.max(0.01, t - start);
  if (beats.some((b) => b.voice)) k = Math.max(1, k); // never squeeze real audio
  for (const b of beats) {
    b.at = start + (b.at - start) * k;
    b.dur *= k;
    if (k < 1) b.speak *= k;
  }
}

/**
 * Attach `voices` (from the CLI: { id, dur, env[] } per spoken line, in order) to the
 * beats that have dialogue. A voiced line lasts as long as its audio.
 */
export function attachVoices(beats, voices) {
  if (!Array.isArray(voices) || !voices.length) return false;
  let i = 0;
  for (const b of beats) {
    if (!b.text) continue;
    const v = voices[i++];
    if (v && v.dur) {
      b.voice = v;
      b.speak = v.dur;
      b.dur = Math.max(b.dur || 0, v.dur + 0.45);
    }
  }
  return true;
}

/** Mouth opening for a voiced beat at local time: the line's loudness, lightly smoothed. */
export function voiceOpen(voice, local, fps) {
  const env = voice.env;
  const f = Math.floor(local * fps);
  if (f < 0 || f >= env.length) return 0;
  const a = env[Math.max(0, f - 1)], b = env[f], c = env[Math.min(env.length - 1, f + 1)];
  return Math.min(1, (a * 0.25 + b * 0.5 + c * 0.25) * 1.15);
}
