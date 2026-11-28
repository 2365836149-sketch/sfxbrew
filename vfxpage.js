/* ============================================================================
   SFX Brew · 特效页（/vfx/）：在线预览 + 下载引擎包
   ----------------------------------------------------------------------------
   画面用 vfx.js 在浏览器里现算；声音用 engine.js 播放构建时生成好的同名音效参数。
   下载的 zip 和命令行 `sfxbrew vfx <name> --sound` 导出的文件夹结构一样（文本文件来自 vfxpack.js）。
   ==========================================================================*/
(function () {
  'use strict';
  const D = JSON.parse(document.getElementById('vx-data').textContent);
  const T = D.i18n, V = window.SFX_VFX, PK = window.SFX_VFXPACK, SFX = makeSfx();
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const st = { fx: V.LIST[0], style: 'hd', palette: '', speed: 1, seed: 1, scale: 4, bg: 'night', sound: true, loop: false };
  let R = null, t0 = null, sfxN = 0, actx = null;

  /* ---------- 网址里记住选择（?fx=&style=&palette=&seed=） ---------- */
  (function readUrl() {
    const u = new URLSearchParams(location.search);
    if (V.EFFECTS[u.get('fx')]) st.fx = u.get('fx');
    if (u.get('style') === 'pixel') st.style = 'pixel';
    if (V.THEMES[u.get('palette')]) st.palette = u.get('palette');
    if (+u.get('seed') > 0) st.seed = Math.floor(+u.get('seed'));
    if ([0.75, 1, 1.5].includes(+u.get('speed'))) st.speed = +u.get('speed');
  })();
  function writeUrl() {
    const u = new URLSearchParams({ fx: st.fx });
    if (st.style !== 'hd') u.set('style', st.style);
    if (st.palette) u.set('palette', st.palette);
    if (st.seed !== 1) u.set('seed', st.seed);
    if (st.speed !== 1) u.set('speed', st.speed);
    try { history.replaceState(null, '', location.pathname + '?' + u); } catch (e) { /* ignore */ }
  }

  /* ---------- 背景 ---------- */
  function rnd(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const BG = {
    night: (g, s) => { const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#1d2236'); gr.addColorStop(1, '#0f1220'); g.fillStyle = gr; g.fillRect(0, 0, s, s); },
    grass: (g, s) => { g.fillStyle = '#3f6b35'; g.fillRect(0, 0, s, s); const r = rnd(7); g.fillStyle = '#4c7d3f'; for (let i = 0; i < 900; i++) g.fillRect(r() * s | 0, r() * s | 0, 3, 5); },
    stone: (g, s) => { g.fillStyle = '#6c6a66'; g.fillRect(0, 0, s, s); g.strokeStyle = '#55534f'; g.lineWidth = 3; const c = s / 4; for (let y = 0; y < 4; y++) for (let x = -1; x < 4; x++) g.strokeRect(x * c + (y % 2 ? c / 2 : 0), y * c, c, c); },
    paper: (g, s) => { g.fillStyle = '#e9dfc7'; g.fillRect(0, 0, s, s); },
    check: (g, s) => { const c = s / 16; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (x + y) % 2 ? '#c9c9c9' : '#f2f2f2'; g.fillRect(x * c, y * c, c, c); } }
  };

  /* ---------- 渲染 + 预览 ---------- */
  const cv = $('#vx-cv'), g = cv.getContext('2d'), S = cv.width, tmp = document.createElement('canvas');
  let frames = [];
  function build() {
    R = V.render(st.fx, { style: st.style, seed: st.seed, palette: st.palette || undefined, speed: st.speed });
    tmp.width = tmp.height = R.size;
    frames = R.frames.map(f => new ImageData(new Uint8ClampedArray(f), R.size, R.size));
    const ex = st.style === 'pixel' ? R.size * st.scale : R.size;
    $('#vx-meta').textContent = T.meta.replace('{n}', R.frames.length).replace('{fps}', R.fps).replace('{s}', ex + '×' + ex).replace('{seed}', st.seed);
    $('#vx-cmd').textContent = cmd();
    writeUrl();
  }
  function cmd() {
    let c = 'npx sfxbrew vfx ' + st.fx;
    if (st.style === 'pixel') c += ' --style pixel' + (st.scale > 1 ? ' --scale ' + st.scale : '');
    if (st.palette) c += ' --palette ' + st.palette;
    if (st.speed !== 1) c += ' --speed ' + st.speed;
    c += ' --seed ' + st.seed + (st.sound && D.sounds[st.fx] ? ' --sound' : '') + ' --out assets/vfx/';
    return c;
  }
  function draw(now) {
    BG[st.bg](g, S);
    let k = Math.floor(frames.length * 0.35);
    if (R.loop) k = Math.floor(now / 1000 * R.fps) % frames.length;   /* 循环特效一直在播 */
    else if (t0 != null) {
      const f = Math.floor((now - t0) / 1000 * R.fps);
      if (f >= frames.length + Math.round(R.fps * 0.4)) { if (st.loop) { t0 = now; fire(); k = 0; } else { t0 = null; } }
      else k = f < frames.length ? f : -1;
    }
    if (k >= 0 && frames[k]) {
      tmp.getContext('2d').putImageData(frames[k], 0, 0);
      g.imageSmoothingEnabled = st.style !== 'pixel';
      g.drawImage(tmp, 0, 0, S, S);
    }
    requestAnimationFrame(draw);
  }

  /* ---------- 声音 ---------- */
  const bufCache = new Map();
  function sound(i, sr) {
    const key = st.fx + i + '@' + sr;
    if (!bufCache.has(key)) bufCache.set(key, SFX.render(D.sounds[st.fx][i % D.sounds[st.fx].length], sr));
    return bufCache.get(key);
  }
  async function fire() {
    if (!st.sound || !D.sounds[st.fx]) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const b = await sound(sfxN++, actx.sampleRate);
    await actx.resume();
    const src = actx.createBufferSource(); src.buffer = b; src.connect(actx.destination); src.start();
  }
  const play = () => { t0 = performance.now(); fire(); };

  /* ---------- 下载 ---------- */
  const toPng = (w, h, data) => new Promise(res => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
    c.toBlob(b => b.arrayBuffer().then(a => res(new Uint8Array(a))), 'image/png');
  });
  const exportR = () => st.style === 'pixel' ? V.upscale(R, st.scale) : R;
  async function dlPng() {
    const r = exportR(), sh = V.sheet(r);
    SFXB.download(await toPng(sh.width, sh.height, sh.data), st.fx + '_strip' + r.frames.length + '.png', 'image/png');
  }
  async function dlZip(btn) {
    btn.disabled = true;
    try {
      const enc = new TextEncoder(), files = [], name = st.fx, dir = 'sfxbrew-vfx-' + name + '/';
      const add = (p, d) => files.push({ name: dir + p, data: typeof d === 'string' ? enc.encode(d) : d });
      const r = exportR(), sh = V.sheet(r), png = name + '_strip' + r.frames.length + '.png';
      const it = { r, base: name, png, anim: name };
      add(png, await toPng(sh.width, sh.height, sh.data));
      add(name + '.json', JSON.stringify(PK.atlasJson(it), null, 1) + '\n');
      for (let i = 0; i < r.frames.length; i++) add('frames/' + name + '_' + String(i).padStart(2, '0') + '.png', await toPng(r.size, r.size, r.frames[i]));
      const wavs = [];
      if (st.sound && D.sounds[name]) for (let i = 0; i < 3; i++) {
        const f = name + '-' + String(i + 1).padStart(2, '0') + '.wav';
        add('wav/' + f, SFXB.wavBytes(await SFX.render(D.sounds[name][i], 44100)));
        wavs.push(f);
      }
      add('godot/' + name + '.tres', PK.gdSpriteFrames([it]));
      if (wavs.length) add('godot/' + name + '_sfx.tres', PK.gdRandomizer(wavs));
      add('godot/sfxbrew_vfx.gd', PK.gdScript());
      add('godot/' + name + '.tscn', PK.gdScene(name, wavs.length > 0, name));
      add('README.txt', PK.readme({ name, label: V.EFFECTS[name].label, items: [it], style: st.style, withSound: wavs.length > 0 }));
      SFXB.downloadBlob(SFXB.zip(files), 'sfxbrew-vfx-' + name + (st.style === 'pixel' ? '-pixel' : '') + '.zip');
    } finally { btn.disabled = false; }
  }

  /* ---------- 控件 ---------- */
  function sync() {
    $$('[data-fx]').forEach(b => b.setAttribute('aria-pressed', b.dataset.fx === st.fx));
    $$('[data-style]').forEach(b => b.setAttribute('aria-pressed', b.dataset.style === st.style));
    $$('[data-pal]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pal === st.palette));
    $$('[data-speed]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.speed === st.speed));
    $$('[data-scale]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.scale === st.scale));
    $$('[data-bg]').forEach(b => b.setAttribute('aria-pressed', b.dataset.bg === st.bg));
    $('#vx-scale-row').hidden = st.style !== 'pixel';
    $('#vx-sound').checked = st.sound;
    $('#vx-loop').setAttribute('aria-pressed', st.loop);
    $('#vx-desc').textContent = D.fx[st.fx];
  }
  const on = (sel, key, conv, rebuild) => $$(sel).forEach(b => b.addEventListener('click', () => {
    st[key] = conv(b.dataset[Object.keys(b.dataset)[0]]); sync(); if (rebuild) { build(); play(); }
  }));
  on('[data-fx]', 'fx', String, true);
  on('[data-style]', 'style', String, true);
  on('[data-pal]', 'palette', String, true);
  on('[data-speed]', 'speed', Number, true);
  on('[data-scale]', 'scale', Number, true);
  on('[data-bg]', 'bg', String, false);
  $('#vx-play').addEventListener('click', play);
  $('#vx-again').addEventListener('click', () => { st.seed = 1 + Math.floor(Math.random() * 99999); build(); play(); });
  $('#vx-loop').addEventListener('click', () => { st.loop = !st.loop; sync(); if (st.loop && t0 == null) play(); });
  $('#vx-sound').addEventListener('change', e => { st.sound = e.target.checked; build(); });
  $('#vx-png').addEventListener('click', dlPng);
  $('#vx-zip').addEventListener('click', e => dlZip(e.currentTarget));
  $('#vx-copy').addEventListener('click', e => { SFXB.copyText($('#vx-cmd').textContent); e.currentTarget.textContent = T.copied; });
  sync(); build(); requestAnimationFrame(draw);
})();
