/* ============================================================================
   SFX Brew · 音频处理（任何音频，不只是 SFX Brew 生成的）
   ----------------------------------------------------------------------------
   sfxbrew process <文件或文件夹...> --out dir [选项]   →  游戏能直接用的文件
   sfxbrew analyze <文件或文件夹...>                  →  只看响度/峰值/时长/首尾静音

   一条流水线，每个文件按这个顺序走（没开的步骤跳过）：
     解码（wav/mp3/ogg/flac，node-web-audio-api，顺便重采样到 --rate）
     → 声道（--mono / --stereo）
     → 切片（--slice：按静音切成多段）
     → 裁首尾静音（--trim）
     → 淡入淡出（--fade-in / --fade-out，毫秒）
     → 响度统一（--lufs，ITU-R BS.1770 积分响度；--peak 是峰值上限，默认 -1 dBFS）
     → 循环（--loop：WAV 写 smpl 循环点；--loop-crossfade 毫秒：尾巴叠回开头，保证无缝）
     → 命名（--name door → door-01.wav, door-02.wav ...）
     → 编码（wav 16/24 位；mp3/ogg 要本机装了 ffmpeg）
     → 音频图集（--sprite ui：全部拼成 ui.wav + ui.json，Howler.js 可直接用）
   纯 JS，WAV 输出不需要 ffmpeg。
   ==========================================================================*/
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const INPUT_EXT = ['.wav', '.mp3', '.ogg', '.flac', '.oga', '.aif', '.aiff'];
const FORMATS = ['wav', 'mp3', 'ogg'];

let _OAC;
function OAC() {
  if (!_OAC) _OAC = require('node-web-audio-api').OfflineAudioContext;
  return _OAC;
}

/* ---------- 输入 ---------- */

/** 文件和文件夹 → 按名字排序的音频文件列表（文件夹默认只看一层，recursive 时往下找） */
function listInputs(inputs, recursive) {
  const out = [];
  const walk = (dir, deep) => {
    fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })).forEach(e => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (deep) walk(p, deep); }
      else if (INPUT_EXT.includes(path.extname(e.name).toLowerCase())) out.push(p);
    });
  };
  for (const i of [].concat(inputs || [])) {
    if (!fs.existsSync(i)) throw new Error('not found: ' + i);
    if (fs.statSync(i).isDirectory()) walk(i, !!recursive);
    else out.push(i);
  }
  if (!out.length) throw new Error('no audio files found (looked for ' + INPUT_EXT.join(' ') + ')');
  return out.map(p => path.resolve(p));
}

/* 原始采样率：从文件头读（wav / flac / ogg vorbis / mp3），读不出来返回 null。
   node-web-audio-api 解码时自带的重采样会削掉高频（实测 48k→44.1k 粉噪高频少 1.6 dB），
   所以先按原采样率解码，再用下面的 sinc 重采样。 */
function nativeRate(b) {
  const s = (o, n) => b.toString('latin1', o, o + n);
  try {
    if (s(0, 4) === 'RIFF' && s(8, 4) === 'WAVE') {
      for (let o = 12; o + 8 <= b.length; o += 8 + b.readUInt32LE(o + 4) + (b.readUInt32LE(o + 4) & 1))
        if (s(o, 4) === 'fmt ') return b.readUInt32LE(o + 12);
    }
    if (s(0, 4) === 'fLaC') return (b[18] << 12) | (b[19] << 4) | (b[20] >> 4);
    if (s(0, 4) === 'OggS') { const i = b.indexOf('\x01vorbis', 0, 'latin1'); if (i > 0) return b.readUInt32LE(i + 12); const j = b.indexOf('OpusHead', 0, 'latin1'); if (j > 0) return 48000; }
    let o = 0;
    if (s(0, 3) === 'ID3') o = 10 + ((b[6] & 127) << 21 | (b[7] & 127) << 14 | (b[8] & 127) << 7 | (b[9] & 127));
    for (; o + 4 < b.length && o < 1 << 20; o++) if (b[o] === 0xff && (b[o + 1] & 0xe0) === 0xe0) {
      const ver = (b[o + 1] >> 3) & 3, idx = (b[o + 2] >> 2) & 3;
      if (ver === 1 || idx === 3) continue;
      return [44100, 48000, 32000][idx] / (ver === 3 ? 1 : ver === 2 ? 2 : 4);
    }
  } catch (e) { /* 文件头坏了就交给解码器 */ }
  return null;
}

