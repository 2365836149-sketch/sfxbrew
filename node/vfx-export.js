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

const { gdScript, gdScene, gdRandomizer, gdSpriteFrames, atlasJson, readme } = require('../vfxpack.js');

/**
 * opt: { effect | patch, outDir, style, size, frames, seed, variants, palette, speed, scale, withSound, mutate }
 *   effect: 预设名；patch: 自己写的图层 JSON（对象或 JSON 字符串），见 vfx.js 的 describe()
 *   withSound: true = 配对的音效预设（预设自带，或 patch.sound），或者给一个预设名
 *   mutate: 0~1，每个变体在 patch 的数值参数上随机变一点
 * 返回 { folder, files, variants: [{ seed, sheet, atlas, preview, frames, size, fps }], sound, patch }
 */
async function exportVfx(opt) {
  let patch = opt.patch, name = opt.effect, fx = null;
  if (typeof patch === 'string') { try { patch = JSON.parse(patch); } catch (e) { throw new Error('patch is not valid JSON: ' + e.message); } }
  if (patch) {
    V.normalize(patch);
    name = String(opt.effect || patch.name || 'custom').replace(/[^A-Za-z0-9_-]+/g, '_') || 'custom';
  } else {
    fx = V.EFFECTS[name];
    if (!fx) throw new Error('unknown effect "' + name + '". Effects: ' + V.LIST.join(', ') + ' (or pass a patch with layers)');
    patch = Object.assign({ palette: null }, fx.patch);
  }
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
    const p = opt.mutate ? V.mutate(patch, seed, opt.mutate) : patch;
    let r = V.render(fx ? Object.assign({}, p, { palette: p.palette || fx.palette }) : p, { style, size: opt.size, frames: opt.frames, seed, palette: opt.palette, speed: opt.speed });
    r.name = name;
    r = V.upscale(r, scale);
    const base = variants > 1 ? name + '-' + String(v + 1).padStart(2, '0') : name;
    const sh = V.sheet(r);
    const png = base + '_strip' + r.frames.length + '.png';
    const it = { r, base, png, anim: variants > 1 ? name + '_' + (v + 1) : name };
    write(png, encodePng(sh.width, sh.height, sh.data));
    write(base + '.json', JSON.stringify(atlasJson(it), null, 1) + '\n');
    r.frames.forEach((f, i) => write('frames/' + base + '_' + String(i).padStart(2, '0') + '.png', encodePng(r.size, r.size, f)));
    const cs = V.contactSheet(r, 6);
    it.preview = 'preview/' + base + '.png';
    write(it.preview, encodePng(cs.width, cs.height, cs.data));
    write('patch/' + base + '.vfx.json', JSON.stringify(Object.assign({ name: base }, p), null, 1) + '\n');
    items.push(it);
  }

  /* 配套音效：同名预设，或者指定的预设 */
  let wavs = [];
  if (opt.withSound) {
    const lib = require('./lib.js');
    const preset = typeof opt.withSound === 'string' ? opt.withSound : (fx && fx.sound) || patch.sound || name;
    if (!lib.PRESETS.find(p => p.id === preset)) throw new Error('no sound preset "' + preset + '" to pair with; pass a preset name as with_sound (see sfxbrew list)');
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
  write('README.txt', readme({ name, label: fx ? fx.label : (patch.label || name), items, style, withSound: wavs.length > 0 }));

  return {
    folder, files,
    variants: items.map(it => ({ seed: it.r.seed, sheet: path.join(folder, it.png), atlas: path.join(folder, it.base + '.json'), preview: path.join(folder, it.preview), frames: it.r.frames.length, size: it.r.size, fps: it.r.fps, loop: it.r.loop })),
    sound: wavs.map(f => path.join(folder, 'wav', f)),
    patch: items[0].r.patch
  };
}

module.exports = { exportVfx, gdSpriteFrames, atlasJson };
