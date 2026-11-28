#!/usr/bin/env node
/* ============================================================================
   SFX Brew · MCP 服务（stdio，本地运行，零成本）
   ----------------------------------------------------------------------------
   给 Claude Code / Cursor 等 agent 用：
     claude mcp add sfxbrew -- npx -y sfxbrew mcp
   工具：list_presets / generate_sfx / render_patch / get_js_code / export_pack / generate_music / process_audio / analyze_audio / generate_vfx / list_vfx_layers
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
    prompt: z.string().optional().describe('Natural language description in Chinese or English (e.g. "B站科技评测，直接高潮30秒" or "治愈系Vlog，三拍子，钢琴和木吉他，不要鼓")'),
    stinger: z.enum(Object.keys(lib.STINGER_META)).optional().describe('Render this short stinger instead of a loop'),
    out_path: z.string().describe('WAV file to write, e.g. "assets/music/town.wav". With count > 1, files get -01, -02 ... suffixes.'),
    count: z.number().int().min(1).max(10).optional().describe('Number of different pieces (default 1)'),
    seed: z.number().int().optional().describe('Seed for a reproducible piece; piece i uses seed + i'),
    instruments: z.record(z.string(), z.union([z.string(), z.number(), z.null(), z.boolean()])).optional().describe('Override or disable SoundFont instruments per role (melody, counter, pad, accomp, bass, drums), e.g. {"melody": "koto", "counter": "flute", "drums": null}'),
    groove: z.enum(['boombap', 'fourOnFloor', 'waltz', 'march', 'trap', 'bossa', 'ambient']).optional().describe('Freeform rhythm groove independent of mood'),
    scale: z.enum(['major', 'minor', 'penta', 'pentaMinor', 'dorian', 'phrygian', 'blues', 'harmonicMinor', 'miyako']).optional().describe('Musical scale for freeform composition'),
    chord_mood: z.enum(['bright', 'chill', 'epic', 'dark', 'jazzy']).optional().describe('Chord progression mood'),
    chords: z.array(z.string()).optional().describe('Custom chord progression by chord names, e.g. ["Am", "F", "C", "G"] or ["Dm7", "G7", "Cmaj7", "A7"]'),
    structure: z.array(z.enum(['intro', 'A', 'A2', 'B', 'C', 'breakdown', 'outro'])).optional().describe('Custom section order (4 bars per section), e.g. ["intro", "A", "breakdown", "C", "outro"]'),
    arc: z.enum(['steady', 'build', 'drop', 'wave']).optional().describe('Dynamic energy curve across sections: steady (even), build (gradual rise), drop (punchy start + breakdown), wave (gentle rise and fall)'),
    intensity: z.array(z.number().min(0.2).max(1)).optional().describe('Custom energy level (0.2-1.0) per section, e.g. [0.7, 0.85, 0.65, 0.92]'),
    hook_only: z.boolean().optional().describe('Start directly at the chorus/hook (8 bars, ideal for 15-30s short videos)'),
    tempo: z.number().min(40).max(200).optional().describe('Custom BPM tempo'),
    meter: z.union([z.literal(3), z.literal(4)]).optional().describe('Time signature beats per bar (3 or 4)'),
    stems_dir: z.string().optional().describe('Directory to write individual track stem WAVs (melody.wav, pad.wav, accomp.wav, bass.wav, drums.wav) when using SoundFont moods or tracks'),
    tracks: z.array(z.record(z.string(), z.any())).optional().describe('Custom multi-track MIDI note array for SoundFont rendering')
  },
  annotations: { destructiveHint: false }
}, async ({ mood, prompt, stinger, out_path, count, seed, instruments, groove, scale, chord_mood, chords, structure, arc, intensity, hook_only, tempo, meter, stems_dir, tracks }) => {
  try {
    checkExt(out_path, '.wav');
    if (!mood && !prompt && !stinger && !tracks && !groove && !scale && !chords) throw new Error('give a mood, prompt, stinger, custom chords/groove/scale, or custom tracks');
    const n = stinger ? 1 : count || 1, pieces = [];
    for (let i = 0; i < n; i++) {
      const file = n === 1 ? out_path : out_path.replace(/\.wav$/i, '-' + String(i + 1).padStart(2, '0') + '.wav');
      const r = stinger ? await lib.renderStinger(stinger) : await lib.renderMusic(mood, {
        seed: seed == null ? null : seed + i,
        prompt,
        instruments,
        groove,
        scale,
        chordMood: chord_mood,
        chords,
        structure,
        arc,
        intensity,
        hookOnly: hook_only,
        tempo,
        meter,
        tracks,
        stems: !!stems_dir
      });
      const item = { file: lib.writeFile(file, r.bytes), seconds: +r.seconds.toFixed(2), seed: r.seed, loop: !stinger };
      if (stems_dir && r.stems) {
        item.stems = r.stems.map(s => ({
          name: s.name,
          instrument: s.instrument,
          file: lib.writeFile(path.join(stems_dir, (n > 1 ? 'p' + (i + 1) + '-' : '') + s.name + '.wav'), s.bytes)
        }));
      }
      pieces.push(item);
    }
    return ok({ mood, stinger, pieces });
  } catch (e) { return fail(e.message); }
});

/* ---------- 音频处理：任何音频文件，不只是 SFX Brew 生成的（只往 out_dir 里写 .wav/.mp3/.ogg/.json，不覆盖输入） ---------- */
const proc = require('./process.js');

