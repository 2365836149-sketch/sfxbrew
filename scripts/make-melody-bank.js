#!/usr/bin/env node
/* 用 Google Magenta MusicVAE（mel_4bar_med_q2，Apache-2.0）离线采样 4 小节旋律，写入 node/melody-bank.json。
   只有维护者重建旋律库时才需要：npm i --no-save @magenta/music && node scripts/make-melody-bank.js 512
   每条旋律 = [[起始步, 结束步, MIDI 音高], ...]，16 步一小节。运行时 node/neural.js 按 seed 从库里挑选并对齐律动。 */
'use strict';
const fs = require('fs');
const path = require('path');
const neural = require('../node/neural.js');
const OUT = path.join(__dirname, '..', 'node', 'melody-bank.json');
const target = Number(process.argv[2]) || 512;
(async () => {
  const vae = await neural.getVae();
  const bank = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).melodies : [];
  while (bank.length < target) {
    for (const temp of [0.7, 0.85]) {
      const seqs = await vae.sample(16, temp);
      seqs.forEach(s => {
        const notes = s.notes.map(x => [x.quantizedStartStep || 0, x.quantizedEndStep || 0, x.pitch]);
        if (notes.length >= 6) bank.push(notes);
      });
    }
    fs.writeFileSync(OUT, JSON.stringify({
      source: 'Magenta MusicVAE mel_4bar_med_q2 (Apache-2.0), sampled at temperature 0.7 / 0.85',
      stepsPerBar: 16, bars: 4, melodies: bank.slice(0, target)
    }));
    console.log('melody bank:', Math.min(bank.length, target), '/', target);
  }
})();
