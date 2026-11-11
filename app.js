/* ============================================================================
   SFX Brew · 页面逻辑
   ----------------------------------------------------------------------------
   状态：当前预设 id + 当前参数 patch。任何改动 → 防抖重新离线渲染 → 画波形。
   导出：WAV（16 位单声道 44.1k）、JS 代码（makeSfx 源码 + 参数）、游戏引擎包 zip（变体或无缝循环 + Godot / Unity / 网页播放文件，见 export.js）。
   环境音等可循环的预设多一行「循环」：选 10/30/60 秒后，播放、下载 WAV、导出都变成无缝循环。
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
      search: 'Search: sword, coin, metal, calm…', noMatch: 'No preset matches. Try another word.',
      tweakLabel: 'Shape it', tweakHint: 'Each click nudges the sound in one direction. Stack them.', exportH: 'Export', fineH: 'Fine controls', undo: 'Undo',
      tryNow: 'Click to hear', advanced: 'Fine-tune layers and effects',
      prop1h: 'Free for commercial use', prop1: 'No sign-up, no attribution. Use the sounds in any game you sell.',
      prop2h: 'Made in your browser', prop2: 'Every sound is generated on your device. Each click brews a new variation.',
      prop3h: 'Built for AI coding agents', prop3: 'Claude Code, Cursor and others can generate and wire in sounds via MCP.',
      tw: { heavier: 'Heavier', lighter: 'Lighter', farther: 'Farther', closer: 'Closer', brighter: 'Brighter', darker: 'Darker', longer: 'Longer', shorter: 'Shorter', punchier: 'Punchier', softer: 'Softer', magical: 'More magical', retro: 'More retro' },
      navEditor: 'Editor', navLibrary: 'Library', navLab: 'Music Lab', navAI: 'AI SFX', pickSound: 'Sound', navAgents: 'For AI agents', docTitle: 'Sound Effect Editor — Free Game SFX Generator | SFX Brew',
      heroTitle: 'Game sound effects, made on the spot.',
      heroTry: 'Hear one', heroOpen: 'Open the editor',
      editorTitle: 'Make it yours.', editorSub: 'Pick a sound, press Mutate until it fits, nudge it heavier or farther, then download.',
      musicTitle: 'Music that writes itself.', musicSub: 'Eastern background music composed live in your browser. Loop it, or let it play forever without repeating.', musicCta: 'Open the music generator',
      moodCalm: 'Calm landscape', moodBattle: 'Battle', moodMystery: 'Mysterious cave', moodSad: 'Sorrow',
      agentsTitle: 'Or let your AI add them.', agentsSub: 'One command gives Claude Code, Cursor and other agents a free, local sound generator.',
      heroSub: 'Free for commercial use. Generated in your browser. Press one and listen.',
      heroLibrary: 'Browse the sound library', heroPack: 'Xianxia sound pack', heroAgents: 'Use it from Claude Code / Cursor →',
      east: 'Eastern', general: 'General', allCats: 'All categories',
      play: 'Play', mutate: 'Mutate', fresh: 'New', wav: 'Download WAV', code: 'Copy JS', pack: 'Engine pack', packTitle: 'Zip with WAV variations (or loops) plus Godot, Unity and web player files', share: 'Share link',
      loop: 'Loop', loopOff: 'Off', loopHint: 'Seamless loop. The WAV carries a loop point (Godot, FMOD, Wwise, GameMaker).', stop: 'Stop', looping: 'loop',
      copied: 'Copied!', linkCopied: 'Link copied', packing: 'Rendering…',
      layers: 'Layers', addLayer: '+ Layer', delLayer: 'Remove this layer', effects: 'Effects', advanced: 'Fine-tune',
      codeTitle: 'Drop-in JavaScript', codeHint: 'Zero dependencies. Paste into your game and call the play function after a click or tap (browsers block audio before the first user gesture).',
      close: 'Close', copy: 'Copy', history: 'Recent', keys: 'Space play · M mutate · N new',
      license: 'Every sound you make here is yours: free for commercial use, no attribution required.',
      f: {
        type: 'Source', wave: 'Wave', freq: 'Pitch start', freqEnd: 'Pitch end', start: 'Delay', attack: 'Attack', decay: 'Decay', vol: 'Volume',
        filter: 'Filter', cutoff: 'Cutoff start', cutoffEnd: 'Cutoff end', q: 'Resonance', vib: 'Vibrato', vibRate: 'Vibrato rate',
        bright: 'Brightness', sample: 'Recording', pitch: 'Transpose', pitchEnd: 'Transpose end', offset: 'Start offset', hold: 'Hold', repAccel: 'Repeat speed-up', repGain: 'Repeat crescendo', freqPeak: 'Peak pitch', cutoffPeak: 'Peak cutoff', color: 'Noise color', trem: 'Tremolo', tremRate: 'Tremolo rate', jitter: 'Randomness', pitchJitter: 'Pitch spread', slideTime: 'Pitch time', sweepTime: 'Filter time', unison: 'Unison', detune: 'Detune', fmRatio: 'FM ratio', fmIndex: 'FM depth', fmDecay: 'FM decay',
        rep: 'Repeats', repGap: 'Repeat gap', repStep: 'Repeat step', scale: 'Scale',
        reverb: 'Reverb', echo: 'Echo', echoTime: 'Echo time', drive: 'Drive', crush: 'Bit crush', gain: 'Master'
      },
      opt: { sample: 'Recording', 'drum-center-loud': 'Dagu · center, loud', 'drum-center-soft': 'Dagu · center, soft', 'drum-edge-loud': 'Dagu · edge, loud', 'drum-rim': 'Dagu · rim shot', 'lightning-1': 'Lightning strike 1', 'lightning-2': 'Lightning strike 2', 'gong-1': 'Gong hit', 'gong-2': 'Gong roll', 'erhu-d3': 'Erhu D4', 'erhu-f5': 'Erhu F5', 'sword-clash': 'Sword clashes (8 hits)', 'footstep-stone': 'Stone footsteps (12)', 'arrow': 'Arrow (shots and hits)', 'footstep-grass': 'Grass footsteps (8)', 'land': 'Landings (3)', 'shield-block': 'Shield hits (6)', 'page-turn': 'Page turns (7)', 'typewriter': 'Typewriter keys (12 + bell)', 'chest-open': 'Chest opening (3)', 'monster-growl': 'Monster growls (4)', 'campfire': 'Campfire loops (2)', 'stream': 'Stream loops (2)', white: 'White', pink: 'Pink', brown: 'Brown', string: 'String', fm: 'FM', full: 'whole', tone: 'Tone', pluck: 'Pluck', bell: 'Bell', noise: 'Noise', none: 'None', lowpass: 'Low-pass', highpass: 'High-pass', bandpass: 'Band-pass', penta: 'Pentatonic', chromatic: 'Chromatic', sine: 'Sine', triangle: 'Triangle', square: 'Square', sawtooth: 'Saw', off: 'off' },
      p: {
        swordQi: 'Sword Qi', guqin: 'Guqin', bell: 'Temple Bell', gong: 'Gong', spell: 'Spell Cast', thunder: 'Heavenly Thunder',
        breakthrough: 'Breakthrough', talisman: 'Talisman Burn', alchemy: 'Alchemy Bubble', chime: 'Wind Chime', flute: 'Bamboo Flute', qiGather: 'Qi Gathering', pipa: 'Pipa', erhu: 'Erhu', woodfish: 'Wooden Fish', drum: 'War Drum', lightning: 'Lightning',
        coin: 'Coin', pickup: 'Pickup', click: 'Click', confirm: 'Confirm', error: 'Error', jump: 'Jump', hit: 'Hit', explosion: 'Explosion',
        laser: 'Laser', powerUp: 'Power-up', levelUp: 'Level Up', whoosh: 'Whoosh',
        arrow: 'Arrow', swordClash: 'Sword Clash', footstepStone: 'Footstep (Stone)', rain: 'Rain', notify: 'Notification',
        footstepGrass: 'Footstep (Grass)', land: 'Land', shieldBlock: 'Shield Block', wind: 'Wind', campfire: 'Campfire', stream: 'Stream', caveDrip: 'Cave Drip', pageTurn: 'Page Turn', typing: 'Typing', chestOpen: 'Chest Open', monsterGrowl: 'Monster Growl'
      }
    },
    zh: {
      tagline: '免费游戏音效生成器 · 东方风格与复古音效',
      search: '搜索：剑、金币、金属、平静……', noMatch: '没有匹配的预设，换个词试试。',
      tweakLabel: '调整', tweakHint: '每点一次朝一个方向推一点，可以连着点。', exportH: '导出', fineH: '精细调节', undo: '撤销',
      tryNow: '点一下试听', advanced: '精细调节（音层和效果）',
      prop1h: '免费可商用', prop1: '不用注册、不用署名，卖钱的游戏也能用。',
      prop2h: '在浏览器里生成', prop2: '声音在你的设备上实时生成，每点一次都是新的变体。',
      prop3h: '为 AI 写代码而做', prop3: 'Claude Code、Cursor 等可以通过 MCP 直接生成并接入音效。',
      tw: { heavier: '更重', lighter: '更轻', farther: '更远', closer: '更近', brighter: '更亮', darker: '更暗', longer: '更长', shorter: '更短', punchier: '更有力', softer: '更柔和', magical: '更魔幻', retro: '更复古' },
      navEditor: '音效编辑器', navLibrary: '音效库', navLab: '配乐实验室', navAI: 'AI 生成', pickSound: '声音', navAgents: '给 AI 用', docTitle: '音效编辑器：免费游戏音效生成 | SFX Brew',
      heroTitle: '游戏音效，现做现用。',
      heroTry: '试听一下', heroOpen: '打开编辑器',
      editorTitle: '调成你想要的样子。', editorSub: '选一个声音，点"变体"直到顺耳，再调得更重、更远，然后下载。',
      musicTitle: '自己会作曲的配乐。', musicSub: '在浏览器里实时创作的东方背景音乐。可以导出循环，也可以让它一直放、永不重复。', musicCta: '打开配乐生成器',
      moodCalm: '宁静山水', moodBattle: '战斗', moodMystery: '神秘洞府', moodSad: '悲伤抒情',
      agentsTitle: '或者，让 AI 帮你加。', agentsSub: '一条命令，Claude Code、Cursor 等 agent 就有了一个免费、本地的音效生成器。',
      heroSub: '免费可商用，在浏览器里生成。点一个，听听看。',
      heroLibrary: '浏览音效库', heroPack: '修仙音效包', heroAgents: '在 Claude Code / Cursor 里用 →',
      east: '东方', general: '通用', allCats: '全部大类',
      play: '播放', mutate: '变体', fresh: '重新生成', wav: '下载 WAV', code: '复制 JS', pack: '导出到引擎', packTitle: '打包下载：多个变体（或循环）的 WAV + Godot、Unity、网页的播放文件', share: '分享链接',
      loop: '循环', loopOff: '关', loopHint: '无缝循环，WAV 带循环点（Godot、FMOD、Wwise、GameMaker 能直接识别）。', stop: '停止', looping: '循环',
      copied: '已复制！', linkCopied: '链接已复制', packing: '渲染中…',
      layers: '音层', addLayer: '+ 音层', delLayer: '删除这一层', effects: '效果', advanced: '精细调节',
      codeTitle: '可直接粘贴的 JavaScript', codeHint: '不依赖任何库。粘贴进你的游戏，在用户点击或触摸之后调用播放函数（浏览器不允许在第一次操作前出声）。',
      close: '关闭', copy: '复制', history: '最近', keys: '空格 播放 · M 变体 · N 重新生成',
      license: '在这里生成的所有音效都归你：可以免费商用，不需要署名。',
      f: {
        type: '声源', wave: '波形', freq: '起始音高', freqEnd: '结束音高', start: '延迟', attack: '起音', decay: '衰减', vol: '音量',
        filter: '滤波', cutoff: '起始截止频率', cutoffEnd: '结束截止频率', q: '共振', vib: '颤音', vibRate: '颤音速度',
        bright: '亮度', sample: '录音素材', pitch: '移调', pitchEnd: '结束移调', offset: '从第几秒开始', hold: '保持', repAccel: '重复加速', repGain: '重复渐强', freqPeak: '中途最高音', cutoffPeak: '中途最高截止', color: '噪声颜色', trem: '音量波动', tremRate: '波动速度', jitter: '随机程度', pitchJitter: '音高散布', slideTime: '音高滑动时长', sweepTime: '滤波扫动时长', unison: '叠音数', detune: '叠音失谐', fmRatio: '调频比', fmIndex: '调频深度', fmDecay: '调频衰减',
        rep: '重复次数', repGap: '重复间隔', repStep: '每次升降', scale: '音阶',
        reverb: '混响', echo: '回声', echoTime: '回声间隔', drive: '失真', crush: '降位（8-bit）', gain: '总音量'
      },
      opt: { sample: '录音', 'drum-center-loud': '大鼓·鼓心重击', 'drum-center-soft': '大鼓·鼓心轻击', 'drum-edge-loud': '大鼓·鼓边重击', 'drum-rim': '大鼓·鼓框', 'lightning-1': '雷击实录 1', 'lightning-2': '雷击实录 2', 'gong-1': '锣·重击', 'gong-2': '锣·滚奏', 'erhu-d3': '二胡 D4', 'erhu-f5': '二胡 F5', 'sword-clash': '刀剑相击（8 下）', 'footstep-stone': '石地脚步（12 步）', 'arrow': '射箭（射出和中靶）', 'footstep-grass': '草地脚步（8 步）', 'land': '落地（3 段）', 'shield-block': '盾牌撞击（6 下）', 'page-turn': '翻页（7 段）', 'typewriter': '打字机按键（12 键 + 铃）', 'chest-open': '开箱（3 段）', 'monster-growl': '怪物低吼（4 段）', 'campfire': '篝火（2 段循环）', 'stream': '流水（2 段循环）', white: '白噪声', pink: '粉红噪声', brown: '棕色噪声', string: '弦', fm: '调频', full: '全程', tone: '音调', pluck: '拨弦', bell: '钟', noise: '噪声', none: '无', lowpass: '低通', highpass: '高通', bandpass: '带通', penta: '五声音阶', chromatic: '半音', sine: '正弦', triangle: '三角', square: '方波', sawtooth: '锯齿', off: '关' },
      p: {
        swordQi: '剑气', guqin: '古琴', bell: '寺钟', gong: '铜锣', spell: '施法', thunder: '天雷',
        breakthrough: '突破', talisman: '符箓燃烧', alchemy: '丹炉冒泡', chime: '风铃', flute: '竹笛', qiGather: '聚气', pipa: '琵琶', erhu: '二胡', woodfish: '木鱼', drum: '战鼓', lightning: '霹雳',
        coin: '金币', pickup: '拾取', click: '点击', confirm: '确认', error: '错误', jump: '跳跃', hit: '受击', explosion: '爆炸',
        laser: '激光', powerUp: '强化', levelUp: '升级', whoosh: '挥动',
        arrow: '射箭', swordClash: '刀剑相击', footstepStone: '脚步（石地）', rain: '雨', notify: '通知',
        footstepGrass: '脚步（草地）', land: '落地', shieldBlock: '格挡', wind: '风', campfire: '篝火', stream: '流水', caveDrip: '洞穴滴水', pageTurn: '翻页', typing: '打字', chestOpen: '开宝箱', monsterGrowl: '怪物低吼'
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
    ['type', 'sel', ['tone', 'fm', 'string', 'pluck', 'bell', 'noise', 'sample']],
    ['sample', 'sel', Object.keys(window.SFX_SAMPLES || {})], ['pitch', 'lin', -24, 24, 'st'], ['pitchEnd', 'lin', -24, 24, 'st'], ['offset', 'lin', 0, 10, 's'],
    ['wave', 'sel', ['sine', 'triangle', 'square', 'sawtooth']], ['color', 'sel', ['white', 'pink', 'brown']],
    ['freq', 'log', 20, 8000, 'Hz'], ['freqPeak', 'logoff', 20, 8000, 'Hz'], ['freqEnd', 'log', 20, 8000, 'Hz'], ['slideTime', 'lin', 0, 2, 's'], ['bright', 'lin', 0, 1, ''],
    ['fmRatio', 'lin', 0.25, 8, ''], ['fmIndex', 'lin', 0, 10, ''], ['fmDecay', 'log', 0.005, 2, 's'],
    ['unison', 'int', 1, 5, '×'], ['detune', 'lin', 0, 60, '¢'],
    ['start', 'lin', 0, 2, 's'], ['attack', 'log', 0.001, 2, 's'], ['hold', 'lin', 0, 2, 's'], ['decay', 'log', 0.01, 8, 's'], ['vol', 'lin', 0, 1, ''],
    ['filter', 'sel', ['none', 'lowpass', 'highpass', 'bandpass']],
    ['cutoff', 'log', 40, 16000, 'Hz'], ['cutoffPeak', 'logoff', 40, 16000, 'Hz'], ['cutoffEnd', 'log', 40, 16000, 'Hz'], ['sweepTime', 'lin', 0, 2, 's'], ['q', 'log', 0.1, 30, ''],
    ['vib', 'lin', 0, 100, '¢'], ['vibRate', 'lin', 0.5, 30, 'Hz'], ['trem', 'lin', 0, 1, ''], ['tremRate', 'lin', 0.5, 20, 'Hz'],
    ['rep', 'int', 1, 64, '×'], ['repGap', 'log', 0.01, 1, 's'], ['repStep', 'int', -12, 12, ''], ['jitter', 'lin', 0, 1, ''], ['pitchJitter', 'lin', 0, 24, 'st'], ['repAccel', 'lin', 0.5, 1.5, '×'], ['repGain', 'lin', 0.5, 1.5, '×'],
    ['scale', 'sel', ['penta', 'chromatic']]
  ];
  const FX_FIELDS = [
    ['reverb', 'lin', 0, 1, ''], ['echo', 'lin', 0, 0.9, ''], ['echoTime', 'log', 0.03, 1, 's'],
    ['drive', 'lin', 0, 1, ''], ['crush', 'int', 0, 16, 'bit'], ['gain', 'lin', 0, 2, '']
  ];
  const DEFAULT_LAYER = { type: 'tone', wave: 'sine', freq: 440, freqEnd: 440, start: 0, attack: 0.005, decay: 0.3, vol: 0.4, filter: 'none', cutoff: 4000, cutoffEnd: 4000, q: 1, vib: 0, vibRate: 6, rep: 1, repGap: 0.1, repStep: 0, scale: 'penta', slideTime: 0, sweepTime: 0, unison: 1, detune: 12, fmRatio: 2, fmIndex: 0, fmDecay: 0.1, bright: 0.5, color: 'white', trem: 0, tremRate: 6, jitter: 0, pitchJitter: 0, freqPeak: 0, cutoffPeak: 0, hold: 0, repAccel: 1, repGain: 1, sample: 'drum-center-loud', pitch: 0, offset: 0 };

  /* ==================== 状态 ==================== */
  let presetId = 'swordQi', patch = null, layerIdx = 0, recent = [], buffer = null;
  /* 循环：loopSec = 0 关；loopNode = 正在播放的循环；loopCache 避免同一个声音反复渲染 */
  const EXP = window.SFX_EXPORT;
  let loopSec = 0, loopNode = null, loopCache = null, loopBusy = false;

  /* ==================== 预设列表：按 catalog.js 的大类分组 ==================== */
  const CAT = window.SFX_CATALOG;
  /* 大类折叠：记住展开了哪些；默认只展开当前音效所在的大类 */
  let openCats = null;
  try { openCats = JSON.parse(localStorage.getItem('sfxbrew-open-cats')); } catch (e) { /* ignore */ }
  const saveOpen = () => { try { localStorage.setItem('sfxbrew-open-cats', JSON.stringify([...openCats])); } catch (e) { /* ignore */ } };
  function renderPresets() {
    if (!Array.isArray(openCats)) openCats = [CAT.ENTRIES[presetId] ? CAT.ENTRIES[presetId].cat : ''];
    if (!(openCats instanceof Set)) openCats = new Set(openCats);
    const box = $('#preset-groups'), sel = $('#preset-cat');
    if (!sel.options.length || sel.dataset.lang !== lang) {
      sel.innerHTML = '<option value="">' + t('allCats') + '</option>' + CAT.CATEGORIES.filter(c => PRESETS.some(p => CAT.ENTRIES[p.id] && CAT.ENTRIES[p.id].cat === c.id))
        .map(c => '<option value="' + c.id + '">' + c[lang] + '</option>').join('');
      sel.dataset.lang = lang;
    }
    box.innerHTML = '';
    CAT.CATEGORIES.forEach(c => {
      const ps = PRESETS.filter(p => CAT.ENTRIES[p.id] && CAT.ENTRIES[p.id].cat === c.id);
      if (!ps.length) return;
      const g = document.createElement('div');
      g.className = 'pgroup' + (openCats.has(c.id) ? '' : ' closed'); g.dataset.cat = c.id;
      g.innerHTML = '<h2 class="sec-h"><button type="button" class="pgroup-h" aria-expanded="' + openCats.has(c.id) + '">'
        + '<span class="chev" aria-hidden="true">▸</span>' + c[lang] + ' <span class="pgroup-n">' + ps.length + '</span></button></h2><div class="grid"></div>';
      g.querySelector('.pgroup-h').onclick = e => {
        const open = g.classList.toggle('closed') === false;
        e.currentTarget.setAttribute('aria-expanded', open);
        open ? openCats.add(c.id) : openCats.delete(c.id);
        saveOpen();
      };
      ps.forEach(p => {
        const b = document.createElement('button');
        b.className = 'preset' + (p.id === presetId ? ' on' : '');
        b.dataset.id = p.id;
        b.textContent = T[lang].p[p.id];
        b.onclick = () => { presetId = p.id; fresh(); togglePresets(false); };
        g.querySelector('.grid').appendChild(b);
      });
      box.appendChild(g);
    });
    filterPresets();
    $('#preset-cur').textContent = T[lang].p[presetId] || '';
  }
  /* 手机上预设列表默认收起，只留一行「声音：当前预设 ▾」；选好一个自动收起 */
  function togglePresets(open) {
    const box = document.querySelector('.ed-presets');
    open = open === undefined ? !box.classList.contains('open') : open;
    box.classList.toggle('open', open);
    $('#preset-toggle').setAttribute('aria-expanded', open);
  }
  /* 搜索：中英文名 + 目录关键词 + 大类名 + 标签名 */
  const hayOf = id => {
    const e = CAT.ENTRIES[id] || { tags: {}, kw: '' };
    const tags = Object.keys(e.tags).flatMap(d => (e.tags[d] || []).map(v => { const x = CAT.TAGS[d].values.find(y => y.id === v); return x ? x.en + ' ' + x.zh : ''; }));
    const cats = CAT.catsOf(id).map(c => { const x = CAT.CATEGORIES.find(y => y.id === c); return x.en + ' ' + x.zh; });
    return [e.kw, T.en.p[id], T.zh.p[id], id].concat(tags, cats).join(' ').toLowerCase();
  };

  /* ==================== 滑杆 ==================== */
  const toSlider = (f, v) => f[1] === 'logoff' ? (v > 0 ? 1 + Math.log(v / f[2]) / Math.log(f[3] / f[2]) * 999 : 0)
    : f[1] === 'log' ? Math.log(v / f[2]) / Math.log(f[3] / f[2]) * 1000 : v;
  const fromSlider = (f, s) => f[1] === 'logoff' ? (+s <= 0 ? 0 : f[2] * Math.pow(f[3] / f[2], (s - 1) / 999))
    : f[1] === 'log' ? f[2] * Math.pow(f[3] / f[2], s / 1000) : f[1] === 'int' ? Math.round(s) : +s;
  function fmt(f, v) {
    if ((f[0] === 'crush' || f[1] === 'logoff') && !v) return T[lang].opt.off;
    if ((f[0] === 'slideTime' || f[0] === 'sweepTime') && !v) return T[lang].opt.full;
    const n = Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(f[1] === 'int' ? 0 : 3).replace(/0+$/, '').replace(/\.$/, '');
    return n + (f[4] ? ' ' + f[4] : '');
  }

  function control(f, obj, onInput) {
    if (obj[f[0]] == null) obj[f[0]] = f[1] === 'sel' ? f[2][0] : (DEFAULT_LAYER[f[0]] != null ? DEFAULT_LAYER[f[0]] : (f[1] === 'log' ? f[2] : 0));
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
      const lg = f[1] === 'log' || f[1] === 'logoff';
      s.min = lg ? 0 : f[2]; s.max = lg ? 1000 : f[3];
      s.step = lg ? 1 : f[1] === 'int' ? 1 : (f[3] - f[2]) / 200;
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
      if (['sample', 'pitch', 'pitchEnd', 'offset'].includes(f[0]) && L.type !== 'sample') return;
      if (['freq', 'freqPeak', 'freqEnd', 'unison', 'detune'].includes(f[0]) && L.type === 'sample') return;
      if (['freq', 'freqPeak', 'freqEnd', 'slideTime', 'unison'].includes(f[0]) && L.type === 'noise') return;
      if (['fmRatio', 'fmIndex', 'fmDecay'].includes(f[0]) && L.type !== 'fm') return;
      if (f[0] === 'bright' && L.type !== 'string') return;
      if (f[0] === 'color' && L.type !== 'noise') return;
      if (f[0] === 'tremRate' && !L.trem) return;
      if (f[0] === 'detune' && !(L.unison > 1 && L.type !== 'noise')) return;
      if (['cutoff', 'cutoffPeak', 'cutoffEnd', 'sweepTime', 'q'].includes(f[0]) && L.filter === 'none') return;
      if (['repGap', 'repStep', 'scale', 'jitter', 'pitchJitter', 'repAccel', 'repGain'].includes(f[0]) && L.rep <= 1) return;
      if (f[0] === 'vibRate' && !L.vib) return;
      lb.appendChild(control(f, L, commit => {
        changed(commit);
        if (commit && ['type', 'filter', 'rep', 'vib', 'unison', 'trem'].includes(f[0])) renderControls();
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
    if (loopNode) { stopLoop(); if (commit) playLoop(); }
    else if (commit) playCurrent();
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
    renderLoopRow();
    changed(false);
    if (play) playCurrent();
  }
  function remember() {
    if (!patch) return;
    recent.unshift({ id: presetId, p: JSON.parse(JSON.stringify(patch)) });
    recent = recent.slice(0, 10);
    renderHistory();
  }
  function fresh() { remember(); undoStack.length = 0; setPatch(PRESETS.find(p => p.id === presetId).gen(), true); renderTweaks(); }
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

  /* ==================== 循环 ==================== */
  const looping = () => loopSec > 0 && EXP.LOOPABLE.includes(presetId);
  function renderLoopRow() {
    const row = $('#loop-row');
    row.hidden = !EXP.LOOPABLE.includes(presetId);
    if (row.hidden) { if (loopNode) stopLoop(); return; }
    const seg = $('#loop-seg');
    seg.innerHTML = '';
    [0].concat(EXP.LOOP_SECONDS).forEach(sec => {
      const b = document.createElement('button');
      b.textContent = sec ? sec + (lang === 'zh' ? ' 秒' : ' s') : t('loopOff');
      b.className = sec === loopSec ? 'on' : '';
      b.onclick = () => { loopSec = sec; stopLoop(); renderLoopRow(); if (sec) playLoop(); };
      seg.appendChild(b);
    });
  }
  function buildLoop(p, sec) {
    return EXP.makeLoop(SFX.render, p, { seconds: sec, preset: presetId, samples: window.SFX_SAMPLES, mutate: window.SFX_MUTATE, sampleRate: 44100 });
  }
  async function loopData() {
    const key = presetId + '|' + loopSec + '|' + JSON.stringify(patch);
    if (loopCache && loopCache.key === key) return loopCache.data;
    const data = await buildLoop(patch, loopSec);
    loopCache = { key, data };
    return data;
  }
  function setPlayLabel() { $('#btn-play').textContent = loopNode ? '■ ' + t('stop') : t('play'); }
  function stopLoop() {
    if (!loopNode) return;
    const { src, g, ctx } = loopNode;
    loopNode = null;
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
    src.stop(ctx.currentTime + 0.4);
    setPlayLabel();
  }
  async function playLoop() {
    if (loopBusy) return;
    loopBusy = true;
    const btn = $('#btn-play');
    btn.textContent = t('packing');
    try {
      const d = await loopData(), ctx = SFX.context();
      if (ctx.state === 'suspended') await ctx.resume();
      stopLoop();
      const b = ctx.createBuffer(1, d.length, 44100);
      b.copyToChannel(d, 0);
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b; src.loop = true;
      g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.3);
      src.connect(g).connect(ctx.destination);
      src.start();
      loopNode = { src, g, ctx };
      SFXB.drawWave($('#wave'), d, d.length);
      $('#dur').textContent = (d.length / 44100).toFixed(1) + ' s · ' + t('looping');
    } finally { loopBusy = false; setPlayLabel(); }
  }
  /* 播放按钮 / 空格 / 点波形：循环模式下开关循环，否则播一次 */
  function playCurrent() {
    if (looping()) { if (loopNode) stopLoop(); else playLoop(); }
    else SFX.play(patch);
  }

  /* ==================== 导出：WAV ==================== */
  const wavBytes = SFXB.wavBytes, download = SFXB.download;
  const slug = () => T.en.p[presetId].toLowerCase().replace(/[^a-z0-9]+/g, '-');
  async function exportWav() {
    if (looping()) { download(EXP.encodeWav(await loopData(), 44100, { loop: true }), 'sfxbrew-' + slug() + '-loop.wav', 'audio/wav'); return; }
    const buf = await SFX.render(patch, 44100);
    download(wavBytes(buf), 'sfxbrew-' + slug() + '.wav', 'audio/wav');
  }

  /* ==================== 导出：游戏引擎包（zip，不压缩） ====================
     一次性音效：当前声音 + 9 个同预设的新变体；循环：当前声音的循环 + 一个微调过的循环。
     附带 Godot 的随机播放资源、Unity 播放脚本、网页播放 JS 和说明，见 export.js */
  const zip = SFXB.zip;
  async function exportPack() {
    const btn = $('#btn-pack'), label = btn.textContent;
    btn.disabled = true; btn.textContent = t('packing');
    try {
      const loop = looping(), name = slug(), wavs = [], patches = [];
      const gen = PRESETS.find(p => p.id === presetId).gen, n = loop ? 2 : 10;
      for (let i = 0; i < n; i++) {
        const p = i === 0 ? patch : loop ? window.SFX_MUTATE(patch, 0.12) : gen();
        patches.push(p);
        const data = loop ? EXP.encodeWav(i === 0 ? await loopData() : await buildLoop(p, loopSec), 44100, { loop: true }) : wavBytes(await SFX.render(p, 44100));
        wavs.push({ name: name + '-' + String(i + 1).padStart(2, '0') + '.wav', data });
        btn.textContent = t('packing') + ' ' + (i + 1) + '/' + n;
      }
      const samples = patches.some(p => p.layers.some(l => l.type === 'sample'));
      const files = EXP.packFiles({ name, title: T.en.p[presetId], wavs, loop, seconds: loopSec, samples, link: location.href });
      SFXB.downloadBlob(zip(files), 'sfxbrew-' + name + (loop ? '-loop' : '') + '.zip');
    } finally { btn.disabled = false; btn.textContent = label; }
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

  /* ==================== 调整词 / 撤销 / 搜索 ==================== */
  const TWEAK_ORDER = ['heavier', 'lighter', 'farther', 'closer', 'brighter', 'darker', 'longer', 'shorter', 'punchier', 'softer', 'magical', 'retro'];
  const undoStack = [];
  function renderTweaks() {
    const box = $('#tweak-buttons');
    box.innerHTML = '';
    TWEAK_ORDER.forEach(k => {
      const b = document.createElement('button');
      b.className = 'tweak';
      b.textContent = T[lang].tw[k];
      b.onclick = () => applyTweak(k);
      box.appendChild(b);
    });
    $('#btn-undo').disabled = !undoStack.length;
  }
  function applyTweak(k) {
    undoStack.push(JSON.parse(JSON.stringify(patch)));
    if (undoStack.length > 30) undoStack.shift();
    patch = window.SFX_TWEAKS[k](patch);
    renderControls();
    changed(true);
    $('#btn-undo').disabled = false;
  }
  function undo() {
    if (!undoStack.length) return;
    patch = undoStack.pop();
    renderControls();
    changed(true);
    $('#btn-undo').disabled = !undoStack.length;
  }
  function filterPresets() {
    const q = $('#preset-search').value.trim().toLowerCase(), cat = $('#preset-cat').value;
    const words = q.split(/\s+/).filter(Boolean);
    let shown = 0;
    document.querySelectorAll('.pgroup').forEach(g => {
      let n = 0;
      g.querySelectorAll('.preset').forEach(b => {
        const id = b.dataset.id;
        const ok = (!cat || CAT.catsOf(id).includes(cat)) && words.every(w => hayOf(id).includes(w));
        b.hidden = !ok; if (ok) n++;
      });
      g.hidden = !n; shown += n;
    });
    $('#search-empty').hidden = shown > 0;
    /* 搜索或筛选时把有结果的大类全部展开 */
    $('#preset-groups').classList.toggle('filtering', !!(words.length || cat));
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
    $('#lang').textContent = lang === 'zh' ? 'English' : '中文';
    document.querySelectorAll('.i18n').forEach(el => { el.hidden = el.dataset.lang !== lang; });
    document.querySelectorAll('[data-href-zh]').forEach(el => {
      if (!el.dataset.hrefEn) el.dataset.hrefEn = el.getAttribute('href');
      el.setAttribute('href', lang === 'zh' ? el.dataset.hrefZh : el.dataset.hrefEn);
    });
    $('#preset-search').placeholder = t('search');
    $('#btn-pack').title = t('packTitle');
    if (patch) { renderPresets(); renderControls(); renderHistory(); renderTweaks(); renderLoopRow(); setPlayLabel(); $('#sound-name').textContent = T[lang].p[presetId]; }
  }

  /* ==================== 启动 ==================== */
  $('#btn-play').onclick = playCurrent;
  $('#btn-undo').onclick = undo;
  $('#preset-search').addEventListener('input', filterPresets);
  $('#preset-cat').addEventListener('change', filterPresets);
  $('#preset-toggle').addEventListener('click', () => togglePresets());
  $('#preset-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') { const b = [...document.querySelectorAll('.preset')].find(x => !x.hidden); if (b) b.click(); }
    if (e.key === 'Escape') { e.target.value = ''; filterPresets(); }
  });
  $('#btn-mutate').onclick = mutate;
  $('#btn-new').onclick = fresh;
  $('#btn-wav').onclick = exportWav;
  $('#btn-pack').onclick = exportPack;
  $('#btn-code').onclick = showCode;
  $('#btn-share').onclick = e => copy(location.href, e.currentTarget, t('linkCopied'));
  $('#code-copy').onclick = e => copy($('#code-text').value, e.currentTarget, t('copied'));
  $('#code-close').onclick = () => $('#code-dlg').close();
  $('#wave').onclick = playCurrent;
  $('#lang').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; try { localStorage.setItem('sfxbrew-lang', lang); } catch (e) { /* ignore */ } applyLang(); };
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea, dialog[open]') && e.target.type !== 'range') return;
    if (e.code === 'Space') { e.preventDefault(); playCurrent(); }
    else if (e.key === 'm' || e.key === 'M') mutate();
    else if (e.key === 'n' || e.key === 'N') fresh();
  });
  window.addEventListener('resize', () => { if (buffer) drawWave(buffer.getChannelData(0), trimLength(buffer.getChannelData(0), 22050)); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (buffer) drawWave(buffer.getChannelData(0), trimLength(buffer.getChannelData(0), 22050)); });

  const fromUrl = readHash();
  applyLang();
  setPatch(fromUrl || PRESETS.find(p => p.id === presetId).gen(), false);
  renderTweaks();
  document.title = t('docTitle');
})();
