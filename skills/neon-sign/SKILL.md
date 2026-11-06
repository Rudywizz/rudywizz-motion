---
name: neon-sign
description: Neon Sign — Neon tubes stutter on over a brick wall, one stays faulty. Renders a video with the rudywizz-motion engine. Use when the user types /neon-sign or asks for this look.
argument-hint: "<text>"
---

# /neon-sign — Neon Sign

Neon tubes stutter on over a brick wall, one stays faulty.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Still / awake"):

```bash
node "$RM/engine/cli.mjs" still neon-sign --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/neon-sign-check.png   # look first
node "$RM/engine/cli.mjs" render neon-sign --text "$ARGUMENTS" --out neon-sign.mp4
```

Options (`--set key=value`, JSON values allowed):
- `colors` — Tube colour per line (array of hex)
- `wall` — Brick colour
- `broken` — One faulty, buzzing letter (true/false)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