server.registerTool('process_audio', {
  title: 'Process audio files for a game',
  description: 'Clean up ANY audio files (WAV, MP3, OGG, FLAC; recordings, downloads or generated sounds) so they are game-ready, in one pass: ' +
    'consistent loudness (integrated LUFS, BS.1770) with a peak ceiling and optional limiter, trim silence, split a file at silences into clips, fades, ' +
    'seamless loops (crossfade + WAV loop point), channel/sample-rate conversion, renaming to name-01, name-02 ..., WAV/MP3/OGG output, ' +
    'or one audio sprite file + JSON map (Howler.js format). Inputs are never overwritten. Returns before/after loudness, peak and length per clip. ' +
    'Typical targets: about -20 LUFS with limit true for one-shot SFX (very spiky hits may land a few LU lower; the limiter stops at 6 dB to keep the attack), -20 to -24 for ambience loops. MP3/OGG output need ffmpeg installed.',
  inputSchema: {
    inputs: z.array(z.string()).min(1).describe('Audio files and/or folders (folders: all audio files inside)'),
    out_dir: z.string().describe('Folder to write results into, e.g. "assets/sfx". Must not be where the inputs are if names would collide.'),
    lufs: z.number().min(-40).max(-6).optional().describe('Target loudness for every clip, e.g. -18'),
    limit: z.boolean().optional().describe('Use a peak limiter so the target is reached even for spiky sounds (default false: gain stops at the peak ceiling and the result says how far short)'),
    peak_db: z.number().min(-12).max(0).optional().describe('Peak ceiling in dBFS (default -1)'),
    trim: z.boolean().optional().describe('Cut silence at start and end'),
    slice: z.boolean().optional().describe('Split each file at silences into separate clips (e.g. a recording of 10 footsteps)'),
    threshold_db: z.number().min(-90).max(-10).optional().describe('Level below which audio counts as silence (default -50)'),
    min_silence: z.number().min(0.01).max(5).optional().describe('Seconds of silence that separate two clips when slicing (default 0.15)'),
    fade_in_ms: z.number().min(0).max(5000).optional(),
    fade_out_ms: z.number().min(0).max(5000).optional(),
    loop: z.boolean().optional().describe('Mark outputs as loops (WAV smpl loop point, read by Godot, FMOD, Wwise, GameMaker)'),
    loop_crossfade_ms: z.number().min(0).max(5000).optional().describe('Make a loop seamless by crossfading its tail into its head (implies loop). 200-1000 ms for ambience'),
    channels: z.union([z.literal(1), z.literal(2)]).optional().describe('1 = mono, 2 = stereo (default: keep)'),
    sample_rate: z.number().int().min(8000).max(96000).optional().describe('Default 44100'),
    bits: z.union([z.literal(16), z.literal(24)]).optional().describe('WAV bit depth (default 16)'),
    name: z.string().regex(/^[A-Za-z0-9_-]+$/).optional().describe('Rename outputs to name-01, name-02 ... (in input order)'),
    format: z.enum(proc.FORMATS).optional().describe('Output format (default wav)'),
    sprite: z.string().regex(/^[A-Za-z0-9_-]+$/).optional().describe('Join all clips into one audio sprite <sprite>.<format> plus <sprite>.json with start/duration of each clip'),
    recursive: z.boolean().optional().describe('Also look into sub-folders'),
    overwrite: z.boolean().optional().describe('Replace existing files in out_dir (default false)')
  },
  annotations: { destructiveHint: false }
}, async (a) => {
  try {
    const r = await proc.processAudio(a.inputs, {
      outDir: a.out_dir, lufs: a.lufs, limit: a.limit, peak: a.peak_db == null ? -1 : a.peak_db, trim: a.trim, slice: a.slice,
      threshold: a.threshold_db == null ? -50 : a.threshold_db, minSilence: a.min_silence == null ? 0.15 : a.min_silence,
      fadeIn: a.fade_in_ms || 0, fadeOut: a.fade_out_ms || 0, loop: !!a.loop || !!a.loop_crossfade_ms, loopCrossfade: a.loop_crossfade_ms || 0,
      channels: a.channels || null, rate: a.sample_rate || 44100, bits: a.bits || 16, name: a.name || null,
      format: a.format || 'wav', sprite: a.sprite || null, recursive: a.recursive, overwrite: a.overwrite
    });
    return ok(r);
  } catch (e) { return fail(e.message); }
});

