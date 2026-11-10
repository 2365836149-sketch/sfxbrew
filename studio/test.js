/* SFX Brew 音乐工作室 · 自测：node studio/test.js
   项目往返、撤销重做、按情绪生成、离线渲染（整曲 / 分轨相加 ≈ 整曲）、无 NaN、峰值不爆 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { OfflineAudioContext } = require('node-web-audio-api');
const makeSfx = require('../engine.js');
const makeMusic = require('../music.js');
const P = require('./project.js');
const { makeInstruments } = require('./instruments.js');
const { makePlayer } = require('./player.js');
const S = require('./smart.js');

const sfx = makeSfx({
  OfflineAudioContext,
  loadSample: n => { const b = fs.readFileSync(path.join(__dirname, '..', 'samples', n + '.mp3')); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); }
});
const music = makeMusic(sfx), insts = makeInstruments(music), player = makePlayer(sfx, insts);
const stats = ch => { let pk = 0, nan = 0, ss = 0; for (const v of ch) { if (isNaN(v)) nan++; pk = Math.max(pk, Math.abs(v)); ss += v * v; } return { pk, nan, rms: Math.sqrt(ss / ch.length) }; };

(async () => {
  /* 1. 往返与校验 */
  const p0 = S.fromMood(music, 'calm', 11, 'zh');
  const p1 = P.sanitize(JSON.parse(JSON.stringify(p0)));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(p1)), JSON.parse(JSON.stringify(p0)), 'sanitize keeps a valid project unchanged');
  assert.ok(p0.tracks.length >= 4, 'calm makes at least 4 tracks');
  assert.ok(p0.tracks.every(t => t.regions.every(r => r.notes.every(n => n.t >= 0 && n.t < r.length))), 'notes inside regions');

  /* 2. 撤销 / 重做 */
  let cur = JSON.parse(JSON.stringify(p0));
  const h = P.makeHistory(() => cur, v => { cur = v; });
  h.push(); cur.tempo = 120;
  h.push(); cur.tracks.pop();
  assert.ok(h.undo() && cur.tracks.length === p0.tracks.length, 'undo restores track');
  assert.ok(h.undo() && cur.tempo === p0.tempo, 'undo restores tempo');
  assert.ok(h.redo() && cur.tempo === 120, 'redo');

  /* 3. 音阶 */
  assert.ok(P.inScale(p0, p0.root) && !P.inScale({ root: 50, mode: 'gong' }, 51), 'scale check');
  assert.strictEqual(P.snapToScale({ root: 50, mode: 'gong' }, 51), 50, 'snap to scale');

  /* 4. 四种情绪都能生成并渲染（只渲染前 16 小节，节省时间） */
  /* 3b. 和声：七声三和弦的性质、五声叠置和弦、都节调 */
  assert.deepStrictEqual(S.chordMidi({ root: 45, mode: 'yu', harmony: 'diatonic' }, 0), [45, 48, 52], 'i in A yu = A C E');
  assert.strictEqual(S.chordQuality({ root: 45, mode: 'yu', harmony: 'diatonic' }, 0), 'm', 'i is minor');
  assert.strictEqual(S.chordQuality({ root: 45, mode: 'yu', harmony: 'diatonic' }, 5), '', 'VI is major');
  assert.deepStrictEqual(S.chordMidi({ root: 45, mode: 'miyako', harmony: 'dark' }, 1), [46, 50, 53], 'bII in A = Bb D F');
  assert.strictEqual(S.chordQuality({ root: 50, mode: 'gong', harmony: 'penta' }, 0), '', 'pentatonic chords have no quality');
  assert.ok(P.inScale({ root: 45, mode: 'miyako' }, 46), 'miyako has the flat second');
  const sk = S.fromMood(music, 'skirmish', 3, 'zh');
  assert.strictEqual(sk.harmony, 'dark'); assert.strictEqual(sk.mode, 'miyako');
  assert.ok(['strings', 'cello', 'spic'].every(i => sk.tracks.some(t => t.instrument === i)), 'skirmish has string bed, cello bass and spiccato');
  assert.strictEqual(P.sanitize({ tracks: [] }).harmony, 'penta', 'old projects default to pentatonic harmony');

  /* 4. 四种情绪 + 七套编曲都能生成并渲染 */
  for (const mood of [...music.moods, ...Object.keys(S.STYLES)]) {
    const p = S.fromMood(music, mood, 5, 'en');
    const t0 = Date.now();
    const r = await player.render(p, { from: 0, to: 64, sampleRate: 22050, tail: 2 });
    const s = stats(r.channels[0]);
    assert.strictEqual(s.nan, 0, mood + ' no NaN');
    assert.ok(s.pk > 0.05 && s.pk < 1.2, mood + ' sane peak ' + s.pk);
    console.log(mood.padEnd(8), p.tracks.map(t => t.name + ':' + t.instrument + '(' + t.regions.reduce((a, r) => a + r.notes.length, 0) + ')').join(' '), '| peak', s.pk.toFixed(2), 'rms', s.rms.toFixed(3), (Date.now() - t0) + 'ms');
  }

  /* 5. 分轨相加 ≈ 整曲（压缩器是非线性的，所以只比较能量量级） */
  const p = S.fromMood(music, 'sad', 3, 'en');
  const whole = await player.render(p, { from: 0, to: 32, sampleRate: 22050, tail: 1 });
  let sumE = 0;
  for (const t of p.tracks) { const r = await player.render(p, { from: 0, to: 32, sampleRate: 22050, tail: 1, tracks: [t.id] }); sumE += stats(r.channels[0]).rms ** 2; }
  const wholeE = stats(whole.channels[0]).rms ** 2;
  const ratio = wholeE / sumE;
  console.log('stems check: whole E', wholeE.toExponential(2), 'sum E', sumE.toExponential(2));
  assert.ok(ratio > 0.3 && ratio < 3, 'stems energy close to whole mix, ratio ' + ratio.toFixed(2));

  /* 6. 静音的轨不出声 */
  const pm = JSON.parse(JSON.stringify(p)); pm.tracks.forEach(t => { t.mute = true; });
  const silent = await player.render(pm, { from: 0, to: 8, sampleRate: 22050, tail: 0.5 });
  assert.ok(stats(silent.channels[0]).pk < 0.01, 'all muted is silent');

  console.log('all studio tests passed');
})().catch(e => { console.error(e); process.exit(1); });
