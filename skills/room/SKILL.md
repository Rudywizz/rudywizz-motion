---
name: room
description: Room — A cut-away 3D studio loft with cinematic camera moves; your pixel hosts live in it and screens show your work. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Room

A cut-away 3D studio loft with cinematic camera moves; your pixel hosts live in it and screens show your work.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "rudywizz"):

```bash
node "$RM/engine/cli.mjs" still room --text '<text>' --at 5 --size 540 --out "$TMP/room-check.png"   # look at it first
node "$RM/engine/cli.mjs" render room --text '<text>' --out room.mp4
```

Options (`--set key=value`, JSON values allowed):
- `shots` — Camera: [{ at, cam, move, blend }]. cam: establish wide top desk monitor sofa neon tv gallery map window table shelf host. move: drift push pull orbit crane truck dive (into the monitor / tv / map, so the next scene comes out of the screen). blend: seconds to travel from the previous shot (0 = cut)
- `cast` — Hosts: [{ name, rig: "path/to/rig.json" | "bit" }] (see presenter)
- `lines` — Voice lines: [{ who, at, text, voice, pose, mood, spot }] — a host appears for its lines at `spot` (desk sofa tv center gallery window front). The mouth follows the voice
- `show` — Extra appearances without a line: [{ who, from, to, spot, pose }]
- `images` — Local image files for the screens (index into this list from monitor / tv / gallery / poster)
- `monitor` — Desk monitor: [{ at, text }] types the text in a terminal, or [{ at, image }]
- `tv` — TV: [{ at, image }] or [{ at, text }]
- `gallery` — Image indexes framed on the right wall
- `poster` — Image index for the map poster on the back wall
- `neon` — Neon sign text above the sofa
- `models` — Folder of glTF furniture (optional; procedural furniture otherwise)
- `bpm` — Speaker cones and the LED strip pulse on this tempo
- `mixVoices` — false when an overlay already plays the same voice lines (avoids playing them twice)
- `accent` — Accent colour (neon, highlights)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
