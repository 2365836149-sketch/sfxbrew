---
name: sfxbrew
description: Generate royalty-free game sound effects (coins, clicks, jumps, hits, explosions, sword slashes, footsteps, guqin, gongs, war drums, rain and more) locally with the free SFX Brew engine, as WAV files or a dependency-free JavaScript snippet, plus looping background music and short stingers. Use when the user asks for sound effects, SFX, background music, a victory or game-over jingle, audio feedback or "make it sound better" in a game or interactive app.
summary: Add free, commercially usable sound effects and background music to any game straight from your coding agent.
version: 1.5.0
tags: [game-development, audio, sound-effects, game-music, gamedev, web-audio]
keywords: [sound effects, sfx, game audio, game music, background music, music loop, stinger, wav, procedural audio, web audio, mcp, xianxia, wuxia, retro, medieval]
use_cases:
  - Add a coin, jump and hit sound to a browser game
  - Generate five sword-slash variations and let the user pick one
  - Replace placeholder beeps with consistent UI sounds
  - Add a looping town theme and a victory stinger to an RPG
docs_url: https://sfxbrew.com/llms.txt
---

# SFX Brew: sound effects and music for games

SFX Brew is a free, open-source sound effect engine (https://sfxbrew.com, MIT code). It synthesizes sounds locally from 45 presets; realistic ones (footsteps, sword clashes, arrows, war drums, campfire, monsters and a few more) build on short CC0 recordings. It also composes background music loops and short stingers locally (see Music below). Generated sounds and music are free for commercial use with no attribution required.

## Before you start: setup and network use

Pick ONE way to run it. Tell the user what you are about to install and get a yes before running it the first time.

1. **MCP server (preferred if the agent supports MCP).** In Claude Code:
   ```
   claude mcp add sfxbrew -- npx -y sfxbrew mcp
   ```
   Other MCP clients use the command `npx` with args `["-y", "sfxbrew", "mcp"]`.
   Tools: `list_presets`, `generate_sfx`, `render_patch`, `get_js_code`, `export_pack`, `generate_music`.
2. **CLI (no MCP needed):** `npx sfxbrew <preset> --out assets/sfx/<name>.wav`, and for music `npx sfxbrew music <mood> --out assets/music/<name>.wav`

Network use, stated up front: `npx` downloads the `sfxbrew` npm package (a few MB, including the CC0 recordings) once. Rendering then runs offline. The only other network access is that exported JavaScript for recording-based presets loads small MP3 files from https://sfxbrew.com/samples/ at runtime (they can be self-hosted, see below). Nothing from the user's machine is sent anywhere.

## Presets

| Group | Preset ids |
|---|---|
| UI and items | `click`, `confirm`, `error`, `notify`, `pickup`, `coin`, `powerUp`, `levelUp`, `pageTurn`, `typing`, `chestOpen` |
| Combat | `hit`, `whoosh`, `laser`, `explosion`, `arrow`, `swordClash`, `shieldBlock` |
| Character | `jump`, `land`, `footstepStone`, `footstepGrass` |
| Eastern / fantasy | `swordQi`, `spell`, `qiGather`, `talisman`, `alchemy`, `breakthrough`, `thunder`, `lightning` |
| Instruments | `guqin`, `pipa`, `erhu`, `flute`, `bell`, `gong`, `chime`, `woodfish`, `drum` |
| Ambience and creatures | `rain`, `wind`, `campfire`, `stream`, `caveDrip`, `monsterGrowl` |

Run `list_presets` (or `npx sfxbrew list`) for one-line descriptions. Every call produces a new variation; the returned **seed** reproduces it exactly.

## Workflow

1. **Find what needs sound.** Look at the code for player actions and feedback moments. Map each to a preset (table above). If the user named specific sounds, use those.
2. **Choose the format** based on the project:
   - Browser game without an asset pipeline: use `get_js_code` (or `--js file.js`). It returns one snippet defining `playCoin()`, `playHit()` and so on. No audio files to load.
   - Engine with an asset folder (Godot, Unity, Phaser, Pygame, etc.): write WAV files with `generate_sfx` / the CLI into the project's existing audio folder.
3. **Generate a few variations when the choice matters.** Use `count: 3-5` for important sounds (main attack, jump, level up) and tell the user the file names so they can listen and pick. For frequent sounds (footsteps, hits) keep 2-4 variations and pick one at random at runtime so they don't get repetitive.
4. **Wire it in.** Call the sound at the moment the action happens. In browsers, audio can only start after the first click or key press; call the first play from an input handler.
5. **Record the seeds** in a comment or a small manifest next to the audio files so the exact sounds can be regenerated later.

## Loops and engine packs

Ambience and sustained sounds (`rain`, `wind`, `campfire`, `stream`, `caveDrip`, `thunder`, `chime`, `drum`, `monsterGrowl`) can be rendered as seamless loops of 10 to 120 seconds (`loop_seconds` in `generate_sfx`, or `--loop 30` on the CLI). The WAV carries a loop point that Godot, FMOD, Wwise and GameMaker pick up.

`export_pack` (CLI: `npx sfxbrew pack <preset> --count 8 --out .`) writes a folder with WAV variations or loops plus `godot/<name>.tres` (an AudioStreamRandomizer), `unity/SfxBrewPlayer.cs` and a plain Web Audio player. Use it when the project uses one of those engines.

## Cleaning up existing audio

`process_audio` works on any audio files the project already has (recordings, downloaded packs, other tools; WAV/MP3/OGG/FLAC), not only SFX Brew sounds. Call `analyze_audio` first to see loudness, peaks and padding, then `process_audio` with what is needed:

- Sounds of uneven volume: `lufs: -20, limit: true` (ambience: -22 to -26). Report clips whose `notes` say they fell short.
- A recording with many takes in one file: `slice: true, trim: true, name: "step"` gives `step-01.wav`, `step-02.wav` …
- Ambience that clicks at the loop point: `loop_crossfade_ms: 500` to `1000`.
- A web game with many small sounds: `sprite: "sfx"` writes one file plus a Howler.js sprite map.
- Write into a new `out_dir`; the tool refuses to overwrite inputs or existing files unless `overwrite: true`. MP3/OGG output needs ffmpeg.

## 2D effects with matching sounds

`generate_vfx` (CLI: `npx sfxbrew vfx <effect> --sound --out assets/vfx/`) draws a short animated effect (`swordQi`, `spell`, `hit`; `npx sfxbrew vfx list`) and writes a folder an engine opens directly: a sprite sheet (`<name>_stripN.png`, GameMaker cuts it by the name), single frames, a TexturePacker JSON atlas (Phaser, PixiJS), Godot 4 `SpriteFrames` plus a `.tscn` that plays the effect with its sound and frees itself, the matching sound variations in `wav/` when `with_sound` is set, and a README for Godot, Unity, Phaser, PixiJS and GameMaker.

- `style: "pixel"` for pixel-art games (48 px, hard edges; `scale` 2-4 enlarges with nearest neighbour), otherwise smooth 128 px glow.
- `palette`: `fire`, `ice`, `thunder`, `dark`, `holy`, `poison`, `blood`, `jade`, or 4 hex colours (core, light, mid, dark) to match the game.
- `variants` gives several takes in one SpriteFrames (one animation each); `seed` reproduces one. People can preview and download the same packs at https://sfxbrew.com/vfx/ .
- Presets: `swordQi`, `spell`, `hit`, `lightning`, `talisman`, `breakthrough`, `explosion`, `aura` (loop).

**Custom effects.** When no preset fits, compose one: call `list_vfx_layers` once, then `generate_vfx` with `patch: { frames, fps, loop, palette, layers: [...] }`. Layers stack (later ones draw on top) and each plays from `start` to `end` on a 0-1 timeline. Typical recipes: impact = flash + glint + sparks; explosion = flash + burst + ring + smoke + debris; charge-up = swirl + flash (ease "in"), then a release ring; aura = sigil (squash 0.4) + swirl with `"loop": true`. Coordinates: x, y from -1 to 1 (0 = centre), sizes are fractions of the frame width. The result includes a preview image: look at it and adjust (too dim → intensity, clipped at the edge → smaller radius/speed, too busy → fewer particles). Invalid parameters come back as errors naming the layer and the allowed range. `mutate: 0.2-0.4` with `variants` gives clearly different takes.

## Music

`generate_music` composes and renders background music locally as a seamless stereo WAV loop: one full piece per seed (intro, theme, contrast, theme, outro), roughly 1-2.5 minutes, with a loop point in the WAV. Every seed is a different piece in the same style. It needs `mood` or `stinger`, plus `out_path` (a `.wav` file). Optional: `count` (1-10 different pieces, files get `-01`, `-02` ... suffixes; piece i uses `seed + i`) and `seed` (reproduce a piece). Rendering a piece takes up to a minute of CPU time, so allow a few minutes for calls with `count` > 1.

| Mood | Style | Use for |
|---|---|---|
| `calm` | Guqin and bamboo flute over strings | Exploration, villages, menus |
| `battle` | Pipa, spiccato low strings, big war drums | Combat, bosses |
| `mystery` | Sparse flute and guqin over held strings, wooden fish | Caves, ruins, night |
| `sad` | Slow erhu lament over strings and guqin | Loss, farewells, sad story beats |
| `primitive` | Bone flute, hummed drone, log drums, clapping sticks, shaker | Cavemen, tribal camps, prehistory |
| `tribal` | Clay ocarina (xun), bamboo flute, plucked zither, frame and log drums | Farming villages, early civilisation |
| `medieval` | Dorian fiddle and shawm, lute, bagpipe drone, frame drum, tambourine | Towns, taverns, markets, castles |

Stingers are short one-shots (no loop, `count` is ignored): `victory` (win, quest complete), `defeat` (loss, game over), `battleStart` (a fight begins), `treasure` (rare item), `breakthrough` (level up, realm breakthrough), and three quiet 2-3 s ones for dark story moments: `guiltCannibal`, `guiltChild`, `grief` (someone close has died).

CLI equivalents:
```
npx sfxbrew music list                                       # moods and stingers
npx sfxbrew music medieval --count 3 --out assets/music/town.wav
npx sfxbrew music primitive --seed 7 --out assets/music/stone-age.wav
npx sfxbrew stinger victory --out assets/music/victory.wav
```

Tips: render 2-3 pieces of the main theme and let the user pick; play loops on a music bus well below the sound effects; duck or stop the loop when a stinger plays. Record the seeds like you do for sound effects.

## Tweaking a sound

Every result includes a `patch` (JSON). To adjust, change values and call `render_patch`. Useful edits:

- Heavier / bigger: lower `freq` (or `pitch` on sample layers) by 20-40%, raise `decay`.
- Shorter / snappier: reduce `decay`; for UI sounds keep total length under 0.3 s.
- Further away: lower filter `cutoff`, raise `reverb`.
- More retro: set `crush` to 5-8.
- Quieter: lower `gain` (0-2).

The full patch format is in the `render_patch` tool description and at https://sfxbrew.com/llms.txt.

## Self-hosting recordings

If the user does not want runtime requests to sfxbrew.com, copy the needed `.mp3` files from `node_modules/sfxbrew/samples/` (or https://sfxbrew.com/samples/) into the game and call `sfxBrew.setSampleBase("./sfx/")` before playing. WAV exports never need network access.

## License note to pass on

Sounds and music generated with SFX Brew are free for commercial use without attribution. The few CC0 recordings are credited at https://sfxbrew.com/samples/CREDITS.md.
