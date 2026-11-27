/* ============================================================================
   SFX Brew · 神经旋律生成模块（基于 @magenta/music MusicVAE）
   ----------------------------------------------------------------------------
   使用 Google Magenta 预训练 MusicVAE（mel_4bar_med_q2，4小节16分音符量化）
   生成具有真实人类演奏呼吸与切分感的旋律线条，再吸附到目标调式与和弦上。
   ==========================================================================*/
'use strict';

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

/**
 * 采样一段 4 小节神经网络旋律，并对齐到当前调式、和弦与拍号。
 * 返回格式与 makePhrase4 一致：[{ bar, beat, dur, midi }]
 */
async function sampleNeuralPhrase4(prog, root, scaleArr, meter, temperature) {
  const vae = await getVae();
  const seqs = await vae.sample(1, temperature == null ? 0.9 : temperature);
  const raw = (seqs && seqs[0] && seqs[0].notes) || [];
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

module.exports = { getVae, sampleNeuralPhrase4 };
