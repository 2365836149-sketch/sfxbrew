/* ============================================================================
   SFX Brew · 音效目录（分类、标签、搜索关键词）
   ----------------------------------------------------------------------------
   这是"音效怎么分类、怎么被搜到"的唯一来源：网站音效库、编辑器左栏、npm 包 / MCP 都读这里。
   新增一个音效：presets.js 写生成器 → 这里加一条 ENTRIES → site/data.js 写页面文案 → 重新构建。
     cat   大类（CATEGORIES 里的 id），决定它主要出现在哪一类
     also  也出现在哪些大类（可省略）
     tags  标签：style 风格 / material 材质 / mood 情绪，都可多选（取值见 TAGS）
     kw    搜索用的同义词，中英文混写，空格分开
   长短（length，按引擎算出的总时长，含混响尾巴）和来源（source：合成 / 录音）不用手填，由 lengthOf()、sourceOf() 从参数算出。
   ==========================================================================*/
(function () {
  'use strict';

  /* 大类：按"在游戏里拿来干什么"分 */
  const CATEGORIES = [
    { id: 'combat', en: 'Combat', zh: '战斗' },
    { id: 'magic', en: 'Magic & Xianxia', zh: '法术仙侠' },
    { id: 'instrument', en: 'Eastern Instruments', zh: '东方乐器' },
    { id: 'ui', en: 'UI', zh: '界面' },
    { id: 'items', en: 'Items & Rewards', zh: '道具奖励' },
    { id: 'character', en: 'Character', zh: '角色动作' },
    { id: 'ambience', en: 'Ambience', zh: '环境氛围' },
    { id: 'creature', en: 'Creatures', zh: '生物' }
  ];

  /* 标签维度 */
  const TAGS = {
    style: { en: 'Style', zh: '风格', values: [
      { id: 'eastern', en: 'Eastern', zh: '东方' }, { id: 'xianxia', en: 'Xianxia', zh: '仙侠' }, { id: 'retro', en: 'Retro 8-bit', zh: '复古 8-bit' },
      { id: 'realistic', en: 'Realistic', zh: '写实' }, { id: 'cartoon', en: 'Cartoon', zh: '卡通' }] },
    material: { en: 'Material', zh: '材质', values: [
      { id: 'metal', en: 'Metal', zh: '金属' }, { id: 'wood', en: 'Wood', zh: '木' }, { id: 'stone', en: 'Stone', zh: '石' }, { id: 'water', en: 'Water', zh: '水' },
      { id: 'fire', en: 'Fire', zh: '火' }, { id: 'electric', en: 'Electric', zh: '电' }, { id: 'air', en: 'Air', zh: '风 / 气' }, { id: 'cloth', en: 'Cloth & paper', zh: '布 / 纸' }] },
    mood: { en: 'Mood', zh: '情绪', values: [
      { id: 'calm', en: 'Calm', zh: '平静' }, { id: 'bright', en: 'Bright', zh: '轻快' }, { id: 'tense', en: 'Tense', zh: '紧张' },
      { id: 'mysterious', en: 'Mysterious', zh: '神秘' }, { id: 'solemn', en: 'Solemn', zh: '庄严' }, { id: 'sad', en: 'Sad', zh: '悲伤' }] },
    length: { en: 'Length', zh: '长短', auto: true, values: [
      { id: 'short', en: 'Short (≤ 1 s)', zh: '短（≤ 1 秒）' }, { id: 'medium', en: 'Medium', zh: '中等' }, { id: 'long', en: 'Long (> 3 s)', zh: '长（> 3 秒）' }] },
    source: { en: 'Source', zh: '来源', auto: true, values: [
      { id: 'synth', en: 'Synthesized', zh: '合成' }, { id: 'recorded', en: 'Uses recordings', zh: '含真实录音' }] }
  };

  /* 每个预设一条 */
  const E = (cat, also, style, material, mood, kw) => ({ cat, also, tags: { style, material, mood }, kw });
  const ENTRIES = {
    swordQi: E('combat', ['magic'], ['eastern', 'xianxia'], ['metal', 'air'], ['tense'], '剑 剑气 刀 挥剑 斩 刀光 sword slash blade qi katana'),
    guqin: E('instrument', [], ['eastern'], ['wood'], ['calm'], '古琴 琴 拨弦 弦 guqin zither pluck harp'),
    bell: E('instrument', ['ui'], ['eastern'], ['metal'], ['solemn'], '钟 寺钟 铜钟 梵钟 铃 bell temple chime notification'),
    gong: E('instrument', ['combat'], ['eastern'], ['metal'], ['solemn', 'tense'], '锣 铜锣 大锣 京剧 开场 gong tam'),
    spell: E('magic', [], ['xianxia', 'cartoon'], ['air'], ['mysterious'], '施法 法术 魔法 技能 咒语 spell magic cast skill'),
    thunder: E('magic', ['ambience'], ['xianxia', 'realistic'], ['electric', 'air'], ['tense', 'solemn'], '雷 天雷 雷声 渡劫 暴风雨 thunder storm rumble'),
    lightning: E('magic', ['ambience', 'combat'], ['xianxia', 'realistic'], ['electric'], ['tense'], '霹雳 闪电 雷击 电 雷法 lightning strike electric zap'),
    breakthrough: E('magic', ['items'], ['xianxia'], ['metal', 'air'], ['solemn'], '突破 境界 渡劫 升级 飞升 breakthrough ascend realm prestige'),
    talisman: E('magic', [], ['xianxia', 'eastern'], ['fire', 'cloth'], ['mysterious'], '符 符箓 符纸 燃烧 火 火焰 talisman paper fire burn crackle'),
    alchemy: E('magic', ['items'], ['xianxia', 'cartoon'], ['water'], ['bright'], '丹 炼丹 丹炉 药水 冒泡 气泡 potion bubble brew alchemy'),
    chime: E('instrument', ['ui', 'items'], ['eastern'], ['metal'], ['mysterious', 'bright'], '风铃 铃 发现 闪光 chime wind sparkle discover'),
    flute: E('instrument', [], ['eastern'], ['wood', 'air'], ['calm'], '笛 竹笛 笛子 吹 flute dizi'),
    qiGather: E('magic', [], ['xianxia'], ['air'], ['tense'], '聚气 蓄力 充能 气 运功 charge energy qi'),
    pipa: E('instrument', [], ['eastern'], ['wood'], ['bright'], '琵琶 拨弦 轮指 pipa lute'),
    erhu: E('instrument', [], ['eastern'], ['wood'], ['sad'], '二胡 胡琴 拉弦 悲伤 erhu fiddle sad'),
    woodfish: E('instrument', ['ui'], ['eastern'], ['wood'], ['calm'], '木鱼 敲 寺庙 点击 wooden fish block temple tok'),
    drum: E('instrument', ['combat'], ['eastern', 'realistic'], ['wood'], ['tense', 'solemn'], '鼓 战鼓 大鼓 擂鼓 打仗 drum war battle taiko'),
    coin: E('items', [], ['retro', 'cartoon'], ['metal'], ['bright'], '金币 钱 硬币 金钱 收入 coin money gold cash'),
    pickup: E('items', [], ['retro', 'cartoon'], [], ['bright'], '拾取 捡 道具 宝石 收集 pickup item collect gem'),
    click: E('ui', [], ['cartoon'], [], ['calm'], '点击 按钮 咔哒 click button tap ui'),
    confirm: E('ui', [], ['cartoon'], [], ['bright'], '确认 成功 好的 完成 confirm ok success'),
    error: E('ui', [], ['retro'], [], ['tense'], '错误 失败 不行 拒绝 error wrong fail deny'),
    jump: E('character', [], ['retro', 'cartoon'], [], ['bright'], '跳 跳跃 弹跳 jump bounce hop'),
    hit: E('combat', [], ['realistic', 'cartoon'], [], ['tense'], '打 受击 打击 拳 伤害 hit punch impact damage'),
    explosion: E('combat', [], ['realistic'], ['fire'], ['tense'], '爆炸 爆 炸弹 boom explosion bomb blast'),
    laser: E('combat', [], ['retro'], ['electric'], ['tense'], '激光 枪 射击 激光枪 laser gun shoot blaster pew'),
    powerUp: E('items', ['magic'], ['retro'], ['electric'], ['bright'], '强化 增益 变强 power up buff upgrade'),
    levelUp: E('items', [], ['retro', 'cartoon'], [], ['bright'], '升级 等级 成就 奖励 level up achievement reward'),
    whoosh: E('combat', ['character'], ['realistic'], ['air'], [], '挥动 风 呼 冲刺 闪避 whoosh swoosh swing dash wind'),
    arrow: E('combat', [], ['realistic'], ['wood', 'air'], ['tense'], '箭 射箭 弓 弓箭 中靶 arrow bow shoot archer'),
    swordClash: E('combat', [], ['realistic', 'eastern'], ['metal'], ['tense'], '刀剑相击 兵器 碰撞 格挡 叮 clash parry block metal clang sword'),
    footstepStone: E('character', [], ['realistic'], ['stone'], ['calm'], '脚步 走路 石头 石板 地面 footstep step walk stone'),
    rain: E('ambience', [], ['realistic'], ['water'], ['calm', 'sad'], '雨 下雨 雨声 雨点 天气 rain weather drizzle storm loop'),
    notify: E('ui', ['items'], ['cartoon'], [], ['bright'], '通知 提示 消息 叮咚 notification notify message alert ping'),
    footstepGrass: E('character', [], ['realistic'], [], ['calm'], '脚步 走路 跑步 草地 树叶 草丛 footstep step walk run grass leaves forest'),
    land: E('character', [], ['realistic'], ['wood'], [], '落地 着地 跳 跌落 摔 land landing jump fall thud'),
    shieldBlock: E('combat', [], ['realistic'], ['metal', 'wood'], ['tense'], '格挡 盾 盾牌 挡住 招架 防御 block shield guard parry defend'),
    wind: E('ambience', [], ['realistic'], ['air'], ['calm', 'mysterious'], '风 大风 风声 呼啸 阵风 wind gust breeze howl storm loop'),
    campfire: E('ambience', [], ['realistic'], ['fire', 'wood'], ['calm'], '篝火 火 柴火 火堆 噼啪 营地 campfire fire crackle bonfire camp loop'),
    stream: E('ambience', [], ['realistic'], ['water'], ['calm'], '流水 溪水 小溪 河 水声 stream water river brook creek loop'),
    caveDrip: E('ambience', [], ['realistic'], ['water', 'stone'], ['mysterious'], '滴水 水滴 洞穴 山洞 回声 drip drop water cave echo dungeon'),
    pageTurn: E('ui', [], ['realistic'], ['cloth'], ['calm'], '翻页 书 纸 翻书 秘籍 page turn book paper flip'),
    typing: E('ui', [], ['realistic'], ['metal'], [], '打字 打字机 键盘 按键 对话 typing typewriter keyboard type text dialogue'),
    chestOpen: E('items', [], ['realistic'], ['wood'], ['bright'], '宝箱 开箱 箱子 木箱 宝物 开门 吱呀 chest open treasure loot box creak'),
    monsterGrowl: E('creature', [], ['realistic'], [], ['tense'], '怪物 低吼 咆哮 野兽 龙 妖兽 monster growl roar beast dragon creature')
  };

  /* 自动标签 */
  const lengthOf = sec => (sec <= 1 ? 'short' : sec > 3 ? 'long' : 'medium');   /* sec = 引擎 duration()，含混响尾音 */
  const sourceOf = patch => ((patch.layers || []).some(l => l.type === 'sample') ? 'recorded' : 'synth');
  /* 某个预设出现在哪些大类 */
  const catsOf = id => { const e = ENTRIES[id]; return e ? [e.cat].concat(e.also || []) : []; };

  const api = { CATEGORIES, TAGS, ENTRIES, lengthOf, sourceOf, catsOf };
  if (typeof window !== 'undefined') window.SFX_CATALOG = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
