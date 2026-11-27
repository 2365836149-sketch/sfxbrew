/* ============================================================================
   SFX Brew · 程序化 2D 特效（序列帧），和同名音效配套：swordQi / spell / hit ...
   ----------------------------------------------------------------------------
   做法：每一帧在一块浮点"光能"缓冲区里叠加柔光点（高斯点），叠加方式是相加（additive），
   所以交叠的地方会自然变亮、发白，像真实的光效。最后做色调映射：
       显示亮度 = 1 - exp(-能量)，透明度 = 三个通道里最亮的那个
   这样输出的 PNG 是"直通透明度"，叠在任何背景上都对；在引擎里用普通混合即可（想更亮可以用 Add 混合）。

   两种画风：
     hd    平滑的发光效果（默认 128×128）
     pixel 像素风：低分辨率（默认 48×48）渲染后，按亮度映射到 4~5 色的调色板，硬边透明

   同一个 seed 出同样的帧；不同 seed 粒子位置、方向会变。
   浏览器里挂在 window.SFX_VFX，Node 里 require('./vfx.js')。
   ==========================================================================*/
(function () {
  'use strict';

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIn = t => Math.pow(clamp(t, 0, 1), 2);
  const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

  /* ---------- 画布：坐标都用 0~1（相对边长），半径也是 ---------- */
  function Canvas(size) {
    const buf = new Float32Array(size * size * 3);
    return {
      size, buf,
      /** 柔光点：中心 (x,y)，半径 r（高斯 σ），颜色 c=[r,g,b]，强度 k */
      dot(x, y, r, c, k) {
        const S = size, px = x * S, py = y * S, s = Math.max(0.35, r * S), R = Math.ceil(s * 3);
        const x0 = Math.max(0, Math.floor(px - R)), x1 = Math.min(S - 1, Math.ceil(px + R));
        const y0 = Math.max(0, Math.floor(py - R)), y1 = Math.min(S - 1, Math.ceil(py + R));
        const inv = 1 / (2 * s * s);
        /* 很小的点按面积补偿，避免低分辨率时一闪就没 */
        const kk = k * (r * S < 0.35 ? (r * S / 0.35) * (r * S / 0.35) : 1);
        for (let yy = y0; yy <= y1; yy++) {
          const dy = yy + 0.5 - py;
          for (let xx = x0; xx <= x1; xx++) {
            const dx = xx + 0.5 - px, e = Math.exp(-(dx * dx + dy * dy) * inv) * kk;
            if (e < 1e-4) continue;
            const i = (yy * S + xx) * 3;
            buf[i] += c[0] * e; buf[i + 1] += c[1] * e; buf[i + 2] += c[2] * e;
          }
        }
      },
      /** 一笔：从 a 到 b，半径和强度从 ra/ka 渐变到 rb/kb，用一串点画（间距 = 半径的 0.4 倍） */
      stroke(ax, ay, bx, by, ra, rb, c, ka, kb) {
        /* 高斯点排成线时，线中心的亮度 ≈ 单点强度 × σ√(2π) / 间距；按这个换算，让线的亮度就是 ka→kb */
        const len = Math.hypot(bx - ax, by - ay), rmin = Math.max(Math.min(ra, rb), 0.5 / size);
        const n = Math.max(1, Math.ceil(len / (rmin * 0.5))), step = len / n;
        for (let i = 0; i <= n; i++) {
          const t = i / n, r = Math.max(lerp(ra, rb, t), 0.5 / size);
          const k = lerp(ka, kb, t) * (step > 0 ? Math.min(1, step / (r * 2.5066)) : 1);
          this.dot(lerp(ax, bx, t), lerp(ay, by, t), r, c, k);
        }
      }
    };
  }

  /* ---------- 特效定义：draw(cv, t, R, frame) 画第 t（0~1）时刻；粒子在 setup 里一次定好 ---------- */
  const W = [1, 1, 1];
  const EFFECTS = {
    /* 剑气：一道新月形的弧光从左上扫到右下，头部最亮最粗，尾巴变细消散，沿途甩出碎光 */
    swordQi: {
      label: '剑气 Sword qi', frames: 12, fps: 24,
      palette: { hd: ['#ffffff', '#bff4ff', '#4fd2ff', '#1a5cff'], pixel: ['#ffffff', '#aef0ff', '#3cc4f5', '#1f62d8', '#16307a'] },
      setup(R) {
        const sparks = Array.from({ length: 36 }, () => ({ at: R(), v: 0.08 + R() * 0.25, side: R() * 2 - 1, r: 0.004 + R() * 0.006, life: 0.25 + R() * 0.35 }));
        return { dir: 1, a0: -2.75 + (R() - 0.5) * 0.2, sweep: 2.5 + R() * 0.3, cx: 0.5, cy: 0.66 + (R() - 0.5) * 0.04, rad: 0.4 + R() * 0.03, sparks };
      },
      draw(cv, t, P, C) {
        const [core, light, mid, deep] = C;
        const head = easeOut(t / 0.4), fade = 1 - clamp((t - 0.4) / 0.6, 0, 1);
        const span = 0.75 * easeOut(t / 0.3);                   // 可见弧光占整段扫过角度的比例
        const ang = u => P.a0 + P.dir * P.sweep * u;
        const pt = (u, dr) => [P.cx + Math.cos(ang(u)) * (P.rad + dr), P.cy + Math.sin(ang(u)) * (P.rad + dr) * 0.8];
        const n = 90;
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1);                               // 0 尾 → 1 头
          const u = head - span * (1 - f);
          if (u < 0) continue;
          /* 新月：中段偏头部最厚，两端尖；越靠头越亮 */
          const prof = Math.pow(Math.sin(Math.PI * Math.pow(f, 0.7)), 0.8);
          const thick = (0.003 + 0.022 * prof) * (0.5 + 0.5 * fade) * Math.min(1, span / 0.4 + 0.2);
          const k = (0.25 + 0.75 * Math.pow(f, 1.2)) * fade;
          const [xo, yo] = pt(u, thick * 0.6), [x, y] = pt(u, -thick * 0.4), [xi, yi] = pt(u, -thick * 2);
          cv.dot(xi, yi, thick * 2.5, deep, 0.12 * k);
          cv.dot(x, y, thick * 1.1, mid, 0.45 * k);
          cv.dot(xo, yo, thick * 0.5, light, 0.9 * k);
          cv.dot(xo, yo, Math.max(thick * 0.22, 0.003), core, 1.3 * k);
        }
        /* 碎光：在弧光经过时诞生，向外飞，减速，变暗 */
        P.sparks.forEach(s => {
          const born = s.at * 0.45, age = (t - born) / s.life;
          if (age < 0 || age > 1 || s.at > head + 0.02) return;
          const u = s.at, dist = s.v * easeOut(age) * 0.5, tan = ang(u) + P.dir * Math.PI / 2;
          const [x0, y0] = pt(u, s.side * 0.02);
          const out = [Math.cos(ang(u)), Math.sin(ang(u)) * 0.75];
          const x = x0 + out[0] * dist + Math.cos(tan) * dist * 0.6, y = y0 + out[1] * dist + Math.sin(tan) * dist * 0.6;
          const k = (1 - age) * (1 - age);
          cv.dot(x, y, s.r * 1.8, mid, 0.35 * k);
          cv.dot(x, y, s.r * 0.7, core, 0.9 * k);
        });
      }
    },

    /* 法术：金色灵光螺旋汇聚到中心，聚成光球，然后炸开一圈光环和放射状光点 */
    spell: {
      label: '法术 Spell', frames: 16, fps: 20,
      palette: { hd: ['#fffaf0', '#ffe9a3', '#ffb43c', '#c2410c'], pixel: ['#fffbe8', '#ffe27a', '#f5a524', '#c25412', '#6b2108'] },
      setup(R) {
        const motes = Array.from({ length: 30 }, () => ({ a: R() * Math.PI * 2, r0: 0.3 + R() * 0.16, d: R() * 0.3, spin: 2.0 + R() * 1.4, s: 0.008 + R() * 0.007 }));
        const rays = Array.from({ length: 22 }, (_, i) => ({ a: (i + R() * 0.6) / 22 * Math.PI * 2, v: 0.28 + R() * 0.17, s: 0.005 + R() * 0.006 }));
        return { motes, rays, spin: R() < 0.5 ? 1 : -1 };
      },
      draw(cv, t, P, C) {
        const [core, light, mid, deep] = C;
        const gather = clamp(t / 0.55, 0, 1), burst = clamp((t - 0.55) / 0.45, 0, 1);
        /* 汇聚 */
        if (t < 0.6) P.motes.forEach(m => {
          const u = clamp((gather - m.d) / (1 - m.d), 0, 1);
          if (u <= 0) return;
          const r = m.r0 * (1 - easeIn(u)), a = m.a + P.spin * m.spin * u;
          const x = 0.5 + Math.cos(a) * r, y = 0.5 + Math.sin(a) * r;
          const k = Math.min(1, u * 4) * (t > 0.55 ? 1 - (t - 0.55) / 0.05 : 1);
          const a2 = a - P.spin * 0.25, x2 = 0.5 + Math.cos(a2) * r * 1.06, y2 = 0.5 + Math.sin(a2) * r * 1.06;
          cv.stroke(x2, y2, x, y, m.s * 0.4, m.s * 0.9, mid, 0.05 * k, 0.9 * k);
          cv.dot(x, y, m.s * 1.6, deep, 0.25 * k);
          cv.dot(x, y, m.s * 0.6, core, 1.6 * k);
        });
        /* 中心光球：随汇聚变大，炸开时最亮然后消失 */
        const orb = t < 0.55 ? 0.02 + 0.05 * easeIn(gather) : 0.07 * (1 - easeOut(burst * 1.6));
        const ok = t < 0.55 ? 0.5 + 1.2 * gather : 3 * Math.pow(1 - burst, 2);
        if (orb > 0.002) {
          cv.dot(0.5, 0.5, orb * 2.4, deep, 0.25 * ok);
          cv.dot(0.5, 0.5, orb * 1.3, mid, 0.6 * ok);
          cv.dot(0.5, 0.5, orb * 0.6, core, 1.4 * ok);
        }
        if (burst > 0) {
          /* 光环 */
          const rr = 0.05 + 0.38 * easeOut(burst), th = 0.016 * (1 - burst) + 0.005, k = 1.6 * Math.pow(1 - burst, 1.3);
          if (burst < 0.3) cv.dot(0.5, 0.5, 0.18 * (0.5 + burst), light, 0.5 * (1 - burst / 0.3));
          const n = Math.ceil(rr * 2 * Math.PI / (th * 0.5));
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2, x = 0.5 + Math.cos(a) * rr, y = 0.5 + Math.sin(a) * rr;
            cv.dot(x, y, th * 2, mid, 0.1 * k);
            cv.dot(x, y, th * 0.6, light, 0.35 * k);
            cv.dot(x, y, th * 0.25, core, 0.5 * k);
          }
          /* 放射光点 */
          P.rays.forEach(r => {
            const d = 0.04 + r.v * easeOut(burst), d0 = Math.max(0.02, d - 0.07 * (1 - burst));
            const kk = Math.pow(1 - burst, 1.2);
            cv.stroke(0.5 + Math.cos(r.a) * d0, 0.5 + Math.sin(r.a) * d0, 0.5 + Math.cos(r.a) * d, 0.5 + Math.sin(r.a) * d, r.s * 0.4, r.s, mid, 0.05 * kk, 1.0 * kk);
            cv.dot(0.5 + Math.cos(r.a) * d, 0.5 + Math.sin(r.a) * d, r.s * 0.6, core, 1.5 * kk);
          });
        }
      }
    },

    /* 击中：一瞬间的白色星芒闪光 + 冲击波圆环 + 橙色火星向外飞散 */
    hit: {
      label: '击中 Hit', frames: 8, fps: 24,
      palette: { hd: ['#ffffff', '#fff2b8', '#ff9b3d', '#d1300f'], pixel: ['#ffffff', '#ffe98a', '#ff9a2e', '#d6361a', '#6e1406'] },
      setup(R) {
        const ns = 4 + Math.floor(R() * 3), spikes = Array.from({ length: ns }, (_, i) => ({ a: (i / ns) * Math.PI * 2 + R() * 0.5, len: 0.22 + R() * 0.16 }));
        const sparks = Array.from({ length: 14 }, () => ({ a: R() * Math.PI * 2, v: 0.22 + R() * 0.22, s: 0.008 + R() * 0.008, life: 0.55 + R() * 0.45 }));
        return { spikes, sparks, rot: R() * Math.PI };
      },
      draw(cv, t, P, C) {
        const [core, light, mid, deep] = C;
        /* 闪光：前两帧最亮 */
        const fl = Math.pow(1 - clamp(t / 0.4, 0, 1), 2);
        if (fl > 0) {
          cv.dot(0.5, 0.5, 0.12 * (1 + t), mid, 0.6 * fl);
          cv.dot(0.5, 0.5, 0.06 * (1 + t), light, 1.5 * fl);
          cv.dot(0.5, 0.5, 0.03 * (1 + t), core, 3 * fl);
          P.spikes.forEach(s => {
            const a = s.a + P.rot, L = s.len * (0.6 + 0.6 * easeOut(t / 0.25));
            cv.stroke(0.5, 0.5, 0.5 + Math.cos(a) * L, 0.5 + Math.sin(a) * L, 0.02, 0.003, light, 2.2 * fl, 0.2 * fl);
            cv.stroke(0.5, 0.5, 0.5 + Math.cos(a) * L * 0.7, 0.5 + Math.sin(a) * L * 0.7, 0.008, 0.002, core, 2.5 * fl, 0.2 * fl);
          });
        }
        /* 冲击波 */
        const w = clamp(t / 0.7, 0, 1);
        if (w > 0 && w < 1) {
          const rr = 0.06 + 0.34 * easeOut(w), k = Math.pow(1 - w, 2), th = 0.012 * (1 - w) + 0.003;
          const n = Math.ceil(rr * 2 * Math.PI / (th * 0.5));
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2;
            cv.dot(0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr, th, light, 0.12 * k);
          }
        }
        /* 火星：带拖尾，减速，变红变暗 */
        P.sparks.forEach(s => {
          const age = t / s.life;
          if (age > 1) return;
          const d = 0.03 + s.v * easeOut(age), d0 = Math.max(0.02, d - 0.08 * (1 - age));
          const k = Math.pow(1 - age, 1.4), col = age < 0.4 ? light : mid;
          cv.stroke(0.5 + Math.cos(s.a) * d0, 0.5 + Math.sin(s.a) * d0 + 0.05 * age * age, 0.5 + Math.cos(s.a) * d, 0.5 + Math.sin(s.a) * d + 0.08 * age * age, s.s * 0.3, s.s * 0.8, mid, 0.2 * k, 1.4 * k);
          cv.dot(0.5 + Math.cos(s.a) * d, 0.5 + Math.sin(s.a) * d + 0.08 * age * age, s.s * 0.5, col === light ? core : light, 2.0 * k);
        });
      }
    }
  };

  /* ---------- 渲染 ---------- */

  /** 浮点能量 → RGBA8。hd：平滑色调映射；pixel：按亮度落到调色板，硬透明 */
  function develop(cv, style, palette) {
    const S = cv.size, out = new Uint8ClampedArray(S * S * 4), b = cv.buf;
    const pal = palette.map(hex);
    for (let i = 0, j = 0; i < S * S; i++, j += 4) {
      const r = 1 - Math.exp(-b[i * 3]), g = 1 - Math.exp(-b[i * 3 + 1]), bl = 1 - Math.exp(-b[i * 3 + 2]);
      const a = Math.max(r, g, bl);
      if (style === 'pixel') {
        if (a < 0.16) continue;
        /* 亮度分档：越亮越靠调色板前面（最亮是白） */
        const L = (r + g + bl) / 3 / Math.max(a, 1e-6) * 0.35 + a * 0.65;
        const steps = [0.86, 0.66, 0.46, 0.3];
        let k = steps.findIndex(s => L >= s);
        if (k < 0) k = pal.length - 1;
        k = Math.min(k, pal.length - 1);
        out[j] = pal[k][0] * 255; out[j + 1] = pal[k][1] * 255; out[j + 2] = pal[k][2] * 255; out[j + 3] = 255;
      } else {
        if (a < 1 / 255) continue;
        out[j] = r / a * 255; out[j + 1] = g / a * 255; out[j + 2] = bl / a * 255; out[j + 3] = a * 255;
      }
    }
    return out;
  }

  /**
   * 渲染一个特效的所有帧。
   * opt: { style: 'hd'|'pixel', size, frames, seed }
   * 返回 { name, size, frames: [Uint8ClampedArray RGBA], fps, style, seed }
   */
  function render(name, opt) {
    const fx = EFFECTS[name];
    if (!fx) throw new Error('unknown effect "' + name + '". Effects: ' + Object.keys(EFFECTS).join(', '));
    opt = opt || {};
    const style = opt.style === 'pixel' ? 'pixel' : 'hd';
    const size = opt.size || (style === 'pixel' ? 48 : 128);
    const n = opt.frames || fx.frames, seed = opt.seed == null ? 1 : opt.seed;
    const P = fx.setup(rng(seed));
    /* 颜色：调色板 hd 用 4 色（核心/亮/中/暗），pixel 用 5 色 */
    const C = fx.palette.hd.map(hex);
    const frames = [];
    for (let f = 0; f < n; f++) {
      const cv = Canvas(size);
      /* 每帧取帧内三个时刻叠加（运动模糊），帧数少的时候更顺 */
      const sub = 3;
      for (let k = 0; k < sub; k++) {
        const t = (f + (k + 0.5) / sub) / n;
        const tmp = Canvas(size);
        fx.draw(tmp, t, P, C);
        for (let i = 0; i < cv.buf.length; i++) cv.buf[i] += tmp.buf[i] / sub;
      }
      frames.push(develop(cv, style, style === 'pixel' ? fx.palette.pixel : fx.palette.hd));
    }
    return { name, size, frames, fps: fx.fps, style, seed };
  }

  /** 横排图集：frames → 一张 (size*n)×size 的 RGBA（cols 指定时按网格排） */
  function sheet(r, cols) {
    const n = r.frames.length, S = r.size, c = cols || n, rows = Math.ceil(n / c);
    const W2 = S * c, H2 = S * rows, out = new Uint8ClampedArray(W2 * H2 * 4);
    r.frames.forEach((fr, i) => {
      const ox = (i % c) * S, oy = Math.floor(i / c) * S;
      for (let y = 0; y < S; y++) out.set(fr.subarray(y * S * 4, (y + 1) * S * 4), ((oy + y) * W2 + ox) * 4);
    });
    return { width: W2, height: H2, cols: c, rows, data: out };
  }

  /** Godot 4 SpriteFrames（.tres）：每帧一个 AtlasTexture，指向图集里的区域 */
  function godotTres(r, sheetInfo, pngPath) {
    const n = r.frames.length, S = r.size;
    let s = '[gd_resource type="SpriteFrames" load_steps=' + (n + 2) + ' format=3]\n\n[ext_resource type="Texture2D" path="' + pngPath + '" id="1"]\n\n';
    for (let i = 0; i < n; i++) s += '[sub_resource type="AtlasTexture" id="f' + i + '"]\natlas = ExtResource("1")\nregion = Rect2(' + (i % sheetInfo.cols) * S + ', ' + Math.floor(i / sheetInfo.cols) * S + ', ' + S + ', ' + S + ')\n\n';
    s += '[resource]\nanimations = [{\n"frames": [' + Array.from({ length: n }, (_, i) => '{\n"duration": 1.0,\n"texture": SubResource("f' + i + '")\n}').join(', ') + '],\n"loop": false,\n"name": &"' + r.name + '",\n"speed": ' + r.fps.toFixed(1) + '\n}]\n';
    return s;
  }

  const API = { EFFECTS, LIST: Object.keys(EFFECTS), render, sheet, godotTres };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else window.SFX_VFX = API;
})();
