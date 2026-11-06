# Security

## What rudywizz-motion does on your machine

Being clear about this matters more than any badge:

- **No network access.** Nothing is uploaded, nothing is downloaded at render time, and
  there is no telemetry or analytics. Maps, fonts and data ship inside the repo.
- **One dependency:** [Playwright](https://github.com/microsoft/playwright) (Microsoft),
  used to drive a headless Chromium that draws the frames. Chromium is downloaded once by
  `npx playwright install chromium`; you can also point to your own Chrome with `RM_CHROME`.
- **A local web server only for the render.** The CLI starts a server bound to
  `127.0.0.1` on a random port, serving only the engine folder and the media files you
  passed in. Every URL contains a random per-run token, so other local programs and web
  pages can't guess paths. It stops when the render ends (or when you press Ctrl+C on
  `preview`).
- **Processes it runs:** `ffmpeg` (to encode video and read your clips) and the browser,
  started with argument arrays, never through a shell.
- **Files it writes:** the output you ask for (`--out`), and temporary clip frames in your
  OS temp folder, which are deleted after the render.

The full engine is ~3k lines of readable JavaScript in
[`skills/rudywizz-motion/engine`](skills/rudywizz-motion/engine). `engine/vendor/geo.min.js` is
an unmodified build of d3-geo + topojson-client (ISC).

## Supported versions

| Version | Supported |
|---|---|
| 2.x | ✅ |
| < 2.0 | ❌ |

## Reporting a vulnerability

Please **do not open a public issue**. Use
[GitHub private vulnerability reporting](https://github.com/Rudywizz/rudywizz-motion/security/advisories/new)
instead. You'll get an answer within a few days; fixes are released as a patch version
and credited to you unless you prefer otherwise.