/* Kaiser 窗 sinc 重采样（两边各 32 个过零点，截止频率留 5% 余量），音质接近 ffmpeg 的 swr */
function bessel0(x) { let s = 1, t = 1; for (let k = 1; k < 30; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; }
function resample(x, from, to) {
  if (from === to) return x;
  const ratio = to / from, n = Math.round(x.length * ratio), y = new Float32Array(n);
  const fc = Math.min(1, ratio) * 0.95, W = 32 / fc, beta = 8.6, ib = 1 / bessel0(beta);
  for (let i = 0; i < n; i++) {
    const t = i / ratio, lo = Math.max(0, Math.ceil(t - W)), hi = Math.min(x.length - 1, Math.floor(t + W));
    let acc = 0;
    for (let j = lo; j <= hi; j++) {
      const d = t - j, r = d / W;
      const w = bessel0(beta * Math.sqrt(Math.max(0, 1 - r * r))) * ib;
      const a = Math.PI * fc * d;
      acc += x[j] * w * (a === 0 ? fc : fc * Math.sin(a) / a);
    }
    y[i] = acc;
  }
  return y;
}

/** 解码成 { sr, ch: Float32Array[] }，重采样到 rate（rate 为空就保留原采样率） */
async function decode(file, rate) {
  const b = fs.readFileSync(file);
  const src = nativeRate(b) || rate || 44100;
  rate = rate || src;
  const ctx = new (OAC())(1, 1, src);
  let buf;
  try { buf = await ctx.decodeAudioData(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
  catch (e) { throw new Error('could not decode ' + path.basename(file) + ': ' + e.message); }
  const ch = [];
  for (let c = 0; c < buf.numberOfChannels; c++) ch.push(resample(Float32Array.from(buf.getChannelData(c)), buf.sampleRate, rate));
  return { sr: rate, sourceRate: buf.sampleRate, ch };
}

/* ---------- 测量 ---------- */

/* BS.1770 的 K 加权：高架 + 高通两个 biquad，按采样率现算系数（与 pyloudnorm 同一套公式） */
function biquad(type, fc, G, Q, sr) {
  const A = Math.pow(10, G / 40), w = 2 * Math.PI * fc / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * Q), sq = 2 * Math.sqrt(A) * al;
  let b, a;
  if (type === 'shelf') {
    b = [A * ((A + 1) + (A - 1) * cs + sq), -2 * A * ((A - 1) + (A + 1) * cs), A * ((A + 1) + (A - 1) * cs - sq)];
    a = [(A + 1) - (A - 1) * cs + sq, 2 * ((A - 1) - (A + 1) * cs), (A + 1) - (A - 1) * cs - sq];
  } else {
    b = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    a = [1 + al, -2 * cs, 1 - al];
  }
  return { b: b.map(x => x / a[0]), a: [1, a[1] / a[0], a[2] / a[0]] };
}
function filt(x, f) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = f.b[0] * x[i] + f.b[1] * x1 + f.b[2] * x2 - f.a[1] * y1 - f.a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

/** 积分响度（LUFS）。400ms 块、75% 重叠、-70 绝对门限、-10 相对门限。短于 400ms 的声音整段算一个块。 */
function lufs(ch, sr) {
  const shelf = biquad('shelf', 1681.974450955533, 3.999843853973347, 0.7071752369554196, sr);
  const hp = biquad('hp', 38.13547087602444, 0, 0.5003270373238773, sr);
  const k = ch.map(c => filt(filt(c, shelf), hp));
  const n = ch[0].length;
  if (!n) return -Infinity;
  const blk = Math.min(n, Math.round(0.4 * sr)), step = Math.max(1, Math.round(blk / 4));
  const z = [];
  for (let s = 0; s + blk <= n; s += step) {
    let sum = 0;
    for (const c of k) { let e = 0; for (let i = s; i < s + blk; i++) e += c[i] * c[i]; sum += e / blk; }
    z.push(sum);
  }
  const L = e => -0.691 + 10 * Math.log10(e);
  const gate = (arr, thr) => arr.filter(e => L(e) > thr);
  let g = gate(z, -70);
  if (!g.length) return -Infinity;
  const mean = arr => arr.reduce((s, e) => s + e, 0) / arr.length;
  g = gate(g, L(mean(g)) - 10);
  return g.length ? L(mean(g)) : -Infinity;
}

const db = x => x > 0 ? 20 * Math.log10(x) : -Infinity;
function peakOf(ch) { let p = 0; for (const c of ch) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > p) p = a; } return p; }
/** 每个采样取所有声道里绝对值最大的那个（判断静音用） */
function envelope(ch) {
  const n = ch[0].length, e = new Float32Array(n);
  for (const c of ch) for (let i = 0; i < n; i++) { const a = Math.abs(c[i]); if (a > e[i]) e[i] = a; }
  return e;
}
/** 第一个/最后一个超过门限的采样 */
function soundRange(ch, thrDb) {
  const e = envelope(ch), t = Math.pow(10, thrDb / 20);
  let a = 0, b = e.length - 1;
  while (a < e.length && e[a] < t) a++;
  while (b > a && e[b] < t) b--;
  return a >= e.length ? null : [a, b + 1];
}