server.registerTool('analyze_audio', {
  title: 'Measure audio files',
  description: 'Measure audio files (WAV, MP3, OGG, FLAC): integrated loudness (LUFS), peak (dBFS), length, sample rate, channels, silence at start and end, clipped samples. ' +
    'Use it to find sounds that are too loud, too quiet or padded with silence before calling process_audio.',
  inputSchema: {
    inputs: z.array(z.string()).min(1).describe('Audio files and/or folders'),
    recursive: z.boolean().optional()
  },
  annotations: { readOnlyHint: true }
}, async ({ inputs, recursive }) => {
  try { return ok(await proc.analyzeAudio(inputs, { recursive })); } catch (e) { return fail(e.message); }
});

/* ---------- 2D 特效：序列帧图集 + 各引擎文件（只往 out_dir/sfxbrew-vfx-<name>/ 里写） ---------- */
const VFX = require('../vfx.js');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

server.registerTool('list_vfx_layers', {
  title: 'List 2D effect layers',
  description: 'Everything needed to write your own effect for generate_vfx: the coordinate system, the patch fields, the parameters shared by every layer, ' +
    'each layer type (' + Object.keys(VFX.LAYERS).join(', ') + ') with its parameters, ranges and defaults, the colour palettes, and the built-in presets as example patches. ' +
    'Read it once before writing a patch.',
  inputSchema: {},
  annotations: { readOnlyHint: true }
}, async () => ok(VFX.describe()));

