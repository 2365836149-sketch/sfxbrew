/* ============================================================================
   SFX Brew 音乐工作室 · 智能生成
   ----------------------------------------------------------------------------
   fromMood(情绪)：用 music.js 的 v2 作曲引擎生成主题旋律和每小节和弦，再展开成多条可编辑的轨：
     主奏（A 段）、副奏（B 段）、伴奏（按和弦）、低音、打击乐。
   accompany / bassLine / drumPattern 这几个生成函数阶段 2 的"智能伴奏、鼓手"也直接复用。
   和弦用"级数"记录（五声音阶上的第几个音为根），和弦音 = 根、+2 级、+3 级（三音/四度叠置）。
   ==========================================================================*/
(function (root) {
  'use strict';

  const P = (root.Studio && root.Studio.project) || require('./project.js');

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 五声音阶的第 d 级 → MIDI（d 可以为负或超过 5，表示跨八度） */
  function degMidi(p, d) {
    const sc = P.scaleOf(p), o = Math.floor(d / 5), i = ((d % 5) + 5) % 5;
    return p.root + 12 * o + sc[i];
  }
  const chordDegs = r => [r, r + 2, r + 3];
  /* 和弦轨 → 每小节的根级数（没写和弦的小节沿用上一个） */
  function chordAtBars(p, bars) {
    const out = [];
    let cur = 0;
    const sorted = p.chords.slice().sort((a, b) => a.beat - b.beat);
    for (let b = 0; b < bars; b++) {
      sorted.forEach(c => { if (c.beat <= b * 4) cur = c.degree; });
      out.push(cur);
    }
    return out;
  }

  /* ---------- 伴奏：style = arpeggio 分解和弦 / strum 扫弦 / pad 长音 ---------- */
  function accompany(p, chordsByBar, style, intensityAt, r) {
    const notes = [];
    chordsByBar.forEach((root, bar) => {
      const I0 = intensityAt(bar), tones = chordDegs(root), b0 = bar * 4;
      if (style === 'arpeggio') {
        const pat = I0 < 0.35 ? [[0, 0, 2], [2, 1, 2]] : I0 < 0.7 ? [[0, 0, 1], [1, 1, 1], [2, 2, 1], [3, 1, 1]]
          : [[0, 0, 0.5], [0.5, 1, 0.5], [1, 2, 0.5], [1.5, 1, 0.5], [2, 0, 0.5], [2.5, 1, 0.5], [3, 2, 0.5], [3.5, 1, 0.5]];
        pat.forEach(([t, k, d]) => notes.push({ t: b0 + t, d, p: degMidi(p, tones[k] - 5), v: 0.45 + 0.3 * I0 + (r() - 0.5) * 0.1 }));
      } else if (style === 'strum') {
        const hits = I0 < 0.6 ? [0, 2] : [0, 1.5, 2, 3];
        hits.forEach((t, i) => tones.forEach((dg, j) => notes.push({ t: b0 + t + j * 0.04, d: 1, p: degMidi(p, dg), v: (i === 0 ? 0.85 : 0.6) * (0.5 + 0.5 * I0) })));
      } else {
        tones.forEach(dg => notes.push({ t: b0, d: 4, p: degMidi(p, dg), v: 0.5 + 0.4 * I0 }));
      }
    });
    return notes;
  }
  /* ---------- 低音：drone 持续音（每 4 小节）/ pulse 拨奏（每小节第 1、3 拍） ---------- */
  function bassLine(p, chordsByBar, style, intensityAt) {
    const notes = [];
    chordsByBar.forEach((root, bar) => {
      const I0 = intensityAt(bar);
      if (style === 'drone') { if (bar % 4 === 0) notes.push({ t: bar * 4, d: 16, p: degMidi(p, -10), v: 0.7 + 0.2 * I0 }); }
      else [0, 2].forEach(t => notes.push({ t: bar * 4 + t, d: 1.8, p: degMidi(p, root - 10), v: 0.6 + 0.35 * I0 }));
    });
    return notes;
  }
  /* ---------- 打击乐：kit = battle 战鼓 / drum 轻鼓 / woodfish 木鱼；complexity、loudness 0–1 ---------- */
  function drumPattern(kit, bars, intensityAt, opts, sectionStarts) {
    const notes = [], o = Object.assign({ complexity: 0.5, loudness: 0.6 }, opts || {}), r = rng(o.seed || 7);
    for (let bar = 0; bar < bars; bar++) {
      const I0 = intensityAt(bar), L = (0.45 + 0.55 * o.loudness) * (0.6 + 0.4 * I0), b0 = bar * 4, cx = o.complexity * (0.5 + 0.5 * I0);
      const hit = (t, p, v) => notes.push({ t: b0 + t, d: 0.5, p, v: Math.min(1, v) });
      const fill = (bar + 1) % 4 === 0 && cx > 0.35;
      if (kit === 'battle') {
        hit(0, 36, L);
        if (cx > 0.25) hit(1.5, 35, L * 0.7);
        if (!fill) { hit(2, 38, L * 0.9); if (cx > 0.4) hit(3, 35, L * 0.75); if (cx > 0.6) hit(3.5, 35, L * 0.6); }
        else for (let q = 0; q < 4; q++) hit(2 + q * 0.5, 36, L * (0.55 + q * 0.15));
        if (cx > 0.75 && r() < 0.5) hit(1, 37, L * 0.5);
      } else if (kit === 'drum') {
        hit(0, 35, L * 0.8);
        if (cx > 0.4 || I0 > 0.55) hit(2, 35, L * 0.6);
        if (cx > 0.7) hit(3.5, 37, L * 0.45);
      } else {
        if (cx > 0.2 || bar % 2 === 0) hit(0, 76, L * 0.8);
        if (cx > 0.5) hit(2, 76, L * 0.55);
        if (cx > 0.75) { hit(1, 76, L * 0.4); hit(3, 76, L * 0.4); }
      }
    }
    (sectionStarts || []).forEach(s => { if (s.intensity > 0.7 || kit === 'battle') notes.push({ t: s.bar * 4, d: 4, p: 49, v: 0.55 + 0.4 * s.intensity }); });
    return notes;
  }

  /* 一串绝对时间的音符 → 按段落切成片段（每段一个 region，音符改成相对时间） */
  function toRegions(notes, sections, lengthBeats) {
    const bounds = sections.length ? sections.map(s => ({ start: s.bar * 4, end: (s.bar + s.bars) * 4 })) : [{ start: 0, end: lengthBeats }];
    return bounds.map(b => P.newRegion(b.start, b.end - b.start, notes.filter(n => n.t >= b.start && n.t < b.end).map(n => ({ t: +(n.t - b.start).toFixed(4), d: n.d, p: n.p, v: +n.v.toFixed(2) }))))
      .filter(r => r.notes.length);
  }

  const ACC_STYLE = { guqin: ['arpeggio', 'guqin'], pipa: ['strum', 'pipa'], pad: ['pad', 'pad'] };
  const NAMES = {
    zh: { melody: '主奏', melodyB: '副奏', accomp: '伴奏', bass: '低音', drums: '打击乐', chime: '点缀' },
    en: { melody: 'Lead', melodyB: 'Second lead', accomp: 'Accompaniment', bass: 'Bass', drums: 'Percussion', chime: 'Sparkles' }
  };

  /* ---------- 按情绪生成整首多轨项目 ---------- */
  function fromMood(music, mood, seed, lang) {
    const spec = music.preset(mood);
    spec.seed = seed || 1;
    const piece = music.compose(spec, 0), N = NAMES[lang] || NAMES.zh, r = rng(spec.seed + 99);
    const p = P.newProject();
    Object.assign(p, { title: '', tempo: spec.tempo, root: spec.root, mode: spec.mode, bars: piece.bars });
    p.loop = { on: false, start: 0, end: piece.bars * 4 };
    p.sections = piece.sections.map(s => ({ bar: s.startBar, bars: s.bars, name: s.name, intensity: s.intensity }));
    p.chords = piece.chords.map((d, bar) => (bar === 0 || d !== piece.chords[bar - 1] ? { beat: bar * 4, degree: d } : null)).filter(Boolean);
    const len = piece.bars * 4, secAt = bar => p.sections.find(s => bar >= s.bar && bar < s.bar + s.bars) || { intensity: 0.5 };
    const intensityAt = bar => secAt(bar).intensity;
    const chordsByBar = chordAtBars(p, piece.bars);

    /* 主奏 / 副奏：来自作曲引擎的旋律（B 段归副奏） */
    const toNote = m => ({ t: m.bar * 4 + m.beat, d: m.beats, p: degMidi(p, m.deg), v: 0.75 + 0.2 * intensityAt(m.bar) });
    const lead = piece.melody.filter(m => m.section !== 'B').map(toNote), second = piece.melody.filter(m => m.section === 'B').map(toNote);
    const addTrack = (inst, name, notes, extra) => {
      const t = P.newTrack(inst, name);
      Object.assign(t, extra || {});
      t.regions = toRegions(notes, p.sections, len);
      if (t.regions.length) p.tracks.push(t);
      return t;
    };
    addTrack(spec.melody, N.melody, lead, { volume: 0.85, pan: -0.1, reverb: 0.35 });
    addTrack(spec.melodyB || spec.melody, N.melodyB, second, { volume: 0.8, pan: 0.15, reverb: 0.35 });
    if (spec.accomp && spec.accomp !== 'none') {
      const [style, inst] = ACC_STYLE[spec.accomp] || ACC_STYLE.guqin;
      addTrack(inst, N.accomp, accompany(p, chordsByBar, style, intensityAt, r), { volume: 0.6, pan: 0.25, reverb: 0.4, smart: { style } });
    }
    if (spec.bass && spec.bass !== 'none') addTrack(spec.bass === 'drone' ? 'drone' : 'bass', N.bass, bassLine(p, chordsByBar, spec.bass, intensityAt), { volume: 0.7, reverb: 0.2, smart: { style: spec.bass } });
    if (spec.perc && spec.perc !== 'none') {
      const drummer = { kit: spec.perc, complexity: spec.perc === 'battle' ? 0.7 : 0.4, loudness: spec.perc === 'battle' ? 0.8 : 0.5, seed: spec.seed };
      addTrack('drums', N.drums, drumPattern(spec.perc, piece.bars, intensityAt, drummer, p.sections), { volume: 0.75, reverb: 0.25, drummer });
    }
    if (spec.sparkle) {
      const notes = [];
      for (let bar = 0; bar < piece.bars; bar++) if (r() < 0.18 * (1 - intensityAt(bar) * 0.5)) notes.push({ t: bar * 4 + Math.floor(r() * 4), d: 2, p: degMidi(p, 13 + Math.floor(r() * 4)), v: 0.6 });
      addTrack('chime', N.chime, notes, { volume: 0.5, pan: 0.4, reverb: 0.6 });
    }
    return p;
  }

  const api = { fromMood, accompany, bassLine, drumPattern, chordAtBars, degMidi, chordDegs, toRegions, rng };
  root.Studio = root.Studio || {};
  root.Studio.smart = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
