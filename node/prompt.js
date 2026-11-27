/* ============================================================================
   SFX Brew · 自然语言编曲指令集编译器（纯本地规则引擎，零延迟/零 API 成本）
   ----------------------------------------------------------------------------
   将任意中英文自然语言描述（场景、情绪、拍号、速度、乐器、高潮/短版）
   编译为 band.js 可直接执行的完整编曲参数。
   ==========================================================================*/
'use strict';

const SCENE_RULES = [
  { re: /vlog|探店|日常|治愈|生活|咖啡|读书|温馨|轻松/i, preset: 'vlogChill' },
  { re: /科技|评测|测评|开箱|ai|产品|宣传|发布会|极客/i, preset: 'techReview' },
  { re: /搞笑|沙雕|幽默|反转|萌宠|整活|喜剧|滑稽/i, preset: 'funnyMeme' },
  { re: /悬疑|推理|案件|恐怖|解密|侦探|压抑|紧张|潜行/i, preset: 'suspenseTalk' },
  { re: /三消|种田|牧场|农场|休闲|小游戏|合成|消消乐|可爱/i, preset: 'casualPuzzle' },
  { re: /抽卡|大厅|商城|备战|二次元|开箱|扭蛋/i, preset: 'gachaLobby' },
  { re: /国潮|国风电音|新中式/i, preset: 'guochao' },
  { re: /武侠|仙侠|江湖|古风|修仙|剑/i, preset: 'wuxiaHero' },
  { re: /赛博|cyber|机甲|霓虹|夜之城/i, preset: 'cyberpunk' },
  { re: /synthwave|蒸汽波|复古电音|80年代/i, preset: 'synthwave' },
  { re: /lofi|lo-fi|学习|自习|助眠|发呆/i, preset: 'lofi' },
  { re: /酒馆|中世纪|吟游|奇幻城镇|村庄/i, preset: 'tavern' },
  { re: /jrpg|冒险|城镇|rpg/i, preset: 'jrpg' },
  { re: /地牢|boss|地下城|史诗战斗/i, preset: 'dungeon' },
  { re: /爵士|jazz|bossa|巴萨|海边|沙滩/i, preset: 'bossanova' },
  { re: /雨夜|noir|黑白电影/i, preset: 'noir' },
  { re: /太空|宇宙|星空|漂浮/i, preset: 'ambientSpace' },
  { re: /热带|海岛|夏日|阳光/i, preset: 'tropical' }
];

const INST_MAP = [
  [/电钢|electric\s*piano|rhodes|ep/i, 'epiano', 'melody'],
  [/钢琴|piano/i, 'piano', 'melody'],
  [/古筝|筝|koto/i, 'koto', 'melody'],
  [/木吉他|尼龙吉他|古典吉他|nylon/i, 'nylon', 'accomp'],
  [/民谣吉他|钢弦|steel/i, 'steel', 'accomp'],
  [/电吉他|过载|失真|rock\s*guitar/i, 'overdriveGuitar', 'melody'],
  [/爵士吉他|jazz\s*guitar/i, 'jazzGuitar', 'accomp'],
  [/萨克斯|sax/i, 'altoSax', 'melody'],
  [/长笛|竹笛|笛子|flute/i, 'flute', 'melody'],
  [/单簧管|黑管|clarinet/i, 'clarinet', 'melody'],
  [/双簧管|oboe/i, 'oboe', 'melody'],
  [/小提琴|violin/i, 'violin', 'melody'],
  [/大提琴|cello/i, 'cello', 'bass'],
  [/小号|trumpet/i, 'trumpet', 'melody'],
  [/圆号|horn/i, 'horn', 'counter'],
  [/手风琴|accordion/i, 'accordion', 'melody'],
  [/竖琴|harp/i, 'harp', 'accomp'],
  [/马林巴|木琴|marimba/i, 'marimba', 'melody'],
  [/颤音琴|vibraphone/i, 'vibraphone', 'melody'],
  [/钢片琴|八音盒|celesta|music\s*box/i, 'celesta', 'melody'],
  [/卡林巴|拇指琴|kalimba/i, 'kalimba', 'counter'],
  [/拨弦|pizzicato/i, 'pizzicato', 'accomp'],
  [/弦乐|strings/i, 'strings', 'pad'],
  [/管风琴|风琴|organ/i, 'organ', 'accomp'],
  [/合成主音|saw|lead/i, 'sawLead', 'melody'],
  [/铺底|pad|氛围垫/i, 'warmPad', 'pad'],
  [/合唱|choir/i, 'choirPad', 'pad'],
  [/原声贝斯|立式贝斯|acoustic\s*bass/i, 'acousticBass', 'bass'],
  [/slap|打弦贝斯/i, 'slapBass', 'bass'],
  [/合成贝斯|synth\s*bass/i, 'synthBass', 'bass'],
  [/808/i, 'kit808', 'drums'],
  [/电子鼓|electronic/i, 'electronicKit', 'drums'],
  [/重鼓|战鼓|大鼓|taiko/i, 'powerKit', 'drums']
];

