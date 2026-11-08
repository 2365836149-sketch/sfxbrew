/* SFX Brew · 目录校验：每个预设都要有目录记录（大类、标签合法）、网页文案和不重复的网址，并且能正常渲染 */
'use strict';

const assert = require('assert');
const CAT = require('../catalog.js');
const lib = require('./lib.js');
const { SOUNDS } = require('../site/data.js');

const ids = lib.PRESETS.map(p => p.id);
const cats = CAT.CATEGORIES.map(c => c.id);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

ids.forEach(id => {
  const e = CAT.ENTRIES[id];
  check(e, id + ': catalog.js 里没有记录');
  if (e) {
    check(cats.includes(e.cat), id + ': 大类 "' + e.cat + '" 不存在');
    (e.also || []).forEach(c => check(cats.includes(c), id + ': also 里的大类 "' + c + '" 不存在'));
    ['style', 'material', 'mood'].forEach(d => (e.tags[d] || []).forEach(v => check(CAT.TAGS[d].values.some(x => x.id === v), id + ': 标签 ' + d + ':' + v + ' 不存在')));
    check(e.kw && e.kw.trim().length > 0, id + ': 缺少搜索关键词 kw');
  }
  check(lib.META[id], id + ': node/lib.js 的 META 里没有英文名和描述');
  const s = SOUNDS[id];
  check(s, id + ': site/data.js 里没有页面文案');
  if (s) ['en', 'zh'].forEach(l => check(s[l] && s[l].name && s[l].title && s[l].intro && s[l].uses && s[l].tip, id + ': ' + l + ' 文案不完整'));
});
Object.keys(CAT.ENTRIES).forEach(id => check(ids.includes(id), 'catalog.js 里的 ' + id + ' 在 presets.js 里不存在'));
const slugs = ids.filter(id => SOUNDS[id]).map(id => SOUNDS[id].slug);
check(new Set(slugs).size === slugs.length, '网址 slug 有重复');

(async () => {
  for (const id of ids) {
    const { patch } = lib.generate(id, 12345);
    const wav = Buffer.from((await lib.renderWav(patch)).bytes);
    const n = (wav.length - 44) / 2;
    let peak = 0, nan = 0;
    for (let i = 0; i < n; i++) { const v = wav.readInt16LE(44 + i * 2) / 32768; if (isNaN(v)) nan++; peak = Math.max(peak, Math.abs(v)); }
    check(nan === 0 && peak > 0.02, id + ': 渲染结果异常（峰值 ' + peak.toFixed(3) + '）');
    check(n / 44100 > 0.03 && n / 44100 < 20, id + ': 时长异常 ' + (n / 44100).toFixed(2) + ' 秒');
  }
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log('catalog ok: ' + ids.length + ' presets');
})().catch(e => { console.error(e); process.exit(1); });
