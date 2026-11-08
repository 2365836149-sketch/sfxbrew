/* ============================================================================
   SFX Brew · 音效库页面文案（中英双语）
   ----------------------------------------------------------------------------
   每个预设一页：slug 决定网址（中英文共用同一个 slug，中文版在 /zh/ 下面），
   en / zh 各自的 name、title、intro、uses、tip 是正文。related 是页面底部的相关推荐。
   每页文案必须不一样（重复内容会被 Google 降权）。中文按中文习惯写，不是逐字翻译。
   ==========================================================================*/
'use strict';

const SOUNDS = {
  swordQi: {
    slug: 'sword-slash-sound-effect', related: ['whoosh', 'hit', 'spell', 'thunder'],
    en: {
      name: 'Sword Slash', title: 'Free Sword Slash Sound Effects',
      intro: 'Sharp, airy blade swings with a thin metallic ring at the end. They sit somewhere between a classic sword swoosh and the "sword qi" projectiles of wuxia and xianxia games, so they work for both a katana swing and a glowing crescent of energy flying across the screen.',
      uses: ['Melee attacks and combo hits', 'Sword qi, wind blades and energy slashes', 'Parry or blade-draw moments', 'Skill icons that cut across the UI'],
      tip: 'For a heavier weapon, lower the noise layer\'s cutoff and shorten the ring. For a magical slash, raise the reverb.'
    },
    zh: {
      name: '剑气', title: '免费剑气 / 挥剑音效',
      intro: '锋利、带风声的挥剑，尾巴上有一丝金属的余鸣。介于普通的挥剑声和武侠、修仙游戏里"剑气"飞出去的声音之间，挥刀砍人和一道剑光掠过屏幕都能用。',
      uses: ['近战攻击、连招', '剑气、风刃、刀光', '格挡、拔剑', '技能图标划过界面'],
      tip: '想要更沉的兵器，就把噪声层的截止频率调低、余鸣缩短；想要更"仙"，就把混响调大。'
    }
  },
  guqin: {
    slug: 'guqin-sound-effect', related: ['pipa', 'flute', 'chime', 'bell'],
    en: {
      name: 'Guqin', title: 'Free Guqin Sound Effects',
      intro: 'Single notes of the guqin, the seven-string Chinese zither, made with a physically modelled string rather than a synth tone. Each variation is played one of three ways: an open string with a deep, woody ring, a pressed note where the finger slides along the string after the pluck, or a pure, bell-like harmonic. All notes sit on the pentatonic scale.',
      uses: ['Calm UI taps in an Eastern-themed game', 'Dialogue text ticks', 'Meditation, cultivation or crafting feedback', 'Short stingers between scenes'],
      tip: 'Generate a pack and play the notes in sequence on repeated actions: because they share a scale, rapid taps turn into a small melody.'
    },
    zh: {
      name: '古琴', title: '免费古琴音效',
      intro: '古琴单音，用物理建模的琴弦合成，不是普通的电子音色。每个变体随机一种弹法：散音（空弦，低沉、有木头的共鸣）、按音带走手音（弹完手指在弦上一滑，音高跟着变），或者泛音（轻点弦，空灵得像钟）。所有音都在五声音阶上。',
      uses: ['东方题材游戏里安静的界面点击', '对话逐字出现的提示音', '打坐、修炼、炼器的反馈', '场景切换之间的短乐句'],
      tip: '打包下载一组，连续操作时依次播放：同一个音阶，连点就成了一小段旋律。'
    }
  },
  pipa: {
    slug: 'pipa-sound-effect', related: ['guqin', 'erhu', 'drum', 'swordQi'],
    en: {
      name: 'Pipa', title: 'Free Pipa Sound Effects',
      intro: 'The pipa is a pear-shaped Chinese lute with a bright, percussive attack. These variations come in three playing styles: a single plucked note, the rapid tremolo (lunzhi) the instrument is famous for, and a fast strummed chord. Brighter and more urgent than the guqin.',
      uses: ['Tense or action-heavy Eastern scenes', 'Ambush, chase and duel stingers', 'UI accents that need more energy than a guqin', 'Turn start in a card or strategy game'],
      tip: 'The tremolo variants make great "danger is coming" cues; layer one over a war drum.'
    },
    zh: {
      name: '琵琶', title: '免费琵琶音效',
      intro: '琵琶的音色明亮、颗粒感强。每个变体随机一种弹法：单弹、琵琶最有名的轮指（同一个音快速连弹），或者扫弦（几根弦几乎同时响）。比古琴更亮、更紧张。',
      uses: ['紧张、打斗的东方场景', '埋伏、追逐、对决的提示乐句', '比古琴更有力度的界面音效', '卡牌、策略游戏的回合开始'],
      tip: '轮指的变体特别适合"危险来了"的提示，可以和战鼓叠在一起用。'
    }
  },
  erhu: {
    slug: 'erhu-sound-effect', related: ['flute', 'guqin', 'pipa', 'chime'],
    en: {
      name: 'Erhu', title: 'Free Erhu Sound Effects',
      intro: 'Single bowed notes of the erhu, the two-string Chinese fiddle, with its nasal, voice-like tone, wide vibrato and the occasional slide into the note. It carries emotion better than any other sound here.',
      uses: ['Sad or emotional story beats', 'Character themes and introductions', 'Game over or defeat screens', 'Dialogue with an Eastern setting'],
      tip: 'A slower vibrato sounds more sorrowful; a faster one sounds more agitated.'
    },
    zh: {
      name: '二胡', title: '免费二胡音效',
      intro: '二胡单音：带鼻音、像人声的音色，揉弦的颤音，有时还会滑进这个音。在所有音效里最能表达情绪。',
      uses: ['悲伤、感人的剧情', '角色主题、角色登场', '游戏失败、结束画面', '东方背景的对话'],
      tip: '颤音慢一点更哀伤，快一点更激动。'
    }
  },
  woodfish: {
    slug: 'wooden-fish-sound-effect', related: ['bell', 'drum', 'click', 'gong'],
    en: {
      name: 'Wooden Fish', title: 'Free Wooden Fish & Temple Block Sound Effects',
      intro: 'The hollow knock of a muyu, the wooden fish struck by monks while chanting, also known as a temple block. Short and woody, with one to three hits per variation. Clicker games have made the "tok" of a wooden fish famous on its own.',
      uses: ['Clicker and idle game taps', 'Temples, monasteries and chanting', 'Clock ticks and countdowns', 'UI taps with an Eastern feel'],
      tip: 'Single-hit variants are best for repeated taps; double hits work as a "next" or "confirm" sound.'
    },
    zh: {
      name: '木鱼', title: '免费木鱼音效',
      intro: '僧人诵经时敲的木鱼，空心木头"笃"的一声。短促、木质，每个变体敲一到三下。"敲电子木鱼"类的点击游戏让这个声音本身就很有梗。',
      uses: ['点击类、放置类游戏的每一下点击', '寺庙、诵经场景', '钟表滴答、倒计时', '带东方味道的界面点击'],
      tip: '只敲一下的变体适合连续点击；敲两下的适合当"下一步"或"确认"。'
    }
  },
  drum: {
    slug: 'war-drum-sound-effect', related: ['gong', 'thunder', 'hit', 'pipa'],
    en: {
      name: 'War Drum', title: 'Free War Drum & Chinese Drum Sound Effects',
      intro: 'Chinese drum hits, from a small tanggu to a large war drum: a deep body that drops in pitch, the slap of the skin and a short overtone. Some variations hit twice. Loud and physical, built for moments that should feel like a battle is starting.',
      uses: ['Battle start and army marches', 'Turn changes in strategy games', 'Heavy impacts and stomps', 'Countdowns before a fight'],
      tip: 'Play two large hits a beat apart, then a gong, for a classic battle opening.'
    },
    zh: {
      name: '战鼓', title: '免费战鼓 / 堂鼓音效',
      intro: '中国鼓的击打声，从小堂鼓到大战鼓：低沉、音高往下落的鼓腔，鼓皮的拍击声，加一个短短的泛音。有的变体会"咚咚"敲两下。响亮、有分量，适合"要开打了"的时刻。',
      uses: ['战斗开始、行军', '策略游戏的回合切换', '重击、跺地', '开战前的倒计时'],
      tip: '两下大鼓隔一拍，再接一声锣，就是经典的开战。'
    }
  },
  bell: {
    slug: 'temple-bell-sound-effect', related: ['gong', 'chime', 'woodfish', 'breakthrough'],
    en: {
      name: 'Temple Bell', title: 'Free Temple Bell Sound Effects',
      intro: 'Most variations are a large temple bell struck by a wooden beam: a soft thud, then a deep tone whose overtones beat slowly against each other as it fades. Others are smaller bronze bells with a brighter, shorter ring. Trim the tail in your engine if you need a short notification.',
      uses: ['Quest complete or objective reached', 'Shrine, temple and save-point interactions', 'Meditation timers and idle-game milestones', 'Day or night transitions'],
      tip: 'The large bells are slow and solemn; save them for important moments and use the small bronze bells for frequent ones.'
    },
    zh: {
      name: '寺钟', title: '免费寺钟 / 铜钟音效',
      intro: '大多数变体是用撞木撞响的大梵钟：先是一声闷响，然后是低沉的钟声，衰减时泛音之间慢慢"嗡嗡"地起伏。另一些是更小的铜钟，更亮、更短。需要短一点的提示音，在引擎里把尾巴剪掉就行。',
      uses: ['任务完成、达成目标', '神社、寺庙、存档点的互动', '打坐计时、放置游戏的里程碑', '昼夜交替'],
      tip: '大钟庄重缓慢，留给重要时刻；频繁出现的提示用小铜钟。'
    }
  },
  gong: {
    slug: 'gong-sound-effect', related: ['bell', 'drum', 'thunder', 'breakthrough'],
    en: {
      name: 'Gong', title: 'Free Gong Sound Effects',
      intro: 'Two kinds of gong. The large tam-tam has dozens of clashing overtones and a shimmer that swells after the hit. The Chinese opera gong is smaller, and its pitch bends noticeably downward or upward right after it is struck, the sound behind every Peking opera entrance.',
      uses: ['Battle start and round announcements', 'Boss entrances', 'Comedic or dramatic beats (opera gong)', 'Martial arts tournament scenes'],
      tip: 'Opera gongs with a rising bend sound playful; falling ones sound like a dramatic entrance.'
    },
    zh: {
      name: '铜锣', title: '免费铜锣音效',
      intro: '两种锣：大锣（tam-tam），几十个互相打架的泛音，敲完后还会"涨"起一层嗡鸣；京剧锣更小，敲完音高会明显往下掉或往上翘，京剧里角色登场就是这个声音。',
      uses: ['战斗开始、回合宣告', 'Boss 登场', '搞笑或戏剧性的节点（京剧锣）', '比武大会场景'],
      tip: '音高往上翘的京剧锣听着俏皮，往下掉的像隆重登场。'
    }
  },
  spell: {
    slug: 'magic-spell-sound-effect', related: ['qiGather', 'talisman', 'powerUp', 'chime'],
    en: {
      name: 'Spell Cast', title: 'Free Magic Spell Sound Effects',
      intro: 'A rising whoosh topped by a sparkling run of bell notes and a short echo. It reads instantly as "something magical just happened" without sounding like any specific element.',
      uses: ['Casting a spell or using a skill', 'Buffs, heals and enchantments', 'Unlocking an ability', 'Portals and teleports'],
      tip: 'More repeats in the bell layer make a longer shimmer; a negative repeat step turns it into a falling, darker spell.'
    },
    zh: {
      name: '施法', title: '免费施法 / 魔法音效',
      intro: '一阵往上扬的风声，叠着一串闪烁的钟音和短短的回声。一听就知道"有法术发动了"，又不偏向任何一种元素。',
      uses: ['施法、释放技能', '增益、治疗、附魔', '解锁新能力', '传送门、传送'],
      tip: '钟音层重复次数多一些，闪烁就更长；把每次升降设成负数，就变成往下走、更阴暗的法术。'
    }
  },
  thunder: {
    slug: 'thunder-sound-effect', related: ['explosion', 'gong', 'drum', 'breakthrough'],
    en: {
      name: 'Thunder', title: 'Free Thunder & Lightning Sound Effects',
      intro: 'A loud crack followed by a rolling rumble. In xianxia games this is the heavenly tribulation; elsewhere it is simply lightning hitting close by.',
      uses: ['Lightning spells and strikes', 'Heavenly tribulation in cultivation games', 'Storm ambience accents', 'Dramatic reveals'],
      tip: 'Delay the rumble layer by a fraction of a second to make the storm feel further away.'
    },
    zh: {
      name: '天雷', title: '免费雷声 / 天劫音效',
      intro: '一声炸响，接着滚滚的闷雷。在修仙游戏里就是渡劫的天雷，在别的游戏里就是一道近处劈下来的闪电。',
      uses: ['雷系法术、雷击', '修仙游戏的渡劫', '暴风雨场景的点缀', '戏剧性的揭晓时刻'],
      tip: '把闷雷那一层延迟零点几秒，雷就像是在远处。'
    }
  },
  breakthrough: {
    slug: 'cultivation-breakthrough-sound-effect', related: ['levelUp', 'bell', 'qiGather', 'gong'],
    en: {
      name: 'Breakthrough', title: 'Free Breakthrough & Ascension Sound Effects',
      intro: 'A low bell, a soft rumble and a rising arpeggio on plucked strings: the sound of reaching a new cultivation realm. It is grander than a normal level-up and is meant for rare, important moments.',
      uses: ['Realm breakthroughs in cultivation and idle games', 'Prestige or rebirth', 'Major story milestones', 'Unlocking a new area'],
      tip: 'Use the shorter, plainer Level Up sound for frequent progress and save this one for the big steps.'
    },
    zh: {
      name: '突破', title: '免费境界突破音效',
      intro: '一声低沉的钟、一阵闷响，再加一串往上走的拨弦琶音：踏入新境界的声音。比普通的升级隆重得多，留给少见而重要的时刻。',
      uses: ['修仙、放置游戏的境界突破', '转生、重置', '主线剧情的重大节点', '解锁新地图'],
      tip: '平时的进度用更短的"升级"音效，大境界才用这个。'
    }
  },
  talisman: {
    slug: 'talisman-burn-sound-effect', related: ['spell', 'qiGather', 'alchemy', 'explosion'],
    en: {
      name: 'Talisman Burn', title: 'Free Talisman & Fire Crackle Sound Effects',
      intro: 'Crackling paper catching fire, with a rising tone underneath. Built for Taoist talismans and paper charms, it also works as a small fire spell or a fuse being lit.',
      uses: ['Activating a talisman or paper charm', 'Small fire spells', 'Lighting a fuse, torch or incense', 'Burning a scroll in a cutscene'],
      tip: 'Raise the crackle layer\'s repeats for a longer burn.'
    },
    zh: {
      name: '符箓燃烧', title: '免费符箓燃烧 / 火焰噼啪音效',
      intro: '纸张着火的噼啪声，底下垫着一个往上升的音。为道家符箓、纸符设计，也可以当小火球术、点燃引信用。',
      uses: ['激活符箓、纸符', '小型火系法术', '点燃引信、火把、香', '过场动画里烧掉卷轴'],
      tip: '把噼啪那一层的重复次数调多，就烧得更久。'
    }
  },
  alchemy: {
    slug: 'potion-bubble-sound-effect', related: ['pickup', 'confirm', 'chime', 'talisman'],
    en: {
      name: 'Potion Bubble', title: 'Free Potion & Alchemy Bubble Sound Effects',
      intro: 'A few bubbling blips followed by a clear bell: the moment a potion or pill comes out right. Short and cheerful enough to repeat often in crafting loops.',
      uses: ['Potion brewing and alchemy', 'Crafting success', 'Cooking or mixing minigames', 'Consuming a potion'],
      tip: 'Remove the bell layer to get a plain bubbling sound for a failed or ongoing brew.'
    },
    zh: {
      name: '丹炉冒泡', title: '免费炼丹 / 药水冒泡音效',
      intro: '几声咕嘟冒泡，接一声清脆的钟：丹药或药水炼成的那一刻。短而轻快，制作循环里反复播放也不烦。',
      uses: ['炼丹、炼药', '制作成功', '烹饪、调配小游戏', '喝药、吃丹药'],
      tip: '把钟声那一层删掉，就是单纯的冒泡声，可以当炼制中或炼制失败。'
    }
  },
  chime: {
    slug: 'wind-chime-sound-effect', related: ['bell', 'guqin', 'spell', 'pickup'],
    en: {
      name: 'Wind Chime', title: 'Free Wind Chime Sound Effects',
      intro: 'A few soft, high notes from metal tubes on the pentatonic scale, each with a faint shimmer from a slightly detuned twin, like chimes moved by a breeze. Gentle enough for discovery moments that should not interrupt the player.',
      uses: ['Finding a secret or hidden item', 'Random encounters and events', 'Ambient accents in peaceful areas', 'Hover or highlight on special items'],
      tip: 'A longer repeat gap makes it feel like real wind; a short gap makes it feel like a magical sparkle.'
    },
    zh: {
      name: '风铃', title: '免费风铃音效',
      intro: '几声轻柔、高亢的金属管音，五声音阶，每个音旁边还有一个微微走调的"影子"，听起来在轻轻闪烁，像被风吹动的风铃。足够温和，适合不打断玩家的发现时刻。',
      uses: ['发现秘密、隐藏物品', '奇遇、随机事件', '宁静区域的环境点缀', '鼠标悬停在特殊物品上'],
      tip: '重复间隔长一些更像真的风；短一些更像魔法的闪光。'
    }
  },
  flute: {
    slug: 'bamboo-flute-sound-effect', related: ['erhu', 'guqin', 'chime', 'bell'],
    en: {
      name: 'Bamboo Flute', title: 'Free Bamboo Flute Sound Effects',
      intro: 'Single notes in the style of the dizi, the Chinese bamboo flute: a soft fundamental with breath noise that follows the pitch, a puff at the start, gentle vibrato, and the faint buzz of the dizi\'s membrane that gives it its reedy edge.',
      uses: ['Opening a map, journal or menu', 'Scene transitions', 'Pastoral or village areas', 'Character introductions'],
      tip: 'Less vibrato sounds calmer and more modern; more vibrato sounds older and more expressive.'
    },
    zh: {
      name: '竹笛', title: '免费竹笛音效',
      intro: '笛子单音：柔和的基音，跟着音高走的气声，起音时轻轻"噗"一下，带一点颤音，还有笛膜特有的那层沙沙的"嗡"，让它有了竹笛的味道。',
      uses: ['打开地图、日志、菜单', '场景切换', '田园、村庄场景', '角色登场'],
      tip: '颤音少一些更平静、更现代；多一些更古朴、更有表现力。'
    }
  },
  qiGather: {
    slug: 'magic-charge-sound-effect', related: ['spell', 'powerUp', 'breakthrough', 'thunder'],
    en: {
      name: 'Energy Charge', title: 'Free Energy Charge Sound Effects',
      intro: 'A swelling, wobbling rise that ends in a bell, like energy gathering before release. In cultivation games it is qi flowing into the dantian; in any action game it is a charged attack.',
      uses: ['Charged attacks and wind-ups', 'Channelling and meditation ticks', 'Power gauge filling up', 'Before a transformation'],
      tip: 'Stretch the attack of the first layer to make the charge longer.'
    },
    zh: {
      name: '聚气', title: '免费聚气 / 蓄力音效',
      intro: '一个慢慢涨起、带着波动的上升音，最后落在一声钟上，像能量在释放前不断聚集。在修仙游戏里是灵气汇入丹田，在动作游戏里就是蓄力攻击。',
      uses: ['蓄力攻击、起手', '运功、打坐的周期提示', '能量条充满', '变身之前'],
      tip: '把第一层的起音拉长，蓄力就更久。'
    }
  },
  coin: {
    slug: 'coin-sound-effect', related: ['pickup', 'confirm', 'levelUp', 'powerUp'],
    en: {
      name: 'Coin', title: 'Free Coin Sound Effects',
      intro: 'Two-note metallic dings for collecting money. They are built with FM synthesis, so they sound like struck metal rather than a beeping chip, and some variants carry a light retro bit-crush.',
      uses: ['Collecting coins and currency', 'Purchases in a shop', 'Rewards and loot', 'Idle game income ticks'],
      tip: 'For a jackpot, generate several coins and play them a few milliseconds apart.'
    },
    zh: {
      name: '金币', title: '免费金币音效',
      intro: '收钱时"叮叮"两声的金属音。用 FM 合成，听起来像敲在金属上，而不是芯片的"哔哔"；有些变体带一点复古的 8-bit 颗粒感。',
      uses: ['捡金币、获得货币', '商店购买', '奖励、掉落', '放置游戏的收入跳动'],
      tip: '想要"中大奖"的效果，就生成几个金币音，间隔几毫秒一起播。'
    }
  },
  pickup: {
    slug: 'item-pickup-sound-effect', related: ['coin', 'powerUp', 'confirm', 'chime'],
    en: {
      name: 'Item Pickup', title: 'Free Item Pickup Sound Effects',
      intro: 'Quick upward chirps with a small sparkle on top. Short enough to play dozens of times a minute without getting tiring.',
      uses: ['Picking up items and collectibles', 'Gems, orbs and experience points', 'Adding to inventory', 'Hover feedback on loot'],
      tip: 'Lower the pitch for heavier items like armour, raise it for small gems.'
    },
    zh: {
      name: '拾取', title: '免费拾取物品音效',
      intro: '快速往上挑的一声，顶上带一点闪光。足够短，一分钟听几十次也不会腻。',
      uses: ['拾取道具、收集品', '宝石、灵珠、经验值', '放进背包', '鼠标悬停在掉落物上'],
      tip: '盔甲这类重物品把音高调低，小宝石调高。'
    }
  },
  click: {
    slug: 'button-click-sound-effect', related: ['confirm', 'error', 'woodfish', 'whoosh'],
    en: {
      name: 'Button Click', title: 'Free Button Click Sound Effects',
      intro: 'Very short tactile ticks for interface buttons: a tiny burst of filtered noise for the contact plus a quick tonal body. Under 50 milliseconds, so they never lag behind the click.',
      uses: ['Button presses and toggles', 'Menu navigation', 'Typing or keypad input', 'Selecting cards or tiles'],
      tip: 'Pair a lower click for "back" with a higher one for "next" to give menus a sense of direction.'
    },
    zh: {
      name: '点击', title: '免费按钮点击音效',
      intro: '给界面按钮用的极短"咔哒"：一小段滤波噪声模拟接触，加一个很快的音调。不到 50 毫秒，永远不会比点击慢半拍。',
      uses: ['按钮、开关', '菜单导航', '打字、数字键盘', '选择卡牌、格子'],
      tip: '"返回"用低一点的点击，"下一步"用高一点的，菜单就有了方向感。'
    }
  },
  confirm: {
    slug: 'ui-confirm-sound-effect', related: ['click', 'error', 'coin', 'levelUp'],
    en: {
      name: 'UI Confirm', title: 'Free UI Confirm & Success Sound Effects',
      intro: 'Two pleasant electric-piano notes going up. Friendly and quick, for any moment the game says "yes, that worked".',
      uses: ['Confirm buttons and dialogs', 'Save successful', 'Toast notifications', 'Correct answers in quizzes'],
      tip: 'Use it together with the Error sound from the same session so they feel like a matching set.'
    },
    zh: {
      name: '确认', title: '免费确认 / 成功提示音效',
      intro: '两个往上走的电钢琴音，友好、利落，适合游戏里所有"好，成了"的时刻。',
      uses: ['确认按钮、对话框', '保存成功', '弹出提示', '答题答对'],
      tip: '和"错误"音效搭配使用，听起来更像一套。'
    }
  },
  error: {
    slug: 'error-sound-effect', related: ['confirm', 'click', 'hit', 'jump'],
    en: {
      name: 'Error', title: 'Free Error & Wrong Answer Sound Effects',
      intro: 'Two dull, low notes made from stacked, slightly detuned voices. Clear enough to notice, soft enough not to annoy players who hear it often.',
      uses: ['Invalid action or blocked input', 'Not enough gold, mana or energy', 'Wrong answer', 'Locked door or item'],
      tip: 'A falling repeat step sounds more like "wrong"; a flat one sounds more like "not allowed".'
    },
    zh: {
      name: '错误', title: '免费错误 / 答错音效',
      intro: '两声低沉、发闷的音，由几个微微走调的声音叠成。足够明显，又不会让经常听到的玩家烦躁。',
      uses: ['无效操作、被阻止的输入', '金币、灵力、体力不足', '答错', '门或道具被锁住'],
      tip: '第二声往下走更像"错了"；不变调更像"不允许"。'
    }
  },
  jump: {
    slug: 'jump-sound-effect', related: ['whoosh', 'hit', 'pickup', 'powerUp'],
    en: {
      name: 'Jump', title: 'Free Jump Sound Effects',
      intro: 'Short rising boings with a puff of air. Softer and rounder than the classic square-wave jump, with an optional retro bit-crush for pixel-art games.',
      uses: ['Platformer jumps and double jumps', 'Bouncing on springs or enemies', 'Hops and dodges', 'Menu items bouncing in'],
      tip: 'Generate two: a lower one for the first jump and a higher one for the double jump.'
    },
    zh: {
      name: '跳跃', title: '免费跳跃音效',
      intro: '短促往上弹的"嘣"，带一口气声。比经典的方波跳跃声更柔和、更圆润，有些变体带复古 8-bit 质感，适合像素风游戏。',
      uses: ['平台跳跃、二段跳', '踩弹簧、踩敌人', '小跳、闪避', '菜单元素弹入'],
      tip: '生成两个：低一点的给第一跳，高一点的给二段跳。'
    }
  },
  hit: {
    slug: 'hit-punch-sound-effect', related: ['explosion', 'swordQi', 'drum', 'whoosh'],
    en: {
      name: 'Hit', title: 'Free Hit & Punch Sound Effects',
      intro: 'Punchy impacts built from three parts: a sharp crack at the moment of contact, a thump that drops in pitch within a few dozen milliseconds, and a short crunch. That fast pitch drop is what makes a hit feel heavy.',
      uses: ['Melee hits and punches', 'Taking damage', 'Objects colliding', 'Screen shake moments'],
      tip: 'For critical hits, play a hit and a short whoosh together, or raise the drive.'
    },
    zh: {
      name: '受击', title: '免费打击 / 受击音效',
      intro: '有冲击力的打击声，由三部分组成：接触瞬间清脆的一"咔"、几十毫秒内音高迅速落下的闷响、再加一点短促的碎裂感。正是那一下快速的落音高让打击有分量。',
      uses: ['近战打击、拳脚', '受到伤害', '物体碰撞', '屏幕震动的时刻'],
      tip: '暴击时把受击和一个短挥动声一起播，或者把失真调大。'
    }
  },
  explosion: {
    slug: 'explosion-sound-effect', related: ['hit', 'thunder', 'drum', 'laser'],
    en: {
      name: 'Explosion', title: 'Free Explosion Sound Effects',
      intro: 'Big booms with a sub-bass drop, a long rumble and scattered debris crackles. Loud on purpose: mix them down a little if your game has many at once.',
      uses: ['Bombs, grenades and barrels', 'Destroying enemies or buildings', 'Spell impacts', 'Cinematic hits in trailers'],
      tip: 'Shorten the rumble layer for small pops; lengthen it for distant artillery.'
    },
    zh: {
      name: '爆炸', title: '免费爆炸音效',
      intro: '大爆炸：超低频往下沉，长长的轰鸣，再加四散的碎片噼啪声。故意做得很响，游戏里同时爆炸很多的话，把音量压低一点。',
      uses: ['炸弹、手雷、油桶', '摧毁敌人、建筑', '法术命中', '预告片里的重音'],
      tip: '轰鸣层缩短就是小爆竹，拉长就是远处的炮火。'
    }
  },
  laser: {
    slug: 'laser-sound-effect', related: ['explosion', 'powerUp', 'hit', 'whoosh'],
    en: {
      name: 'Laser', title: 'Free Laser Sound Effects',
      intro: 'Falling "pew" zaps made with FM synthesis and two slightly detuned voices, so they have bite without the harshness of a raw square wave.',
      uses: ['Laser guns and blasters', 'Shooting projectiles', 'Sci-fi UI accents', 'Enemy attacks in shooters'],
      tip: 'A shorter pitch time makes a snappier shot; a longer one makes a slower plasma bolt.'
    },
    zh: {
      name: '激光', title: '免费激光枪音效',
      intro: '往下掉的"咻"，用 FM 合成加两个微微走调的声音，有咬劲但不像纯方波那么刺耳。',
      uses: ['激光枪、能量枪', '发射子弹、飞行物', '科幻风格的界面点缀', '射击游戏里的敌人攻击'],
      tip: '音高滑动时长短一些，枪声更干脆；长一些，像一发慢速的等离子弹。'
    }
  },
  powerUp: {
    slug: 'power-up-sound-effect', related: ['levelUp', 'pickup', 'spell', 'qiGather'],
    en: {
      name: 'Power-up', title: 'Free Power-up Sound Effects',
      intro: 'Either a quick rising arpeggio or a filtered sweep that swells upward. Both say "you just got stronger" in under a second.',
      uses: ['Collecting a power-up', 'Upgrades and buffs', 'Combo or streak milestones', 'Filling a gauge'],
      tip: 'Each generation picks one of the two styles at random; generate a few to compare.'
    },
    zh: {
      name: '强化', title: '免费强化 / 道具增益音效',
      intro: '要么是一串快速上行的琶音，要么是一个慢慢涨起来的扫频。两种都能在一秒内告诉玩家"你变强了"。',
      uses: ['吃到强化道具', '升级装备、获得增益', '连击、连胜里程碑', '能量条充满'],
      tip: '每次生成会随机选两种风格之一，多生成几个比较一下。'
    }
  },
  levelUp: {
    slug: 'level-up-sound-effect', related: ['breakthrough', 'powerUp', 'coin', 'confirm'],
    en: {
      name: 'Level Up', title: 'Free Level Up Sound Effects',
      intro: 'A bright arpeggio that lands on a soft chord and a bell. Celebratory without being a full fanfare, so it works even when players level up often.',
      uses: ['Character level up', 'Achievements and trophies', 'Rewards and chests', 'Completing a stage'],
      tip: 'For the rare, big moments, use Breakthrough instead.'
    },
    zh: {
      name: '升级', title: '免费升级音效',
      intro: '一串明亮的琶音，落在一个柔和的和弦和一声钟上。有庆祝感但不是完整的号角，玩家频繁升级也不会腻。',
      uses: ['角色升级', '成就、奖杯', '奖励、开宝箱', '通关'],
      tip: '少见的大时刻改用"突破"。'
    }
  },
  whoosh: {
    slug: 'whoosh-sound-effect', related: ['swordQi', 'jump', 'hit', 'click'],
    en: {
      name: 'Whoosh', title: 'Free Whoosh & Swoosh Sound Effects',
      intro: 'Airy swooshes made from two filtered noise bands sweeping upward. Neutral enough to sit under almost any fast movement.',
      uses: ['Dashes, dodges and swings', 'UI panels sliding in', 'Scene transitions', 'Thrown objects'],
      tip: 'Reverse the sweep (high cutoff to low) for something moving away from the player.'
    },
    zh: {
      name: '挥动', title: '免费挥动 / 风声音效',
      intro: '由两段往上扫的滤波噪声组成的"呼"声。足够中性，几乎所有快速动作底下都能垫。',
      uses: ['冲刺、闪避、挥舞', '界面面板滑入', '场景切换', '投掷物'],
      tip: '把扫频反过来（截止频率从高到低），就像东西在远离玩家。'
    }
  }
};

