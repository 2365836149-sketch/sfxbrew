/* ============================================================================
   SFX Brew · SoundFont 多轨编曲引擎 v3（自由组合：调式 × 律动 × 和声 × 287 乐器）
   ----------------------------------------------------------------------------
   既保留 lofi / synthwave / jrpg / dungeon / guochao 五个开箱即用预设，
   也支持任意自由组合：
   - scale    : major / minor / penta / pentaMinor / dorian / phrygian / blues / harmonicMinor / miyako
   - groove   : boombap / fourOnFloor / waltz / march / trap / bossa / ambient
   - chordMood: bright / chill / epic / dark / jazzy
   - meter    : 3 | 4，tempo: 40..200，instruments: 287 种乐器任意混搭
   ==========================================================================*/
'use strict';

const { Note, Chord } = require('tonal');
const sf2 = require('./sf2.js');
const neural = require('./neural.js');

/* 解析自定义和弦名数组（如 ['Dm7', 'G7', 'Cmaj7', 'A7']）为相对 root 的半音偏移 */
function parseChordProg(chordNames, root) {
  if (!Array.isArray(chordNames) || !chordNames.length) return null;
  const parsed = chordNames.map(name => {
    const c = Chord.get(String(name));
    if (!c.notes || !c.notes.length) return [0, 4, 7];
    const midis = c.notes.map(n => Note.chroma(n));
    const base = midis[0];
    return midis.map((ch, i) => {
      let diff = ((ch - base) % 12 + 12) % 12;
      if (i > 0 && diff === 0) diff = 12;
      return diff + ((base - (root % 12) + 12) % 12);
    });
  });
  return parsed;
}

/* 欧几里得节奏（Bjorklund）：生成均匀分布的切分打击乐/节奏脉冲 */
function euclid(k, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(((i * k) % n) < k ? 1 : 0);
  return out;
}

/* 声部平稳连接（Voice Leading）：将下一个和弦的每个音调整八度，使与上一个和弦的移动距离最小 */
function voiceLeadChord(prevVoicing, root, chordIntervals) {
  const raw = chordIntervals.map(iv => root + iv);
  if (!prevVoicing || !prevVoicing.length) return raw;
  const avgPrev = prevVoicing.reduce((a, b) => a + b, 0) / prevVoicing.length;
  return raw.map(m => {
    let best = m;
    for (const shift of [-12, 0, 12]) {
      const cand = m + shift;
      if (cand >= root - 7 && cand <= root + 19 && Math.abs(cand - avgPrev) < Math.abs(best - avgPrev)) {
        best = cand;
      }
    }
    return best;
  }).sort((a, b) => a - b);
}

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  penta: [0, 2, 4, 7, 9],
  pentaMinor: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  blues: [0, 3, 5, 6, 7, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  miyako: [0, 1, 5, 7, 8]
};

const CHORD_POOLS = {
  bright: [[[0, 4, 7], [7, 11, 14], [9, 12, 16], [4, 7, 11]], [[5, 9, 12], [0, 4, 7], [2, 5, 9], [7, 11, 14]]],
  warm: [[[0, 4, 7, 11], [7, 11, 14], [9, 12, 16, 19], [5, 9, 12, 16]], [[5, 9, 12, 16], [7, 11, 14], [4, 7, 11, 14], [9, 12, 16, 19]]],
  chill: [[[0, 3, 7, 10], [5, 8, 12, 15], [3, 7, 10, 14], [7, 10, 14, 17]], [[5, 8, 12, 15], [3, 7, 10, 14], [0, 3, 7, 10], [7, 11, 14, 17]]],
  epic: [[[0, 3, 7], [8, 12, 15], [3, 7, 10], [7, 10, 14]], [[5, 8, 12], [3, 7, 10], [8, 12, 15], [7, 11, 14]]],
  dark: [[[0, 3, 7], [1, 5, 8], [0, 3, 7], [7, 10, 14]], [[5, 8, 12], [1, 5, 8], [3, 7, 10], [0, 3, 7]]],
  jazzy: [[[2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11], [9, 12, 16, 19]], [[5, 9, 12, 16], [7, 10, 14, 17], [4, 7, 11, 14], [0, 4, 7, 11]]]
};

const GROOVES = ['boombap', 'fourOnFloor', 'waltz', 'march', 'trap', 'bossa', 'ambient'];

