---
name: chat-story
description: Chat Story — A text conversation plays out: typing dots, springy bubbles, auto-scroll. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Chat Story

A text conversation plays out: typing dots, springy bubbles, auto-scroll.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "are you awake? / >yes why / I just rendered a whole video / with code. no editor. / >wait what / >send it NOW"):

```bash
node "$RM/engine/cli.mjs" still chat-story --text '<text>' --at 5 --size 540 --out "$TMP/chat-story-check.png"   # look at it first
node "$RM/engine/cli.mjs" render chat-story --text '<text>' --out chat-story.mp4
```

Options (`--set key=value`, JSON values allowed):
- `name` — Contact name in the header
- `theme` — dark | light
- `accent` — Your bubble colour
- `time` — Date chip above the thread ("" to hide)
- `seen` — Read receipt under your last message ("" to hide)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
