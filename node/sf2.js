/* ============================================================================
   SFX Brew · SoundFont 多轨乐器渲染器（基于 spessasynth_core + MuseScore MS Basic.sf3，MIT）
   ----------------------------------------------------------------------------
   提供 309 个 GM/GS 采样乐器与鼓组预设，支持多轨合奏与分轨（Stems）离线渲染。
   ==========================================================================*/
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { SoundBankLoader, SpessaSynthProcessor, audioToWav } = require('spessasynth_core');
const { StbVorbis } = require('stb-vorbis');

const DEFAULT_SF2 = path.join(__dirname, '..', 'soundfonts', 'MS Basic.sf3');
const FALLBACK_SF2 = path.join(__dirname, '..', 'soundfonts', 'GeneralUser-GS.sf2');
const CACHE_SF2 = path.join(os.homedir(), '.sfxbrew', 'soundfonts', 'MS Basic.sf3');
const crypto = require('crypto');
// 固定到 MuseScore 的某个 commit，保证每个人下到的是同一个文件；下载后校验 SHA-256，不符就丢弃
const SF2_COMMIT = '527e4cfd49e007cbf75cb6ed24f1037b66e6d305';
const SF2_SHA256 = '5ea2375e8bd7d8e71def1036978c1621e85b66934169b6a2744b27b9b3c2d99c';
const SF2_RAW = 'https://raw.githubusercontent.com/musescore/MuseScore/' + SF2_COMMIT + '/share/sound/MS%20Basic.sf3';
const SF2_URLS = [
  SF2_RAW,
  // 第三方镜像只在官方源都失败时使用（例如国内网络），内容同样要过哈希校验
  'https://gh-proxy.com/' + SF2_RAW
];

const ALIASES = {
  piano: { program: 0 },
  brightPiano: { program: 1 },
  epiano: { program: 4 },
  fmEpiano: { program: 5 },
  harpsichord: { program: 6 },
  celesta: { program: 8 },
  glockenspiel: { program: 9 },
  musicBox: { program: 10 },
  vibraphone: { program: 11 },
  marimba: { program: 12 },
  xylophone: { program: 13 },
  tubularBells: { program: 14 },
  dulcimer: { program: 15 },
  organ: { program: 19 },
  accordion: { program: 21 },
  nylon: { program: 24 },
  steel: { program: 25 },
  jazzGuitar: { program: 26 },
  cleanGuitar: { program: 27 },
  overdriveGuitar: { program: 29 },
  distortionGuitar: { program: 30 },
  acousticBass: { program: 32 },
  fingerBass: { program: 33 },
  slapBass: { program: 36 },
  synthBass: { program: 38 },
  violin: { program: 40 },
  viola: { program: 41 },
  cello: { program: 42 },
  contrabass: { program: 43 },
  pizzicato: { program: 45 },
  harp: { program: 46 },
  timpani: { program: 47 },
  strings: { program: 48 },
  slowStrings: { program: 49 },
  synthStrings: { program: 50 },
  choir: { program: 52 },
  trumpet: { program: 56 },
  trombone: { program: 57 },
  tuba: { program: 58 },
  horn: { program: 60 },
  brass: { program: 61 },
  altoSax: { program: 65 },
  tenorSax: { program: 66 },
  oboe: { program: 68 },
  clarinet: { program: 71 },
  flute: { program: 73 },
  panFlute: { program: 75 },
  shakuhachi: { program: 77 },
  ocarina: { program: 79 },
  squareLead: { program: 80 },
  sawLead: { program: 81 },
  newAgePad: { program: 88 },
  warmPad: { program: 89 },
  polysynth: { program: 90 },
  choirPad: { program: 91 },
  sitar: { program: 104 },
  banjo: { program: 105 },
  shamisen: { program: 106 },
  koto: { program: 107 },
  kalimba: { program: 108 },
  bagpipe: { program: 109 },
  fiddle: { program: 110 },
  shanai: { program: 111 },
  taiko: { program: 116 },
  melodicTom: { program: 117 },
  synthDrum: { program: 118 },
  standardKit: { program: 0, drums: true },
  roomKit: { program: 8, drums: true },
  powerKit: { program: 16, drums: true },
  electronicKit: { program: 24, drums: true },
  kit808: { program: 25, drums: true }
};

let _cachedBank = null;
let _cachedPath = null;

function resolveSf2Path(sf2Path) {
  if (sf2Path) return path.resolve(sf2Path);
  if (process.env.SFXBREW_SF2) return path.resolve(process.env.SFXBREW_SF2);
  if (fs.existsSync(DEFAULT_SF2)) return DEFAULT_SF2;
  if (fs.existsSync(FALLBACK_SF2)) return FALLBACK_SF2;
  return CACHE_SF2;
}

