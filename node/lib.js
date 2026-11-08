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
const { PRESETS, mutate } = require('../presets.js');
const { OfflineAudioContext } = require('node-web-audio-api');

const SFX = makeSfx({ OfflineAudioContext });

/** 网站上线后填上，生成结果会附带"在网页里试听和微调"的链接 */
const SITE_URL = process.env.SFXBREW_SITE_URL || 'https://sfxbrew.com/';

/* 给 agent 看的预设说明：选预设靠这里的描述 */
const META = {
  swordQi: ['Sword Qi', 'Sharp airy slash with a metallic ring: sword strike, blade wave, qi projectile.'],
  guqin: ['Guqin Pluck', 'Physically modelled Chinese zither string on the pentatonic scale: open string, finger slide, or a bell-like harmonic. UI tap, dialogue tick, calm feedback.'],
  bell: ['Temple Bell', 'Deep temple bell with beating overtones and a wooden-beam strike, or a smaller bronze bell. Shrine, notification, meditation, quest complete.'],
  gong: ['Gong', 'Large shimmering tam-tam or a Chinese opera gong whose pitch bends after the hit. Battle start, boss entrance, big announcement.'],
  spell: ['Spell Cast', 'Rising whoosh plus a sparkling pentatonic bell arpeggio and echo. Magic casting, skill activation, buff.'],
  thunder: ['Heavenly Thunder', 'Loud crack and rolling rumble. Lightning strike, heavenly tribulation, storm.'],
  breakthrough: ['Breakthrough', 'Low bell, rumble and a rising plucked arpeggio. Cultivation realm breakthrough, major level up, prestige.'],
  talisman: ['Talisman Burn', 'Crackling paper burn with a rising tone. Talisman activation, fire charm, ignite.'],
  alchemy: ['Alchemy Bubble', 'Bubbling blips followed by a bell. Potion brewing, crafting success, pill refined.'],
  chime: ['Wind Chime', 'A few soft high bell notes. Discovery, secret found, gentle ambience, encounter.'],
  flute: ['Bamboo Flute', 'Breathy flute note with vibrato. Calm transition, menu open, pastoral moment.'],
  qiGather: ['Qi Gathering', 'Swelling wobbling rise ending in a bell. Charging energy, channelling, meditation tick.'],
  pipa: ['Pipa', 'Bright plucked Chinese lute: single note, fast tremolo or strummed chord. Action accents, tension, Eastern UI.'],
  erhu: ['Erhu', 'Bowed two-string fiddle note with vibrato and sometimes a slide. Sad or emotional moments, character themes, dialogue.'],
  woodfish: ['Wooden Fish', 'Hollow wooden temple block knock, one to three hits. Monastery, chanting, clock tick, UI tap with an Eastern feel.'],
  drum: ['War Drum', 'Chinese drum hit, one or two booms, small or large. Battle start, march, impact, turn change.'],
  coin: ['Coin', 'Two-note metallic ding. Coin, currency gained, purchase.'],
  pickup: ['Pickup', 'Quick upward chirp with a sparkle. Item pickup, collectible, gem.'],
  click: ['Click', 'Very short tactile tick. Button press, UI select, typing.'],
  confirm: ['Confirm', 'Two pleasant electric-piano notes going up. OK, accept, save, success toast.'],
  error: ['Error', 'Two dull low buzzy notes. Invalid action, denied, not enough resources.'],
  jump: ['Jump', 'Short rising boing with air. Character jump, bounce, hop.'],
  hit: ['Hit', 'Punchy thump with a crack. Melee hit, damage taken, impact, punch.'],
  explosion: ['Explosion', 'Big boom with sub rumble and debris crackle. Explosion, bomb, destruction.'],
  laser: ['Laser', 'Falling zappy pew. Gun shot, laser, projectile fire.'],
  powerUp: ['Power-up', 'Rising arpeggio or swelling sweep. Power-up collected, upgrade, buff gained.'],
  levelUp: ['Level Up', 'Bright arpeggio with a chord and bell. Level up, achievement, reward.'],
  whoosh: ['Whoosh', 'Airy swoosh. Swing, dash, UI slide, transition.']
};

function listPresets() {
  return PRESETS.map(p => ({ id: p.id, name: META[p.id][0], group: p.group, description: META[p.id][1] }));
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
  slideTime: 0, sweepTime: 0, unison: 1, detune: 12, fmRatio: 2, fmIndex: 0, fmDecay: 0.1, bright: 0.5
};
const DEFAULT_FX = { reverb: 0, echo: 0, echoTime: 0.2, drive: 0, crush: 0, gain: 0.8 };

/** 给 agent 的参数说明（MCP 工具描述里用） */
const PATCH_DOC = `A patch is JSON: { layers: Layer[1..6], reverb 0-1, echo 0-0.9, echoTime s, drive 0-1, crush 0|1-16 bits, gain 0-1 }.
Layer fields (all optional, defaults in brackets):
  type: "tone"|"fm"|"string"|"pluck"|"bell"|"noise" ["tone"]; wave: "sine"|"triangle"|"square"|"sawtooth" (tone/fm/pluck)
  string: physically modelled plucked string (Karplus-Strong); bright 0-1 [0.5] = darker (guqin) to brighter (pipa); decay = ring time
  bell: partials = [[ratio, amplitude, decayMultiplier 0-1], ...] (max 16) for custom bells, gongs, wood blocks; default is a metal bar
  freq, freqEnd: Hz, pitch slides exponentially from freq to freqEnd; slideTime: s the slide takes (0 = whole sound)
  start: s delay; attack: s; decay: s (exponential fade); vol: 0-1
  filter: "none"|"lowpass"|"highpass"|"bandpass"; cutoff, cutoffEnd: Hz; sweepTime: s (0 = whole); q: resonance
  vib: vibrato depth in cents; vibRate: Hz
  rep: number of repeats; repGap: s between repeats; repStep: pitch step per repeat; scale: "penta"|"chromatic" (unit of repStep)
  unison: 1-5 stacked voices; detune: cents spread
  fmRatio, fmIndex, fmDecay: FM modulator ratio, depth and how fast the depth decays (type "fm" only)
Tips: punchy impacts = short noise layer (decay ~0.01) + tone with fast slideTime (~0.04); metallic = fm or bell; keep total vol*gain under ~1.`;

function validatePatch(p) {
  if (!p || !Array.isArray(p.layers) || !p.layers.length) throw new Error('patch.layers must be a non-empty array');
  if (p.layers.length > 6) throw new Error('at most 6 layers');
  const out = Object.assign({}, DEFAULT_FX, p, { layers: p.layers.map(l => Object.assign({}, DEFAULT_LAYER, l)) });
  out.layers.forEach(l => {
    l.attack = Math.max(0.0005, Math.min(4, +l.attack)); l.decay = Math.max(0.005, Math.min(10, +l.decay));
    l.rep = Math.max(1, Math.min(32, Math.round(l.rep)));
    ['freq', 'freqEnd', 'cutoff', 'cutoffEnd'].forEach(k => { l[k] = Math.max(1, Math.min(20000, +l[k])); });
    l.bright = Math.max(0, Math.min(1, +l.bright));
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

module.exports = { PRESETS, META, PATCH_DOC, listPresets, generate, validatePatch, renderWav, jsCode, editorLink, writeFile, SITE_URL };
