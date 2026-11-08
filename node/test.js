/* SFX Brew · 自测：npm test。启动真的 MCP 服务，用官方客户端把每个工具调一遍 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfxbrew-test-'));
  const client = new Client({ name: 'test', version: '1' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(__dirname, 'mcp.js')], cwd: dir }));
  const json = r => JSON.parse(r.content[0].text);

  const tools = (await client.listTools()).tools.map(t => t.name).sort();
  assert.deepStrictEqual(tools, ['generate_sfx', 'get_js_code', 'list_presets', 'render_patch']);

  const presets = json(await client.callTool({ name: 'list_presets', arguments: {} }));
  assert.strictEqual(presets.length, 28);

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

  await client.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('all MCP tests passed');
})().catch(e => { console.error(e); process.exit(1); });
