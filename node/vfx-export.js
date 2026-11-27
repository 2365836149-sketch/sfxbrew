/* ============================================================================
   SFX Brew · 特效导出：一次生成一个文件夹，各引擎直接能用
   ----------------------------------------------------------------------------
   sfxbrew-vfx-<name>/
     <name>_strip12.png      横排图集。文件名里的 _stripN 让 GameMaker 导入时自动切成 N 帧
     <name>.json             图集数据（TexturePacker "hash" 格式 + animations），Phaser / PixiJS / Aseprite 工具链都认
     frames/<name>_00.png    单帧 PNG，给 Unreal、Construct、视频剪辑等用
     godot/<name>.tres       Godot 4 SpriteFrames（AnimatedSprite2D 直接用）
     godot/<name>.tscn       Godot 4 场景：AnimatedSprite2D + 音效，实例化后调用 play()，播完自动删除
     godot/sfxbrew_vfx.gd    上面场景的脚本
     godot/<name>_sfx.tres   （带音效时）AudioStreamRandomizer，每次随机一个变体
     wav/<name>-01.wav ...   （带音效时）同名音效的几个变体
     README.txt              每个引擎怎么用、授权
   variants > 1 时每个变体单独一套 PNG（<name>-01_strip12.png ...），Godot SpriteFrames 里是同一资源的多段动画。
   ==========================================================================*/
'use strict';

const fs = require('fs');
const path = require('path');
const V = require('../vfx.js');
const { encodePng } = require('./png.js');

const ident = s => s.replace(/[^A-Za-z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^[^A-Za-z_]/, '_$&');

function gdScript() {
  return `extends Node2D
## SFX Brew effect: an AnimatedSprite2D plus (optionally) its matching sound.
## Instance the scene, set its position and it plays by itself (autoplay),
## or untick autoplay and call play() when you need it.

@export var autoplay := true
## Remove the node when the animation has finished (good for one-shot hits).
@export var free_when_done := true

@onready var sprite: AnimatedSprite2D = $Sprite

func _ready() -> void:
	sprite.animation_finished.connect(_on_finished)
	if autoplay:
		play()

func play(animation: StringName = &"") -> void:
	if animation == &"":
		var names := sprite.sprite_frames.get_animation_names()
		animation = names[randi() % names.size()]
	sprite.visible = true
	sprite.play(animation)
	sprite.frame = 0
	if has_node("Sound"):
		$Sound.play()

func _on_finished() -> void:
	if free_when_done:
		queue_free()
	else:
		sprite.visible = false
`;
}

function gdScene(name, withSound, anim) {
  const steps = withSound ? 4 : 3;
  let s = `[gd_scene load_steps=${steps} format=3]

[ext_resource type="Script" path="sfxbrew_vfx.gd" id="1"]
[ext_resource type="SpriteFrames" path="${name}.tres" id="2"]
${withSound ? `[ext_resource type="AudioStream" path="${name}_sfx.tres" id="3"]\n` : ''}
[node name="${ident(name).replace(/^./, c => c.toUpperCase())}" type="Node2D"]
script = ExtResource("1")

[node name="Sprite" type="AnimatedSprite2D" parent="."]
sprite_frames = ExtResource("2")
animation = &"${anim || name}"
`;
  if (withSound) s += `
[node name="Sound" type="AudioStreamPlayer2D" parent="."]
stream = ExtResource("3")
`;
  return s;
}

function gdRandomizer(wavs) {
  let s = '[gd_resource type="AudioStreamRandomizer" load_steps=' + (wavs.length + 1) + ' format=3]\n\n';
  wavs.forEach((f, i) => { s += '[ext_resource type="AudioStream" path="../wav/' + f + '" id="' + (i + 1) + '"]\n'; });
  s += '\n[resource]\nrandom_pitch = 1.04\nrandom_volume_offset_db = 1.0\nstreams_count = ' + wavs.length + '\n';
  wavs.forEach((f, i) => { s += 'stream_' + i + '/stream = ExtResource("' + (i + 1) + '")\nstream_' + i + '/weight = 1.0\n'; });
  return s;
}

/** 多段动画的 SpriteFrames：每个变体一张图集，一段动画 */
function gdSpriteFrames(items) {
  const exts = items.map((it, i) => '[ext_resource type="Texture2D" path="../' + it.png + '" id="' + (i + 1) + '"]').join('\n');
  let subs = '', anims = [], total = 0;
  items.forEach((it, v) => {
    const frames = [];
    for (let i = 0; i < it.r.frames.length; i++) {
      const id = 'v' + v + 'f' + i;
      subs += '[sub_resource type="AtlasTexture" id="' + id + '"]\natlas = ExtResource("' + (v + 1) + '")\nregion = Rect2(' + i * it.r.size + ', 0, ' + it.r.size + ', ' + it.r.size + ')\n\n';
      frames.push('{\n"duration": 1.0,\n"texture": SubResource("' + id + '")\n}');
      total++;
    }
    anims.push('{\n"frames": [' + frames.join(', ') + '],\n"loop": false,\n"name": &"' + it.anim + '",\n"speed": ' + it.r.fps.toFixed(1) + '\n}');
  });
  return '[gd_resource type="SpriteFrames" load_steps=' + (items.length + total + 1) + ' format=3]\n\n' + exts + '\n\n' + subs + '[resource]\nanimations = [' + anims.join(', ') + ']\n';
}

/** TexturePacker JSON (hash)：Phaser this.load.atlas / PixiJS Assets.load 都能直接读；animations 给 Pixi 的 AnimatedSprite */
function atlasJson(it) {
  const frames = {}, keys = [];
  it.r.frames.forEach((_, i) => {
    const k = it.base + '_' + String(i).padStart(2, '0');
    keys.push(k);
    frames[k] = { frame: { x: i * it.r.size, y: 0, w: it.r.size, h: it.r.size }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: it.r.size, h: it.r.size }, sourceSize: { w: it.r.size, h: it.r.size }, duration: Math.round(1000 / it.r.fps) };
  });
  return {
    frames, animations: { [it.base]: keys },
    meta: { app: 'https://sfxbrew.com', version: '1', image: it.png, format: 'RGBA8888', size: { w: it.r.size * it.r.frames.length, h: it.r.size }, scale: '1', fps: it.r.fps, frameSize: it.r.size, frameCount: it.r.frames.length, style: it.r.style, seed: it.r.seed }
  };
}