const STYLES = {
  lofi: {
    desc: 'Chill Lo-Fi beats: dusty boom-bap swing, warm electric piano chords, deep bass and relaxed room drums.',
    tempo: 80, meter: 4, root: 57, scale: 'minor', chordMood: 'chill', groove: 'boombap',
    instruments: { melody: 'koto', pad: 'warmPad', accomp: 'epiano', bass: 'fingerBass', drums: 'roomKit' },
    humanize: 0.8, swing: 0.16, reverb: 0.36
  },
  synthwave: {
    desc: 'Retro cyberpunk Synthwave: 4-on-the-floor driving beat, octave-jumping synth bass, lush pad and saw lead.',
    tempo: 118, meter: 4, root: 57, scale: 'minor', chordMood: 'epic', groove: 'fourOnFloor',
    instruments: { melody: 'sawLead', pad: 'polysynth', accomp: 'fmEpiano', bass: 'synthBass', drums: 'kit808' },
    humanize: 0.1, swing: 0, reverb: 0.42
  },
  jrpg: {
    desc: 'Classic JRPG 3/4 waltz town theme: flute melody over harp waltz arpeggios, strings and light percussion.',
    tempo: 112, meter: 3, root: 60, scale: 'major', chordMood: 'bright', groove: 'waltz',
    instruments: { melody: 'flute', pad: 'strings', accomp: 'harp', bass: 'cello', drums: 'standardKit' },
    humanize: 0.45, swing: 0, reverb: 0.46
  },
  dungeon: {
    desc: 'Dark dungeon & boss march: heavy low drums with snare triplet rolls, dark choir pad, organ and cello.',
    tempo: 88, meter: 4, root: 50, scale: 'phrygian', chordMood: 'dark', groove: 'march',
    instruments: { melody: 'cello', pad: 'choirPad', accomp: 'organ', bass: 'contrabass', drums: 'powerKit' },
    humanize: 0.3, swing: 0, reverb: 0.56
  },
  guochao: {
    desc: 'Guochao (Chinese electronic fusion): half-time 808 trap groove, koto grace-note melody, harp and strings.',
    tempo: 136, meter: 4, root: 62, scale: 'penta', chordMood: 'bright', groove: 'trap',
    instruments: { melody: 'koto', pad: 'strings', accomp: 'harp', bass: 'synthBass', drums: 'kit808' },
    humanize: 0.4, swing: 0, reverb: 0.4
  },
  bossanova: {
    desc: 'Sunny cafe & island Bossa Nova: nylon guitar syncopation, vibraphone melody, acoustic walking bass and light room drums.',
    tempo: 104, meter: 4, root: 60, scale: 'major', chordMood: 'jazzy', groove: 'bossa',
    instruments: { melody: 'vibraphone', pad: 'warmPad', accomp: 'nylon', bass: 'acousticBass', drums: 'roomKit' },
    humanize: 0.5, swing: 0, reverb: 0.35
  },
  cyberpunk: {
    desc: 'Hard-hitting cyberpunk combat: driving 4-on-the-floor electronic beat, distorted guitar & saw lead over synth bass.',
    tempo: 128, meter: 4, root: 52, scale: 'phrygian', chordMood: 'epic', groove: 'fourOnFloor',
    instruments: { melody: 'overdriveGuitar', counter: 'sawLead', pad: 'polysynth', accomp: 'synthStrings', bass: 'synthBass', drums: 'electronicKit' },
    humanize: 0.1, swing: 0, reverb: 0.32
  },
  tavern: {
    desc: 'Lively medieval tavern waltz (3/4): accordion & fiddle melody over nylon guitar chords and light percussion.',
    tempo: 120, meter: 3, root: 62, scale: 'major', chordMood: 'bright', groove: 'waltz',
    instruments: { melody: 'accordion', counter: 'fiddle', pad: 'strings', accomp: 'nylon', bass: 'acousticBass', drums: 'standardKit' },
    humanize: 0.55, swing: 0, reverb: 0.4
  },
  noir: {
    desc: 'Rainy detective noir jazz: electric piano & vibraphone over upright walking bass and dusty boom-bap groove.',
    tempo: 78, meter: 4, root: 55, scale: 'blues', chordMood: 'chill', groove: 'boombap',
    instruments: { melody: 'epiano', counter: 'vibraphone', pad: 'warmPad', accomp: 'jazzGuitar', bass: 'acousticBass', drums: 'roomKit' },
    humanize: 0.75, swing: 0.14, reverb: 0.44
  },
  ambientSpace: {
    desc: 'Floating sci-fi space ambience: lush choir/warm pads, celesta & harp sparkles, drumless minimalist drift.',
    tempo: 68, meter: 4, root: 57, scale: 'penta', chordMood: 'warm', groove: 'ambient',
    instruments: { melody: 'celesta', pad: 'warmPad', accomp: 'harp', bass: 'contrabass', drums: null },
    humanize: 0.6, swing: 0, reverb: 0.65
  },
  tropical: {
    desc: 'Bright tropical island adventure: marimba & kalimba melody over steel guitar and bouncy bossa percussion.',
    tempo: 110, meter: 4, root: 60, scale: 'major', chordMood: 'bright', groove: 'bossa',
    instruments: { melody: 'marimba', counter: 'kalimba', pad: 'warmPad', accomp: 'steel', bass: 'fingerBass', drums: 'standardKit' },
    humanize: 0.4, swing: 0, reverb: 0.32
  },
  wuxiaHero: {
    desc: 'Heroic wuxia江湖 theme: koto & flute counter-melody over sweeping strings and heavy war march drums.',
    tempo: 102, meter: 4, root: 50, scale: 'pentaMinor', chordMood: 'epic', groove: 'march',
    instruments: { melody: 'koto', counter: 'flute', pad: 'strings', accomp: 'harp', bass: 'cello', drums: 'powerKit' },
    humanize: 0.45, swing: 0, reverb: 0.48
  },
  vlogChill: {
    desc: 'Healing daily Vlog / cafe / lifestyle BGM: warm nylon guitar, soft piano and gentle shaker groove that never clashes with voiceover.',
    tempo: 88, meter: 4, root: 60, scale: 'penta', chordMood: 'warm', groove: 'boombap',
    instruments: { melody: 'piano', pad: 'warmPad', accomp: 'nylon', bass: 'acousticBass', drums: 'roomKit' },
    humanize: 0.65, swing: 0.08, reverb: 0.35
  },
  techReview: {
    desc: 'Clean modern tech review / AI product demo / promo video BGM: crisp FM electric piano, synth pulse and tight electronic beat.',
    tempo: 116, meter: 4, root: 57, scale: 'major', chordMood: 'warm', groove: 'fourOnFloor',
    instruments: { melody: 'fmEpiano', pad: 'polysynth', accomp: 'cleanGuitar', bass: 'synthBass', drums: 'electronicKit' },
    humanize: 0.15, swing: 0, reverb: 0.28
  },
  funnyMeme: {
    desc: 'Playful comedy / pet / plot-twist short video BGM: bouncy pizzicato strings, marimba and quirky light percussion.',
    tempo: 124, meter: 4, root: 60, scale: 'major', chordMood: 'bright', groove: 'bossa',
    instruments: { melody: 'marimba', counter: 'pizzicato', pad: null, accomp: 'pizzicato', bass: 'acousticBass', drums: 'standardKit' },
    humanize: 0.4, swing: 0.12, reverb: 0.2
  },
  suspenseTalk: {
    desc: 'Mystery storytelling / voiceover bed: sparse cello & piano notes with tense low pulse, leaving room for spoken narration.',
    tempo: 74, meter: 4, root: 50, scale: 'phrygian', chordMood: 'dark', groove: 'march',
    instruments: { melody: 'piano', pad: 'choirPad', accomp: 'pizzicato', bass: 'contrabass', drums: 'roomKit' },
    humanize: 0.4, swing: 0, reverb: 0.52
  },
  casualPuzzle: {
    desc: 'Bright casual mobile game / match-3 / farming lobby loop: cheerful marimba & steel guitar over bouncy drums.',
    tempo: 112, meter: 4, root: 60, scale: 'major', chordMood: 'bright', groove: 'bossa',
    instruments: { melody: 'marimba', pad: 'warmPad', accomp: 'steel', bass: 'fingerBass', drums: 'standardKit' },
    humanize: 0.35, swing: 0, reverb: 0.28
  },
  gachaLobby: {
    desc: 'Energetic anime / gacha shop & lobby BGM: bright electric piano & vibraphone over modern 808 groove.',
    tempo: 122, meter: 4, root: 60, scale: 'major', chordMood: 'jazzy', groove: 'trap',
    instruments: { melody: 'vibraphone', counter: 'epiano', pad: 'warmPad', accomp: 'epiano', bass: 'synthBass', drums: 'kit808' },
    humanize: 0.3, swing: 0, reverb: 0.34
  }
};

