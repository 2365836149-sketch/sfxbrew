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
      intro: 'Single notes of the erhu, the two-string Chinese fiddle, from real recordings: the nasal, voice-like tone and the player\'s own vibrato. Each variation is moved to a nearby note of the pentatonic scale, and some slide into or out of the note.',
      uses: ['Sad or emotional story beats', 'Character themes and introductions', 'Game over or defeat screens', 'Dialogue with an Eastern setting'],
      tip: 'Generate a few and play them one after another for a short, sad phrase.'
    },
    zh: {
      name: '二胡', title: '免费二胡音效',
      intro: '二胡单音，来自真实录音：带鼻音、像人声的音色和演奏者本身的揉弦。每个变体移到五声音阶上附近的某个音，有的会滑进或滑出这个音。',
      uses: ['悲伤、感人的剧情', '角色主题、角色登场', '游戏失败、结束画面', '东方背景的对话'],
      tip: '多生成几个连着播放，就是一小段哀伤的乐句。'
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
    slug: 'war-drum-sound-effect', related: ['gong', 'thunder', 'lightning', 'pipa'],
    en: {
      name: 'War Drum', title: 'Free War Drum Sound Effects',
      intro: 'Rolling Chinese war drums built from real recordings of a dagu, the big Chinese bass drum: heavy center strokes, ringing edge strokes and rim shots, arranged into a steady march, a thundering roll that keeps growing, or a call to battle that speeds up until it hammers. Every hit rings for seconds and overlaps the next, in a large hall.',
      uses: ['Battle start and army charges', 'Sieges and boss phases', 'Rising tension before a duel', 'Victory or rally moments'],
      tip: 'End a build-up with a gong or a Lightning strike for a dramatic battle opening.'
    },
    zh: {
      name: '战鼓', title: '免费战鼓音效',
      intro: '用中国大鼓（dagu）的真实录音编排的擂鼓：鼓心的重击、鼓边的回响、鼓框的脆响，组成匀速的行军鼓、越滚越响的擂鼓，或者越敲越快、越敲越猛的催阵鼓。每一下都余音数秒、前后交叠，在大厅里回荡。',
      uses: ['开战、冲锋', '攻城、Boss 换阶段', '对决前的紧张蓄势', '胜利、鼓舞士气'],
      tip: '催阵鼓的最后接一声锣或一道霹雳，就是很有气势的开战。'
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
      intro: 'Built from real recordings of a struck gong and a gong roll. Most variations are a single heavy hit, pitched down for a huge tam-tam or up for a smaller gong. Others imitate the Chinese opera gong, whose pitch bends down or up right after the hit, and a few are a roll that swells to a crash.',
      uses: ['Battle start and round announcements', 'Boss entrances', 'Comedic or dramatic beats (opera gong)', 'Martial arts tournament scenes'],
      tip: 'Opera gongs with a rising bend sound playful; falling ones sound like a dramatic entrance.'
    },
    zh: {
      name: '铜锣', title: '免费铜锣音效',
      intro: '用真实的锣声录音和滚锣录音做成。大多数变体是一记重锣：降调就是巨大的大锣，升调就是小一些的锣；有的模仿京剧锣，敲完音高往下掉或往上翘；少数是越滚越响、最后炸开的滚锣。',
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
    slug: 'thunder-sound-effect', related: ['lightning', 'explosion', 'gong', 'drum'],
    en: {
      name: 'Thunder', title: 'Free Thunder Rumble Sound Effects',
      intro: 'Brewing, rolling thunder: rumbles arrive at random moments from different distances, the way one thunderclap reaches you along many paths, over a low, wobbling bed. Some variations are close with a few cracks up front, others are distant rumble only. For the strike itself, use Lightning.',
      uses: ['Heavenly tribulation building up in cultivation games', 'Storm ambience and weather', 'Ominous moments before a boss', 'Combine with Lightning for a full strike'],
      tip: 'Play Lightning first and this a moment later to get a strike followed by its echoing rumble.'
    },
    zh: {
      name: '天雷', title: '免费雷声（滚雷）音效',
      intro: '酝酿中的滚滚雷声：一声雷经过远近不同的路径传到耳边，所以闷雷在随机时刻一阵阵滚来，底下垫着一层摇晃的超低频。有的变体在近处、开头有几声炸裂，有的只是远处的闷雷。闪电劈下来的那一下，请用"霹雳"。',
      uses: ['修仙游戏里天劫的酝酿', '暴风雨、天气氛围', 'Boss 登场前的不祥预兆', '和"霹雳"一起用，就是完整的雷击'],
      tip: '先播"霹雳"，稍后接这个，就是一道闪电劈下、雷声滚滚而去。'
    }
  },
  lightning: {
    slug: 'lightning-strike-sound-effect', related: ['thunder', 'explosion', 'spell', 'drum'],
    en: {
      name: 'Lightning', title: 'Free Lightning Strike Sound Effects',
      intro: 'Real recordings of lightning striking close by: the deafening crack and the roar that follows, each variation pitched slightly up or down so it sounds bigger, smaller or further away. Fast and violent where Thunder is slow and brooding.',
      uses: ['Lightning spells and skills', 'The moment a heavenly tribulation strikes', 'Electric traps and storms', 'Dramatic cuts and reveals'],
      tip: 'Layer it over a Thunder rumble for the full storm, or over an Explosion for a lightning-powered blast.'
    },
    zh: {
      name: '霹雳', title: '免费闪电霹雳音效',
      intro: '近距离雷击的真实录音：震耳欲聋的炸裂和紧随其后的轰鸣。每个变体的音高略有升降，听起来更大、更小或更远。和缓慢酝酿的"天雷"相反，它又快又猛。',
      uses: ['雷系法术、技能', '天劫劈下的瞬间', '电击陷阱、暴风雨', '戏剧性的转场和揭晓'],
      tip: '叠在"天雷"上就是完整的暴风雨；叠在"爆炸"上就是雷电加持的爆炸。'
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
    slug: 'explosion-sound-effect', related: ['hit', 'lightning', 'thunder', 'drum'],
    en: {
      name: 'Explosion', title: 'Free Explosion Sound Effects',
      intro: 'Violent blasts: a sharp shockwave, a sub-bass punch, a saturated body that stays at full force before it fades, a mid-range roar, debris raining down at random and a wobbling aftershock. Some variations are a chain of two or three explosions.',
      uses: ['Bombs, grenades and barrels', 'Destroying enemies or buildings', 'Big spell impacts', 'Cinematic hits in trailers'],
      tip: 'These are loud on purpose; turn them down a little if your game has many at once.'
    },
    zh: {
      name: '爆炸', title: '免费爆炸音效',
      intro: '剧烈的爆炸：尖锐的冲击波，超低频的重拳，带失真撕裂感、在最响处停留片刻的主体轰鸣，中频的"轰"，随机落下的碎片，最后是摇晃的余震。有的变体是两三声连环爆炸。',
      uses: ['炸弹、手雷、油桶', '摧毁敌人、建筑', '大招命中', '预告片里的重音'],
      tip: '故意做得很响，游戏里同时爆炸很多的话，把音量压低一点。'
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
  },
  arrow: {
    slug: 'arrow-sound-effect', related: ['swordClash', 'whoosh', 'hit', 'swordQi'],
    en: {
      name: 'Arrow', title: 'Free Arrow & Bow Sound Effects',
      intro: 'A bowstring twang followed by the hiss of the arrow cutting the air. About half of the variations end with a dull wooden thud as the arrow hits its target, so you get both the shot and the impact from one sound.',
      uses: ['Archers, crossbows and ranged attacks', 'Arrow traps', 'Hit confirmation on a target', 'Skill shots and volleys'],
      tip: 'Built from real CC0 recordings of a bow, an arrow in flight and arrows hitting a target. Transpose down a few semitones for a heavier longbow.'
    },
    zh: {
      name: '射箭', title: '免费射箭 / 弓箭音效',
      intro: '弓弦"嘣"的一声，接着箭破空的"嗖"。大约一半变体最后有一声闷闷的"笃"，是箭扎进靶子或木头里，一个声音就包含了射出和命中。',
      uses: ['弓手、弩和各种远程攻击', '机关暗箭', '命中靶子的反馈', '技能连射、箭雨'],
      tip: '用的是真实的 CC0 录音：弓弦、箭飞过和中靶。想要更沉的长弓，把移调往下调几个半音。'
    }
  },
  swordClash: {
    slug: 'sword-clash-sound-effect', related: ['swordQi', 'hit', 'arrow', 'gong'],
    en: {
      name: 'Sword Clash', title: 'Free Sword Clash Sound Effects',
      intro: 'Blade meets blade: a bright metallic clang whose tail rings and beats like real steel, plus a short scrape of the edges sliding apart. Some variations are a quick double hit.',
      uses: ['Parries and blocks', 'Duels and clashing weapons', 'Critical hits on armored enemies', 'Forging and anvil-like UI feedback'],
      tip: 'Cut from a real recording of two swords clashing. Transpose down and add reverb for heavy blades in a hall.'
    },
    zh: {
      name: '刀剑相击', title: '免费刀剑相击 / 格挡音效',
      intro: '兵刃相碰：清亮的金属"锵"，余音像真钢铁一样带点颤动，再加一下刀刃擦开的"嚓"。有些变体是连着两下。',
      uses: ['格挡、招架', '比武、兵器碰撞', '打在重甲上的暴击', '锻造、铁匠铺之类的反馈'],
      tip: '切自两把真剑对砍的录音。移调往下、混响加大，就像在大殿里两把重剑相交。'
    }
  },
  footstepStone: {
    slug: 'footstep-stone-sound-effect', related: ['jump', 'whoosh', 'hit', 'click'],
    en: {
      name: 'Footstep (Stone)', title: 'Free Footstep on Stone Sound Effects',
      intro: 'Single footsteps on a stone floor: a soft heel thud, the scuff of the sole and a little grit. Each variation is one step, so you can trigger them in sync with a walk animation and alternate a few to avoid repetition.',
      uses: ['Walking and running on stone, tiles or paths', 'Dungeons, temples and city streets', 'Footsteps of NPCs approaching', 'Cutscene foley'],
      tip: 'Twelve real steps (boots and shoes) recorded on stone. Download a pack of 10 and pick one at random for each step; transpose down for heavy armored characters.'
    },
    zh: {
      name: '脚步（石地）', title: '免费脚步声音效：石板地',
      intro: '走在石板地上的单个脚步：脚跟着地的闷响、鞋底的摩擦和一点沙砾声。每个变体就是一步，方便和走路动画对齐；准备几个轮流播放就不会重复。',
      uses: ['在石板、地砖、山路上行走或奔跑', '地牢、寺庙、城镇街道', 'NPC 走近的脚步', '过场动画的拟音'],
      tip: '共 12 步真实录音（靴子和普通鞋走在石头上）。打包下载 10 个，每一步随机挑一个播放；重甲角色可以往下移调。'
    }
  },
  rain: {
    slug: 'rain-sound-effect', related: ['thunder', 'lightning', 'alchemy', 'chime'],
    en: {
      name: 'Rain', title: 'Free Rain Sound Effects',
      intro: 'About four seconds of rain: a soft wash of falling water, dozens of drops hitting different surfaces and a low watery bed. Each variation is light, medium or heavy rain, and it fades in and out so it can loop or be crossfaded.',
      uses: ['Weather systems and rainy levels', 'Background ambience for villages and forests', 'Sad or calm story scenes', 'Layering under thunder for a storm'],
      tip: 'For a longer bed, loop two variations with a crossfade. Add the thunder preset on top for a storm.'
    },
    zh: {
      name: '雨', title: '免费雨声音效',
      intro: '大约四秒的雨声：一片沙沙的落雨、几十滴打在不同东西上的雨点，下面垫一层低低的水声。每个变体随机是小雨、中雨或大雨，首尾淡入淡出，可以循环或者交叉淡化。',
      uses: ['天气系统、下雨的关卡', '村庄、山林的背景氛围', '悲伤或安静的剧情', '叠上雷声做暴风雨'],
      tip: '想要更长的雨，就拿两个变体交叉淡化循环；再叠上"天雷"就是一场暴风雨。'
    }
  },
  notify: {
    slug: 'notification-sound-effect', related: ['confirm', 'click', 'chime', 'levelUp'],
    en: {
      name: 'Notification', title: 'Free Notification Sound Effects',
      intro: 'Two soft, marimba-like dings that step up a little, the friendly kind of alert that says something happened without startling the player. The notes stay on the pentatonic scale.',
      uses: ['Messages, toasts and pop-ups', 'Quest updates and new items in the log', 'Friend online, mail received', 'Timers finishing'],
      tip: 'For an important alert, raise the pitch and shorten the gap between the two notes.'
    },
    zh: {
      name: '通知', title: '免费通知 / 提示音效',
      intro: '两声柔和、像马林巴一样的"叮咚"，第二个音往上走一点。是那种告诉玩家"有事发生了"、又不会吓人一跳的提示音。音高都在五声音阶上。',
      uses: ['消息、弹窗、横幅提示', '任务更新、背包里有新东西', '好友上线、收到邮件', '计时结束'],
      tip: '重要的提醒可以把音高调高、两个音之间的间隔缩短。'
    }
  },
  footstepGrass: {
    slug: 'footstep-grass-sound-effect', related: ['footstepStone','land','jump','stream'],
    en: {
      name: "Footstep (Grass)", title: "Free Footstep on Grass Sound Effects",
      intro: "Single footsteps on grass and dry leaves, cut from a real recording of someone running through a forest. Each variation is one step with a soft crunch, so it lines up with your walk or run animation.",
      uses: ["Walking and running in fields, forests and gardens","Sneaking through tall grass","Animals and NPCs moving outdoors","Outdoor cutscene foley"],
      tip: "Pick a random step for each footfall. Lower the volume for walking and keep it for running."
    },
    zh: {
      name: "脚步（草地）", title: "免费脚步声音效：草地 / 落叶",
      intro: "踩在草地和枯叶上的单个脚步，切自一段在树林里跑步的真实录音。每个变体就是一步，带一点\"沙沙\"的脆响，方便和走路、跑步动画对齐。",
      uses: ["在田野、树林、园子里行走或奔跑","在草丛里潜行","野外的动物和 NPC 走动","户外过场动画的拟音"],
      tip: "每一步随机挑一个播放。走路时音量调小一点，跑步时保持原样。"
    }
  },
  land: {
    slug: 'landing-sound-effect', related: ['jump','footstepStone','hit','footstepGrass'],
    en: {
      name: "Land", title: "Free Landing Sound Effects",
      intro: "The thud of a character landing after a jump, from real recordings: on a hard floor, on the ground and onto some snapping sticks. Some variations add a low thump for heavier characters.",
      uses: ["Landing after a jump or fall","Heavy enemies dropping into the arena","Wall jumps and double jumps","Items or crates falling"],
      tip: "Pair it with the Jump preset: jump on the way up, land on the way down."
    },
    zh: {
      name: "落地", title: "免费落地音效",
      intro: "角色跳起后着地的那一声，来自真实录音：落在硬地板上、普通地面上，还有一段踩断了树枝。有些变体垫了一下低频的\"咚\"，适合块头大的角色。",
      uses: ["跳跃或掉落后着地","重型敌人跳进场地","蹬墙跳、二段跳","道具、箱子掉在地上"],
      tip: "和\"跳跃\"配着用：起跳时放跳跃，落下时放落地。"
    }
  },
  shieldBlock: {
    slug: 'shield-block-sound-effect', related: ['swordClash','hit','swordQi','gong'],
    en: {
      name: "Shield Block", title: "Free Shield Block Sound Effects",
      intro: "An attack stopped by a shield: a real metal impact layered with a deep, synthesized thud of the shield body and a short wooden knock. Heavier and duller than a sword clash.",
      uses: ["Blocking and guarding","Perfect parry or guard break","Hits on armored or shielded enemies","Defensive skills"],
      tip: "Transpose down for a big tower shield; turn the thud down for a small buckler."
    },
    zh: {
      name: "格挡", title: "免费格挡 / 盾牌音效",
      intro: "一击被盾牌挡下：真实录音里的金属撞击，叠上合成的盾身闷响和一下短促的木头声。比刀剑相击更沉、更钝。",
      uses: ["举盾格挡、防御","完美招架、破防","打在带盾或重甲的敌人身上","防御类技能"],
      tip: "大盾就往下移调；小圆盾就把闷响那一层调小。"
    }
  },
  wind: {
    slug: 'wind-sound-effect', related: ['rain','whoosh','caveDrip','thunder'],
    en: {
      name: "Wind", title: "Free Wind Sound Effects",
      intro: "About four seconds of wind: a gust that swells and dies away, a thin whistle riding on top and a low rumble underneath. Each variation is a light breeze, a gust or a strong wind.",
      uses: ["Mountain tops, deserts and open plains","Weather systems and storms","Transitions between scenes","Spirit or ghost ambience"],
      tip: "Layer two variations with an offset for a continuous wind, or play one when the camera moves somewhere high."
    },
    zh: {
      name: "风", title: "免费风声音效",
      intro: "大约四秒的风：一阵风涌起又散去，上面飘着一缕细细的哨音，底下是低沉的呼呼声。每个变体随机是微风、阵风或狂风。",
      uses: ["山顶、沙漠、开阔的平原","天气系统、暴风雨","场景切换","鬼魂、精怪出没的氛围"],
      tip: "两个变体错开叠在一起就是持续的风；镜头拉到高处时放一段也很有效果。"
    }
  },
  campfire: {
    slug: 'campfire-sound-effect', related: ['talisman','stream','wind','alchemy'],
    en: {
      name: "Campfire", title: "Free Campfire Sound Effects",
      intro: "Five seconds of a real campfire crackling on a quiet night. The end is crossfaded into the start, so it loops without a seam; some variations add a few extra pops of burning wood.",
      uses: ["Camps, rest points and save spots","Hearths, forges and kitchens","Torches and braziers (quieter)","Night scenes outdoors"],
      tip: "Loop it under your scene and fade the volume with distance from the fire."
    },
    zh: {
      name: "篝火", title: "免费篝火音效",
      intro: "五秒真实的篝火录音，安静的夜里木柴噼啪作响。结尾已经和开头交叉淡化过，循环播放没有接缝；有些变体还多加了几下木柴爆裂声。",
      uses: ["营地、休息点、存档点","灶台、炼器炉、厨房","火把、火盆（音量调小）","野外的夜晚"],
      tip: "循环放在场景底下，离火越远音量越小。"
    }
  },
  stream: {
    slug: 'stream-sound-effect', related: ['rain','caveDrip','campfire','alchemy'],
    en: {
      name: "Stream", title: "Free Stream & Flowing Water Sound Effects",
      intro: "Five seconds of a real babbling stream recorded up close, with a seamless loop point. Each variation picks one of two passages and shifts it slightly in pitch, like a different part of the water.",
      uses: ["Rivers, brooks and waterfalls (from a distance)","Peaceful villages and forests","Fishing spots","Meditation and healing areas"],
      tip: "Loop it and raise the volume as the player approaches the water."
    },
    zh: {
      name: "流水", title: "免费流水 / 溪水音效",
      intro: "五秒近距离录的真实溪水声，首尾已经对接好，可以无缝循环。每个变体从两段里随机选一段，再微调一点音高，就像换了一处水流。",
      uses: ["河流、小溪、远处的瀑布","宁静的村庄和山林","钓鱼点","打坐、疗伤的地方"],
      tip: "循环播放，玩家离水越近音量越大。"
    }
  },
  caveDrip: {
    slug: 'cave-drip-sound-effect', related: ['stream','wind','chime','rain'],
    en: {
      name: "Cave Drip", title: "Free Cave Water Drip Sound Effects",
      intro: "Water drops falling into a pool somewhere in a cave: a short rising \"plink\" for each drop, a long cave reverb and a soft echo, over a dark room tone.",
      uses: ["Caves, grottoes and dungeons","Secret realms and hidden chambers","Quiet, tense exploration","Underground waterways"],
      tip: "Play a variation every few seconds at a random volume so the cave never sounds looped."
    },
    zh: {
      name: "洞穴滴水", title: "免费洞穴滴水音效",
      intro: "洞里某处水滴落进水洼：每一滴是一声短促、往上扬的\"叮咚\"，带着很长的洞穴混响和轻轻的回声，下面是一层幽暗的空间底噪。",
      uses: ["山洞、石窟、地牢","秘境、密室","安静又紧张的探索","地下水道"],
      tip: "每隔几秒随机音量放一个变体，洞里就不会听出循环感。"
    }
  },
  pageTurn: {
    slug: 'page-turn-sound-effect', related: ['click','typing','confirm','talisman'],
    en: {
      name: "Page Turn", title: "Free Page Turn Sound Effects",
      intro: "Real recordings of book pages being turned, from a thin page to the heavier pages of an old book. Each variation is a single turn.",
      uses: ["Journals, quest logs and codices","Spell books and manuals","Menu tabs and inventory pages","Story books and tutorials"],
      tip: "Use it for any UI that flips between pages; it reads as \"next\" without a beep."
    },
    zh: {
      name: "翻页", title: "免费翻页 / 翻书音效",
      intro: "真实的翻书录音，从薄薄的一页纸到旧书厚重的书页。每个变体就是翻一页。",
      uses: ["日志、任务记录、图鉴","秘籍、功法、说明书","菜单分页、背包翻页","故事书和新手教程"],
      tip: "凡是在页面之间切换的界面都可以用，比\"嘀\"一声更有质感。"
    }
  },
  typing: {
    slug: 'typing-sound-effect', related: ['click','pageTurn','notify','confirm'],
    en: {
      name: "Typing", title: "Free Typing & Typewriter Sound Effects",
      intro: "A short burst of real typewriter keystrokes, three to eight keys with uneven gaps like a person typing. A quarter of the variations end with the carriage bell.",
      uses: ["Dialogue text appearing letter by letter","Terminals, hacking and computers","Letters, reports and notes","Name entry screens"],
      tip: "For text that types itself, play a short variation every few characters instead of one per letter."
    },
    zh: {
      name: "打字", title: "免费打字 / 打字机音效",
      intro: "一小串真实的打字机按键声，三到八下，间隔不均匀，像真人在打字。四分之一的变体最后有换行的\"叮\"。",
      uses: ["对话文字逐字出现","终端、黑客、电脑操作","书信、报告、便条","输入名字的界面"],
      tip: "文字逐字出现时，不必每个字都放一次，每隔几个字放一段短的就好。"
    }
  },
  chestOpen: {
    slug: 'chest-open-sound-effect', related: ['coin','pickup','levelUp','chime'],
    en: {
      name: "Chest Open", title: "Free Treasure Chest Open Sound Effects",
      intro: "Real recordings of a wooden chest and an old trunk creaking open. Some variations finish with a little sparkle of chimes, the classic \"you found treasure\" moment.",
      uses: ["Treasure chests and loot","Crates, cabinets and doors","Reward screens","Secret rooms being revealed"],
      tip: "Use the plain creak for ordinary containers and keep the sparkle variations for rare loot."
    },
    zh: {
      name: "开宝箱", title: "免费开宝箱音效",
      intro: "真实录音：木箱、旧箱子\"吱呀\"一声被打开。有些变体最后还有一串风铃般的闪光声，就是经典的\"发现宝物\"时刻。",
      uses: ["开宝箱、拾取战利品","木箱、柜子、门","奖励结算画面","密室被打开"],
      tip: "普通箱子用只有吱呀声的变体，稀有宝物才用带闪光的。"
    }
  },
  monsterGrowl: {
    slug: 'monster-growl-sound-effect', related: ['explosion','thunder','hit','drum'],
    en: {
      name: "Monster Growl", title: "Free Monster Growl & Roar Sound Effects",
      intro: "Real growls and roars, pitched down or up at random and reinforced with a low chest rumble. Lower variations sound like big beasts and dragons, higher ones like smaller creatures.",
      uses: ["Monsters, beasts and dragons","Boss intros and enrage phases","Enemies noticing the player","Demonic or spirit beasts in xianxia games"],
      tip: "Transpose further down and add reverb for a giant boss in a cave."
    },
    zh: {
      name: "怪物低吼", title: "免费怪物低吼 / 咆哮音效",
      intro: "真实的低吼和咆哮录音，音高随机压低或抬高，再垫一层低频的胸腔共鸣。音低的变体像巨兽、龙，音高的像小型怪物。",
      uses: ["怪物、野兽、龙","Boss 登场、狂暴阶段","敌人发现玩家","修仙游戏里的妖兽、灵兽"],
      tip: "再往下移调、加大混响，就像山洞里的巨型 Boss。"
    }
  }
};

/* 主题包：每个包由若干预设组成，每个预设取 count 个变体 */
const PACKS = {
  'xianxia-game-sound-pack': {
    itch: 'https://2365836149-sketch.itch.io/xianxia-wuxia-sound-pack',
    items: [['swordQi', 3], ['guqin', 4], ['pipa', 2], ['erhu', 2], ['flute', 2], ['bell', 2], ['gong', 2], ['woodfish', 2], ['drum', 2], ['spell', 2], ['thunder', 2], ['lightning', 2], ['breakthrough', 2], ['talisman', 2], ['alchemy', 2], ['chime', 2], ['qiGather', 2], ['coin', 1], ['click', 1], ['confirm', 1], ['error', 1], ['hit', 2], ['levelUp', 1]],
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

/* 每个大类一页（/sounds/c/<大类>/）：标题和一句话介绍，给搜索引擎和第一次来的人看 */
const CAT_COPY = {
  combat: { slug: 'combat',
    en: { title: 'Free Combat Sound Effects', intro: 'Sword slashes, punches, hits, explosions, lasers and war drums for fights and boss battles.' },
    zh: { title: '免费战斗音效', intro: '挥剑、拳脚、受击、爆炸、激光和战鼓，打斗和 Boss 战用得上的声音。' } },
  magic: { slug: 'magic',
    en: { title: 'Free Magic & Xianxia Sound Effects', intro: 'Spell casts, heavenly thunder, lightning, qi charging, talismans, alchemy and realm breakthroughs.' },
    zh: { title: '免费法术 / 仙侠音效', intro: '施法、天雷、霹雳、聚气、符箓、炼丹和境界突破，修仙和魔法游戏的核心音效。' } },
  instrument: { slug: 'eastern-instruments',
    en: { title: 'Free Eastern Instrument Sound Effects', intro: 'Single notes and hits of Chinese instruments: guqin, pipa, erhu, bamboo flute, temple bells, gongs, wooden fish and war drums.' },
    zh: { title: '免费东方乐器音效', intro: '中国乐器的单音和敲击：古琴、琵琶、二胡、竹笛、寺钟、铜锣、木鱼和战鼓。' } },
  ui: { slug: 'ui',
    en: { title: 'Free UI Sound Effects', intro: 'Clicks, confirms, errors and notification tones for menus and buttons.' },
    zh: { title: '免费界面音效', intro: '菜单和按钮用的点击、确认、错误和提示音。' } },
  items: { slug: 'items-rewards',
    en: { title: 'Free Item & Reward Sound Effects', intro: 'Coins, pickups, power-ups and level-ups: the sounds that make progress feel good.' },
    zh: { title: '免费道具 / 奖励音效', intro: '金币、拾取、强化和升级，让玩家觉得"赚到了"的声音。' } },
  character: { slug: 'character',
    en: { title: 'Free Character Movement Sound Effects', intro: 'Footsteps on stone and grass, jumps, landings and dashes for player characters and NPCs.' },
    zh: { title: '免费角色动作音效', intro: '石地和草地脚步、跳跃、落地、冲刺，角色和 NPC 移动时的声音。' } },
  ambience: { slug: 'ambience',
    en: { title: 'Free Ambience Sound Effects', intro: 'Weather and atmosphere: rain, wind, thunder, a crackling campfire, a babbling stream and dripping caves. Several loop seamlessly.' },
    zh: { title: '免费环境氛围音效', intro: '天气和氛围：雨、风、雷、噼啪的篝火、潺潺的溪水和洞穴滴水，有几个可以无缝循环。' } },
  creature: { slug: 'creatures',
    en: { title: 'Free Creature Sound Effects', intro: 'Monster growls and roars for beasts, dragons and bosses.' },
    zh: { title: '免费生物音效', intro: '怪物、野兽、龙和 Boss 的低吼与咆哮。' } }
};

/* 页面固定文字 */
const UI = {
  en: {
    navEditor: 'SFX Editor', navLibrary: 'Sound Library', navLab: 'Lab', navAI: 'AI SFX', navMusic: 'Music', navPacks: 'Packs', navAgents: 'For AI agents', switchLang: '中文',
    nVariants: n => n + ' variations', libCount: (k, n) => k + ' categories × ' + n + ' variations', moreInfo: name => 'About these ' + name.toLowerCase() + ' sounds, uses and license', aboutLib: 'About this library',
    library: 'Sound Library', packs: 'Packs', category: 'Category', filters: 'Filters', categoriesH: 'Categories', searchPh: 'Search: sword, coin, rain, 剑…', sortDefault: 'Sort: category', sortName: 'Sort: name', sortDur: 'Sort: length', clearAll: 'Clear filters', showing: (n, m) => n + ' of ' + m + ' sounds', nSounds: n => n + ' free sounds', libMetaTail: 'Free for commercial use: play in the browser, download WAV or copy JavaScript.', noResults: 'No sound matches. Try another word or clear the filters.', reroll: 'New variation', details: 'Details', allIn: name => 'All ' + name.toLowerCase(), groupInstr: 'Eastern instruments', groupXianxia: 'Xianxia & magic', groupEast: 'Eastern & Xianxia', groupGeneral: 'General Game Sounds',
    zipAll: n => 'Download all ' + n + ' as ZIP', zipPack: n => 'Download all ' + n + ' sounds as ZIP', itchPack: 'Also on itch.io',
    codeAll: n => 'Copy JavaScript for all ' + n, codePack: 'Copy JavaScript for the whole pack', editor: 'Make your own in the editor',
    fixedNote: (name, n) => 'Every press of New in the editor brews a different ' + name.toLowerCase() + '; these ' + n + ' are a fixed selection so the links stay the same.',
    goodFor: 'Good for', tipH: 'Tweaking tip', tipTail: ' Open any variant with Edit to change it with sliders.',
    agentH: 'Generate them from code or an AI agent', skillP: 'Free agent skill that teaches your agent when and how to use it:', agentP1: 'The same sounds are available from the command line:',
    agentP2: (name) => 'Or let Claude Code, Cursor or any MCP client add them to your project, then ask for "' + name.toLowerCase() + ' sounds":',
    licenseH: 'License', licenseP: 'Free for commercial and non-commercial use. No attribution, no sign-up. Most sounds are synthesized from scratch; the few that use recordings use CC0 (public domain) recordings, so there are no third-party rights attached.',
    related: 'Related sounds', morePacks: 'More packs', allCats: 'All sounds', edit: 'Edit', more: 'More', play: 'Play', dlWav: 'Download WAV', done: 'Done', showN: n => 'Show ' + n + ' sounds',
    packSounds: n => n + ' sounds', soundsWord: 'sounds',
    libTitle: 'Free Game Sound Effects Library', libLead: (k, n) => k + ' kinds of sound effects for games, each with ' + n + ' ready-made variations. Press play to listen, download WAV files, or copy a JavaScript snippet that plays them with no audio files at all. Everything is synthesized in your browser and free for commercial use.',
    libMetaTitle: 'Free Game Sound Effects Library — Eastern & Classic SFX | SFX Brew',
    libMetaDesc: 'Royalty-free game sound effects: guqin, pipa, erhu, temple bells, gongs, war drums, sword slashes, coins, clicks, jumps, hits, explosions and more. Download WAV or copy JavaScript, free for commercial use.',
    soundMetaTitle: t => t + ' — WAV & JS, Royalty-Free | SFX Brew',
    soundMetaDesc: (first, n) => first + ' ' + n + ' free variations to play, download as WAV or copy as JavaScript. Free for commercial use.',
    packMetaTitle: (t, n) => t + ' — ' + n + ' Royalty-Free Sounds | SFX Brew',
    packMetaDesc: (first, n) => first + ' ' + n + ' sounds, free download as WAV or JavaScript.',
    footer: 'Every sound on this site is made in your browser, from synthesis or a few CC0 recordings, and free for commercial use, no attribution required.', credits: 'Recording credits',
    js: { rendering: (i, n) => 'Rendering ' + i + ' / ' + n + '…', downloaded: 'Downloaded ✓', copied: 'Copied — paste it into your game ✓', copyFailed: 'Copy failed' }
  },
  zh: {
    navEditor: '音效编辑器', navLibrary: '音效库', navLab: '实验室', navAI: 'AI 生成', navMusic: '配乐', navPacks: '音效包', navAgents: '给 AI 用', switchLang: 'English',
    nVariants: n => n + ' 个变体', libCount: (k, n) => k + ' 类 × 每类 ' + n + ' 个变体', moreInfo: name => '关于' + name + '音效：适用场景、技巧和授权', aboutLib: '关于这个音效库',
    library: '音效库', packs: '音效包', category: '分类', filters: '筛选', categoriesH: '大类', searchPh: '搜索：剑、金币、雨、slash…', sortDefault: '排序：按大类', sortName: '排序：按名称', sortDur: '排序：按长短', clearAll: '清除筛选', showing: (n, m) => '显示 ' + n + ' / ' + m + ' 个音效', nSounds: n => n + ' 个免费音效', libMetaTail: '免费商用，可在线试听、下载 WAV 或复制 JavaScript。', noResults: '没有匹配的音效。换个词，或者清除筛选。', reroll: '换一个', details: '详情', allIn: name => '全部' + name, groupInstr: '东方乐器', groupXianxia: '仙侠', groupEast: '东方 / 修仙', groupGeneral: '通用游戏音效',
    zipAll: n => '下载全部 ' + n + ' 个（ZIP）', zipPack: n => '下载全部 ' + n + ' 个音效（ZIP）', itchPack: '在 itch.io 下载',
    codeAll: n => '复制全部 ' + n + ' 个的 JavaScript', codePack: '复制整个音效包的 JavaScript', editor: '在编辑器里自己调',
    fixedNote: (name, n) => '在编辑器里每按一次"重新生成"都会得到一个不同的' + name + '；这里的 ' + n + ' 个是固定的，方便分享链接。',
    goodFor: '适用场景', tipH: '调音小技巧', tipTail: '点任意一个变体的"编辑"，就能用滑杆细调。',
    agentH: '用代码或 AI agent 生成', skillP: '免费的 agent skill，教你的 agent 什么时候、怎么用：', agentP1: '同样的音效也可以用命令行生成：',
    agentP2: (name) => '或者让 Claude Code、Cursor 等支持 MCP 的工具直接加进你的项目，然后跟它说"加几个' + name + '音效"：',
    licenseH: '授权', licenseP: '可免费用于商业和非商业用途，不需要署名，不需要注册。大部分声音是从零合成的；少数用到录音的，用的都是 CC0（公有领域）录音，不涉及任何第三方版权。',
    related: '相关音效', morePacks: '更多音效包', allCats: '全部音效', edit: '编辑', more: '更多', play: '播放', dlWav: '下载 WAV', done: '完成', showN: n => '查看 ' + n + ' 个音效',
    packSounds: n => n + ' 个音效', soundsWord: '个音效',
    libTitle: '免费游戏音效库', libLead: (k, n) => '共 ' + k + ' 类游戏音效，每类 ' + n + ' 个现成的变体。点播放试听，下载 WAV，或者复制一段 JavaScript，不用任何音频文件就能在游戏里播放。全部在你的浏览器里实时合成，可以免费商用。',
    libMetaTitle: '免费游戏音效库：古琴、琵琶、寺钟、战鼓、金币、打击 | SFX Brew',
    libMetaDesc: '免费可商用的游戏音效：古琴、琵琶、二胡、寺钟、铜锣、战鼓、剑气、金币、点击、跳跃、打击、爆炸等。可下载 WAV 或复制 JavaScript。',
    soundMetaTitle: t => t + '：WAV 下载 / JS 代码，免费商用 | SFX Brew',
    soundMetaDesc: (first, n) => first + n + ' 个免费变体，可试听、下载 WAV 或复制 JavaScript，免费商用。',
    packMetaTitle: (t, n) => t + '：' + n + ' 个免费可商用音效 | SFX Brew',
    packMetaDesc: (first, n) => first + '共 ' + n + ' 个音效，免费下载 WAV 或 JavaScript。',
    footer: '本站所有声音都在你的浏览器里实时生成（合成或少量 CC0 录音素材），可免费商用，不需要署名。', credits: '录音素材来源',
    js: { rendering: (i, n) => '渲染中 ' + i + ' / ' + n + '…', downloaded: '已下载 ✓', copied: '已复制，粘贴到游戏里就能用 ✓', copyFailed: '复制失败' }
  }
};


/* 配乐页面（/music/ 和 /zh/music/） */
const MUSIC = {
  en: {
    title: 'Free Game Background Music Generator — Eastern & Xianxia BGM',
    metaDesc: 'Generate royalty-free background music for games in your browser: calm guqin landscapes, battle drums, mysterious caves and sad erhu. Seamless loop WAVs, never-repeating generative JavaScript and short stingers. Free for commercial use.',
    h1: 'Eastern Game Music Generator',
    lead: 'Background music for games, composed live in your browser on the pentatonic scale with guqin, pipa, bamboo flute, bells, war drums, gongs and erhu. Press play to hear it compose; download a seamless loop, or copy JavaScript that keeps composing in your game and never repeats.',
    moods: {
      calm: ['Calm landscape', 'Guqin and bamboo flute over a soft drone. Meditation, cultivation, villages, idle progress.'],
      battle: ['Battle', 'Dagu war drums, pipa tremolo and a low pulse, with a gong every eight bars. Combat, bosses, sieges.'],
      mystery: ['Mysterious cave', 'Dark drone, distant bells, wind chimes and guqin harmonics. Exploration, caves, secret realms.'],
      sad: ['Sorrow', 'Erhu melody over gentle guqin chords. Farewells, defeat, emotional story beats.'],
      journey: ['On the road', 'Bamboo flute over broken guqin chords and a string bed, erhu in the second half. Travel, overworld, open country.'],
      capital: ['Old capital', 'A free-time erhu opening, then a slow ballad with guqin, cellos and a distant wood block. Cities, story scenes.'],
      palace: ['Forbidden palace', 'Slow guqin over low cellos that pulse like a heartbeat, building to a peak in the middle. Intrigue, stealth, dread.'],
      temple: ['Mountain temple', 'Flute in free time, open pentatonic harmony, almost no pulse. Ruins, shrines, quiet endings.'],
      skirmish: ['Skirmish', 'Dark five-note scale over Phrygian harmony: grinding low strings, falling erhu, sparse heavy drums. Regular fights.'],
      boss: ['Boss fight', 'Slower and heavier, a whole tone lower, erhu over sawing cellos. Elite enemies, mid-bosses.'],
      final: ['Final battle', 'The fastest of the three, erhu and low pipa stacked at the climax. Last stand, final boss.']
    },
    play: 'Play', stop: 'Stop', nowPlaying: 'Now composing: {mood} · variation {seed}', idle: 'Pick a mood and press Play. Each variation composes differently.',
    tempo: 'Tempo', volume: 'Volume', reseed: 'New variation',
    exportH: 'Use it in your game', loopLen: 'Loop length', seconds: 's',
    downloadLoop: 'Download seamless loop (WAV)', copyJs: 'Copy JavaScript (never repeats)',
    exportP: 'The loop is one full piece with your arrangement. Its end is folded back onto its start, so it repeats without a gap or click. Long or busy pieces take a few seconds to render. The JavaScript version keeps your theme and writes new material forever; pieces with drums or erhu load a few small CC0 recordings.',
    stingersH: 'Short stingers', stingersP: 'Two to six second musical cues for game events.',
    stingers: {
      victory: ['Victory', 'Rising pipa run, bell and soft gong.'],
      defeat: ['Defeat', 'Falling guqin, low bell and an erhu sigh.'],
      battleStart: ['Battle start', 'Three dagu hits and a gong.'],
      treasure: ['Treasure found', 'A sparkling chime run and a bell.'],
      breakthrough: ['Breakthrough', 'Deep bell, guqin arpeggio and a flute note.']
    },
    licenseH: 'License', licenseP: 'Everything you generate here is free for commercial use, no attribution required. The few recordings used (drums, gong, erhu) are CC0.',
    rendering: 'Rendering…', copied: 'Copied ✓', copyFailed: 'Copy failed',
    melodyH: 'Melody', melodyP: 'This is the melody your theme generated. Click an empty cell to add a note (drag right to make it longer), click a note to remove it. Your melody is used everywhere that section appears in the piece.',
    tabA: 'Theme (A)', tabB: 'Contrast (B)', preview: 'Play this section', stopPreview: 'Stop', reset: 'Back to generated', clear: 'Clear', edited: 'Edited by you', generated: 'Generated',
    arrangeH: 'Arrangement', arrangeP: 'Start from a mood, then change anything. Every change is heard on the next play.',
    newTheme: 'New theme', playPiece: 'Play', stopPiece: 'Stop',
    f: { mode: 'Mode', root: 'Key', tempo: 'Tempo', melody: 'Lead', melodyB: 'Second lead (B section)', accomp: 'Accompaniment', bass: 'Bass', perc: 'Percussion', structure: 'Form', curve: 'Intensity', density: 'Note density', humanize: 'Human feel', sparkle: 'Wind chime sparkles' },
    opt: {
      gong: 'Gong (bright, major-like)', shang: 'Shang', jue: 'Jue', zhi: 'Zhi', yu: 'Yu (sad, minor-like)',
      guqin: 'Guqin', flute: 'Bamboo flute', erhu: 'Erhu', pipa: 'Pipa',
      accGuqin: 'Guqin arpeggios', accPipa: 'Pipa strums', pad: 'Soft chord pad', none: 'None',
      drone: 'Drone', pulse: 'Plucked bass',
      woodfish: 'Wooden fish', drum: 'Soft drum', battle: 'War drums',
      f1: 'Intro A A B A Outro', f2: 'Intro A B A Outro', f3: 'A A B A', f4: 'A B A B',
      cPreset: 'As the mood', cSteady: 'Steady', cBuild: 'Building up', cArc: 'Rise and fall', cFade: 'Fading out'
    },
    pieceInfo: '{bars} bars, about {sec} seconds per full piece. Live playback keeps the theme and writes new material every round.',
  },
  zh: {
    title: '免费游戏背景音乐生成器：东方 / 修仙配乐',
    metaDesc: '在浏览器里生成免费可商用的游戏背景音乐：古琴山水、战鼓战斗、神秘洞府、二胡抒情。可下载无缝循环 WAV、复制永不重复的生成式 JavaScript，还有短乐句。',
    h1: '东方游戏配乐生成器',
    lead: '在你的浏览器里实时作曲的游戏背景音乐：五声音阶，古琴、琵琶、竹笛、钟磬、战鼓、铜锣、二胡。点播放就能听它边作边奏；可以下载无缝循环，也可以复制一段 JavaScript，放进游戏里一直作曲、永不重复。',
    moods: {
      calm: ['宁静山水', '古琴和竹笛，底下一层柔和的长音。打坐修炼、村庄、放置挂机。'],
      battle: ['战斗', '大鼓擂动、琵琶轮指、低音推进，每八小节一声锣。战斗、Boss、攻城。'],
      mystery: ['神秘洞府', '幽暗的低音、远处的钟声、风铃和古琴泛音。探索、洞府、秘境。'],
      sad: ['悲伤抒情', '二胡旋律配柔和的古琴和弦。离别、失败、感人剧情。'],
      journey: ['行旅', '竹笛领奏，古琴分解和弦，弦乐铺底，后半段换二胡。赶路、大地图、野外。'],
      capital: ['京城叙事', '二胡散板开头，接一段慢叙事，古琴、大提琴和远处的木鱼。城镇、剧情。'],
      palace: ['深宫', '古琴慢弹，底下大提琴像心跳一样低低地跳，中段推到最高。阴谋、潜行、压抑。'],
      temple: ['山中古寺', '竹笛散板起、散板收，五声和声，几乎没有节拍。遗迹、寺庙、安静的结尾。'],
      skirmish: ['遭遇战', '都节调旋律配弗里几亚和声：低弦来回锯，二胡往下坠，大鼓疏而沉。普通战斗。'],
      boss: ['头目战', '更慢更沉，低一个全音，二胡压在锯动的大提琴上。精英怪、小头目。'],
      final: ['决战', '三档里最急的一档，二胡和低音琵琶在高潮叠在一起。最终战。']
    },
    play: '播放', stop: '停止', nowPlaying: '正在作曲：{mood} · 变奏 {seed}', idle: '选一种情绪点播放。每个变奏的作曲都不一样。',
    tempo: '速度', volume: '音量', reseed: '换一个变奏',
    exportH: '用到游戏里', loopLen: '循环长度', seconds: '秒',
    downloadLoop: '下载无缝循环（WAV）', copyJs: '复制 JavaScript（永不重复）',
    exportP: '循环就是按你的编曲生成的一整首，结尾会折回开头，循环播放时没有停顿和"咔"声。曲子长或音符多时要渲染几秒钟。JavaScript 版保留你的主题、一直写新的段落；用到鼓或二胡时会加载几个很小的 CC0 录音。',
    stingersH: '短乐句', stingersP: '两到六秒的提示乐句，用在游戏的关键时刻。',
    stingers: {
      victory: ['胜利', '上行的琵琶、钟声和轻轻一声锣。'],
      defeat: ['失败', '下行的古琴、低沉的钟和一声二胡叹息。'],
      battleStart: ['开战', '三声大鼓接一声锣。'],
      treasure: ['获得宝物', '闪亮的风铃琶音和一声钟。'],
      breakthrough: ['突破', '深沉的钟、古琴琶音和一声竹笛。']
    },
    licenseH: '授权', licenseP: '这里生成的所有内容都可以免费商用，不需要署名。用到的少量录音（鼓、锣、二胡）都是 CC0。',
    rendering: '渲染中…', copied: '已复制 ✓', copyFailed: '复制失败',
    melodyH: '旋律', melodyP: '这是当前主题生成的旋律。点空格子加音符（按住往右拖可以拉长），点音符删除。你改的旋律会用在整首曲子里每次出现这一段的地方。',
    tabA: 'A 段主题', tabB: 'B 段', preview: '试听这一段', stopPreview: '停止', reset: '恢复生成的旋律', clear: '清空', edited: '已手动修改', generated: '自动生成',
    arrangeH: '编曲', arrangeP: '先选一种情绪，再随意修改。改动在下一次播放时生效。',
    newTheme: '换一个主题', playPiece: '播放', stopPiece: '停止',
    f: { mode: '调式', root: '主音', tempo: '速度', melody: '主奏', melodyB: '副奏（B 段）', accomp: '伴奏', bass: '低音', perc: '打击乐', structure: '曲式', curve: '强弱走向', density: '音符密度', humanize: '人味', sparkle: '点缀风铃' },
    opt: {
      gong: '宫调（明亮）', shang: '商调', jue: '角调', zhi: '徵调', yu: '羽调（哀婉）',
      guqin: '古琴', flute: '竹笛', erhu: '二胡', pipa: '琵琶',
      accGuqin: '古琴分解和弦', accPipa: '琵琶扫弦', pad: '柔和长音', none: '无',
      drone: '持续低音', pulse: '拨奏低音',
      woodfish: '木鱼', drum: '轻鼓', battle: '战鼓',
      f1: '引子 A A B A 尾声', f2: '引子 A B A 尾声', f3: 'A A B A', f4: 'A B A B',
      cPreset: '按情绪默认', cSteady: '平稳', cBuild: '渐强', cArc: '起伏', cFade: '渐弱'
    },
    pieceInfo: '共 {bars} 小节，一整首约 {sec} 秒。实时播放时主题保留，每一轮都会写新的段落。',
  }
};

/* 音乐工作室（/music/ 和 /zh/music/）界面文字 */
const STUDIO = {
  en: {
    title: 'SFX Brew Lab — Free Online Music Studio for Game Soundtracks',
    metaDesc: 'A free music studio in your browser for game soundtracks: multitrack timeline, piano roll, drum grid and mixer with guqin, pipa, bamboo flute, erhu, bells, war drums and a string section (violins, violas, cellos). Generate a full arrangement from a mood, edit every note, export WAV, loops and stems. Free for commercial use.',
    untitled: 'Untitled song', expStudio: 'Music studio', expText: 'Text to music (coming soon)', expSfx: 'Text to sound effect (beta)', expTextShort: 'Text to music', soon: 'soon', newProject: 'New', exportBtn: 'Export',
    play: 'Play', stop: 'Stop', toStart: 'Go to start', loop: 'Cycle (C)', metronome: 'Metronome (K)', undo: 'Undo (⌘Z)', redo: 'Redo (⇧⌘Z)',
    tempo: 'Tempo', key: 'Key', mode: 'Mode', scaleLock: 'Pentatonic lock', scaleLockTip: 'Only show notes of the pentatonic scale in the piano roll',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', addTrack: '+ Track', loopLane: 'Cycle', barsLane: 'Bar', secLane: 'Sections', chordLane: 'Chords',
    xSong: 'Whole song (WAV)', xLoop: 'Cycle range, seamless loop (WAV)', xStems: 'Stems, one WAV per track (ZIP)', xSave: 'Save project file', xOpen: 'Open project file…',
    quantGrid: 'Grid', quantize: 'Quantize (Q)', loopThis: 'Cycle this region', close: 'Hide editor (E)',
    rollHint: 'Click to add a note, drag right to lengthen · drag to move · drag the right edge to resize · double-click or ⌥-click to delete · ⇧-drag to select · ↑↓ transpose',
    q: { '1': '1/4', '0.5': '1/8', '0.3333': '1/8 triplet', '0.25': '1/16' },
    startH: 'Start a new song', startP: 'Pick a mood to get a full arrangement you can edit, or start from an empty track.',
    blank: 'Empty project', blankP: 'One guqin track, nothing in it.', openFile: 'Open project file', resume: 'Back to my song', moodsH: 'Generate from a mood',
    mobile: 'Editing works best on a computer. On a phone you can generate, listen and export.',
    aboutH: 'A music studio for game soundtracks', aboutP: [
      'SFX Brew Studio is a small music workstation that runs in your browser. Every song is made of tracks, every track of regions, every region of notes you can edit in the piano roll or drum grid. Nothing is uploaded: sound is synthesised on your computer.',
      'Generate a piece from a mood (calm landscape, battle, mysterious cave, sorrow, plus road, capital, palace, temple and three tiers of combat) and the composer writes a theme, harmony, sections, a string bed, bass and percussion as separate tracks. Melodies stay pentatonic while the chords underneath are triads of the full seven-note scale, with a darker Phrygian colour for combat. Each instrument starts in its usual seat in the stereo field, and the master bus adds a hall reverb, gentle compression and a limiter. Change the instruments, move regions, redraw the melody, mute and solo, set the cycle range and export a seamless loop or stems for your game engine.',
      'Everything you make is free for commercial use, no attribution required. The few recordings used (drums, gong, erhu, string section) are CC0.'
    ],
    i18n: {
      play: 'Play', stop: 'Stop', saved: 'Saved in this browser', saveFailed: 'Could not save (storage full or blocked)', restored: 'Restored your last song',
      sections: { intro: 'Intro', outro: 'Outro', A: 'A', B: 'B', A2: 'A′', C: 'Climax', brk: 'Break', free: 'Free time' },
      trackName: 'Track name', mute: 'Mute', solo: 'Solo', volume: 'Volume', pan: 'Pan', reverb: 'Reverb', instrument: 'Instrument',
      project: 'Song', songBars: 'Length (bars)', inspEmpty: 'Select a track or region to edit it. Double-click an empty spot on a track to add a region.',
      shortcuts: 'Shortcuts',
      keys: [['Space', 'Play / stop'], ['Return', 'Go to start'], ['C', 'Cycle on / off'], ['K', 'Metronome'], ['E', 'Show / hide editor'], ['⌘Z / ⇧⌘Z', 'Undo / redo'], ['⌘D', 'Duplicate region'], ['⌫', 'Delete selection'], ['⌥-drag', 'Copy region'], ['⌘-scroll', 'Zoom']],
      trackInfo: 'Regions: {regions} · notes: {notes}', dupTrack: 'Duplicate track', delTrack: 'Delete track',
      region: 'Region', regionStart: 'Starts at bar', regionLen: 'Length (bars)', regionInfo: 'Notes: {notes}', dupRegion: 'Duplicate', loopRegion: 'Cycle it', delRegion: 'Delete',
      center: 'Center', left: 'L', right: 'R',
      modes: { gong: 'Gong (bright)', shang: 'Shang', jue: 'Jue', zhi: 'Zhi', yu: 'Yu (sad)', miyako: 'Miyako-bushi (dark)' },
      rendering: 'Rendering…', renderingStem: 'Rendering track {i} of {n}…', exported: 'Downloaded', exportFailed: 'Nothing to export yet', opened: 'Opened {name}', openFailed: 'That file is not an SFX Brew project',
      rollEmpty: 'Select a region to edit its notes (double-click an empty spot on a track to make one)', regionAt: 'bar {bar}, {len} bars', velocity: 'Velocity'
    }
  },
  zh: {
    title: 'SFX Brew 实验室：免费在线编曲工作室（游戏配乐 / 民乐音色）',
    metaDesc: '在浏览器里免费做游戏配乐的编曲工作室：多轨时间线、钢琴卷帘、鼓网格、混音，音色有古琴、琵琶、竹笛、二胡、钟磬、战鼓和西洋弦乐组（小提琴、中提琴、大提琴）。按情绪一键生成完整编曲，每个音都能改，导出 WAV、无缝循环和分轨，免费商用。',
    untitled: '未命名', expStudio: '编曲工作室', expText: '文字作曲（即将推出）', expSfx: '文字生成音效（测试版）', expTextShort: '文字作曲', soon: '即将推出', newProject: '新建', exportBtn: '导出',
    play: '播放', stop: '停止', toStart: '回到开头', loop: '循环（C）', metronome: '节拍器（K）', undo: '撤销（⌘Z）', redo: '重做（⇧⌘Z）',
    tempo: '速度', key: '主音', mode: '调式', scaleLock: '五声锁定', scaleLockTip: '钢琴卷帘里只显示五声音阶内的音',
    zoomIn: '放大', zoomOut: '缩小', addTrack: '+ 音轨', loopLane: '循环', barsLane: '小节', secLane: '段落', chordLane: '和弦',
    xSong: '整首（WAV）', xLoop: '循环区间，无缝循环（WAV）', xStems: '分轨，每轨一个 WAV（ZIP）', xSave: '保存项目文件', xOpen: '打开项目文件…',
    quantGrid: '网格', quantize: '量化（Q）', loopThis: '循环这一段', close: '收起编辑器（E）',
    rollHint: '点击加音符，往右拖拉长 · 拖动移动 · 拖右边缘改长度 · 双击或 ⌥ 点击删除 · ⇧ 拖动框选 · ↑↓ 移调',
    q: { '1': '1/4', '0.5': '1/8', '0.3333': '1/8 三连音', '0.25': '1/16' },
    startH: '新建一首曲子', startP: '选一种情绪，直接得到一份可以随便改的完整编曲；或者从空白音轨开始。',
    blank: '空白项目', blankP: '一条古琴轨，里面什么都没有。', openFile: '打开项目文件', resume: '回到我的曲子', moodsH: '按情绪生成',
    mobile: '精细编辑建议用电脑。手机上可以生成、试听和导出。',
    aboutH: '给游戏配乐用的编曲工作室', aboutP: [
      'SFX Brew 工作室是一个在浏览器里运行的小型编曲软件。一首曲子由多条音轨组成，每条轨上有若干片段，每个片段里的音符都能在钢琴卷帘或鼓网格里修改。不上传任何东西，声音都在你的电脑上实时合成。',
      '按情绪生成一首（宁静山水、战斗、神秘洞府、悲伤抒情，以及行旅、京城、深宫、古寺和三档战斗），作曲引擎会写出主题、和声、段落、弦乐铺底、低音和打击乐，各占一条轨。旋律是五声的，底下的和声用七声音阶的三和弦，战斗曲用更阴的弗里几亚色彩。每件乐器默认坐在乐队里惯常的位置上，总线上有厅堂混响、轻度压缩和限幅。可以换乐器、挪片段、重画旋律、静音独奏、设定循环区间，再导出无缝循环或分轨，放进游戏引擎里。',
      '在这里做的所有内容都可以免费商用，不需要署名。用到的少量录音（鼓、锣、二胡、弦乐组）都是 CC0。'
    ],
    i18n: {
      play: '播放', stop: '停止', saved: '已自动保存在本浏览器', saveFailed: '保存失败（存储空间满了或被禁用）', restored: '已恢复上次的曲子',
      sections: { intro: '引子', outro: '尾声', A: 'A 段', B: 'B 段', A2: 'A 变奏', C: '高潮', brk: '间歇', free: '散板' },
      trackName: '音轨名', mute: '静音', solo: '独奏', volume: '音量', pan: '声像', reverb: '混响', instrument: '乐器',
      project: '曲子', songBars: '长度（小节）', inspEmpty: '选中一条音轨或一个片段来修改。在音轨的空白处双击可以新建片段。',
      shortcuts: '快捷键',
      keys: [['空格', '播放 / 停止'], ['回车', '回到开头'], ['C', '开关循环'], ['K', '节拍器'], ['E', '显示 / 收起编辑器'], ['⌘Z / ⇧⌘Z', '撤销 / 重做'], ['⌘D', '复制片段'], ['⌫', '删除选中的内容'], ['⌥ 拖动', '复制片段'], ['⌘ 滚轮', '缩放']],
      trackInfo: '{regions} 个片段，{notes} 个音符', dupTrack: '复制音轨', delTrack: '删除音轨',
      region: '片段', regionStart: '起始小节', regionLen: '长度（小节）', regionInfo: '{notes} 个音符', dupRegion: '复制', loopRegion: '循环它', delRegion: '删除',
      center: '居中', left: '左', right: '右',
      modes: { gong: '宫调（明亮）', shang: '商调', jue: '角调', zhi: '徵调', yu: '羽调（哀婉）', miyako: '都节调（阴暗）' },
      rendering: '渲染中…', renderingStem: '正在渲染第 {i} / {n} 轨…', exported: '已下载', exportFailed: '还没有可以导出的音符', opened: '已打开 {name}', openFailed: '这不是 SFX Brew 的项目文件',
      rollEmpty: '选中一个片段来编辑音符（在音轨空白处双击可以新建片段）', regionAt: '第 {bar} 小节起，{len} 小节', velocity: '力度'
    }
  }
};


/* 文字生成音效（测试版，/lab/sfx/）界面文字。后端是本机 sfx-pro，经 Cloudflare Tunnel 到 api.sfxbrew.com */
const TEXTSFX = {
  en: {
    title: 'Text to Sound Effect (beta) | SFX Brew Lab',
    metaDesc: 'Describe a game sound effect in one sentence and get three ready-to-use WAV files. Say what to change and refine it. Free to try every day.',
    h: 'Text to sound effect', beta: 'beta',
    sub: 'Describe a sound in one sentence. Get three you can drop into your game.',
    ph: 'e.g. a heavy wooden door creaking open', go: 'Generate', going: 'Working…', examplesH: 'Try',
    examples: ['a heavy wooden door creaking open', 'slime jumping and landing', 'sci-fi door sliding open', 'footsteps in deep snow', '8-bit treasure chest opening', 'sword drawn from its sheath', 'distant temple bell at night'],
    refinePh: 'What should change? e.g. darker, shorter tail, more metallic', refine: 'Refine', refining: 'Refining…', pick: 'Refine this', download: 'WAV', play: 'Play',
    match: 'match', recFrom: 'Recordings', synth: 'Synthesized', you: 'You', refineOf: 'Change:',
    notice: 'Beta, may be offline now and then.',
    privacy: 'Privacy policy', left: '{n} free generations left today', offline: 'The generator is offline right now (it runs on a single machine during the beta). Please try again later.',
    keptPrev: 'That change moved it further from the description, so the previous version is kept first.', mild: 'The change was too strong, so a gentler version was used.',
    errors: { per_minute: 'Too many requests. Wait a minute and try again.', per_day: 'You have used today\'s free generations. Come back tomorrow.', daily_global: 'Today\'s beta quota for everyone is used up. Come back tomorrow.',
      busy: 'Busy right now, please try again in a moment.', captcha: 'Verification failed. Reload the page and try again.', empty: 'Type a description first.', origin: 'Request blocked.', server: 'Generation failed. Try describing it differently.', network: 'Could not reach the generator. It may be offline.' },
    license: 'Generated sounds are free for commercial use.',
    loginBuy: 'Sign in to buy credits', emailPh: 'Email', sendCode: 'Send code', sending: 'Sending…', codeSent: 'We sent a code to {email}.', codePh: '6-digit code', verify: 'Sign in', logout: 'Sign out', cancel: 'Cancel',
    acctNote: '1 credit per generation or change. Credits never expire, and there is no daily limit while you are signed in.',
    buyH: 'Buy credits', buy: '{n} credits · {price}', buying: 'Opening checkout…', paidOk: 'Payment received. {n} credits added.',
    up: 'Good match', down: 'Not what I wanted', ai: 'AI generated · Powered by Stability AI',
    creditsLeft: '{n} credits',
    keyErrors: { license_invalid: 'You were signed out. Please sign in again.', no_credits: 'You are out of credits.', not_paid: 'The payment has not gone through yet. Reload this page in a minute.',
      payment_error: 'Payment error. If you were charged, email contact@sfxbrew.com and we will sort it out.', login_required: 'Please sign in first.',
      code_invalid: 'That code is wrong or has expired.', email_invalid: 'That email address does not look right.', too_many: 'Too many attempts. Try again in a minute.', mail_error: 'Could not send the email. Please try again later.' }
  },
  zh: {
    title: '文字生成音效（测试版）| SFX Brew 实验室',
    metaDesc: '用一句话描述游戏音效，得到三个能直接用的 WAV，再说一句就能接着改。每天都能免费试。',
    h: '文字生成音效', beta: '测试版',
    sub: '一句话描述，得到三个能直接放进游戏的音效。',
    ph: '比如：推开一扇沉重的旧木门', go: '生成', going: '生成中…', examplesH: '试试',
    examples: ['推开一扇沉重的旧木门', '史莱姆跳跃落地', '科幻飞船的自动门打开', '在厚雪里走几步', '8-bit 风格的开宝箱', '拔剑出鞘', '雨夜里远处的寺庙钟声'],
    refinePh: '说说怎么改：再闷一点 / 尾巴短点 / 更有金属感', refine: '修改', refining: '修改中…', pick: '选这个继续改', download: 'WAV', play: '播放',
    match: '贴近度', recFrom: '录音素材', synth: '合成', you: '你', refineOf: '修改：',
    notice: '测试版，偶尔会离线。',
    privacy: '隐私政策', left: '今天还能免费生成 {n} 次', offline: '生成服务暂时离线（测试期间只跑在一台机器上），请稍后再来。',
    keptPrev: '这次改动反而离描述更远，第一个保留的是上一版。', mild: '原方案改得太猛，已自动换成温和一点的版本。',
    errors: { per_minute: '请求太频繁，请过一分钟再试。', per_day: '你今天的免费次数用完了，明天再来吧。', daily_global: '今天全站的测试名额已经用完，明天再来吧。',
      busy: '现在有点忙，请稍等片刻再试。', captcha: '人机验证没通过，请刷新页面再试。', empty: '先写一句描述。', origin: '请求被拒绝。', server: '生成失败，换个说法试试。', network: '连不上生成服务，可能暂时离线。' },
    license: '生成的音效可以免费商用。',
    loginBuy: '登录购买点数', emailPh: '邮箱', sendCode: '发送验证码', sending: '发送中…', codeSent: '验证码已发到 {email}', codePh: '6 位验证码', verify: '登录', logout: '退出', cancel: '取消',
    acctNote: '生成或修改一次用 1 点，点数不过期；登录后不受每日免费次数限制。',
    buyH: '购买点数', buy: '{n} 点 · {price}', buying: '正在打开付款页…', paidOk: '付款成功，{n} 点已到账。',
    up: '挺像的', down: '不是我要的', ai: 'AI 生成 · Powered by Stability AI',
    creditsLeft: '剩余 {n} 点',
    keyErrors: { license_invalid: '登录已失效，请重新登录。', no_credits: '点数用完了。', not_paid: '付款还没完成，请过一分钟刷新本页。',
      payment_error: '付款出了问题。如果已经扣款，请发邮件到 contact@sfxbrew.com，我们会处理。', login_required: '请先登录。',
      code_invalid: '验证码不对或已过期。', email_invalid: '邮箱格式不对。', too_many: '操作太频繁，请过一会儿再试。', mail_error: '邮件发送失败，请稍后再试。' }
  }
};

module.exports = { SOUNDS, PACKS, UI, MUSIC, STUDIO, CAT_COPY, TEXTSFX };