function readme(o) {
  const n = o.items[0].r.frames.length, S = o.items[0].r.size, fps = o.items[0].r.fps;
  const first = o.items[0];
  return `${o.name} — ${o.label}
${o.items.length} variation${o.items.length > 1 ? 's' : ''}, ${n} frames of ${S}x${S} px at ${fps} fps, ${o.style === 'pixel' ? 'pixel-art style (hard edges, 5 colours)' : 'smooth glow, straight (non-premultiplied) alpha'}.
Made with SFX Brew — https://sfxbrew.com${o.withSound ? '\nThe matching sound is in wav/.' : ''}

FILES
  ${first.png}   all frames in one row (sprite sheet)
  ${first.base}.json            atlas data (TexturePacker hash format)
  frames/              one PNG per frame
  godot/               Godot 4 SpriteFrames + a ready-to-use scene
${o.withSound ? '  wav/                 sound variations\n' : ''}
GODOT 4
  Copy this folder into your project. Drag godot/${o.name}.tscn into a scene (or
  instance it from code); it plays on its own${o.withSound ? ' together with the sound' : ''} and frees itself when done:
      var fx = preload("res://<folder>/godot/${o.name}.tscn").instantiate()
      fx.position = hit_position
      add_child(fx)
  Only need the frames? Put godot/${o.name}.tres in an AnimatedSprite2D's Sprite Frames.
${o.style === 'pixel' ? '  Pixel art: set Project Settings > Rendering > Textures > Default Texture Filter to Nearest.\n' : '  For a brighter look, give the sprite a CanvasItemMaterial with Blend Mode = Add.\n'}
UNITY
  Import ${first.png}. In the Inspector: Texture Type = Sprite (2D and UI), Sprite Mode = Multiple${o.style === 'pixel' ? ',\n  Filter Mode = Point (no filter), Compression = None' : ''}. Open Sprite Editor > Slice >
  Grid By Cell Size ${S} x ${S} > Slice > Apply. Select all slices and drag them into the scene
  to create an animation clip (set its Samples to ${fps}).

PHASER 3
  this.load.atlas('${first.base}', '${first.png}', '${first.base}.json');
  this.anims.create({ key: '${first.base}', frames: this.anims.generateFrameNames('${first.base}', { prefix: '${first.base}_', end: ${n - 1}, zeroPad: 2 }), frameRate: ${fps} });
  this.add.sprite(x, y, '${first.base}').play('${first.base}');
  (or this.load.spritesheet('${first.base}', '${first.png}', { frameWidth: ${S}, frameHeight: ${S} }))

PIXIJS
  const sheet = await PIXI.Assets.load('${first.base}.json');
  const fx = new PIXI.AnimatedSprite(sheet.animations['${first.base}']);
  fx.animationSpeed = ${(fps / 60).toFixed(3)}; fx.loop = false; fx.play();

GAMEMAKER
  Create Sprite > Import > ${first.png}. The "_strip${n}" in the name makes GameMaker cut it into ${n} frames.

OTHER ENGINES (Unreal Paper2D, Construct, Defold, RPG Maker, Cocos …)
  Use the sprite sheet with a ${S} x ${S} grid, or the single frames in frames/.

LICENSE
  Free for commercial and non-commercial use, no attribution required.
`;
}

