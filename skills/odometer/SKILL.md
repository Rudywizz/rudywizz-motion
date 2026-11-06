---
name: odometer
description: Odometer — Rolling digit drums count up to your number. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Odometer

Rolling digit drums count up to your number.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "12500 downloads"):

```bash
node "$RM/engine/cli.mjs" still odometer --text '<text>' --at 4 --size 540 --out "$TMP/odometer-check.png"   # look at it first
node "$RM/engine/cli.mjs" render odometer --text '<text>' --out odometer.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — A number followed by a label, e.g. "10000 takipçi"
- `from` — Start value
- `prefix` — Text before the number, e.g. "$" or "+"
- `suffix` — Text after the number, e.g. "%" or "K"
- `accent` — Label bar + confetti colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
