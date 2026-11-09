/* ============================================================================
   SFX Brew · 无缝循环 + 游戏引擎导出（网页编辑器和 npm 包共用）
   ----------------------------------------------------------------------------
   1. 无缝循环 makeLoop()
      环境音的预设每次只生成 4~10 秒、头尾淡入淡出的一段，直接循环会"一轻一重"。这里的做法：
        · 渲染若干段（第一段是原声音，后面每段在原参数上做很小的随机微调 + 换随机种子，录音素材轮换不同的段），
          这样拼出来不会每两秒就听出重复；
        · 每段切掉淡入淡出，只留"持续"的中间部分（按 20ms 的响度找第一帧和最后一帧够响的位置）；
        · 每段统一响度，首尾用等功率交叉淡化（sin/cos，0.5 秒）一段接一段排开，最后一段的尾巴绕回去叠在第一段开头上。
          所以文件最后一个采样接回第一个采样是连续的，循环播放听不出接缝。
   2. WAV 编码 encodeWav()：循环文件额外写一个 smpl 块（循环点 = 整个文件），Godot / FMOD / Wwise / GameMaker 会自动识别。
   3. 引擎文件：Godot 的 AudioStreamRandomizer (.tres)、Unity 的播放脚本、网页游戏用的 JS、说明 README。
   浏览器里挂在 window.SFX_EXPORT，Node 里 require('./export.js')。
   ==========================================================================*/
