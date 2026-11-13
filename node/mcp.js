#!/usr/bin/env node
/* ============================================================================
   SFX Brew · MCP 服务（stdio，本地运行，零成本）
   ----------------------------------------------------------------------------
   给 Claude Code / Cursor 等 agent 用：
     claude mcp add sfxbrew -- npx -y sfxbrew mcp
   工具：list_presets / generate_sfx / render_patch / get_js_code / export_pack / generate_music
   ★ 只写 .wav / .js 文件，防止 agent 传错路径把别的文件覆盖掉。
   ==========================================================================*/
'use strict';

const path = require('path');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const lib = require('./lib.js');
const pkg = require('../package.json');

const server = new McpServer({ name: 'sfxbrew', version: pkg.version });

const ok = obj => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });
const fail = msg => ({ content: [{ type: 'text', text: 'Error: ' + msg }], isError: true });
function checkExt(p, ext) {
  if (path.extname(p).toLowerCase() !== ext) throw new Error('path must end with ' + ext + ': ' + p);
  return p;
}
const presetIds = lib.PRESETS.map(p => p.id);

server.registerTool('list_presets', {
  title: 'List sound presets',
  description: 'List the procedural sound effect presets (Eastern wuxia/xianxia sounds and general game sounds) with category, tags and what each is good for. ' +
    'Optionally filter by category (' + lib.CATALOG.CATEGORIES.map(c => c.id).join(', ') + ') or a search query such as "metal", "calm" or "sword". ' +
    'Every call to generate_sfx with a preset gives a new random variation; pass a seed to reproduce one.',
  inputSchema: {
    category: z.enum(lib.CATALOG.CATEGORIES.map(c => c.id)).optional().describe('Only presets in this category'),
    query: z.string().optional().describe('Words that must all match the name, description, keywords or tags')
  },
  annotations: { readOnlyHint: true }
}, async ({ category, query }) => ok(lib.listPresets({ category, query })));

server.registerTool('generate_sfx', {
  title: 'Generate sound effect WAV files',
  description: 'Synthesize game sound effects locally from a preset and write 16-bit mono 44.1 kHz WAV files. ' +
    'Free for commercial use, no attribution. Returns file paths, the seed of each variant (reuse it to get the exact same sound) and the patch JSON (edit it and call render_patch to fine-tune). ' +
    'Presets: ' + presetIds.join(', ') + '.',
  inputSchema: {
    preset: z.enum(presetIds).describe('Preset id, see list_presets'),
    out_path: z.string().describe('WAV file to write, e.g. "assets/sfx/coin.wav". Relative paths resolve against the server working directory. With count > 1, files get -01, -02 ... suffixes.'),
    count: z.number().int().min(1).max(20).optional().describe('Number of variants to write (default 1). Useful to let the user pick, or for randomized playback.'),
    seed: z.number().int().optional().describe('Seed for a reproducible result; variant i uses seed + i'),
    mutate: z.number().min(0).max(1).optional().describe('Extra random tweak amount on top of the seeded result, 0-1 (e.g. 0.15)'),
    js_path: z.string().optional().describe('Also write a dependency-free .js file with play functions for these sounds (Web Audio, no audio files needed)'),
    loop_seconds: z.number().min(3).max(120).optional().describe('Write a seamless loop of about this many seconds instead of a one-shot (the WAV carries a loop point). Only for loopable presets: ' + lib.LOOPABLE.join(', ') + '. Use for background ambience.')
  },
  annotations: { destructiveHint: false }
}, async ({ preset, out_path, count, seed, mutate, js_path, loop_seconds }) => {
  try {
    checkExt(out_path, '.wav');
    if (js_path) checkExt(js_path, '.js');
    if (loop_seconds && !lib.LOOPABLE.includes(preset)) throw new Error('"' + preset + '" is not loopable. Loopable presets: ' + lib.LOOPABLE.join(', '));
    if (loop_seconds && js_path) throw new Error('js_path is for one-shots; for a loop use export_pack (it writes a web player that loops the WAV)');
    const n = count || 1, sounds = [];
    for (let i = 0; i < n; i++) {
      const g = lib.generate(preset, seed == null ? null : seed + i, mutate ? { mutate } : null);
      const file = n === 1 ? out_path : out_path.replace(/\.wav$/i, '-' + String(i + 1).padStart(2, '0') + '.wav');
      const { bytes, seconds } = loop_seconds ? await lib.renderLoop(g.patch, { seconds: loop_seconds, preset }) : await lib.renderWav(g.patch);
      sounds.push({ file: lib.writeFile(file, bytes), seconds: +seconds.toFixed(3), seed: g.seed, patch: g.patch, edit_in_browser: lib.editorLink(preset, g.patch) || undefined });
    }
    let js;
    if (js_path) js = lib.writeFile(js_path, lib.jsCode(sounds.map((s, i) => ({ name: preset + (n > 1 ? String(i + 1) : ''), patch: s.patch }))));
    return ok({ preset, sounds, js_file: js });
  } catch (e) { return fail(e.message); }
});

server.registerTool('render_patch', {
  title: 'Render a custom sound patch',
  description: 'Render a hand-edited patch (for example one returned by generate_sfx with changed values) to a WAV file.\n' + lib.PATCH_DOC,
  inputSchema: {
    patch: z.record(z.string(), z.any()).describe('Patch JSON object with a "layers" array'),
    out_path: z.string().describe('WAV file to write'),
    js_path: z.string().optional().describe('Also write a .js file with a play function for this sound'),
    name: z.string().optional().describe('Name used for the JS play function (default: file name)')
  },
  annotations: { destructiveHint: false }
}, async ({ patch, out_path, js_path, name }) => {
  try {
    checkExt(out_path, '.wav');
    if (js_path) checkExt(js_path, '.js');
    const p = lib.validatePatch(patch);
    const { bytes, seconds } = await lib.renderWav(p);
    const file = lib.writeFile(out_path, bytes);
    let js;
    if (js_path) js = lib.writeFile(js_path, lib.jsCode([{ name: name || path.basename(out_path, '.wav'), patch: p }]));
    return ok({ file, seconds: +seconds.toFixed(3), js_file: js });
  } catch (e) { return fail(e.message); }
});