/* 主题包：每个包由若干预设组成，每个预设取 count 个变体 */
const PACKS = {
  'xianxia-game-sound-pack': {
    items: [['swordQi', 3], ['guqin', 4], ['pipa', 2], ['erhu', 2], ['flute', 2], ['bell', 2], ['gong', 2], ['woodfish', 2], ['drum', 2], ['spell', 2], ['thunder', 2], ['breakthrough', 2], ['talisman', 2], ['alchemy', 2], ['chime', 2], ['qiGather', 2], ['coin', 1], ['click', 1], ['confirm', 1], ['error', 1], ['hit', 2], ['levelUp', 1]],
    en: {
      name: 'Xianxia & Wuxia Game Sound Pack', title: 'Free Xianxia & Wuxia Game Sound Pack',
      intro: 'Everything a cultivation or martial-arts game needs to sound Eastern: guqin, pipa, erhu and bamboo flute, temple bells, gongs, wooden fish and war drums, sword qi, talismans, potions, thunder tribulations and breakthroughs, plus the everyday UI sounds to go with them. All free for commercial use.'
    },
    zh: {
      name: '修仙 / 武侠游戏音效包', title: '免费修仙 / 武侠游戏音效包',
      intro: '修仙、武侠游戏要有东方味道需要的声音都在这里：古琴、琵琶、二胡、竹笛，寺钟、铜锣、木鱼、战鼓，剑气、符箓、炼丹、渡劫天雷、境界突破，再加上配套的日常界面音效。全部可以免费商用。'
    }
  },
  'game-ui-sound-pack': {
    items: [['click', 4], ['confirm', 3], ['error', 3], ['pickup', 3], ['coin', 2], ['whoosh', 3], ['levelUp', 2], ['powerUp', 2]],
    en: {
      name: 'Game UI Sound Pack', title: 'Free Game UI Sound Pack',
      intro: 'A matching set of interface sounds for menus, buttons and feedback: clicks, confirms, errors, pickups, coins, whooshes and a level-up. Short, clean and designed to be heard hundreds of times without getting tiring.'
    },
    zh: {
      name: '游戏界面音效包', title: '免费游戏界面（UI）音效包',
      intro: '一整套风格统一的界面音效，用于菜单、按钮和各种反馈：点击、确认、错误、拾取、金币、挥动和升级。短促、干净，听几百次也不会腻。'
    }
  }
};