function stats(ch, sr, thrDb) {
  const n = ch[0].length, pk = peakOf(ch), r = soundRange(ch, thrDb == null ? -50 : thrDb);
  let clipped = 0;
  for (const c of ch) for (let i = 0; i < c.length; i++) if (Math.abs(c[i]) >= 0.9999) clipped++;
  const L = lufs(ch, sr);
  return {
    seconds: +(n / sr).toFixed(3), sampleRate: sr, channels: ch.length,
    lufs: isFinite(L) ? +L.toFixed(1) : null, peakDb: isFinite(db(pk)) ? +db(pk).toFixed(1) : null,
    leadingSilence: r ? +(r[0] / sr).toFixed(3) : +(n / sr).toFixed(3), trailingSilence: r ? +((n - r[1]) / sr).toFixed(3) : 0,
    clippedSamples: clipped
  };
}

/* ---------- 处理步骤 ---------- */

const slice = (ch, a, b) => ch.map(c => c.slice(a, b));

function toChannels(ch, want) {
  if (want === 1 && ch.length > 1) {
    const m = new Float32Array(ch[0].length);
    for (const c of ch) for (let i = 0; i < m.length; i++) m[i] += c[i] / ch.length;
    return [m];
  }
  if (want === 2 && ch.length === 1) return [ch[0], Float32Array.from(ch[0])];
  if (want === 2 && ch.length > 2) return [ch[0], ch[1]];
  return ch;
}

/** 按静音切段：连续 minSilence 秒都低于门限就算断开；短于 minLength 的段扔掉（多半是噪声） */
function splitOnSilence(ch, sr, o) {
  const e = envelope(ch), t = Math.pow(10, o.threshold / 20), gap = Math.round(o.minSilence * sr), minLen = Math.round(o.minLength * sr);
  const segs = [];
  let start = -1, quiet = 0;
  for (let i = 0; i < e.length; i++) {
    if (e[i] >= t) { if (start < 0) start = i; quiet = 0; }
    else if (start >= 0 && ++quiet >= gap) { segs.push([start, i - quiet + 1]); start = -1; quiet = 0; }
  }
  if (start >= 0) segs.push([start, e.length - quiet]);
  return segs.filter(([a, b]) => b - a >= minLen);
}

/** 裁首尾静音：开头留 padStart 秒（不切掉起音），结尾留 padEnd 秒（保留自然尾音） */
function trimSilence(ch, sr, o) {
  const r = soundRange(ch, o.threshold);
  if (!r) return null;
  const a = Math.max(0, r[0] - Math.round(o.padStart * sr)), b = Math.min(ch[0].length, r[1] + Math.round(o.padEnd * sr));
  return slice(ch, a, b);
}

function fade(ch, sr, inSec, outSec) {
  const n = ch[0].length, fi = Math.min(n, Math.round(inSec * sr)), fo = Math.min(n, Math.round(outSec * sr));
  for (const c of ch) {
    for (let i = 0; i < fi; i++) c[i] *= i / fi;
    for (let i = 0; i < fo; i++) c[n - 1 - i] *= i / fo;
  }
  return ch;
}

/** 无缝循环：把最后 x 秒用等功率交叉淡化叠到开头，文件变短 x 秒，最后一个采样接回第一个是连续的 */
function loopCrossfade(ch, sr, sec) {
  const n = ch[0].length, x = Math.round(sec * sr);
  if (x <= 0) return ch;
  if (x * 2 > n) throw new Error('loop crossfade (' + sec + ' s) is longer than half the sound');
  return ch.map(c => {
    const o = c.slice(0, n - x);
    for (let i = 0; i < x; i++) {
      const t = (i + 0.5) / x;
      o[i] = c[i] * Math.sin(t * Math.PI / 2) + c[n - x + i] * Math.cos(t * Math.PI / 2);
    }
    return o;
  });
}

