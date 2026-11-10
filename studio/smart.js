/* ============================================================================
   SFX Brew 音乐工作室 · 智能生成
   ----------------------------------------------------------------------------
   fromMood(情绪)：用 music.js 的 v2 作曲引擎生成主题旋律和每小节和弦，再展开成多条可编辑的轨：
     主奏（A 段）、副奏（B 段）、伴奏（按和弦）、低音、打击乐。
   accompany / bassLine / drumPattern 这几个生成函数阶段 2 的"智能伴奏、鼓手"也直接复用。
   和弦用"级数"记录。project.harmony 决定怎么读：
     penta    五声音阶上的第几个音为根，和弦音 = 根、+2 级、+3 级（三音/四度叠置）——老项目都是这种
     diatonic 七声音阶上的第几级为根，叠成三和弦（旋律仍然是五声的，底下是 i–VI–III–VII 这类进行）
     dark     同 diatonic，但进行是弗里几亚色彩（i 和 ♭II 来回），配都节调的战斗曲
   STYLES 是从《长生劫》配乐里搬来的七套编曲（行旅 / 京城 / 深宫 / 古寺 / 三档战斗）：
     弦乐铺底、大提琴低音、跳弓固定音型、曲式模板都在里面。
   ==========================================================================*/
(function (root) {
  'use strict';

  const P = (root.Studio && root.Studio.project) || require('./project.js');
  const IM = ((root.Studio && root.Studio.instruments) || require('./instruments.js')).MIX;
  const mixOf = id => IM[id] || { pan: 0, reverb: 0.3 };

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
  /* 每个五声调式对应的七声音阶（和 music.js 里的一致） */
  const SCALE7 = { gong: [0, 2, 4, 5, 7, 9, 11], zhi: [0, 2, 4, 5, 7, 9, 10], shang: [0, 2, 3, 5, 7, 8, 10], yu: [0, 2, 3, 5, 7, 8, 10], jue: [0, 1, 3, 5, 7, 8, 10], miyako: [0, 1, 3, 5, 7, 8, 10] };
  const isDiatonic = p => p.harmony === 'diatonic' || p.harmony === 'dark';
  /* 和弦音（MIDI，根音位置，密集排列，根音在主音所在的八度） */
  function chordMidi(p, r) {
    if (!isDiatonic(p)) return chordDegs(r).map(d => degMidi(p, d));
    const s7 = SCALE7[p.mode] || SCALE7.gong;
    return [0, 2, 4].map(k => { const i = r + k; return p.root + s7[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7); });
  }
  /* 和弦性质：'' 大三、'm' 小三、'dim' 减三；五声叠置和弦没有性质 */
  function chordQuality(p, r) {
    if (!isDiatonic(p)) return '';
    const t = chordMidi(p, r), third = t[1] - t[0], fifth = t[2] - t[0];
    return fifth === 6 ? 'dim' : third === 3 ? 'm' : '';
  }
  /* 把一个音移八度，放进 [lo, hi] */
  function foldInto(m, lo, hi) { while (m > hi) m -= 12; while (m < lo) m += 12; return m; }
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
      const I0 = intensityAt(bar), tones = chordMidi(p, root), b0 = bar * 4;
      if (style === 'arpeggio') {
        const pat = I0 < 0.35 ? [[0, 0, 2], [2, 1, 2]] : I0 < 0.7 ? [[0, 0, 1], [1, 1, 1], [2, 2, 1], [3, 1, 1]]
          : [[0, 0, 0.5], [0.5, 1, 0.5], [1, 2, 0.5], [1.5, 1, 0.5], [2, 0, 0.5], [2.5, 1, 0.5], [3, 2, 0.5], [3.5, 1, 0.5]];
        pat.forEach(([t, k, d]) => notes.push({ t: b0 + t, d, p: tones[k] - 12, v: 0.45 + 0.3 * I0 + (r() - 0.5) * 0.1 }));
      } else if (style === 'arp') {
        /* 分解和弦：根、五、十度往上再折回来；热闹时走八分音符 */
        const up = [tones[0] - 12, tones[2] - 12, tones[1], tones[2], tones[0] + 12], step = I0 > 0.6 ? 0.5 : 1, n = Math.round(4 / step);
        for (let a = 0; a < n; a++) {
          const idx = Math.max(0, Math.min(up.length - 1, a < 4 ? a : 8 - a));
          notes.push({ t: b0 + a * step, d: 2, p: up[idx], v: (a === 0 ? 0.62 : 0.45) * (0.6 + 0.5 * I0) + (r() - 0.5) * 0.06 });
        }
      } else if (style === 'strum') {
        const hits = I0 < 0.6 ? [0, 2] : [0, 1.5, 2, 3];
        hits.forEach((t, i) => tones.forEach((m, j) => notes.push({ t: b0 + t + j * 0.04, d: 1, p: m, v: (i === 0 ? 0.85 : 0.6) * (0.5 + 0.5 * I0) })));
      } else {
        tones.forEach(m => notes.push({ t: b0, d: 4, p: m, v: 0.5 + 0.4 * I0 }));
      }
    });
    return notes;
  }
  /* ---------- 低音：drone 持续音（每 4 小节）/ pulse 拨奏（每小节第 1、3 拍）/ cello 大提琴长音（每 2 小节，pedal = 死压主音） ---------- */
  function bassLine(p, chordsByBar, style, intensityAt, pedal) {
    const notes = [], bars = chordsByBar.length;
    chordsByBar.forEach((root, bar) => {
      const I0 = intensityAt(bar);
      if (style === 'drone') { if (bar % 4 === 0) notes.push({ t: bar * 4, d: 16, p: p.root - 24, v: 0.7 + 0.2 * I0 }); }
      else if (style === 'cello') { if (bar % 2 === 0) notes.push({ t: bar * 4, d: Math.min(2, bars - bar) * 4, p: foldInto((pedal ? p.root : chordMidi(p, root)[0]) - 12, 36, 55), v: 0.55 + 0.4 * I0 }); }
      else [0, 2].forEach(t => notes.push({ t: bar * 4 + t, d: 1.8, p: chordMidi(p, root)[0] - 24, v: 0.6 + 0.35 * I0 }));
    });
    return notes;
  }
  /* ---------- 弦乐铺底：每小节一个三和弦，根音给大提琴、三音给中提琴、五音给小提琴；和弦不变就连成一个长音 ---------- */
  function stringBed(p, chordsByBar, intensityAt, level) {
    const notes = [], bars = chordsByBar.length, lv = level === true ? 0.7 : (level || 0.6);
    for (let bar = 0; bar < bars; bar++) {
      if (bar > 0 && chordsByBar[bar] === chordsByBar[bar - 1] && bar % 2 === 1) continue;        /* 已经被上一小节的长音盖住 */
      const hold = bar % 2 === 0 && bar + 1 < bars && chordsByBar[bar + 1] === chordsByBar[bar] ? 8 : 4;
      const t = chordMidi(p, chordsByBar[bar]), v = Math.min(1, lv * (0.5 + 0.5 * intensityAt(bar)) * 1.25);
      notes.push({ t: bar * 4, d: hold, p: foldInto(t[0] - 12, 43, 55), v });
      notes.push({ t: bar * 4, d: hold, p: foldInto(t[1], 53, 65), v: v * 0.9 });
      notes.push({ t: bar * 4, d: hold, p: foldInto(t[2] + 12, 62, 74), v: v * 0.9 });
    }
    return notes;
  }
  /* ---------- 跳弓固定音型：八分音符钉在根音上，跳到五度和八度；grind = 在主音和它上面的半音之间来回锯 ---------- */
  function ostinato(p, chordsByBar, intensityAt, opts) {
    const notes = [], o = opts || {};
    chordsByBar.forEach((root, bar) => {
      const I0 = intensityAt(bar), base = (o.pedal ? p.root : chordMidi(p, root)[0]) - 12;
      const pat = o.grind ? (I0 < 0.6 ? [0, 0, 1, 0, 0, 0, 1, 0] : [0, 0, 1, 0, 0, 1, 0, -1]) : (I0 < 0.6 ? [0, 0, 7, 0, 0, 0, 7, 0] : [0, 0, 7, 0, 0, 7, 12, 7]);
      pat.forEach((st, i) => notes.push({ t: bar * 4 + i * 0.5, d: 0.5, p: foldInto(base, 40, 52) + st, v: Math.min(1, (i % 4 === 0 ? 1 : 0.62) * (0.5 + 0.5 * I0)) }));
    });
    return notes;
  }
  /* ---------- 低弦心跳：每小节「长—短—短」落在根音上 ---------- */
  function pulse(p, chordsByBar, intensityAt) {
    const notes = [];
    chordsByBar.forEach((root, bar) => {
      const I0 = intensityAt(bar), m = foldInto(chordMidi(p, root)[0] - 12, 40, 52);
      [[0, 1], [1.5, 0.55], [2.5, 0.7]].forEach(([t, a]) => notes.push({ t: bar * 4 + t, d: 0.5, p: m, v: Math.min(1, 0.75 * a * (0.6 + 0.5 * I0)) }));
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
    zh: { melody: '主奏', melodyB: '副奏', accomp: '伴奏', bass: '低音', drums: '打击乐', chime: '点缀', strings: '弦乐铺底', cello: '大提琴低音', spic: '低弦跳弓' },
    en: { melody: 'Lead', melodyB: 'Second lead', accomp: 'Accompaniment', bass: 'Bass', drums: 'Percussion', chime: 'Sparkles', strings: 'String bed', cello: 'Cello bass', spic: 'Low strings' }
  };

  /* 从《长生劫》配乐搬来的编曲（原曲里的三拍子在这里改成四拍，工作室的时间线固定 4 拍一小节）。
     每套都有自己的曲式、主奏、伴奏织体：行旅 / 京城 / 深宫 / 古寺是行路的曲子，后三套是战斗的三档。 */
  const STYLES = {
    /* 竹笛领奏、古琴分解和弦，二段换二胡；中段落到只剩弦乐再重新起来 */
    journey: { preset: 'calm', form: 'journey', mode: 'yu', root: 50, tempo: 66, melody: 'flute', melodyB: 'erhu', accomp: 'guqin', texture: 'arp', texture2: 'none', bass: 'cello', strings: 0.55, perc: 'none', sparkle: true, density: 0.42 },
    /* 二胡叙事，开头散板，木鱼像远处打更 */
    capital: { preset: 'sad', form: 'ballad', mode: 'yu', root: 45, tempo: 72, melody: 'erhu', melodyB: 'flute', freeLead: 'erhu', accomp: 'guqin', texture: 'arp', texture2: 'pulse', bass: 'cello', strings: 0.65, perc: 'woodfish', density: 0.36 },
    /* 古琴慢弹，底下大提琴低低地跳，像心跳；拱形曲式，中间推到最高 */
    palace: { preset: 'mystery', form: 'arch', mode: 'shang', root: 48, tempo: 52, melody: 'guqin', melodyB: 'erhu', accomp: 'none', texture: 'pulse', texture2: 'pulse', bass: 'cello', strings: 0.5, perc: 'woodfish', sparkle: false, density: 0.3 },
    /* 竹笛散板起、散板收，五声和声，几乎没有节拍感 */
    temple: { preset: 'mystery', form: 'temple', harmony: 'penta', mode: 'shang', root: 52, tempo: 58, melody: 'flute', melodyB: 'guqin', freeLead: 'flute', accomp: 'none', texture: 'none', bass: 'cello', strings: 0.5, perc: 'woodfish', density: 0.28 },
    /* 都节调旋律配弗里几亚和声，大提琴低音死压主音，低弦在主音和上方半音之间来回锯 */
    skirmish: { preset: 'battle', form: 'battle', mode: 'miyako', harmony: 'dark', dark: true, pedal: true, root: 45, tempo: 106, melody: 'erhu', melodyB: 'pipa', registerB: 3, accomp: 'none', ostinato: 'spic', ostinatoPat: 'grind', strings: 0.65, density: 0.5, reverb: 0.4 },
    /* 更慢更沉，低一个全音 */
    boss: { preset: 'battle', form: 'siege', mode: 'miyako', harmony: 'dark', dark: true, pedal: true, root: 43, tempo: 88, melody: 'erhu', melodyB: 'erhu', accomp: 'none', ostinato: 'spic', ostinatoPat: 'grind', strings: 0.7, density: 0.42, reverb: 0.45 },
    /* 最急，二胡和低音琵琶在高潮里叠起来 */
    final: { preset: 'battle', form: 'siege', mode: 'miyako', harmony: 'dark', dark: true, pedal: true, root: 44, tempo: 120, melody: 'erhu', melodyB: 'pipa', registerB: 3, accomp: 'none', ostinato: 'spic', ostinatoPat: 'grind', strings: 0.7, density: 0.62, reverb: 0.4 }
  };

  /* ---------- 按情绪生成整首多轨项目。mood = music.js 的四种情绪，或者上面 STYLES 里的名字 ---------- */
  function fromMood(music, mood, seed, lang) {
    const input = Object.assign({}, STYLES[mood] || { preset: mood }, { seed: seed || 1 });
    const piece = music.compose(input, 0), spec = piece.spec, N = NAMES[lang] || NAMES.zh, r = rng((seed || 1) + 99);
    const p = P.newProject();
    Object.assign(p, { title: '', tempo: spec.tempo, root: spec.root, mode: P.MODES[spec.mode] ? spec.mode : 'gong', bars: piece.bars });
    /* 和声：引擎默认用七声音阶三和弦（chords7 是七声级数）；harmony = 'penta' 时是五声叠置和弦 */
    p.harmony = piece.chords7 ? (spec.harmony === 'dark' ? 'dark' : 'diatonic') : 'penta';
    const roots = piece.chords7 || piece.chords;
    p.loop = { on: false, start: 0, end: piece.bars * 4 };
    p.sections = piece.sections.map(s => ({ bar: s.startBar, bars: s.bars, name: s.name, intensity: s.intensity }));
    p.chords = [];
    for (let bar = 0, last; bar < piece.bars; bar++) {
      const d = roots[bar] == null ? (last == null ? 0 : last) : roots[bar];
      if (bar === 0 || d !== last) p.chords.push({ beat: bar * 4, degree: d });
      last = d;
    }
    const len = piece.bars * 4, secAt = bar => p.sections.find(s => bar >= s.bar && bar < s.bar + s.bars) || { intensity: 0.5, name: 'A' };
    const intensityAt = bar => secAt(bar).intensity;
    const chordsByBar = chordAtBars(p, piece.bars);
    /* 引子、尾声、散板、间歇这几段只留铺底，节奏层和打击乐停下来（战斗曲只是减半，不停） */
    const battleLike = spec.perc === 'battle' || spec.ostinato === 'spic';
    const quiet = bar => ['intro', 'outro', 'free', 'brk'].includes(secAt(bar).name);
    const rhythmOn = n => battleLike || !quiet(Math.floor(n.t / 4));
    const soften = n => (battleLike && quiet(Math.floor(n.t / 4)) ? Object.assign({}, n, { v: n.v * 0.6 }) : n);

    const addTrack = (inst, name, notes, extra) => {
      const t = P.newTrack(inst, name), m = mixOf(inst);
      Object.assign(t, { pan: m.pan, reverb: m.reverb }, extra || {});
      t.regions = toRegions(notes, p.sections, len);
      if (t.regions.length) p.tracks.push(t);
      return t;
    };
    /* 主奏 / 副奏：作曲引擎的旋律按乐器分轨（主题由主奏乐器呈示，对比段和变奏换别的乐器） */
    const toNote = m => ({ t: m.bar * 4 + m.beat, d: m.beats, p: degMidi(p, m.deg), v: Math.min(1, 0.75 + 0.2 * intensityAt(m.bar)) });
    const byInst = {};
    piece.melody.forEach(m => { const k = m.inst || spec.melody; (byInst[k] = byInst[k] || []).push(toNote(m)); });
    const leadInst = byInst[spec.melody] ? spec.melody : Object.keys(byInst)[0];
    Object.keys(byInst).sort((a, b) => (a === leadInst ? -1 : b === leadInst ? 1 : 0)).forEach((k, i) => {
      addTrack(k, i === 0 ? N.melody : N.melodyB, byInst[k], { volume: i === 0 ? 0.85 : 0.8 });
    });
    /* 伴奏：按织体走（arp 分解和弦 / block 拍点 / pulse 低弦心跳 / none） */
    const tex = spec.texture || 'block';
    if (spec.accomp && spec.accomp !== 'none' && tex !== 'none' && tex !== 'pulse') {
      const [style0, inst] = ACC_STYLE[spec.accomp] || ACC_STYLE.guqin, style = tex === 'arp' && inst === 'guqin' ? 'arp' : style0;
      addTrack(inst, N.accomp, accompany(p, chordsByBar, style, intensityAt, r).filter(rhythmOn), { volume: 0.6, pan: 0.25, smart: { style } });
    }
    /* 弦乐铺底：垫在所有东西下面 */
    if (spec.strings) addTrack('strings', N.strings, stringBed(p, chordsByBar, intensityAt, spec.strings), { volume: 0.7 });
    /* 低音 */
    if (spec.bass === 'cello') addTrack('cello', N.cello, bassLine(p, chordsByBar, 'cello', intensityAt, spec.pedal), { volume: 0.75, smart: { style: 'cello' } });
    else if (spec.bass && spec.bass !== 'none') addTrack(spec.bass === 'drone' ? 'drone' : 'bass', N.bass, bassLine(p, chordsByBar, spec.bass, intensityAt), { volume: 0.7, smart: { style: spec.bass } });
    /* 低弦跳弓：固定音型（战斗）或心跳（深宫） */
    let low = [];
    if (spec.ostinato === 'spic') low = low.concat(ostinato(p, chordsByBar, intensityAt, { grind: spec.ostinatoPat === 'grind', pedal: spec.pedal }).filter(rhythmOn).map(soften));
    if (tex === 'pulse') low = low.concat(pulse(p, chordsByBar, intensityAt).filter(rhythmOn));
    if (low.length) addTrack('spic', N.spic, low.sort((a, b) => a.t - b.t), { volume: 0.7 });
    if (spec.perc && spec.perc !== 'none') {
      const drummer = { kit: spec.perc, complexity: spec.perc === 'battle' ? (spec.dark ? 0.45 : 0.7) : 0.4, loudness: spec.perc === 'battle' ? 0.8 : 0.5, seed: spec.seed };
      addTrack('drums', N.drums, drumPattern(spec.perc, piece.bars, intensityAt, drummer, p.sections).filter(rhythmOn).map(soften), { volume: 0.75, drummer });
    }
    if (spec.sparkle) {
      const notes = [];
      for (let bar = 0; bar < piece.bars; bar++) if (r() < 0.18 * (1 - intensityAt(bar) * 0.5)) notes.push({ t: bar * 4 + Math.floor(r() * 4), d: 2, p: degMidi(p, 13 + Math.floor(r() * 4)), v: 0.6 });
      addTrack('chime', N.chime, notes, { volume: 0.5 });
    }
    return p;
  }

  const api = { fromMood, STYLES, accompany, bassLine, stringBed, ostinato, pulse, drumPattern, chordAtBars, chordMidi, chordQuality, degMidi, chordDegs, toRegions, rng };
  root.Studio = root.Studio || {};
  root.Studio.smart = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