const RANDOM_DESC = 'Surprise blind-box style: deterministically combines a random groove, scale, chord mood, tempo and instrument ensemble from the seed.';

function rng(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RHYTHM_CELLS = {
  4: {
    bossa: [[1.5, 1.5, 1], [0.5, 1, 1.5, 1], [1, 1.5, 1.5], [2, 1, 1], [3, 1]],
    trap: [[1.5, 2.5], [1, 1, 2], [2, 2], [0.5, 1.5, 2]],
    march: [[2, 2], [1, 1, 2], [3, 1], [4]],
    default: [[1, 1, 2], [2, 1, 1], [1.5, 0.5, 2], [0.5, 0.5, 1, 2], [2, 2]]
  },
  3: {
    default: [[1, 1, 1], [2, 1], [1.5, 0.5, 1], [1, 2], [3]]
  }
};

function degToMidi(root, scaleArr, deg) {
  const oct = Math.floor(deg / scaleArr.length);
  const idx = ((deg % scaleArr.length) + scaleArr.length) % scaleArr.length;
  return root + 12 + oct * 12 + scaleArr[idx];
}

function nearestChordMidi(targetMidi, root, chordIntervals) {
  const pcs = new Set(chordIntervals.map(iv => ((root + iv) % 12 + 12) % 12));
  for (let d = 0; d <= 6; d++) {
    if (pcs.has(((targetMidi + d) % 12 + 12) % 12)) return targetMidi + d;
    if (pcs.has(((targetMidi - d) % 12 + 12) % 12)) return targetMidi - d;
  }
  return targetMidi;
}

/* 生成 4 小节乐句：前 2 小节“问句动机” + 后 2 小节“回应”，强拍吸附和弦音，句末落到终止音并留气口 */
function makePhrase4(r, prog, root, scaleArr, meter, groove, fullCadence) {
  const bank = (RHYTHM_CELLS[meter] && (RHYTHM_CELLS[meter][groove] || RHYTHM_CELLS[meter].default)) || RHYTHM_CELLS[4].default;
  const pickCell = () => bank[Math.floor(r() * bank.length)];

  // 1. 问句动机 (Bars 0-1)
  const call = [];
  let deg = Math.floor(r() * 3) + 1;
  for (let b = 0; b < 2; b++) {
    const cell = pickCell();
    let pos = 0;
    const chord = prog[b % prog.length];
    cell.forEach((dur, idx) => {
      if (!(b === 0 && idx === 0)) {
        const step = r() < 0.72 ? (r() < 0.5 ? 1 : -1) : (r() < 0.5 ? 2 : -2);
        deg = Math.max(-2, Math.min(scaleArr.length * 2 - 2, deg + step));
      }
      let midi = degToMidi(root, scaleArr, deg);
      // 强拍（第1/3拍）或长音吸附到当前和弦音，避免“乱吹跑调”
      if (pos % 2 === 0 || dur >= 1.5) {
        midi = nearestChordMidi(midi, root, chord);
      }
      call.push({ bar: b, beat: pos, dur, midi, deg });
      pos += dur;
    });
  }

  // 2. 回应乐句 (Bars 2-3)：复用问句节奏，顺应后两小节和弦，第 4 小节落终止音并留呼吸
  const response = [];
  const shift = r() < 0.5 ? 1 : -1;
  call.forEach((n, i) => {
    const b = n.bar + 2;
    const chord = prog[b % prog.length];
    const isLast = i === call.length - 1;
    let midi = degToMidi(root, scaleArr, n.deg + (n.bar === 0 ? shift : 0));
    if (n.beat % 2 === 0 || n.dur >= 1.5) midi = nearestChordMidi(midi, root, chord);
    let dur = n.dur;
    if (isLast) {
      // 终止音：半终止落和弦五音/三音，全终止落主音，留出句末换气空间
      const targetIv = fullCadence ? chord[0] : (chord[1] || chord[0] + 7);
      const baseRoot = root + 12 + (targetIv % 12);
      midi = baseRoot;
      dur = Math.max(0.75, Math.min(dur, meter - n.beat - 0.5));
    }
    response.push({ bar: b, beat: n.beat, dur, midi });
  });

  return call.map(n => ({ bar: n.bar, beat: n.beat, dur: n.dur, midi: n.midi })).concat(response);
}

async function composeBand(styleId, opt) {
  opt = opt || {};
  const seed = opt.seed == null ? Math.floor(Math.random() * 1e9) : opt.seed;
  const r = rng(seed);
  const pick = arr => arr[Math.floor(r() * arr.length)];

  let base = STYLES[styleId] || STYLES.lofi;
  if (styleId === 'random' || opt.random) {
    const g = pick(GROOVES);
    const isMajor = r() < 0.5;
    const sc = isMajor ? pick(['major', 'penta']) : pick(['minor', 'pentaMinor', 'dorian', 'blues', 'phrygian']);
    const cm = isMajor ? pick(['bright', 'warm', 'jazzy']) : pick(['chill', 'epic', 'dark']);
    const melPool = ['koto', 'vibraphone', 'marimba', 'epiano', 'piano', 'flute', 'sawLead', 'accordion', 'cleanGuitar', 'cello', 'celesta'];
    const accPool = ['nylon', 'harp', 'epiano', 'steel', 'organ', 'jazzGuitar', 'fmEpiano'];
    const padPool = ['warmPad', 'strings', 'polysynth', 'choirPad', 'slowStrings'];
    const bassPool = ['acousticBass', 'fingerBass', 'slapBass', 'synthBass', 'cello'];
    const drumPool = ['roomKit', 'standardKit', 'kit808', 'electronicKit', 'powerKit'];
    base = {
      tempo: g === 'ambient' ? 72 : g === 'trap' ? 132 : 84 + Math.floor(r() * 44),
      meter: g === 'waltz' ? 3 : 4,
      root: 50 + Math.floor(r() * 14),
      scale: sc,
      chordMood: cm,
      groove: g,
      instruments: {
        melody: pick(melPool),
        counter: r() < 0.45 ? pick(['flute', 'vibraphone', 'kalimba', 'strings']) : null,
        pad: pick(padPool),
        accomp: pick(accPool),
        bass: pick(bassPool),
        drums: g === 'ambient' ? null : pick(drumPool)
      },
      humanize: 0.45,
      swing: g === 'boombap' ? 0.14 : 0,
      reverb: 0.4
    };
  }
  const groove = opt.groove && GROOVES.includes(opt.groove) ? opt.groove : base.groove;
  const meter = opt.meter || (groove === 'waltz' ? 3 : base.meter || 4);
  const scaleName = opt.scale && SCALES[opt.scale] ? opt.scale : base.scale;
  const scaleArr = Array.isArray(opt.scale) ? opt.scale : (SCALES[scaleName] || SCALES.minor);
  const progs = CHORD_POOLS[opt.chordMood] || CHORD_POOLS[base.chordMood] || CHORD_POOLS.chill;
  const customProg = parseChordProg(opt.chords, opt.root != null ? opt.root : base.root);
  const root = opt.root != null ? opt.root : base.root;
  const tempo = opt.tempo || base.tempo;
  const reverb = opt.reverb != null ? opt.reverb : base.reverb;
  const swing = opt.swing != null ? opt.swing : base.swing;
  const humanize = opt.humanize != null ? opt.humanize : base.humanize;
  const structure = Array.isArray(opt.structure) && opt.structure.length
    ? opt.structure
    : (opt.hookOnly ? ['B', 'C'] : (
      (groove === 'trap' || groove === 'fourOnFloor' || styleId === 'funnyMeme' || styleId === 'gachaLobby')
        ? ['A', 'breakdown', 'C', 'A2']
        : ['intro', 'A', 'B', 'A2']
    ));
  const ARCS = ['steady', 'build', 'drop', 'wave'];
  const arc = (opt.arc && ARCS.includes(opt.arc)) ? opt.arc : (base.arc || (
    (groove === 'boombap' || groove === 'ambient' || styleId === 'casualPuzzle' || styleId === 'vlogChill') ? 'steady'
      : (groove === 'trap' || groove === 'fourOnFloor' || styleId === 'funnyMeme' || styleId === 'gachaLobby') ? 'drop'
      : (groove === 'waltz' || groove === 'bossa') ? 'wave'
      : 'build'
  ));
  const customIntensity = Array.isArray(opt.intensity) && opt.intensity.length ? opt.intensity : null;
  const bars = opt.bars || structure.length * 4;

  const beat = 60 / tempo;
  const inst = Object.assign({}, base.instruments, opt.instruments || {});
  const jit = () => (r() - 0.5) * 0.025 * humanize;
  const sw = b => (swing && Math.abs((b % 1) - 0.5) < 0.05) ? swing * beat : 0;

  const progA = customProg || progs[0];
  const progB = customProg || progs[1];
  let phraseA1 = null, phraseA2 = null, phraseB = null;
  if (opt.neural !== false) {
    try {
      phraseA1 = await neural.sampleNeuralPhrase4(progA, root, scaleArr, meter, 0.85);
      phraseA2 = await neural.sampleNeuralPhrase4(progA, root, scaleArr, meter, 0.9);
      phraseB = await neural.sampleNeuralPhrase4(progB, root, scaleArr, meter, 0.95);
    } catch (_) {
      phraseA1 = null;
    }
  }
  if (!phraseA1 || !phraseA1.length) phraseA1 = makePhrase4(r, progA, root, scaleArr, meter, groove, false);
  if (!phraseA2 || !phraseA2.length) phraseA2 = makePhrase4(r, progA, root, scaleArr, meter, groove, true);
  if (!phraseB || !phraseB.length) phraseB = makePhrase4(r, progB, root, scaleArr, meter, groove, false);

  const padNotes = [], accompNotes = [], melodyNotes = [], counterNotes = [], bassNotes = [], drumNotes = [];
  let prevVoicing = null;
  const eucPerc = euclid(groove === 'bossa' ? 5 : 3, meter * 4);

  for (let bar = 0; bar < bars; bar++) {
    const secIdx = Math.min(structure.length - 1, Math.floor(bar / 4));
    const secName = structure[secIdx];
    const prog = (secName === 'B' || secName === 'C') ? progB : progA;
    const chord = prog[bar % prog.length];
    const nextChord = prog[(bar + 1) % prog.length];
    const voicedChord = voiceLeadChord(prevVoicing, root, chord);
    prevVoicing = voicedChord;
    const tBar = bar * meter * beat;
    const secEnergy = customIntensity
      ? Math.max(0.2, Math.min(1.0, Number(customIntensity[secIdx % customIntensity.length]) || 0.8))
      : arc === 'steady'
        ? (secName === 'breakdown' ? 0.72 : secName === 'B' || secName === 'C' ? 0.86 : 0.80)
        : arc === 'drop'
          ? (secName === 'breakdown' ? 0.72 : secName === 'C' ? 0.94 : 0.86)
          : arc === 'wave'
            ? (secName === 'intro' ? 0.76 : secName === 'B' ? 0.90 : 0.82)
            : (secName === 'intro' ? 0.66 : secName === 'breakdown' ? 0.64 : secName === 'outro' ? 0.66 : secName === 'B' || secName === 'C' ? 0.94 : 0.82);
    const phraseArch = arc === 'steady' ? 0.92 + 0.08 * Math.sin(Math.PI * ((bar % 4) + 0.5) / 4) : 0.84 + 0.16 * Math.sin(Math.PI * ((bar % 4) + 0.5) / 4);
    const energy = secEnergy * phraseArch;
    const isFill = (bar % 4 === 3);
    const hasDrums = inst.drums && secName !== 'breakdown' && secName !== 'outro' && (arc !== 'build' || secName !== 'intro' || bar >= 2);
    const hasBass = inst.bass && secName !== 'breakdown' && (arc !== 'build' || secName !== 'intro' || bar >= 2);

    // 1. Pad (使用 Voice-Leading 平稳转位和弦)
    voicedChord.forEach(m => padNotes.push({
      time: tBar, dur: (meter - 0.1) * beat, midi: m, vel: 0.42 * energy
    }));

    // 2. Accompaniment by groove (沿用平滑转位和弦)
    if (groove === 'waltz') {
      [0, 1, 2].forEach((s, idx) => accompNotes.push({
        time: tBar + s * beat + jit(), dur: 0.85 * beat, midi: voicedChord[idx % voicedChord.length] + 12, vel: (idx === 0 ? 0.72 : 0.52) * energy
      }));
    } else if (groove === 'fourOnFloor') {
      for (let s = 0; s < 8; s++) accompNotes.push({
        time: tBar + s * 0.5 * beat, dur: 0.38 * beat, midi: voicedChord[s % voicedChord.length] + 12, vel: (s % 2 === 0 ? 0.68 : 0.48) * energy
      });
    } else if (groove === 'bossa') {
      [0, 0.75, 1.5, 2.5, 3.25].forEach((off, idx) => voicedChord.forEach((m, k) => accompNotes.push({
        time: tBar + off * beat + k * 0.012 + jit(), dur: 0.6 * beat, midi: m + 12, vel: (idx === 0 ? 0.64 : 0.48) * energy
      })));
    } else if (groove === 'trap') {
      [0, 0.5, 1.5, 2.5].forEach((off, idx) => accompNotes.push({
        time: tBar + off * beat + jit(), dur: 1.1 * beat, midi: voicedChord[idx % voicedChord.length] + 12, vel: (idx === 0 ? 0.74 : 0.52) * energy
      }));
    } else if (groove === 'march' || groove === 'ambient') {
      voicedChord.forEach(m => accompNotes.push({
        time: tBar, dur: (meter - 0.3) * beat, midi: m, vel: 0.52 * energy
      }));
    } else {
      [0, 1.75].forEach(off => voicedChord.forEach((m, k) => accompNotes.push({
        time: tBar + off * beat + k * 0.022 + jit(), dur: 1.6 * beat, midi: m + 12, vel: 0.58 * energy
      })));
    }

    // 3. Bass by groove (含 Walking Bass 行走贝斯平滑过渡到下一小节根音)
    const bassRoot = root - 12 + chord[0];
    const nextBassRoot = root - 12 + nextChord[0];
    const approach = nextBassRoot > bassRoot ? nextBassRoot - 1 : nextBassRoot + 1;
    if (!hasBass) {
      // Intro 前两小节留白
    } else if (groove === 'trap') {
      [[0, 1.5], [1.75, 0.75], [2.5, 1.2]].forEach(([bPos, dur], idx) => bassNotes.push({
        time: tBar + bPos * beat, dur: dur * beat, midi: bassRoot + (idx === 1 ? 12 : 0), vel: 0.92 * energy
      }));
    } else if (groove === 'fourOnFloor') {
      for (let s = 0; s < 8; s++) bassNotes.push({
        time: tBar + s * 0.5 * beat, dur: 0.42 * beat, midi: bassRoot + (s % 2 ? 12 : 0), vel: (s % 2 === 0 ? 0.88 : 0.72) * energy
      });
    } else if (groove === 'bossa') {
      [[0, 1.4, bassRoot], [1.5, 0.45, bassRoot + 7], [2, 1.4, bassRoot + 7], [3.5, 0.45, approach]].forEach(([bPos, dur, m]) => bassNotes.push({
        time: tBar + bPos * beat + jit(), dur: dur * beat, midi: m, vel: 0.82 * energy
      }));
    } else if (groove === 'waltz' || groove === 'ambient') {
      bassNotes.push({ time: tBar, dur: (meter - 0.4) * beat, midi: bassRoot, vel: 0.8 * energy });
    } else if (groove === 'march') {
      [0, 2].forEach(bPos => bassNotes.push({ time: tBar + bPos * beat, dur: 1.7 * beat, midi: bassRoot, vel: 0.88 * energy }));
    } else {
      [[0, 1.2, bassRoot], [1.5, 0.8, bassRoot + 7], [2.75, 0.9, approach]].forEach(([bPos, dur, m]) => bassNotes.push({
        time: tBar + bPos * beat + jit(), dur: dur * beat, midi: m, vel: 0.82 * energy
      }));
    }

    // 4. Drums by groove
    if (!hasDrums) {
      // Intro 前两小节留白
    } else if (groove === 'trap') {
      [0, 1.75, 2.5].forEach(p => drumNotes.push({ time: tBar + p * beat, dur: 0.2, midi: 36, vel: 0.95 * energy }));
      drumNotes.push({ time: tBar + 2 * beat, dur: 0.2, midi: 39, vel: 0.92 * energy });
      drumNotes.push({ time: tBar + 2 * beat, dur: 0.18, midi: 38, vel: 0.7 * energy });
      for (let h = 0; h < 8; h++) drumNotes.push({ time: tBar + h * 0.5 * beat, dur: 0.08, midi: 42, vel: (h % 2 === 0 ? 0.58 : 0.4) * energy });
      if (bar % 2 === 1) [3.25, 3.375, 3.5, 3.625, 3.75, 3.875].forEach((p, ri) => drumNotes.push({ time: tBar + p * beat, dur: 0.06, midi: 42, vel: (0.45 + ri * 0.06) * energy }));
    } else if (groove === 'fourOnFloor') {
      for (let s = 0; s < 4; s++) {
        drumNotes.push({ time: tBar + s * beat, dur: 0.18, midi: 36, vel: 0.94 * energy });
        if (s === 1 || s === 3) drumNotes.push({ time: tBar + s * beat, dur: 0.18, midi: 38, vel: 0.9 * energy });
        drumNotes.push({ time: tBar + (s + 0.5) * beat, dur: 0.12, midi: 46, vel: 0.55 * energy });
      }
    } else if (groove === 'bossa') {
      [0, 1.5, 2, 3.5].forEach(p => drumNotes.push({ time: tBar + p * beat + jit(), dur: 0.18, midi: 36, vel: 0.78 * energy }));
      [0, 0.75, 1.5, 2.5, 3.25].forEach(p => drumNotes.push({ time: tBar + p * beat + jit(), dur: 0.1, midi: 37, vel: 0.62 * energy }));
      for (let s = 0; s < 8; s++) drumNotes.push({ time: tBar + s * 0.5 * beat, dur: 0.07, midi: 42, vel: 0.4 * energy });
    } else if (groove === 'waltz') {
      drumNotes.push({ time: tBar, dur: 0.18, midi: 36, vel: 0.78 * energy });
      drumNotes.push({ time: tBar + 1 * beat + jit(), dur: 0.1, midi: 37, vel: 0.52 * energy });
      drumNotes.push({ time: tBar + 2 * beat + jit(), dur: 0.1, midi: 42, vel: 0.48 * energy });
    } else if (groove === 'march') {
      [0, 2].forEach(p => drumNotes.push({ time: tBar + p * beat, dur: 0.25, midi: 36, vel: 0.95 * energy }));
      drumNotes.push({ time: tBar + 3 * beat, dur: 0.15, midi: 38, vel: 0.8 * energy });
      [3.33, 3.66].forEach(p => drumNotes.push({ time: tBar + p * beat, dur: 0.12, midi: 38, vel: 0.68 * energy }));
    } else if (groove === 'ambient') {
      if (bar % 2 === 0) drumNotes.push({ time: tBar, dur: 0.8, midi: 49, vel: 0.42 * energy });
    } else {
      [0, 1.5, 2.75].forEach(p => drumNotes.push({ time: tBar + p * beat + jit(), dur: 0.18, midi: 36, vel: 0.88 * energy }));
      [1, 3].forEach(p => drumNotes.push({ time: tBar + p * beat + 0.015 + jit(), dur: 0.16, midi: 38, vel: 0.76 * energy }));
      for (let s = 0; s < 4; s++) {
        drumNotes.push({ time: tBar + s * beat, dur: 0.08, midi: 42, vel: 0.48 * energy });
        drumNotes.push({ time: tBar + (s + 0.5) * beat + sw(0.5), dur: 0.08, midi: 42, vel: 0.36 * energy });
      }
    }
    // 欧几里得打击乐加花（非 ambient 时叠加轻柔沙锤/木鱼脉冲）
    if (hasDrums && groove !== 'ambient' && groove !== 'march') {
      eucPerc.forEach((hit, step) => {
        if (hit) drumNotes.push({ time: tBar + step * 0.25 * beat + jit(), dur: 0.06, midi: 70, vel: 0.28 * energy });
      });
    }
    if (isFill && groove !== 'waltz' && groove !== 'ambient') {
      const fBase = tBar + (meter - 1) * beat;
      [0, 0.25, 0.5, 0.75].forEach((sub, ti) => drumNotes.push({
        time: fBase + sub * beat, dur: 0.12, midi: [48, 45, 43, 38][ti], vel: (0.7 + ti * 0.07) * energy
      }));
    }
    if (bar % 4 === 0 && bar > 0 && groove !== 'ambient') drumNotes.push({ time: tBar, dur: 0.7, midi: 49, vel: 0.72 * energy });

    // 5. Melody & optional Counter-melody
    if (inst.melody) {
      const phr = secName === 'intro' ? phraseA1 : (secName === 'B' || secName === 'C') ? phraseB : phraseA2;
      const barInPhrase = bar % 4;
      const barNotes = phr.filter(n => n.bar === barInPhrase);
      barNotes.forEach((n, ni) => {
        const shift = (secName === 'A2' || secName === 'C') ? 12 : 0;
        const midiNote = n.midi + shift;
        const tNote = tBar + n.beat * beat + sw(n.beat) + jit();
        const isPhraseEnd = (barInPhrase === 3 && ni === barNotes.length - 1);
        if (groove === 'trap' && ni === 0 && bar % 2 === 0 && inst.melody === 'koto') {
          melodyNotes.push({ time: Math.max(0, tNote - 0.11), dur: 0.07, midi: midiNote - 5, vel: 0.55 * energy });
          melodyNotes.push({ time: Math.max(0, tNote - 0.055), dur: 0.07, midi: midiNote - 2, vel: 0.65 * energy });
        }
        const dyn = 0.78 + 0.22 * Math.sin(Math.PI * ((barInPhrase * meter + n.beat) / (4 * meter)));
        melodyNotes.push({
          time: tNote,
          dur: n.dur * beat * (isPhraseEnd ? 0.82 : 1.02),
          midi: midiNote,
          scoop: n.dur >= 1.0 && ni === 0 && barInPhrase % 2 === 0,
          vel: Math.min(1, (0.76 + (r() - 0.5) * 0.12) * energy * dyn)
        });
      });
    }
    if (inst.counter && (secName === 'B' || secName === 'C' || secName === 'A2')) {
      // 副旋律对位轨：在和弦三音/五音上做长音或稀疏呼应，不与主旋律抢节奏
      counterNotes.push({
        time: tBar + 0.5 * beat + jit(),
        dur: (meter - 1) * beat,
        midi: voicedChord[voicedChord.length > 1 ? 1 : 0] + 12,
        vel: 0.56 * energy
      });
    }
  }

  const LEGATO_INSTS = new Set(['altoSax', 'tenorSax', 'flute', 'oboe', 'clarinet', 'violin', 'viola', 'cello', 'trumpet', 'horn', 'panFlute', 'shakuhachi', 'ocarina', 'fiddle']);
  const tracks = [];
  if (inst.pad) tracks.push({ name: 'pad', instrument: inst.pad, pan: 0, volume: 0.56, reverb, chorus: 0.25, expressive: true, notes: padNotes });
  if (inst.accomp) tracks.push({ name: 'accomp', instrument: inst.accomp, pan: -0.28, volume: 0.7, reverb: reverb * 0.8, notes: accompNotes });
  if (inst.melody) tracks.push({ name: 'melody', instrument: inst.melody, pan: 0.2, volume: 0.9, reverb: reverb * 0.9, expressive: true, legato: LEGATO_INSTS.has(inst.melody), notes: melodyNotes });
  if (inst.counter && counterNotes.length) tracks.push({ name: 'counter', instrument: inst.counter, pan: -0.35, volume: 0.72, reverb: reverb * 0.95, expressive: true, notes: counterNotes });
  if (inst.bass) tracks.push({ name: 'bass', instrument: inst.bass, pan: 0, volume: 0.88, reverb: 0.08, notes: bassNotes });
  if (inst.drums) tracks.push({ name: 'drums', instrument: inst.drums, pan: 0, volume: 0.9, reverb: 0.18, notes: drumNotes });

  return {
    seed,
    bars,
    duration: bars * meter * beat,
    tracks
  };
}

async function renderBand(styleOrOpts, opt) {
  opt = opt || {};
  const tracks = opt.tracks || (Array.isArray(styleOrOpts) ? styleOrOpts : null);
  let plan;
  if (tracks) {
    plan = { seed: opt.seed || 1, bars: opt.bars || 0, duration: opt.duration || null, tracks };
  } else {
    plan = await composeBand(styleOrOpts, opt);
  }
  const rendered = await sf2.renderTracks(plan.tracks, {
    duration: plan.duration,
    tailSeconds: opt.tracks ? 1.5 : 0.05,
    stems: !!opt.stems,
    sampleRate: opt.sampleRate || 44100
  });
  return {
    bytes: rendered.bytes,
    seconds: rendered.seconds,
    sampleRate: rendered.sampleRate,
    seed: plan.seed,
    bars: plan.bars,
    tracks: plan.tracks,
    stems: rendered.stems
  };
}

module.exports = { STYLES, RANDOM_DESC, SCALES, CHORD_POOLS, GROOVES, composeBand, renderBand };