/* 峰值限制器（离线，所以可以"提前看"）：每个采样算出要压多少，向前取 lookahead 内最小值，
   再做一次同长度的滑动平均当起音（平均值不会大于峰值处要求的值，所以峰值一定压得住），
   释放按指数回到 1。返回压完的声道。 */
function limiter(ch, sr, ceil, o) {
  const n = ch[0].length, L = Math.max(1, Math.round((o && o.lookahead || 0.005) * sr));
  const rc = 1 - Math.exp(-1 / ((o && o.release || 0.08) * sr));
  const req = new Float32Array(n);
  const e = envelope(ch);
  for (let i = 0; i < n; i++) req[i] = e[i] > ceil ? ceil / e[i] : 1;
  /* 向前看的滑动最小值（单调队列） */
  const mn = new Float32Array(n), q = [];
  let qh = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (q.length > qh && req[q[q.length - 1]] >= req[i]) q.pop();
    q.push(i);
    if (qh >= q.length) qh = q.length - 1;
    while (q[qh] > i + L) qh++;
    mn[i] = req[q[qh]];
  }
  /* 滑动平均（窗口 [i-L+1, i]）当起音，再做释放 */
  const g = new Float32Array(n);
  let acc = 0, y = mn[0];
  for (let i = 0; i < n; i++) {
    acc += mn[i] - (i >= L ? mn[i - L] : 0);
    const avg = (acc + (i < L ? (L - 1 - i) * mn[0] : 0)) / L;   // 开头之前按第一个值算，开头的峰值也压得住
    y = Math.min(avg, y + (1 - y) * rc);
    g[i] = y;
  }
  for (const c of ch) for (let i = 0; i < n; i++) c[i] *= g[i];
  return ch;
}

/** 响度统一。默认增益会让峰值超过上限时，只加到上限为止（不改变声音），在结果里说明差了多少；
    limit 开着就用限制器压住峰值，响度能到目标（瞬态会稍微变钝）。 */
function normalize(ch, sr, o) {
  const before = lufs(ch, sr), ceil = Math.pow(10, o.peak / 20), pk0 = peakOf(ch);
  /* 限制器最多压 maxReduction dB：再多就把打击声的瞬态压扁了，宁可差一点响度 */
  const maxGain = pk0 > 0 ? ceil / pk0 * Math.pow(10, (o.limit ? (o.maxReduction == null ? 6 : o.maxReduction) : 0) / 20) : 1;
  let total = 1, note = null;
  const apply = g => { if (g !== 1) for (const c of ch) for (let i = 0; i < c.length; i++) c[i] *= g; total *= g; };
  const toward = target => apply(Math.min(Math.pow(10, (target - lufs(ch, sr)) / 20), maxGain / total));
  if (o.lufs != null && !isFinite(before)) note = 'too quiet to measure loudness, left unchanged';
  else if (o.lufs != null) {
    toward(o.lufs);
    /* 压峰值会让响度掉一点：压 → 再补增益，最多 6 轮，最后一步总是压峰值 */
    for (let k = 0; o.limit && k < 6 && peakOf(ch) > ceil; k++) {
      limiter(ch, sr, ceil * 0.999);
      if (o.lufs - lufs(ch, sr) < 0.1 || total >= maxGain * 0.999) break;
      toward(o.lufs);
    }
    if (o.limit && peakOf(ch) > ceil) limiter(ch, sr, ceil * 0.999);
    const pk = peakOf(ch);
    if (pk > ceil) apply(ceil / pk);
    const short = o.lufs - lufs(ch, sr);
    if (short > 0.5) note = (o.limit ? 'limiter capped at ' + (o.maxReduction == null ? 6 : o.maxReduction) + ' dB to keep the attack, ' : 'peak ceiling ' + o.peak + ' dBFS reached, ') +
      short.toFixed(1) + ' LU short of target' + (o.limit ? '' : ' (add limit to reach it)');
  } else if (pk0 > ceil) apply(ceil / pk0);
  return { ch, gainDb: +db(total).toFixed(2), note };
}

/* ---------- 编码 ---------- */

