/* SFX Brew · 自测：npm test。启动真的 MCP 服务，用官方客户端把每个工具调一遍 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const lib = require('./lib.js');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfxbrew-test-'));
  const client = new Client({ name: 'test', version: '1' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(__dirname, 'mcp.js')], cwd: dir }));
  const json = r => JSON.parse(r.content[0].text);
  const SLOW = { timeout: 180000 };   // 整首配乐在慢机器上要渲染 40~60 秒，超过 MCP 客户端默认的 60 秒

  const tools = (await client.listTools()).tools.map(t => t.name).sort();
  assert.deepStrictEqual(tools, ['export_pack', 'generate_music', 'generate_sfx', 'get_js_code', 'list_presets', 'render_patch']);

  const st = json(await client.callTool({ name: 'generate_music', arguments: { stinger: 'guiltChild', out_path: 'music/guilt.wav' } }, undefined, SLOW));
  const sb = fs.readFileSync(st.pieces[0].file);
  assert.ok(sb.slice(0, 4).toString() === 'RIFF' && sb.readUInt16LE(22) === 2, 'stereo stinger');
  assert.ok(st.pieces[0].seconds <= 3.05, 'guilt stinger stays short');
  const mu = json(await client.callTool({ name: 'generate_music', arguments: { mood: 'primitive', out_path: 'music/stone.wav', seed: 2 } }, undefined, SLOW));
  assert.ok(mu.pieces[0].seconds > 30 && mu.pieces[0].loop, 'music loop');
  assert.ok(fs.readFileSync(mu.pieces[0].file).indexOf('smpl') > 0, 'music WAV carries a loop point');

  const presets = json(await client.callTool({ name: 'list_presets', arguments: {} }));
  assert.strictEqual(presets.length, lib.PRESETS.length);
  assert.ok(presets.every(p => p.category && Array.isArray(p.tags)), 'presets carry category and tags');
  const ui = json(await client.callTool({ name: 'list_presets', arguments: { category: 'ui' } }));
  assert.ok(ui.length > 0 && ui.every(p => p.categories.includes('ui')), 'category filter');
  const metal = json(await client.callTool({ name: 'list_presets', arguments: { query: 'metal' } }));
  assert.ok(metal.some(p => p.id === 'gong') && !metal.some(p => p.id === 'jump'), 'query filter');

  const g = json(await client.callTool({ name: 'generate_sfx', arguments: { preset: 'hit', out_path: 'sfx/hit.wav', count: 3, seed: 7, js_path: 'src/sfx.js' } }));
  assert.strictEqual(g.sounds.length, 3);
  g.sounds.forEach(s => assert.ok(fs.readFileSync(s.file).slice(0, 4).toString() === 'RIFF'));
  assert.ok(fs.existsSync(path.join(dir, 'sfx/hit-02.wav')));
  assert.strictEqual(g.sounds[1].seed, 8);

  const again = json(await client.callTool({ name: 'generate_sfx', arguments: { preset: 'hit', out_path: 'again.wav', seed: 7 } }));
  assert.ok(fs.readFileSync(again.sounds[0].file).equals(fs.readFileSync(g.sounds[0].file)), 'same seed, same bytes');

  const patch = g.sounds[0].patch;
  patch.layers[1].freq = 300;
  const r = json(await client.callTool({ name: 'render_patch', arguments: { patch, out_path: 'custom.wav', js_path: 'custom.js' } }));
  assert.ok(r.seconds > 0.05);

  const code = (await client.callTool({ name: 'get_js_code', arguments: { sounds: [{ name: 'coin', preset: 'coin', seed: 1 }, { name: 'big boom', preset: 'explosion' }] } })).content[0].text;
  new Function('window', code + '; if (typeof playCoin !== "function" || typeof playBigBoom !== "function") throw new Error("missing play fn");')({});
  new Function('window', fs.readFileSync(path.join(dir, 'src/sfx.js'), 'utf8') + '; if (typeof playHit3 !== "function") throw new Error("missing");')({});

  const bad = await client.callTool({ name: 'generate_sfx', arguments: { preset: 'coin', out_path: 'package.json' } });
  assert.ok(bad.isError, 'refuses non-.wav path');
  const bad2 = await client.callTool({ name: 'render_patch', arguments: { patch: { layers: [] }, out_path: 'x.wav' } });
  assert.ok(bad2.isError, 'refuses empty patch');

  /* 无缝循环：带 smpl 循环点，首尾接得上，长度接近要求 */
  const lp = json(await client.callTool({ name: 'generate_sfx', arguments: { preset: 'rain', out_path: 'loops/rain.wav', loop_seconds: 8, seed: 3 } }));
  const lb = fs.readFileSync(lp.sounds[0].file);
  assert.ok(lb.includes(Buffer.from('smpl')), 'loop WAV has a smpl chunk');
  const n = lb.readUInt32LE(40) / 2, s0 = lb.readInt16LE(44), s1 = lb.readInt16LE(44 + (n - 1) * 2);
  let step = 0; for (let i = 1; i < n; i++) step += Math.abs(lb.readInt16LE(44 + i * 2) - lb.readInt16LE(42 + i * 2)); step /= n;
  assert.ok(Math.abs(s1 - s0) < step * 6, 'loop end joins loop start');
  assert.ok(lp.sounds[0].seconds > 6 && lp.sounds[0].seconds < 14, 'loop length near request');
  const notLoop = await client.callTool({ name: 'generate_sfx', arguments: { preset: 'coin', out_path: 'c.wav', loop_seconds: 5 } });
  assert.ok(notLoop.isError, 'refuses loop for one-shot presets');

  /* 引擎包：WAV + Godot + Unity + 网页 + README */
  const pk = json(await client.callTool({ name: 'export_pack', arguments: { preset: 'swordQi', out_dir: 'game', count: 3, seed: 5 } }));
  const rel = pk.files.map(f => path.relative(path.dirname(pk.folder), f)).sort();
  assert.deepStrictEqual(rel, ['sfxbrew-swordQi/README.txt', 'sfxbrew-swordQi/godot/swordQi.tres', 'sfxbrew-swordQi/unity/SfxBrewPlayer.cs',
    'sfxbrew-swordQi/wav/swordQi-01.wav', 'sfxbrew-swordQi/wav/swordQi-02.wav', 'sfxbrew-swordQi/wav/swordQi-03.wav', 'sfxbrew-swordQi/web/swordQi.js']);
  const tres = fs.readFileSync(path.join(dir, 'game/sfxbrew-swordQi/godot/swordQi.tres'), 'utf8');
  assert.ok(tres.includes('streams_count = 3') && tres.includes('res://sfxbrew-swordQi/wav/swordQi-03.wav'), 'godot randomizer');
  new Function('document', 'location', fs.readFileSync(path.join(dir, 'game/sfxbrew-swordQi/web/swordQi.js'), 'utf8') + '; if (typeof playSwordQi !== "function") throw new Error("missing");')({ currentScript: null }, { href: 'http://x/web/a.js' });
  const pl = json(await client.callTool({ name: 'export_pack', arguments: { preset: 'campfire', out_dir: 'game', loop_seconds: 6 } }));
  assert.strictEqual(pl.sounds.length, 2);
  new Function('document', 'location', fs.readFileSync(path.join(dir, 'game/sfxbrew-campfire/web/campfire.js'), 'utf8') + '; if (typeof startCampfire !== "function" || typeof stopCampfire !== "function") throw new Error("missing");')({ currentScript: null }, { href: 'http://x/web/a.js' });

  await client.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('all MCP tests passed');
})().catch(e => { console.error(e); process.exit(1); });
