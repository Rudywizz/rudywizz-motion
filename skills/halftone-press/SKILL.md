---
name: halftone-press
description: Halftone Press — Two-colour risograph print, rolled on dot by dot. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Halftone Press

Two-colour risograph print, rolled on dot by dot.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Print / is not / dead"):

```bash
node "$RM/engine/cli.mjs" still halftone-press --text '<text>' --at 4 --size 540 --out "$TMP/halftone-press-check.png"   # look at it first
node "$RM/engine/cli.mjs" render halftone-press --text '<text>' --out halftone-press.mp4
```

Options (`--set key=value`, JSON values allowed):
- `inkA` — First ink (type)
- `inkB` — Second ink (sun + offset shadow)
- `dot` — Halftone cell size in px at 1080 wide
- `caption` — Small print at the bottom ("" to hide)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
