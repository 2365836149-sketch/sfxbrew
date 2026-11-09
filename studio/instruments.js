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

  function makeInstruments(music) {
    const I = music.instruments;
    const list = [
      { id: 'guqin', zh: '古琴', en: 'Guqin', kind: 'melodic', range: [36, 84], make: n => I.guqin(hz(n.p), n.dur, n.v) },
      { id: 'pipa', zh: '琵琶', en: 'Pipa', kind: 'melodic', range: [45, 88], make: n => I.pipa(hz(n.p), n.dur, n.v, n.dur >= 1.2) },
      { id: 'flute', zh: '竹笛', en: 'Bamboo flute', kind: 'melodic', range: [60, 96], make: n => I.flute(hz(n.p), n.dur, n.v) },
      { id: 'erhu', zh: '二胡', en: 'Erhu', kind: 'melodic', range: [62, 83], samples: ['erhu-n-d4', 'erhu-n-d4b', 'erhu-n-f4', 'erhu-n-gs4', 'erhu-n-gs4b', 'erhu-n-b4', 'erhu-n-c5', 'erhu-n-d5', 'erhu-n-e5', 'erhu-n-f5', 'erhu-n-gs5', 'erhu-n-b5'], make: n => I.erhu(hz(n.p), n.dur, n.v, 0) },
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
      list, get: id => byId[id] || byId.guqin, DRUM_KIT, hz,
      samplesFor: id => (byId[id] && byId[id].samples) || []
    };
  }

  const api = { makeInstruments, DRUM_KIT };
  root.Studio = root.Studio || {};
  root.Studio.instruments = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