(function () {
  'use strict';

  /* 适合做成循环的预设和做法：
       bed     连续的声音（雨、风、水、火、鼓阵）：切掉淡入淡出，一段段交叉淡化接起来
       scatter 一下一下的声音（风铃、滴水、雷、低吼）：整个声音连同自然的尾巴，按随机间隔错开叠放，
               间隔 = 声音长度 × [gap 最小, 最大]，超出结尾的部分绕回开头叠上，所以同样无缝 */
  const LOOP_MODES = {
    rain: { mode: 'bed' }, wind: { mode: 'bed' }, campfire: { mode: 'bed' }, stream: { mode: 'bed' }, drum: { mode: 'bed' },
    caveDrip: { mode: 'scatter', gap: [0.55, 0.85] }, thunder: { mode: 'scatter', gap: [0.5, 1.1] },
    chime: { mode: 'scatter', gap: [0.25, 0.7] }, monsterGrowl: { mode: 'scatter', gap: [0.6, 1.2] }
  };
  const LOOPABLE = Object.keys(LOOP_MODES);
  const LOOP_SECONDS = [10, 30, 60];

  /* 第 i 段用的参数：i = 0 原样；之后小幅微调 + 新随机种子；多段录音素材换到下一段 */
  function variant(patch, i, samples, mutate) {
    if (!i) return patch;
    const q = mutate ? mutate(patch, 0.06) : JSON.parse(JSON.stringify(patch));
    q.seed = ((patch.seed || 1) * 31 + i * 7919) % 999983 + 1;
    q.layers.forEach((l, li) => {
      const m = l.type === 'sample' && samples && samples[l.sample];
      if (!m || !m.takes || !m.slot) return;
      const orig = patch.layers[li];
      const k0 = Math.floor((orig.offset || 0) / m.slot), within = (orig.offset || 0) - k0 * m.slot;
      l.offset = ((k0 + i) % m.takes) * m.slot + within;
      l.pitch = orig.pitch; l.hold = orig.hold; l.attack = orig.attack; l.decay = orig.decay;
    });
    return q;
  }

  /* 找出"持续"部分：20ms 一帧的响度，参考值取够响的帧里的 70 分位，取第一帧和最后一帧超过参考值一半的位置 */
  function steadyRange(d, sr) {
    const fr = Math.max(1, Math.floor(sr * 0.02)), rms = [];
    for (let i = 0; i + fr <= d.length; i += fr) {
      let s = 0;
      for (let j = i; j < i + fr; j++) s += d[j] * d[j];
      rms.push(Math.sqrt(s / fr));
    }
    const loud = rms.filter(x => x > 1e-4).sort((a, b) => a - b);
    if (!loud.length) return [0, d.length];
    const thr = loud[Math.floor(loud.length * 0.7)] * 0.5;
    let a = 0, b = rms.length - 1;
    while (a < b && rms[a] < thr) a++;
    while (b > a && rms[b] < thr) b--;
    return [a * fr, Math.min(d.length, (b + 1) * fr)];
  }

  function rmsOf(d) {
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    return Math.sqrt(s / Math.max(1, d.length));
  }

  /**
   * 生成无缝循环。render(patch, sr) → Promise<AudioBuffer>（引擎的 SFX.render）。
   * 返回 Float32Array，长度约等于 seconds（按整段拼出来，误差在一段以内）。
   */
  async function makeLoop(render, patch, opt) {
    opt = opt || {};
    const how = opt.mode || (opt.preset && LOOP_MODES[opt.preset]) || { mode: 'bed' };
    if (how.mode === 'scatter') return scatterLoop(render, patch, opt, how);
    const sr = opt.sampleRate || 44100, target = Math.round((opt.seconds || 10) * sr);
    const X = Math.round(sr * (opt.crossfade || 0.5));
    const segs = [];
    let total = 0, ref = 0;
    for (let i = 0; total < target && i < 64; i++) {
      const buf = await render(variant(patch, i, opt.samples, opt.mutate), sr);
      const d = buf.getChannelData(0);
      let [a, b] = steadyRange(d, sr);
      /* 太短（比如只有一下鼓）：整段都用 */
      if (b - a < 3 * X) { a = 0; b = d.length; }
      if (b - a < 3 * X) throw new Error('this sound is too short to loop');
      const seg = d.slice(a, b), lv = rmsOf(seg);
      if (!ref) ref = lv;
      if (lv > 0) { const k = Math.min(2, ref / lv); for (let j = 0; j < seg.length; j++) seg[j] *= k; }
      segs.push(seg);
      total += seg.length - X;
      if (opt.onProgress) opt.onProgress(Math.min(1, total / target));
    }
    const N = total, out = new Float32Array(N);
    let pos = 0;
    segs.forEach(seg => {
      const len = seg.length;
      for (let j = 0; j < len; j++) {
        let w = 1;
        if (j < X) w = Math.sin(Math.PI / 2 * j / X);
        else if (j >= len - X) w = Math.cos(Math.PI / 2 * (j - (len - X)) / X);
        out[(pos + j) % N] += seg[j] * w;
      }
      pos += len - X;
    });
    let peak = 0;
    for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 0.95) for (let i = 0; i < N; i++) out[i] *= 0.95 / peak;
    return out;
  }

  /* 小的可复现随机数（mulberry32），同一个 seed 得到同一个循环 */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* scatter：长度正好 seconds；声音按随机间隔排开，绕回开头叠加 */
  async function scatterLoop(render, patch, opt, how) {
    const sr = opt.sampleRate || 44100, N = Math.round((opt.seconds || 10) * sr), out = new Float32Array(N);
    const rnd = rng((patch.seed || 1) * 7 + 3), gap = how.gap || [0.6, 1.2];
    let pos = Math.floor(rnd() * sr * 0.3);
    for (let i = 0; pos < N && i < 200; i++) {
      const d = (await render(variant(patch, i, opt.samples, opt.mutate), sr)).getChannelData(0);
      let end = d.length - 1;
      while (end > 0 && Math.abs(d[end]) < 0.0005) end--;
      const len = Math.min(end + 1, N);
      for (let j = 0; j < len; j++) out[(pos + j) % N] += d[j];
      pos += Math.max(Math.floor(sr * 0.3), Math.floor(len * (gap[0] + rnd() * (gap[1] - gap[0]))));
      if (opt.onProgress) opt.onProgress(Math.min(1, pos / N));
    }
    let peak = 0;
    for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 0.95) for (let i = 0; i < N; i++) out[i] *= 0.95 / peak;
    return out;
  }

  /**
   * Float32Array → 16 位单声道 WAV（Uint8Array）。
   * loop: true 时不裁尾部、加 smpl 块（循环 = 整个文件）；否则裁掉尾部静音。
   */
  function encodeWav(src, sr, opt) {
    opt = opt || {};
    let n = src.length;
    if (!opt.loop) {
      let end = n - 1;
      while (end > 0 && Math.abs(src[end]) < 0.0008) end--;
      n = Math.min(n, end + Math.floor(sr * 0.02));
    }
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(src[i]));
    const k = peak > 0.98 ? 0.98 / peak : 1;
    const smpl = opt.loop ? 8 + 36 + 24 : 0;
    const out = new DataView(new ArrayBuffer(44 + n * 2 + smpl));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 2 + smpl, true); str(8, 'WAVE'); str(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
    str(36, 'data'); out.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, src[i] * k)) * 0x7fff), true);
    if (opt.loop) {
      const o = 44 + n * 2;
      str(o, 'smpl'); out.setUint32(o + 4, 36 + 24, true);
      out.setUint32(o + 16, Math.round(1e9 / sr), true);   // sample period (ns)
      out.setUint32(o + 20, 60, true);                     // MIDI unity note
      out.setUint32(o + 36, 1, true);                      // number of loops
      out.setUint32(o + 52, 0, true);                      // loop type: forward
      out.setUint32(o + 56, 0, true);                      // loop start
      out.setUint32(o + 60, n - 1, true);                  // loop end (inclusive)
    }
    return new Uint8Array(out.buffer);
  }

  /* ==================== 引擎文件 ==================== */
  const ident = s => s.replace(/[^A-Za-z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^[^A-Za-z_]/, '_$&');

  /** Godot 4：AudioStreamRandomizer，每次播放随机一个变体（循环音的 WAV 自带循环点，导入时自动识别） */
  function godotTres(folder, files, loop) {
    let s = '[gd_resource type="AudioStreamRandomizer" load_steps=' + (files.length + 1) + ' format=3]\n\n';
    files.forEach((f, i) => { s += '[ext_resource type="AudioStream" path="res://' + folder + '/wav/' + f + '" id="' + (i + 1) + '"]\n'; });
    s += '\n[resource]\n';
    s += loop ? 'random_pitch = 1.0\nrandom_volume_offset_db = 0.0\n' : 'random_pitch = 1.04\nrandom_volume_offset_db = 1.0\n';
    s += 'streams_count = ' + files.length + '\n';
    files.forEach((f, i) => { s += 'stream_' + i + '/stream = ExtResource("' + (i + 1) + '")\nstream_' + i + '/weight = 1.0\n'; });
    return s;
  }

  /** Unity：挂在物体上，把 WAV 拖进 Clips。一次性音效调用 Play()，循环音勾上 Loop 会自动开始播放 */
  function unityCs() {
    return `// SFX Brew player for Unity (free for commercial use) — https://sfxbrew.com
// 1. Drag the WAV files from wav/ into your Assets folder.
// 2. Add this component to a GameObject and drag the clips into "Clips".
// 3. One-shots: call GetComponent<SfxBrewPlayer>().Play() — each call picks a random variation.
//    Loops: tick "Loop" and it starts on its own; a new variation is chosen each time Play() is called.
using UnityEngine;

[RequireComponent(typeof(AudioSource))]
public class SfxBrewPlayer : MonoBehaviour
{
    public AudioClip[] clips;
    public bool loop = false;
    [Range(0f, 0.3f)] public float pitchVariation = 0.04f;
    [Range(0f, 0.5f)] public float volumeVariation = 0.1f;

    AudioSource source;
    int last = -1;

    void Awake()
    {
        source = GetComponent<AudioSource>();
        source.playOnAwake = false;
        if (loop) Play();
    }

    public void Play()
    {
        if (clips == null || clips.Length == 0) return;
        int i = Random.Range(0, clips.Length);
        if (clips.Length > 1 && i == last) i = (i + 1) % clips.Length;
        last = i;
        if (loop)
        {
            source.clip = clips[i];
            source.loop = true;
            source.pitch = 1f;
            source.Play();
        }
        else
        {
            source.pitch = 1f + Random.Range(-pitchVariation, pitchVariation);
            source.PlayOneShot(clips[i], 1f - Random.Range(0f, volumeVariation));
        }
    }

    public void Stop() { source.Stop(); }
}
`;
  }

  /** 网页游戏：原生 Web Audio，按需加载 WAV。一次性音效随机变体；循环音用 AudioBufferSourceNode.loop，采样级无缝 */
  function webJs(name, files, loop) {
    const id = ident(name), Id = id.charAt(0).toUpperCase() + id.slice(1);
    return `// SFX Brew — ${name} (free for commercial use) — https://sfxbrew.com
// Put this file next to the wav/ folder (or change BASE). Browsers only allow audio after a user click/tap.
${loop ? `//   start${Id}()  starts the seamless loop (fades in), stop${Id}() fades it out.` : `//   play${Id}()  plays a random variation.`}
const ${id}Sfx = (() => {
  const BASE = new URL('../wav/', document.currentScript ? document.currentScript.src : location.href).href;
  const FILES = ${JSON.stringify(files)};
  let ctx, buffers, last = -1, current = null;
  async function load() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    buffers = buffers || await Promise.all(FILES.map(f => fetch(BASE + f).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b))));
    return buffers;
  }
  function pick(n) { let i = Math.floor(Math.random() * n); if (n > 1 && i === last) i = (i + 1) % n; return (last = i); }
  return {
    load,
    async play(volume = 1) {
      const b = await load(), src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b[pick(b.length)];
${loop ? `      src.loop = true;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1);
      this.stop();
      current = { src, g };` : `      src.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.04;
      g.gain.value = volume * (1 - Math.random() * 0.1);`}
      src.connect(g).connect(ctx.destination);
      src.start();
      return src;
    },
    stop(fade = 1) {
      if (!current) return;
      const { src, g } = current; current = null;
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
      src.stop(ctx.currentTime + fade + 0.05);
    }
  };
})();
${loop ? `function start${Id}(volume) { return ${id}Sfx.play(volume); }
function stop${Id}(fade) { ${id}Sfx.stop(fade); }` : `function play${Id}(volume) { return ${id}Sfx.play(volume); }`}
`;
  }

  function readme(o) {
    const loop = o.loop, folder = o.folder, n = o.files.length;
    return `SFX Brew — ${o.title}
