---
name: sfxbrew-music
version: 2.0.0
description: Compose and render multi-track game background music locally with 287 sampled GM/GS instruments and drum kits (SoundFont + orchestral/Eastern presets), supporting Lo-Fi, Synthwave, JRPG, Dungeon, and 16 additional styles, per-track stem WAV export, and instant instrument swapping.
summary: Local AI multi-track game music & stem generator with 287 SoundFont instruments, modern game styles, and per-track customization.
author: sfxbrew
tags: [game-music, soundfont, stems, midi, gamedev, bgm, lofi, synthwave, jrpg, audio]
keywords: [game music, background music, bgm, stems, soundfont, sf2, lofi, synthwave, jrpg, dungeon, orchestral, eastern, mcp]
use_cases:
  - Compose a 16-bar Lo-Fi or Synthwave loop with drum fills and humanization
  - Export separate stereo stems (melody, pad, accomp, bass, drums) for adaptive game audio
  - Swap the lead instrument of a track (e.g. switch Synthwave lead to altoSax or koto)
  - Render custom multi-track MIDI note arrangements offline to 44.1 kHz stereo WAV
---

# SFX Brew Music: Multi-Track Game BGM & Stems

Compose and render multi-track background music locally as 44.1 kHz stereo WAVs—with **287 sampled instruments & drum kits** (via `spessasynth_core` + `GeneralUser-GS.sf2`), **per-track stem export**, and **instant instrument swapping**.

All generated music WAVs and stems are royalty-free for commercial game/app use.

## Prerequisites & Setup

- **Runtime**: Node.js >= 18
- **SoundFont**: Place `GeneralUser-GS.sf2` in `soundfonts/GeneralUser-GS.sf2` (or set `SFXBREW_SF2=/path/to/GeneralUser-GS.sf2`).
- **MCP Server**:
  ```bash
  claude mcp add sfxbrew -- npx -y sfxbrew mcp
  ```
  Or in Cursor / Windsurf / Claude Desktop:
  ```json
  {
    "mcpServers": {
      "sfxbrew": { "command": "npx", "args": ["-y", "sfxbrew", "mcp"] }
    }
  }
  ```

## Multi-Track Styles (`generate_music`)

### SoundFont Band Styles (287 Instruments + Stems + Instrument Swap)
| `mood` | Style | Default Arrangement |
|---|---|---|
| `lofi` | Chill Lo-Fi beats with swing & dusty groove | `koto` + `epiano` + `warmPad` + `fingerBass` + `roomKit` |
| `synthwave` | Retro cyberpunk 80s synth | `sawLead` + `fmEpiano` + `polysynth` + `synthBass` + `kit808` |
| `jrpg` | Classic JRPG town / field waltz (3/4) | `flute` + `harp` + `strings` + `cello` + `standardKit` |
| `dungeon` | Dark dungeon & boss march | `cello` + `organ` + `choirPad` + `contrabass` + `powerKit` |
| `guochao` | Chinese electronic fusion (Guochao Trap) | `koto` + `harp` + `strings` + `synthBass` + `kit808` |
| `bossanova` | Sunny cafe & island Bossa Nova | `vibraphone` + `nylon` + `warmPad` + `acousticBass` + `roomKit` |
| `cyberpunk` | Hard-hitting cyberpunk combat | `overdriveGuitar` + `sawLead` + `polysynth` + `synthBass` + `electronicKit` |
| `tavern` | Lively medieval tavern waltz (3/4) | `accordion` + `fiddle` + `nylon` + `acousticBass` + `standardKit` |
| `noir` | Rainy detective noir jazz | `epiano` + `vibraphone` + `jazzGuitar` + `acousticBass` + `roomKit` |
| `ambientSpace` | Floating sci-fi space ambience (drumless) | `celesta` + `harp` + `warmPad` + `contrabass` |
| `tropical` | Bright tropical island adventure | `marimba` + `kalimba` + `steel` + `fingerBass` + `standardKit` |
| `wuxiaHero` | Heroic wuxia江湖 battle/story theme | `koto` + `flute` + `harp` + `strings` + `cello` + `powerKit` |
| `vlogChill` | Healing daily Vlog / cafe / lifestyle bed | `piano` + `nylon` + `warmPad` + `acousticBass` + `roomKit` |
| `techReview` | Modern tech review / AI product demo | `fmEpiano` + `cleanGuitar` + `polysynth` + `synthBass` + `electronicKit` |
| `funnyMeme` | Playful comedy / pet / plot-twist short video | `marimba` + `pizzicato` + `acousticBass` + `standardKit` |
| `suspenseTalk` | Mystery storytelling / voiceover bed | `piano` + `pizzicato` + `choirPad` + `contrabass` + `roomKit` |
| `casualPuzzle` | Match-3 / farming / casual mobile lobby | `marimba` + `steel` + `warmPad` + `fingerBass` + `standardKit` |
| `gachaLobby` | Anime / gacha shop & lobby groove | `vibraphone` + `epiano` + `warmPad` + `synthBass` + `kit808` |
| `random` | **Surprise blind-box**: randomizes groove × scale × chords × instruments from `seed` | Any combination |

