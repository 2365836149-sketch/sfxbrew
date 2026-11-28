/* ============================================================================
   SFX Brew · 鼓轨冲突仲裁（所有律动生成完后统一过一遍）
   ----------------------------------------------------------------------------
   各律动、过门、加花、镲片是分开写的，叠在一起时容易撞车。这里按统一规则收尾，
   以后新增律动也自动受保护；drums-test.js 对所有风格 × 多个 seed 断言零冲突。
   规则：
   1. 过门优先：过门开始到小节末，其他来源的军鼓/通鼓/踩镲/打击乐让路（底鼓、镲片保留）
   2. 同一拍内军鼓/通鼓不混用三连音和 16 分音符网格：保留过门或音符多的一方
   3. 同一个鼓 35 ms 内的重复击打只留最响的一下（军鼓叠拍手这类分层不算）
   4. 闭镲、开镲、踏镲 35 ms 内互斥（真实踩镲同一时刻只能是一种状态）
   ==========================================================================*/
'use strict';

const KICK = new Set([35, 36]);
const SNARE = new Set([37, 38, 39, 40]);
const TOMS = new Set([41, 43, 45, 47, 48, 50]);
const HATS = new Set([42, 44, 46]);
const CYMBALS = new Set([49, 51, 52, 53, 55, 57, 59]);
const GAP = 0.035;

function drumClass(midi) {
  if (KICK.has(midi)) return 'kick';
  if (SNARE.has(midi)) return 'snare';
  if (TOMS.has(midi)) return 'tom';
  if (HATS.has(midi)) return 'hat';
  if (CYMBALS.has(midi)) return 'cymbal';
  return 'perc';
}

/* 一拍内的位置属于哪种网格：'on'（拍头）、'straight'（8/16 分）、'triplet'（三连音）、'other' */
function gridOf(t, beat) {
  const pos = ((t / beat) % 1 + 1) % 1;
  const tol = 0.035 / beat;
  const near = x => Math.abs(pos - x) < tol || Math.abs(pos - x - 1) < tol || Math.abs(pos - x + 1) < tol;
  if (near(0)) return 'on';
  if ([0.25, 0.5, 0.75].some(near)) return 'straight';
  if ([1 / 3, 2 / 3].some(near)) return 'triplet';
  return 'other';
}

function fillWindows(notes, barLen) {
  const win = new Map();
  notes.forEach(n => {
    if (!n.fill) return;
    const bar = Math.floor((n.time + 1e-6) / barLen);
    const w = win.get(bar);
    if (!w || n.time < w[0]) win.set(bar, [n.time, (bar + 1) * barLen]);
  });
  return [...win.values()];
}

/* 找出所有冲突（测试和仲裁共用一套判定） */
function findConflicts(notes, opt) {
  const beat = opt.beat, barLen = beat * (opt.meter || 4);
  const out = [];
  const wins = fillWindows(notes, barLen);
  notes.forEach(n => {
    const c = drumClass(n.midi);
    if (n.fill || c === 'kick' || c === 'cymbal') return;
    if (wins.some(([a, b]) => n.time >= a - 0.02 && n.time < b)) out.push({ rule: 'fill', note: n });
  });
  const byBeat = new Map();
  notes.forEach(n => {
    const c = drumClass(n.midi);
    if (c !== 'snare' && c !== 'tom') return;
    const k = Math.floor((n.time + 0.035) / beat);
    if (!byBeat.has(k)) byBeat.set(k, []);
    byBeat.get(k).push(n);
  });
  byBeat.forEach(list => {
    const tri = list.filter(n => gridOf(n.time, beat) === 'triplet');
    const str = list.filter(n => gridOf(n.time, beat) === 'straight');
    if (tri.length && str.length) {
      const triWins = tri.some(n => n.fill) && !str.some(n => n.fill) || (!str.some(n => n.fill) && tri.length > str.length);
      (triWins ? str : tri).forEach(n => out.push({ rule: 'grid', note: n }));
    }
  });
  const sorted = notes.slice().sort((a, b) => a.time - b.time);
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i], ca = drumClass(a.midi);
    for (let j = i + 1; j < sorted.length && sorted[j].time - a.time < GAP; j++) {
      const b = sorted[j], cb = drumClass(b.midi);
      const sameVoice = a.midi === b.midi || (ca === 'hat' && cb === 'hat');
      if (sameVoice) out.push({ rule: ca === 'hat' ? 'hat' : 'double', note: (a.vel >= b.vel ? b : a) });
    }
  }
  return out;
}

/* 反复去掉冲突音，直到没有冲突；返回干净的音符和被去掉的数量 */
function resolveDrums(notes, opt) {
  let cur = notes.slice(), removed = 0;
  for (let pass = 0; pass < 6; pass++) {
    const bad = new Set(findConflicts(cur, opt).map(c => c.note));
    if (!bad.size) break;
    removed += bad.size;
    cur = cur.filter(n => !bad.has(n));
  }
  return { notes: cur.map(n => { const o = Object.assign({}, n); delete o.fill; return o; }), removed };
}

module.exports = { drumClass, gridOf, findConflicts, resolveDrums };