${'='.repeat(10 + o.title.length)}
${n} ${loop ? 'seamless loop' + (n > 1 ? 's' : '') + ' (~' + o.seconds + ' s each)' : 'variations'} made with SFX Brew — https://sfxbrew.com
License: free for commercial and non-commercial use, no attribution required.
${o.link ? 'Open this sound in the editor: ' + o.link + '\n' : ''}
wav/
  16-bit mono 44.1 kHz WAV files.${loop ? `
  Each file loops seamlessly end-to-end and carries a loop point ("smpl" chunk),
  so Godot, FMOD, Wwise and GameMaker loop it automatically.` : `
  Play a random one each time so repeated sounds don't feel robotic.`}

godot/${o.name}.tres  (Godot 4)
  Copy this whole folder into your project as res://${folder}/ (keep the name),
  then use ${o.name}.tres as the stream of an AudioStreamPlayer / AudioStreamPlayer2D / 3D.
  It is an AudioStreamRandomizer: every play() picks a random file${loop ? '' : ' with slight pitch/volume variation'}.${loop ? `
  The WAVs import as looping (Import dock → Loop Mode "Detect From WAV", the default).` : ''}

unity/SfxBrewPlayer.cs  (Unity)
  Put the WAVs and this script in Assets/, add SfxBrewPlayer to a GameObject,
  drag the clips into "Clips"${loop ? ' and tick "Loop".' : ', then call Play() from your code.'}

