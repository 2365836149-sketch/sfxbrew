/* ============================================================================
   SFX Brew · Node 端公共库（命令行和 MCP 共用）
   ----------------------------------------------------------------------------
   ★ 合成用的是和网页完全相同的 engine.js / presets.js，渲染靠 node-web-audio-api
     提供的 OfflineAudioContext（Rust 实现的 Web Audio）。
   ★ 预设生成器内部用 Math.random。这里临时换成带种子的随机数，
     这样 agent 拿到 seed 之后，同样的 preset + seed 永远生成同一个声音。
   ==========================================================================*/
'use strict';

const fs = require('fs');
const path = require('path');
const makeSfx = require('../engine.js');
const { PRESETS, mutate, SAMPLES } = require('../presets.js');
const CATALOG = require('../catalog.js');
const EXPORT = require('../export.js');
const makeMusic = require('../music.js');

/* 原生音频模块用到时才加载：精简版 Linux 没装 ALSA(libasound2) 时，
   MCP 服务和 list_presets 照常可用，只有渲染 WAV 时才报出清楚的错误 */
let _OAC;
function loadAudio() {
  if (_OAC) return _OAC;
  try {
    _OAC = require('node-web-audio-api').OfflineAudioContext;
  } catch (e) {
    const hint = /libasound/.test(e.message)
      ? ' Install the ALSA runtime library first, e.g. "sudo apt-get install libasound2" (Debian/Ubuntu; "libasound2t64" on newer releases) or "apk add alsa-lib" (Alpine).'
      : '';
    throw new Error('Could not load the audio renderer (node-web-audio-api): ' + e.message.split('\n')[0] + '.' + hint);
  }
  return _OAC;
}

const SAMPLE_DIR = path.join(__dirname, '..', 'samples');
const SFX = makeSfx({
  get OfflineAudioContext() { return loadAudio(); },
  loadSample: name => {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error('bad sample name ' + name);
    const b = fs.readFileSync(path.join(SAMPLE_DIR, name + '.mp3'));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
  }
});

/* 配乐引擎：和网页音乐页同一份 music.js，每个音符是一个 patch，交给上面的 SFX 渲染 */
const MUSIC = makeMusic(SFX);
const MUSIC_META = {
  calm: 'Calm Eastern piece: guqin and bamboo flute over strings. Exploration, villages, menus.',
  battle: 'Eastern battle music: pipa, spiccato low strings and big war drums. Combat, bosses.',
  mystery: 'Sparse, misty Eastern piece: flute and guqin over held strings, wooden fish. Caves, ruins, night.',
  sad: 'Slow erhu lament over strings and guqin. Loss, farewells, sad story beats.',
  primitive: 'Stone age: bone flute over a hummed drone, log drums, clapping sticks and a shaker. Cavemen, tribal camps, prehistory.',
  tribal: 'Early village: clay ocarina (xun) and bamboo flute, plucked zither, frame and log drums, low hum. Farming villages, early civilisation.',
  medieval: 'Medieval folk tune in dorian: fiddle and shawm, lute, bagpipe drone, frame drum and tambourine. Towns, taverns, markets, castles.'
};
const STINGER_META = {
  victory: 'Bright drum hit, pipa run and bell. Win, quest complete.',
  defeat: 'Falling guqin, low bell and erhu. Loss, game over.',
  battleStart: 'Three war drum hits and a gong. A fight begins.',
  treasure: 'Rising chimes and a bell. Treasure, rare item.',
  breakthrough: 'Low bell, rising guqin and flute. Level up, realm breakthrough.',
  guiltCannibal: 'About 2 s, quiet: an erhu note sags down over a low hum. A dark deed (eating your own kind).',
  guiltChild: 'About 2 s, quiet: two ocarina notes a semitone apart. A terrible deed (harming a child).',
  grief: 'About 2.5 s, quiet: a low hum with two guqin notes. Someone close has died.'
};

