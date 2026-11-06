---
name: inflate
description: Inflate — Y2K chrome balloon letters puff up and bounce. Renders a video with the rudywizz-motion engine. Use when the user types /inflate or asks for this look.
argument-hint: "<text>"
---

# /inflate — Inflate

Y2K chrome balloon letters puff up and bounce.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Feel / good"):

```bash
node "$RM/engine/cli.mjs" still inflate --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/inflate-check.png   # look first
node "$RM/engine/cli.mjs" render inflate --text "$ARGUMENTS" --out inflate.mp4
```

Options (`--set key=value`, JSON values allowed):
- `chrome` — Puff ramp from rim to crown (array of hex)
- `face` — Chrome face gradient top→bottom: sky, horizon, ground (array of hex)
- `bgTop` — Background gradient top
- `bgBottom` — Background gradient bottom

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
