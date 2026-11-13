# sfxbrew

Procedural game sound effects for humans **and AI coding agents**. Eastern (wuxia / xianxia) sounds plus the usual game sounds, synthesized locally, with no API keys, no network and no per-call cost.

- 45 presets. Eastern instruments: guqin, pipa, erhu, bamboo flute, temple bell, gong, wind chime, wooden fish, war drum. Xianxia magic: sword qi, spell cast, heavenly thunder, lightning, breakthrough, talisman, alchemy, qi gathering. Combat: hit, explosion, laser, whoosh, arrow, sword clash, shield block. UI and items: click, confirm, error, notification, page turn, typing, coin, pickup, power-up, level up, chest open. Character: jump, land, footsteps on stone and grass. Ambience: rain, wind, campfire, stream, cave drip, monster growl
- Every generation is a fresh variation; a **seed** reproduces it exactly
- Output: 16-bit WAV, or a ~7 KB dependency-free JavaScript snippet that plays the same sound with Web Audio
- **Free for commercial use, no attribution required** for the sounds you generate

## For AI agents (MCP)

Claude Code:

```bash
claude mcp add sfxbrew -- npx -y sfxbrew mcp
```

Other MCP clients (Cursor, Windsurf, Claude Desktop …):

```json
{
  "mcpServers": {
    "sfxbrew": { "command": "npx", "args": ["-y", "sfxbrew", "mcp"] }
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
| `export_pack` | A game-engine folder: WAV variations or seamless loops + Godot `.tres`, Unity script, web player, README |

Then just ask: *"add a coin sound and a hit sound to my game"*.

## Agent skill

A free SKILL.md that teaches your agent when and how to use SFX Brew: [skills/sfxbrew/SKILL.md](skills/sfxbrew/SKILL.md), also installable from [Agensi](https://www.agensi.io/skills/sfx-brew-game-sound-effects).

## Seamless loops and engine packs

Ambience and sustained sounds (rain, wind, campfire, stream, cave drip, thunder, wind chimes, war drums, monster growl) can be rendered as **seamless loops** of 10 to 120 seconds. The loop is stitched from several slightly different takes with equal-power crossfades, so it doesn't repeat every few seconds, and the WAV carries a loop point that Godot, FMOD, Wwise and GameMaker pick up automatically.

An **engine pack** is a folder (or a zip from the web editor) with WAV variations or loops plus:

- `godot/<name>.tres`: an `AudioStreamRandomizer` that plays a random variation each time (Godot 4)
- `unity/SfxBrewPlayer.cs`: drop on a GameObject, drag in the clips, call `Play()` (or tick Loop)
- `web/<name>.js`: plain Web Audio player, `playX()` or `startX()` / `stopX()` for loops

## CLI

```bash
npx sfxbrew list
npx sfxbrew coin --out assets/sfx/coin.wav
npx sfxbrew swordQi --count 5 --out assets/sfx/sword.wav
npx sfxbrew hit --seed 42 --js src/sfx.js
npx sfxbrew render my-patch.json --out boom.wav
npx sfxbrew rain --loop 30 --out assets/sfx/rain-loop.wav   # seamless loop with a WAV loop point
npx sfxbrew pack swordQi --count 8 --out .                   # Godot / Unity / web pack
npx sfxbrew pack campfire --loop 20 --out .
```

## Music

Background music is composed and rendered locally too: one full piece per seed (intro, theme, contrast, theme, outro) as a seamless stereo WAV loop.

```bash
npx sfxbrew music list                                  # moods and stingers
npx sfxbrew music medieval --count 3 --out music/town.wav
npx sfxbrew music primitive --seed 7 --out music/stone-age.wav
npx sfxbrew stinger guiltChild --out music/guilt-child.wav
```

Moods: `calm`, `battle`, `mystery`, `sad` (Eastern), `primitive` (bone flute, hummed drone, log drums, sticks, shaker), `tribal` (clay ocarina, bamboo flute, plucked zither, frame drum), `medieval` (dorian fiddle and shawm, lute, bagpipe drone, tambourine). Stingers: `victory`, `defeat`, `battleStart`, `treasure`, `breakthrough`, and three quiet 2-3 s ones for dark moments: `guiltCannibal`, `guiltChild`, `grief`. MCP tool: `generate_music`.

## Sound packs

Ready-made WAV packs: [Xianxia & Wuxia Game Sound Pack on itch.io](https://2365836149-sketch.itch.io/xianxia-wuxia-sound-pack) (44 sounds), or download any pack as a ZIP from [sfxbrew.com/sounds](https://sfxbrew.com/sounds/).

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

A few presets (war drum, lightning, gong, erhu) use short CC0 recordings from Freesound, listed with their recordists in [samples/CREDITS.md](samples/CREDITS.md).
