/* ============================================================================
   SFX Brew 音乐工作室 · 播放器
   ----------------------------------------------------------------------------
   每条轨：输入 → 音量 → 声像 → 主总线；并按"混响量"发送到共用混响。主总线 → 压缩 → 输出。
   实时播放用"提前调度"：每 40ms 检查一次，把未来 0.25 秒内要响的音符交给 sfx.schedule。
   循环区间：走到终点就跳回起点（记录每一段的起始时间，用来换算播放头位置）。
   停止时把整条总线淡出并丢弃（已经排好的音符随之无声），下次播放重建。
   离线渲染（导出）用同一套连线，只是换成 OfflineAudioContext，可以只渲染部分轨（分轨导出）。
   ==========================================================================*/
(function (root) {
  'use strict';

  function makePlayer(sfx, insts) {
    let rig = null, timer = 0, playing = false, project = null, flat = [], ptr = 0;
    let segs = [], cursor = 0, metronome = false, onEnd = null;
    const LOOK = 0.25;

    /* 厅堂混响的脉冲响应（和 music.js 的总线同一个做法）：20ms 预延迟、一簇早期反射、左右不相关的尾巴，高频比低频衰减得快 */
    function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
    function makeIR(c) {
      const sr = c.sampleRate, len = Math.floor(sr * 2.8), ir = c.createBuffer(2, len, sr), pre = Math.floor(sr * 0.02);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch), r = rnd(11 + ch * 97);
        let y = 0;
        for (let e = 0; e < 10; e++) {
          const at = pre + Math.floor(sr * (0.004 + r() * 0.07)), amp = (0.5 - e * 0.035) * (r() < 0.5 ? -1 : 1);
          if (at < len) d[at] += amp;
        }
        for (let i = pre; i < len; i++) {
          const u = (i - pre) / (len - pre), a = 0.85 - 0.75 * Math.pow(u, 0.6);
          y += a * ((r() * 2 - 1) - y);
          d[i] += y * 0.55 * Math.pow(1 - u, 2.2) * Math.min(1, (i - pre) / (sr * 0.03));
        }
      }
      return ir;
    }
    /* 搭一套混音连线：每轨 gain → panner → master，另外 gain → send → 混响 → master。
       混响回来的声音去掉 220Hz 以下（不糊）和 7kHz 以上（不刺）。
       主总线：35Hz 低切 → 300Hz 轻微挖一点（所有乐器都堆在这里）→ 轻度「胶水」压缩 → 限幅，免得爆音。 */
    function buildRig(c, p, dest) {
      const master = c.createGain(), verb = c.createConvolver(), verbOut = c.createGain(), wl = c.createBiquadFilter(), wh = c.createBiquadFilter();
      const lc = c.createBiquadFilter(), dip = c.createBiquadFilter(), glue = c.createDynamicsCompressor(), lim = c.createDynamicsCompressor(), out = c.createGain();
      verb.buffer = makeIR(c); verbOut.gain.value = 0.9;
      wl.type = 'highpass'; wl.frequency.value = 220; wh.type = 'lowpass'; wh.frequency.value = 7000;
      verb.connect(wl); wl.connect(wh); wh.connect(verbOut); verbOut.connect(master);
      lc.type = 'highpass'; lc.frequency.value = 35; lc.Q.value = 0.7;
      dip.type = 'peaking'; dip.frequency.value = 300; dip.Q.value = 0.9; dip.gain.value = -2;
      glue.threshold.value = -16; glue.ratio.value = 2.5; glue.knee.value = 8; glue.attack.value = 0.02; glue.release.value = 0.25;
      lim.threshold.value = -2; lim.ratio.value = 20; lim.knee.value = 0; lim.attack.value = 0.002; lim.release.value = 0.1;
      /* 压缩和限幅会自动补大约 4dB，这里收回来 */
      out.gain.value = 0.8;
      master.connect(lc); lc.connect(dip); dip.connect(glue); glue.connect(lim); lim.connect(out); out.connect(dest || c.destination);
      const tracks = {};
      p.tracks.forEach(t => {
        const g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null, send = c.createGain();
        if (pan) { g.connect(pan); pan.connect(master); } else g.connect(master);
        g.connect(send); send.connect(verb);
        tracks[t.id] = { input: g, gain: g, pan, send };
      });
      const rig = { c, master, tracks };
      applyMix(rig, p);
      return rig;
    }
    function audible(p, t) {
      const anySolo = p.tracks.some(x => x.solo);
      return !t.mute && (!anySolo || t.solo);
    }
    function applyMix(r, p) {
      if (!r) return;
      const now = r.c.currentTime;
      p.tracks.forEach(t => {
        const ch = r.tracks[t.id]; if (!ch) return;
        ch.gain.gain.setTargetAtTime(audible(p, t) ? t.volume : 0, now, 0.02);
        if (ch.pan) ch.pan.pan.setTargetAtTime(t.pan, now, 0.02);
        ch.send.gain.setTargetAtTime(t.reverb, now, 0.02);
      });
    }
    /* 把所有片段里的音符摊平成按拍排序的列表 */
    function flatten(p) {
      const out = [];
      p.tracks.forEach(t => t.regions.forEach(rg => rg.notes.forEach(n => {
        if (n.t < 0 || n.t >= rg.length) return;
        out.push({ beat: rg.start + n.t, d: Math.min(n.d, rg.length - n.t), p: n.p, v: n.v, track: t.id, inst: t.instrument });
      })));
      out.sort((a, b) => a.beat - b.beat);
      return out;
    }
    const spb = () => 60 / project.tempo;
    function patchFor(note) {
      const inst = insts.get(note.inst);
      const pt = inst.make({ p: note.p, dur: note.d * spb(), v: note.v });
      /* 乐器自带的声像只在 music.js 的自动配乐里用；这里声像归音轨管（弦乐组例外：三个声部各坐各的位置） */
      if (pt && !inst.keepPan) delete pt.pan;
      return pt;
    }
    function samplesOf(p) {
      const names = [];
      p.tracks.forEach(t => insts.samplesFor(t.instrument).forEach(n => { if (!names.includes(n)) names.push(n); }));
      return names;
    }
    function preload(c, p) {
      const names = samplesOf(p);
      return names.length ? sfx.load(c, { layers: names.map(n => ({ type: 'sample', sample: n })) }) : Promise.resolve();
    }
    function click(c, dest, when, accent) {
      const f = accent ? 1760 : 1320;
      sfx.schedule(c, dest, { layers: [{ type: 'tone', wave: 'sine', freq: f, freqEnd: f, attack: 0.001, decay: 0.05, vol: accent ? 0.35 : 0.22, filter: 'none', rep: 1 }], reverb: 0, gain: 0.8 }, when);
    }

    /* ---------- 实时播放 ---------- */
    function seekPtr(beat) { ptr = 0; while (ptr < flat.length && flat[ptr].beat < beat) ptr++; }
    function tick() {
      if (!playing) return;
      const c = rig.c, horizon = c.currentTime + LOOK, loop = project.loop, endBeat = Project.lengthBeats(project);
      for (;;) {
        const seg = segs[segs.length - 1], segEnd = loop.on && loop.end > loop.start ? loop.end : endBeat;
        const beatAt = t => seg.beat + (t - seg.time) / spb();
        const timeAt = b => seg.time + (b - seg.beat) * spb();
        const hBeat = Math.min(beatAt(horizon), segEnd);
        while (ptr < flat.length && flat[ptr].beat < hBeat) {
          const n = flat[ptr++];
          if (n.beat >= seg.beat) {
            const tr = project.tracks.find(t => t.id === n.track);
            if (tr && rig.tracks[n.track] && audible(project, tr)) {
              const pt = patchFor(n);
              if (pt) sfx.schedule(c, rig.tracks[n.track].input, pt, timeAt(n.beat));
            }
          }
        }
        if (metronome) {
          for (let b = Math.ceil(cursor - 1e-6); b < hBeat; b++) if (b >= seg.beat) click(c, rig.master, timeAt(b), b % 4 === 0);
        }
        cursor = Math.max(cursor, hBeat);
        if (hBeat < segEnd) break;
        /* 到达终点：循环则跳回起点，否则结束 */
        if (loop.on && loop.end > loop.start) {
          segs.push({ time: timeAt(segEnd), beat: loop.start });
          cursor = loop.start; seekPtr(loop.start);
        } else {
          const endTime = timeAt(segEnd);
          setTimeout(() => { if (playing && rig.c.currentTime >= endTime - 0.05) { stop(); if (onEnd) onEnd(); } }, Math.max(0, (endTime - c.currentTime) * 1000));
          break;
        }
      }
    }
    function play(p, fromBeat) {
      stop(true);
      project = p;
      const c = sfx.context();
      if (!c) return Promise.resolve();
      if (c.state === 'suspended') c.resume();
      rig = buildRig(c, p);
      segs = [];
      flat = flatten(p);
      playing = true;
      const me = rig;
      return preload(c, p).then(() => {
        if (rig !== me || !playing) return;
        const start = fromBeat || 0;
        segs = [{ time: c.currentTime + 0.06, beat: start }];
        cursor = start; seekPtr(start);
        tick();
        timer = setInterval(tick, 40);
      });
    }
    function stop(silent) {
      playing = false;
      clearInterval(timer);
      if (rig) {
        const old = rig;
        old.master.gain.setTargetAtTime(0, old.c.currentTime, 0.015);
        setTimeout(() => { try { old.master.disconnect(); } catch (e) { /* gone */ } }, 400);
        rig = null;
      }
    }
    /* 播放中项目被编辑了：重新摊平音符，从当前位置继续（已排好的 0.25 秒内的音不受影响） */
    function update(p) {
      project = p;
      if (!playing || !rig) return;
      const known = Object.keys(rig.tracks);
      if (p.tracks.some(t => !known.includes(t.id))) { const pos = position(); play(p, pos); return; }
      applyMix(rig, p);
      flat = flatten(p);
      seekPtr(cursor);
    }
    function position() {
      if (!playing || !segs.length || !rig) return null;
      const now = rig.c.currentTime;
      let seg = segs[0];
      for (const s of segs) if (s.time <= now) seg = s;
      return Math.max(seg.beat, seg.beat + (now - seg.time) / spb());
    }

    /* 试听单个音（画音符、弹键盘时） */
    function audition(instId, p, v, beats) {
      const c = sfx.context(); if (!c) return;
      if (c.state === 'suspended') c.resume();
      const inst = insts.get(instId), pt = inst.make({ p, dur: (beats || 1) * 60 / ((project && project.tempo) || 90), v: v == null ? 0.8 : v });
      if (!pt) return;
      sfx.load(c, pt).then(() => sfx.schedule(c, c.destination, pt, c.currentTime + 0.01));
    }

    /* ---------- 离线渲染：整曲 / 区间 / 部分轨 ---------- */
    function render(p, opts) {
      opts = opts || {};
      const sr = opts.sampleRate || 44100, from = opts.from || 0, to = opts.to == null ? Project.lengthBeats(p) : opts.to;
      const sec = 60 / p.tempo, tail = opts.tail == null ? 4 : opts.tail;
      const c = sfx.offlineContext(2, Math.ceil(((to - from) * sec + tail) * sr), sr);
      const only = opts.tracks ? p.tracks.filter(t => opts.tracks.includes(t.id)) : null;
      const pp = only ? Object.assign({}, p, { tracks: p.tracks.map(t => Object.assign({}, t, { solo: false, mute: !only.includes(t) })) }) : p;
      const r = buildRig(c, pp);
      const saved = project; project = pp;
      const notes = flatten(pp).filter(n => n.beat >= from && n.beat < to);
      return preload(c, pp).then(() => {
        notes.forEach(n => {
          const tr = pp.tracks.find(t => t.id === n.track);
          if (!audible(pp, tr)) return;
          const pt = patchFor(n);
          if (pt) sfx.schedule(c, r.tracks[n.track].input, pt, (n.beat - from) * sec);
        });
        project = saved;
        return c.startRendering();
      }).then(buf => {
        const chans = [];
        /* 复制一份：某些实现里缓冲被回收后，getChannelData 返回的视图会变成垃圾数据 */
        for (let ch = 0; ch < buf.numberOfChannels; ch++) chans.push(new Float32Array(buf.getChannelData(ch)));
        return { channels: chans, sampleRate: sr, seconds: (to - from) * sec };
      });
    }

    return {
      play, stop, update, position, audition, render,
      isPlaying: () => playing,
      setMetronome: on => { metronome = !!on; },
      onEnd: fn => { onEnd = fn; },
      applyMix: p => { project = p; applyMix(rig, p); }
    };
  }

  const Project = (root.Studio && root.Studio.project) || (typeof require === 'function' ? require('./project.js') : null);
  const api = { makePlayer };
  root.Studio = root.Studio || {};
  root.Studio.player = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
