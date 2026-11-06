---
name: orbit-ring
description: Orbit Ring — Text rings spin around a glowing planet. Renders a video with the rudywizz-motion engine. Use when the user types /orbit-ring or asks for this look.
argument-hint: "<text>"
---

# /orbit-ring — Orbit Ring

Text rings spin around a glowing planet.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Stay curious / keep moving / make things"):

```bash
node "$RM/engine/cli.mjs" still orbit-ring --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/orbit-ring-check.png   # look first
node "$RM/engine/cli.mjs" render orbit-ring --text "$ARGUMENTS" --out orbit-ring.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — One ring per line (max 4)
- `ink` — Ring text colour
- `accent` — Colour of every other ring
- `planetA` — Planet colour (light side)
- `planetB` — Planet colour (dark side)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
