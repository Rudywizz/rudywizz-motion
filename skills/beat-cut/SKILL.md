---
name: beat-cut
description: Beat Cut — One stamped word per beat on a Swiss-grid poster. Renders a video with the rudywizz-motion engine. Use when the user types /beat-cut or asks for this look.
argument-hint: "<text>"
---

# /beat-cut — Beat Cut

One stamped word per beat on a Swiss-grid poster.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Write it / cut it / stamp it / ship it"):

```bash
node "$RM/engine/cli.mjs" still beat-cut --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/beat-cut-check.png   # look first
node "$RM/engine/cli.mjs" render beat-cut --text "$ARGUMENTS" --out beat-cut.mp4
```

Options (`--set key=value`, JSON values allowed):
- `bpm` — Tempo — one word per beat
- `offset` — Seconds before the first beat (sync with your audio)
- `hot` — Accent ink used on every 4th word
- `paper` — Poster colour
- `ink` — Main ink colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
