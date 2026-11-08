---
name: story-3d
description: Story 3D — A tiny 3D film from your script: toy characters act, talk and emote while a virtual director cuts the shots. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Story 3D

A tiny 3D film from your script: toy characters act, talk and emote while a virtual director cuts the shots.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Rudy [wave, happy]: Hey! I'm Rudy. / Ada [surprised]: Wait. You're 3D? / Rudy [present, excited]: Every frame of me is code. / Ada [think, thinking]: So I can write a whole film... / Ada [celebrate, excited]: ...just by typing it?! / Rudy [dance, happy, wide]: Yep!"):

```bash
node "$RM/engine/cli.mjs" still story-3d --text '<text>' --at 8 --size 540 --out "$TMP/story-3d-check.png"   # look at it first
node "$RM/engine/cli.mjs" render story-3d --text '<text>' --out story-3d.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — Script: one beat per line — `Name [pose, emotion, shot]: words`. `* text` = narration card, `[wide]` = camera-only beat, a number 0–1 in the tags walks there
- `set` — studio | room | office | street | park | night | space
- `finish` — vinyl | clay | brick — vinyl toys, hand-made clay (stop motion on twos) or glossy toy bricks (studded set)
- `cast` — Characters: [{ name, skin, hair, hairStyle (short|long|bun|curly|spiky|bob|bald), shirt, pants, shoes, accessory (none|glasses|cap|headphones|beard), accent, x (0–1), height }]
- `voices` — Audio files, one per spoken line in script order (null skips a line). Each line lasts as long as its audio, the mouth follows its loudness, and the render mixes them in
- `dialogue` — subtitles | bubbles | none
- `cuts` — auto (director picks shots) | wide (one locked wide shot)
- `bg` — Background colour (studio set / sky)
- `accent` — Set accent colour (rug, picture, studio floor tint)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
