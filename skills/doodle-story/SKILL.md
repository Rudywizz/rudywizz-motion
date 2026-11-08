---
name: doodle-story
description: Doodle Story — Hand-drawn characters on paper: boiling ink lines, watercolour fills, 34 emotions, your script. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Doodle Story

Hand-drawn characters on paper: boiling ink lines, watercolour fills, 34 emotions, your script.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Pip [wave, happy]: Hi, I'm Pip! / Momo [surprised]: You can talk?! / Pip [shrug, smug]: I'm drawn by code. / Momo [think, thinking]: So... I am too? / Pip [point, wink]: Every wobbly line. / Momo [celebrate, starstruck]: That is SO cool! / Momo [jump, laughing]: / Pip [dance, excited]:"):

```bash
node "$RM/engine/cli.mjs" still doodle-story --text '<text>' --at 8 --size 540 --out "$TMP/doodle-story-check.png"   # look at it first
node "$RM/engine/cli.mjs" render doodle-story --text '<text>' --out doodle-story.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — Script: `Name [pose, emotion, shot]: words`, one beat per line. `* text` narration, a 0–1 number in the tags walks there
- `cast` — Characters: [{ name, body (bean|block|ball|tall), color, x (0–1), size }]
- `paper` — Paper colour
- `ink` — Ink colour
- `boil` — Line redraws per second (8–12 = hand-drawn; 0 = still)
- `sheet` — true = model sheet: every emotion in a grid
- `voices` — Audio files, one per spoken line in script order (null skips a line). Each line lasts as long as its audio, the mouth follows its loudness, and the render mixes them in
- `dialogue` — bubbles | none
- `cuts` — auto | wide

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
