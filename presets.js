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

  /* 录音素材（samples/ 目录，CC0，来源见 samples/CREDITS.md）。length = 素材时长（秒），root = 实测音高 */
  const SAMPLES = {
    'drum-center-loud': { length: 2.7 }, 'drum-center-soft': { length: 2.7 }, 'drum-edge-loud': { length: 3.5 }, 'drum-rim': { length: 1.8 },
    'lightning-1': { length: 6.5 }, 'lightning-2': { length: 7 },
    'gong-1': { length: 10 }, 'gong-2': { length: 12 },
    'erhu-d3': { length: 4.9, root: 295.4 }, 'erhu-f5': { length: 6, root: 697.2 },
    /* 多段素材：一个文件里按固定间隔（slot 秒）排了好几次独立的录音，用 take(名字, 第几段) 取其中一段 */
    'sword-clash': { length: 7.2, slot: 0.9, takes: 8 }, 'footstep-stone': { length: 5.4, slot: 0.45, takes: 12 }, 'arrow': { length: 4, slot: 0.8, takes: 5 },
    'footstep-grass': { length: 3.2, slot: 0.4, takes: 8 }, 'land': { length: 2.1, slot: 0.7, takes: 3 }, 'shield-block': { length: 3.6, slot: 0.6, takes: 6 },
    'page-turn': { length: 8.75, slot: 1.25, takes: 7 }, 'typewriter': { length: 4.55, slot: 0.35, takes: 13 }, 'chest-open': { length: 11.1, slot: 3.7, takes: 3 },
    'monster-growl': { length: 12.8, slot: 3.2, takes: 4 },
    /* 可循环的环境声：每段 5 秒，首尾已经交叉淡化过，从段首开始播放 */
    'campfire': { length: 10.4, slot: 5.2, takes: 2, loop: 5 }, 'stream': { length: 10.4, slot: 5.2, takes: 2, loop: 5 },
    /* 微采样瞬态图集（零延迟起音，配合合成引擎使用） */
    'impact-hits': { length: 5.6, slot: 0.7, takes: 8 },
    'whoosh-cuts': { length: 4.8, slot: 0.6, takes: 8 },
    'magic-textures': { length: 5.6, slot: 0.7, takes: 8 },
    'ui-tactile': { length: 3.2, slot: 0.4, takes: 8 }
  };
  /* 取多段素材的第 k 段：跳过每段开头的静音，播放到这一段结束 */
  const take = (name, k, o) => { const m = SAMPLES[name]; return S(name, Object.assign({ offset: k * m.slot + 0.035, hold: m.slot - 0.2, decay: 0.12 }, o)); };
  /* 微采样瞬态：已经裁剪到起音点，从段首直接触发 */
  const micro = (name, k, o) => { const m = SAMPLES[name]; return S(name, Object.assign({ offset: k * m.slot, hold: Math.max(0.05, m.slot - 0.12), decay: 0.08 }, o)); };
  /* 环境声的一段：淡入淡出各 0.3 秒，总长约等于一段 */
  const loopTake = (name, k, o) => { const m = SAMPLES[name]; return S(name, Object.assign({ offset: k * m.slot, attack: 0.3, hold: m.loop - 0.6, decay: 0.3 }, o)); };
  /* 播放一段素材的音层：默认整段自然播放完（hold 撑到素材结尾，最后 0.15 秒淡出） */
  const S = (name, o) => L(Object.assign({ type: 'sample', sample: name, pitch: 0, offset: 0, attack: 0.001, hold: Math.max(0, SAMPLES[name].length - 0.15), decay: 0.15, vol: 0.9 }, o));

  const L = o => Object.assign({
    type: 'tone', wave: 'sine', freq: 440, freqEnd: 440, start: 0, attack: 0.005, decay: 0.3, vol: 0.5,
    filter: 'none', cutoff: 4000, cutoffEnd: 4000, q: 1, vib: 0, vibRate: 6,
    rep: 1, repGap: 0.1, repStep: 0, scale: 'penta',
    slideTime: 0, sweepTime: 0, unison: 1, detune: 12, fmRatio: 2, fmIndex: 0, fmDecay: 0.1,
    bright: 0.5, color: 'white', trem: 0, tremRate: 6, jitter: 0, pitchJitter: 0, freqPeak: 0, cutoffPeak: 0,
    hold: 0, repAccel: 1, repGain: 1
  }, o);
  const P = (layers, fx) => Object.assign({ layers, reverb: 0, echo: 0, echoTime: 0.2, drive: 0, crush: 0, gain: 0.8, seed: ri(1, 999999) }, fx);
  const same = (o) => { o.freqEnd = o.freq; return o; };

  const PRESETS = [
    /* ---------------- 东方 ---------------- */
    /* 剑气 / 挥剑：刀身划过耳边 = 粉红噪声的窄带，中心频率先升后降（多普勒，cutoffPeak），
       音量先涨后落；加一点刀刃的哨音（同样先升后降）、低频的风压，大多数变体最后有金属余鸣。 */
    { id: 'swordQi', group: 'east', gen: () => {
      const a = r(0.05, 0.1), d = r(0.16, 0.26), peak = r(4200, 6800);
      const layers = [
        micro('whoosh-cuts', ri(0, 7), { pitch: r(-2, 3), vol: 0.85 }),
        L({ type: 'noise', color: 'pink', filter: 'bandpass', cutoff: r(700, 1000), cutoffPeak: peak, cutoffEnd: r(450, 750), q: r(2.0, 3.8), attack: a, decay: d, vol: 0.65 }),
        L({ type: 'tone', wave: 'sine', freq: r(160, 220), freqPeak: r(320, 460), freqEnd: r(65, 95), attack: a * 0.7, decay: d * 0.9, vol: 0.25 }),
        L({ type: 'modal', freq: r(1700, 2700), modes: [[1, 0.9, 0.85], [2.32, 0.55, 0.55], [4.18, 0.3, 0.35], [6.7, 0.15, 0.25]], resQ: 18, exciterFreq: r(3200, 5000), exciterDecay: 0.014, exciterVol: 0.4, start: a * 0.8, attack: 0.002, decay: r(0.38, 0.7), vol: r(0.16, 0.24) })
      ];
      return P(layers, { reverb: 0.08, drive: 0.15, gain: 1.05 });
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
    /* 铜锣（真实录音）：大部分是一记重锣，变调改变锣的大小（越低越大）；
       一部分做成京剧锣——敲完音高往下掉或往上翘（变速播放实现）；少数是滚奏渐强的锣。 */
    { id: 'gong', group: 'east', gen: () => {
      const kind = pick(['hit', 'hit', 'opera', 'roll']);
      if (kind === 'roll') return P([S('gong-2', { pitch: r(-2, 2), vol: 1 })], { reverb: 0.15, gain: 0.72 });
      if (kind === 'opera') {
        const p0 = r(3, 7);
        return P([S('gong-1', { pitch: p0, pitchEnd: p0 + pick([-3, -2, 2, 3]), slideTime: r(0.25, 0.45), hold: r(1.5, 2.5), decay: 0.8, vol: 1 })], { reverb: 0.15, gain: 0.72 });
      }
      return P([S('gong-1', { pitch: r(-5, 2), hold: r(4, 7), decay: 2.5, vol: 1 })], { reverb: 0.2, gain: 0.72 });
    } },
    { id: 'spell', group: 'east', gen: () => P([
      micro('magic-textures', ri(0, 7), { pitch: r(-2, 4), vol: 0.42 }),
      L({ type: 'tone', wave: 'sawtooth', unison: 4, detune: 22, freq: r(180, 260), freqEnd: r(360, 520), slideTime: 0.45, filter: 'lowpass', cutoff: r(350, 550), cutoffEnd: r(3200, 4800), sweepTime: 0.4, attack: r(0.1, 0.2), decay: r(0.35, 0.5), vol: 0.22, trem: 0.25, tremRate: 7 }),
      same(L({ type: 'modal', freq: penta(ri(14, 18)), modes: [[1, 1, 1], [1.5, 0.45, 0.7], [2.76, 0.35, 0.5], [4.07, 0.2, 0.35]], resQ: 14, exciterVol: 0.22, exciterDecay: 0.006, attack: 0.002, decay: r(0.65, 1.1), vol: 0.22, rep: ri(5, 8), repGap: r(0.045, 0.085), repStep: pick([1, 2]), jitter: 0.25, pitchJitter: 0.4 })),
      L({ type: 'tone', wave: 'sine', freq: r(95, 130), freqEnd: r(190, 260), slideTime: 0.35, attack: 0.06, decay: 0.4, vol: 0.26 })
    ], { reverb: 0.18, echo: r(0.1, 0.2), echoTime: r(0.12, 0.2), gain: 0.85 }) },
    /* 天雷：近处是几声炸裂（白噪声 + 粉红噪声），远处只有滚雷；滚雷 = 同一声雷经过远近不同的路径
       在随机时刻陆续到达（jitter=1 的低通噪声块，每块截止频率不同）+ 一层摇晃的超低频。 */
    { id: 'thunder', group: 'east', gen: () => {
      const dur = r(2.5, 4), far = chance(0.3);
      const layers = [
        L({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: r(500, 900), cutoffEnd: 200, start: far ? 0 : r(0.05, 0.2), attack: r(0.05, 0.15), decay: r(0.4, 0.8), vol: far ? 0.9 : 0.8, rep: ri(8, 14), repGap: dur / 10, jitter: 1, pitchJitter: 10 }),
        L({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: 120, cutoffEnd: 100, attack: far ? 0.4 : 0.1, decay: dur, vol: 0.7, trem: 0.5, tremRate: r(1, 2.5) })
      ];
      if (!far) layers.unshift(
        L({ type: 'noise', filter: 'highpass', cutoff: 1500, cutoffEnd: 1500, attack: 0.0005, decay: r(0.05, 0.1), vol: 0.9, rep: ri(2, 4), repGap: 0.03, jitter: 0.8 }),
        L({ type: 'noise', color: 'pink', filter: 'lowpass', cutoff: 6000, cutoffEnd: 800, attack: 0.001, decay: 0.35, vol: 0.7 }));
      return P(layers, { reverb: 0.35, gain: 1 });
    } },
    /* 霹雳（真实录音）：两段近距离雷击实录，随机挑一段，音高在 -3~+1 个半音之间变化（越低越大越远）。 */
    { id: 'lightning', group: 'east', gen: () => {
      const name = pick(['lightning-1', 'lightning-2']), pitch = r(-3, 1);
      return P([S(name, { pitch, vol: 1 })], { reverb: 0.12, gain: 0.72 });
    } },
    { id: 'breakthrough', group: 'east', gen: () => {
      const d = ri(5, 8);
      return P([
        same(L({ type: 'modal', freq: penta(d - 7), modes: [[1, 1, 1], [2.0, 0.5, 0.7], [3.02, 0.25, 0.45]], resQ: 12, exciterVol: 0.35, attack: 0.008, decay: r(3.2, 4.5), vol: 0.5 })),
        L({ type: 'noise', filter: 'lowpass', cutoff: 380, cutoffEnd: 80, attack: 0.01, decay: 1.2, vol: 0.28 }),
        same(L({ type: 'string', freq: penta(d), bright: 0.5, filter: 'lowpass', cutoff: 3800, cutoffEnd: 1600, start: 0.22, attack: 0.001, decay: 1.4, vol: 0.38, rep: ri(5, 7), repGap: r(0.065, 0.1), repStep: 1 }))
      ], { reverb: 0.18, gain: 0.9 });
    } },
    /* 符箓燃烧 / 火焰：真实的火 = 随机时刻爆出的大小不一的噼啪（jitter=1 近似泊松分布）
       + 偶尔几下大的爆裂 + 粉红噪声的"呼呼"火苗声（震音让它忽大忽小）+ 棕色噪声的低沉底噪；
       开头一下纸被点着的"噗"。 */
    { id: 'talisman', group: 'east', gen: () => {
      const dur = r(1.4, 2.2);
      return P([
        L({ type: 'noise', filter: 'bandpass', cutoff: r(2500, 4500), cutoffEnd: r(2500, 4500), q: 1.5, start: 0.08, attack: 0.0005, decay: r(0.003, 0.008), vol: 0.9, rep: ri(28, 45), repGap: dur / 38, jitter: 1, pitchJitter: 12 }),
        L({ type: 'noise', filter: 'highpass', cutoff: 700, cutoffEnd: 700, start: 0.2, attack: 0.0005, decay: r(0.015, 0.03), vol: 0.9, rep: ri(2, 5), repGap: dur / 4, jitter: 1, pitchJitter: 5 }),
        L({ type: 'noise', color: 'pink', filter: 'bandpass', cutoff: r(900, 1500), cutoffEnd: r(700, 1100), q: 0.7, attack: r(0.15, 0.3), decay: dur, vol: 0.3, trem: 0.6, tremRate: r(4, 8) }),
        L({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: 300, cutoffEnd: 200, attack: 0.2, decay: dur, vol: 0.45, trem: 0.4, tremRate: r(2, 4) }),
        L({ type: 'noise', color: 'pink', filter: 'bandpass', cutoff: 400, cutoffEnd: 3000, q: 1, attack: 0.04, decay: 0.25, vol: 0.35 })
      ], { reverb: 0.12 });
    } },
    /* 冒泡：一个气泡 = 正弦波，音高在破裂瞬间快速上扬（Minnaert 共振，气泡越小音越高），几十毫秒就消失。
       很多大小不同的气泡在随机时刻冒出来（jitter + pitchJitter），底下垫一层液体的低沉翻滚声。
       一半的变体最后有一声"丹成"的钟。 */
    { id: 'alchemy', group: 'east', gen: () => {
      const n = ri(10, 20), gap = r(0.05, 0.09), f = r(380, 800), bell = chance(0.5);
      const layers = [
        L({ type: 'tone', wave: 'sine', freq: f, freqEnd: f * r(1.5, 2.1), attack: 0.001, decay: r(0.025, 0.06), vol: 0.45, filter: 'lowpass', cutoff: 3000, cutoffEnd: 3000, rep: n, repGap: gap, jitter: 0.9, pitchJitter: 8 }),
        L({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: 500, cutoffEnd: 400, attack: 0.1, decay: n * gap + 0.2, vol: 0.18, trem: 0.6, tremRate: r(5, 9) })
      ];
      if (bell) layers.push(same(L({ type: 'bell', freq: penta(ri(14, 17)), start: n * gap + 0.1, attack: 0.003, decay: r(1.5, 2.5), vol: 0.2 })));
      return P(layers, { reverb: 0.18 });
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
      L({ type: 'tone', wave: 'sawtooth', unison: 3, detune: 16, freq: r(150, 240), freqEnd: r(650, 980), filter: 'lowpass', cutoff: 400, cutoffEnd: 2600, attack: r(0.45, 0.8), decay: r(0.2, 0.35), vol: 0.22, vib: r(18, 40), vibRate: r(6, 9) }),
      L({ type: 'noise', color: 'pink', filter: 'bandpass', cutoff: 320, cutoffEnd: 2800, q: 3.5, attack: 0.55, decay: 0.28, vol: 0.22 }),
      same(L({ type: 'modal', freq: penta(ri(18, 21)), modes: [[1, 1, 1], [2.76, 0.4, 0.55], [5.4, 0.2, 0.3]], resQ: 14, exciterVol: 0.25, start: 0.7, attack: 0.002, decay: 1.1, vol: 0.25 }))
    ], { reverb: 0.16, gain: 0.9 }) },

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
    /* 二胡（真实录音）：两段二胡长音（实测 D4 和 F5），移调到 D 宫五声音阶上离原音最近的几个音（移调太多会失真）。
       一部分变体滑进或滑出这个音（揉弦本来就在录音里）。音长随机 1~3 秒。 */
    { id: 'erhu', group: 'east', gen: () => {
      const name = pick(['erhu-d3', 'erhu-f5']), root = SAMPLES[name].root;
      const near = [];
      for (let d = -5; d <= 25; d++) { const f = penta(d), st = 12 * Math.log2(f / root); if (Math.abs(st) <= 5) near.push(st); }
      const pitch = pick(near), slide = pick([0, 0, 1, 2, -2]);
      const len = r(1, Math.min(3, SAMPLES[name].length - 0.6));
      return P([S(name, { pitch: slide > 0 ? pitch - slide : pitch, pitchEnd: slide > 0 ? pitch : pitch + (slide < 0 ? slide : 0), slideTime: r(0.15, 0.3), offset: r(0, 0.3), attack: r(0.04, 0.1), hold: len, decay: r(0.3, 0.6), vol: 1 })], { reverb: 0.3, gain: 0.85 });
    } },
    /* 木鱼：空心木腔的圆润共振（强基音 + 空腔泛音，软木槌轻敲，避免干瘪硬敲声） */
    { id: 'woodfish', group: 'east', gen: () => {
      const f = r(340, 620), n = pick([1, 1, 2, 3]), gap = r(0.18, 0.3);
      return P([
        same(L({ type: 'modal', freq: f, modes: [[1, 1, 1], [1.56, 0.35, 0.45], [2.35, 0.15, 0.25]], resQ: 22, exciterFreq: f * 1.4, exciterDecay: 0.005, exciterVol: 0.22, attack: 0.001, decay: r(0.11, 0.17), vol: 0.85, rep: n, repGap: gap, repStep: 0 })),
        L({ type: 'tone', wave: 'sine', freq: f * 1.05, freqEnd: f, slideTime: 0.02, attack: 0.001, decay: r(0.1, 0.16), vol: 0.45, rep: n, repGap: gap, repStep: 0 })
      ], { reverb: 0.09, gain: 0.9 });
    } },
    /* 战鼓（真实录音）：中国大鼓（dagu）的鼓心、鼓边、鼓框单击录音，由引擎编成节奏。
       每一下都是一记重击，鼓声自然延续 2~3 秒，前后重叠就"绵延不绝"；降调 1~4 个半音让鼓更大更沉。
       三种打法：行军（重击 + 反拍的鼓框）、擂鼓（不太快的连击，越来越响，最后一记鼓边重击收尾）、
       催阵（两个鼓手，越敲越快越响）。大厅混响。 */
    { id: 'drum', group: 'east', gen: () => {
      const pitch = -r(1, 4), pattern = pick(['march', 'roll', 'build']);
      const big = (name, o) => S(name, Object.assign({ pitch, pitchJitter: 0.4 }, o));
      if (pattern === 'march') {
        const n = ri(6, 9), gap = r(0.5, 0.7);
        return P([
          big('drum-center-loud', { rep: n, repGap: gap, vol: 0.9 }),
          big('drum-rim', { start: gap / 2, rep: n - 1, repGap: gap, vol: 0.35 }),
          big('drum-edge-loud', { start: gap * n, vol: 1 })
        ], { reverb: 0.4, gain: 0.55 });
      }
      if (pattern === 'roll') {
        const n = ri(14, 22), gap = r(0.13, 0.18);
        return P([
          big('drum-center-soft', { rep: n, repGap: gap, repGain: 1.07, jitter: 0.08, vol: 0.9 }),
          big('drum-center-loud', { start: gap / 2, rep: n, repGap: gap, repGain: 1.07, jitter: 0.08, vol: 0.6, pitch: pitch - 2 }),
          big('drum-edge-loud', { start: gap * n + 0.05, vol: 1 })
        ], { reverb: 0.45, gain: 0.45 });
      }
      const n = ri(10, 14), gap = r(0.6, 0.75), acc = r(0.85, 0.89);
      return P([
        big('drum-center-loud', { rep: n, repGap: gap, repAccel: acc, repGain: 1.09, vol: 0.9 }),
        big('drum-edge-loud', { start: 0.03, rep: n, repGap: gap, repAccel: acc, repGain: 1.09, jitter: 0.06, vol: 0.55, pitch: pitch - 2 })
      ], { reverb: 0.45, gain: 0.48 });
    } },

    /* ---------------- 通用 ----------------
       思路：起音瞬态（极短噪声，"咔"）+ 主体（音高在几十毫秒内快速滑落，才有冲击感）+ 尾巴。
       少用裸方波，多用 FM（金属、木头、玻璃质感）和叠音失谐（更厚）。偶尔带一点 8-bit 降位作为复古变体。 */
    { id: 'coin', group: 'general', gen: () => {
      const f = r(1050, 1500), step = pick([5, 7]), gap = r(0.06, 0.085);
      return P([
        same(L({ type: 'modal', freq: f, modes: [[1, 1, 1], [2.41, 0.45, 0.6], [4.15, 0.2, 0.35]], resQ: 18, exciterFreq: f * 2.5, exciterDecay: 0.005, exciterVol: 0.4, attack: 0.0008, decay: r(0.28, 0.45), vol: 0.55, rep: 2, repGap: gap, repStep: step, scale: 'chromatic' })),
        same(L({ type: 'fm', freq: f, fmRatio: 2, fmIndex: r(1.2, 2.2), fmDecay: 0.06, attack: 0.001, decay: r(0.22, 0.36), vol: 0.25, rep: 2, repGap: gap, repStep: step, scale: 'chromatic' }))
      ], { reverb: 0.05, crush: chance(0.15) ? ri(6, 8) : 0, gain: 0.9 });
    } },
    { id: 'pickup', group: 'general', gen: () => {
      const f = r(520, 820);
      return P([
        L({ type: 'tone', wave: 'triangle', unison: 2, detune: 8, freq: f, freqEnd: f * r(1.8, 2.4), slideTime: r(0.05, 0.085), attack: 0.0015, decay: r(0.14, 0.22), vol: 0.5 }),
        same(L({ type: 'modal', freq: f * 2.5, modes: [[1, 1, 1], [2.2, 0.4, 0.5]], resQ: 14, exciterVol: 0.3, start: 0.035, attack: 0.001, decay: 0.18, vol: 0.28 }))
      ], { reverb: 0.05, crush: chance(0.15) ? ri(6, 8) : 0, gain: 0.9 });
    } },
    { id: 'click', group: 'general', gen: () => {
      const f = r(750, 1500);
      return P([
        micro('ui-tactile', ri(0, 7), { pitch: r(-2, 3), hold: 0.08, decay: 0.04, vol: 0.75 }),
        L({ type: 'modal', freq: f, modes: [[1, 1, 1], [2.1, 0.5, 0.5], [3.4, 0.25, 0.3]], resQ: 12, exciterFreq: r(2200, 4200), exciterDecay: 0.004, exciterVol: 0.55, attack: 0.0005, decay: r(0.014, 0.028), vol: 0.55 }),
        L({ type: 'tone', freq: 180, freqEnd: 65, slideTime: 0.01, attack: 0.0005, decay: 0.014, vol: 0.35 })
      ], { gain: 0.95 });
    } },
    { id: 'confirm', group: 'general', gen: () => P([
      same(L({ type: 'modal', freq: r(580, 820), modes: [[1, 1, 1], [2, 0.35, 0.5], [3.98, 0.15, 0.25]], resQ: 10, exciterVol: 0.25, exciterDecay: 0.005, attack: 0.0015, decay: r(0.22, 0.35), vol: 0.5, rep: 2, repGap: r(0.07, 0.095), repStep: pick([4, 5, 7]), scale: 'chromatic' })),
      same(L({ type: 'fm', freq: r(580, 820), fmRatio: 1, fmIndex: 0.8, fmDecay: 0.1, attack: 0.002, decay: 0.22, vol: 0.18, rep: 2, repGap: 0.08, repStep: 5, scale: 'chromatic' }))
    ], { reverb: 0.07, gain: 0.9 }) },
    { id: 'error', group: 'general', gen: () => {
      const f = r(170, 240), gap = r(0.12, 0.16), step = pick([0, -1, -2]);
      return P([
        same(L({ type: 'tone', wave: 'sawtooth', unison: 3, detune: r(16, 28), freq: f, filter: 'lowpass', cutoff: 1500, cutoffEnd: 480, attack: 0.002, decay: r(0.13, 0.19), vol: 0.35, rep: 2, repGap: gap, repStep: step, scale: 'chromatic' })),
        same(L({ type: 'tone', freq: f / 2, attack: 0.002, decay: 0.16, vol: 0.25, rep: 2, repGap: gap, repStep: step, scale: 'chromatic' }))
      ], { reverb: 0.02, drive: 0.15, gain: 0.9 });
    } },
    { id: 'jump', group: 'general', gen: () => {
      const f = r(160, 270);
      return P([
        L({ type: 'tone', wave: 'triangle', unison: 2, detune: 10, freq: f, freqEnd: f * r(2, 2.7), slideTime: r(0.07, 0.12), filter: 'lowpass', cutoff: 2600, cutoffEnd: 2600, attack: 0.002, decay: r(0.16, 0.23), vol: 0.55 }),
        L({ type: 'modal', freq: f * 1.5, modes: [[1, 0.8, 0.5], [2.2, 0.3, 0.3]], resQ: 8, exciterVol: 0.4, exciterDecay: 0.006, attack: 0.001, decay: 0.04, vol: 0.3 }),
        L({ type: 'noise', filter: 'bandpass', cutoff: 600, cutoffEnd: 2400, sweepTime: 0.11, q: 1.2, attack: 0.015, decay: 0.12, vol: 0.25 })
      ], { reverb: 0.03, crush: chance(0.15) ? ri(6, 8) : 0, gain: 0.9 });
    } },
    { id: 'hit', group: 'general', gen: () => P([
      micro('impact-hits', ri(0, 7), { pitch: r(-3, 2), vol: 0.75 }),
      L({ type: 'modal', freq: r(480, 860), modes: [[1, 1, 1], [1.92, 0.6, 0.5], [3.14, 0.35, 0.3]], resQ: 10, exciterFreq: r(1800, 3400), exciterDecay: 0.007, exciterVol: 0.65, attack: 0.0005, decay: r(0.035, 0.06), vol: 0.5 }),
      L({ type: 'tone', freq: r(180, 260), freqEnd: r(42, 58), slideTime: r(0.025, 0.045), attack: 0.0008, hold: 0.012, decay: r(0.11, 0.18), vol: 0.85 })
    ], { drive: r(0.2, 0.38), reverb: 0.03, gain: 0.9 }) },
    /* 爆炸：真实撞击底噪 + 火花噼啪 + 超低频下潜 + 棕色噪声火球轰鸣 + 碎片。 */
    { id: 'explosion', group: 'general', gen: () => {
      const chain = chance(0.4), n = chain ? ri(2, 3) : 1, gap = r(0.25, 0.5);
      const C = { rep: n, repGap: gap, jitter: chain ? 0.3 : 0, repGain: chain ? 0.8 : 1 };
      return P([
        micro('impact-hits', ri(0, 7), Object.assign({ pitch: r(-7, -3), vol: 0.85 }, C)),
        micro('magic-textures', ri(0, 7), Object.assign({ pitch: r(-6, -2), start: 0.04, vol: 0.45 }, C)),
        L(Object.assign({ type: 'tone', freq: r(115, 145), freqEnd: r(28, 36), slideTime: 0.14, attack: 0.001, hold: 0.05, decay: r(0.85, 1.2), vol: 0.95 }, C)),
        L(Object.assign({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: r(4500, 7500), cutoffEnd: 85, sweepTime: r(0.7, 1.3), attack: 0.002, hold: r(0.14, 0.28), decay: r(1.8, 2.6), vol: 0.9 }, C)),
        L(Object.assign({ type: 'noise', color: 'pink', filter: 'bandpass', cutoff: 650, cutoffEnd: 140, q: 0.6, attack: 0.003, hold: 0.08, decay: r(0.9, 1.4), vol: 0.7 }, C)),
        L({ type: 'modal', freq: r(900, 1800), modes: [[1, 0.8, 0.6], [2.1, 0.5, 0.4]], resQ: 8, exciterVol: 0.65, exciterDecay: 0.008, start: r(0.12, 0.25), attack: 0.0005, decay: r(0.015, 0.04), vol: 0.45, rep: ri(14, 24), repGap: r(0.045, 0.08), jitter: 1, pitchJitter: 12 })
      ], { reverb: 0.1, drive: 0.3, gain: 0.55 });
    } },
    /* 激光 / 能量枪：电火花起音 + FM 啁啾 + 锯齿波下潜。 */
    { id: 'laser', group: 'general', gen: () => {
      const f0 = r(2400, 4200), f1 = r(140, 320), st = r(0.07, 0.13);
      return P([
        micro('magic-textures', ri(0, 5), { pitch: r(2, 7), hold: 0.12, decay: 0.05, vol: 0.35 }),
        L({ type: 'fm', freq: f0, freqEnd: f1, slideTime: st, fmRatio: 1.41, fmIndex: 2.2, fmDecay: st * 0.8, attack: 0.0008, decay: r(0.13, 0.21), vol: 0.5, rep: 3, repGap: r(0.003, 0.007), jitter: 0.25, pitchJitter: 1.5 }),
        L({ type: 'tone', wave: 'sawtooth', freq: f0 * 0.5, freqEnd: f1 * 0.5, slideTime: st, filter: 'lowpass', cutoff: 3200, cutoffEnd: 450, attack: 0.001, decay: 0.14, vol: 0.2 })
      ], { reverb: 0.04, echo: 0.1, echoTime: r(0.06, 0.09), gain: 0.9 });
    } },
    { id: 'powerUp', group: 'general', gen: () => chance(0.5)
      ? P([
        same(L({ type: 'fm', unison: 2, detune: 10, freq: r(300, 450), fmRatio: 1, fmIndex: 1.1, fmDecay: 0.08, attack: 0.002, decay: 0.15, vol: 0.38, rep: 6, repGap: r(0.045, 0.06), repStep: 1, scale: 'penta' })),
        same(L({ type: 'modal', freq: penta(ri(20, 22)), modes: [[1, 1, 1], [2.76, 0.4, 0.5]], resQ: 14, exciterVol: 0.2, start: 0.3, attack: 0.002, decay: 0.9, vol: 0.22 }))
      ], { reverb: 0.1, gain: 0.9 })
      : P([
        L({ type: 'tone', wave: 'sawtooth', unison: 3, detune: 20, freq: r(200, 300), freqEnd: r(650, 900), slideTime: 0.48, filter: 'lowpass', cutoff: 400, cutoffEnd: 5000, sweepTime: 0.48, attack: 0.35, decay: 0.25, vol: 0.35 }),
        L({ type: 'noise', filter: 'bandpass', cutoff: 400, cutoffEnd: 5000, q: 2.5, attack: 0.4, decay: 0.2, vol: 0.2 })
      ], { reverb: 0.1, gain: 0.9 }) },
    { id: 'levelUp', group: 'general', gen: () => {
      const d = ri(12, 15);
      return P([
        same(L({ type: 'fm', freq: penta(d), fmRatio: 1, fmIndex: 1.4, fmDecay: 0.12, attack: 0.002, decay: 0.45, vol: 0.42, rep: 4, repGap: r(0.075, 0.1), repStep: 2 })),
        same(L({ type: 'tone', wave: 'triangle', unison: 3, detune: 15, freq: penta(d + 5), start: 0.33, attack: 0.04, decay: 0.85, vol: 0.22 })),
        same(L({ type: 'modal', freq: penta(d + 10), modes: [[1, 1, 1], [2.76, 0.4, 0.55], [5.4, 0.2, 0.3]], resQ: 14, exciterVol: 0.25, start: 0.34, attack: 0.002, decay: 1.0, vol: 0.22 }))
      ], { reverb: 0.12, gain: 0.9 });
    } },
    /* 挥动：真实破空声 + 粉红噪声多普勒带通。 */
    { id: 'whoosh', group: 'general', gen: () => {
      const a = r(0.08, 0.18), d = r(0.16, 0.28);
      return P([
        micro('whoosh-cuts', ri(0, 7), { pitch: r(-3, 2), vol: 0.85 }),
        L({ type: 'noise', color: 'pink', filter: 'bandpass', cutoff: r(300, 500), cutoffPeak: r(1500, 3500), cutoffEnd: r(250, 400), q: r(1, 2), attack: a, decay: d, vol: 0.65 })
      ], { reverb: 0.04, gain: 1.1 });
    } },

    /* ================= 第一批扩充（2026-11）：战斗 / 角色 / 环境 / 界面 ================= */
    /* 射箭 / 刀剑相击 / 脚步（石地）：真实录音（Freesound CC0，见 samples/CREDITS.md）为底，
       每次随机挑一段录音、随机微调音高和音量，再按情况组合，变体之间听得出差别但都是真实的质感。 */
    /* 射箭：两种射出（带破空声的整段 / 只有弓弦）任选其一；55% 的变体在箭飞出去之后接一声中靶（三段里随机一段）。 */
    { id: 'arrow', group: 'general', gen: () => {
      const loose = ri(0, 1), hit = chance(0.55);
      const layers = [take('arrow', loose, { pitch: r(-1.5, 1.5), vol: r(0.8, 0.95) })];
      if (loose === 1) layers.push(L({ type: 'noise', color: 'pink', filter: 'bandpass', cutoff: 900, cutoffPeak: r(3500, 5000), cutoffEnd: 1400, q: 2, start: 0.06, attack: 0.08, decay: r(0.15, 0.25), vol: 0.35 }));
      if (hit) layers.push(take('arrow', ri(2, 4), { start: r(0.28, 0.45), pitch: r(-2, 1), vol: r(0.75, 0.95) }));
      return P(layers, { reverb: r(0.05, 0.12), gain: 0.9 });
    } },
    /* 刀剑相击：真剑对砍的录音里切出 8 下，随机一下；三成变体是快速的两下（第二下换一段、轻一点）。 */
    { id: 'swordClash', group: 'general', gen: () => {
      const a = ri(0, 7), layers = [take('sword-clash', a, { pitch: r(-2.5, 1.5), vol: r(0.85, 0.95) })];
      if (chance(0.3)) layers.push(take('sword-clash', (a + ri(1, 7)) % 8, { start: r(0.1, 0.18), pitch: r(-2, 2), vol: r(0.55, 0.75) }));
      return P(layers, { reverb: r(0.08, 0.2), gain: 0.9 });
    } },
    /* 脚步（石地）：12 段真实的单步（登山靴和普通鞋各 6 步），每次随机一步、音高和轻重微调。 */
    { id: 'footstepStone', group: 'general', gen: () => P([
      take('footstep-stone', ri(0, 11), { pitch: r(-2, 1.5), vol: r(0.75, 0.95) })
    ], { reverb: r(0.03, 0.1), gain: 0.95 }) },
    /* 雨：大片的沙沙声（白噪声带通，微微起伏）+ 几十滴打在不同东西上的雨点（极短的正弦"嗒"，随机时刻、随机音高）
       + 低处的水声（棕色噪声）。约 4 秒，首尾淡入淡出，可以循环。小雨 / 中雨 / 大雨三种。 */
    { id: 'rain', group: 'general', gen: () => {
      const k = pick([0.5, 1, 1.6]), dur = 4;
      return P([
        L({ type: 'noise', filter: 'bandpass', cutoff: r(2500, 4000), cutoffEnd: r(2500, 4000), q: 0.5, attack: 0.6, hold: dur - 1.2, decay: 0.6, vol: 0.35 * k, trem: 0.15, tremRate: r(0.3, 0.7) }),
        L({ type: 'noise', color: 'pink', filter: 'lowpass', cutoff: 1500, cutoffEnd: 1500, attack: 0.6, hold: dur - 1.2, decay: 0.6, vol: 0.25 * k }),
        L({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: 350, cutoffEnd: 350, attack: 0.6, hold: dur - 1.2, decay: 0.6, vol: 0.3 * Math.min(1.3, k) }),
        L({ type: 'tone', freq: r(2200, 3200), freqEnd: r(3500, 4500), slideTime: 0.01, start: 0.3, attack: 0.0005, decay: r(0.008, 0.015), vol: 0.22, rep: Math.round(60 * k), repGap: (dur - 0.8) / (60 * k), jitter: 1, pitchJitter: 10 }),
        L({ type: 'noise', filter: 'bandpass', cutoff: 5000, cutoffEnd: 5000, q: 3, start: 0.3, attack: 0.0005, decay: 0.006, vol: 0.25, rep: Math.round(40 * k), repGap: (dur - 0.8) / (40 * k), jitter: 1, pitchJitter: 12 })
      ], { reverb: 0.2, gain: 1.1 });
    } },
    /* 通知：两个柔和的"叮"（类似马林巴：基音 + 很快消失的高泛音），第二个音往上走一个五声音阶的音程。 */
    { id: 'notify', group: 'general', gen: () => {
      const d = ri(13, 16), up = pick([1, 2, 3]), gap = r(0.11, 0.16);
      return P([
        same(L({ type: 'bell', freq: penta(d), partials: [[1, 1, 1], [3.93, 0.35, 0.25], [9.2, 0.12, 0.1]], attack: 0.002, decay: r(0.5, 0.8), vol: 0.35, rep: 2, repGap: gap, repStep: up })),
        L({ type: 'noise', filter: 'highpass', cutoff: 5000, cutoffEnd: 5000, attack: 0.0005, decay: 0.005, vol: 0.1, rep: 2, repGap: gap })
      ], { reverb: 0.22, gain: 1.3 });
    } },

    /* ================= 第一批扩充（续）：写实的用 CC0 录音为底，风和洞穴滴水用合成 ================= */
    /* 脚步（草地）：踩在草和落叶上的 8 段真实脚步，随机一步，音高和轻重微调 */
    { id: 'footstepGrass', group: 'general', gen: () => P([
      take('footstep-grass', ri(0, 7), { pitch: r(-2, 1.5), vol: r(0.75, 0.95) })
    ], { reverb: r(0.02, 0.08), gain: 1.3 }) },
    /* 落地：三段真实的跳起落地（硬地、普通地面、踩到树枝），四成变体垫一下低频的"咚"让它更重 */
    { id: 'land', group: 'general', gen: () => {
      const layers = [take('land', ri(0, 2), { pitch: r(-3, 1), vol: r(0.8, 0.95) })];
      if (chance(0.4)) layers.push(L({ type: 'tone', freq: r(85, 110), freqEnd: r(40, 50), slideTime: 0.05, attack: 0.001, decay: r(0.1, 0.16), vol: 0.45 }));
      return P(layers, { reverb: r(0.03, 0.1), gain: 0.95 });
    } },
    /* 格挡：盾牌 / 兵器挡下一击 = 录音里的金属撞击 + 合成的盾身闷响（低频下滑）+ 一点木头的"嗒" */
    { id: 'shieldBlock', group: 'general', gen: () => P([
      take('shield-block', ri(0, 5), { pitch: r(-4, 0.5), vol: r(0.75, 0.9) }),
      L({ type: 'tone', freq: r(130, 180), freqEnd: r(50, 65), slideTime: 0.05, attack: 0.001, decay: r(0.14, 0.22), vol: r(0.45, 0.65) }),
      L({ type: 'noise', filter: 'lowpass', cutoff: r(1200, 2000), cutoffEnd: 400, attack: 0.0005, decay: r(0.05, 0.09), vol: 0.4 })
    ], { reverb: r(0.08, 0.16), gain: 0.85 }) },
    /* 风：粉红噪声带通的"呼——"，中心频率随阵风先升后降；高处一缕窄带的哨音（q 很高、忽强忽弱）；
       底下棕色噪声的低吼。约 4 秒，首尾淡入淡出。轻风 / 阵风 / 狂风三种。 */
    { id: 'wind', group: 'general', gen: () => {
      const k = pick([0.6, 1, 1.4]), dur = r(3.5, 4.5);
      return P([
        L({ type: 'noise', color: 'pink', filter: 'bandpass', cutoff: r(250, 400), cutoffPeak: r(700, 1300) * k, cutoffEnd: r(250, 400), sweepTime: dur, q: r(0.8, 1.4), attack: dur * 0.35, hold: dur * 0.2, decay: dur * 0.45, vol: 0.9, trem: 0.25, tremRate: r(0.4, 0.9) }),
        L({ type: 'noise', filter: 'bandpass', cutoff: r(600, 900), cutoffPeak: r(1200, 1900) * Math.sqrt(k), cutoffEnd: r(700, 1000), sweepTime: dur, q: r(10, 18), attack: dur * 0.4, decay: dur * 0.6, vol: 0.25 * k, trem: 0.6, tremRate: r(0.8, 1.6) }),
        L({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: 180, cutoffPeak: 320, cutoffEnd: 160, sweepTime: dur, attack: dur * 0.3, hold: dur * 0.3, decay: dur * 0.4, vol: 0.5 * k })
      ], { reverb: 0.15, gain: 1.2 });
    } },
    /* 篝火：真实篝火的 5 秒录音（两段任选，首尾已对接，可以循环）；一半变体再加几下合成的木柴爆裂 */
    { id: 'campfire', group: 'general', gen: () => {
      const layers = [loopTake('campfire', ri(0, 1), { pitch: r(-1, 1), vol: 0.9 })];
      if (chance(0.5)) layers.push(L({ type: 'noise', filter: 'highpass', cutoff: 900, cutoffEnd: 900, start: 0.4, attack: 0.0005, decay: r(0.015, 0.03), vol: 0.25, rep: ri(3, 6), repGap: 0.8, jitter: 1, pitchJitter: 6 }));
      /* 录音里偶尔的大爆裂把整体标准化压低了，这里推高，爆裂由引擎的限幅器压住 */
      return P(layers, { reverb: 0.05, gain: 2.6 });
    } },
    /* 流水：溪水近距离录音 5 秒（两段任选，可循环），音高微调就像换了一段水流 */
    { id: 'stream', group: 'general', gen: () => P([
      loopTake('stream', ri(0, 1), { pitch: r(-1.5, 1.5), vol: 0.9 })
    ], { reverb: 0.05, gain: 0.55 }) },
    /* 洞穴滴水：水滴落进水洼的"咚"= 正弦波，音高在一瞬间往上扬（和冒泡同理），加上很长的洞穴混响和回声；
       几滴在随机时刻落下，底下一层很暗的空间底噪。 */
    { id: 'caveDrip', group: 'general', gen: () => {
      const f = r(700, 1300), n = ri(3, 6);
      return P([
        L({ type: 'tone', wave: 'sine', freq: f, freqEnd: f * r(1.5, 2), slideTime: 0.02, attack: 0.0008, decay: r(0.05, 0.09), vol: 0.6, rep: n, repGap: r(0.5, 0.8), jitter: 0.6, pitchJitter: 4 }),
        L({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: 220, cutoffEnd: 220, attack: 0.5, hold: n * 0.6, decay: 0.8, vol: 0.12 })
      ], { reverb: r(0.6, 0.8), echo: r(0.2, 0.35), echoTime: r(0.18, 0.3), gain: 1 });
    } },
    /* 翻页：7 段真实的翻书声（薄页、厚书页），随机一段 */
    { id: 'pageTurn', group: 'general', gen: () => P([
      take('page-turn', ri(0, 6), { pitch: r(-1.5, 1.5), vol: r(0.8, 0.95) })
    ], { reverb: r(0.02, 0.08), gain: 0.95 }) },
    /* 打字：老式打字机的真实按键声，随机敲 3–8 下（每下换一个键、间隔不等）；四分之一的变体最后"叮"一声换行 */
    { id: 'typing', group: 'general', gen: () => {
      const n = ri(3, 8), layers = [];
      let t = 0;
      for (let i = 0; i < n; i++) { layers.push(take('typewriter', ri(0, 11), { start: t, pitch: r(-1, 1), vol: r(0.6, 0.9) })); t += r(0.07, 0.17); }
      if (chance(0.25)) layers.push(take('typewriter', 12, { start: t + 0.1, vol: 0.8 }));
      return P(layers, { reverb: 0.05, gain: 1.2 });
    } },
    /* 开宝箱：三段真实录音（木箱慢慢打开的吱呀、宝箱开盖、木头吱嘎），随机一段；四成变体接一串"发现宝物"的风铃 */
    { id: 'chestOpen', group: 'general', gen: () => {
      const k = ri(0, 2), layers = [take('chest-open', k, { pitch: r(-2, 1), vol: 0.9 })];
      if (chance(0.4)) layers.push(same(L({ type: 'bell', freq: penta(ri(18, 21)), partials: [[1, 1, 1], [2.756, 0.4, 0.6], [5.404, 0.15, 0.35]], start: [1.2, 0.6, 0.5][k] + r(0, 0.2), attack: 0.002, decay: r(1.2, 1.8), vol: 0.12, rep: ri(3, 5), repGap: r(0.07, 0.11), repStep: 1 })));
      return P(layers, { reverb: r(0.1, 0.2), gain: 0.95 });
    } },
    /* 怪物低吼：四段真实的低吼 / 咆哮，随机一段，音高随机压低或抬高（越低越像大块头），垫一层低频的胸腔共鸣 */
    { id: 'monsterGrowl', group: 'general', gen: () => {
      const k = ri(0, 3), dur = [2.2, 1.95, 2.46, 3.1][k];
      return P([
        take('monster-growl', k, { pitch: r(-5, 1), vol: 0.9 }),
        L({ type: 'noise', color: 'brown', filter: 'lowpass', cutoff: 220, cutoffEnd: 120, attack: 0.15, decay: dur, vol: r(0.25, 0.4), trem: 0.4, tremRate: r(6, 11) })
      ], { reverb: r(0.12, 0.25), gain: 0.95 });
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
    q.seed = Math.floor(Math.random() * 999999) + 1;
    return q;
  }

  /* ==================== 调整词 ====================
     在当前声音上做一次有方向的整体调整（可以连点叠加）。每个函数返回新的 patch，不改原对象。
     音高类参数：freq/freqEnd/freqPeak 乘系数，录音层改 pitch（半音）；滤波类：cutoff/cutoffEnd/cutoffPeak 乘系数。 */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function eachLayer(p, fn) { const q = JSON.parse(JSON.stringify(p)); q.layers.forEach(l => fn(l, q)); return q; }
  const pitchBy = (l, ratio) => {
    if (l.type === 'sample') { l.pitch = (l.pitch || 0) + 12 * Math.log2(ratio); if (l.pitchEnd != null) l.pitchEnd += 12 * Math.log2(ratio); return; }
    if (l.type === 'noise') return;
    l.freq = clamp(l.freq * ratio, 20, 12000); l.freqEnd = clamp(l.freqEnd * ratio, 20, 12000);
    if (l.freqPeak) l.freqPeak = clamp(l.freqPeak * ratio, 20, 12000);
  };
  const cutoffBy = (l, ratio) => {
    if (!l.filter || l.filter === 'none') return;
    l.cutoff = clamp(l.cutoff * ratio, 40, 18000); l.cutoffEnd = clamp(l.cutoffEnd * ratio, 40, 18000);
    if (l.cutoffPeak) l.cutoffPeak = clamp(l.cutoffPeak * ratio, 40, 18000);
  };
  const lengthBy = (l, ratio) => { l.decay = clamp(l.decay * ratio, 0.005, 10); if (l.hold) l.hold = clamp(l.hold * ratio, 0, 10); };
  const TWEAKS = {
    heavier: p => eachLayer(p, l => { pitchBy(l, 0.82); lengthBy(l, 1.2); cutoffBy(l, 0.85); }),
    lighter: p => eachLayer(p, l => { pitchBy(l, 1.22); lengthBy(l, 0.85); cutoffBy(l, 1.15); }),
    farther: p => { const q = eachLayer(p, l => { cutoffBy(l, 0.6); l.attack = clamp(l.attack * 1.5, 0.0005, 2); l.bright = clamp((l.bright == null ? 0.5 : l.bright) - 0.15, 0, 1); }); q.reverb = clamp(q.reverb + 0.2, 0, 0.9); q.gain = clamp(q.gain * 0.8, 0.05, 2); return q; },
    closer: p => { const q = eachLayer(p, l => { cutoffBy(l, 1.25); l.attack = clamp(l.attack * 0.7, 0.0005, 2); }); q.reverb = clamp(q.reverb * 0.5, 0, 1); q.gain = clamp(q.gain * 1.12, 0.05, 2); return q; },
    brighter: p => eachLayer(p, l => { cutoffBy(l, 1.5); if (l.type === 'string') l.bright = clamp((l.bright == null ? 0.5 : l.bright) + 0.2, 0, 1); }),
    darker: p => eachLayer(p, l => { cutoffBy(l, 0.65); if (l.type === 'string') l.bright = clamp((l.bright == null ? 0.5 : l.bright) - 0.2, 0, 1); }),
    longer: p => { const q = eachLayer(p, l => lengthBy(l, 1.4)); q.reverb = clamp(q.reverb + 0.08, 0, 0.9); return q; },
    shorter: p => { const q = eachLayer(p, l => lengthBy(l, 0.65)); q.reverb = clamp(q.reverb * 0.7, 0, 1); return q; },
    punchier: p => { const q = eachLayer(p, l => { l.attack = clamp(l.attack * 0.5, 0.0005, 2); }); q.drive = clamp((q.drive || 0) + 0.2, 0, 1); q.gain = clamp(q.gain * 0.8, 0.05, 2); return q; },
    softer: p => { const q = eachLayer(p, l => { l.attack = clamp(l.attack * 1.6 + 0.004, 0.0005, 2); cutoffBy(l, 0.8); }); q.drive = clamp((q.drive || 0) - 0.25, 0, 1); q.crush = 0; q.gain = clamp(q.gain * 0.9, 0.05, 2); return q; },
    magical: p => { const q = eachLayer(p, l => { if (l.type !== 'noise' && l.type !== 'sample') l.vib = clamp((l.vib || 0) + 8, 0, 100); }); q.reverb = clamp(q.reverb + 0.2, 0, 0.9); q.echo = clamp((q.echo || 0) + 0.15, 0, 0.6); q.echoTime = q.echoTime || 0.18; return q; },
    retro: p => { const q = JSON.parse(JSON.stringify(p)); q.crush = q.crush ? clamp(q.crush - 1, 3, 16) : 7; q.reverb = q.reverb * 0.3; q.echo = 0; return q; }
  };

  /* 分类、标签、搜索关键词在 catalog.js */

  if (typeof window !== 'undefined') { window.SFX_PRESETS = PRESETS; window.SFX_MUTATE = mutate; window.SFX_SAMPLES = SAMPLES; window.SFX_TWEAKS = TWEAKS; }
  if (typeof module !== 'undefined' && module.exports) module.exports = { PRESETS, mutate, SAMPLES, TWEAKS };
})();
