#!/usr/bin/env node
// Smoke tests: renders a still of every style and template, checks determinism,
// output formats and that bad input fails with a helpful message.
// Usage: node scripts/smoke.mjs [--jobs 4] [--quick]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'skills/rudywizz-motion/engine/cli.mjs');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-smoke-'));
const argv = process.argv.slice(2);
const jobs = argv.includes('--jobs') ? Number(argv[argv.indexOf('--jobs') + 1]) : Math.max(1, Math.min(4, os.cpus().length - 1));
const quick = argv.includes('--quick');

const run = (args) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [CLI, ...args], { cwd: ROOT });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const list = JSON.parse((await run(['list', '--json'])).out);
const styles = list.styles.map((s) => s.id);
const templates = fs.readdirSync(path.join(ROOT, 'skills/rudywizz-motion/templates')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

const tests = [];
const LONG = 'Çekoslovakyalılaştıramadıklarımızdan';
for (const id of styles) {
  tests.push([`style ${id}`, async () => {
    const f = path.join(OUT, `${id}.png`);
    const r = await run(['still', id, '--at', '2', '--size', '270', '--out', f, '--quiet', '--strict']);
    if (r.code !== 0 || !fs.existsSync(f)) throw new Error(r.out);
  }]);
  if (!quick)
    tests.push([`style ${id} long text 16:9`, async () => {
      const f = path.join(OUT, `${id}-long.png`);
      const r = await run(['still', id, '--text', `${LONG} / İğdır ışık`, '--format', '16:9', '--at', '3', '--size', '270', '--out', f, '--quiet']);
      if (r.code !== 0 || !fs.existsSync(f)) throw new Error(r.out);
    }]);
}
for (const id of templates) {
  tests.push([`template ${id}`, async () => {
    const f = path.join(OUT, `tpl-${id}.png`);
    const r = await run(['still', id, '--at', '3', '--size', '270', '--out', f, '--quiet', '--strict']);
    if (r.code !== 0 || !fs.existsSync(f)) throw new Error(r.out);
  }]);
}
tests.push(['--version matches package.json (root, skill, plugin)', async () => {
  const want = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  const got = (await run(['--version'])).out.trim();
  const skill = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills/rudywizz-motion/package.json'), 'utf8')).version;
  const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/plugin.json'), 'utf8')).version;
  if (got !== want || skill !== want || plugin !== want) throw new Error(`package ${want}, cli ${got}, skill ${skill}, plugin ${plugin}`);
}]);
tests.push(['deterministic (same input → same pixels)', async () => {
  const a = path.join(OUT, 'det-a.png');
  const b = path.join(OUT, 'det-b.png');
  await run(['still', 'murmuration', '--at', '2.5', '--size', '270', '--seed', '7', '--out', a, '--quiet']);
  await run(['still', 'murmuration', '--at', '2.5', '--size', '270', '--seed', '7', '--out', b, '--quiet']);
  if (sha(a) !== sha(b)) throw new Error('two renders with the same seed differ');
}]);
for (const ext of quick ? ['mp4'] : ['mp4', 'webm', 'mov', 'gif']) {
  tests.push([`render .${ext}`, async () => {
    const f = path.join(OUT, `out.${ext}`);
    const extra = ext === 'mov' || ext === 'webm' ? ['--alpha'] : [];
    const r = await run(['render', 'captions', '--duration', '1', '--size', '180', '--out', f, '--quiet', ...extra]);
    if (r.code !== 0 || !fs.existsSync(f) || fs.statSync(f).size < 1000) throw new Error(r.out);
  }]);
}
tests.push(['music: every mood, same seed → same track', async () => {
  for (const mood of ['upbeat', 'chill', 'retro', 'cinematic']) {
    const a = path.join(OUT, `${mood}-a.wav`);
    const b = path.join(OUT, `${mood}-b.wav`);
    for (const f of [a, b]) {
      const r = await run(['music', mood, '--duration', '3', '--seed', '2', '--out', f, '--quiet']);
      if (r.code !== 0 || !fs.existsSync(f)) throw new Error(r.out);
    }
    if (sha(a) !== sha(b)) throw new Error(`${mood}: two tracks with the same seed differ`);
    if (fs.statSync(a).size !== 44 + 3 * 44100 * 4) throw new Error(`${mood}: wrong length`);
  }
}]);
tests.push(['render with --music', async () => {
  const f = path.join(OUT, 'music.mp4');
  const r = await run(['render', 'captions', '--duration', '1', '--size', '180', '--music', 'retro', '--out', f, '--quiet']);
  if (r.code !== 0 || !fs.existsSync(f)) throw new Error(r.out);
  const p = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', f]);
  if (!String(p.stdout).includes('aac')) throw new Error('no audio stream');
}]);
const mustFail = [
  [['render', 'neon-sign', '--music', 'polka'], /Unknown music mood "polka"/],
  [['render', 'neon-sing'], /Did you mean "neon-sign"/],
  [['still', 'neon-sign', '--camera', 'orbt'], /Did you mean "orbit"/],
  [['still', 'neon-sign', '--size', 'abc'], /--size expects a number/],
  [['still', 'neon-sign', '--colour', 'red'], /Unknown option --colour/],
  [['render', 'neon-sign', '--out', 'x.avi'], /Unsupported output/],
  [['render', 'neon-sign', '--alpha', '--out', 'x.mp4'], /MP4 cannot hold transparency/],
];
for (const [args, re] of mustFail) {
  tests.push([`rejects: ${args.slice(1).join(' ')}`, async () => {
    const r = await run(args);
    if (r.code === 0 || !re.test(r.out)) throw new Error(`expected failure matching ${re}, got (${r.code}):\n${r.out}`);
  }]);
}

let i = 0;
let failed = 0;
const t0 = Date.now();
const worker = async () => {
  while (i < tests.length) {
    const [name, fn] = tests[i++];
    try {
      await fn();
      process.stdout.write(`  \x1b[32m✓\x1b[0m ${name}\n`);
    } catch (e) {
      failed++;
      process.stdout.write(`  \x1b[31m✗\x1b[0m ${name}\n${String(e.message).replace(/^/gm, '      ')}\n`);
    }
  }
};
await Promise.all(Array.from({ length: jobs }, worker));
process.stdout.write(`\n${tests.length - failed}/${tests.length} passed in ${((Date.now() - t0) / 1000).toFixed(0)}s · outputs in ${OUT}\n`);
process.exitCode = failed ? 1 : 0;
