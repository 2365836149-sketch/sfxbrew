/* ============================================================================
   SFX Brew · 东方配乐引擎 v2（主题、和声、段落、人味）
   ----------------------------------------------------------------------------
   ★ makeMusic(sfx) 是一个自包含函数（和 makeSfx 一样），"导出 JS"时原样塞进用户的游戏。
     它不自己发声，而是把每个音符写成一个 SFX Brew 的 patch，交给 sfx.schedule() 在精确时间播放。
   ★ 一首曲子 = 一份 spec（编曲参数）：调式、主音、速度、段落结构、各声部乐器、每段强度、密度、人味。
     四种情绪（calm / battle / mystery / sad）只是四份预设 spec。以后文字描述 → 小模型输出的也是 spec。
   ★ 作曲：先生成 2 小节动机（主题）→ 动机 + 回应 = 4 小节乐句（第一句半终止、第二句落主音）
     → A 段呈示主题、B 段换音区换节奏换和弦做对比、尾声放慢渐弱。和弦用五声音阶上的三音/四度叠置。
   ★ 人味：微小的时值偏差、乐句内的强弱起伏、句末换气、尾声渐慢。
   ★ 永不重复：每循环一遍，A 段保留主题（同一个种子）但伴奏和装饰换新，B 段换新材料。
   ★ 这个函数里不要写中文注释、不要引用外部变量（会被导出给别人用）。
   ==========================================================================*/