server.registerTool('generate_vfx', {
  title: 'Generate a 2D effect (sprite sheet)',
  description: 'Render a 2D visual effect as transparent PNG frames and write a ready-to-use folder: ' +
    'a sprite sheet (<name>_strip<N>.png, GameMaker auto-slices it), single frames, a TexturePacker-format atlas JSON (Phaser load.atlas, PixiJS Assets.load), ' +
    'Godot 4 SpriteFrames .tres plus a .tscn scene that plays the effect and its sound (one-shots free themselves, loops keep playing), the patch JSON, and a README with Unity/Phaser/Pixi/GameMaker steps. ' +
    'Either pick a preset (' + VFX.LIST.map(k => k + ': ' + VFX.EFFECTS[k].label).join('; ') + ') or compose your own effect from layers with `patch` (see list_vfx_layers). ' +
    'The result includes a preview image of 6 frames so you can check the look and adjust the patch. with_sound adds a matching SFX Brew sound as WAV variations. Free for commercial use.',
  inputSchema: {
    effect: z.string().optional().describe('Preset name (' + VFX.LIST.join(', ') + '); with a patch it is just the file name'),
    patch: z.record(z.any()).optional().describe('Your own effect: { "frames": 12, "fps": 24, "loop": false, "palette": "fire", "layers": [ { "type": "flash" }, { "type": "sparks", "count": 20 } ] }. See list_vfx_layers.'),
    out_dir: z.string().describe('Folder to write into, e.g. "assets/fx"; files go to <out_dir>/sfxbrew-vfx-<name>/'),
    style: z.enum(['hd', 'pixel']).optional().describe('hd = smooth glow (default 128 px), pixel = pixel art (default 48 px, 5 colours, hard edges)'),
    size: z.number().int().min(8).max(512).optional().describe('Frame width/height in px'),
    frames: z.number().int().min(2).max(120).optional().describe('Number of frames (duration stays the same)'),
    speed: z.number().min(0.25).max(4).optional().describe('Playback speed multiplier (changes fps)'),
    palette: z.union([z.enum(Object.keys(VFX.THEMES)), z.array(hexColor).length(4)]).optional().describe('Colour theme name or 4 colours [core, light, mid, dark]; overrides the effect\'s own colours'),
    variants: z.number().int().min(1).max(10).optional().describe('Number of variations; the Godot scene picks one at random each play'),
    mutate: z.number().min(0).max(1).optional().describe('0-1: each variation also randomly tweaks the numeric layer parameters by this much (bigger differences than a new seed)'),
    seed: z.number().int().optional().describe('Seed for a reproducible result; variant i uses seed + i'),
    scale: z.number().int().min(1).max(8).optional().describe('Pixel style only: enlarge by this factor with hard edges'),
    with_sound: z.union([z.boolean(), z.enum(presetIds)]).optional().describe('true = add the paired sound (the preset\'s own, or patch.sound); or a sound preset id'),
    preview: z.boolean().optional().describe('Return the preview image in the result (default true)')
  },
  annotations: { destructiveHint: false }
}, async (a) => {
  try {
    if (!a.effect && !a.patch) throw new Error('give either effect (a preset name) or patch (your own layers, see list_vfx_layers)');
    const r = await require('./vfx-export.js').exportVfx({ effect: a.effect, patch: a.patch, outDir: a.out_dir, style: a.style, size: a.size, frames: a.frames, speed: a.speed, palette: a.palette, variants: a.variants, mutate: a.mutate, seed: a.seed, scale: a.scale, withSound: a.with_sound });
    const name = path.basename(r.folder).replace(/^sfxbrew-vfx-/, '');
    const res = ok({ folder: r.folder, variants: r.variants, sound: r.sound, godot_scene: path.join(r.folder, 'godot', name + '.tscn'), readme: path.join(r.folder, 'README.txt'), patch: r.patch });
    if (a.preview !== false) res.content.push({ type: 'image', mimeType: 'image/png', data: require('fs').readFileSync(r.variants[0].preview).toString('base64') });
    return res;
  } catch (e) { return fail(e.message); }
});

server.connect(new StdioServerTransport()).catch(e => { console.error(e); process.exit(1); });