/* 页面固定文字 */
const UI = {
  en: {
    navEditor: 'Editor', navLibrary: 'Sound Library', navPacks: 'Packs', navAgents: 'For AI Agents', switchLang: '中文',
    library: 'Sound Library', packs: 'Packs', groupEast: 'Eastern & Xianxia', groupGeneral: 'General Game Sounds',
    zipAll: n => 'Download all ' + n + ' as ZIP', zipPack: n => 'Download all ' + n + ' sounds as ZIP',
    codeAll: n => 'Copy JavaScript for all ' + n, codePack: 'Copy JavaScript for the whole pack', editor: 'Brew your own in the editor',
    fixedNote: (name, n) => 'Every press of New in the editor brews a different ' + name.toLowerCase() + '; these ' + n + ' are a fixed selection so the links stay the same.',
    goodFor: 'Good for', tipH: 'Tweaking tip', tipTail: ' Open any variant with Edit to change it with sliders.',
    agentH: 'Generate them from code or an AI agent', agentP1: 'The same sounds are available from the command line:',
    agentP2: (name) => 'Or let Claude Code, Cursor or any MCP client add them to your project, then ask for "' + name.toLowerCase() + ' sounds":',
    licenseH: 'License', licenseP: 'Free for commercial and non-commercial use. No attribution, no sign-up. The sounds are synthesized from scratch, not recorded, so there are no third-party rights attached.',
    related: 'Related sounds', morePacks: 'More packs', allCats: 'All sound categories', edit: 'Edit', more: 'More', play: 'Play',
    packSounds: n => n + ' sounds', soundsWord: 'sounds',
    libTitle: 'Free Game Sound Effects Library', libLead: (k, n) => k + ' kinds of sound effects for games, each with ' + n + ' ready-made variations. Press play to listen, download WAV files, or copy a JavaScript snippet that plays them with no audio files at all. Everything is synthesized in your browser and free for commercial use.',
    libMetaTitle: 'Free Game Sound Effects Library — Eastern & Classic SFX | SFX Brew',
    libMetaDesc: 'Royalty-free game sound effects: guqin, pipa, erhu, temple bells, gongs, war drums, sword slashes, coins, clicks, jumps, hits, explosions and more. Download WAV or copy JavaScript, free for commercial use.',
    soundMetaTitle: t => t + ' — WAV & JS, Royalty-Free | SFX Brew',
    soundMetaDesc: (first, n) => first + ' ' + n + ' free variations to play, download as WAV or copy as JavaScript. Free for commercial use.',
    packMetaTitle: (t, n) => t + ' — ' + n + ' Royalty-Free Sounds | SFX Brew',
    packMetaDesc: (first, n) => first + ' ' + n + ' sounds, free download as WAV or JavaScript.',
    footer: 'Every sound on this site is synthesized in your browser and free for commercial use, no attribution required.',
    js: { rendering: (i, n) => 'Rendering ' + i + ' / ' + n + '…', downloaded: 'Downloaded ✓', copied: 'Copied — paste it into your game ✓', copyFailed: 'Copy failed' }
  },
  zh: {
    navEditor: '编辑器', navLibrary: '音效库', navPacks: '音效包', navAgents: '给 AI agent 用', switchLang: 'English',
    library: '音效库', packs: '音效包', groupEast: '东方 / 修仙', groupGeneral: '通用游戏音效',
    zipAll: n => '下载全部 ' + n + ' 个（ZIP）', zipPack: n => '下载全部 ' + n + ' 个音效（ZIP）',
    codeAll: n => '复制全部 ' + n + ' 个的 JavaScript', codePack: '复制整个音效包的 JavaScript', editor: '在编辑器里自己调',
    fixedNote: (name, n) => '在编辑器里每按一次"重新生成"都会得到一个不同的' + name + '；这里的 ' + n + ' 个是固定的，方便分享链接。',
    goodFor: '适用场景', tipH: '调音小技巧', tipTail: '点任意一个变体的"编辑"，就能用滑杆细调。',
    agentH: '用代码或 AI agent 生成', agentP1: '同样的音效也可以用命令行生成：',
    agentP2: (name) => '或者让 Claude Code、Cursor 等支持 MCP 的工具直接加进你的项目，然后跟它说"加几个' + name + '音效"：',
    licenseH: '授权', licenseP: '可免费用于商业和非商业用途，不需要署名，不需要注册。所有声音都是从零合成的，不是录音，不涉及任何第三方版权。',
    related: '相关音效', morePacks: '更多音效包', allCats: '全部音效分类', edit: '编辑', more: '更多', play: '播放',
    packSounds: n => n + ' 个音效', soundsWord: '个音效',
    libTitle: '免费游戏音效库', libLead: (k, n) => '共 ' + k + ' 类游戏音效，每类 ' + n + ' 个现成的变体。点播放试听，下载 WAV，或者复制一段 JavaScript，不用任何音频文件就能在游戏里播放。全部在你的浏览器里实时合成，可以免费商用。',
    libMetaTitle: '免费游戏音效库：古琴、琵琶、寺钟、战鼓、金币、打击 | SFX Brew',
    libMetaDesc: '免费可商用的游戏音效：古琴、琵琶、二胡、寺钟、铜锣、战鼓、剑气、金币、点击、跳跃、打击、爆炸等。可下载 WAV 或复制 JavaScript。',
    soundMetaTitle: t => t + '：WAV 下载 / JS 代码，免费商用 | SFX Brew',
    soundMetaDesc: (first, n) => first + n + ' 个免费变体，可试听、下载 WAV 或复制 JavaScript，免费商用。',
    packMetaTitle: (t, n) => t + '：' + n + ' 个免费可商用音效 | SFX Brew',
    packMetaDesc: (first, n) => first + '共 ' + n + ' 个音效，免费下载 WAV 或 JavaScript。',
    footer: '本站所有声音都在你的浏览器里实时合成，可免费商用，不需要署名。',
    js: { rendering: (i, n) => '渲染中 ' + i + ' / ' + n + '…', downloaded: '已下载 ✓', copied: '已复制，粘贴到游戏里就能用 ✓', copyFailed: '复制失败' }
  }
};

module.exports = { SOUNDS, PACKS, UI };
