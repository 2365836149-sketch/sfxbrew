#!/usr/bin/env node
/* SFX Brew · 命令行：npx sfxbrew coin --out sfx/coin.wav */
'use strict';

/* `sfxbrew mcp` 启动 MCP 服务器（MCP Registry 用 npx sfxbrew mcp 启动；sfxbrew-mcp 也一样） */
if (process.argv[2] === 'mcp') { require('./mcp.js'); return; }

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const HELP = `sfxbrew — procedural game sound effects, rendered locally

Usage:
  sfxbrew list [--json]                  list presets
  sfxbrew <preset> [options]             generate sound(s) from a preset
  sfxbrew render <patch.json> --out f.wav  render a custom patch
  sfxbrew pack <preset> [--out dir]      game-engine pack: WAV variations + Godot .tres,
                                         Unity script, web JS, README (add --loop for loops)
  sfxbrew music list                     list music moods and stingers
  sfxbrew music <mood> [options]         compose and render a seamless music loop (stereo WAV)
  sfxbrew stinger <name> [--out f.wav]   render a short musical stinger (victory, guilt ...)
  sfxbrew mcp                            run the MCP server (stdio)

Options:
  --out <file.wav>     output file (default: ./<preset>.wav)
  --count <n>          generate n variants: <name>-01.wav, <name>-02.wav ...
  --seed <n>           reproducible result (printed after every run)
  --mutate <0-1>       small random tweak on top of the seeded result
  --loop <seconds>     seamless loop of about this length (ambience: rain, wind, campfire,
                       stream, caveDrip, thunder, chime, drum, monsterGrowl). WAV carries a loop point
  --js <file.js>       also write a drop-in JavaScript file that plays the sound(s)
  --json               machine-readable output (paths, seeds, patches)

Examples:
  npx sfxbrew coin --out assets/sfx/coin.wav
  npx sfxbrew swordQi --count 5 --out assets/sfx/sword.wav
  npx sfxbrew hit --seed 42 --js src/sfx.js
  npx sfxbrew rain --loop 30 --out assets/sfx/rain-loop.wav
  npx sfxbrew pack swordQi --count 8 --out assets/sfx
  npx sfxbrew pack campfire --loop 20 --out assets/sfx
  npx sfxbrew music medieval --count 3 --out music/town.wav   # three different town pieces
  npx sfxbrew stinger guiltChild --out music/guilt-child.wav
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
      list.filter(p => p.group === g).forEach(p => console.log('  ' + p.id.padEnd(13) + (p.loopable ? '[loop] ' : '') + p.description));
    }
    return;
  }

  if (cmd === 'music' || cmd === 'stinger') {
    const name = o._[1];
    if (!name || name === 'list') {
      console.log('\nMusic moods (sfxbrew music <mood>)');
      Object.entries(lib.MUSIC_META).forEach(([k, d]) => console.log('  ' + k.padEnd(14) + d));
      console.log('\nStingers (sfxbrew stinger <name>)');
      Object.entries(lib.STINGER_META).forEach(([k, d]) => console.log('  ' + k.padEnd(14) + d));
      return;
    }
    const count = Math.max(1, Math.min(20, parseInt(o.count || '1', 10)));
    const out = o.out || name + '.wav', base = o.seed != null ? parseInt(o.seed, 10) : null, results = [];
    for (let i = 0; i < count; i++) {
      const file = count === 1 ? out : out.replace(/(\.wav)?$/i, '-' + String(i + 1).padStart(2, '0') + '.wav');
      const r = cmd === 'music' ? await lib.renderMusic(name, { seed: base == null ? null : base + i, volume: o.volume != null ? parseFloat(o.volume) : null })
        : await lib.renderStinger(name);
      results.push({ file: lib.writeFile(file, r.bytes), seconds: +r.seconds.toFixed(2), seed: r.seed });
    }
    if (o.json) { console.log(JSON.stringify(results, null, 2)); return; }
    results.forEach(r => console.log(r.file + '  (' + r.seconds + ' s' + (r.seed != null ? ', seed ' + r.seed + ', seamless loop' : '') + ')'));
    return;
  }

  const loopSec = o.loop != null ? Math.max(3, Math.min(120, parseFloat(o.loop === true ? '10' : o.loop))) : 0;

  if (cmd === 'pack') {
    const preset = o._[1];
    if (!preset) throw new Error('pack needs a preset, e.g. sfxbrew pack swordQi');
    const r = await lib.exportPack({ preset, count: o.count ? parseInt(o.count, 10) : null, loopSeconds: loopSec, seed: o.seed != null ? parseInt(o.seed, 10) : null, outDir: o.out || '.' });
    if (o.json) { console.log(JSON.stringify(r, null, 2)); return; }
    console.log(r.folder + '/');
    r.files.forEach(f => console.log('  ' + path.relative(r.folder, f)));
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
    if (loopSec && it.preset !== 'custom' && !lib.LOOPABLE.includes(it.preset)) throw new Error('"' + it.preset + '" is not loopable. Loopable: ' + lib.LOOPABLE.join(', '));
    const { bytes, seconds } = loopSec ? await lib.renderLoop(it.patch, { seconds: loopSec, preset: it.preset }) : await lib.renderWav(it.patch);
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

main().catch(e => { console.error('sfxbrew: ' + e.message); process.exit(1); });
