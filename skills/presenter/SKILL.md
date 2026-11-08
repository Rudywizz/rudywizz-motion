---
name: presenter
description: Presenter — Your own pixel mascot hosts the video: lip-synced to your voice-over, posing, blinking and passing the word to Bit the robot. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Presenter

Your own pixel mascot hosts the video: lip-synced to your voice-over, posing, blinking and passing the word to Bit the robot.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Bit [happy]: Hi. I am Bit. / Bit [question]: Give me a voice file and I will lip-sync it. / Bit [love]: Or just text. I am flexible."):

```bash
node "$RM/engine/cli.mjs" still presenter --text '<text>' --at 5 --size 540 --out "$TMP/presenter-check.png"   # look at it first
node "$RM/engine/cli.mjs" render presenter --text '<text>' --out presenter.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — Script played in order: `Name [pose, mood, place]: words` per line ( / or newline between lines). *word* is highlighted
- `cast` — Characters: [{ name, rig: "path/to/rig.json" | "bit", side: left|right, scale }]. rig.json lists the layer PNGs of a pixel character (see SKILL.md)
- `lines` — Timed lines instead of a script: [{ who, at (s), text, voice (audio file), pose, mood, place }]. A line with only `at` + `place` just moves the hosts
- `voices` — With a script: audio files, one per line in order. Each line lasts as long as its audio and the mouth follows it
- `place` — Starting layout: corner (small, bottom) | stage (big, centre) | left | right | hidden
- `captions` — bubble (speech bubbles, words appear as they are said) | none
- `accent` — Highlight colour for *words*
- `bg` — Background when used as a scene (as an overlay it is transparent)
- `backdrop` — none | studio — a soft-lit stage behind the hosts when used as a scene
- `label` — Small mono caption at the top of the studio backdrop (e.g. "RUDYWIZZ · 03 · HOW IT WORKS")

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
