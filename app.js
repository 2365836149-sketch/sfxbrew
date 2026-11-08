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
      navEditor: 'Editor', navLibrary: 'Sound Library', navPacks: 'Packs', navAgents: 'For AI Agents',
      heroTitle: 'Game sound effects, brewed in your browser',
      heroSub: 'Free, royalty-free SFX for indie and AI-built games: sword qi, guqin and temple bells next to coins, clicks, jumps and explosions. Every press brews a new variation. Download WAV, or copy a few lines of JavaScript that play the sound with no audio files at all.',
      heroLibrary: 'Browse the sound library', heroPack: 'Xianxia sound pack', heroAgents: 'Use it from Claude Code / Cursor →',
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
        bright: 'Brightness', slideTime: 'Pitch time', sweepTime: 'Filter time', unison: 'Unison', detune: 'Detune', fmRatio: 'FM ratio', fmIndex: 'FM depth', fmDecay: 'FM decay',
        rep: 'Repeats', repGap: 'Repeat gap', repStep: 'Repeat step', scale: 'Scale',
        reverb: 'Reverb', echo: 'Echo', echoTime: 'Echo time', drive: 'Drive', crush: 'Bit crush', gain: 'Master'
      },
      opt: { string: 'String', fm: 'FM', full: 'whole', tone: 'Tone', pluck: 'Pluck', bell: 'Bell', noise: 'Noise', none: 'None', lowpass: 'Low-pass', highpass: 'High-pass', bandpass: 'Band-pass', penta: 'Pentatonic', chromatic: 'Chromatic', sine: 'Sine', triangle: 'Triangle', square: 'Square', sawtooth: 'Saw', off: 'off' },
      p: {
        swordQi: 'Sword Qi', guqin: 'Guqin', bell: 'Temple Bell', gong: 'Gong', spell: 'Spell Cast', thunder: 'Heavenly Thunder',
        breakthrough: 'Breakthrough', talisman: 'Talisman Burn', alchemy: 'Alchemy Bubble', chime: 'Wind Chime', flute: 'Bamboo Flute', qiGather: 'Qi Gathering', pipa: 'Pipa', erhu: 'Erhu', woodfish: 'Wooden Fish', drum: 'War Drum',
        coin: 'Coin', pickup: 'Pickup', click: 'Click', confirm: 'Confirm', error: 'Error', jump: 'Jump', hit: 'Hit', explosion: 'Explosion',
        laser: 'Laser', powerUp: 'Power-up', levelUp: 'Level Up', whoosh: 'Whoosh'
      }
    },
    zh: {
      tagline: '免费游戏音效生成器 · 东方风格与复古音效',
      navEditor: '编辑器', navLibrary: '音效库', navPacks: '音效包', navAgents: '给 AI agent 用',
      heroTitle: '在浏览器里熬制游戏音效',
      heroSub: '给独立游戏和 AI 写的游戏用的免费、可商用音效：剑气、古琴、寺钟，也有金币、点击、跳跃、爆炸。每按一次都会生成一个新的变体。可以下载 WAV，也可以复制几行 JavaScript，不用任何音频文件就能播放。',
      heroLibrary: '浏览音效库', heroPack: '修仙音效包', heroAgents: '在 Claude Code / Cursor 里用 →',
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
        bright: '亮度', slideTime: '音高滑动时长', sweepTime: '滤波扫动时长', unison: '叠音数', detune: '叠音失谐', fmRatio: '调频比', fmIndex: '调频深度', fmDecay: '调频衰减',
        rep: '重复次数', repGap: '重复间隔', repStep: '每次升降', scale: '音阶',
        reverb: '混响', echo: '回声', echoTime: '回声间隔', drive: '失真', crush: '降位（8-bit）', gain: '总音量'
      },
      opt: { string: '弦', fm: '调频', full: '全程', tone: '音调', pluck: '拨弦', bell: '钟', noise: '噪声', none: '无', lowpass: '低通', highpass: '高通', bandpass: '带通', penta: '五声音阶', chromatic: '半音', sine: '正弦', triangle: '三角', square: '方波', sawtooth: '锯齿', off: '关' },
      p: {
        swordQi: '剑气', guqin: '古琴', bell: '寺钟', gong: '铜锣', spell: '施法', thunder: '天雷',
        breakthrough: '突破', talisman: '符箓燃烧', alchemy: '丹炉冒泡', chime: '风铃', flute: '竹笛', qiGather: '聚气', pipa: '琵琶', erhu: '二胡', woodfish: '木鱼', drum: '战鼓',
        coin: '金币', pickup: '拾取', click: '点击', confirm: '确认', error: '错误', jump: '跳跃', hit: '受击', explosion: '爆炸',
        laser: '激光', powerUp: '强化', levelUp: '升级', whoosh: '挥动'
      }
    }
  };
  let lang = (() => {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'zh' || q === 'en') return q;
    let saved = null;
    try { saved = localStorage.getItem('sfxbrew-lang'); } catch (e) { /* ignore */ }
    return saved || ((navigator.language || '').startsWith('zh') ? 'zh' : 'en');
  })();
  const t = k => T[lang][k];

  /* ==================== 参数表：滑杆范围 ==================== */
  // [key, kind, min, max, step/unit]  kind: sel 下拉 / log 对数滑杆 / lin 线性 / int 整数
  const LAYER_FIELDS = [
    ['type', 'sel', ['tone', 'fm', 'string', 'pluck', 'bell', 'noise']],
    ['wave', 'sel', ['sine', 'triangle', 'square', 'sawtooth']],
    ['freq', 'log', 20, 8000, 'Hz'], ['freqEnd', 'log', 20, 8000, 'Hz'], ['slideTime', 'lin', 0, 2, 's'], ['bright', 'lin', 0, 1, ''],
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
  const DEFAULT_LAYER = { type: 'tone', wave: 'sine', freq: 440, freqEnd: 440, start: 0, attack: 0.005, decay: 0.3, vol: 0.4, filter: 'none', cutoff: 4000, cutoffEnd: 4000, q: 1, vib: 0, vibRate: 6, rep: 1, repGap: 0.1, repStep: 0, scale: 'penta', slideTime: 0, sweepTime: 0, unison: 1, detune: 12, fmRatio: 2, fmIndex: 0, fmDecay: 0.1, bright: 0.5 };

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
      if (f[0] === 'bright' && L.type !== 'string') return;
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

  const trimLength = SFXB.trimLength;
  function drawWave(d, n) {
    SFXB.drawWave($('#wave'), d, n);
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
  const wavBytes = SFXB.wavBytes, download = SFXB.download;
  const slug = () => T.en.p[presetId].toLowerCase().replace(/[^a-z0-9]+/g, '-');
  async function exportWav() {
    const buf = await SFX.render(patch, 44100);
    download(wavBytes(buf), 'sfxbrew-' + slug() + '.wav', 'audio/wav');
  }

  /* ==================== 导出：zip（不压缩，够用） ==================== */
  const zip = SFXB.zip;
  async function exportPack() {
    const btn = $('#btn-pack'), label = btn.textContent;
    btn.disabled = true; btn.textContent = t('packing');
    const gen = PRESETS.find(p => p.id === presetId).gen, files = [];
    for (let i = 1; i <= 10; i++) {
      const p = i === 1 ? patch : gen();
      files.push({ name: slug() + '-' + String(i).padStart(2, '0') + '.wav', data: wavBytes(await SFX.render(p, 44100)) });
    }
    SFXB.downloadBlob(zip(files), 'sfxbrew-' + slug() + '-pack.zip');
    btn.disabled = false; btn.textContent = label;
  }

  /* ==================== 导出：JS 代码 ==================== */
  const round = SFXB.round;
  function codeFor() {
    return SFXB.jsCode([{ name: T.en.p[presetId], patch }]);
  }
  function showCode() {
    $('#code-text').value = codeFor();
    $('#code-dlg').showModal();
  }
  async function copy(text, btn, msg) {
    await SFXB.copyText(text);
    const old = btn.textContent; btn.textContent = msg; setTimeout(() => btn.textContent = old, 1200);
  }

  /* ==================== 网址分享 ==================== */
  function writeHash() {
    try {
      window.history.replaceState(null, '', SFXB.hashFor(presetId, patch));
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
    document.querySelectorAll('[data-href-zh]').forEach(el => {
      if (!el.dataset.hrefEn) el.dataset.hrefEn = el.getAttribute('href');
      el.setAttribute('href', lang === 'zh' ? el.dataset.hrefZh : el.dataset.hrefEn);
    });
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