/** 一段配乐：渲染一首完整曲子，尾巴折回开头，得到无缝循环的双声道 WAV */
async function renderMusic(mood, opt) {
  opt = opt || {};
  if (!MUSIC_META[mood]) throw new Error('Unknown mood "' + mood + '". Available: ' + Object.keys(MUSIC_META).join(', '));
  loadAudio();
  const seed = opt.seed == null ? newSeed() : opt.seed;
  const r = await MUSIC.renderLoop({ preset: mood, seed }, { sampleRate: opt.sampleRate || 44100, volume: opt.volume });
  /* every mood lands at about the same loudness (-18 dBFS RMS) so a game can switch between them without riding the fader */
  if (opt.volume == null) levelTo(r.channels, -18);
  return { bytes: encodeWavStereo(r.channels, r.sampleRate, { loop: true }).bytes, seconds: r.seconds, seed, bars: r.bars };
}
/** 短乐句（胜利、失败、负罪感……），双声道 WAV，尾部静音裁掉 */
async function renderStinger(name, opt) {
  if (!STINGER_META[name]) throw new Error('Unknown stinger "' + name + '". Available: ' + Object.keys(STINGER_META).join(', '));
  loadAudio();
  const r = await MUSIC.renderStinger(name, { sampleRate: (opt && opt.sampleRate) || 44100 });
  /* guilt and grief stingers stay short: cut the reverb tail at 3 s with a half-second fade */
  if (/^(guilt|grief)/.test(name)) r.channels = r.channels.map(d => {
    const n = Math.min(d.length, Math.round(3 * r.sampleRate)), f = Math.round(0.5 * r.sampleRate), o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = d[i] * Math.min(1, (n - i) / f);
    return o;
  });
  return encodeWavStereo(r.channels, r.sampleRate, {});
}
function levelTo(ch, db) {
  let s = 0, n = 0;
  ch.forEach(d => { for (let i = 0; i < d.length; i++) s += d[i] * d[i]; n += d.length; });
  const rms = Math.sqrt(s / Math.max(1, n));
  if (rms < 1e-6) return;
  const g = Math.pow(10, db / 20) / rms;
  /* gain up, then a soft knee above 0.8 so drum peaks round off instead of clipping */
  ch.forEach(d => { for (let i = 0; i < d.length; i++) { const x = d[i] * g, a = Math.abs(x); d[i] = a < 0.8 ? x : Math.sign(x) * (0.8 + 0.18 * Math.tanh((a - 0.8) / 0.18)); } });
}
function encodeWavStereo(ch, sr, opt) {
  const L = ch[0], R = ch[1] || ch[0];
  let n = L.length;
  if (!opt.loop) { let end = n - 1; while (end > 0 && Math.abs(L[end]) < 0.0008 && Math.abs(R[end]) < 0.0008) end--; n = Math.min(n, end + Math.floor(sr * 0.05)); }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = peak > 0.98 ? 0.98 / peak : 1, smpl = opt.loop ? 68 : 0, data = n * 4;
  const b = Buffer.alloc(44 + data + smpl);
  b.write('RIFF', 0); b.writeUInt32LE(36 + data + smpl, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(data, 40);
  const q = x => Math.round(Math.max(-1, Math.min(1, x * k)) * 0x7fff);
  for (let i = 0; i < n; i++) { b.writeInt16LE(q(L[i]), 44 + i * 4); b.writeInt16LE(q(R[i]), 46 + i * 4); }
  if (opt.loop) {
    const o = 44 + data;
    b.write('smpl', o); b.writeUInt32LE(60, o + 4); b.writeUInt32LE(Math.round(1e9 / sr), o + 16); b.writeUInt32LE(60, o + 20);
    b.writeUInt32LE(1, o + 36); b.writeUInt32LE(0, o + 52); b.writeUInt32LE(0, o + 56); b.writeUInt32LE(n - 1, o + 60);
  }
  return { bytes: b, seconds: n / sr };
}

/** 网站上线后填上，生成结果会附带"在网页里试听和微调"的链接 */
const SITE_URL = process.env.SFXBREW_SITE_URL || 'https://sfxbrew.com/';

/* 给 agent 看的预设说明：选预设靠这里的描述 */
const META = {
  swordQi: ['Sword Qi', 'Sharp airy slash with a metallic ring: sword strike, blade wave, qi projectile.'],
  guqin: ['Guqin Pluck', 'Physically modelled Chinese zither string on the pentatonic scale: open string, finger slide, or a bell-like harmonic. UI tap, dialogue tick, calm feedback.'],
  bell: ['Temple Bell', 'Deep temple bell with beating overtones and a wooden-beam strike, or a smaller bronze bell. Shrine, notification, meditation, quest complete.'],
  gong: ['Gong', 'Large shimmering tam-tam or a Chinese opera gong whose pitch bends after the hit. Battle start, boss entrance, big announcement.'],
  spell: ['Spell Cast', 'Rising whoosh plus a sparkling pentatonic bell arpeggio and echo. Magic casting, skill activation, buff.'],
  thunder: ['Heavenly Thunder', 'Brewing, rolling thunder rumble, near or distant. Heavenly tribulation build-up, storm ambience. Use Lightning for the strike itself.'],
  breakthrough: ['Breakthrough', 'Low bell, rumble and a rising plucked arpeggio. Cultivation realm breakthrough, major level up, prestige.'],
  talisman: ['Talisman Burn', 'Crackling paper burn with a rising tone. Talisman activation, fire charm, ignite.'],
  alchemy: ['Alchemy Bubble', 'Bubbling blips followed by a bell. Potion brewing, crafting success, pill refined.'],
  chime: ['Wind Chime', 'A few soft high bell notes. Discovery, secret found, gentle ambience, encounter.'],
  flute: ['Bamboo Flute', 'Breathy flute note with vibrato. Calm transition, menu open, pastoral moment.'],
  qiGather: ['Qi Gathering', 'Swelling wobbling rise ending in a bell. Charging energy, channelling, meditation tick.'],
  pipa: ['Pipa', 'Bright plucked Chinese lute: single note, fast tremolo or strummed chord. Action accents, tension, Eastern UI.'],
  erhu: ['Erhu', 'Bowed two-string fiddle note with vibrato and sometimes a slide. Sad or emotional moments, character themes, dialogue.'],
  woodfish: ['Wooden Fish', 'Hollow wooden temple block knock, one to three hits. Monastery, chanting, clock tick, UI tap with an Eastern feel.'],
  drum: ['War Drum', 'Rolling Chinese war drums: steady march, fast thundering roll, or an accelerating build-up, two drummers in a big hall. Battle start, siege, boss phase, tension.'],
  lightning: ['Lightning', 'Lightning strike: crackling discharge, tearing zap, sharp crack and a short boom. Pair with Thunder for the distant rumble.'],
  coin: ['Coin', 'Two-note metallic ding. Coin, currency gained, purchase.'],
  pickup: ['Pickup', 'Quick upward chirp with a sparkle. Item pickup, collectible, gem.'],
  click: ['Click', 'Very short tactile tick. Button press, UI select, typing.'],
  confirm: ['Confirm', 'Two pleasant electric-piano notes going up. OK, accept, save, success toast.'],
  error: ['Error', 'Two dull low buzzy notes. Invalid action, denied, not enough resources.'],
  jump: ['Jump', 'Short rising boing with air. Character jump, bounce, hop.'],
  hit: ['Hit', 'Punchy thump with a crack. Melee hit, damage taken, impact, punch.'],
  explosion: ['Explosion', 'Violent blast with saturated body, sub punch, debris and aftershock; sometimes a chain of blasts. Explosion, bomb, destruction.'],
  laser: ['Laser', 'Falling zappy pew. Gun shot, laser, projectile fire.'],
  powerUp: ['Power-up', 'Rising arpeggio or swelling sweep. Power-up collected, upgrade, buff gained.'],
  levelUp: ['Level Up', 'Bright arpeggio with a chord and bell. Level up, achievement, reward.'],
  whoosh: ['Whoosh', 'Airy swoosh. Swing, dash, UI slide, transition.'],
  arrow: ['Arrow', 'Bowstring twang and the hiss of the arrow; about half the variations end with a wooden thud on the target. Archery, ranged attack.'],
  swordClash: ['Sword Clash', 'Metal-on-metal clang with a ringing, slightly beating tail and a short scrape; sometimes two quick hits. Parry, block, duel.'],
  footstepStone: ['Footstep (Stone)', 'One footstep on stone: heel thud, sole scuff and a little grit. Generate a few and alternate them for walking.'],
  rain: ['Rain', 'About 4 seconds of rain (light, medium or heavy) with random drops; fades in and out so it can loop. Weather, ambience.'],
  notify: ['Notification', 'Two soft marimba-like dings going up. Message, toast, quest update.'],
  footstepGrass: ['Footstep (Grass)', 'One real footstep on grass and leaves (8 recordings). Walking or running outdoors.'],
  land: ['Land', 'Real recording of landing after a jump (hard floor, ground, sticks), sometimes with a heavier low thump.'],
  shieldBlock: ['Shield Block', 'Metal impact from a real recording plus a synthesized shield-body thud. Block, guard, parry.'],
  wind: ['Wind', 'About 4 seconds of wind: a gust that swells and fades, with a thin whistle on top. Light, gusty or strong.'],
  campfire: ['Campfire', 'Five seconds of a real campfire crackling, seamless loop, sometimes with extra pops. Camp, rest point, hearth.'],
  stream: ['Stream', 'Five seconds of a real babbling stream, seamless loop. River, forest, peaceful areas.'],
  caveDrip: ['Cave Drip', 'Water drops falling into a pool with long cave reverb and echo. Caves, dungeons, mysterious places.'],
  pageTurn: ['Page Turn', 'Real page turns of thin and thick books (7 recordings). Menus, journals, spell books.'],
  typing: ['Typing', 'Burst of 3-8 real typewriter keystrokes, sometimes ending with the bell. Dialogue text, terminals.'],
  chestOpen: ['Chest Open', 'Real recordings of a wooden chest or trunk opening, sometimes followed by a treasure sparkle. Loot, rewards.'],
  monsterGrowl: ['Monster Growl', 'Real growls and roars, pitched lower or higher, with a low chest rumble. Monsters, beasts, dragons, bosses.']
};

/* 预设列表，带 catalog.js 的大类和标签。opts.category 只列这一类，opts.query 按名称、描述、关键词、标签搜索 */
function listPresets(opts) {
  opts = opts || {};
  const words = String(opts.query || '').toLowerCase().split(/\s+/).filter(Boolean);
  return PRESETS.map(p => {
    const e = CATALOG.ENTRIES[p.id];
    const tags = [].concat(...['style', 'material', 'mood'].map(d => e.tags[d] || []));
    return { id: p.id, name: META[p.id][0], group: p.group, category: e.cat, categories: CATALOG.catsOf(p.id), tags, description: META[p.id][1], loopable: EXPORT.LOOPABLE.includes(p.id) || undefined, _kw: e.kw };
  }).filter(x => (!opts.category || x.categories.includes(opts.category)) &&
    words.every(w => [x.id, x.name, x.description, x._kw, x.categories.join(' '), x.tags.join(' ')].join(' ').toLowerCase().includes(w)))
    .map(x => { delete x._kw; return x; });
}

function rng(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function withSeed(seed, fn) {
  const orig = Math.random;
  Math.random = rng(seed);
  try { return fn(); } finally { Math.random = orig; }
}
const newSeed = () => Math.floor(Math.random() * 1e9);

/** 生成一个声音的参数。seed 不给就随机一个；mutate = 在这个基础上再微调一次 */
function generate(presetId, seed, opts) {
  const p = PRESETS.find(x => x.id === presetId);
  if (!p) throw new Error('Unknown preset "' + presetId + '". Available: ' + PRESETS.map(x => x.id).join(', '));
  seed = seed == null ? newSeed() : seed;
  const patch = withSeed(seed, () => {
    let q = p.gen();
    if (opts && opts.mutate) q = mutate(q, opts.mutate);
    return q;
  });
  return { preset: presetId, seed, patch: round(patch) };
}

function round(p) {
  return JSON.parse(JSON.stringify(p, (k, v) => typeof v === 'number' ? +v.toPrecision(4) : v));
}

const DEFAULT_LAYER = {
  type: 'tone', wave: 'sine', freq: 440, freqEnd: 440, start: 0, attack: 0.005, decay: 0.3, vol: 0.5,
  filter: 'none', cutoff: 4000, cutoffEnd: 4000, q: 1, vib: 0, vibRate: 6, rep: 1, repGap: 0.1, repStep: 0, scale: 'penta',
  slideTime: 0, sweepTime: 0, unison: 1, detune: 12, fmRatio: 2, fmIndex: 0, fmDecay: 0.1, bright: 0.5,
  color: 'white', trem: 0, tremRate: 6, jitter: 0, pitchJitter: 0, freqPeak: 0, cutoffPeak: 0,
  hold: 0, repAccel: 1, repGain: 1
};
const DEFAULT_FX = { reverb: 0, echo: 0, echoTime: 0.2, drive: 0, crush: 0, gain: 0.8, seed: 1 };

/** 给 agent 的参数说明（MCP 工具描述里用） */
const PATCH_DOC = `A patch is JSON: { layers: Layer[1..6], reverb 0-1, echo 0-0.9, echoTime s, drive 0-1, crush 0|1-16 bits, gain 0-1 }.
Layer fields (all optional, defaults in brackets):
  type: "tone"|"fm"|"string"|"pluck"|"bell"|"noise" ["tone"]; wave: "sine"|"triangle"|"square"|"sawtooth" (tone/fm/pluck)
  string: physically modelled plucked string (Karplus-Strong); bright 0-1 [0.5] = darker (guqin) to brighter (pipa); decay = ring time
  bell: partials = [[ratio, amplitude, decayMultiplier 0-1], ...] (max 16) for custom bells, gongs, wood blocks; default is a metal bar
  sample: a CC0 recording; sample = one of ${Object.keys(SAMPLES).join(', ')}; pitch / pitchEnd semitones (slide over slideTime); offset s into the recording;
          set hold ≈ recording length to let it ring naturally (lengths s: ${Object.entries(SAMPLES).map(([k, v]) => k + ' ' + v.length).join(', ')})
  freq, freqEnd: Hz, pitch slides exponentially from freq to freqEnd; slideTime: s the slide takes (0 = whole sound)
  hold: s to stay at full volume before the decay starts (louder, more violent bodies)
  repAccel: gap multiplier per repeat (<1 speeds up, e.g. 0.86 for an accelerating drum build-up); repGain: loudness multiplier per repeat (>1 crescendo)
  freqPeak / cutoffPeak (Hz, 0 = off): go up to this value by the end of attack, then down to freqEnd / cutoffEnd (Doppler-like pass-by for swishes)
  start: s delay; attack: s; decay: s (exponential fade); vol: 0-1
  filter: "none"|"lowpass"|"highpass"|"bandpass"; cutoff, cutoffEnd: Hz; sweepTime: s (0 = whole); q: resonance
  vib: vibrato depth in cents; vibRate: Hz
  rep: number of repeats; repGap: s between repeats; repStep: pitch step per repeat; scale: "penta"|"chromatic" (unit of repStep)
  jitter 0-1: random gaps (1 = Poisson-like) and loudness per repeat; pitchJitter: semitones of random pitch/cutoff per repeat (crackles, bubbles, debris)
  noise layers: color "white"|"pink"|"brown"; any layer: trem 0-1 + tremRate Hz = wavering loudness (flames, rumble)
  patch.seed: integer that fixes the random pattern of jitter
  unison: 1-5 stacked voices; detune: cents spread
  fmRatio, fmIndex, fmDecay: FM modulator ratio, depth and how fast the depth decays (type "fm" only)
Tips: punchy impacts = short noise layer (decay ~0.01) + tone with fast slideTime (~0.04); metallic = fm or bell; keep total vol*gain under ~1.`;

function validatePatch(p) {
  if (!p || !Array.isArray(p.layers) || !p.layers.length) throw new Error('patch.layers must be a non-empty array');
  if (p.layers.length > 6) throw new Error('at most 6 layers');
  const out = Object.assign({}, DEFAULT_FX, p, { layers: p.layers.map(l => Object.assign({}, DEFAULT_LAYER, l)) });
  out.layers.forEach(l => {
    l.attack = Math.max(0.0005, Math.min(4, +l.attack)); l.decay = Math.max(0.005, Math.min(10, +l.decay));
    l.rep = Math.max(1, Math.min(64, Math.round(l.rep)));
    ['freq', 'freqEnd', 'cutoff', 'cutoffEnd'].forEach(k => { l[k] = Math.max(1, Math.min(20000, +l[k])); });
    l.bright = Math.max(0, Math.min(1, +l.bright));
    if (l.type === 'sample' && !SAMPLES[l.sample]) throw new Error('unknown sample "' + l.sample + '". Available: ' + Object.keys(SAMPLES).join(', '));
    if (l.partials != null) {
      if (!Array.isArray(l.partials) || l.partials.length > 16 || !l.partials.every(p => Array.isArray(p) && p.length >= 2 && p.every(x => typeof x === 'number' && isFinite(x))))
        throw new Error('partials must be up to 16 arrays of numbers [ratio, amplitude, decayMultiplier]');
    }
  });
  return out;
}

async function renderWav(patch, sampleRate) {
  const sr = sampleRate || 44100;
  const buf = await SFX.render(patch, sr);
  return encodeWav(buf.getChannelData(0), sr);
}

/** 无缝循环 WAV（带 smpl 循环点）。preset 决定做法（连续铺底 / 错开叠放），见 export.js */
async function renderLoop(patch, opt) {
  opt = opt || {};
  const sr = opt.sampleRate || 44100;
  const d = await EXPORT.makeLoop(SFX.render, patch, { seconds: opt.seconds || 10, preset: opt.preset, samples: SAMPLES, mutate, sampleRate: sr });
  return { bytes: Buffer.from(EXPORT.encodeWav(d, sr, { loop: true })), seconds: d.length / sr };
}

/**
 * 游戏引擎包：outDir/sfxbrew-<name>/ 下写 wav/（多个变体或循环）、godot/*.tres、unity/SfxBrewPlayer.cs、web/*.js、README.txt。
 * 一次性音效：count 个变体（默认 8）；循环：count 个不同的循环（默认 2），每个约 loopSeconds 秒。
 */
async function exportPack(opt) {
  const preset = opt.preset, loop = !!opt.loopSeconds;
  if (loop && preset && !EXPORT.LOOPABLE.includes(preset)) throw new Error('"' + preset + '" is not a loopable preset. Loopable: ' + EXPORT.LOOPABLE.join(', '));
  const name = (opt.name || preset || 'sound').replace(/[^A-Za-z0-9-]+/g, '-');
  const count = Math.max(1, Math.min(loop ? 6 : 30, opt.count || (loop ? 2 : 8)));
  const wavs = [], items = [];
  for (let i = 0; i < count; i++) {
    let patch, seed = null;
    if (opt.patch) patch = i ? mutate(opt.patch, 0.12) : opt.patch;
    else { const g = generate(preset, opt.seed == null ? null : opt.seed + i); patch = g.patch; seed = g.seed; }
    const r = loop ? await renderLoop(patch, { seconds: opt.loopSeconds, preset }) : await renderWav(patch);
    const file = name + '-' + String(i + 1).padStart(2, '0') + '.wav';
    wavs.push({ name: file, data: r.bytes });
    items.push({ file, seed, seconds: +r.seconds.toFixed(2), patch });
  }
  const usesSamples = items.some(x => x.patch.layers.some(l => l.type === 'sample'));
  const files = EXPORT.packFiles({ name, title: META[preset] ? META[preset][0] : name, wavs, loop, seconds: opt.loopSeconds, samples: usesSamples, link: preset ? editorLink(preset, items[0].patch) : null });
  const dir = path.resolve(opt.outDir || '.');
  files.forEach(f => writeFile(path.join(dir, f.name), f.data));
  return { folder: path.join(dir, 'sfxbrew-' + name), files: files.map(f => path.join(dir, f.name)), sounds: items.map(x => ({ file: x.file, seed: x.seed, seconds: x.seconds })) };
}

function trimLength(d, sr) {
  let end = d.length - 1;
  while (end > 0 && Math.abs(d[end]) < 0.0008) end--;
  return Math.min(d.length, end + Math.floor(sr * 0.02));
}

function encodeWav(src, sr) {
  const n = trimLength(src, sr);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(src[i]));
  const k = peak > 0.98 ? 0.98 / peak : 1;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, src[i] * k)) * 0x7fff), 44 + i * 2);
  return { bytes: b, seconds: n / sr };
}

