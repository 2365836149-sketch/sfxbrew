/* ============================================================================
   SFX Brew · 特效引擎包里的文本文件（Godot 场景/资源、图集 JSON、README）
   ----------------------------------------------------------------------------
   Node（node/vfx-export.js）和官网特效页（/vfx/，浏览器里打 zip）共用这一份，保证两边导出一模一样。
   浏览器里挂在 window.SFX_VFXPACK，Node 里 require('./vfxpack.js')。
   ==========================================================================*/
(function () {
  'use strict';

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
    anims.push('{\n"frames": [' + frames.join(', ') + '],\n"loop": ' + !!it.r.loop + ',\n"name": &"' + it.anim + '",\n"speed": ' + it.r.fps.toFixed(1) + '\n}');
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
    meta: { app: 'https://sfxbrew.com', version: '1', image: it.png, format: 'RGBA8888', size: { w: it.r.size * it.r.frames.length, h: it.r.size }, scale: '1', fps: it.r.fps, frameSize: it.r.size, frameCount: it.r.frames.length, style: it.r.style, seed: it.r.seed, loop: !!it.r.loop }
  };
}

function readme(o) {
  const n = o.items[0].r.frames.length, S = o.items[0].r.size, fps = o.items[0].r.fps;
  const first = o.items[0];
  return `${o.name} — ${o.label}
${o.items.length} variation${o.items.length > 1 ? 's' : ''}, ${n} frames of ${S}x${S} px at ${fps} fps${first.r.loop ? ', seamless loop' : ''}, ${o.style === 'pixel' ? 'pixel-art style (hard edges, 5 colours)' : 'smooth glow, straight (non-premultiplied) alpha'}.
Made with SFX Brew — https://sfxbrew.com${o.withSound ? '\nThe matching sound is in wav/.' : ''}

FILES
  ${first.png}   all frames in one row (sprite sheet)
  ${first.base}.json            atlas data (TexturePacker hash format)
  frames/              one PNG per frame
  godot/               Godot 4 SpriteFrames + a ready-to-use scene
${o.withSound ? '  wav/                 sound variations\n' : ''}
GODOT 4
  Copy this folder into your project. Drag godot/${o.name}.tscn into a scene (or
  instance it from code); it plays on its own${o.withSound ? ' together with the sound' : ''}${first.r.loop ? ' and keeps looping until you free it' : ' and frees itself when done'}:
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


  const API = { ident, gdScript, gdScene, gdRandomizer, gdSpriteFrames, atlasJson, readme };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else window.SFX_VFXPACK = API;
})();
