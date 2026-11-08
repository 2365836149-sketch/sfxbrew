/* ============================================================================
   灵音 · 合成引擎
   ----------------------------------------------------------------------------
   ★ 整个引擎就是一个函数 makeSfx()，不依赖任何外部变量。
     "导出 JS 代码"时直接用 makeSfx.toString() 原样塞进用户的游戏里，
     所以页面里听到的、WAV 里导出的、代码里播放的，是同一份合成逻辑。
   ★ 噪声和混响冲激响应都用固定种子的随机数生成，每次渲染结果完全一样。
   ★ 这个函数里面不要写中文注释、不要引用外部变量（会被导出给别人用）。
   ==========================================================================*/
function makeSfx(env) {
  'use strict';
  var W = env || (typeof window !== 'undefined' ? window : {});
  var PENTA = [0, 2, 4, 7, 9];
  var ctx = null;
  var cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function assets(c) {
    var a = cache && cache.get(c);
    if (a) return a;
    var r = rng(7), sr = c.sampleRate, i, ch;
    var nb = c.createBuffer(1, sr * 2, sr), nd = nb.getChannelData(0);
    for (i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
    var len = Math.floor(sr * 2.5), ir = c.createBuffer(2, len, sr);
    for (ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    a = { noise: nb, ir: ir };
    if (cache) cache.set(c, a);
    return a;
  }

  function stepSemis(L, k) {
    var deg = (L.repStep || 0) * k;
    if (L.scale !== 'penta') return deg;
    var oct = Math.floor(deg / 5), idx = ((deg % 5) + 5) % 5;
    return 12 * oct + PENTA[idx];
  }

  function layerEnd(L) {
    return (L.start || 0) + (Math.max(1, L.rep || 1) - 1) * (L.repGap || 0) + L.attack + L.decay;
  }

  function duration(p) {
    var end = 0, i;
    for (i = 0; i < p.layers.length; i++) end = Math.max(end, layerEnd(p.layers[i]));
    var tail = 0;
    if (p.reverb > 0) tail = 0.6 + 1.9 * Math.min(1, p.reverb * 2);
    if (p.echo > 0) tail = Math.max(tail, p.echoTime * Math.log(0.001) / Math.log(Math.min(0.95, p.echo)));
    return Math.min(12, end + tail + 0.05);
  }

  function curve(fn) {
    var n = 4096, c = new Float32Array(n), i;
    for (i = 0; i < n; i++) c[i] = fn(i * 2 / (n - 1) - 1);
    return c;
  }

  function voice(c, A, out, L, t, k) {
    var ratio = Math.pow(2, stepSemis(L, k) / 12);
    var f0 = Math.max(1, L.freq * ratio), f1 = Math.max(1, (L.freqEnd || L.freq) * ratio);
    var tEnd = t + L.attack + L.decay, stopAt = tEnd + 0.05;
    var tSlide = L.slideTime > 0 ? Math.min(tEnd, t + L.slideTime) : tEnd;
    var tSweep = L.sweepTime > 0 ? Math.min(tEnd, t + L.sweepTime) : tEnd;
    var g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(L.vol, t + L.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, tEnd);
    g.connect(out);
    var dst = g;
    if (L.filter && L.filter !== 'none') {
      var f = c.createBiquadFilter();
      f.type = L.filter;
      f.Q.value = L.q || 1;
      f.frequency.setValueAtTime(Math.max(20, L.cutoff), t);
      if (L.cutoffEnd && L.cutoffEnd !== L.cutoff) f.frequency.exponentialRampToValueAtTime(Math.max(20, L.cutoffEnd), tSweep);
      f.connect(g);
      dst = f;
    }
    var lfoGain = null;
    if (L.vib > 0) {
      var lfo = c.createOscillator();
      lfo.frequency.value = L.vibRate || 6;
      lfoGain = c.createGain();
      lfoGain.gain.value = L.vib;
      lfo.connect(lfoGain);
      lfo.start(t); lfo.stop(stopAt);
    }
    if (L.type === 'noise') {
      var s = c.createBufferSource();
      s.buffer = A.noise; s.loop = true;
      if (lfoGain && s.detune) lfoGain.connect(s.detune);
      s.connect(dst);
      s.start(t, (k * 0.37) % 1.5); s.stop(stopAt);
      return;
    }
    var parts = L.type === 'bell' ? [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]]
      : L.type === 'pluck' ? [[1, 1], [2.01, 0.3]] : [[1, 1]];
    var uni = Math.max(1, Math.min(5, Math.round(L.unison || 1))), spread = L.detune || 0;
    for (var i = 0; i < parts.length; i++) {
      var pg = c.createGain(), r = parts[i][0], nv = i === 0 ? uni : 1;
      pg.gain.setValueAtTime(parts[i][1] / Math.sqrt(nv), t);
      if (L.type === 'bell' && i > 0) pg.gain.exponentialRampToValueAtTime(0.0001, t + L.attack + L.decay / Math.pow(r, 0.5));
      pg.connect(dst);
      for (var u = 0; u < nv; u++) {
        var o = c.createOscillator();
        o.type = (L.type === 'bell' || i > 0) ? 'sine' : (L.wave || 'sine');
        o.frequency.setValueAtTime(f0 * r, t);
        if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1 * r, tSlide);
        if (nv > 1) o.detune.value = spread * (u / (nv - 1) - 0.5) * 2;
        if (lfoGain) lfoGain.connect(o.detune);
        if (L.type === 'fm' && L.fmIndex > 0) {
          var m = c.createOscillator(), mg = c.createGain(), ratio2 = L.fmRatio || 2;
          m.frequency.setValueAtTime(f0 * ratio2, t);
          if (f1 !== f0) m.frequency.exponentialRampToValueAtTime(f1 * ratio2, tSlide);
          mg.gain.setValueAtTime(L.fmIndex * f0, t);
          mg.gain.exponentialRampToValueAtTime(Math.max(0.01, L.fmIndex * f0 * 0.03), Math.min(tEnd, t + (L.fmDecay || L.decay * 0.5)));
          m.connect(mg); mg.connect(o.frequency);
          m.start(t); m.stop(stopAt);
        }
        o.connect(pg);
        o.start(t); o.stop(stopAt);
      }
    }
  }

  function build(c, dest, p, t0) {
    var A = assets(c), i, k;
    var pre = c.createGain(); pre.gain.value = p.gain == null ? 0.8 : p.gain;
    var node = pre;
    if (p.drive > 0) {
      var kd = 1 + p.drive * 10, th = Math.tanh(kd);
      var ws = c.createWaveShaper();
      ws.curve = curve(function (x) { return Math.tanh(kd * x) / th; });
      node.connect(ws); node = ws;
    }
    if (p.crush > 0) {
      var steps = Math.pow(2, p.crush - 1);
      var cs = c.createWaveShaper();
      cs.curve = curve(function (x) { return Math.round(x * steps) / steps; });
      node.connect(cs); node = cs;
    }
    var comp = c.createWaveShaper();
    comp.curve = curve(function (x) {
      var a = Math.abs(x), s = x < 0 ? -1 : 1;
      return a < 0.7 ? x : s * (0.7 + 0.3 * Math.tanh((a - 0.7) / 0.3));
    });
    comp.connect(dest);
    node.connect(comp);
    if (p.reverb > 0) {
      var cv = c.createConvolver(), wet = c.createGain();
      cv.buffer = A.ir; wet.gain.value = p.reverb;
      node.connect(cv); cv.connect(wet); wet.connect(comp);
    }
    if (p.echo > 0) {
      var dl = c.createDelay(2), fb = c.createGain(), eg = c.createGain();
      dl.delayTime.value = p.echoTime; fb.gain.value = Math.min(0.9, p.echo); eg.gain.value = 0.6;
      node.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(eg); eg.connect(comp);
    }
    for (i = 0; i < p.layers.length; i++) {
      var L = p.layers[i], n = Math.max(1, L.rep || 1);
      for (k = 0; k < n; k++) voice(c, A, pre, L, t0 + (L.start || 0) + k * (L.repGap || 0), k);
    }
    return t0 + duration(p);
  }

  return {
    duration: duration,
    play: function (p) {
      if (!ctx) {
        var AC = W.AudioContext || W.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      build(ctx, ctx.destination, p, ctx.currentTime + 0.02);
    },
    render: function (p, sampleRate) {
      var sr = sampleRate || 44100;
      var OC = W.OfflineAudioContext || W.webkitOfflineAudioContext;
      var oc = new OC(1, Math.ceil(sr * duration(p)), sr);
      build(oc, oc.destination, p, 0);
      return oc.startRendering();
    }
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = makeSfx;
