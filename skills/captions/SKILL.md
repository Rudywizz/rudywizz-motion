---
name: captions
description: Captions — Reel-style captions, active word on a colour pill. Renders a video with the rudywizz-motion engine. Use when the user types /captions or asks for this look.
argument-hint: "<text>"
---

# /captions — Captions

Reel-style captions, active word on a colour pill.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Bu altyazılar tamamen kodla üretildi ve şeffaf arka planla dışa aktarılabilir"):

```bash
node "$RM/engine/cli.mjs" still captions --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/captions-check.png   # look first
node "$RM/engine/cli.mjs" render captions --text "$ARGUMENTS" --out captions.mp4
```

Options (`--set key=value`, JSON values allowed):
- `maxWords` — Words per caption chunk (1–4)
- `position` — Vertical position, 0 = top, 1 = bottom
- `pill` — Highlight colour behind the active word
- `times` — Optional array of start seconds per word (from your transcript)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