server.registerTool('get_js_code', {
  title: 'Get drop-in JavaScript for sounds',
  description: 'Return one self-contained JavaScript snippet (Web Audio, ~7 KB, no dependencies, no audio files) that defines play functions for several sounds. ' +
    'Best for browser games: paste it in and call e.g. playCoin() after a user gesture. Each sound is either {name, preset, seed} or {name, patch}.',
  inputSchema: {
    sounds: z.array(z.object({
      name: z.string().describe('Used for the function name, e.g. "coin" -> playCoin()'),
      preset: z.enum(presetIds).optional(),
      seed: z.number().int().optional().describe('Seed from generate_sfx to get the same sound; random if omitted'),
      patch: z.record(z.string(), z.any()).optional().describe('Custom patch instead of preset')
    })).min(1).max(50)
  },
  annotations: { readOnlyHint: true }
}, async ({ sounds }) => {
  try {
    const list = sounds.map(s => {
      if (s.patch) return { name: s.name, patch: lib.validatePatch(s.patch) };
      if (!s.preset) throw new Error('sound "' + s.name + '" needs a preset or a patch');
      const g = lib.generate(s.preset, s.seed);
      return { name: s.name, patch: g.patch, seed: g.seed };
    });
    const seeds = list.filter(s => s.seed != null).map(s => s.name + ': seed ' + s.seed).join(', ');
    return ok((seeds ? '// ' + seeds + '\n' : '') + lib.jsCode(list));
  } catch (e) { return fail(e.message); }
});

server.registerTool('export_pack', {
  title: 'Export a game-engine sound pack',
  description: 'Write a ready-to-use folder for game engines: several WAV variations of one preset (or several seamless loops), ' +
    'a Godot 4 AudioStreamRandomizer (.tres, plays a random variation each time), a Unity SfxBrewPlayer.cs component, ' +
    'a plain Web Audio .js player and a README. Loop WAVs carry a loop point that Godot, FMOD, Wwise and GameMaker read. ' +
    'Writes <out_dir>/sfxbrew-<preset>/. For Godot, out_dir should be the project root (res://) so the .tres paths resolve.',
  inputSchema: {
    preset: z.enum(presetIds).describe('Preset id, see list_presets'),
    out_dir: z.string().describe('Directory to create the sfxbrew-<preset> folder in, e.g. "." for a Godot project root or "Assets/Audio" for Unity'),
    count: z.number().int().min(1).max(30).optional().describe('Number of variations (default 8) or loops (default 2, max 6)'),
    loop_seconds: z.number().min(3).max(120).optional().describe('Make seamless loops of about this many seconds. Only for: ' + lib.LOOPABLE.join(', ')),
    seed: z.number().int().optional().describe('Seed for reproducible results; variation i uses seed + i')
  },
  annotations: { destructiveHint: false }
}, async ({ preset, out_dir, count, loop_seconds, seed }) => {
  try {
    const r = await lib.exportPack({ preset, outDir: out_dir, count, loopSeconds: loop_seconds, seed });
    return ok(r);
  } catch (e) { return fail(e.message); }
});

server.registerTool('generate_music', {
  title: 'Compose a music loop',
  description: 'Compose and render background music locally as a seamless stereo WAV loop (the WAV carries a loop point; one full piece with intro, themes and outro, about 1-2 minutes). ' +
    'Every seed is a different piece in the same style. Moods: ' + Object.entries(lib.MUSIC_META).map(([k, d]) => k + ' (' + d + ')').join('; ') + '. ' +
    'Also renders short stingers instead when "stinger" is given: ' + Object.entries(lib.STINGER_META).map(([k, d]) => k + ' (' + d + ')').join('; ') + '.',
  inputSchema: {
    mood: z.enum(Object.keys(lib.MUSIC_META)).optional().describe('Music style for a loop'),
    stinger: z.enum(Object.keys(lib.STINGER_META)).optional().describe('Render this short stinger instead of a loop'),
    out_path: z.string().describe('WAV file to write, e.g. "assets/music/town.wav". With count > 1, files get -01, -02 ... suffixes.'),
    count: z.number().int().min(1).max(10).optional().describe('Number of different pieces (default 1)'),
    seed: z.number().int().optional().describe('Seed for a reproducible piece; piece i uses seed + i')
  },
  annotations: { destructiveHint: false }
}, async ({ mood, stinger, out_path, count, seed }) => {
  try {
    checkExt(out_path, '.wav');
    if (!mood && !stinger) throw new Error('give a mood or a stinger');
    const n = stinger ? 1 : count || 1, pieces = [];
    for (let i = 0; i < n; i++) {
      const file = n === 1 ? out_path : out_path.replace(/\.wav$/i, '-' + String(i + 1).padStart(2, '0') + '.wav');
      const r = stinger ? await lib.renderStinger(stinger) : await lib.renderMusic(mood, { seed: seed == null ? null : seed + i });
      pieces.push({ file: lib.writeFile(file, r.bytes), seconds: +r.seconds.toFixed(2), seed: r.seed, loop: !stinger });
    }
    return ok({ mood, stinger, pieces });
  } catch (e) { return fail(e.message); }
});

server.connect(new StdioServerTransport()).catch(e => { console.error(e); process.exit(1); });
