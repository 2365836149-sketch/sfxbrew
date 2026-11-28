/* ============================================================================
   SFX Brew · 神经旋律生成模块（基于 @magenta/music MusicVAE）
   ----------------------------------------------------------------------------
   使用 Google Magenta 预训练 MusicVAE（mel_4bar_med_q2，4小节16分音符量化）
   生成具有真实人类演奏呼吸与切分感的旋律线条，再吸附到目标调式与和弦上。
   ==========================================================================*/
'use strict';

const fs = require('fs');
const path = require('path');

/* 离线旋律库：scripts/make-melody-bank.js 用 MusicVAE 预先采样，运行时按 seed 挑选。
   不需要 TensorFlow、不联网、同 seed 结果可复现，浏览器也能直接用同一份 JSON。 */
const BANK_PATH = path.join(__dirname, 'melody-bank.json');
let _bank;
function loadBank() {
  if (_bank === undefined) {
    try { _bank = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8')).melodies; } catch (_) { _bank = null; }
  }
  return _bank;
}

const CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2';
let _vaePromise = null;

async function getVae() {
  if (_vaePromise) return _vaePromise;
  _vaePromise = (async () => {
    if (typeof global.window === 'undefined') global.window = global;
    const { MusicVAE } = require('@magenta/music/node/music_vae');
    const vae = new MusicVAE(CHECKPOINT);
    await vae.initialize();
    return vae;
  })().catch(err => {
    _vaePromise = null;
    throw err;
  });
  return _vaePromise;
}

function snapToScaleMidi(midi, root, scaleArr) {
  const pcs = new Set(scaleArr.map(s => ((root + s) % 12 + 12) % 12));
  for (let d = 0; d <= 6; d++) {
    if (pcs.has(((midi + d) % 12 + 12) % 12)) return midi + d;
    if (pcs.has(((midi - d) % 12 + 12) % 12)) return midi - d;
  }
  return midi;
}

function snapToChordMidi(midi, root, chordIntervals) {
  const pcs = new Set(chordIntervals.map(iv => ((root + iv) % 12 + 12) % 12));
  for (let d = 0; d <= 6; d++) {
    if (pcs.has(((midi + d) % 12 + 12) % 12)) return midi + d;
    if (pcs.has(((midi - d) % 12 + 12) % 12)) return midi - d;
  }
  return midi;
}

/* 各律动的底鼓位置（拍），用来给旋律打分：重音落在底鼓上，听起来才“在拍上” */
const KICKS = {
  boombap: [0, 1.5, 2.75], fourOnFloor: [0, 1, 2, 3], march: [0, 2], trap: [0, 1.75, 2.5],
  bossa: [0, 1.5, 2, 3.5], waltz: [0], ambient: [0]
};

/* 把 MusicVAE 的 16 分音符节奏锁到律动上：
   - 除 trap / 四踩外，起音吸附到 8 分音符网格（swing 只作用在 8 分反拍，16 分音会和鼓错开）
   - 每小节第一拍必须有音（附近的音前移或后移到拍头）
   - 同位置重复的音只留一个，时值截到下一个音之前 */
function lockToGroove(notes, meter, groove) {
  const allow16 = groove === 'trap' || groove === 'fourOnFloor';
  const grid = allow16 ? 0.25 : 0.5;
  const out = [];
  for (let bar = 0; bar < 4; bar++) {
    let list = notes.filter(n => n.bar === bar).map(n => Object.assign({}, n, {
      beat: Math.min(meter - grid, Math.round(n.beat / grid) * grid)
    }));
    const seen = new Map();
    list.forEach(n => { const k = n.beat; if (!seen.has(k) || seen.get(k).dur < n.dur) seen.set(k, n); });
    list = [...seen.values()].sort((a, b) => a.beat - b.beat);
    if (list.length && list[0].beat !== 0 && list[0].beat <= 1) list[0].beat = 0;
    list.forEach((n, i) => {
      const next = i + 1 < list.length ? list[i + 1].beat : meter;
      n.dur = Math.max(grid, Math.min(n.dur, next - n.beat));
      out.push(n);
    });
  }
  return out;
}

/* 节奏贴合度：拍头有音、重音落在底鼓、强拍有音、每小节音数适中、没有长空白 */
function rhythmScore(notes, meter, groove) {
  const kicks = KICKS[groove] || [0, 2];
  let score = 0;
  for (let bar = 0; bar < 4; bar++) {
    const list = notes.filter(n => n.bar === bar);
    if (!list.length) { score -= 4; continue; }
    if (list.some(n => n.beat === 0)) score += 2;
    if (meter === 4 && list.some(n => n.beat === 2)) score += 1;
    list.forEach(n => { if (kicks.some(k => Math.abs(k - n.beat) < 0.01)) score += 0.5; });
    if (list.length > 7) score -= (list.length - 7);
    let last = 0;
    list.forEach(n => { if (n.beat - last > 2) score -= 1; last = n.beat + n.dur; });
  }
  return score;
}

function convertSample(seq, prog, root, scaleArr, meter) {
  const raw = (seq && seq.notes) || [];
  const stepsPerBar = meter * 4; // 4/4 -> 16 steps, 3/4 -> 12 steps
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const n = raw[i];
    const s0 = n.quantizedStartStep || 0;
    const s1 = Math.max(s0 + 1, n.quantizedEndStep || s0 + 2);
    const bar = Math.floor(s0 / 16); // MusicVAE 固定按 16 步一小节生成
    if (bar >= 4) continue;
    const stepInBar = s0 % 16;
    if (stepInBar >= stepsPerBar) continue;
    const beat = stepInBar / 4;
    const dur = Math.min(meter - beat, (s1 - s0) / 4);
    if (dur <= 0.1) continue;

    // 音高平移到目标主音八度区间并吸附调式与强拍和弦音
    let midi = (n.pitch || 60) + (root - 60) + 12;
    while (midi < root + 7) midi += 12;
    while (midi > root + 31) midi -= 12;
    const chord = prog[bar % prog.length];
    midi = snapToScaleMidi(midi, root, scaleArr);
    if (beat % 2 === 0 || dur >= 1.25) {
      midi = snapToChordMidi(midi, root, chord);
    }
    out.push({ bar, beat, dur, midi });
  }
  return out;
}

