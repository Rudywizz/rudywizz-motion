---
name: vhs-memory
description: VHS Memory — Home-video tape: PLAY, tracking noise, date stamp. Renders a video with the rudywizz-motion engine. Use when the user types /vhs-memory or asks for this look.
argument-hint: "<text>"
---

# /vhs-memory — VHS Memory

Home-video tape: PLAY, tracking noise, date stamp.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Summer / tapes"):

```bash
node "$RM/engine/cli.mjs" still vhs-memory --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/vhs-memory-check.png   # look first
node "$RM/engine/cli.mjs" render vhs-memory --text "$ARGUMENTS" --out vhs-memory.mp4
```

Options (`--set key=value`, JSON values allowed):
- `date` — Date stamp (bottom right)
- `clock` — Time stamp under the date
- `warmA` — Footage colour 1
- `warmB` — Footage colour 2

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