### Natural Language Prompt Mode (`prompt`)
Pass any Chinese or English description directly via `prompt`—the built-in compiler automatically selects scene, meter (3/4 or 4/4), BPM, instruments, and short hook-only cuts:
```json
{
  "prompt": "小红书治愈系探店Vlog，3拍子，钢琴和木吉他，不要鼓",
  "out_path": "assets/music/vlog.wav"
}
```
Or:
```json
{
  "prompt": "B站科技评测背景音，120bpm，直接进高潮",
  "out_path": "assets/music/tech-hook.wav"
}
```

### Additional Built-in Styles & Stingers
- **Eastern / Folk / Retro**: `calm`, `battle`, `mystery`, `sad`, `primitive`, `tribal`, `medieval`, `chiptune`, `chipBoss`, `adventure`, `action`, `acoustic`
- **Orchestral (VSCO 2 CE)**: `fantasy`, `epic`, `piano`, `pastoral`
- **Short Stingers (`stinger`)**: `victory`, `defeat`, `battleStart`, `treasure`, `breakthrough`, `fanfare`, `chipWin`, `chipLose`

## Key Workflows

### 1. Generate Music + Adaptive Stems
Pass `stems_dir` to export both the full stereo mix and individual track WAVs (`melody.wav`, `pad.wav`, `accomp.wav`, `bass.wav`, `drums.wav`) for dynamic game audio (e.g. fading in drums during combat):
```json
{
  "mood": "lofi",
  "out_path": "assets/music/town.wav",
  "stems_dir": "assets/music/town-stems",
  "seed": 42
}
```

### 2. Swap Any Track's Instrument
Pass `instruments` to override any role (`melody`, `pad`, `accomp`, `bass`, `drums`) using aliases (`epiano`, `koto`, `altoSax`, `tenorSax`, `accordion`, `slapBass`, `synthBass`, `warmPad`, `sawLead`, `taiko`, `kit808`, `roomKit`, `powerKit`, etc.) or any GM program number `0–127`:
```json
{
  "mood": "synthwave",
  "instruments": { "melody": "altoSax", "drums": "kit808" },
  "out_path": "assets/music/neon-sax.wav",
  "seed": 42
}
```

### 4. Freeform Composition (Infinite Styles: `chords` × `structure` × `groove` × `scale` × 287 Instruments)
Never limited to preset moods—translate any user scene directly into custom parameters:
- `chords`: custom chord progression by chord names, e.g. `["Am", "F", "C", "G"]` or `["Dm7", "G7", "Cmaj7", "A7"]`
- `structure`: custom section order (4 bars each), e.g. `["intro", "A", "breakdown", "C", "outro"]`
- `arc`: dynamic energy curve — `steady` | `build` | `drop` | `wave` (or pass `intensity: [0.7, 0.85, 0.65, 0.92]` per section)
- `groove`: `boombap` | `fourOnFloor` | `waltz` (3/4) | `march` | `trap` | `bossa` | `ambient`
- `scale`: `major` | `minor` | `penta` | `pentaMinor` | `dorian` | `phrygian` | `blues` | `harmonicMinor` | `miyako`
- `instruments`: any of 287 instruments on `melody`, `counter` (counter-melody), `pad`, `accomp`, `bass`, `drums` (set `null` to mute a track)
- `tempo` (40–200 BPM), `meter` (`3` or `4`)

Example (Custom 20-bar Guochao with Counter-Melody & Breakdown):
```json
{
  "chords": ["Am", "F", "C", "G"],
  "structure": ["intro", "A", "breakdown", "C", "outro"],
  "groove": "trap",
  "scale": "pentaMinor",
  "tempo": 128,
  "instruments": { "melody": "koto", "counter": "flute", "accomp": "harp", "pad": "strings", "bass": "cello", "drums": "kit808" },
  "out_path": "assets/music/custom-guochao.wav"
}
```