function pickBest(seqs, prog, root, scaleArr, meter, groove) {
  let best = null, bestScore = -Infinity;
  seqs.forEach(seq => {
    const phrase = lockToGroove(convertSample(seq, prog, root, scaleArr, meter), meter, groove);
    const sc = rhythmScore(phrase, meter, groove);
    if (phrase.length && sc > bestScore) { best = phrase; bestScore = sc; }
  });
  return best || [];
}

/**
 * 取一段 4 小节 MusicVAE 旋律，并对齐到当前调式、和弦、拍号与律动。
 * 默认从离线旋律库按随机数 r 抽 8 条候选；opt.live 时才实时跑模型（慢，需联网，不可复现）。
 * 候选锁到律动网格后，按节奏贴合度挑最好的一条。返回格式与 makePhrase4 一致：[{ bar, beat, dur, midi }]
 */
async function sampleNeuralPhrase4(prog, root, scaleArr, meter, groove, r, opt) {
  opt = opt || {};
  const bank = loadBank();
  if (!opt.live && bank && bank.length) {
    const seqs = [];
    for (let i = 0; i < (opt.candidates || 8); i++) {
      const m = bank[Math.floor(r() * bank.length)];
      seqs.push({ notes: m.map(([s0, s1, pitch]) => ({ quantizedStartStep: s0, quantizedEndStep: s1, pitch })) });
    }
    return pickBest(seqs, prog, root, scaleArr, meter, groove);
  }
  if (!opt.live) throw new Error('melody bank missing: ' + BANK_PATH);
  const vae = await getVae();
  const seqs = await vae.sample(opt.candidates || 4, opt.temperature == null ? 0.8 : opt.temperature);
  return pickBest(seqs || [], prog, root, scaleArr, meter, groove);
}

module.exports = { getVae, sampleNeuralPhrase4, lockToGroove, rhythmScore, loadBank };