function encodeWav(ch, sr, o) {
  o = o || {};
  const bits = o.bits === 24 ? 24 : 16, B = bits / 8, nc = ch.length, n = ch[0].length;
  const smpl = o.loop ? 8 + 60 : 0, data = n * nc * B;
  const b = Buffer.alloc(44 + data + smpl);
  b.write('RIFF', 0); b.writeUInt32LE(36 + data + smpl, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(nc, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * nc * B, 28); b.writeUInt16LE(nc * B, 32); b.writeUInt16LE(bits, 34);
  b.write('data', 36); b.writeUInt32LE(data, 40);
  let p = 44;
  const max = bits === 24 ? 0x7fffff : 0x7fff;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const v = Math.round(Math.max(-1, Math.min(1, ch[c][i])) * max);
    if (bits === 24) b.writeIntLE(v, p, 3); else b.writeInt16LE(v, p);
    p += B;
  }
  if (o.loop) {
    b.write('smpl', p); b.writeUInt32LE(60, p + 4);
    b.writeUInt32LE(Math.round(1e9 / sr), p + 16);   // sample period (ns)
    b.writeUInt32LE(60, p + 20);                     // MIDI unity note
    b.writeUInt32LE(1, p + 36);                      // one loop
    b.writeUInt32LE(0, p + 52); b.writeUInt32LE(0, p + 56); b.writeUInt32LE(n - 1, p + 60);   // forward, whole file
  }
  return b;
}

function hasFfmpeg() {
  try { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; } catch (e) { return false; }
}

function encode(ch, sr, file, o) {
  const fmt = path.extname(file).slice(1).toLowerCase();
  const wav = encodeWav(ch, sr, { bits: o.bits, loop: o.loop });
  if (fmt === 'wav') return wav;
  if (!hasFfmpeg()) throw new Error(fmt.toUpperCase() + ' output needs ffmpeg on your PATH (https://ffmpeg.org). WAV output works without it.');
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sfxbrew-')), 'in.wav');
  fs.writeFileSync(tmp, wav);
  const codec = fmt === 'ogg' ? ['-c:a', 'libvorbis', '-q:a', String(o.quality == null ? 5 : o.quality)] : ['-c:a', 'libmp3lame', '-q:a', String(o.quality == null ? 2 : o.quality)];
  const out = tmp.replace(/in\.wav$/, 'out.' + fmt);
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp].concat(codec, [out]), { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr || '').trim().split('\n').pop());
  const bytes = fs.readFileSync(out);
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  return bytes;
}

/* ---------- 流水线 ---------- */

const DEFAULTS = {
  rate: 44100, channels: null, format: 'wav', bits: 16, quality: null,
  slice: false, trim: false, threshold: -50, minSilence: 0.15, minLength: 0.03, padStart: 0.005, padEnd: 0.05,
  fadeIn: 0, fadeOut: 0, lufs: null, peak: -1, limit: false, maxReduction: 6, loop: false, loopCrossfade: 0,
  name: null, sprite: null, spriteGap: 0.25, recursive: false, overwrite: false
};

