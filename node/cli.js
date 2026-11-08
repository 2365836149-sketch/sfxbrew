#!/usr/bin/env node
/* 灵音 · 命令行：npx lingyin-sfx coin --out sfx/coin.wav */
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const HELP = `lingyin-sfx — procedural game sound effects, rendered locally

Usage:
  lingyin-sfx list [--json]                  list presets
  lingyin-sfx <preset> [options]             generate sound(s) from a preset
  lingyin-sfx render <patch.json> --out f.wav  render a custom patch

Options:
  --out <file.wav>     output file (default: ./<preset>.wav)
  --count <n>          generate n variants: <name>-01.wav, <name>-02.wav ...
  --seed <n>           reproducible result (printed after every run)
  --mutate <0-1>       small random tweak on top of the seeded result
  --js <file.js>       also write a drop-in JavaScript file that plays the sound(s)
  --json               machine-readable output (paths, seeds, patches)

Examples:
  npx lingyin-sfx coin --out assets/sfx/coin.wav
  npx lingyin-sfx swordQi --count 5 --out assets/sfx/sword.wav
  npx lingyin-sfx hit --seed 42 --js src/sfx.js
`;

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2), next = argv[i + 1];
      if (next == null || next.startsWith('--')) o[k] = true; else { o[k] = next; i++; }
    } else o._.push(a);
  }
  return o;
}

async function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  if (!cmd || o.help || cmd === 'help') { process.stdout.write(HELP); return; }

  if (cmd === 'list') {
    const list = lib.listPresets();
    if (o.json) { console.log(JSON.stringify(list, null, 2)); return; }
    for (const g of ['east', 'general']) {
      console.log(g === 'east' ? '\nEastern' : '\nGeneral');
      list.filter(p => p.group === g).forEach(p => console.log('  ' + p.id.padEnd(13) + p.description));
    }
    return;
  }

  let items = [];
  if (cmd === 'render') {
    const file = o._[1];
    if (!file) throw new Error('render needs a patch JSON file');
    const patch = lib.validatePatch(JSON.parse(fs.readFileSync(file, 'utf8')));
    items.push({ preset: 'custom', seed: null, patch, out: o.out || path.basename(file, '.json') + '.wav' });
  } else {
    const count = Math.max(1, Math.min(50, parseInt(o.count || '1', 10)));
    const out = o.out || cmd + '.wav';
    const base = o.seed != null ? parseInt(o.seed, 10) : null;
    const mut = o.mutate != null ? parseFloat(o.mutate) : 0;
    for (let i = 0; i < count; i++) {
      const g = lib.generate(cmd, base == null ? null : base + i, mut ? { mutate: mut } : null);
      const file = count === 1 ? out : out.replace(/(\.wav)?$/i, '-' + String(i + 1).padStart(2, '0') + '.wav');
      items.push(Object.assign(g, { out: file }));
    }
  }

  const results = [];
  for (const it of items) {
    const { bytes, seconds } = await lib.renderWav(it.patch);
    const file = lib.writeFile(it.out, bytes);
    results.push({ file, preset: it.preset, seed: it.seed, seconds: +seconds.toFixed(3), patch: it.patch, edit: lib.editorLink(it.preset, it.patch) });
  }
  if (o.js) {
    const names = results.map((r, i) => (r.preset === 'custom' ? path.basename(r.file, '.wav') : r.preset) + (results.length > 1 ? String(i + 1) : ''));
    lib.writeFile(o.js, lib.jsCode(results.map((r, i) => ({ name: names[i], patch: r.patch }))));
  }

  if (o.json) { console.log(JSON.stringify({ sounds: results, js: o.js ? path.resolve(o.js) : null }, null, 2)); return; }
  results.forEach(r => console.log(r.file + '  (' + r.seconds + ' s' + (r.seed != null ? ', seed ' + r.seed : '') + ')' + (r.edit ? '\n  edit: ' + r.edit : '')));
  if (o.js) console.log('JS: ' + path.resolve(o.js));
}

main().catch(e => { console.error('lingyin-sfx: ' + e.message); process.exit(1); });
