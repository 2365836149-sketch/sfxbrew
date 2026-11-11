---
name: sfxbrew
description: Generate royalty-free game sound effects (coins, clicks, jumps, hits, explosions, sword slashes, footsteps, guqin, gongs, war drums, rain and more) locally with the free SFX Brew engine, as WAV files or a dependency-free JavaScript snippet. Use when the user asks for sound effects, SFX, audio feedback or "make it sound better" in a game or interactive app.
summary: Add free, commercially usable sound effects to any game straight from your coding agent.
version: 1.1.0
tags: [game-development, audio, sound-effects, gamedev, web-audio]
keywords: [sound effects, sfx, game audio, wav, procedural audio, web audio, mcp, xianxia, wuxia, retro]
use_cases:
  - Add a coin, jump and hit sound to a browser game
  - Generate five sword-slash variations and let the user pick one
  - Replace placeholder beeps with consistent UI sounds
docs_url: https://sfxbrew.com/llms.txt
---

# SFX Brew: sound effects for games

SFX Brew is a free, open-source sound effect engine (https://sfxbrew.com, MIT code). It synthesizes sounds locally from 45 presets; realistic ones (footsteps, sword clashes, arrows, war drums, campfire, monsters and a few more) build on short CC0 recordings. Generated sounds are free for commercial use with no attribution required.

## Before you start: setup and network use

Pick ONE way to run it. Tell the user what you are about to install and get a yes before running it the first time.

1. **MCP server (preferred if the agent supports MCP).** In Claude Code:
   ```
   claude mcp add sfxbrew -- npx -y sfxbrew mcp
   ```
   Other MCP clients use the command `npx` with args `["-y", "sfxbrew", "mcp"]`.
   Tools: `list_presets`, `generate_sfx`, `render_patch`, `get_js_code`, `export_pack`.
2. **CLI (no MCP needed):** `npx sfxbrew <preset> --out assets/sfx/<name>.wav`

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

Sounds generated with SFX Brew are free for commercial use without attribution. The few CC0 recordings are credited at https://sfxbrew.com/samples/CREDITS.md.