async function ensureBank(sf2Path) {
  await StbVorbis.ready;
  const p = resolveSf2Path(sf2Path);
  if (_cachedBank && _cachedPath === p) return _cachedBank;
  if (!fs.existsSync(p)) {
    if (sf2Path || process.env.SFXBREW_SF2) {
      throw new Error('SoundFont not found at ' + p);
    }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    let downloaded = null, lastErr = null;
    process.stderr.write('sfxbrew: downloading the MS Basic SoundFont (51 MB, MIT license) to ' + p + ' (first run only)\n');
    for (const url of SF2_URLS) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        const hash = crypto.createHash('sha256').update(buf).digest('hex');
        if (hash !== SF2_SHA256) throw new Error('checksum mismatch from ' + new URL(url).host);
        downloaded = buf;
        break;
      } catch (e) { lastErr = e; }
    }
    if (!downloaded) throw new Error('Failed to download MS Basic.sf3: ' + (lastErr && lastErr.message) + '. Download it from ' + SF2_RAW + ' and set SFXBREW_SF2 to its path.');
    // 先写临时文件再改名，下载中断不会留下半截文件
    const tmp = p + '.part-' + process.pid;
    fs.writeFileSync(tmp, downloaded);
    fs.renameSync(tmp, p);
  }
  const buf = fs.readFileSync(p);
  _cachedBank = SoundBankLoader.fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  _cachedPath = p;
  return _cachedBank;
}

function loadBank(sf2Path) {
  const p = resolveSf2Path(sf2Path);
  if (_cachedBank && _cachedPath === p) return _cachedBank;
  if (!fs.existsSync(p)) {
    throw new Error('SoundFont not found at ' + p + '. Place MS Basic.sf3 in soundfonts/ or set SFXBREW_SF2.');
  }
  const buf = fs.readFileSync(p);
  _cachedBank = SoundBankLoader.fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  _cachedPath = p;
  return _cachedBank;
}

function listInstruments(sf2Path) {
  const bank = loadBank(sf2Path);
  return bank.presets.map(p => ({
    program: p.program,
    bank: p.bank || 0,
    name: p.name
  }));
}

function resolveInstrument(spec) {
  if (typeof spec === 'number') return { program: spec, drums: false };
  if (spec && typeof spec === 'object') return spec;
  if (ALIASES[spec]) return ALIASES[spec];
  const bank = loadBank();
  const q = String(spec || '').toLowerCase();
  const hit = bank.presets.find(p => p.name.toLowerCase().includes(q));
  if (hit) return { program: hit.program, drums: !!hit.isAnyDrums };
  return { program: 0, drums: false };
}

