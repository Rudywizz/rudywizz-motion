#!/usr/bin/env node
// Generates the thin slash-command skills (skills/<id>/SKILL.md) from style metadata,
// plus the /reel and /history-video director skills. Run after adding a style.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const STYLES = path.join(SKILLS, 'rudywizz-motion', 'styles');

const FIND = `Find the engine (it is the sibling \`rudywizz-motion\` skill folder):

\`\`\`bash
RM=$(ls -d "\${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
\`\`\`
Read \`$RM/SKILL.md\` once for setup, the workflow (check stills → render → verify) and the full catalogue.`;

const ids = fs.readdirSync(STYLES).filter((d) => fs.existsSync(path.join(STYLES, d, 'style.js'))).sort();
for (const id of ids) {
  const s = (await import(pathToFileURL(path.join(STYLES, id, 'style.js')).href)).default;
  const opts = Object.entries(s.options || {}).map(([k, v]) => `- \`${k}\` — ${v}`).join('\n');
  const defText = typeof s.defaults.text === 'string' ? s.defaults.text.replace(/\n/g, ' / ') : '';
  const md = `---
name: ${id}
description: ${s.title} — ${s.tagline}. Renders a video with the rudywizz-motion engine. Use when the user types /${id} or asks for this look.
argument-hint: "<text>"
---

# /${id} — ${s.title}

${s.tagline}.

${FIND}

Render (the user's text goes in \`--text\`; default "${defText}"):

\`\`\`bash
node "$RM/engine/cli.mjs" still ${id} --text "$ARGUMENTS" --at ${Math.max(1, Math.round((s.defaults.duration || 6) * 0.6))} --size 540 --out /tmp/${id}-check.png   # look first
node "$RM/engine/cli.mjs" render ${id} --text "$ARGUMENTS" --out ${id}.mp4
\`\`\`

Options (\`--set key=value\`, JSON values allowed):
${opts || '- (none)'}

Combine freely with \`--camera\`, \`--grade\`, \`--bloom\`, \`--leak\`, \`--film\`, \`--format 1:1|4:5|16:9\`, \`--audio\`, \`--alpha --out x.mov\`.
`;
  fs.mkdirSync(path.join(SKILLS, id), { recursive: true });
  fs.writeFileSync(path.join(SKILLS, id, 'SKILL.md'), md);
}

const reel = `---
name: reel
description: Director mode — turn the user's clips, photos, places and lines into a finished vertical reel with camera moves, shader transitions, captions, maps and a colour grade, rendered by rudywizz-motion. Use when the user types /reel or asks to edit/montage a reel or short from their footage.
argument-hint: "<what the reel should be> [files…]"
---

# /reel — composition director

${FIND}

1. Collect inputs: the user's clips/images (paths), places, text lines, music + BPM, target length (default 15 s), format (default 9:16).
2. Plan an edit on paper first — 4–8 scenes, 1.5–3.5 s each for clips; hook in the first second; one idea per scene.
3. Write \`reel.json\` next to the assets (schema: section 4 of \`$RM/SKILL.md\`). Good defaults:
   - clips: \`camera: "handheld"\` or \`"punch-in"\`, \`speed: "ramp-mid"\` on the hero shot
   - transitions: \`whip\` between energetic shots, \`zoom\` into reveals, \`leak\`/\`burn\` for mood changes, \`glitch\` on beats
   - text: \`captions\` overlay on clips; a style scene (\`neon-sign\`, \`inflate\`, \`beat-cut\`…) as opener or closer
   - places: a \`map-route\` scene as the intro
   - look: \`teal-orange\` (travel), \`kodak\` (warm lifestyle), \`cyber\` (music), \`sepia\` + \`film\` (history)
4. Check stills at the middle of each scene (\`still reel.json --at <t> --size 540\`), fix, then \`render reel.json --out reel.mp4\` (add \`--audio\`).
5. Verify duration with ffprobe and deliver.
`;
const history = `---
name: history-video
description: Sepia documentary pack — year title cards, antique atlas route maps, the user's portraits/paintings drawn as engravings, handwritten letters with wax seals, old-film grade. Use when the user types /history-video or wants a history / documentary style video or reel.
argument-hint: "<topic, year, places, images…>"
---

# /history-video — documentary pack

${FIND}

Start from \`$RM/templates/history-short.json\` and adapt it:

| Beat | Scene |
|---|---|
| Date + title | \`{ "style": "history-title", "text": "1071 / Malazgirt / Anadolu'nun kapısı" }\` |
| Where | \`{ "style": "map-route", "theme": "atlas", "route": ["Malazgirt", "Konya"], "camera": "tilt-reveal" }\` |
| Who | \`{ "image": "<user's portrait or painting>", "look": { "type": "engrave", "reveal": 3 }, "camera": "push-in" }\` |
| Voice | \`{ "style": "parchment-letter", "text": "…", "place": "…, 1897", "signature": "…", "seal": "…" }\` |

Global look: \`{ "grade": "sepia", "film": 0.6, "weave": 1, "grain": 0.07, "vignette": 0.5 }\`; transitions \`burn\`, \`ink\`, \`leak\`.
Images should be the user's own or public-domain works; the engrave look works best on portraits with clear light and shadow.
Keep facts as the user gives them — do not invent dates or quotes.
`;
for (const [id, md] of [['reel', reel], ['history-video', history]]) {
  fs.mkdirSync(path.join(SKILLS, id), { recursive: true });
  fs.writeFileSync(path.join(SKILLS, id, 'SKILL.md'), md);
}
console.log(`generated ${ids.length} style skills + reel + history-video`);
