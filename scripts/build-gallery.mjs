#!/usr/bin/env node
// Re-renders every preview in gallery/ (animated WebP: ~6× smaller than GIF, full colour).
// Usage: node scripts/build-gallery.mjs [--only id,id] [--jobs 3] [--skip-hero]
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'skills/rudywizz-motion/engine/cli.mjs');
const OUT = path.join(ROOT, 'gallery');
const DEMO = path.join(ROOT, 'skills/rudywizz-motion/assets/demo');
const STYLES = path.join(ROOT, 'skills/rudywizz-motion/styles');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const jobs = args.includes('--jobs') ? Number(args[args.indexOf('--jobs') + 1]) : Math.max(1, Math.min(4, os.cpus().length - 1));

const STORY = 'Ada [wave, wide]: Hi! I am made of code. / Rudy [present, medium]: Same script, three finishes. / Ada [happy, close]: Pick one!';
// small tiles for the README grid
const tile = ['--size', '270', '--fps', '12', '--bloom', '0.25', '--quiet'];
const items = [
  // kinetic typography
  ['word-stack', ['word-stack', '--duration', '4.5', '--camera', 'punch-in']],
  ['typewriter', ['typewriter', '--duration', '6', '--set', 'theme="terminal"', '--bloom', '0.3']],
  ['scramble', ['scramble', '--duration', '4.5']],
  ['ticker-rows', ['ticker-rows', '--duration', '4.5']],
  ['highlight-quote', ['highlight-quote', '--duration', '6']],
  ['glitch-title', ['glitch-title', '--duration', '4.5']],
  ['beat-cut', ['beat-cut', '--duration', '5']],
  ['lyric-video', ['lyric-video', '--duration', '6']],
  ['murmuration', ['murmuration', '--duration', '5']],
  ['ink-bleed', ['ink-bleed', '--duration', '5']],
  ['halftone-press', ['halftone-press', '--duration', '4.5']],
  ['neon-sign', ['neon-sign', '--duration', '4', '--camera', 'orbit']],
  ['inflate', ['inflate', '--duration', '4', '--camera', 'crash-zoom']],
  ['led-marquee', ['led-marquee', '--duration', '5']],
  ['split-flap', ['split-flap', '--duration', '4']],
  ['pixel-quest', ['pixel-quest', '--duration', '4']],
  ['vhs-memory', ['vhs-memory', '--duration', '4.5']],
  ['signal-tune', ['signal-tune', '--duration', '5']],
  ['receipt', ['receipt', '--duration', '5']],
  // 3D
  ['extrude-3d', ['extrude-3d', '--duration', '5']],
  ['cube-spin', ['cube-spin', '--duration', '6']],
  ['text-tunnel', ['text-tunnel', '--duration', '5']],
  ['retro-grid', ['retro-grid', '--duration', '5']],
  ['particle-sphere', ['particle-sphere', '--duration', '6']],
  ['card-carousel', ['card-carousel', '--duration', '6']],
  ['orbit-ring', ['orbit-ring', '--duration', '4.5', '--camera', 'tilt-left']],
  // social & broadcast
  ['countdown', ['countdown', '--duration', '5']],
  ['lower-third', ['lower-third', '--duration', '5', '--set', 'theme="glass"']],
  ['chat-story', ['chat-story', '--duration', '8']],
  ['bar-chart', ['bar-chart', '--duration', '7']],
  ['cta-follow', ['cta-follow', '--duration', '4.5']],
  ['captions', ['captions', '--duration', '4.5']],
  ['odometer', ['odometer', '--duration', '4', '--lang', 'tr', '--text', '10000 takipçi']],
  // maps & history
  ['map-globe', ['map-route', '--duration', '6', '--set', 'route=["İstanbul","Roma","Londra"]', '--text', 'Avrupa Turu', '--set', 'mode="globe"']],
  ['map-turkey', ['map-route', '--duration', '6']],
  ['map-atlas', ['map-route', '--duration', '6', '--set', 'theme="atlas"', '--set', 'route=["Söğüt","Bursa","Edirne","İstanbul"]', '--text', 'Bir Beylikten Cihana']],
  ['history-title', ['history-title', '--duration', '5', '--grade', 'sepia', '--film', '0.6']],
  ['parchment-letter', ['parchment-letter', '--duration', '6']],
  ['look-engrave', ['image', '--image', path.join(DEMO, 'seyyah.svg'), '--look', 'engrave', '--duration', '5', '--camera', 'push-in', '--grade', 'sepia', '--film', '0.5']],
  ['look-sketch', ['image', '--image', path.join(DEMO, 'portrait.svg'), '--look', 'sketch', '--duration', '5', '--camera', 'drift']],
  ['map-usa', ['map-route', '--duration', '6', '--lang', 'en', '--set', 'route=["Seattle","Denver","Chicago","New York"]', '--text', 'Road Trip']],
  ['map-japan', ['map-route', '--duration', '6', '--lang', 'en', '--set', 'theme="light"', '--set', 'route=["Tokyo","Kyoto","Hiroshima"]', '--text', 'Japan']],
  // stories & hosts
  ['story-3d', ['story-3d', '--duration', '7', '--set', 'set="office"', '--text', STORY]],
  ['story-3d-clay', ['story-3d', '--duration', '7', '--set', 'finish="clay"', '--set', 'set="office"', '--text', STORY]],
  ['story-3d-bricks', ['story-3d', '--duration', '7', '--set', 'finish="brick"', '--set', 'set="office"', '--text', STORY]],
  ['doodle-story', ['doodle-story', '--duration', '7']],
  ['presenter', [path.join(ROOT, 'scripts/presenter-demo.json')]],
  // engine showcase: every transition in a row
  ['transitions', [path.join(ROOT, 'scripts/transitions-demo.json')]],
]
  .filter(([, a]) => a[0].endsWith('.json') || a[0] === 'image' || fs.existsSync(path.join(STYLES, a[0])))
  .map(([id, a]) => [id, [...a, ...tile, '--out', path.join(OUT, `${id}.webp`)]]);

// the big README hero (16:9 showreel template)
if (!args.includes('--skip-hero')) items.unshift(['hero', ['showreel', '--format', '16:9', '--size', '360', '--fps', '15', '--bloom', '0.25', '--quiet', '--out', path.join(OUT, 'hero.webp')]]);

const todo = items.filter(([id]) => !only || only.includes(id));
fs.mkdirSync(OUT, { recursive: true });
let i = 0;
let failed = 0;
const worker = async () => {
  while (i < todo.length) {
    const [id, a] = todo[i++];
    const code = await new Promise((res) => spawn(process.execPath, [CLI, 'render', ...a], { stdio: 'inherit', cwd: ROOT }).on('close', res));
    if (code) failed++;
    const f = path.join(OUT, `${id}.webp`);
    process.stdout.write(`${code === 0 ? '✓' : '✗'} ${id}${code === 0 ? `  ${(fs.statSync(f).size / 1024).toFixed(0)} KB` : ''}\n`);
  }
};
await Promise.all(Array.from({ length: jobs }, worker));
process.exitCode = failed ? 1 : 0;
