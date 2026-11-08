/* ============================================================================
   SFX Brew · 音效库页面的文案（英文，面向 Google 搜索）
   ----------------------------------------------------------------------------
   每个预设一页：slug 决定网址，title 是页面大标题，intro/uses/tip 是正文。
   每页文案必须不一样（重复内容会被 Google 降权）。related 是页面底部的相关推荐。
   ==========================================================================*/
'use strict';

const SOUNDS = {
  swordQi: {
    slug: 'sword-slash-sound-effect', name: 'Sword Slash', title: 'Free Sword Slash Sound Effects',
    intro: 'Sharp, airy blade swings with a thin metallic ring at the end. They sit somewhere between a classic sword swoosh and the "sword qi" projectiles of wuxia and xianxia games, so they work for both a katana swing and a glowing crescent of energy flying across the screen.',
    uses: ['Melee attacks and combo hits', 'Sword qi, wind blades and energy slashes', 'Parry or blade-draw moments', 'Skill icons that cut across the UI'],
    tip: 'For a heavier weapon, lower the noise layer\'s cutoff and shorten the ring. For a magical slash, raise the reverb.',
    related: ['whoosh', 'hit', 'spell', 'thunder']
  },
  guqin: {
    slug: 'guqin-sound-effect', name: 'Guqin Pluck', title: 'Free Guqin Pluck Sound Effects',
    intro: 'Single plucked notes in the spirit of the guqin, the seven-string Chinese zither. Every note sits on the pentatonic scale and some slide up or down like a player sliding along the string, so any two of them sound good played one after another.',
    uses: ['Calm UI taps in an Eastern-themed game', 'Dialogue text ticks', 'Meditation, cultivation or crafting feedback', 'Short stingers between scenes'],
    tip: 'Generate a pack of ten and play them in sequence on repeated actions: because they share a scale, rapid taps turn into a small melody.',
    related: ['flute', 'chime', 'bell', 'confirm']
  },
  bell: {
    slug: 'temple-bell-sound-effect', name: 'Temple Bell', title: 'Free Temple Bell Sound Effects',
    intro: 'Struck bells with inharmonic overtones and a long, fading ring, closer to a temple or shrine bell than a doorbell. The tail is long on purpose: trim it in your engine or lower the decay if you need a shorter notification.',
    uses: ['Quest complete or objective reached', 'Shrine, temple and save-point interactions', 'Meditation timers and idle-game milestones', 'Day or night transitions'],
    tip: 'Pitch decides the mood: low bells feel solemn, high bells feel like a notification.',
    related: ['gong', 'chime', 'breakthrough', 'guqin']
  },
  gong: {
    slug: 'gong-sound-effect', name: 'Gong', title: 'Free Gong Sound Effects',
    intro: 'Deep gong hits with a slow wobble and a rumble underneath. They fill a lot of space, so they suit big moments rather than frequent feedback.',
    uses: ['Battle start and round announcements', 'Boss entrances', 'Opening a menu or title screen with weight', 'Martial arts tournament scenes'],
    tip: 'Lower the vibrato for a cleaner tam-tam, or raise it for a shimmering, unstable gong.',
    related: ['bell', 'thunder', 'breakthrough', 'explosion']
  },
  spell: {
    slug: 'magic-spell-sound-effect', name: 'Spell Cast', title: 'Free Magic Spell Sound Effects',
    intro: 'A rising whoosh topped by a sparkling run of bell notes and a short echo. It reads instantly as "something magical just happened" without sounding like any specific element.',
    uses: ['Casting a spell or using a skill', 'Buffs, heals and enchantments', 'Unlocking an ability', 'Portals and teleports'],
    tip: 'More repeats in the bell layer make a longer shimmer; a negative repeat step turns it into a falling, darker spell.',
    related: ['qiGather', 'talisman', 'powerUp', 'chime']
  },
  thunder: {
    slug: 'thunder-sound-effect', name: 'Thunder', title: 'Free Thunder & Lightning Sound Effects',
    intro: 'A loud crack followed by a rolling rumble. In xianxia games this is the heavenly tribulation; elsewhere it is simply lightning hitting close by.',
    uses: ['Lightning spells and strikes', 'Heavenly tribulation in cultivation games', 'Storm ambience accents', 'Dramatic reveals'],
    tip: 'Delay the rumble layer by a fraction of a second to make the storm feel further away.',
    related: ['explosion', 'gong', 'spell', 'breakthrough']
  },
  breakthrough: {
    slug: 'cultivation-breakthrough-sound-effect', name: 'Breakthrough', title: 'Free Breakthrough & Ascension Sound Effects',
    intro: 'A low bell, a soft rumble and a rising plucked arpeggio: the sound of reaching a new cultivation realm. It is grander than a normal level-up and is meant for rare, important moments.',
    uses: ['Realm breakthroughs in cultivation and idle games', 'Prestige or rebirth', 'Major story milestones', 'Unlocking a new area'],
    tip: 'Use the shorter, plainer Level Up sound for frequent progress and save this one for the big steps.',
    related: ['levelUp', 'bell', 'qiGather', 'gong']
  },
  talisman: {
    slug: 'talisman-burn-sound-effect', name: 'Talisman Burn', title: 'Free Talisman & Fire Crackle Sound Effects',
    intro: 'Crackling paper catching fire, with a rising tone underneath. Built for Taoist talismans and paper charms, it also works as a small fire spell or a fuse being lit.',
    uses: ['Activating a talisman or paper charm', 'Small fire spells', 'Lighting a fuse, torch or incense', 'Burning a scroll in a cutscene'],
    tip: 'Raise the crackle layer\'s repeats for a longer burn.',
    related: ['spell', 'qiGather', 'alchemy', 'explosion']
  },
  alchemy: {
    slug: 'potion-bubble-sound-effect', name: 'Potion Bubble', title: 'Free Potion & Alchemy Bubble Sound Effects',
    intro: 'A few bubbling blips followed by a clear bell: the moment a potion or pill comes out right. Short and cheerful enough to repeat often in crafting loops.',
    uses: ['Potion brewing and alchemy', 'Crafting success', 'Cooking or mixing minigames', 'Consuming a potion'],
    tip: 'Remove the bell layer to get a plain bubbling sound for a failed or ongoing brew.',
    related: ['pickup', 'confirm', 'chime', 'talisman']
  },
  chime: {
    slug: 'wind-chime-sound-effect', name: 'Wind Chime', title: 'Free Wind Chime Sound Effects',
    intro: 'A few soft, high bell notes on the pentatonic scale, like chimes moved by a breeze. Gentle enough for discovery moments that should not interrupt the player.',
    uses: ['Finding a secret or hidden item', 'Random encounters and events', 'Ambient accents in peaceful areas', 'Hover or highlight on special items'],
    tip: 'A longer repeat gap makes it feel like real wind; a short gap makes it feel like a magical sparkle.',
    related: ['bell', 'guqin', 'spell', 'pickup']
  },
  flute: {
    slug: 'bamboo-flute-sound-effect', name: 'Bamboo Flute', title: 'Free Bamboo Flute Sound Effects',
    intro: 'Breathy single notes with vibrato, inspired by the Chinese dizi and other bamboo flutes. Soft and warm, good for transitions and quiet moments.',
    uses: ['Opening a map, journal or menu', 'Scene transitions', 'Pastoral or village areas', 'Character introductions'],
    tip: 'Less vibrato sounds calmer and more modern; more vibrato sounds older and more expressive.',
    related: ['guqin', 'chime', 'bell', 'whoosh']
  },
  qiGather: {
    slug: 'magic-charge-sound-effect', name: 'Energy Charge', title: 'Free Energy Charge Sound Effects',
    intro: 'A swelling, wobbling rise that ends in a bell, like energy gathering before release. In cultivation games it is qi flowing into the dantian; in any action game it is a charged attack.',
    uses: ['Charged attacks and wind-ups', 'Channelling and meditation ticks', 'Power gauge filling up', 'Before a transformation'],
    tip: 'Stretch the attack of the first layer to make the charge longer.',
    related: ['spell', 'powerUp', 'breakthrough', 'thunder']
  },
  coin: {
    slug: 'coin-sound-effect', name: 'Coin', title: 'Free Coin Sound Effects',
    intro: 'Two-note metallic dings for collecting money. They are built with FM synthesis, so they sound like struck metal rather than a beeping chip, and some variants carry a light retro bit-crush.',
    uses: ['Collecting coins and currency', 'Purchases in a shop', 'Rewards and loot', 'Idle game income ticks'],
    tip: 'For a jackpot, generate several coins and play them a few milliseconds apart.',
    related: ['pickup', 'confirm', 'levelUp', 'powerUp']
  },
  pickup: {
    slug: 'item-pickup-sound-effect', name: 'Item Pickup', title: 'Free Item Pickup Sound Effects',
    intro: 'Quick upward chirps with a small sparkle on top. Short enough to play dozens of times a minute without getting tiring.',
    uses: ['Picking up items and collectibles', 'Gems, orbs and experience points', 'Adding to inventory', 'Hover feedback on loot'],
    tip: 'Lower the pitch for heavier items like armour, raise it for small gems.',
    related: ['coin', 'powerUp', 'confirm', 'chime']
  },
  click: {
    slug: 'button-click-sound-effect', name: 'Button Click', title: 'Free Button Click Sound Effects',
    intro: 'Very short tactile ticks for interface buttons: a tiny burst of filtered noise for the contact plus a quick tonal body. Under 50 milliseconds, so they never lag behind the click.',
    uses: ['Button presses and toggles', 'Menu navigation', 'Typing or keypad input', 'Selecting cards or tiles'],
    tip: 'Pair a lower click for "back" with a higher one for "next" to give menus a sense of direction.',
    related: ['confirm', 'error', 'pickup', 'whoosh']
  },
  confirm: {
    slug: 'ui-confirm-sound-effect', name: 'UI Confirm', title: 'Free UI Confirm & Success Sound Effects',
    intro: 'Two pleasant electric-piano notes going up. Friendly and quick, for any moment the game says "yes, that worked".',
    uses: ['Confirm buttons and dialogs', 'Save successful', 'Toast notifications', 'Correct answers in quizzes'],
    tip: 'Use it together with the Error sound from the same session so they feel like a matching set.',
    related: ['click', 'error', 'coin', 'levelUp']
  },
  error: {
    slug: 'error-sound-effect', name: 'Error', title: 'Free Error & Wrong Answer Sound Effects',
    intro: 'Two dull, low notes made from stacked, slightly detuned voices. Clear enough to notice, soft enough not to annoy players who hear it often.',
    uses: ['Invalid action or blocked input', 'Not enough gold, mana or energy', 'Wrong answer', 'Locked door or item'],
    tip: 'A falling repeat step sounds more like "wrong"; a flat one sounds more like "not allowed".',
    related: ['confirm', 'click', 'hit', 'jump']
  },
  jump: {
    slug: 'jump-sound-effect', name: 'Jump', title: 'Free Jump Sound Effects',
    intro: 'Short rising boings with a puff of air. Softer and rounder than the classic square-wave jump, with an optional retro bit-crush for pixel-art games.',
    uses: ['Platformer jumps and double jumps', 'Bouncing on springs or enemies', 'Hops and dodges', 'Menu items bouncing in'],
    tip: 'Generate two: a lower one for the first jump and a higher one for the double jump.',
    related: ['whoosh', 'hit', 'pickup', 'powerUp']
  },
  hit: {
    slug: 'hit-punch-sound-effect', name: 'Hit', title: 'Free Hit & Punch Sound Effects',
    intro: 'Punchy impacts built from three parts: a sharp crack at the moment of contact, a thump that drops in pitch within a few dozen milliseconds, and a short crunch. That fast pitch drop is what makes a hit feel heavy.',
    uses: ['Melee hits and punches', 'Taking damage', 'Objects colliding', 'Screen shake moments'],
    tip: 'For critical hits, play a hit and a short whoosh together, or raise the drive.',
    related: ['explosion', 'swordQi', 'whoosh', 'jump']
  },
  explosion: {
    slug: 'explosion-sound-effect', name: 'Explosion', title: 'Free Explosion Sound Effects',
    intro: 'Big booms with a sub-bass drop, a long rumble and scattered debris crackles. Loud on purpose: mix them down a little if your game has many at once.',
    uses: ['Bombs, grenades and barrels', 'Destroying enemies or buildings', 'Spell impacts', 'Cinematic hits in trailers'],
    tip: 'Shorten the rumble layer for small pops; lengthen it for distant artillery.',
    related: ['hit', 'thunder', 'gong', 'laser']
  },
  laser: {
    slug: 'laser-sound-effect', name: 'Laser', title: 'Free Laser Sound Effects',
    intro: 'Falling "pew" zaps made with FM synthesis and two slightly detuned voices, so they have bite without the harshness of a raw square wave.',
    uses: ['Laser guns and blasters', 'Shooting projectiles', 'Sci-fi UI accents', 'Enemy attacks in shooters'],
    tip: 'A shorter pitch time makes a snappier shot; a longer one makes a slower plasma bolt.',
    related: ['explosion', 'powerUp', 'hit', 'whoosh']
  },
  powerUp: {
    slug: 'power-up-sound-effect', name: 'Power-up', title: 'Free Power-up Sound Effects',
    intro: 'Either a quick rising arpeggio or a filtered sweep that swells upward. Both say "you just got stronger" in under a second.',
    uses: ['Collecting a power-up', 'Upgrades and buffs', 'Combo or streak milestones', 'Filling a gauge'],
    tip: 'Each generation picks one of the two styles at random; generate a few to compare.',
    related: ['levelUp', 'pickup', 'spell', 'qiGather']
  },
  levelUp: {
    slug: 'level-up-sound-effect', name: 'Level Up', title: 'Free Level Up Sound Effects',
    intro: 'A bright arpeggio that lands on a soft chord and a bell. Celebratory without being a full fanfare, so it works even when players level up often.',
    uses: ['Character level up', 'Achievements and trophies', 'Rewards and chests', 'Completing a stage'],
    tip: 'For the rare, big moments, use Breakthrough instead.',
    related: ['breakthrough', 'powerUp', 'coin', 'confirm']
  },
  whoosh: {
    slug: 'whoosh-sound-effect', name: 'Whoosh', title: 'Free Whoosh & Swoosh Sound Effects',
    intro: 'Airy swooshes made from two filtered noise bands sweeping upward. Neutral enough to sit under almost any fast movement.',
    uses: ['Dashes, dodges and swings', 'UI panels sliding in', 'Scene transitions', 'Thrown objects'],
    tip: 'Reverse the sweep (high cutoff to low) for something moving away from the player.',
    related: ['swordQi', 'jump', 'hit', 'click']
  }
};

