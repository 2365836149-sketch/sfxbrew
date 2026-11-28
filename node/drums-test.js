/* 鼓轨冲突回归测试：所有风格 × 多个 seed（含 random 盲盒和自定义律动）必须零冲突 */
'use strict';
const band = require('./band.js');
const drums = require('./drums.js');
(async () => {
  let fails = 0, runs = 0;
  const cases = [];
  Object.keys(band.STYLES).concat('random').forEach(s => { for (let seed = 1; seed <= 25; seed++) cases.push([s, { seed }]); });
  band.GROOVES.forEach(g => [3, 4].forEach(meter => { for (let seed = 1; seed <= 8; seed++) cases.push(['lofi', { seed, groove: g, meter }]); }));
  for (const [style, o] of cases) {
    const plan = await band.composeBand(style, Object.assign({ neural: false }, o));
    const d = plan.tracks.find(t => t.name === 'drums');
    runs++;
    if (!d) continue;
    const c = drums.findConflicts(d.notes, { beat: plan.beat, meter: plan.meter });
    if (c.length) { fails++; if (fails <= 5) console.log('FAIL', style, JSON.stringify(o), c.length, c.slice(0, 3).map(x => x.rule + '@' + x.note.time.toFixed(3) + ':' + x.note.midi).join(' ')); }
  }
  console.log(fails ? 'drums-test: ' + fails + ' of ' + runs + ' arrangements have conflicts' : 'drums-test: ' + runs + ' arrangements, 0 conflicts');
  process.exit(fails ? 1 : 0);
})();
