---
name: receipt
description: Receipt — Thermal printer feeds out your message, then tears it off. Renders a video with the rudywizz-motion engine. Use when the user types /receipt or asks for this look.
argument-hint: "<text>"
---

# /receipt — Receipt

Thermal printer feeds out your message, then tears it off.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Small wins / count too"):

```bash
node "$RM/engine/cli.mjs" still receipt --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/receipt-check.png   # look first
node "$RM/engine/cli.mjs" render receipt --text "$ARGUMENTS" --out receipt.mp4
```

Options (`--set key=value`, JSON values allowed):
- `header` — Store name at the top
- `items` — Array of [label, value] rows printed above the message
- `total` — Value on the TOTAL row
- `date` — Date/time line (fixed string so renders are reproducible)
- `footer` — Last line before the barcode
- `table` — Background colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
