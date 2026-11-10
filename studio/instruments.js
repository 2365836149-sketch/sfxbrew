/* ============================================================================
   SFX Brew 音乐工作室 · 乐器表
   ----------------------------------------------------------------------------
   把 music.js 的乐器函数包装成统一接口：make(音符) → SFX Brew patch。
     音符 = { p: MIDI 音高, dur: 秒, v: 力度 0–1 }
   kind: 'melodic' 有音高的乐器；'drums' 鼓组，MIDI 音高对应不同的鼓件（DRUM_KIT）。
   ==========================================================================*/
(function (root) {
  'use strict';

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  /* 东方打击乐鼓组：MIDI 音高 → 鼓件。顺序就是鼓网格从上到下的行 */
  const DRUM_KIT = [
    { p: 49, id: 'gong', zh: '锣', en: 'Gong' },
    { p: 81, id: 'chime', zh: '风铃', en: 'Chime' },
    { p: 76, id: 'woodfish', zh: '木鱼', en: 'Wood block' },
    { p: 37, id: 'rim', zh: '鼓框', en: 'Rim' },
    { p: 38, id: 'edge', zh: '鼓边', en: 'Drum edge' },
    { p: 35, id: 'soft', zh: '大鼓轻', en: 'Drum soft' },
    { p: 36, id: 'loud', zh: '大鼓重', en: 'Drum loud' }
  ];

  /* 每种乐器在混音里的默认位置（按乐队座位：小提琴偏左、中提琴居中偏右、大提琴偏右）和默认混响量。
     新建音轨、按情绪生成时用它当起点，之后用户随便改。 */
  const MIX = {
    guqin: { pan: -0.12, reverb: 0.42 }, pipa: { pan: -0.22, reverb: 0.3 }, flute: { pan: 0.14, reverb: 0.5 }, erhu: { pan: 0.06, reverb: 0.42 },
    violin: { pan: -0.32, reverb: 0.5 }, viola: { pan: 0.12, reverb: 0.5 }, cello: { pan: 0.2, reverb: 0.4 }, spic: { pan: 0.12, reverb: 0.22 }, strings: { pan: 0, reverb: 0.5 },
    bass: { pan: 0.05, reverb: 0.2 }, pad: { pan: 0, reverb: 0.6 }, drone: { pan: 0, reverb: 0.5 }, bell: { pan: 0, reverb: 0.6 }, chime: { pan: -0.45, reverb: 0.7 }, drums: { pan: 0, reverb: 0.25 }
  };
  /* 弦乐组录音（VSCO 2 CE，CC0）：每 3–4 个半音一个采样 */
  const STR = {
    vc: ['c2', 'e2', 'g2', 'b2', 'd3', 'f3', 'a3', 'c4'], va: ['c3', 'e3', 'g3', 'b3', 'd4', 'f4', 'a4', 'c5'],
    vn: ['g3', 'b3', 'd4', 'fs4', 'a4', 'c5', 'e5', 'b5'], vcspic: ['e2', 'g2', 'b2', 'd3', 'f3', 'a3', 'c4', 'e4']
  };
  const strNames = sec => STR[sec].map(n => 'str-' + sec + '-' + n);
  /* 弦乐组：按音高分给大提琴 / 中提琴 / 小提琴 */
  const sectionOf = p => (p <= 55 ? 'vc' : p <= 65 ? 'va' : 'vn');
  const SECTION_RANGE = { vc: [43, 55], va: [53, 65], vn: [62, 74] };

  function makeInstruments(music) {
    const I = music.instruments;
    const list = [
      { id: 'guqin', zh: '古琴', en: 'Guqin', kind: 'melodic', range: [36, 84], make: n => I.guqin(hz(n.p), n.dur, n.v) },
      { id: 'pipa', zh: '琵琶', en: 'Pipa', kind: 'melodic', range: [45, 88], make: n => I.pipa(hz(n.p), n.dur, n.v, n.dur >= 1.2) },
      { id: 'flute', zh: '竹笛', en: 'Bamboo flute', kind: 'melodic', range: [60, 96], make: n => I.flute(hz(n.p), n.dur, n.v) },
      { id: 'erhu', zh: '二胡', en: 'Erhu', kind: 'melodic', range: [62, 83], samples: ['erhu-n-d4', 'erhu-n-d4b', 'erhu-n-f4', 'erhu-n-gs4', 'erhu-n-gs4b', 'erhu-n-b4', 'erhu-n-c5', 'erhu-n-d5', 'erhu-n-e5', 'erhu-n-f5', 'erhu-n-gs5', 'erhu-n-b5'], make: n => I.erhu(hz(n.p), n.dur, n.v, 0) },
      /* 西洋弦乐（录音多采样）：单声部的小 / 中 / 大提琴适合写旋律和对位；弦乐组适合铺和弦；跳弓适合做推进的低音 */
      { id: 'violin', zh: '小提琴', en: 'Violins', kind: 'melodic', range: [55, 91], samples: strNames('vn'), make: n => I.line(hz(n.p), n.dur, n.v * 1.5, 'vn') },
      { id: 'viola', zh: '中提琴', en: 'Violas', kind: 'melodic', range: [48, 79], samples: strNames('va'), make: n => I.line(hz(n.p), n.dur, n.v * 1.5, 'va') },
      { id: 'cello', zh: '大提琴', en: 'Cellos', kind: 'melodic', range: [36, 64], samples: strNames('vc'), make: n => I.line(hz(n.p), n.dur, n.v * 1.7, 'vc') },
      { id: 'spic', zh: '大提琴跳弓', en: 'Cello spiccato', kind: 'melodic', range: [40, 64], samples: strNames('vcspic'), make: n => I.spic(hz(n.p), n.v * 1.1) },
      {
        id: 'strings', zh: '弦乐组（铺底）', en: 'String ensemble', kind: 'melodic', range: [36, 86], keepPan: true,
        samples: strNames('vc').concat(strNames('va'), strNames('vn')),
        make: n => {
          const sec = sectionOf(n.p), r = SECTION_RANGE[sec];
          return n.p >= r[0] && n.p <= r[1] ? I.section(hz(n.p), n.dur, n.v * 1.3, sec) : I.line(hz(n.p), n.dur, n.v * 1.3, sec);
        }
      },
      { id: 'bass', zh: '拨奏低音', en: 'Plucked bass', kind: 'melodic', range: [28, 60], make: n => I.bass(hz(n.p), n.dur, n.v) },
      { id: 'pad', zh: '柔和长音', en: 'Soft pad', kind: 'melodic', range: [40, 84], make: n => I.pad([hz(n.p)], n.dur, n.v * 1.6) },
      { id: 'drone', zh: '持续低音', en: 'Drone', kind: 'melodic', range: [28, 60], make: n => I.drone(hz(n.p), Math.max(3, n.dur), n.v) },
      { id: 'bell', zh: '钟', en: 'Bell', kind: 'melodic', range: [36, 96], make: n => I.bell(hz(n.p), Math.max(1.5, n.dur * 2), n.v) },
      { id: 'chime', zh: '风铃', en: 'Wind chime', kind: 'melodic', range: [72, 108], make: n => I.chime(hz(n.p), n.v * 1.4) },
      {
        id: 'drums', zh: '东方打击乐', en: 'Eastern percussion', kind: 'drums', range: [35, 81],
        samples: ['drum-center-loud', 'drum-center-soft', 'drum-edge-loud', 'drum-rim', 'gong-1'],
        make: n => {
          switch (n.p) {
            case 36: return I.drum('drum-center-loud', n.v, -2);
            case 35: return I.drum('drum-center-soft', n.v, -2);
            case 38: return I.drum('drum-edge-loud', n.v, -2);
            case 37: return I.drum('drum-rim', n.v, -1);
            case 76: return I.woodfish(n.v * 1.2);
            case 49: return I.gong(n.v, -3);
            case 81: return I.chime(hz(96), n.v * 1.5);
            default: return null;
          }
        }
      }
    ];
    const byId = {};
    list.forEach(x => { byId[x.id] = x; });
    return {
      list, get: id => byId[id] || byId.guqin, DRUM_KIT, hz, mixOf: id => MIX[id] || { pan: 0, reverb: 0.3 },
      samplesFor: id => (byId[id] && byId[id].samples) || []
    };
  }

  const api = { makeInstruments, DRUM_KIT, MIX };
  root.Studio = root.Studio || {};
  root.Studio.instruments = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