/** 处理一批文件。返回 { outDir, files: [...每个输出的前后对比], sprite }。不会覆盖输入文件。 */
async function processAudio(inputs, opt) {
  const o = Object.assign({}, DEFAULTS, opt || {});
  if (!FORMATS.includes(o.format)) throw new Error('format must be one of ' + FORMATS.join(', '));
  if (o.channels != null && o.channels !== 1 && o.channels !== 2) throw new Error('channels must be 1 or 2');
  if (o.sprite && !/^[A-Za-z0-9_-]+$/.test(o.sprite)) throw new Error('sprite name may only use letters, digits, - and _');
  if (o.name && !/^[A-Za-z0-9_-]+$/.test(o.name)) throw new Error('name may only use letters, digits, - and _');
  if (o.sprite && o.loop) throw new Error('loop and sprite cannot be combined');
  const files = listInputs(inputs, o.recursive);
  const outDir = path.resolve(o.outDir || 'processed');
  const trimOpt = { threshold: o.threshold, padStart: o.padStart, padEnd: o.padEnd };

  /* 1. 解码 + 每段处理，先全放内存里 */
  const clips = [];
  for (const f of files) {
    const d = await decode(f, o.rate);
    let ch = toChannels(d.ch, o.channels);
    const parts = o.slice ? splitOnSilence(ch, d.sr, { threshold: o.threshold, minSilence: o.minSilence, minLength: o.minLength })
      .map(([a, b]) => slice(ch, Math.max(0, a - Math.round(o.padStart * d.sr)), Math.min(ch[0].length, b + Math.round(o.padEnd * d.sr)))) : [ch];
    if (!parts.length) { clips.push({ source: f, skipped: 'no sound above ' + o.threshold + ' dBFS' }); continue; }
    parts.forEach((p, k) => {
      const notes = [], before = stats(p, d.sr, o.threshold);
      if (o.trim) { const t = trimSilence(p, d.sr, trimOpt); if (t) p = t; else notes.push('silent, not trimmed'); }
      p = fade(p, d.sr, o.fadeIn / 1000, o.fadeOut / 1000);
      if (o.loopCrossfade) p = loopCrossfade(p, d.sr, o.loopCrossfade / 1000);
      const nm = normalize(p, d.sr, { lufs: o.lufs, peak: o.peak, limit: o.limit, maxReduction: o.maxReduction });
      if (nm.note) notes.push(nm.note);
      clips.push({ source: f, part: parts.length > 1 ? k + 1 : null, ch: nm.ch, sr: d.sr, before, gainDb: nm.gainDb, notes });
    });
  }

  /* 2. 命名：--name 统一编号；否则原文件名，切出多段时加 -01, -02 */
  const good = clips.filter(c => c.ch);
  const pad = n => String(n).padStart(2, '0');
  good.forEach((c, i) => {
    const base = o.name ? o.name + (good.length > 1 ? '-' + pad(i + 1) : '') : path.basename(c.source, path.extname(c.source)) + (c.part ? '-' + pad(c.part) : '');
    c.id = base;
  });
  const seen = {};
  good.forEach(c => { if (seen[c.id]) c.id += '-' + (++seen[c.id]); else seen[c.id] = 1; });

  /* 3. 写文件 */
  const inputsSet = new Set(files);
  const write = (file, bytes) => {
    if (inputsSet.has(path.resolve(file))) throw new Error('refusing to overwrite an input file: ' + file + ' (pick another --out folder)');
    if (!o.overwrite && fs.existsSync(file)) throw new Error('already exists: ' + file + ' (pass overwrite to replace)');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
    return file;
  };
  const report = [];
  let sprite = null;
  if (o.sprite) {
    const sr = o.rate, nc = Math.max(...good.map(c => c.ch.length)), gap = Math.round(o.spriteGap * sr);
    const total = good.reduce((s, c) => s + c.ch[0].length + gap, 0);
    const ch = Array.from({ length: nc }, () => new Float32Array(total));
    const map = {}, howler = {};
    let at = 0;
    good.forEach(c => {
      const cc = toChannels(c.ch, nc);
      cc.forEach((x, k) => ch[k].set(x, at));
      const n = c.ch[0].length;
      map[c.id] = { start: +(at / sr).toFixed(4), end: +((at + n) / sr).toFixed(4), duration: +(n / sr).toFixed(4) };
      howler[c.id] = [Math.round(at / sr * 1000), Math.round(n / sr * 1000)];
      report.push({ id: c.id, source: c.source, start: map[c.id].start, duration: map[c.id].duration, before: c.before, after: stats(c.ch, c.sr, o.threshold), gainDb: c.gainDb, notes: c.notes });
      at += n + gap;
    });
    const audio = path.join(outDir, o.sprite + '.' + o.format);
    write(audio, encode(ch, sr, audio, o));
    const json = path.join(outDir, o.sprite + '.json');
    write(json, Buffer.from(JSON.stringify({ src: [path.basename(audio)], sprite: howler, clips: map }, null, 2) + '\n'));
    sprite = { audio, json, clips: good.length, seconds: +(total / sr).toFixed(2) };
  } else {
    good.forEach(c => {
      const file = path.join(outDir, c.id + '.' + o.format);
      write(file, encode(c.ch, c.sr, file, o));
      report.push({ file, source: c.source, before: c.before, after: stats(c.ch, c.sr, o.threshold), gainDb: c.gainDb, loop: o.loop || !!o.loopCrossfade, notes: c.notes });
    });
  }
  clips.filter(c => c.skipped).forEach(c => report.push({ source: c.source, skipped: c.skipped }));
  return { outDir, files: report, sprite };
}

async function analyzeAudio(inputs, opt) {
  const o = Object.assign({}, DEFAULTS, opt || {});
  const out = [];
  for (const f of listInputs(inputs, o.recursive)) {
    const d = await decode(f, null);
    out.push(Object.assign({ file: f }, stats(d.ch, d.sr, o.threshold)));
  }
  return out;
}

module.exports = { processAudio, analyzeAudio, limiter, lufs, stats, encodeWav, splitOnSilence, loopCrossfade, hasFfmpeg, DEFAULTS, FORMATS, INPUT_EXT };