/* 主题包：每个包由若干预设组成，每个预设取 count 个变体 */
const PACKS = {
  'xianxia-game-sound-pack': {
    name: 'Xianxia & Wuxia Game Sound Pack',
    title: 'Free Xianxia & Wuxia Game Sound Pack',
    intro: 'Everything a cultivation or martial-arts game needs to sound Eastern: sword qi, guqin, bells, gongs, talismans, potions, thunder tribulations and breakthroughs, plus the everyday UI sounds to go with them. All on the pentatonic scale where pitch matters, all free for commercial use.',
    items: [['swordQi', 3], ['guqin', 4], ['bell', 2], ['gong', 2], ['spell', 2], ['thunder', 2], ['breakthrough', 2], ['talisman', 2], ['alchemy', 2], ['chime', 2], ['flute', 2], ['qiGather', 2], ['coin', 1], ['click', 1], ['confirm', 1], ['error', 1], ['hit', 2], ['levelUp', 1]]
  },
  'game-ui-sound-pack': {
    name: 'Game UI Sound Pack',
    title: 'Free Game UI Sound Pack',
    intro: 'A matching set of interface sounds for menus, buttons and feedback: clicks, confirms, errors, pickups, coins, whooshes and a level-up. Short, clean and designed to be heard hundreds of times without getting tiring.',
    items: [['click', 4], ['confirm', 3], ['error', 3], ['pickup', 3], ['coin', 2], ['whoosh', 3], ['levelUp', 2], ['powerUp', 2]]
  }
};

module.exports = { SOUNDS, PACKS };
