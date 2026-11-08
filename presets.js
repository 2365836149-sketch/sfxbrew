/* ============================================================================
   SFX Brew · 预设生成器
   ----------------------------------------------------------------------------
   每个预设不是一个固定音效，而是一个"生成器"：每次调用都在合理范围里随机出一个新声音。
   点同一个预设多次就能得到很多不同的剑气、钟声……（和 sfxr 的思路一样）。
   音色参数说明见 engine.js 的 voice()。
   ==========================================================================*/
(function () {
  'use strict';

  const r = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(r(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const chance = p => Math.random() < p;
  /* D 宫五声音阶上的音：deg 0 = D3 */
  const penta = deg => 146.83 * Math.pow(2, (12 * Math.floor(deg / 5) + [0, 2, 4, 7, 9][((deg % 5) + 5) % 5]) / 12);

  const L = o => Object.assign({
    type: 'tone', wave: 'sine', freq: 440, freqEnd: 440, start: 0, attack: 0.005, decay: 0.3, vol: 0.5,
    filter: 'none', cutoff: 4000, cutoffEnd: 4000, q: 1, vib: 0, vibRate: 6,
    rep: 1, repGap: 0.1, repStep: 0, scale: 'penta',
    slideTime: 0, sweepTime: 0, unison: 1, detune: 12, fmRatio: 2, fmIndex: 0, fmDecay: 0.1
  }, o);
  const P = (layers, fx) => Object.assign({ layers, reverb: 0, echo: 0, echoTime: 0.2, drive: 0, crush: 0, gain: 0.8 }, fx);
  const same = (o) => { o.freqEnd = o.freq; return o; };

  const PRESETS = [
    /* ---------------- 东方 ---------------- */
    { id: 'swordQi', group: 'east', gen: () => {
      const hi = r(3000, 6500);
      return P([
        L({ type: 'noise', filter: 'bandpass', cutoff: hi, cutoffEnd: r(700, 1500), q: r(2, 6), attack: r(0.01, 0.04), decay: r(0.25, 0.45), vol: 0.7 }),
        L({ type: 'tone', wave: pick(['sawtooth', 'sine']), freq: r(1500, 2600), freqEnd: r(300, 600), filter: 'lowpass', cutoff: 5000, cutoffEnd: 1200, attack: 0.01, decay: r(0.2, 0.35), vol: 0.15 }),
        same(L({ type: 'bell', freq: r(1800, 3200), start: r(0.03, 0.08), attack: 0.002, decay: r(0.6, 1.1), vol: r(0.08, 0.16) }))
      ], { reverb: 0.25 });
    } },
    /* 古琴：用 Karplus-Strong 弦振动（type 'string'）。三种弹法随机：
       散音（空弦，低沉）、按音带走手音（弹完手指在弦上滑，音高滑动 + 摩擦声）、泛音（轻点弦，空灵像钟）。 */
    { id: 'guqin', group: 'east', gen: () => {
      const mode = pick(['open', 'open', 'slide', 'harmonic']);
      if (mode === 'harmonic') {
        const f = penta(ri(10, 16));
        return P([
          same(L({ type: 'bell', freq: f, partials: [[1, 1, 1], [2, 0.12, 0.5], [3, 0.04, 0.3]], attack: 0.003, decay: r(1.8, 2.8), vol: 0.5 })),
          same(L({ type: 'string', freq: f, bright: 0.2, attack: 0.001, decay: 1.2, vol: 0.12 })),
          L({ type: 'noise', filter: 'bandpass', cutoff: 2500, cutoffEnd: 2500, q: 2, attack: 0.0005, decay: 0.01, vol: 0.06 })
        ], { reverb: r(0.4, 0.5) });
      }
      const f = penta(ri(-3, 5)), slide = mode === 'slide';
      return P([
        L({ type: 'string', freq: f, freqEnd: slide ? f * pick([1.122, 1.06, 0.891, 0.944]) : f, slideTime: r(0.35, 0.7), bright: r(0.3, 0.5), filter: 'lowpass', cutoff: 3200, cutoffEnd: 1400, attack: 0.001, decay: r(2.5, 4), vol: 0.75 }),
        same(L({ type: 'tone', freq: f, attack: 0.01, decay: r(1.2, 1.8), vol: 0.12 })),
        L({ type: 'noise', filter: 'bandpass', cutoff: 1800, cutoffEnd: 1800, q: 1.5, attack: 0.0005, decay: 0.015, vol: 0.12 }),
        slide ? L({ type: 'noise', filter: 'bandpass', cutoff: 1200, cutoffEnd: 2600, q: 5, start: 0.08, attack: 0.12, decay: 0.35, vol: 0.05 }) : null
      ].filter(Boolean), { reverb: r(0.3, 0.42) });
    } },
    /* 寺钟：大梵钟低沉、两个靠得很近的分音产生"嗡嗡"的拍频；偶尔出编钟式的小铜钟。撞木击打声 = 低通噪声 + 一下闷响 */
    { id: 'bell', group: 'east', gen: () => {
      if (chance(0.35)) {
        const f = r(380, 820);
        return P([
          same(L({ type: 'bell', freq: f, partials: [[1, 1, 1], [1.003, 0.4, 1], [1.5, 0.35, 0.6], [2.0, 0.4, 0.5], [2.97, 0.2, 0.3], [4.1, 0.1, 0.2]], attack: 0.002, decay: r(2, 3.2), vol: 0.45 })),
          L({ type: 'noise', filter: 'bandpass', cutoff: f * 3, cutoffEnd: f * 2, q: 2, attack: 0.0005, decay: 0.02, vol: 0.25 })
        ], { reverb: r(0.35, 0.45) });
      }
      const f = r(85, 170);
      return P([
        same(L({ type: 'bell', freq: f, partials: [[1, 1, 1], [1.005, 0.7, 1], [2, 0.55, 0.75], [2.64, 0.4, 0.55], [3.36, 0.25, 0.4], [4.38, 0.14, 0.28], [5.6, 0.08, 0.18], [7.1, 0.04, 0.12]], attack: 0.004, decay: r(5.5, 8), vol: 0.4, vib: r(3, 8), vibRate: r(0.6, 1.2) })),
        L({ type: 'noise', filter: 'lowpass', cutoff: 1200, cutoffEnd: 250, attack: 0.001, decay: 0.12, vol: 0.35 }),
        L({ type: 'tone', freq: f * 0.5, freqEnd: f * 0.45, attack: 0.002, decay: 0.35, vol: 0.3 })
      ], { reverb: r(0.4, 0.5) });
    } },
    /* 铜锣：大锣（tam-tam，几十个不和谐分音，高频后起的"嗡"用噪声带近似）或京剧锣（敲完音高往下掉或往上翘） */
    { id: 'gong', group: 'east', gen: () => {
      if (chance(0.5)) {
        const f = r(55, 95), parts = [[1, 1, 1]];
        for (let i = 0; i < 9; i++) parts.push([+(1 + Math.pow(Math.random(), 1.4) * 11).toFixed(3), +(0.6 / (i + 1.5)).toFixed(3), +r(0.25, 0.9).toFixed(2)]);
        return P([
          same(L({ type: 'bell', freq: f, partials: parts, attack: 0.02, decay: r(5, 7.5), vol: 0.55, vib: r(8, 20), vibRate: r(2.5, 4.5) })),
          L({ type: 'noise', filter: 'bandpass', cutoff: r(2500, 4000), cutoffEnd: r(1500, 2500), q: 0.8, attack: r(0.25, 0.5), decay: r(1.8, 2.8), vol: 0.12 }),
          L({ type: 'noise', filter: 'lowpass', cutoff: 700, cutoffEnd: 80, attack: 0.002, decay: 0.5, vol: 0.35 })
        ], { reverb: 0.4 });
      }
      const f = r(220, 480), bend = pick([0.82, 0.88, 1.12, 1.2]);
      return P([
        L({ type: 'bell', freq: f, freqEnd: f * bend, slideTime: r(0.25, 0.5), partials: [[1, 1, 1], [1.48, 0.45, 0.6], [2.21, 0.3, 0.45], [3.07, 0.2, 0.3], [4.3, 0.1, 0.2]], attack: 0.002, decay: r(1.4, 2.4), vol: 0.5 }),
        L({ type: 'noise', filter: 'bandpass', cutoff: f * 6, cutoffEnd: f * 3, q: 1, attack: 0.0005, decay: r(0.15, 0.3), vol: 0.25 })
      ], { reverb: 0.3 });
    } },
    { id: 'spell', group: 'east', gen: () => P([
      L({ type: 'noise', filter: 'bandpass', cutoff: r(300, 600), cutoffEnd: r(3000, 6000), q: r(1, 3), attack: r(0.12, 0.25), decay: r(0.3, 0.5), vol: 0.3 }),
      same(L({ type: 'bell', freq: penta(ri(15, 19)), attack: 0.003, decay: r(0.7, 1.2), vol: 0.12, rep: ri(4, 7), repGap: r(0.05, 0.1), repStep: pick([1, 2]) }))
    ], { reverb: 0.45, echo: r(0.15, 0.3), echoTime: r(0.12, 0.22) }) },
    { id: 'thunder', group: 'east', gen: () => P([
      L({ type: 'noise', filter: 'lowpass', cutoff: r(2500, 5000), cutoffEnd: r(50, 90), attack: 0.004, decay: r(1.5, 2.6), vol: 0.9 }),
      L({ type: 'tone', wave: 'sine', freq: r(55, 75), freqEnd: r(28, 35), attack: 0.01, decay: r(1, 1.6), vol: 0.5 }),
      L({ type: 'noise', filter: 'highpass', cutoff: 2000, cutoffEnd: 2000, attack: 0.001, decay: 0.05, vol: 0.5, rep: ri(2, 4), repGap: r(0.03, 0.08) })
    ], { reverb: 0.3, drive: r(0.2, 0.4) }) },
    { id: 'breakthrough', group: 'east', gen: () => {
      const d = ri(5, 8);
      return P([
        same(L({ type: 'bell', freq: penta(d - 7), attack: 0.01, decay: r(4, 6), vol: 0.45 })),
        L({ type: 'noise', filter: 'lowpass', cutoff: 400, cutoffEnd: 80, attack: 0.01, decay: 1.5, vol: 0.25 }),
        same(L({ type: 'string', freq: penta(d), bright: 0.45, filter: 'lowpass', cutoff: 3500, cutoffEnd: 1500, start: 0.25, attack: 0.001, decay: 1.6, vol: 0.35, rep: ri(5, 7), repGap: r(0.07, 0.11), repStep: 1 }))
      ], { reverb: 0.45 });
    } },
    { id: 'talisman', group: 'east', gen: () => P([
      L({ type: 'noise', filter: 'bandpass', cutoff: r(2500, 5000), cutoffEnd: r(2000, 4000), q: 2, attack: 0.001, decay: r(0.02, 0.04), vol: 0.45, rep: ri(6, 12), repGap: r(0.03, 0.06) }),
      L({ type: 'noise', filter: 'highpass', cutoff: 1500, cutoffEnd: 5000, attack: r(0.15, 0.3), decay: r(0.4, 0.7), vol: 0.25 }),
      L({ type: 'tone', wave: 'sine', freq: r(250, 400), freqEnd: r(900, 1500), attack: 0.3, decay: 0.3, vol: 0.1 })
    ], { reverb: 0.25 }) },
    { id: 'alchemy', group: 'east', gen: () => {
      const n = ri(4, 6);
      return P([
        L({ type: 'tone', wave: 'sine', freq: r(450, 700), freqEnd: r(900, 1300), attack: 0.005, decay: r(0.07, 0.12), vol: 0.18, rep: n, repGap: r(0.05, 0.09), repStep: pick([-2, 2, 3, -3]), scale: 'chromatic' }),
        same(L({ type: 'bell', freq: penta(ri(14, 17)), start: n * 0.07 + 0.05, attack: 0.003, decay: r(1.5, 2.5), vol: 0.2 }))
      ], { reverb: 0.3 });
    } },
    /* 风铃：金属管的分音（1 : 2.756 : 5.404 : 8.933）+ 一个微微失谐的副本产生闪烁 */
    { id: 'chime', group: 'east', gen: () => P([
      same(L({ type: 'bell', freq: penta(ri(20, 24)), partials: [[1, 1, 1], [1.004, 0.5, 1], [2.756, 0.4, 0.6], [5.404, 0.15, 0.35], [8.933, 0.06, 0.2]], attack: 0.002, decay: r(1.6, 2.6), vol: 0.13, rep: ri(3, 6), repGap: r(0.09, 0.2), repStep: pick([1, 2, -1, 3]) })),
      L({ type: 'noise', filter: 'highpass', cutoff: 6000, cutoffEnd: 6000, attack: 0.0005, decay: 0.006, vol: 0.08, rep: 3, repGap: 0.14 })
    ], { reverb: 0.5 }) },
    /* 竹笛：基音正弦 + 二次泛音 + 跟着音高的气声（窄带噪声）+ 起音的"噗" + 笛膜特有的"嗡嗡"沙音（锯齿波过带通） */
    { id: 'flute', group: 'east', gen: () => {
      const f = penta(ri(12, 17)), a = r(0.06, 0.12), d = r(0.7, 1.3), vib = r(12, 28), vr = r(5, 6.2);
      const env = { attack: a, decay: d, vib, vibRate: vr };
      return P([
        same(L(Object.assign({ type: 'tone', wave: 'sine', freq: f, vol: 0.4 }, env))),
        same(L(Object.assign({ type: 'tone', wave: 'triangle', freq: f * 2, vol: 0.07 }, env))),
        L(Object.assign({ type: 'noise', filter: 'bandpass', cutoff: f, cutoffEnd: f, q: 18, vol: 0.3 }, env)),
        same(L(Object.assign({ type: 'tone', wave: 'sawtooth', freq: f, filter: 'bandpass', cutoff: r(2500, 3600), cutoffEnd: r(2500, 3600), q: 3, vol: 0.05 }, env))),
        L({ type: 'noise', filter: 'highpass', cutoff: 3500, cutoffEnd: 3500, attack: 0.015, decay: 0.2, vol: 0.06 })
      ], { reverb: 0.35 });
    } },
    { id: 'qiGather', group: 'east', gen: () => P([
      L({ type: 'tone', wave: 'sine', freq: r(150, 250), freqEnd: r(700, 1100), attack: r(0.5, 0.9), decay: r(0.2, 0.4), vol: 0.25, vib: r(20, 50), vibRate: r(6, 10) }),
      L({ type: 'noise', filter: 'bandpass', cutoff: 300, cutoffEnd: 3000, q: 4, attack: 0.6, decay: 0.3, vol: 0.2 }),
      same(L({ type: 'bell', freq: penta(ri(18, 21)), start: 0.75, attack: 0.002, decay: 1.4, vol: 0.15 }))
    ], { reverb: 0.4 }) },

    /* 琵琶：明亮的弦（bright 高），三种弹法：单弹、轮指（快速重复同一音）、扫弦（几乎同时的和弦） */
    { id: 'pipa', group: 'east', gen: () => {
      const f = penta(ri(5, 12)), mode = pick(['single', 'tremolo', 'strum']);
      const base = { type: 'string', freq: f, bright: r(0.75, 0.95), filter: 'lowpass', cutoff: 6000, cutoffEnd: 3000, attack: 0.001 };
      const nail = { type: 'noise', filter: 'highpass', cutoff: 3000, cutoffEnd: 3000, attack: 0.0005, decay: 0.008, vol: 0.15 };
      if (mode === 'tremolo') {
        const n = ri(8, 14), gap = r(0.035, 0.05);
        return P([same(L(Object.assign(base, { decay: 0.4, vol: 0.45, rep: n, repGap: gap, repStep: 0 }))), L(Object.assign(nail, { rep: n, repGap: gap }))], { reverb: 0.25 });
      }
      if (mode === 'strum') {
        const gap = r(0.012, 0.022);
        return P([same(L(Object.assign(base, { decay: r(0.9, 1.4), vol: 0.4, rep: 4, repGap: gap, repStep: pick([1, 2]) }))), L(Object.assign(nail, { rep: 4, repGap: gap, vol: 0.1 }))], { reverb: 0.25 });
      }
      return P([L(Object.assign(base, { freqEnd: chance(0.3) ? f * 1.06 : f, slideTime: 0.25, decay: r(0.7, 1.3), vol: 0.6 })), L(nail)], { reverb: 0.25 });
    } },
    /* 二胡：拉弦 = 锯齿波（两个微失谐）过带通出鼻音 + 揉弦颤音 + 换把滑音 + 松香擦弦噪声 */
    { id: 'erhu', group: 'east', gen: () => {
      const f = penta(ri(7, 13)), slide = pick([1, 1, 1.06, 1.122, 0.944]), st = r(0.15, 0.3);
      const env = { attack: r(0.08, 0.16), decay: r(0.8, 1.4), vib: r(25, 45), vibRate: r(5, 6.5), freq: f, freqEnd: f * slide, slideTime: st };
      return P([
        L(Object.assign({ type: 'tone', wave: 'sawtooth', unison: 2, detune: 6, filter: 'bandpass', cutoff: r(900, 1300), cutoffEnd: r(900, 1300), q: 0.7, vol: 0.7 }, env)),
        L(Object.assign({ type: 'tone', wave: 'sawtooth', filter: 'highpass', cutoff: 2500, cutoffEnd: 2500, vol: 0.06 }, env)),
        L({ type: 'noise', filter: 'bandpass', cutoff: f * 4, cutoffEnd: f * 4, q: 4, attack: 0.1, decay: env.decay, vol: 0.04 })
      ], { reverb: 0.3 });
    } },
    /* 木鱼：木头的分音（短、不和谐）+ 敲击的"咔"，偶尔连敲两三下 */
    { id: 'woodfish', group: 'east', gen: () => {
      const f = r(450, 950), n = pick([1, 1, 2, 3]), gap = r(0.18, 0.3);
      return P([
        same(L({ type: 'bell', freq: f, partials: [[1, 1, 1], [1.58, 0.45, 0.6], [2.42, 0.2, 0.4]], attack: 0.0008, decay: r(0.08, 0.16), vol: 0.8, rep: n, repGap: gap, repStep: 0 })),
        L({ type: 'noise', filter: 'bandpass', cutoff: r(2000, 3500), cutoffEnd: 2000, q: 2, attack: 0.0005, decay: 0.01, vol: 0.5, rep: n, repGap: gap })
      ], { reverb: 0.18 });
    } },
    /* 堂鼓 / 战鼓：低频正弦快速落音高（鼓腔）+ 鼓皮的噪声 + 一个鼓面泛音，偶尔"咚咚"两下 */
    { id: 'drum', group: 'east', gen: () => {
      const big = chance(0.5), f = big ? r(50, 70) : r(80, 115), n = pick([1, 1, 2]), gap = r(0.15, 0.25);
      return P([
        L({ type: 'tone', freq: f * 1.6, freqEnd: f, slideTime: 0.06, attack: 0.001, decay: big ? r(0.7, 1.1) : r(0.35, 0.6), vol: 0.85, rep: n, repGap: gap }),
        L({ type: 'noise', filter: 'lowpass', cutoff: 1800, cutoffEnd: 300, attack: 0.0005, decay: 0.08, vol: 0.35, rep: n, repGap: gap }),
        L({ type: 'tone', wave: 'triangle', freq: f * 2.3, freqEnd: f * 2, slideTime: 0.05, attack: 0.001, decay: 0.15, vol: 0.18, rep: n, repGap: gap })
      ], { reverb: big ? 0.3 : 0.2 });
    } },

    /* ---------------- 通用 ----------------
       思路：起音瞬态（极短噪声，"咔"）+ 主体（音高在几十毫秒内快速滑落，才有冲击感）+ 尾巴。
       少用裸方波，多用 FM（金属、木头、玻璃质感）和叠音失谐（更厚）。偶尔带一点 8-bit 降位作为复古变体。 */
    { id: 'coin', group: 'general', gen: () => {
      const f = r(1000, 1500), step = pick([5, 7]), gap = r(0.06, 0.09);
      return P([
        same(L({ type: 'fm', freq: f, fmRatio: pick([1.41, 2.76, 3.5]), fmIndex: r(1.5, 3), fmDecay: 0.08, attack: 0.001, decay: r(0.3, 0.5), vol: 0.45, rep: 2, repGap: gap, repStep: step, scale: 'chromatic' })),
        same(L({ type: 'tone', freq: f * 2, attack: 0.001, decay: 0.2, vol: 0.1, rep: 2, repGap: gap, repStep: step, scale: 'chromatic' })),
        L({ type: 'noise', filter: 'highpass', cutoff: 6000, cutoffEnd: 6000, attack: 0.0005, decay: 0.012, vol: 0.35, rep: 2, repGap: gap })
      ], { reverb: 0.12, crush: chance(0.15) ? ri(6, 8) : 0 });
    } },
    { id: 'pickup', group: 'general', gen: () => {
      const f = r(500, 800);
      return P([
        L({ type: 'tone', wave: 'triangle', unison: 2, detune: 8, freq: f, freqEnd: f * r(1.8, 2.4), slideTime: r(0.05, 0.09), attack: 0.002, decay: r(0.15, 0.25), vol: 0.5 }),
        same(L({ type: 'fm', freq: f * 3, fmRatio: 2, fmIndex: 1, fmDecay: 0.05, start: 0.04, attack: 0.001, decay: 0.2, vol: 0.12 })),
        L({ type: 'noise', filter: 'highpass', cutoff: 5000, cutoffEnd: 5000, attack: 0.0005, decay: 0.01, vol: 0.25 })
      ], { reverb: 0.1, crush: chance(0.15) ? ri(6, 8) : 0 });
    } },
    { id: 'click', group: 'general', gen: () => {
      const f = r(700, 1400);
      return P([
        L({ type: 'noise', filter: 'bandpass', cutoff: r(2000, 4500), cutoffEnd: r(2000, 4500), q: r(1.5, 4), attack: 0.0005, decay: r(0.008, 0.018), vol: 0.9 }),
        L({ type: 'fm', freq: f, freqEnd: f * 0.6, slideTime: 0.015, fmRatio: r(1.5, 3.2), fmIndex: r(1, 3), fmDecay: 0.01, attack: 0.0005, decay: r(0.02, 0.05), vol: 0.5 })
      ]);
    } },
    { id: 'confirm', group: 'general', gen: () => P([
      same(L({ type: 'fm', freq: r(600, 850), fmRatio: pick([1, 2]), fmIndex: r(1, 2), fmDecay: 0.15, attack: 0.002, decay: r(0.25, 0.4), vol: 0.4, rep: 2, repGap: r(0.07, 0.1), repStep: pick([4, 5, 7]), scale: 'chromatic' })),
      L({ type: 'noise', filter: 'highpass', cutoff: 4000, cutoffEnd: 4000, attack: 0.0005, decay: 0.01, vol: 0.15 })
    ], { reverb: 0.15 }) },
    { id: 'error', group: 'general', gen: () => {
      const f = r(180, 260), gap = r(0.13, 0.17), step = pick([0, -1, -2]);
      return P([
        same(L({ type: 'tone', wave: 'triangle', unison: 3, detune: r(15, 30), freq: f, filter: 'lowpass', cutoff: 1600, cutoffEnd: 700, attack: 0.003, decay: r(0.15, 0.22), vol: 0.3, rep: 2, repGap: gap, repStep: step, scale: 'chromatic' })),
        same(L({ type: 'tone', freq: f / 2, attack: 0.003, decay: 0.18, vol: 0.15, rep: 2, repGap: gap, repStep: step, scale: 'chromatic' }))
      ]);
    } },
    { id: 'jump', group: 'general', gen: () => {
      const f = r(160, 280);
      return P([
        L({ type: 'tone', wave: 'triangle', unison: 2, detune: 10, freq: f, freqEnd: f * r(2, 2.8), slideTime: r(0.08, 0.14), filter: 'lowpass', cutoff: 2500, cutoffEnd: 2500, attack: 0.003, decay: r(0.18, 0.26), vol: 0.55 }),
        L({ type: 'noise', filter: 'bandpass', cutoff: 500, cutoffEnd: 2500, sweepTime: 0.12, q: 1.2, attack: 0.02, decay: 0.15, vol: 0.3 }),
        L({ type: 'noise', filter: 'highpass', cutoff: 2000, cutoffEnd: 2000, attack: 0.0005, decay: 0.012, vol: 0.2 })
      ], { crush: chance(0.15) ? ri(6, 8) : 0 });
    } },
    { id: 'hit', group: 'general', gen: () => P([
      L({ type: 'noise', filter: 'highpass', cutoff: r(2000, 4000), cutoffEnd: 2000, attack: 0.0005, decay: r(0.01, 0.02), vol: 0.9 }),
      L({ type: 'tone', freq: r(160, 240), freqEnd: r(45, 60), slideTime: r(0.03, 0.06), attack: 0.001, decay: r(0.12, 0.2), vol: 0.95 }),
      L({ type: 'noise', filter: 'lowpass', cutoff: 5000, cutoffEnd: 400, sweepTime: 0.08, attack: 0.001, decay: r(0.08, 0.15), vol: 0.6 })
    ], { drive: r(0.35, 0.6), reverb: 0.08 }) },
    { id: 'explosion', group: 'general', gen: () => P([
      L({ type: 'noise', attack: 0.0005, decay: 0.03, vol: 1 }),
      L({ type: 'tone', freq: r(80, 110), freqEnd: r(30, 40), slideTime: r(0.1, 0.2), attack: 0.002, decay: r(0.6, 0.9), vol: 1 }),
      L({ type: 'noise', filter: 'lowpass', cutoff: r(1500, 3000), cutoffEnd: 60, sweepTime: r(0.4, 0.8), attack: 0.005, decay: r(1, 1.8), vol: 0.9 }),
      L({ type: 'noise', filter: 'bandpass', cutoff: 3000, cutoffEnd: 2000, q: 2, start: 0.1, attack: 0.001, decay: 0.02, vol: 0.3, rep: ri(5, 9), repGap: r(0.05, 0.1) })
    ], { drive: r(0.4, 0.7), reverb: 0.25 }) },
    { id: 'laser', group: 'general', gen: () => P([
      L({ type: 'fm', unison: 2, detune: 15, freq: r(1200, 2200), freqEnd: r(180, 350), slideTime: r(0.1, 0.18), fmRatio: pick([0.5, 1, 1.5]), fmIndex: r(2, 5), fmDecay: 0.1, attack: 0.001, decay: r(0.15, 0.25), vol: 0.45 }),
      L({ type: 'noise', filter: 'highpass', cutoff: 4000, cutoffEnd: 4000, attack: 0.0005, decay: 0.05, vol: 0.2 })
    ], { crush: chance(0.2) ? ri(6, 8) : 0, reverb: 0.08 }) },
    { id: 'powerUp', group: 'general', gen: () => chance(0.5)
      ? P([
        same(L({ type: 'fm', unison: 2, detune: 10, freq: r(300, 450), fmRatio: 1, fmIndex: 1, fmDecay: 0.08, attack: 0.002, decay: 0.15, vol: 0.35, rep: 6, repGap: r(0.045, 0.06), repStep: 1, scale: 'penta' })),
        same(L({ type: 'bell', freq: penta(ri(20, 22)), start: 0.32, attack: 0.002, decay: 1.2, vol: 0.12 }))
      ], { reverb: 0.2 })
      : P([
        L({ type: 'tone', wave: 'sawtooth', unison: 3, detune: 20, freq: r(200, 300), freqEnd: r(650, 900), slideTime: 0.5, filter: 'lowpass', cutoff: 400, cutoffEnd: 5000, sweepTime: 0.5, attack: 0.4, decay: 0.3, vol: 0.35 }),
        L({ type: 'noise', filter: 'bandpass', cutoff: 400, cutoffEnd: 5000, q: 3, attack: 0.45, decay: 0.2, vol: 0.2 })
      ], { reverb: 0.2 }) },
    { id: 'levelUp', group: 'general', gen: () => {
      const d = ri(12, 15);
      return P([
        same(L({ type: 'fm', freq: penta(d), fmRatio: 1, fmIndex: 1.5, fmDecay: 0.12, attack: 0.002, decay: 0.5, vol: 0.4, rep: 4, repGap: r(0.08, 0.11), repStep: 2 })),
        same(L({ type: 'tone', wave: 'triangle', unison: 3, detune: 15, freq: penta(d + 5), start: 0.35, attack: 0.05, decay: 1, vol: 0.18 })),
        same(L({ type: 'bell', freq: penta(d + 10), start: 0.36, attack: 0.002, decay: 1.4, vol: 0.12 }))
      ], { reverb: 0.3 });
    } },
    { id: 'whoosh', group: 'general', gen: () => {
      const a = r(0.12, 0.25), d = r(0.2, 0.35);
      return P([
        L({ type: 'noise', filter: 'bandpass', cutoff: r(250, 500), cutoffEnd: r(1500, 3000), q: r(1, 2.5), attack: a, decay: d, vol: 1 }),
        L({ type: 'noise', filter: 'bandpass', cutoff: r(1500, 2500), cutoffEnd: r(4000, 7000), q: 3, attack: a, decay: d * 0.7, vol: 0.35 })
      ]);
    } }
  ];

  /** 在当前参数附近随机微调：数值乘一个接近 1 的系数，类型和波形不变 */
  function mutate(p, amt) {
    amt = amt == null ? 0.15 : amt;
    const q = JSON.parse(JSON.stringify(p));
    const f = () => 1 + (Math.random() * 2 - 1) * amt;
    q.layers.forEach(l => {
      const m = f();
      l.freq *= m; l.freqEnd *= m * (1 + (Math.random() * 2 - 1) * amt * 0.3);
      l.cutoff *= f(); l.cutoffEnd *= f();
      l.attack = Math.max(0.001, l.attack * f()); l.decay = Math.max(0.01, l.decay * f());
      l.vol = Math.min(1, l.vol * f());
      if (l.start) l.start *= f();
      if (l.rep > 1) l.repGap *= f();
      if (l.vib) l.vib *= f();
      if (l.slideTime) l.slideTime *= f();
      if (l.fmIndex) l.fmIndex *= f();
      if (l.bright != null) l.bright = Math.max(0, Math.min(1, l.bright * f()));
    });
    q.reverb = Math.min(1, q.reverb * f());
    return q;
  }

  if (typeof window !== 'undefined') { window.SFX_PRESETS = PRESETS; window.SFX_MUTATE = mutate; }
  if (typeof module !== 'undefined' && module.exports) module.exports = { PRESETS, mutate };
})();