const ENGINE_SRC = makeSfx.toString().split('\n').map(s => s.replace(/\s+$/, '')).join('\n');

/** 一段独立可运行的 JS：引擎 + 若干声音 + 播放函数。sounds: [{name, patch}] */
function jsCode(sounds) {
  const ident = s => s.replace(/[^A-Za-z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^[^A-Za-z_]/, '_$&');
  let out = '// Sound effects made with SFX Brew (free for commercial use)\n' +
    '// Call a play function after a user click/tap (browsers block audio before the first gesture).\n' +
    'const sfxBrew = (' + ENGINE_SRC + ')();\n';
  if (sounds.some(s => (s.patch.layers || []).some(x => x.type === 'sample'))) out += '// Some of these sounds play short CC0 recordings, loaded on first use from https://sfxbrew.com/samples/ (credits: https://sfxbrew.com/samples/CREDITS.md).\n' +
    '// To self-host, copy the .mp3 files (also in node_modules/sfxbrew/samples/) next to your game and call sfxBrew.setSampleBase("./sfx/").\n';
  sounds.forEach(s => {
    const n = ident(s.name);
    const fn = 'play' + n.charAt(0).toUpperCase() + n.slice(1);
    out += 'const SOUND_' + n.toUpperCase() + ' = ' + JSON.stringify(round(s.patch)) + ';\n' +
      'function ' + fn + '() { sfxBrew.play(SOUND_' + n.toUpperCase() + '); }\n';
  });
  return out;
}

function editorLink(presetId, patch) {
  if (!SITE_URL) return null;
  return SITE_URL.replace(/\/$/, '') + '/#' + presetId + '.' + Buffer.from(JSON.stringify(round(patch))).toString('base64url');
}

/** 把 WAV 写到磁盘；目录不存在就建 */
function writeFile(file, bytes) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, bytes);
  return path.resolve(file);
}

module.exports = { MUSIC_META, STINGER_META, renderMusic, renderStinger, PRESETS, CATALOG, META, PATCH_DOC, LOOPABLE: EXPORT.LOOPABLE, listPresets, generate, validatePatch, renderWav, renderLoop, exportPack, jsCode, editorLink, writeFile, SITE_URL };
