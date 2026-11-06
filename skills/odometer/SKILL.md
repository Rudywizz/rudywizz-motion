---
name: odometer
description: Odometer — Rolling digit drums count up to your number. Renders a video with the rudywizz-motion engine. Use when the user types /odometer or asks for this look.
argument-hint: "<text>"
---

# /odometer — Odometer

Rolling digit drums count up to your number.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "12500 downloads"):

```bash
node "$RM/engine/cli.mjs" still odometer --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/odometer-check.png   # look first
node "$RM/engine/cli.mjs" render odometer --text "$ARGUMENTS" --out odometer.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — A number followed by a label, e.g. "10000 takipçi"
- `from` — Start value
- `prefix` — Text before the number, e.g. "$" or "+"
- `suffix` — Text after the number, e.g. "%" or "K"
- `accent` — Label bar + confetti colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
