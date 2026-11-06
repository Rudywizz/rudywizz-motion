#!/usr/bin/env node
// Re-renders every preview GIF in gallery/. Usage: node scripts/build-gallery.mjs [--only id,id] [--jobs 4]
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'skills/rudywizz-motion/engine/cli.mjs');
const OUT = path.join(ROOT, 'gallery');
const DEMO = path.join(ROOT, 'skills/rudywizz-motion/assets/demo');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const jobs = args.includes('--jobs') ? Number(args[args.indexOf('--jobs') + 1]) : 4;

const base = ['--size', '240', '--fps', '10', '--bloom', '0.25', '--quiet'];
const items = [
  ['murmuration', ['murmuration', '--duration', '5']],
  ['led-marquee', ['led-marquee', '--duration', '5']],
  ['receipt', ['receipt', '--duration', '5']],
  ['ink-bleed', ['ink-bleed', '--duration', '5']],
  ['halftone-press', ['halftone-press', '--duration', '4.5']],
  ['signal-tune', ['signal-tune', '--duration', '5']],
  ['inflate', ['inflate', '--duration', '4', '--camera', 'crash-zoom']],
  ['orbit-ring', ['orbit-ring', '--duration', '4.5', '--camera', 'tilt-left']],
  ['beat-cut', ['beat-cut', '--duration', '5']],
  ['lyric-video', ['lyric-video', '--duration', '6']],
  ['captions', ['captions', '--duration', '4.5']],
  ['split-flap', ['split-flap', '--duration', '4']],
  ['neon-sign', ['neon-sign', '--duration', '4', '--camera', 'orbit']],
  ['odometer', ['odometer', '--duration', '4', '--lang', 'tr', '--text', '10000 takipçi']],
  ['pixel-quest', ['pixel-quest', '--duration', '4']],
  ['vhs-memory', ['vhs-memory', '--duration', '4.5']],
  ['history-title', ['history-title', '--duration', '5', '--grade', 'sepia', '--film', '0.6']],
  ['parchment-letter', ['parchment-letter', '--duration', '6']],
  ['map-globe', ['map-route', '--duration', '6', '--set', 'route=["İstanbul","Roma","Londra"]', '--text', 'Avrupa Turu', '--set', 'mode="globe"']],
  ['map-turkey', ['map-route', '--duration', '6']],
  ['map-atlas', ['map-route', '--duration', '6', '--set', 'theme="atlas"', '--set', 'route=["Söğüt","Bursa","Edirne","İstanbul"]', '--text', 'Bir Beylikten Cihana']],
  ['look-engrave', ['image', '--image', path.join(DEMO, 'seyyah.svg'), '--look', 'engrave', '--duration', '5', '--camera', 'push-in', '--grade', 'sepia', '--film', '0.5']],
  ['look-sketch', ['image', '--image', path.join(DEMO, 'portrait.svg'), '--look', 'sketch', '--duration', '5', '--camera', 'drift']],
].filter(([id]) => !only || only.includes(id));

fs.mkdirSync(OUT, { recursive: true });
let i = 0;
const run = () => {
  if (i >= items.length) return Promise.resolve();
  const [id, a] = items[i++];
  return new Promise((res) => {
    const p = spawn('node', [CLI, 'render', ...a, ...base, '--out', path.join(OUT, `${id}.gif`)], { stdio: 'inherit' });
    p.on('close', (code) => {
      process.stdout.write(`${code === 0 ? '✓' : '✗'} ${id}\n`);
      res();
    });
  }).then(run);
};
await Promise.all(Array.from({ length: jobs }, run));
