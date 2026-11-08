---
name: editorial
description: Editorial — Magazine-style kinetic captions synced to a voice-over, with masthead, section counter and tags. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Editorial

Magazine-style kinetic captions synced to a voice-over, with masthead, section counter and tags.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Every word *lands* on time. / Captions that read like a *magazine.*"):

```bash
node "$RM/engine/cli.mjs" still editorial --text '<text>' --at 4 --size 540 --out "$TMP/editorial-check.png"   # look at it first
node "$RM/engine/cli.mjs" render editorial --text '<text>' --out editorial.mp4
```

Options (`--set key=value`, JSON values allowed):
- `lines` — Timed lines: [{ who, at, text, voice }]. *word* = hero word (otherwise the longest word is). The voice file times the words and is played (see mixVoices)
- `text` — Without lines: phrases separated by " / " shown one after another
- `masthead` — Masthead text (top left); "" hides the masthead
- `sections` — Section counter: [{ at, title }] → "03 / 11  TITLE" top right
- `tags` — Labels: [{ from, to, text, label }] e.g. { label: "STYLE", text: "neon-sign" }
- `zones` — Caption position over time: [{ at, pos: top | middle | bottom }]
- `pos` — Default caption position
- `accent` — Hero word colour
- `mixVoices` — false when the scene already plays the voices
- `speakers` — Show the speaker tag above each phrase

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