async function renderSinglePass(tracks, opts, bank) {
  const sr = (opts && opts.sampleRate) || 44100;
  const tailSec = (opts && opts.tailSeconds) != null ? opts.tailSeconds : 1.5;
  let maxEnd = 0;
  tracks.forEach(tr => (tr.notes || []).forEach(n => {
    maxEnd = Math.max(maxEnd, (n.time || 0) + (n.dur || 0.25));
  }));
  const durSec = Math.max(0.5, (opts && opts.duration) || (maxEnd + tailSec));
  const totalSamples = Math.ceil(sr * durSec);

  const synth = new SpessaSynthProcessor(sr, { enableEventSystem: false });
  synth.soundBankManager.addSoundBank(bank, 'main');
  await synth.processorInitialized;

  const events = [];
  let melodicCh = 0;
  tracks.forEach(tr => {
    const inst = resolveInstrument(tr.instrument);
    const ch = inst.drums ? 9 : (melodicCh === 9 ? (melodicCh += 2, 10) : melodicCh++);
    if (ch > 15) throw new Error('At most 15 melodic channels + 1 drum channel per pass');
    synth.programChange(ch, inst.program || 0);
    if (tr.pan != null) synth.controllerChange(ch, 10, Math.round(Math.max(-1, Math.min(1, tr.pan)) * 63 + 64));
    if (tr.volume != null) synth.controllerChange(ch, 7, Math.round(Math.max(0, Math.min(1, tr.volume)) * 127));
    if (tr.reverb != null) synth.controllerChange(ch, 91, Math.round(Math.max(0, Math.min(1, tr.reverb)) * 127));
    if (tr.chorus != null) synth.controllerChange(ch, 93, Math.round(Math.max(0, Math.min(1, tr.chorus)) * 127));

    const sortedNotes = (tr.notes || []).slice().sort((a, b) => (a.time || 0) - (b.time || 0));
    let prevEnd = -99, prevMidi = null;
    sortedNotes.forEach(n => {
      const t0 = Math.max(0, n.time || 0);
      const dur = Math.max(0.02, n.dur || 0.25);
      const t1 = t0 + dur;
      const vel = Math.round(Math.max(1, Math.min(127, (n.vel != null ? n.vel : 0.8) * 127)));
      const isSlurred = tr.legato && !inst.drums && prevMidi != null && (t0 - prevEnd) <= 0.12 && prevMidi !== n.midi;

      if (isSlurred) {
        // 45ms 微滑音起音 + 柔和气音接入：保留真实采样音色，同时带出管乐抹音连奏感
        const up = n.midi > prevMidi;
        events.push({ t: t0, type: 3, ch, val: up ? 5200 : 11180 });
        events.push({ t: t0 + 0.015, type: 3, ch, val: up ? 6600 : 9780 });
        events.push({ t: t0 + 0.03, type: 3, ch, val: up ? 7650 : 8730 });
        events.push({ t: t0 + 0.045, type: 3, ch, val: 8192 });
        events.push({ t: t0, type: 2, ch, cc: 11, val: 90 });
        events.push({ t: t0 + 0.045, type: 2, ch, cc: 11, val: 118 });
      } else if (tr.legato && !inst.drums) {
        events.push({ t: Math.max(0, t0 - 0.004), type: 3, ch, val: 8192 });
      }

      events.push({ t: t0, type: 1, ch, midi: n.midi, vel });
      events.push({ t: t1, type: 0, ch, midi: n.midi, vel: 0 });

      if (!inst.drums && tr.expressive && dur >= 0.75) {
        if (!isSlurred) events.push({ t: t0, type: 2, ch, cc: 11, val: 98 });
        events.push({ t: t0 + Math.min(0.18, dur * 0.28), type: 2, ch, cc: 11, val: 122 });
        events.push({ t: Math.max(t0 + 0.1, t1 - 0.08), type: 2, ch, cc: 11, val: 102 });
      } else if (!inst.drums && tr.expressive && !isSlurred) {
        events.push({ t: t0, type: 2, ch, cc: 11, val: 114 });
      }
      prevEnd = t1;
      prevMidi = n.midi;
    });
  });

  events.sort((a, b) => a.t - b.t || a.type - b.type);

  const L = new Float32Array(totalSamples);
  const R = new Float32Array(totalSamples);
  let ei = 0;
  for (let pos = 0; pos < totalSamples; pos += 128) {
    const sec = pos / sr;
    while (ei < events.length && events[ei].t <= sec) {
      const ev = events[ei++];
      if (ev.type === 1) synth.noteOn(ev.ch, ev.midi, ev.vel);
      else if (ev.type === 0) synth.noteOff(ev.ch, ev.midi);
      else if (ev.type === 2) synth.controllerChange(ev.ch, ev.cc, ev.val);
      else if (ev.type === 3) synth.pitchWheel(ev.ch, ev.val);
    }
    const n = Math.min(128, totalSamples - pos);
    synth.process(L, R, pos, n);
  }

  // 柔和母带限幅（soft-knee limiter），防止高潮/鼓点瞬态炸耳削波
  for (let i = 0; i < totalSamples; i++) {
    for (const buf of [L, R]) {
      const x = buf[i], a = Math.abs(x);
      if (a > 0.72) buf[i] = Math.sign(x) * (0.72 + 0.22 * Math.tanh((a - 0.72) / 0.22));
    }
  }

  return { channels: [L, R], sampleRate: sr, seconds: durSec };
}

function toWavBytes(channels, sr) {
  return Buffer.from(audioToWav(channels, sr));
}

/**
 * 渲染多轨音乐。opts.stems = true 时额外返回每条音轨的独立立体声 WAV。
 */
async function renderTracks(tracks, opts) {
  opts = opts || {};
  const bank = await ensureBank(opts.sf2Path);
  const mix = await renderSinglePass(tracks, opts, bank);
  const result = {
    bytes: toWavBytes(mix.channels, mix.sampleRate),
    seconds: mix.seconds,
    sampleRate: mix.sampleRate
  };
  if (opts.stems) {
    result.stems = [];
    for (let i = 0; i < tracks.length; i++) {
      const tr = tracks[i];
      const stem = await renderSinglePass([tr], Object.assign({}, opts, { duration: mix.seconds }), bank);
      result.stems.push({
        name: tr.name || ('track-' + (i + 1)),
        instrument: tr.instrument,
        bytes: toWavBytes(stem.channels, stem.sampleRate)
      });
    }
  }
  return result;
}

module.exports = { ALIASES, loadBank, listInstruments, resolveInstrument, renderTracks };
