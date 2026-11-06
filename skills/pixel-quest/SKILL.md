---
name: pixel-quest
description: Pixel Quest — 8-bit title screen: the words drop in like a level name. Renders a video with the rudywizz-motion engine. Use when the user types /pixel-quest or asks for this look.
argument-hint: "<text>"
---

# /pixel-quest — Pixel Quest

8-bit title screen: the words drop in like a level name.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Level up"):

```bash
node "$RM/engine/cli.mjs" still pixel-quest --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/pixel-quest-check.png   # look first
node "$RM/engine/cli.mjs" render pixel-quest --text "$ARGUMENTS" --out pixel-quest.mp4
```

Options (`--set key=value`, JSON values allowed):
- `pixel` — Size of one game pixel in output px (4–10)
- `subtitle` — Blinking line under the title ("" to hide)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
