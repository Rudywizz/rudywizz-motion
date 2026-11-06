---
name: parchment-letter
description: Parchment Letter — Burnt-edge letter writes itself, then a wax seal stamps. Renders a video with the rudywizz-motion engine. Use when the user types /parchment-letter or asks for this look.
argument-hint: "<text>"
---

# /parchment-letter — Parchment Letter

Burnt-edge letter writes itself, then a wax seal stamps.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Sevgili kardeşim, / Burada kışlar uzun, ama şehir hâlâ güzel. / Her akşam limana inip gemileri sayıyorum. / Yakında dönerim."):

```bash
node "$RM/engine/cli.mjs" still parchment-letter --text "$ARGUMENTS" --at 5 --size 540 --out /tmp/parchment-letter-check.png   # look first
node "$RM/engine/cli.mjs" render parchment-letter --text "$ARGUMENTS" --out parchment-letter.mp4
```

Options (`--set key=value`, JSON values allowed):
- `place` — Place + date line (top right)
- `signature` — Signature under the letter
- `seal` — Letter(s) embossed in the wax seal ("" for none)
- `ink` — Ink colour
- `wax` — Seal colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