/**
 * opt: { effect, outDir, style, size, frames, seed, variants, palette, speed, scale, withSound }
 * withSound: true = 同名音效预设（如果有），或者给一个预设名
 * 返回 { folder, files, variants: [{ seed, png, fps, frames, size }] }
 */
async function exportVfx(opt) {
  const name = opt.effect;
  if (!V.EFFECTS[name]) throw new Error('unknown effect "' + name + '". Effects: ' + V.LIST.join(', '));
  const style = opt.style === 'pixel' ? 'pixel' : 'hd';
  const variants = Math.max(1, Math.min(10, opt.variants || 1));
  const base0 = opt.seed == null ? Math.floor(Math.random() * 1e6) : opt.seed;
  const scale = style === 'pixel' ? Math.max(1, Math.min(8, Math.round(opt.scale || 1))) : 1;
  const outDir = path.resolve(opt.outDir || '.');
  const folder = path.join(outDir, 'sfxbrew-vfx-' + name);
  const files = [];
  const write = (rel, data) => {
    const f = path.join(folder, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, data);
    files.push(f);
  };

  const items = [];
  for (let v = 0; v < variants; v++) {
    const seed = base0 + v;
    let r = V.render(name, { style, size: opt.size, frames: opt.frames, seed, palette: opt.palette, speed: opt.speed });
    r = V.upscale(r, scale);
    const base = variants > 1 ? name + '-' + String(v + 1).padStart(2, '0') : name;
    const sh = V.sheet(r);
    const png = base + '_strip' + r.frames.length + '.png';
    const it = { r, base, png, anim: variants > 1 ? name + '_' + (v + 1) : name };
    write(png, encodePng(sh.width, sh.height, sh.data));
    write(base + '.json', JSON.stringify(atlasJson(it), null, 1) + '\n');
    r.frames.forEach((f, i) => write('frames/' + base + '_' + String(i).padStart(2, '0') + '.png', encodePng(r.size, r.size, f)));
    items.push(it);
  }

  /* 配套音效：同名预设，或者指定的预设 */
  let wavs = [];
  if (opt.withSound) {
    const lib = require('./lib.js');
    const preset = typeof opt.withSound === 'string' ? opt.withSound : name;
    if (!lib.PRESETS.find(p => p.id === preset)) throw new Error('no sound preset "' + preset + '" to pair with; pass a preset name (see sfxbrew list)');
    const n = Math.max(3, variants);
    for (let i = 0; i < n; i++) {
      const g = lib.generate(preset, base0 + i);
      const { bytes } = await lib.renderWav(g.patch);
      const f = name + '-' + String(i + 1).padStart(2, '0') + '.wav';
      write('wav/' + f, bytes);
      wavs.push(f);
    }
  }

  write('godot/' + name + '.tres', gdSpriteFrames(items));
  if (wavs.length) write('godot/' + name + '_sfx.tres', gdRandomizer(wavs));
  write('godot/sfxbrew_vfx.gd', gdScript());
  write('godot/' + name + '.tscn', gdScene(name, wavs.length > 0, items[0].anim));
  write('README.txt', readme({ name, label: V.EFFECTS[name].label, items, style, withSound: wavs.length > 0 }));

  return {
    folder, files,
    variants: items.map(it => ({ seed: it.r.seed, sheet: path.join(folder, it.png), atlas: path.join(folder, it.base + '.json'), frames: it.r.frames.length, size: it.r.size, fps: it.r.fps })),
    sound: wavs.map(f => path.join(folder, 'wav', f))
  };
}

module.exports = { exportVfx, gdSpriteFrames, atlasJson };
