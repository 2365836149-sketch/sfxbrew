/* ============================================================================
   SFX Brew · 页面逻辑
   ----------------------------------------------------------------------------
   状态：当前预设 id + 当前参数 patch。任何改动 → 防抖重新离线渲染 → 画波形。
   导出：WAV（16 位单声道 44.1k）、JS 代码（makeSfx 源码 + 参数）、10 个变体打包 zip。
   参数会写进网址的 # 后面，复制网址就能分享同一个声音。
   ==========================================================================*/
(function () {
  'use strict';

  const SFX = makeSfx();
  const PRESETS = window.SFX_PRESETS;
  const $ = s => document.querySelector(s);

  /* ==================== 文案 ==================== */
  const T = {
    en: {
      tagline: 'Free game sound effect generator · Eastern & retro',
      east: 'Eastern', general: 'General',
      play: 'Play', mutate: 'Mutate', fresh: 'New', wav: 'WAV', code: 'Copy JS', pack: 'Pack ×10', share: 'Share link',
      copied: 'Copied!', linkCopied: 'Link copied', packing: 'Rendering…',
      layers: 'Layers', addLayer: '+ Layer', delLayer: 'Remove', effects: 'Effects', advanced: 'Fine-tune',
      codeTitle: 'Drop-in JavaScript', codeHint: 'Zero dependencies. Paste into your game and call the play function after a click or tap (browsers block audio before the first user gesture).',
      close: 'Close', copy: 'Copy', history: 'Recent', keys: 'Space play · M mutate · N new',
      license: 'Every sound you make here is yours: free for commercial use, no attribution required.',
      f: {
        type: 'Source', wave: 'Wave', freq: 'Pitch start', freqEnd: 'Pitch end', start: 'Delay', attack: 'Attack', decay: 'Decay', vol: 'Volume',
        filter: 'Filter', cutoff: 'Cutoff start', cutoffEnd: 'Cutoff end', q: 'Resonance', vib: 'Vibrato', vibRate: 'Vibrato rate',
        slideTime: 'Pitch time', sweepTime: 'Filter time', unison: 'Unison', detune: 'Detune', fmRatio: 'FM ratio', fmIndex: 'FM depth', fmDecay: 'FM decay',
        rep: 'Repeats', repGap: 'Repeat gap', repStep: 'Repeat step', scale: 'Scale',
        reverb: 'Reverb', echo: 'Echo', echoTime: 'Echo time', drive: 'Drive', crush: 'Bit crush', gain: 'Master'
      },
      opt: { fm: 'FM', full: 'whole', tone: 'Tone', pluck: 'Pluck', bell: 'Bell', noise: 'Noise', none: 'None', lowpass: 'Low-pass', highpass: 'High-pass', bandpass: 'Band-pass', penta: 'Pentatonic', chromatic: 'Chromatic', sine: 'Sine', triangle: 'Triangle', square: 'Square', sawtooth: 'Saw', off: 'off' },
      p: {
        swordQi: 'Sword Qi', guqin: 'Guqin Pluck', bell: 'Temple Bell', gong: 'Gong', spell: 'Spell Cast', thunder: 'Heavenly Thunder',
        breakthrough: 'Breakthrough', talisman: 'Talisman Burn', alchemy: 'Alchemy Bubble', chime: 'Wind Chime', flute: 'Bamboo Flute', qiGather: 'Qi Gathering',
        coin: 'Coin', pickup: 'Pickup', click: 'Click', confirm: 'Confirm', error: 'Error', jump: 'Jump', hit: 'Hit', explosion: 'Explosion',
        laser: 'Laser', powerUp: 'Power-up', levelUp: 'Level Up', whoosh: 'Whoosh'
      }
    },
    zh: {
      tagline: '免费游戏音效生成器 · 东方风格与复古音效',
      east: '东方', general: '通用',
      play: '播放', mutate: '变体', fresh: '重新生成', wav: '下载 WAV', code: '复制 JS', pack: '打包 10 个', share: '分享链接',
      copied: '已复制！', linkCopied: '链接已复制', packing: '渲染中…',
      layers: '音层', addLayer: '+ 音层', delLayer: '删除', effects: '效果', advanced: '精细调节',
      codeTitle: '可直接粘贴的 JavaScript', codeHint: '不依赖任何库。粘贴进你的游戏，在用户点击或触摸之后调用播放函数（浏览器不允许在第一次操作前出声）。',
      close: '关闭', copy: '复制', history: '最近', keys: '空格 播放 · M 变体 · N 重新生成',
      license: '在这里生成的所有音效都归你：可以免费商用，不需要署名。',
      f: {
        type: '声源', wave: '波形', freq: '起始音高', freqEnd: '结束音高', start: '延迟', attack: '起音', decay: '衰减', vol: '音量',
        filter: '滤波', cutoff: '起始截止频率', cutoffEnd: '结束截止频率', q: '共振', vib: '颤音', vibRate: '颤音速度',
        slideTime: '音高滑动时长', sweepTime: '滤波扫动时长', unison: '叠音数', detune: '叠音失谐', fmRatio: '调频比', fmIndex: '调频深度', fmDecay: '调频衰减',
        rep: '重复次数', repGap: '重复间隔', repStep: '每次升降', scale: '音阶',
        reverb: '混响', echo: '回声', echoTime: '回声间隔', drive: '失真', crush: '降位（8-bit）', gain: '总音量'
      },
      opt: { fm: '调频', full: '全程', tone: '音调', pluck: '拨弦', bell: '钟', noise: '噪声', none: '无', lowpass: '低通', highpass: '高通', bandpass: '带通', penta: '五声音阶', chromatic: '半音', sine: '正弦', triangle: '三角', square: '方波', sawtooth: '锯齿', off: '关' },
      p: {
        swordQi: '剑气', guqin: '古琴拨弦', bell: '寺钟', gong: '铜锣', spell: '施法', thunder: '天雷',
        breakthrough: '突破', talisman: '符箓燃烧', alchemy: '丹炉冒泡', chime: '风铃', flute: '竹笛', qiGather: '聚气',
        coin: '金币', pickup: '拾取', click: '点击', confirm: '确认', error: '错误', jump: '跳跃', hit: '受击', explosion: '爆炸',
        laser: '激光', powerUp: '强化', levelUp: '升级', whoosh: '挥动'
      }
    }
  };
  let lang = (() => {
    let saved = null;
    try { saved = localStorage.getItem('sfxbrew-lang'); } catch (e) { /* ignore */ }
    return saved || ((navigator.language || '').startsWith('zh') ? 'zh' : 'en');
  })();
  const t = k => T[lang][k];

  /* ==================== 参数表：滑杆范围 ==================== */
  // [key, kind, min, max, step/unit]  kind: sel 下拉 / log 对数滑杆 / lin 线性 / int 整数
  const LAYER_FIELDS = [
    ['type', 'sel', ['tone', 'fm', 'pluck', 'bell', 'noise']],
    ['wave', 'sel', ['sine', 'triangle', 'square', 'sawtooth']],
    ['freq', 'log', 20, 8000, 'Hz'], ['freqEnd', 'log', 20, 8000, 'Hz'], ['slideTime', 'lin', 0, 2, 's'],
    ['fmRatio', 'lin', 0.25, 8, ''], ['fmIndex', 'lin', 0, 10, ''], ['fmDecay', 'log', 0.005, 2, 's'],
    ['unison', 'int', 1, 5, '×'], ['detune', 'lin', 0, 60, '¢'],
    ['start', 'lin', 0, 2, 's'], ['attack', 'log', 0.001, 2, 's'], ['decay', 'log', 0.01, 8, 's'], ['vol', 'lin', 0, 1, ''],
    ['filter', 'sel', ['none', 'lowpass', 'highpass', 'bandpass']],
    ['cutoff', 'log', 40, 16000, 'Hz'], ['cutoffEnd', 'log', 40, 16000, 'Hz'], ['sweepTime', 'lin', 0, 2, 's'], ['q', 'log', 0.1, 30, ''],
    ['vib', 'lin', 0, 100, '¢'], ['vibRate', 'lin', 0.5, 30, 'Hz'],
    ['rep', 'int', 1, 16, '×'], ['repGap', 'log', 0.01, 1, 's'], ['repStep', 'int', -12, 12, ''],
    ['scale', 'sel', ['penta', 'chromatic']]
  ];
  const FX_FIELDS = [
    ['reverb', 'lin', 0, 1, ''], ['echo', 'lin', 0, 0.9, ''], ['echoTime', 'log', 0.03, 1, 's'],
    ['drive', 'lin', 0, 1, ''], ['crush', 'int', 0, 16, 'bit'], ['gain', 'lin', 0, 1, '']
  ];
  const DEFAULT_LAYER = { type: 'tone', wave: 'sine', freq: 440, freqEnd: 440, start: 0, attack: 0.005, decay: 0.3, vol: 0.4, filter: 'none', cutoff: 4000, cutoffEnd: 4000, q: 1, vib: 0, vibRate: 6, rep: 1, repGap: 0.1, repStep: 0, scale: 'penta', slideTime: 0, sweepTime: 0, unison: 1, detune: 12, fmRatio: 2, fmIndex: 0, fmDecay: 0.1 };

  /* ==================== 状态 ==================== */
  let presetId = 'swordQi', patch = null, layerIdx = 0, recent = [], buffer = null;

  /* ==================== 预设列表 ==================== */
  function renderPresets() {
    ['east', 'general'].forEach(g => {
      const box = $('#group-' + g);
      box.innerHTML = '';
      PRESETS.filter(p => p.group === g).forEach(p => {
        const b = document.createElement('button');
        b.className = 'preset' + (p.id === presetId ? ' on' : '');
        b.textContent = T[lang].p[p.id];
        b.onclick = () => { presetId = p.id; fresh(); };
        box.appendChild(b);
      });
    });
  }

  /* ==================== 滑杆 ==================== */
  const toSlider = (f, v) => f[1] === 'log' ? Math.log(v / f[2]) / Math.log(f[3] / f[2]) * 1000 : v;
  const fromSlider = (f, s) => f[1] === 'log' ? f[2] * Math.pow(f[3] / f[2], s / 1000) : f[1] === 'int' ? Math.round(s) : +s;
  function fmt(f, v) {
    if (f[0] === 'crush' && !v) return T[lang].opt.off;
    if ((f[0] === 'slideTime' || f[0] === 'sweepTime') && !v) return T[lang].opt.full;
    const n = Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(f[1] === 'int' ? 0 : 3).replace(/0+$/, '').replace(/\.$/, '');
    return n + (f[4] ? ' ' + f[4] : '');
  }

  function control(f, obj, onInput) {
    const row = document.createElement('label');
    row.className = 'row';
    const name = document.createElement('span');
    name.className = 'k'; name.textContent = T[lang].f[f[0]];
    row.appendChild(name);
    if (f[1] === 'sel') {
      const s = document.createElement('select');
      f[2].forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = T[lang].opt[o] || o; s.appendChild(op); });
      s.value = obj[f[0]];
      s.onchange = () => { obj[f[0]] = s.value; onInput(true); };
      row.appendChild(s);
      row.appendChild(document.createElement('span'));
    } else {
      const s = document.createElement('input');
      s.type = 'range';
      s.min = f[1] === 'log' ? 0 : f[2]; s.max = f[1] === 'log' ? 1000 : f[3];
      s.step = f[1] === 'log' ? 1 : f[1] === 'int' ? 1 : (f[3] - f[2]) / 200;
      s.value = toSlider(f, obj[f[0]]);
      const val = document.createElement('span');
      val.className = 'v'; val.textContent = fmt(f, obj[f[0]]);
      s.oninput = () => { obj[f[0]] = fromSlider(f, s.value); val.textContent = fmt(f, obj[f[0]]); onInput(false); };
      s.onchange = () => onInput(true);
      row.appendChild(s); row.appendChild(val);
    }
    return row;
  }

  function renderControls() {
    const tabs = $('#layer-tabs');
    tabs.innerHTML = '';
    patch.layers.forEach((l, i) => {
      const b = document.createElement('button');
      b.className = 'tab' + (i === layerIdx ? ' on' : '');
      b.textContent = (i + 1) + ' · ' + T[lang].opt[l.type];
      b.onclick = () => { layerIdx = i; renderControls(); };
      tabs.appendChild(b);
    });
    if (patch.layers.length < 4) {
      const add = document.createElement('button');
      add.className = 'tab ghost'; add.textContent = t('addLayer');
      add.onclick = () => { patch.layers.push(Object.assign({}, DEFAULT_LAYER)); layerIdx = patch.layers.length - 1; changed(true); renderControls(); };
      tabs.appendChild(add);
    }
    const lb = $('#layer-fields');
    lb.innerHTML = '';
    const L = patch.layers[layerIdx];
    LAYER_FIELDS.forEach(f => {
      if (f[0] === 'wave' && !['tone', 'pluck', 'fm'].includes(L.type)) return;
      if (['freq', 'freqEnd', 'slideTime', 'unison'].includes(f[0]) && L.type === 'noise') return;
      if (['fmRatio', 'fmIndex', 'fmDecay'].includes(f[0]) && L.type !== 'fm') return;
      if (f[0] === 'detune' && !(L.unison > 1 && L.type !== 'noise')) return;
      if (['cutoff', 'cutoffEnd', 'sweepTime', 'q'].includes(f[0]) && L.filter === 'none') return;
      if (['repGap', 'repStep', 'scale'].includes(f[0]) && L.rep <= 1) return;
      if (f[0] === 'vibRate' && !L.vib) return;
      lb.appendChild(control(f, L, commit => {
        changed(commit);
        if (commit && ['type', 'filter', 'rep', 'vib', 'unison'].includes(f[0])) renderControls();
      }));
    });
    if (patch.layers.length > 1) {
      const del = document.createElement('button');
      del.className = 'link danger'; del.textContent = t('delLayer');
      del.onclick = () => { patch.layers.splice(layerIdx, 1); layerIdx = 0; changed(true); renderControls(); };
      lb.appendChild(del);
    }
    const fx = $('#fx-fields');
    fx.innerHTML = '';
    FX_FIELDS.forEach(f => fx.appendChild(control(f, patch, changed)));
  }

  /* ==================== 渲染与波形 ==================== */
  let renderTimer = null, renderSeq = 0;
  function changed(commit) {
    writeHash();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(redraw, 80);
    if (commit) SFX.play(patch);
  }

  async function redraw() {
    const seq = ++renderSeq;
    const buf = await SFX.render(patch, 22050);
    if (seq !== renderSeq) return;
    buffer = buf;
    drawWave(buf.getChannelData(0), trimLength(buf.getChannelData(0), 22050));
  }

  function trimLength(d, sr) {
    let end = d.length - 1;
    while (end > 0 && Math.abs(d[end]) < 0.0008) end--;
    return Math.min(d.length, end + Math.floor(sr * 0.02));
  }

  function drawWave(d, n) {
    const cv = $('#wave'), dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const css = getComputedStyle(document.documentElement);
    g.fillStyle = css.getPropertyValue('--wave').trim();
    const mid = h / 2, per = Math.max(1, n / w);
    for (let x = 0; x < w; x++) {
      let lo = 0, hi = 0;
      const a = Math.floor(x * per), b = Math.min(n, Math.floor((x + 1) * per));
      for (let i = a; i < b; i++) { const v = d[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const y1 = mid - hi * mid * 0.95, y2 = mid - lo * mid * 0.95;
      g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
    $('#dur').textContent = (n / 22050).toFixed(2) + ' s';
  }

  /* ==================== 生成 ==================== */
  function setPatch(p, play) {
    patch = p; layerIdx = 0;
    renderPresets(); renderControls();
    $('#sound-name').textContent = T[lang].p[presetId];
    changed(false);
    if (play) SFX.play(patch);
  }
  function remember() {
    if (!patch) return;
    recent.unshift({ id: presetId, p: JSON.parse(JSON.stringify(patch)) });
    recent = recent.slice(0, 10);
    renderHistory();
  }
  function fresh() { remember(); setPatch(PRESETS.find(p => p.id === presetId).gen(), true); }
  function mutate() { remember(); setPatch(window.SFX_MUTATE(patch), true); }

  function renderHistory() {
    const box = $('#history');
    box.innerHTML = '';
    recent.forEach((h, i) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = T[lang].p[h.id] + ' #' + (recent.length - i);
      b.onclick = () => { presetId = h.id; setPatch(JSON.parse(JSON.stringify(h.p)), true); };
      box.appendChild(b);
    });
    $('#history-wrap').hidden = !recent.length;
  }

  /* ==================== 导出：WAV ==================== */
  function wavBytes(buf) {
    const sr = buf.sampleRate, src = buf.getChannelData(0), n = trimLength(src, sr);
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(src[i]));
    const k = peak > 0.98 ? 0.98 / peak : 1;
    const out = new DataView(new ArrayBuffer(44 + n * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
    str(36, 'data'); out.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, src[i] * k)) * 0x7fff, true);
    return new Uint8Array(out.buffer);
  }
  const slug = () => T.en.p[presetId].toLowerCase().replace(/[^a-z0-9]+/g, '-');
  function download(bytes, name, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function exportWav() {
    const buf = await SFX.render(patch, 44100);
    download(wavBytes(buf), 'sfxbrew-' + slug() + '.wav', 'audio/wav');
  }

  /* ==================== 导出：zip（不压缩，够用） ==================== */
  const CRC = (() => { const tb = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } return tb; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let off = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true);
      h.setUint32(18, sz, true); h.setUint32(22, sz, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true);
      c.setUint32(20, sz, true); c.setUint32(24, sz, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + sz;
    });
    const cSize = central.reduce((s, b) => s + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cSize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  async function exportPack() {
    const btn = $('#btn-pack'), label = btn.textContent;
    btn.disabled = true; btn.textContent = t('packing');
    const gen = PRESETS.find(p => p.id === presetId).gen, files = [];
    for (let i = 1; i <= 10; i++) {
      const p = i === 1 ? patch : gen();
      files.push({ name: slug() + '-' + String(i).padStart(2, '0') + '.wav', data: wavBytes(await SFX.render(p, 44100)) });
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zip(files));
    a.download = 'sfxbrew-' + slug() + '-pack.zip';
    document.body.appendChild(a); a.click(); a.remove();
    btn.disabled = false; btn.textContent = label;
  }

  /* ==================== 导出：JS 代码 ==================== */
  function round(p) {
    return JSON.parse(JSON.stringify(p, (k, v) => typeof v === 'number' ? +v.toPrecision(4) : v));
  }
  function codeFor() {
    const name = T.en.p[presetId].replace(/[^A-Za-z0-9]+/g, '');
    const fn = 'play' + name;
    const engine = makeSfx.toString().split('\n').map(s => s.replace(/\s+$/, '')).join('\n');
    return '// ' + T.en.p[presetId] + ' sound — made with SFX Brew (free for commercial use)\n' +
      '// Call ' + fn + '() after a user click/tap.\n' +
      'const sfxBrew = (' + engine + ')();\n' +
      'const SOUND_' + name.toUpperCase() + ' = ' + JSON.stringify(round(patch)) + ';\n' +
      'function ' + fn + '() { sfxBrew.play(SOUND_' + name.toUpperCase() + '); }\n';
  }
  function showCode() {
    $('#code-text').value = codeFor();
    $('#code-dlg').showModal();
  }
  async function copy(text, btn, msg) {
    try { await navigator.clipboard.writeText(text); } catch (e) { const ta = $('#code-text'); ta.select(); document.execCommand('copy'); }
    const old = btn.textContent; btn.textContent = msg; setTimeout(() => btn.textContent = old, 1200);
  }

  /* ==================== 网址分享 ==================== */
  function writeHash() {
    try {
      const s = btoa(unescape(encodeURIComponent(JSON.stringify(round(patch))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      window.history.replaceState(null, '', '#' + presetId + '.' + s);
    } catch (e) { /* ignore */ }
  }
  function readHash() {
    const h = location.hash.slice(1);
    if (!h) return null;
    const [id, s] = h.split('.');
    if (!PRESETS.some(p => p.id === id)) return null;
    presetId = id;
    if (!s) return null;
    try {
      const p = JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
      return p && Array.isArray(p.layers) ? p : null;
    } catch (e) { return null; }
  }

  /* ==================== 语言 ==================== */
  function applyLang() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
    $('#lang').textContent = lang === 'zh' ? 'EN' : '中文';
    document.querySelectorAll('.i18n').forEach(el => { el.hidden = el.dataset.lang !== lang; });
    if (patch) { renderPresets(); renderControls(); renderHistory(); $('#sound-name').textContent = T[lang].p[presetId]; }
  }

  /* ==================== 启动 ==================== */
  $('#btn-play').onclick = () => SFX.play(patch);
  $('#btn-mutate').onclick = mutate;
  $('#btn-new').onclick = fresh;
  $('#btn-wav').onclick = exportWav;
  $('#btn-pack').onclick = exportPack;
  $('#btn-code').onclick = showCode;
  $('#btn-share').onclick = e => copy(location.href, e.currentTarget, t('linkCopied'));
  $('#code-copy').onclick = e => copy($('#code-text').value, e.currentTarget, t('copied'));
  $('#code-close').onclick = () => $('#code-dlg').close();
  $('#wave').onclick = () => SFX.play(patch);
  $('#lang').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; try { localStorage.setItem('sfxbrew-lang', lang); } catch (e) { /* ignore */ } applyLang(); };
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea, dialog[open]') && e.target.type !== 'range') return;
    if (e.code === 'Space') { e.preventDefault(); SFX.play(patch); }
    else if (e.key === 'm' || e.key === 'M') mutate();
    else if (e.key === 'n' || e.key === 'N') fresh();
  });
  window.addEventListener('resize', () => { if (buffer) drawWave(buffer.getChannelData(0), trimLength(buffer.getChannelData(0), 22050)); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (buffer) drawWave(buffer.getChannelData(0), trimLength(buffer.getChannelData(0), 22050)); });

  const fromUrl = readHash();
  applyLang();
  setPatch(fromUrl || PRESETS.find(p => p.id === presetId).gen(), false);
})();
