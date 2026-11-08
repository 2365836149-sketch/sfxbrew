# sfxbrew

Procedural game sound effects for humans **and AI coding agents**. Eastern (wuxia / xianxia) sounds plus the usual game sounds, synthesized locally, with no API keys, no network and no per-call cost.

- 24 presets: sword qi, guqin pluck, temple bell, gong, spell cast, heavenly thunder, breakthrough, talisman, alchemy, wind chime, bamboo flute, qi gathering, coin, pickup, click, confirm, error, jump, hit, explosion, laser, power-up, level up, whoosh
- Every generation is a fresh variation; a **seed** reproduces it exactly
- Output: 16-bit WAV, or a ~7 KB dependency-free JavaScript snippet that plays the same sound with Web Audio
- **Free for commercial use, no attribution required** for the sounds you generate

## For AI agents (MCP)

Claude Code:

```bash
claude mcp add sfxbrew -- npx -y -p sfxbrew sfxbrew-mcp
```

Other MCP clients (Cursor, Windsurf, Claude Desktop …):

```json
{
  "mcpServers": {
    "sfxbrew": { "command": "npx", "args": ["-y", "-p", "sfxbrew", "sfxbrew-mcp"] }
  }
}
```

Tools:

| Tool | What it does |
|---|---|
| `list_presets` | Presets and what each one is good for |
| `generate_sfx` | Write one or more WAV variants (and optionally a `.js` file with play functions) |
| `render_patch` | Render a hand-tuned patch JSON |
| `get_js_code` | One drop-in JS snippet with `playX()` functions for several sounds |

Then just ask: *"add a coin sound and a hit sound to my game"*.

## CLI

```bash
npx sfxbrew list
npx sfxbrew coin --out assets/sfx/coin.wav
npx sfxbrew swordQi --count 5 --out assets/sfx/sword.wav
npx sfxbrew hit --seed 42 --js src/sfx.js
npx sfxbrew render my-patch.json --out boom.wav
```

## Library

```js
const sfx = require('sfxbrew');
const { patch, seed } = sfx.generate('coin');
const { bytes } = await sfx.renderWav(patch);
```

## Browser editor

Tweak any sound with sliders and export WAV / JS in the [web editor](https://sfxbrew.com/) (same engine).

## License

Code: MIT. Generated sounds: yours, free for any use.