function compilePrompt(promptText) {
  const text = String(promptText || '').trim();
  const out = { instruments: {} };

  // 1. 匹配场景预设作为起点
  for (const r of SCENE_RULES) {
    if (r.re.test(text)) { out.preset = r.preset; break; }
  }

  // 2. 拍号识别
  if (/3\s*[\/拍]|三拍|华尔兹|圆舞曲|waltz/i.test(text)) {
    out.meter = 3;
    out.groove = 'waltz';
  } else if (/4\s*[\/拍]|四拍/i.test(text)) {
    out.meter = 4;
  }

  // 3. 速度 BPM 识别
  const bpmMatch = text.match(/(\d{2,3})\s*bpm/i);
  if (bpmMatch) {
    out.tempo = Math.max(40, Math.min(200, Number(bpmMatch[1])));
  } else if (/极快|狂飙|激烈|高燃|燃|急促/i.test(text)) {
    out.tempo = 136;
  } else if (/快一点|轻快|欢快|动感|活力/i.test(text)) {
    out.tempo = 116;
  } else if (/慢一点|舒缓|抒情|安静|助眠|极慢/i.test(text)) {
    out.tempo = 74;
  }

  // 4. 律动与调式识别
  if (/bossa|巴萨/i.test(text)) out.groove = 'bossa';
  else if (/trap|808/i.test(text)) out.groove = 'trap';
  else if (/boombap|hiphop|说唱/i.test(text)) out.groove = 'boombap';
  else if (/舞曲|动次打次|4\/4电音|fouronfloor/i.test(text)) out.groove = 'fourOnFloor';
  else if (/进行曲|行军/i.test(text)) out.groove = 'march';
  else if (/空灵|氛围|无律动/i.test(text)) out.groove = 'ambient';

  if (/五声|国风|中国风|古风|东方/i.test(text)) out.scale = 'penta';
  else if (/布鲁斯|蓝调|blues/i.test(text)) out.scale = 'blues';
  else if (/悲伤|忧郁|凄凉|小调/i.test(text)) out.scale = 'minor';
  else if (/治愈|温馨|温暖|阳光|明亮|大调/i.test(text)) { out.scale = 'penta'; out.chordMood = 'warm'; }
  else if (/欢快/i.test(text)) out.scale = 'major';

  // 5. 乐器自由提取（支持多主奏自动分配 melody + counter）
  let melAssigned = false;
  for (const [re, instId, role] of INST_MAP) {
    if (!re.test(text)) continue;
    if (role === 'melody') {
      if (!melAssigned) { out.instruments.melody = instId; melAssigned = true; }
      else if (!out.instruments.counter) out.instruments.counter = instId;
    } else {
      out.instruments[role] = instId;
    }
  }
  if (/不要鼓|无鼓|去掉鼓|no\s*drums|drumless/i.test(text)) {
    out.instruments.drums = null;
  }
  if (/不要贝斯|无贝斯|no\s*bass/i.test(text)) {
    out.instruments.bass = null;
  }

  // 6. 动态曲线识别
  if (/平稳|平缓|均匀|steady|flat/i.test(text)) out.arc = 'steady';
  else if (/渐强|递进|铺垫|build/i.test(text)) out.arc = 'build';
  else if (/波浪|起伏|wave/i.test(text)) out.arc = 'wave';
  else if (/drop|炸裂|直接进/i.test(text)) out.arc = 'drop';

  // 7. 短版 / 直接进高潮识别（短视频刚需）
  if (/高潮|副歌|hook|短视频|15\s*秒|20\s*秒|30\s*秒|直接开始/i.test(text)) {
    out.structure = ['B', 'C'];
    out.hookOnly = true;
  }

  if (!Object.keys(out.instruments).length) delete out.instruments;
  return out;
}

module.exports = { compilePrompt, SCENE_RULES };