web/${o.name}.js  (browser games, plain Web Audio, no library)
  <script src="web/${o.name}.js"></script>, then ${loop ? `start${o.fn}() / stop${o.fn}()` : `play${o.fn}()`} after a user click.
  Uses AudioBufferSourceNode${loop ? '.loop for a gap-free loop' : ''}. For Howler.js: new Howl({ src: ['wav/${o.files[0]}']${loop ? ', loop: true' : ''} }).
${o.samples ? `
Some layers use short CC0 recordings from Freesound: https://sfxbrew.com/samples/CREDITS.md
` : ''}`;
  }

  /**
   * 组装引擎包里的文件。wavs: [{name: 'rain-01.wav', data: Uint8Array}]
   * 返回 [{name: 'sfxbrew-rain/godot/rain.tres', data}]（直接交给 zip）
   */
  function packFiles(o) {
    const enc = s => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Buffer.from(s));
    const folder = 'sfxbrew-' + o.name, names = o.wavs.map(w => w.name);
    const id = ident(o.name), fn = id.charAt(0).toUpperCase() + id.slice(1);
    return [
      ...o.wavs.map(w => ({ name: folder + '/wav/' + w.name, data: w.data })),
      { name: folder + '/godot/' + o.name + '.tres', data: enc(godotTres(folder, names, o.loop)) },
      { name: folder + '/unity/SfxBrewPlayer.cs', data: enc(unityCs()) },
      { name: folder + '/web/' + o.name + '.js', data: enc(webJs(o.name, names, o.loop)) },
      { name: folder + '/README.txt', data: enc(readme(Object.assign({ folder, fn, files: names }, o))) }
    ];
  }

  const API = { LOOPABLE, LOOP_MODES, LOOP_SECONDS, variant, steadyRange, makeLoop, encodeWav, godotTres, unityCs, webJs, readme, packFiles };
  if (typeof window !== 'undefined') window.SFX_EXPORT = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