function makeMusic(sfx) {
  'use strict';

  /* Chinese pentatonic modes: same five notes, different tonic. Values are semitones above the tonic. */
  var MODES = { gong: [0, 2, 4, 7, 9], shang: [0, 2, 5, 7, 10], jue: [0, 3, 5, 8, 10], zhi: [0, 2, 5, 7, 9], yu: [0, 3, 5, 7, 10] };
  var PRESETS = {
    calm: { mode: 'gong', root: 50, tempo: 66, structure: ['intro', 'A', 'A', 'B', 'A', 'outro'], intensity: [0.25, 0.4, 0.45, 0.6, 0.45, 0.2],
      melody: 'guqin', melodyB: 'flute', accomp: 'guqin', bass: 'drone', perc: 'none', sparkle: true, density: 0.45, humanize: 0.7, reverb: 0.55 },
    battle: { mode: 'yu', root: 45, tempo: 112, structure: ['intro', 'A', 'A', 'B', 'A'], intensity: [0.6, 0.75, 0.8, 0.95, 0.85],
      melody: 'pipa', melodyB: 'pipa', accomp: 'pipa', bass: 'pulse', perc: 'battle', sparkle: false, density: 0.7, humanize: 0.4, reverb: 0.3 },
    mystery: { mode: 'shang', root: 52, tempo: 56, structure: ['intro', 'A', 'B', 'A', 'outro'], intensity: [0.2, 0.35, 0.45, 0.35, 0.15],
      melody: 'flute', melodyB: 'guqin', accomp: 'pad', bass: 'drone', perc: 'woodfish', sparkle: true, density: 0.3, humanize: 0.8, reverb: 0.65 },
    sad: { mode: 'yu', root: 45, tempo: 58, structure: ['intro', 'A', 'A', 'B', 'A', 'outro'], intensity: [0.25, 0.4, 0.5, 0.65, 0.5, 0.2],
      melody: 'erhu', melodyB: 'erhu', accomp: 'guqin', bass: 'drone', perc: 'none', sparkle: false, density: 0.35, humanize: 0.75, reverb: 0.5 }
  };
  var REGISTER = { guqin: 3, flute: 6, erhu: 4, pipa: 6 };
  var ERHU = [['erhu-d3', 295.4], ['erhu-f5', 697.2]];

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function spec(s) {
    var base = PRESETS[(s && s.preset) || 'calm'] || PRESETS.calm, out = {}, k;
    for (k in base) out[k] = base[k];
    if (s) for (k in s) if (s[k] != null) out[k] = s[k];
    out.seed = (out.seed || 1) | 0;
    return out;
  }
  function midi(sp, d) {
    var sc = MODES[sp.mode] || MODES.gong, o = Math.floor(d / 5), i = ((d % 5) + 5) % 5;
    return sp.root + 12 * o + sc[i];
  }

  /* ---------- instruments: each returns a SFX Brew patch ---------- */
  function L(o) {
    var base = { type: 'tone', wave: 'sine', freq: 440, freqEnd: 440, start: 0, attack: 0.005, hold: 0, decay: 0.3, vol: 0.5,
      filter: 'none', cutoff: 4000, cutoffEnd: 4000, q: 1, vib: 0, vibRate: 6, rep: 1, repGap: 0.1, repStep: 0, scale: 'penta' };
    for (var k in o) base[k] = o[k];
    if (o.freq && o.freqEnd == null) base.freqEnd = o.freq;
    return base;
  }
  function P(layers, gain) { return { layers: layers, reverb: 0, echo: 0, echoTime: 0.2, drive: 0, crush: 0, gain: gain == null ? 0.8 : gain }; }
  var I = {
    guqin: function (f, dur, v, slideFrom) {
      return P([L({ type: 'string', freq: slideFrom ? f * slideFrom : f, freqEnd: f, slideTime: 0.18, bright: 0.38, filter: 'lowpass', cutoff: 3200, cutoffEnd: 1300, attack: 0.001, decay: Math.max(1.2, dur * 1.6), vol: 0.55 * v }),
        L({ type: 'tone', freq: f, attack: 0.01, decay: Math.min(dur * 1.2, 1.4), vol: 0.1 * v })]);
    },
    harmonic: function (f, v) { return P([L({ type: 'bell', freq: f, partials: [[1, 1, 1], [2, 0.12, 0.5], [3, 0.04, 0.3]], attack: 0.003, decay: 2.4, vol: 0.3 * v })]); },
    pipa: function (f, dur, v, trem) {
      var n = trem ? Math.max(2, Math.round(dur / 0.06)) : 1;
      return P([L({ type: 'string', freq: f, bright: 0.85, filter: 'lowpass', cutoff: 6000, cutoffEnd: 3000, attack: 0.001, decay: trem ? 0.3 : Math.max(0.6, dur), vol: (trem ? 0.32 : 0.45) * v, rep: n, repGap: 0.06 })]);
    },
    strum: function (fs, v) {
      return P(fs.map(function (f, i) { return L({ type: 'string', freq: f, bright: 0.8, start: i * 0.018, attack: 0.001, decay: 0.9, vol: 0.22 * v }); }));
    },
    flute: function (f, dur, v) {
      var env = { attack: Math.min(0.15, dur * 0.25), hold: Math.max(0, dur - 0.25), decay: 0.35, vib: 16, vibRate: 5.2 };
      return P([L(Object.assign({ type: 'tone', freq: f, vol: 0.3 * v }, env)),
        L(Object.assign({ type: 'noise', filter: 'bandpass', cutoff: f, cutoffEnd: f, q: 18, vol: 0.2 * v }, env)),
        L(Object.assign({ type: 'tone', wave: 'triangle', freq: f * 2, vol: 0.045 * v }, env))]);
    },
    erhu: function (f, dur, v, slideSemis) {
      var best = ERHU[0];
      for (var i = 0; i < ERHU.length; i++) if (Math.abs(Math.log(f / ERHU[i][1])) < Math.abs(Math.log(f / best[1]))) best = ERHU[i];
      var st = 12 * Math.log2(f / best[1]);
      return P([L({ type: 'sample', sample: best[0], pitch: st - (slideSemis || 0), pitchEnd: st, slideTime: 0.2, offset: 0.25, attack: 0.07, hold: Math.max(0.15, dur - 0.2), decay: 0.4, vol: 0.55 * v })]);
    },
    pad: function (fs, dur, v) {
      return P(fs.map(function (f) { return L({ type: 'tone', wave: 'triangle', freq: f, filter: 'lowpass', cutoff: 1800, cutoffEnd: 1800, attack: Math.min(1.2, dur * 0.4), hold: Math.max(0, dur - 1.2), decay: 1.2, vol: 0.05 * v, vib: 4, vibRate: 0.3 }); }));
    },
    drone: function (f, dur, v) {
      return P([L({ type: 'tone', freq: f, attack: 2, hold: Math.max(0, dur - 3), decay: 2.5, vol: 0.12 * v, trem: 0.15, tremRate: 0.15 }),
        L({ type: 'tone', freq: f * 1.5, attack: 2.5, hold: Math.max(0, dur - 3), decay: 2.5, vol: 0.045 * v })]);
    },
    bass: function (f, dur, v) {
      return P([L({ type: 'string', freq: f, bright: 0.25, attack: 0.001, decay: Math.max(1, dur * 1.5), vol: 0.5 * v }),
        L({ type: 'tone', freq: f, attack: 0.01, decay: dur, vol: 0.15 * v })]);
    },
    chime: function (f, v) { return P([L({ type: 'bell', freq: f, partials: [[1, 1, 1], [1.004, 0.5, 1], [2.756, 0.4, 0.6], [5.404, 0.15, 0.35]], attack: 0.002, decay: 2, vol: 0.08 * v })]); },
    bell: function (f, dur, v) { return P([L({ type: 'bell', freq: f, partials: [[1, 1, 1], [1.005, 0.6, 1], [2, 0.5, 0.7], [2.64, 0.35, 0.5], [3.36, 0.2, 0.35]], attack: 0.004, decay: dur, vol: 0.35 * v })]); },
    woodfish: function (v) { return P([L({ type: 'bell', freq: 640, partials: [[1, 1, 1], [1.58, 0.45, 0.6], [2.42, 0.2, 0.4]], attack: 0.0008, decay: 0.12, vol: 0.4 * v })]); },
    drum: function (name, v, pitch) {
      var len = name === 'drum-edge-loud' ? 3.3 : name === 'drum-rim' ? 1.6 : 2.5;
      return P([L({ type: 'sample', sample: name, pitch: pitch == null ? -2 : pitch, attack: 0.001, hold: len, decay: 0.15, vol: 0.7 * v })]);
    },
    gong: function (v, pitch) { return P([L({ type: 'sample', sample: 'gong-1', pitch: pitch == null ? -3 : pitch, attack: 0.001, hold: 4, decay: 2.5, vol: 0.45 * v })]); }
  };

  /* ---------- harmony: chords are stacked pentatonic steps (root, +2, +3): open, fourth-based, Chinese-sounding ---------- */
  var PROG = {
    A1: [[0, 4, 1, 3], [0, 3, 4, 1], [0, 4, 3, 1]],
    A2: [[0, 4, 3, 0], [0, 1, 3, 0], [4, 1, 3, 0]],
    B1: [[4, 3, 1, 3], [3, 4, 1, 4], [1, 4, 3, 4]],
    B2: [[4, 1, 3, 0], [3, 1, 4, 0], [1, 3, 4, 0]]
  };
  function chordTones(r) { return [r, r + 2, r + 3]; }
  function onChord(d, r) { var m = ((d % 5) + 5) % 5; return chordTones(r).some(function (c) { return ((c % 5) + 5) % 5 === m; }); }
  function nearestChordTone(d, r) { for (var k = 0; k < 4; k++) { if (onChord(d + k, r)) return d + k; if (onChord(d - k, r)) return d - k; } return d; }

  /* ---------- melody: rhythm patterns per bar (beats), chosen by density ---------- */
  var RHYTHMS = {
    sparse: [[4], [3, 1], [2, 2], [2, 1, 1]],
    medium: [[1, 1, 2], [2, 1, 1], [1.5, 0.5, 2], [1, 0.5, 0.5, 2], [2, 2]],
    dense: [[1, 1, 1, 1], [0.5, 0.5, 1, 2], [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 2]]
  };
  function rhythm(r, density) {
    var pool = r() < density ? (r() < density ? RHYTHMS.dense : RHYTHMS.medium) : (r() < 0.5 ? RHYTHMS.medium : RHYTHMS.sparse);
    return pick(r, pool);
  }
  /* A motif: two bars of notes {b: beat offset, d: beats, deg}. */
  function makeMotif(r, sp, chords, base) {
    var notes = [], d = nearestChordTone(base + Math.floor(r() * 3), chords[0]);
    for (var bar = 0; bar < 2; bar++) {
      var rh = bar === 1 && r() < 0.6 ? pick(r, [[1, 1, 2], [2, 2], [1.5, 0.5, 2], [3, 1]]) : rhythm(r, sp.density), b = 0;
      rh.forEach(function (len, i) {
        if (!(bar === 0 && i === 0)) {
          var step = r() < 0.7 ? (r() < 0.5 ? -1 : 1) : (r() < 0.5 ? -2 : 2);
          if (r() < 0.06) step = 0;
          d = clamp(d + step, base - 2, base + 7);
        }
        if (b % 2 === 0 && r() < 0.6) d = nearestChordTone(d, chords[bar]);
        notes.push({ b: bar * 4 + b, d: len, deg: d });
        b += len;
      });
    }
    return notes;
  }
  /* Turn a motif into a 4-bar phrase: motif + answer; the answer reuses the rhythm, follows the chords and lands on the cadence. */
  function makePhrase(r, motif, chords, cadenceDeg) {
    var out = motif.map(function (n) { return { b: n.b, d: n.d, deg: n.deg }; });
    var shift = chords[2] - chords[0];
    motif.forEach(function (n, i) {
      var isLast = i === motif.length - 1, deg = n.deg + (r() < 0.6 ? shift : 0);
      if (n.b >= 4) deg = nearestChordTone(deg, chords[3]);
      if (isLast) deg = cadenceDeg;
      out.push({ b: n.b + 8, d: n.d, deg: deg });
    });
    if (out.length) { var last = out[out.length - 1]; last.d = Math.max(last.d, 16 - last.b); }
    return out;
  }
  /* Cadence target in the melody's register: a full cadence lands on the tonic, a half cadence on the fifth (mode degree 3). */
  function cadence(base, full) {
    var t = full ? Math.ceil((base + 2) / 5) * 5 : Math.floor(base / 5) * 5 + 3;
    if (!full && t < base) t += 5;
    return t;
  }

  /* ---------- compose a whole piece ---------- */
  function compose(input, cycle) {
    var sp = spec(input), beat = 60 / sp.tempo, barLen = 4 * beat;
    cycle = cycle || 0;
    var rTheme = rng(sp.seed), rB = rng(sp.seed * 31 + 7 + cycle * 7919), rArr = rng(sp.seed * 17 + 3 + cycle * 104729), rHum = rng(sp.seed * 13 + cycle * 1299709 + 5);
    var events = [], sections = [], melody = [], chordLog = [], bar = 0;
    var mBase = REGISTER[sp.melody] || 4, bBase = (REGISTER[sp.melodyB || sp.melody] || 4) + 2;
    var progA1 = pick(rTheme, PROG.A1), progA2 = pick(rTheme, PROG.A2);
    var motifA = makeMotif(rTheme, sp, progA1, mBase);
    var phraseA1 = makePhrase(rTheme, motifA, progA1, cadence(mBase, false)), phraseA2 = makePhrase(rTheme, motifA, progA2, cadence(mBase, true));
    /* A hand-written theme (8 bars = 32 beats, notes {b, d, deg}) replaces the generated A phrases. */
    var userA = Array.isArray(sp.themeA) && sp.themeA.length ? sp.themeA : null, userB = Array.isArray(sp.themeB) && sp.themeB.length ? sp.themeB : null;
    var genA = phraseA1.concat(phraseA2.map(function (n) { return { b: n.b + 16, d: n.d, deg: n.deg }; }));
    if (userA) {
      phraseA1 = userA.filter(function (n) { return n.b < 16; });
      phraseA2 = userA.filter(function (n) { return n.b >= 16; }).map(function (n) { return { b: n.b - 16, d: n.d, deg: n.deg }; });
      var firstBars = userA.filter(function (n) { return n.b < 8; });
      if (firstBars.length) motifA = firstBars;
    }
    var progB1 = pick(rB, PROG.B1), progB2 = pick(rB, PROG.B2);
    var motifB = makeMotif(rB, sp, progB1, bBase);
    var phraseB1 = makePhrase(rB, motifB, progB1, cadence(bBase, false)), phraseB2 = makePhrase(rB, motifB, progB2, cadence(mBase + 5, true));
    var genB = phraseB1.concat(phraseB2.map(function (n) { return { b: n.b + 16, d: n.d, deg: n.deg }; }));
    if (userB) {
      phraseB1 = userB.filter(function (n) { return n.b < 16; });
      phraseB2 = userB.filter(function (n) { return n.b >= 16; }).map(function (n) { return { b: n.b - 16, d: n.d, deg: n.deg }; });
    }
    var h = clamp(sp.humanize == null ? 0.6 : sp.humanize, 0, 1);

    function at(b) { return b * beat; }
    function add(t, p) { events.push({ t: Math.max(0, t), p: p }); }
    function jitter() { return (rHum() - 0.5) * 0.035 * h; }

    function playMelody(notes, startBar, inst, I0, ornament, sectionName) {
      var n = notes.length;
      notes.forEach(function (nt, i) {
        var pos = nt.b / 16, arch = 0.82 + 0.18 * Math.sin(Math.PI * pos);
        var v = clamp((0.55 + 0.45 * I0) * arch * (1 + (rHum() - 0.5) * 0.25 * h), 0.2, 1.1);
        var deg = nt.deg + (ornament && rArr() < 0.12 && nt.d < 2 ? (rArr() < 0.5 ? 1 : -1) : 0);
        var f = hz(midi(sp, deg)), t = (startBar * 4 + nt.b) * beat + jitter();
        var next = notes[i + 1], phraseEnd = !next || next.b - nt.b > nt.d || i === n - 1;
        var dur = nt.d * beat * (phraseEnd ? 0.92 : 1);
        melody.push({ bar: startBar + Math.floor(nt.b / 4), beat: nt.b % 4, beats: nt.d, deg: deg, inst: inst, section: sectionName });
        if (inst === 'guqin') add(t, rArr() < 0.12 && nt.d >= 2 && deg >= mBase + 3 ? I.harmonic(f * 2, v) : I.guqin(f, dur, v, nt.d >= 2 && rArr() < 0.3 ? Math.pow(2, -2 / 12) : 0));
        else if (inst === 'flute') add(t, I.flute(f, dur, v));
        else if (inst === 'erhu') add(t, I.erhu(f, dur, v, nt.d >= 1.5 && rArr() < 0.45 ? (rArr() < 0.7 ? 2 : -1) : 0));
        else add(t, I.pipa(f, dur, v, nt.d >= 2));
      });
    }

    function accompany(prog, startBar, bars, I0, last) {
      for (var k = 0; k < bars; k++) {
        var r0 = prog[k % 4], tones = chordTones(r0), b0 = startBar + k, t0 = at(b0 * 4);
        chordLog[b0] = r0;
        var low = tones.map(function (d) { return hz(midi(sp, d - 5)); });
        if (sp.accomp === 'guqin') {
          var pattern = I0 < 0.35 ? [[0, 0], [2, 1]] : I0 < 0.7 ? [[0, 0], [1, 1], [2, 2], [3, 1]] : [[0, 0], [0.5, 1], [1, 2], [1.5, 1], [2, 0], [2.5, 1], [3, 2], [3.5, 1]];
          pattern.forEach(function (pt) { add(t0 + at(pt[0]) + jitter(), I.guqin(low[pt[1]], beat * 1.5, 0.32 + 0.25 * I0)); });
        } else if (sp.accomp === 'pipa') {
          var hits = I0 < 0.6 ? [0, 2] : [0, 1.5, 2, 3];
          hits.forEach(function (bt, i) { add(t0 + at(bt) + jitter(), I.strum(tones.map(function (d) { return hz(midi(sp, d)); }), (i === 0 ? 0.9 : 0.6) * (0.5 + 0.5 * I0))); });
        } else if (sp.accomp === 'pad') {
          add(t0, I.pad(tones.map(function (d) { return hz(midi(sp, d)); }), barLen + 0.8, 0.6 + 0.6 * I0));
        }
        if (sp.bass === 'pulse') {
          [0, 2].forEach(function (bt) { add(t0 + at(bt), I.bass(hz(midi(sp, r0 - 10)), beat * 1.8, 0.6 + 0.4 * I0)); });
        }
        if (sp.perc === 'woodfish' && (I0 > 0.3 || k % 2 === 0)) add(t0 + jitter(), I.woodfish(0.5 + 0.4 * I0));
        if (sp.perc === 'drum') {
          add(t0, I.drum('drum-center-soft', 0.4 + 0.5 * I0, -3));
          if (I0 > 0.55) add(t0 + at(2), I.drum('drum-center-soft', 0.3 + 0.4 * I0, -3));
        }
        if (sp.perc === 'battle') {
          var fill = last && k === bars - 1;
          [[0, 'drum-center-loud', 1], [1.5, 'drum-center-soft', 0.7], [2, 'drum-edge-loud', 0.9], [3, 'drum-center-soft', 0.75], [3.5, 'drum-center-soft', 0.6]].forEach(function (x) {
            if (fill && x[0] >= 2) return;
            add(t0 + at(x[0]) + jitter() * 0.5, I.drum(x[1], x[2] * (0.55 + 0.45 * I0), -2));
          });
          if (fill) for (var q = 0; q < 4; q++) add(t0 + at(2 + q * 0.5), I.drum('drum-center-loud', 0.5 + q * 0.15, -1));
        }
        if (sp.sparkle && rArr() < 0.18 * (1 - I0 * 0.5)) add(t0 + at(Math.floor(rArr() * 4)), I.chime(hz(midi(sp, 13 + Math.floor(rArr() * 4))), 1));
      }
    }

    sp.structure.forEach(function (name, si) {
      var I0 = clamp(sp.intensity[si] == null ? 0.5 : sp.intensity[si], 0, 1), start = bar, bars;
      var isLast = si === sp.structure.length - 1;
      if (name === 'intro') {
        bars = 4;
        accompany(progA2, bar, bars, I0, false);
        if (sp.bass === 'drone') add(at(bar * 4), I.drone(hz(midi(sp, -5)), bars * barLen + 2, 0.9));
        if (rArr() < 0.6) playMelody(motifA.filter(function (n) { return n.b < 4; }).map(function (n) { return { b: n.b + 8, d: n.d, deg: n.deg }; }), bar, sp.melodyB || sp.melody, I0 * 0.7, false, name);
      } else if (name === 'A') {
        bars = 8;
        var orn = !userA && sections.some(function (s) { return s.name === 'A'; });
        playMelody(phraseA1, bar, sp.melody, I0, orn, name);
        playMelody(phraseA2, bar + 4, sp.melody, I0, orn, name);
        accompany(progA1, bar, 4, I0, false); accompany(progA2, bar + 4, 4, I0, isLast);
        if (sp.bass === 'drone') add(at(bar * 4), I.drone(hz(midi(sp, -5)), bars * barLen + 2, 0.8 + 0.2 * I0));
      } else if (name === 'B') {
        bars = 8;
        playMelody(phraseB1, bar, sp.melodyB || sp.melody, I0, false, name);
        playMelody(phraseB2, bar + 4, sp.melodyB || sp.melody, I0, false, name);
        accompany(progB1, bar, 4, I0, false); accompany(progB2, bar + 4, 4, I0, isLast);
        if (sp.bass === 'drone') add(at(bar * 4), I.drone(hz(midi(sp, -2)), bars * barLen + 2, 0.8));
      } else {
        bars = 4;
        var aug = motifA.map(function (n) { return { b: n.b * 2, d: n.d * 2, deg: n.deg }; });
        if (aug.length) {
          aug[aug.length - 1].deg = cadence(mBase, true);
          aug[aug.length - 1].d = Math.max(aug[aug.length - 1].d, 16 - aug[aug.length - 1].b);
        }
        playMelody(aug, bar, sp.melody, I0, false, name);
        accompany(progA2, bar, bars, I0 * 0.7, false);
        if (sp.bass === 'drone') add(at(bar * 4), I.drone(hz(midi(sp, -5)), bars * barLen + 3, 0.7));
        if (sp.sparkle) add(at((bar + bars - 1) * 4), I.chime(hz(midi(sp, 15)), 1));
      }
      if ((sp.perc === 'battle' || I0 > 0.85) && name !== 'outro') add(at(start * 4), I.gong(0.5 + 0.4 * I0, -3));
      sections.push({ name: name, startBar: start, bars: bars, intensity: I0 });
      bar += bars;
    });

    /* ritardando: the last two bars stretch up to 8 % when the piece ends with an outro */
    var totalBeats = bar * 4, end = totalBeats * beat;
    if (sp.structure[sp.structure.length - 1] === 'outro') {
      var rStart = (bar - 2) * 4 * beat;
      events.forEach(function (e) { if (e.t > rStart) { var x = (e.t - rStart) / (end - rStart); e.t = rStart + (e.t - rStart) * (1 + 0.08 * x); } });
      end = rStart + (end - rStart) * 1.08;
    }
    events.sort(function (a, b) { return a.t - b.t; });
    return { spec: sp, events: events, duration: end, bars: bar, sections: sections, melody: melody, beat: beat,
      themeA: genA, themeB: genB, registerA: mBase, registerB: bBase, chords: chordLog };
  }

  /* ---------- shared bus: one reverb + gentle compressor for every note ---------- */
  function bus(c, reverb, volume) {
    var input = c.createGain(), out = c.createGain();
    out.gain.value = volume == null ? 0.8 : volume;
    var len = Math.floor(c.sampleRate * 3), ir = c.createBuffer(2, len, c.sampleRate), r = rng(11), ch, i;
    for (ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
    var cv = c.createConvolver(), wet = c.createGain(), comp = c.createDynamicsCompressor();
    cv.buffer = ir; wet.gain.value = reverb == null ? 0.45 : reverb;
    comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.3;
    input.connect(comp); input.connect(cv); cv.connect(wet); wet.connect(comp);
    comp.connect(out);
    return { input: input, out: out };
  }
  function samplesOf(events) {
    var names = [];
    events.forEach(function (e) { e.p.layers.forEach(function (l) { if (l.type === 'sample' && names.indexOf(l.sample) < 0) names.push(l.sample); }); });
    return names;
  }
  function preload(c, names) {
    return sfx.load(c, { layers: names.map(function (n) { return { type: 'sample', sample: n }; }) });
  }

  /* ---------- live, never-repeating playback ---------- */
  var live = null;
  function start(input, opts) {
    stop();
    var c = sfx.context();
    if (!c) return Promise.resolve();
    if (c.state === 'suspended') c.resume();
    var sp = spec(typeof input === 'string' ? { preset: input } : input);
    if (opts) for (var k in opts) if (opts[k] != null && k !== 'volume') sp[k] = opts[k];
    var b = bus(c, sp.reverb, opts && opts.volume);
    b.out.connect(c.destination);
    var me = { sp: sp, bus: b, cycle: 0, piece: compose(sp, 0), idx: 0, t0: 0, timer: null };
    live = me;
    var next = compose(sp, 1);
    return preload(c, samplesOf(me.piece.events).concat(samplesOf(next.events))).then(function () {
      if (live !== me) return;
      me.t0 = c.currentTime + 0.1;
      var tick = function () {
        if (live !== me) return;
        var horizon = c.currentTime + 1.2;
        while (true) {
          if (me.idx >= me.piece.events.length) {
            me.t0 += me.piece.duration; me.cycle++; me.piece = compose(sp, me.cycle); me.idx = 0;
          }
          var e = me.piece.events[me.idx];
          if (me.t0 + e.t > horizon) break;
          sfx.schedule(c, b.input, e.p, me.t0 + e.t);
          me.idx++;
        }
      };
      tick();
      me.timer = setInterval(tick, 200);
    });
  }
  function stop() {
    if (!live) return;
    var me = live, c = sfx.context();
    live = null;
    clearInterval(me.timer);
    me.bus.out.gain.setTargetAtTime(0, c.currentTime, 0.4);
    setTimeout(function () { try { me.bus.out.disconnect(); } catch (e) { /* already gone */ } }, 3000);
  }

  /* ---------- seamless loop: render one piece + tail, fold the tail onto the start ---------- */
  function renderLoop(input, opts) {
    opts = opts || {};
    var sp = spec(typeof input === 'string' ? { preset: input } : input);
    for (var k in opts) if (opts[k] != null && k !== 'volume' && k !== 'sampleRate') sp[k] = opts[k];
    var piece = compose(sp, 0), tail = 6, sr = opts.sampleRate || 44100;
    var c = sfx.offlineContext(2, Math.ceil((piece.duration + tail) * sr), sr);
    var b = bus(c, sp.reverb, opts.volume == null ? 0.9 : opts.volume);
    b.out.connect(c.destination);
    return preload(c, samplesOf(piece.events)).then(function () {
      piece.events.forEach(function (e) { sfx.schedule(c, b.input, e.p, e.t); });
      return c.startRendering();
    }).then(function (buf) {
      var n = Math.round(piece.duration * sr), chans = [];
      for (var ch = 0; ch < buf.numberOfChannels; ch++) {
        var d = buf.getChannelData(ch), out = new Float32Array(n);
        for (var i = 0; i < n; i++) out[i] = d[i];
        for (var j = n; j < d.length; j++) out[j - n] += d[j];
        chans.push(out);
      }
      return { channels: chans, sampleRate: sr, seconds: piece.duration, bars: piece.bars };
    });
  }

  /* ---------- stingers ---------- */
  var SP0 = { mode: 'gong', root: 50 }, SPY = { mode: 'yu', root: 45 }, SPH = { mode: 'gong', root: 62 };
  var STINGERS = {
    victory: function () {
      var ev = [{ t: 0, p: I.drum('drum-edge-loud', 0.8, -1) }];
      [5, 7, 9, 10, 12].forEach(function (d, i) { ev.push({ t: 0.05 + i * 0.09, p: I.pipa(hz(midi(SP0, d)), 0.3, 0.9, false) }); });
      ev.push({ t: 0.5, p: I.bell(hz(midi(SP0, 15)), 3, 0.8) }, { t: 0.5, p: I.gong(0.5, 3) }, { t: 0.55, p: I.guqin(hz(midi(SP0, 10)), 2, 0.8) });
      return ev;
    },
    defeat: function () {
      var ev = [];
      [9, 7, 5, 3].forEach(function (d, i) { ev.push({ t: i * 0.38, p: I.guqin(hz(midi(SPY, d)), 1.5, 0.7, i === 3 ? Math.pow(2, 2 / 12) : 0) }); });
      ev.push({ t: 1.5, p: I.bell(hz(SPY.root - 12), 5, 0.8) }, { t: 1.2, p: I.erhu(hz(midi(SPY, 5)), 2.4, 0.7, -2) });
      return ev;
    },
    battleStart: function () {
      return [{ t: 0, p: I.drum('drum-center-loud', 0.9, -3) }, { t: 0.55, p: I.drum('drum-center-loud', 0.9, -3) }, { t: 0.95, p: I.drum('drum-edge-loud', 1, -2) }, { t: 1.2, p: I.gong(1, -2) }];
    },
    treasure: function () {
      var ev = [];
      [0, 1, 2, 3, 4, 5, 7].forEach(function (d, i) { ev.push({ t: i * 0.06, p: I.chime(hz(midi(SPH, d + 5)), 1.6) }); });
      ev.push({ t: 0.45, p: I.bell(hz(midi(SPH, 10)), 2.5, 0.7) });
      return ev;
    },
    breakthrough: function () {
      var ev = [{ t: 0, p: I.bell(hz(SP0.root - 12), 5, 0.9) }];
      [0, 2, 4, 5, 7, 9].forEach(function (d, i) { ev.push({ t: 0.3 + i * 0.11, p: I.guqin(hz(midi(SP0, d + 5)), 1.2, 0.7) }); });
      ev.push({ t: 1.05, p: I.flute(hz(midi(SP0, 12)), 2.2, 0.9) });
      return ev;
    }
  };
  function playStinger(name, opts) {
    var c = sfx.context();
    if (!c) return Promise.resolve();
    if (c.state === 'suspended') c.resume();
    var ev = STINGERS[name](), b = bus(c, 0.45, opts && opts.volume);
    b.out.connect(c.destination);
    return preload(c, samplesOf(ev)).then(function () {
      var t0 = c.currentTime + 0.05;
      ev.forEach(function (e) { sfx.schedule(c, b.input, e.p, t0 + e.t); });
    });
  }
  function renderStinger(name, opts) {
    var sr = (opts && opts.sampleRate) || 44100, ev = STINGERS[name]();
    var c = sfx.offlineContext(2, 7 * sr, sr), b = bus(c, 0.45, 0.9);
    b.out.connect(c.destination);
    return preload(c, samplesOf(ev)).then(function () {
      ev.forEach(function (e) { sfx.schedule(c, b.input, e.p, e.t); });
      return c.startRendering();
    }).then(function (buf) {
      var chans = [];
      for (var ch = 0; ch < buf.numberOfChannels; ch++) chans.push(buf.getChannelData(ch));
      return { channels: chans, sampleRate: sr };
    });
  }

  return {
    moods: Object.keys(PRESETS), stingers: Object.keys(STINGERS), modes: Object.keys(MODES),
    preset: function (name) { return spec({ preset: name }); },
    tempo: function (mood) { return (PRESETS[mood] || PRESETS.calm).tempo; },
    compose: compose, instruments: I, midiOf: midi, chordTones: chordTones, modeTable: MODES,
    start: start, stop: stop, playing: function () { return live ? (live.sp.preset || 'custom') : null; },
    renderLoop: renderLoop, playStinger: playStinger, renderStinger: renderStinger
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = makeMusic;
