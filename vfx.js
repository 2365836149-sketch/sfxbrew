/* ============================================================================
   SFX Brew · 程序化 2D 特效（序列帧）：图层引擎
   ----------------------------------------------------------------------------
   一个特效 = 一段 JSON（patch）：整体参数 + 若干图层。每个图层是一种基础元素
   （flash 闪光、ring 光环、slash 弧光、bolt 闪电、burst 爆散粒子 …，见 LAYERS），
   带自己的参数和出场时间。预设（swordQi / spell / hit …）只是写好的 patch。

   画法：每一帧在一块浮点"光能"缓冲区里叠加柔光点（高斯点，相加混合），交叠处自然变亮发白；
   不发光的东西（烟、碎石、符纸）画在另一块"实体"缓冲区里（普通混合），最后光叠在实体上面。
   色调映射：显示亮度 = 1 - exp(-能量)，透明度 = 三个通道里最亮的那个 → 直通透明度 PNG。

   两种画风：hd 平滑发光（默认 128×128）；pixel 像素风（默认 48×48，按亮度落到 5 色调色板，硬边透明）。
   同一个 patch + 同一个 seed 永远出同样的帧。loop: true 时首尾帧无缝衔接（光环、火焰、护盾）。
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
  const frac = x => x - Math.floor(x);
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const EASE = {
    linear: t => t,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; }
  };

  /* ---------- 画布：坐标 0~1（相对边长），半径也是 ---------- */
  function Canvas(size) {
    const buf = new Float32Array(size * size * 3);   // 光：相加
    const mat = new Float32Array(size * size * 4);   // 实体：预乘颜色 + 透明度，普通混合
    return {
      size, buf, mat,
      /** 柔光点：中心 (x,y)，高斯 σ=r，颜色 c，强度 k */
      dot(x, y, r, c, k) {
        if (!(k > 1e-4)) return;
        const S = size, px = x * S, py = y * S, s = Math.max(0.35, r * S), R = Math.ceil(s * 3);
        const x0 = Math.max(0, Math.floor(px - R)), x1 = Math.min(S - 1, Math.ceil(px + R));
        const y0 = Math.max(0, Math.floor(py - R)), y1 = Math.min(S - 1, Math.ceil(py + R));
        if (x0 > x1 || y0 > y1) return;
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
      /** 一笔：从 a 到 b，半径和强度从 ra/ka 渐变到 rb/kb（线中心亮度 ≈ ka→kb） */
      stroke(ax, ay, bx, by, ra, rb, c, ka, kb) {
        const len = Math.hypot(bx - ax, by - ay), rmin = Math.max(Math.min(ra, rb), 0.5 / size);
        const n = Math.max(1, Math.ceil(len / (rmin * 0.5))), step = len / n;
        for (let i = 0; i <= n; i++) {
          const t = i / n, r = Math.max(lerp(ra, rb, t), 0.5 / size);
          const k = lerp(ka, kb, t) * (step > 0 ? Math.min(1, step / (r * 2.5066)) : 1);
          this.dot(lerp(ax, bx, t), lerp(ay, by, t), r, c, k);
        }
      },
      /** 实体软圆（烟）：普通混合，a 是中心不透明度 */
      puff(x, y, r, c, a) {
        if (!(a > 0.003)) return;
        const S = size, px = x * S, py = y * S, s = Math.max(0.5, r * S), R = Math.ceil(s * 2);
        const x0 = Math.max(0, Math.floor(px - R)), x1 = Math.min(S - 1, Math.ceil(px + R));
        const y0 = Math.max(0, Math.floor(py - R)), y1 = Math.min(S - 1, Math.ceil(py + R));
        const inv = 1 / (2 * s * s * 0.5);
        for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
          const dx = xx + 0.5 - px, dy = yy + 0.5 - py, e = a * Math.exp(-(dx * dx + dy * dy) * inv);
          if (e > 0.002) this._over(yy * S + xx, c, e);
        }
      },
      /** 实体多边形（碎石、冰晶、符纸）：pts = [[x,y],...]，边缘 1 像素抗锯齿 */
      poly(pts, c, a) {
        const S = size;
        let minx = 1, miny = 1, maxx = 0, maxy = 0;
        pts.forEach(p => { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
        const x0 = Math.max(0, Math.floor(minx * S) - 1), x1 = Math.min(S - 1, Math.ceil(maxx * S) + 1);
        const y0 = Math.max(0, Math.floor(miny * S) - 1), y1 = Math.min(S - 1, Math.ceil(maxy * S) + 1);
        const P = pts.map(p => [p[0] * S, p[1] * S]), n = P.length;
        for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
          /* 2×2 超采样算覆盖率 */
          let cov = 0;
          for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
            const qx = xx + 0.25 + sx * 0.5, qy = yy + 0.25 + sy * 0.5;
            let inside = false;
            for (let i = 0, j = n - 1; i < n; j = i++) {
              if ((P[i][1] > qy) !== (P[j][1] > qy) && qx < (P[j][0] - P[i][0]) * (qy - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside;
            }
            if (inside) cov += 0.25;
          }
          if (cov > 0) this._over(yy * S + xx, c, a * cov);
        }
      },
      _over(i, c, a) {
        const j = i * 4, k = 1 - a;
        mat[j] = c[0] * a + mat[j] * k; mat[j + 1] = c[1] * a + mat[j + 1] * k; mat[j + 2] = c[2] * a + mat[j + 2] * k; mat[j + 3] = a + mat[j + 3] * k;
      }
    };
  }

  /* ============================================================================
     基础元素。每个元素：
       doc     一句话说明（给 Agent 看）
       params  { 名字: [默认, 最小, 最大, 说明] } 或 { 名字: [默认, ['可选', ...], 说明] }
       setup(L, R)   用随机数预先定好粒子等，返回 state
       draw(cv, u, L, S, G)   画局部时间 u（0~1）；G = { x, y, rot, sc, col, k, ease, loop }
     ==========================================================================*/
  const COMMON = {
    start: [0, 0, 1, 'when the layer appears on the timeline (0-1); in loop mode it is the phase offset'],
    end: [1, 0, 1, 'when the layer finishes (0-1, must be > start)'],
    x: [0, -1, 1, 'centre, -1 left edge … 1 right edge'],
    y: [0, -1, 1, 'centre, -1 top … 1 bottom'],
    angle: [0, -360, 360, 'direction in degrees, 0 = right, 90 = down'],
    scale: [1, 0.1, 4, 'size multiplier'],
    color: ['auto', null, 'auto = palette gradient; or core / light / mid / dark; or "#rrggbb"'],
    intensity: [1, 0, 5, 'brightness (or opacity for smoke/debris)'],
    blend: ['add', ['add', 'normal'], 'add = glowing light; normal = solid matter (smoke, debris, paper)'],
    ease: ['out', ['linear', 'out', 'in', 'inOut', 'bounce'], 'motion curve'],
    jitter: [0.3, 0, 1, 'how much a new seed changes position, angle, size and timing']
  };

  /* 发光的一团：外圈暗色宽、内圈亮色窄（和原来手写特效同一套层次） */
  function glow(cv, x, y, r, k, G) {
    const c = G.col;
    /* 外圈光晕最多 0.14 个画面宽，太大的话整张图都会蒙一层雾 */
    cv.dot(x, y, Math.min(r * 2.2, 0.14), c[3], 0.14 * k);
    cv.dot(x, y, r, c[2], 0.5 * k);
    cv.dot(x, y, r * 0.45, c[1], 0.9 * k);
    cv.dot(x, y, Math.max(r * 0.2, 0.002), c[0], 1.3 * k);
  }
  function glowLine(cv, ax, ay, bx, by, ra, rb, ka, kb, G) {
    const c = G.col;
    cv.stroke(ax, ay, bx, by, ra * 2.2, rb * 2.2, c[3], 0.14 * ka, 0.14 * kb);
    cv.stroke(ax, ay, bx, by, ra, rb, c[2], 0.5 * ka, 0.5 * kb);
    cv.stroke(ax, ay, bx, by, ra * 0.45, rb * 0.45, c[1], 0.9 * ka, 0.9 * kb);
    cv.stroke(ax, ay, bx, by, Math.max(ra * 0.2, 0.002), Math.max(rb * 0.2, 0.002), c[0], 1.3 * ka, 1.3 * kb);
  }
  /** 局部坐标 → 画布：先缩放、旋转，再平移到图层中心 */
  const toCv = (G, lx, ly) => [G.x + (lx * G.cos - ly * G.sin) * G.sc, G.y + (lx * G.sin + ly * G.cos) * G.sc];
  /** 同上，但旋转之后再在画面竖直方向压扁（地面透视、扁弧） */
  const toCvSq = (G, lx, ly, sq) => [G.x + (lx * G.cos - ly * G.sin) * G.sc, G.y + (lx * G.sin + ly * G.cos) * G.sc * sq];
  /** 亮起-熄灭曲线：peak 时最亮 */
  const pulse = (u, peak, fall) => u < peak ? (peak > 0 ? u / peak : 1) : Math.pow(clamp(1 - (u - peak) / (1 - peak), 0, 1), fall);

  /* 粒子发射：burst = 一开始全部发出；stream = 在整个时长里陆续发出（loop 时自动首尾衔接） */
  function particleAge(p, u, L, loop) {
    if (loop) return frac(u - p.b) / p.life;
    if (L.emit === 'stream') return (u - p.b * (1 - p.life)) / p.life;
    return (u - p.b * 0.08) / p.life;
  }

  const LAYERS = {
    flash: {
      doc: 'A soft ball of light that flares up and fades (impact core, muzzle flash, spell release).',
      params: { radius: [0.12, 0.01, 0.6, 'radius'], peak: [0.15, 0, 1, 'moment of full brightness (0-1 of the layer)'], falloff: [1.6, 0.3, 5, 'how fast it fades after the peak'], grow: [0.4, 0, 3, 'how much it expands while fading'] },
      draw(cv, u, L, S, G) {
        const k = pulse(u, L.peak, L.falloff) * G.k, r = L.radius * G.sc * (1 + L.grow * G.e(u));
        glow(cv, G.x, G.y, r * 0.5, k * 1.6, G);
        cv.dot(G.x, G.y, r * 0.25, G.col[0], 1.2 * k);
        cv.dot(G.x, G.y, Math.min(r, 0.14), G.col[2], 0.2 * k);
      }
    },
    ring: {
      doc: 'An expanding ring / shockwave. squash < 1 flattens it into a ground ring.',
      params: { radiusFrom: [0.05, 0, 0.8, 'start radius'], radiusTo: [0.4, 0, 1, 'end radius'], thickness: [0.012, 0.002, 0.08, 'line thickness'], squash: [1, 0.1, 1, 'vertical squash (0.35 = ground perspective)'], fade: [1.3, 0.2, 5, 'how fast it fades'], count: [1, 1, 4, 'number of rings following each other'] },
      draw(cv, u, L, S, G) {
        for (let j = 0; j < L.count; j++) {
          const v = clamp((u - j * 0.12) / (1 - (L.count - 1) * 0.12), 0, 1);
          if (v <= 0 || v >= 1) continue;
          const e = G.e(v), rr = lerp(L.radiusFrom, L.radiusTo, e), k = Math.pow(1 - v, L.fade) * G.k * (j ? 0.6 : 1);
          const th = L.thickness * (1.4 - 0.9 * v) * G.sc;
          const n = Math.max(12, Math.ceil(rr * G.sc * TAU / (th * 0.5)));
          for (let i = 0; i < n; i++) {
            const a = i / n * TAU, [x, y] = toCvSq(G, Math.cos(a) * rr, Math.sin(a) * rr, L.squash);
            cv.dot(x, y, th * 2, G.col[2], 0.1 * k);
            cv.dot(x, y, th * 0.6, G.col[1], 0.35 * k);
            cv.dot(x, y, th * 0.25, G.col[0], 0.5 * k);
          }
        }
      }
    },
    glint: {
      doc: 'A star-shaped twinkle: 4, 6 or 8 sharp spikes from the centre (hit spark, shine on loot).',
      params: { points: [4, 2, 12, 'number of spikes'], length: [0.3, 0.02, 0.8, 'spike length'], width: [0.02, 0.003, 0.08, 'spike width at the base'], peak: [0.1, 0, 0.9, 'moment of full brightness'], spin: [0, -360, 360, 'degrees it turns over its life'], uneven: [0.4, 0, 1, 'random spike length variation'] },
      setup(L, R) { return { lens: Array.from({ length: L.points }, (_, i) => 1 - L.uneven * R() * (i % 2 ? 1 : 0.5)), off: R() * TAU }; },
      draw(cv, u, L, S, G) {
        const k = pulse(u, L.peak, 2) * G.k, grow = 0.6 + 0.6 * G.e(clamp(u / 0.3, 0, 1));
        for (let i = 0; i < L.points; i++) {
          const a = S.off + i / L.points * TAU + L.spin * DEG * u, Ln = L.length * S.lens[i] * grow;
          const [bx, by] = toCv(G, Math.cos(a) * Ln, Math.sin(a) * Ln);
          cv.stroke(G.x, G.y, bx, by, L.width * G.sc, 0.003, G.col[1], 2.2 * k, 0.15 * k);
          const [cx, cy] = toCv(G, Math.cos(a) * Ln * 0.7, Math.sin(a) * Ln * 0.7);
          cv.stroke(G.x, G.y, cx, cy, L.width * 0.4 * G.sc, 0.002, G.col[0], 2.5 * k, 0.2 * k);
        }
        glow(cv, G.x, G.y, 0.05 * G.sc, k * 1.5, G);
      }
    },
    beam: {
      doc: 'A straight beam / laser through the layer centre along angle. It shoots out, holds, then thins away.',
      params: { length: [0.9, 0.05, 1.4, 'beam length (fraction of frame width)'], width: [0.04, 0.005, 0.2, 'beam width'], grow: [0.25, 0, 0.9, 'part of the life it takes to shoot out'], flicker: [0.3, 0, 1, 'width flicker'], from: ['center', ['center', 'start'], 'center = beam is centred on (x,y); start = beam starts at (x,y)'] },
      setup(L, R) { return { ph: R() * 100 }; },
      draw(cv, u, L, S, G) {
        const g = L.grow > 0 ? G.e(clamp(u / L.grow, 0, 1)) : 1, fade = clamp((1 - u) / Math.max(0.01, 1 - L.grow), 0, 1);
        const w = L.width * G.sc * (0.3 + 0.7 * fade) * (1 + L.flicker * 0.5 * Math.sin(S.ph + u * 61));
        const a0 = L.from === 'start' ? 0 : -L.length / 2, a1 = a0 + L.length * g;
        const [ax, ay] = toCv(G, a0, 0), [bx, by] = toCv(G, a1, 0);
        glowLine(cv, ax, ay, bx, by, w * 0.6, w * 0.6, G.k * fade, G.k * fade, G);
        glow(cv, ax, ay, w, G.k * fade, G);
      }
    },
    slash: {
      doc: 'A crescent sword slash that sweeps along an arc: thick bright head, thin fading tail. angle = middle of the arc.',
      params: { radius: [0.4, 0.05, 0.8, 'arc radius'], sweep: [145, 20, 340, 'degrees the slash travels'], width: [0.025, 0.004, 0.08, 'blade thickness'], direction: [1, [1, -1], '1 = clockwise, -1 = counter-clockwise'], trail: [0.75, 0.1, 1, 'visible length of the arc'], squash: [0.8, 0.2, 1, 'vertical squash of the arc'], sparks: [36, 0, 120, 'sparks thrown off the blade'] },
      setup(L, R) { return { sp: Array.from({ length: L.sparks }, () => ({ at: R(), v: 0.08 + R() * 0.25, side: R() * 2 - 1, r: 0.004 + R() * 0.006, life: 0.25 + R() * 0.35 })) }; },
      draw(cv, u, L, S, G) {
        const sw = L.sweep * DEG, a0 = -sw / 2 * L.direction;
        const head = G.e(clamp(u / 0.4, 0, 1)), fade = 1 - clamp((u - 0.4) / 0.6, 0, 1), span = L.trail * G.e(clamp(u / 0.3, 0, 1));
        const ang = v => a0 + L.direction * sw * v;
        const pt = (v, dr) => toCvSq(G, Math.cos(ang(v)) * (L.radius + dr), Math.sin(ang(v)) * (L.radius + dr), L.squash);
        const c = G.col, n = 90, W = L.width / 0.025;
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1), v = head - span * (1 - f);
          if (v < 0) continue;
          const prof = Math.pow(Math.sin(Math.PI * Math.pow(f, 0.7)), 0.8);
          const th = (0.003 + 0.022 * prof) * W * (0.5 + 0.5 * fade) * Math.min(1, span / 0.4 + 0.2) * G.sc;
          const k = (0.25 + 0.75 * Math.pow(f, 1.2)) * fade * G.k;
          const [xo, yo] = pt(v, th * 0.6 / G.sc), [x, y] = pt(v, -th * 0.4 / G.sc), [xi, yi] = pt(v, -th * 2 / G.sc);
          cv.dot(xi, yi, th * 2.5, c[3], 0.12 * k);
          cv.dot(x, y, th * 1.1, c[2], 0.45 * k);
          cv.dot(xo, yo, th * 0.5, c[1], 0.9 * k);
          cv.dot(xo, yo, Math.max(th * 0.22, 0.003), c[0], 1.3 * k);
        }
        S.sp.forEach(s => {
          const born = s.at * 0.45, age = (u - born) / s.life;
          if (age < 0 || age > 1 || s.at > head + 0.02) return;
          const dist = s.v * EASE.out(age) * 0.5, out = ang(s.at), tan = out + L.direction * Math.PI / 2;
          const lx = Math.cos(out) * (L.radius + s.side * 0.02) + Math.cos(out) * dist + Math.cos(tan) * dist * 0.6;
          const ly = Math.sin(out) * (L.radius + s.side * 0.02) + Math.sin(out) * dist + Math.sin(tan) * dist * 0.6;
          const [x, y] = toCvSq(G, lx, ly, L.squash), k = (1 - age) * (1 - age) * G.k;
          cv.dot(x, y, s.r * 1.8 * G.sc, c[2], 0.35 * k);
          cv.dot(x, y, s.r * 0.7 * G.sc, c[0], 0.9 * k);
        });
      }
    },
    bolt: {
      doc: 'A jagged lightning bolt from (x,y) towards angle for length, with branches. It re-strikes a few times while flickering.',
      params: { length: [0.8, 0.05, 1.4, 'bolt length (fraction of frame width)'], width: [0.012, 0.003, 0.05, 'core width'], segments: [12, 3, 40, 'number of zigzag segments'], jagged: [0.35, 0, 1, 'how zigzag it is'], branches: [3, 0, 10, 'side branches'], strikes: [3, 1, 8, 'how many times the shape changes (flicker)'], fade: [1.5, 0.3, 5, 'fade speed'] },
      setup(L, R) {
        const make = () => {
          const pts = [[0, 0]], seg = L.length / L.segments;
          for (let i = 1; i <= L.segments; i++) pts.push([i * seg, i === L.segments ? (R() - 0.5) * seg * L.jagged : (R() - 0.5) * 2 * seg * L.jagged * 1.6]);
          for (let i = 1; i < pts.length - 1; i++) pts[i][1] += pts[i - 1][1] * 0.35;
          const br = Array.from({ length: L.branches }, () => {
            const at = 2 + Math.floor(R() * Math.max(1, L.segments - 4)), dir = R() < 0.5 ? -1 : 1, n = 2 + Math.floor(R() * 4);
            const b = [pts[Math.min(at, pts.length - 1)].slice()];
            for (let j = 0; j < n; j++) { const p = b[b.length - 1]; b.push([p[0] + seg * (0.6 + R() * 0.5), p[1] + dir * seg * (0.4 + R() * 0.8)]); }
            return b;
          });
          return { pts, br };
        };
        return { shapes: Array.from({ length: L.strikes }, make) };
      },
      draw(cv, u, L, S, G) {
        const sh = S.shapes[Math.min(L.strikes - 1, Math.floor(u * L.strikes))];
        const k = G.k * Math.pow(1 - u, L.fade * 0.5) * (0.75 + 0.25 * Math.cos(u * L.strikes * TAU));
        const grow = G.e(clamp(u / 0.12, 0, 1));
        const draw = (pts, w, kk) => {
          const n = Math.max(1, Math.ceil((pts.length - 1) * grow));
          for (let i = 0; i < n; i++) {
            const [ax, ay] = toCv(G, pts[i][0], pts[i][1]), [bx, by] = toCv(G, pts[i + 1][0], pts[i + 1][1]);
            glowLine(cv, ax, ay, bx, by, w, w, kk, kk, G);
          }
        };
        draw(sh.pts, L.width * G.sc, k);
        sh.br.forEach(b => draw(b, L.width * 0.55 * G.sc, k * 0.6));
        const [ex, ey] = toCv(G, sh.pts[sh.pts.length - 1][0], sh.pts[sh.pts.length - 1][1]);
        if (grow >= 1) glow(cv, ex, ey, 0.04 * G.sc, k, G);
      }
    },
    trail: {
      doc: 'A glowing streak travelling along a path (flying sword, magic missile, comet). The head is bright, the tail fades.',
      params: { path: ['line', ['line', 'arc', 'spiral', 'wave'], 'path shape'], distance: [0.8, 0.05, 1.4, 'length of the whole path (fraction of frame width)'], curve: [0.3, -1, 1, 'bend for arc, amplitude for wave'], turns: [1.5, 0.25, 6, 'turns for spiral, waves for wave'], length: [0.35, 0.05, 1, 'visible part of the path'], width: [0.03, 0.005, 0.12, 'head width'] },
      draw(cv, u, L, S, G) {
        const P = v => {
          if (L.path === 'spiral') { const r = 0.45 * (1 - v) * L.distance / 0.8, a = v * L.turns * TAU; return [Math.cos(a) * r, Math.sin(a) * r]; }
          const lx = (v - 0.5) * L.distance;
          if (L.path === 'arc') return [lx, -L.curve * L.distance * 0.5 * Math.sin(Math.PI * v)];
          if (L.path === 'wave') return [lx, L.curve * 0.15 * Math.sin(v * L.turns * TAU)];
          return [lx, 0];
        };
        const head = G.e(u) * (1 + L.length), fade = Math.pow(1 - clamp((u - 0.85) / 0.15, 0, 1), 1);
        const n = 50;
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1), v = head - L.length * (1 - f);
          if (v < 0 || v > 1) continue;
          const [x, y] = toCv(G, ...P(v)), w = L.width * G.sc * (0.15 + 0.85 * f);
          glow(cv, x, y, w * 0.5, G.k * fade * (0.15 + 0.85 * f * f) * 0.5, G);
        }
      }
    },
    burst: {
      doc: 'Round glowing particles thrown out from the centre (explosion, pickup, magic dust).',
      params: { count: [24, 1, 300, 'number of particles'], speed: [0.35, 0, 1.5, 'how far they fly'], spread: [360, 0, 360, 'cone width in degrees around angle'], gravity: [0, -1, 2, 'pull downwards (negative floats up)'], size: [0.012, 0.002, 0.08, 'particle size'], sizeEnd: [0.4, 0, 3, 'size at the end of life, relative'], life: [0.7, 0.1, 1, 'particle lifetime (part of the layer)'], emit: ['burst', ['burst', 'stream'], 'burst = all at once; stream = continuously'], streak: [0, 0, 1, 'motion stretch'] },
      setup(L, R) { return { p: Array.from({ length: L.count }, (_, i) => ({ a: (R() - 0.5) * L.spread * DEG, v: 0.35 + R() * 0.65, s: 0.6 + R() * 0.8, life: L.life * (0.6 + R() * 0.4), b: L.emit === 'stream' ? (i + R()) / L.count : R() })) }; },
      draw(cv, u, L, S, G) {
        S.p.forEach(p => {
          const age = particleAge(p, u, L, G.loop);
          if (age < 0 || age > 1) return;
          const d = L.speed * p.v * G.e(age), g = L.gravity * 0.35 * age * age;
          const [x, y] = toCv(G, Math.cos(p.a) * d, Math.sin(p.a) * d);
          const k = Math.pow(1 - age, 1.3) * G.k, r = L.size * p.s * G.sc * lerp(1, L.sizeEnd, age);
          if (L.streak > 0) {
            const d0 = Math.max(0, d - L.streak * 0.15 * (1 - age)), [x0, y0] = toCv(G, Math.cos(p.a) * d0, Math.sin(p.a) * d0);
            cv.stroke(x0, y0 + g * 0.7, x, y + g, r * 0.3, r * 0.8, G.col[2], 0.1 * k, 0.8 * k);
          }
          glow(cv, x, y + g, r, k, G);
        });
      }
    },
    sparks: {
      doc: 'Thin fiery streaks with motion trails that slow down and fall (hit sparks, grinding metal).',
      params: { count: [14, 1, 200, 'number of sparks'], speed: [0.35, 0.02, 1.5, 'how far they fly'], spread: [360, 0, 360, 'cone width in degrees around angle'], length: [0.08, 0.01, 0.3, 'trail length'], gravity: [0.25, -1, 2, 'pull downwards'], size: [0.008, 0.002, 0.04, 'spark thickness'], life: [0.75, 0.1, 1, 'lifetime'], emit: ['burst', ['burst', 'stream'], 'burst or stream'] },
      setup(L, R) { return { p: Array.from({ length: L.count }, (_, i) => ({ a: (R() - 0.5) * L.spread * DEG, v: 0.6 + R() * 0.6, s: 0.7 + R() * 0.6, life: L.life * (0.6 + R() * 0.4), b: L.emit === 'stream' ? (i + R()) / L.count : R() })) }; },
      draw(cv, u, L, S, G) {
        const c = G.col;
        S.p.forEach(p => {
          const age = particleAge(p, u, L, G.loop);
          if (age < 0 || age > 1) return;
          const d = 0.03 + L.speed * p.v * G.e(age), d0 = Math.max(0.02, d - L.length * (1 - age)), g = L.gravity * 0.32 * age * age;
          const [x0, y0] = toCv(G, Math.cos(p.a) * d0, Math.sin(p.a) * d0), [x, y] = toCv(G, Math.cos(p.a) * d, Math.sin(p.a) * d);
          const k = Math.pow(1 - age, 1.4) * G.k, s = L.size * p.s * G.sc;
          cv.stroke(x0, y0 + g * 0.6, x, y + g, s * 0.3, s * 0.8, c[2], 0.2 * k, 1.4 * k);
          cv.dot(x, y + g, s * 0.5, age < 0.4 ? c[0] : c[1], 2.0 * k);
        });
      }
    },
    swirl: {
      doc: 'Particles circling around the centre while moving in (gathering qi, charging) or out (release, healing aura).',
      params: { count: [30, 1, 200, 'number of motes'], radiusFrom: [0.38, 0, 1, 'start radius'], radiusTo: [0, 0, 1, 'end radius'], turns: [0.4, -3, 3, 'turns each mote makes (negative = other way)'], rise: [0, -1, 1, 'vertical drift (negative = up)'], size: [0.011, 0.002, 0.05, 'mote size'], tail: [0.25, 0, 1, 'tail length'], stagger: [0.3, 0, 0.9, 'how spread out the start times are'] },
      setup(L, R) { return { p: Array.from({ length: L.count }, (_, i) => ({ a: R() * TAU, r: 0.75 + R() * 0.5, d: R() * L.stagger, s: 0.7 + R() * 0.6, b: (i + R()) / L.count })) }; },
      draw(cv, u, L, S, G) {
        const c = G.col;
        S.p.forEach(p => {
          const v = G.loop ? frac(u - p.b) : clamp((u - p.d) / (1 - p.d), 0, 1);
          if (v <= 0) return;
          const at = w => { const e = G.e(w), r = lerp(L.radiusFrom, L.radiusTo, e) * p.r, a = p.a + L.turns * TAU * e; return toCv(G, Math.cos(a) * r, Math.sin(a) * r + L.rise * 0.4 * w); };
          const k = Math.min(1, v * 5) * Math.min(1, (1 - v) * 6) * G.k, [x, y] = at(v), s = L.size * p.s * G.sc;
          if (L.tail > 0) { const [x2, y2] = at(Math.max(0, v - L.tail * 0.25)); cv.stroke(x2, y2, x, y, s * 0.35, s * 0.8, c[2], 0.05 * k, 0.9 * k); }
          cv.dot(x, y, s * 1.5, c[3], 0.25 * k);
          cv.dot(x, y, s * 0.55, c[0], 1.6 * k);
        });
      }
    },
    smoke: {
      doc: 'Soft puffs of smoke or dust that drift, grow and fade. Solid (normal blend) by default; set blend add for glowing mist.',
      params: { count: [8, 1, 60, 'number of puffs'], size: [0.07, 0.01, 0.3, 'puff size'], expand: [2.2, 1, 6, 'growth over life'], rise: [0.15, -0.5, 0.8, 'upward drift'], spread: [0.25, 0, 1, 'how far puffs start from the centre'], opacity: [0.55, 0.05, 1, 'opacity'], tint: ['#8a8580', null, 'smoke colour (normal blend), e.g. "#8a8580" grey, "#3a3a3a" dark, "#d8c9a8" dust'], emit: ['burst', ['burst', 'stream'], 'burst or stream'] },
      setup(L, R) { return { p: Array.from({ length: L.count }, (_, i) => ({ a: R() * TAU, d: R(), s: 0.6 + R() * 0.8, life: 0.55 + R() * 0.45, b: L.emit === 'stream' ? (i + R()) / L.count : R(), sh: 0.75 + R() * 0.5 })) }; },
      draw(cv, u, L, S, G) {
        const tint = hex(L.tint);
        S.p.forEach(p => {
          const age = particleAge(p, u, L, G.loop);
          if (age < 0 || age > 1) return;
          const e = G.e(age), d = L.spread * p.d * (0.4 + 0.6 * e);
          const [x, y] = toCv(G, Math.cos(p.a) * d, Math.sin(p.a) * d * 0.6);
          const r = L.size * p.s * G.sc * lerp(0.5, L.expand, e), a = L.opacity * Math.min(1, age * 6) * Math.pow(1 - age, 1.5) * G.k;
          if (G.blend === 'add') glow(cv, x, y - L.rise * e * 0.5, r * 0.6, a * 0.6, G);
          else cv.puff(x, y - L.rise * e * 0.5, r, mix(tint, [1, 1, 1], 0.12 * (1 - age)), a);
        });
      }
    },
    debris: {
      doc: 'Solid chunks that fly out, spin and fall: rocks, ice shards or paper scraps (normal blend).',
      params: { count: [10, 1, 80, 'number of pieces'], speed: [0.4, 0.02, 1.5, 'how far they fly'], spread: [300, 0, 360, 'cone width in degrees around angle (angle -90 = mostly upwards)'], gravity: [1, -1, 3, 'pull downwards'], size: [0.022, 0.004, 0.1, 'piece size'], shape: ['rock', ['rock', 'shard', 'paper'], 'piece shape'], spin: [2, 0, 8, 'turns per life'], tint: ['#5a4d40', null, 'piece colour, e.g. "#5a4d40" rock, "#bfe9ff" ice, "#e9d9a6" paper'], life: [0.9, 0.2, 1, 'lifetime'] },
      setup(L, R) {
        return { p: Array.from({ length: L.count }, () => {
          const n = L.shape === 'paper' ? 4 : L.shape === 'shard' ? 3 : 5 + Math.floor(R() * 3);
          const pts = Array.from({ length: n }, (_, i) => { const a = i / n * TAU + (L.shape === 'paper' ? Math.PI / 4 : R() * 0.6); const r = L.shape === 'shard' ? (i === 0 ? 1.8 : 0.6) : L.shape === 'paper' ? 1 : 0.7 + R() * 0.5; return [Math.cos(a) * r, Math.sin(a) * r * (L.shape === 'paper' ? 1.4 : 1)]; });
          return { a: (R() - 0.5) * L.spread * DEG, v: 0.4 + R() * 0.6, s: 0.6 + R() * 0.8, rot: R() * TAU, sp: (R() - 0.5) * 2 * L.spin, pts, life: L.life * (0.7 + R() * 0.3), sh: 0.75 + R() * 0.4 };
        }) };
      },
      draw(cv, u, L, S, G) {
        const tint = hex(L.tint);
        S.p.forEach(p => {
          const age = u / p.life;
          if (age < 0 || age > 1) return;
          const d = L.speed * p.v * EASE.out(age), g = L.gravity * 0.5 * age * age;
          const [cx, cy] = toCv(G, Math.cos(p.a) * d, Math.sin(p.a) * d);
          const r = L.size * p.s * G.sc, rot = p.rot + p.sp * TAU * age, cs = Math.cos(rot), sn = Math.sin(rot);
          const pts = p.pts.map(([px, py]) => [cx + (px * cs - py * sn) * r, cy + g + (px * sn + py * cs) * r]);
          const shade = mix(tint, [0, 0, 0], 0.35 * (1 - (0.5 + 0.5 * Math.sin(rot * 2))));
          cv.poly(pts, mix(shade, tint, p.sh - 0.75), Math.min(1, (1 - age) * 4) * G.k);
        });
      }
    },
    sigil: {
      doc: 'A magic circle: concentric rings, a polygon or star, tick marks; it draws itself on, turns and fades. squash < 1 lays it on the ground.',
      params: { radius: [0.36, 0.05, 0.8, 'outer radius'], rings: [2, 0, 4, 'concentric rings'], polygon: [6, 0, 12, 'polygon corners (0 = none)'], star: [true, null, 'draw the polygon as a star'], ticks: [24, 0, 72, 'tick marks / runes on the outer band'], rotate: [40, -720, 720, 'degrees it turns over its life'], drawOn: [0.35, 0, 0.9, 'part of the life spent drawing itself'], squash: [1, 0.2, 1, 'vertical squash (0.45 = on the ground)'], width: [0.006, 0.002, 0.03, 'line width'] },
      draw(cv, u, L, S, G) {
        const on = G.loop || L.drawOn <= 0 ? 1 : G.e(clamp(u / L.drawOn, 0, 1)), k = G.k * (G.loop ? 1 : Math.min(1, (1 - u) / 0.25)) * (0.7 + 0.3 * on);
        const rot = L.rotate * DEG * u, w = L.width * G.sc, R0 = L.radius;
        const P = (r, a) => toCvSq(G, Math.cos(a + rot) * r, Math.sin(a + rot) * r, L.squash);
        const arc = (r, frac0, kk) => {
          const n = Math.max(8, Math.ceil(r * G.sc * TAU * frac0 / (w * 1.2)));
          for (let i = 0; i <= n; i++) { const [x, y] = P(r, i / n * TAU * frac0); cv.dot(x, y, w * 2.2, G.col[3], 0.08 * kk); cv.dot(x, y, w, G.col[1], 0.3 * kk); cv.dot(x, y, w * 0.4, G.col[0], 0.35 * kk); }
        };
        for (let i = 0; i < L.rings; i++) arc(R0 * (1 - i * 0.14), on, k * (i ? 0.8 : 1));
        if (L.polygon >= 3) {
          const n = L.polygon, step = L.star && n >= 5 ? Math.floor((n - 1) / 2) : 1, rp = R0 * (1 - Math.max(0, L.rings - 1) * 0.14) * 0.98;
          for (let i = 0; i < n; i++) {
            const f = clamp(on * n - i, 0, 1); if (f <= 0) continue;
            const a = i / n * TAU - Math.PI / 2, b = (i + step) / n * TAU - Math.PI / 2;
            const [ax, ay] = P(rp, a), [bx0, by0] = P(rp, b), bx = lerp(ax, bx0, f), by = lerp(ay, by0, f);
            cv.stroke(ax, ay, bx, by, w * 2.2, w * 2.2, G.col[3], 0.08 * k, 0.08 * k);
            cv.stroke(ax, ay, bx, by, w, w, G.col[1], 0.3 * k, 0.3 * k);
            cv.stroke(ax, ay, bx, by, w * 0.4, w * 0.4, G.col[0], 0.35 * k, 0.35 * k);
          }
        }
        for (let i = 0; i < L.ticks * on; i++) {
          const a = i / L.ticks * TAU, r1 = R0 * 0.93, r2 = R0 * (i % 3 ? 0.88 : 0.84);
          const [ax, ay] = P(r1, a), [bx, by] = P(r2, a);
          cv.stroke(ax, ay, bx, by, w * 0.8, w * 0.8, G.col[1], 0.35 * k, 0.35 * k);
        }
      }
    },
    shape: {
      doc: 'A basic shape that pops in, pulses and fades: circle, diamond, polygon, rectangle (talisman paper) or cross. fill draws it solid (normal blend) with a glowing outline.',
      params: { shape: ['circle', ['circle', 'diamond', 'polygon', 'rect', 'cross'], 'shape'], sides: [6, 3, 12, 'sides for polygon'], width: [0.2, 0.02, 1, 'width'], height: [0.2, 0.02, 1, 'height'], fill: [false, null, 'solid fill (paper, shield)'], tint: ['#e9d9a6', null, 'fill colour, e.g. "#e9d9a6" talisman paper'], outline: [0.008, 0, 0.04, 'glowing outline width (0 = none)'], pulse: [0.15, 0, 1, 'size pulse'], spin: [0, -720, 720, 'degrees it turns over its life'], popIn: [0.15, 0, 0.9, 'part of the life spent appearing'] },
      draw(cv, u, L, S, G) {
        const app = G.loop || L.popIn <= 0 ? 1 : EASE.out(clamp(u / L.popIn, 0, 1)), fade = G.loop ? 1 : Math.min(1, (1 - u) / 0.25);
        const s = app * (1 + L.pulse * Math.sin(u * TAU * 2) * 0.5), rot = L.spin * DEG * u, hw = L.width / 2 * s, hh = L.height / 2 * s;
        const R2 = (lx, ly) => toCv(G, lx * Math.cos(rot) - ly * Math.sin(rot), lx * Math.sin(rot) + ly * Math.cos(rot));
        let pts;
        if (L.shape === 'rect') pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
        else if (L.shape === 'diamond') pts = [[0, -hh], [hw, 0], [0, hh], [-hw, 0]];
        else if (L.shape === 'cross') { const t = hw * 0.32, q = hh * 0.32; pts = [[-t, -hh], [t, -hh], [t, -q], [hw, -q], [hw, q], [t, q], [t, hh], [-t, hh], [-t, q], [-hw, q], [-hw, -q], [-t, -q]]; }
        else { const n = L.shape === 'circle' ? 40 : L.sides; pts = Array.from({ length: n }, (_, i) => { const a = i / n * TAU - Math.PI / 2; return [Math.cos(a) * hw, Math.sin(a) * hh]; }); }
        const cp = pts.map(p => R2(p[0], p[1]));
        if (L.fill) cv.poly(cp, hex(L.tint), fade * Math.min(1, G.k));
        if (L.outline > 0) for (let i = 0; i < cp.length; i++) { const a = cp[i], b = cp[(i + 1) % cp.length]; glowLine(cv, a[0], a[1], b[0], b[1], L.outline * G.sc, L.outline * G.sc, 0.6 * G.k * fade, 0.6 * G.k * fade, G); }
        if (!L.fill && !L.outline) cp.forEach(p => glow(cv, p[0], p[1], 0.01 * G.sc, G.k * fade, G));
      }
    }
  };

  /* ---------- 整体参数 ---------- */
  const PATCH_PARAMS = {
    frames: [12, 2, 120, 'number of frames'],
    fps: [24, 1, 60, 'frames per second'],
    loop: [false, null, 'true = seamless loop (aura, fire, shield); particles stream continuously and the last frame joins the first'],
    palette: [null, null, 'palette name (fire, ice, thunder, dark, holy, poison, blood, jade) or 4 colours [core, light, mid, dark]'],
    sound: [null, null, 'name of a sound preset to pair with (optional)']
  };

  /* ---------- 校验：把 patch 补全成完整参数；错了就给出 Agent 能直接照着改的报错 ---------- */
  function checkParam(where, key, spec, v) {
    const [def, a, b] = spec;
    if (v === undefined || v === null) return def;
    if (typeof def === 'number') {
      if (typeof v !== 'number' || !isFinite(v)) throw new Error(where + '.' + key + ' must be a number between ' + a + ' and ' + b + ' (got ' + JSON.stringify(v) + ')');
      if (v < a || v > b) throw new Error(where + '.' + key + ' = ' + v + ' is out of range ' + a + ' … ' + b);
      return v;
    }
    if (typeof def === 'boolean') { if (typeof v !== 'boolean') throw new Error(where + '.' + key + ' must be true or false'); return v; }
    if (Array.isArray(a)) { if (!a.includes(v)) throw new Error(where + '.' + key + ' must be one of ' + a.map(x => JSON.stringify(x)).join(', ') + ' (got ' + JSON.stringify(v) + ')'); return v; }
    if (typeof v !== 'string') throw new Error(where + '.' + key + ' must be a string');
    if (key === 'tint' && !/^#[0-9a-fA-F]{6}$/.test(v)) throw new Error(where + '.tint must be a colour like "#8a8580"');
    if (key === 'color' && !(v === 'auto' || ['core', 'light', 'mid', 'dark'].includes(v) || /^#[0-9a-fA-F]{6}$/.test(v))) throw new Error(where + '.color must be "auto", core, light, mid, dark or "#rrggbb"');
    return v;
  }
  function normalize(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('patch must be an object like { "frames": 12, "fps": 24, "layers": [ { "type": "flash" } ] }');
    const out = {};
    Object.keys(patch).forEach(k => { if (!(k in PATCH_PARAMS) && k !== 'layers' && k !== 'name' && k !== 'label') throw new Error('unknown patch field "' + k + '". Fields: ' + Object.keys(PATCH_PARAMS).concat(['layers']).join(', ')); });
    for (const k in PATCH_PARAMS) out[k] = k === 'palette' || k === 'sound' ? (patch[k] == null ? null : patch[k]) : checkParam('patch', k, PATCH_PARAMS[k], patch[k]);
    if (!Array.isArray(patch.layers) || !patch.layers.length) throw new Error('patch.layers must be a non-empty array. Layer types: ' + Object.keys(LAYERS).join(', '));
    if (patch.layers.length > 24) throw new Error('at most 24 layers');
    out.layers = patch.layers.map((L, i) => {
      const where = 'layers[' + i + ']';
      if (!L || typeof L !== 'object') throw new Error(where + ' must be an object with a "type"');
      const def = LAYERS[L.type];
      if (!def) throw new Error(where + '.type "' + L.type + '" is unknown. Layer types: ' + Object.keys(LAYERS).join(', '));
      const n = { type: L.type };
      Object.keys(L).forEach(k => { if (k !== 'type' && !(k in COMMON) && !(k in def.params)) throw new Error(where + ' (' + L.type + ') has no parameter "' + k + '". It takes: ' + Object.keys(def.params).concat(Object.keys(COMMON)).join(', ')); });
      for (const k in COMMON) n[k] = checkParam(where, k, COMMON[k], L[k]);
      for (const k in def.params) n[k] = checkParam(where, k, def.params[k], L[k]);
      if (L.blend === undefined && (L.type === 'smoke' || L.type === 'debris')) n.blend = 'normal';
      if (n.end <= n.start) throw new Error(where + '.end (' + n.end + ') must be greater than start (' + n.start + ')');
      return n;
    });
    if (patch.name) out.name = String(patch.name);
    if (patch.label) out.label = String(patch.label);
    return out;
  }

  const THEMES = {
    fire: ['#fffbe6', '#ffd36b', '#ff7a1a', '#c2240c'],
    ice: ['#ffffff', '#d4f7ff', '#6fd6ff', '#2a6fe0'],
    thunder: ['#ffffff', '#f2e9ff', '#b58cff', '#5b2bd6'],
    dark: ['#f3e8ff', '#c084fc', '#7e22ce', '#2e0b52'],
    holy: ['#fffef5', '#fff2b0', '#ffd24a', '#d48a0b'],
    poison: ['#f7ffe8', '#c8ff7a', '#5fd13a', '#1d6b2a'],
    blood: ['#ffe9e9', '#ff8a8a', '#d61f2c', '#5c0710'],
    jade: ['#f2fffa', '#a8f5d6', '#2fbf8f', '#0e5e4a']
  };
  const THEMES_EARLY = THEMES;

  /* ---------- 预设（就是写好的 patch） ---------- */
  const EFFECTS = {
    swordQi: {
      label: '剑气 Sword qi', sound: 'swordQi',
      palette: { hd: ['#ffffff', '#bff4ff', '#4fd2ff', '#1a5cff'], pixel: ['#ffffff', '#aef0ff', '#3cc4f5', '#1f62d8', '#16307a'] },
      patch: { frames: 12, fps: 24, layers: [
        { type: 'slash', y: 0.32, angle: -90, radius: 0.4, sweep: 150, squash: 0.8, jitter: 0.15 }
      ] }
    },
    spell: {
      label: '法术 Spell', sound: 'spell',
      palette: { hd: ['#fffaf0', '#ffe9a3', '#ffb43c', '#c2410c'], pixel: ['#fffbe8', '#ffe27a', '#f5a524', '#c25412', '#6b2108'] },
      patch: { frames: 16, fps: 20, layers: [
        { type: 'swirl', end: 0.58, count: 30, radiusFrom: 0.38, radiusTo: 0, turns: 0.45, ease: 'in', stagger: 0.3 },
        { type: 'flash', end: 0.58, radius: 0.09, peak: 1, falloff: 1, grow: 0, ease: 'in', intensity: 1.5 },
        { type: 'flash', start: 0.55, end: 1, radius: 0.16, peak: 0.05, falloff: 2, grow: 0.3, intensity: 1.4 },
        { type: 'ring', start: 0.55, end: 1, radiusFrom: 0.05, radiusTo: 0.43, thickness: 0.016, fade: 1.3, intensity: 1.6 },
        { type: 'burst', start: 0.55, end: 1, count: 22, speed: 0.42, size: 0.009, sizeEnd: 0.5, life: 1, streak: 0.6 }
      ] }
    },
    hit: {
      label: '击中 Hit', sound: 'hit',
      palette: { hd: ['#ffffff', '#fff2b8', '#ff9b3d', '#d1300f'], pixel: ['#ffffff', '#ffe98a', '#ff9a2e', '#d6361a', '#6e1406'] },
      patch: { frames: 8, fps: 24, layers: [
        { type: 'flash', end: 0.45, radius: 0.13, peak: 0, falloff: 2, grow: 0.5, intensity: 1.4 },
        { type: 'glint', end: 0.45, points: 5, length: 0.33, width: 0.02, peak: 0, uneven: 0.5 },
        { type: 'ring', end: 0.7, radiusFrom: 0.06, radiusTo: 0.4, thickness: 0.012, fade: 2, intensity: 0.5 },
        { type: 'sparks', count: 14, speed: 0.33, length: 0.08, gravity: 0.25, size: 0.01 }
      ] }
    }
  };

  EFFECTS.lightning = {
    label: '雷电 Lightning', sound: 'lightning',
    palette: { hd: THEMES_EARLY.thunder, pixel: THEMES_EARLY.thunder.concat(['#2a1263']) },
    patch: { frames: 12, fps: 24, layers: [
      { type: 'bolt', x: 0, y: -1, angle: 90, length: 0.78, width: 0.013, segments: 12, jagged: 0.4, branches: 3, strikes: 3, end: 0.8, jitter: 0.15 },
      { type: 'flash', y: 0.55, start: 0.05, end: 0.7, radius: 0.16, peak: 0.05, falloff: 1.4, grow: 0.3 },
      { type: 'ring', y: 0.55, start: 0.08, end: 0.75, radiusFrom: 0.04, radiusTo: 0.42, squash: 0.35, thickness: 0.014, intensity: 1.2 },
      { type: 'sparks', y: 0.55, angle: -90, spread: 160, start: 0.08, count: 16, speed: 0.4, gravity: 0.6 },
      { type: 'smoke', y: 0.58, start: 0.2, count: 6, size: 0.06, rise: 0.25, spread: 0.3, opacity: 0.4, tint: '#4a4458' }
    ] }
  };
  EFFECTS.talisman = {
    label: '符箓 Talisman', sound: 'talisman',
    palette: { hd: ['#fffdf2', '#ffe58a', '#ff9a3c', '#c0262d'], pixel: ['#fffdf2', '#ffe58a', '#ff9a3c', '#c0262d', '#5a0f14'] },
    patch: { frames: 16, fps: 20, layers: [
      { type: 'shape', end: 0.62, shape: 'rect', width: 0.22, height: 0.42, fill: true, tint: '#e9d38a', outline: 0.006, pulse: 0.1, popIn: 0.2, color: 'mid' },
      { type: 'shape', end: 0.62, shape: 'diamond', width: 0.1, height: 0.14, outline: 0.006, popIn: 0.35, color: 'dark' },
      { type: 'sigil', start: 0.1, end: 0.75, radius: 0.36, rings: 2, polygon: 8, star: true, ticks: 32, rotate: 60, drawOn: 0.5 },
      { type: 'flash', start: 0.58, end: 1, radius: 0.18, peak: 0.05, falloff: 1.8 },
      { type: 'debris', start: 0.58, end: 1, count: 14, shape: 'paper', tint: '#e9d38a', speed: 0.45, spread: 360, gravity: 0.6, size: 0.016, spin: 3 },
      { type: 'burst', start: 0.58, end: 1, count: 20, speed: 0.4, size: 0.008, streak: 0.5 }
    ] }
  };
  EFFECTS.breakthrough = {
    label: '突破 Breakthrough', sound: 'breakthrough',
    palette: { hd: THEMES_EARLY.holy, pixel: THEMES_EARLY.holy.concat(['#6b3c05']) },
    patch: { frames: 20, fps: 20, layers: [
      { type: 'swirl', end: 0.55, count: 46, radiusFrom: 0.46, radiusTo: 0.02, turns: 0.7, ease: 'in', stagger: 0.4, rise: 0 },
      { type: 'sigil', y: 0.45, end: 0.7, radius: 0.42, squash: 0.4, rings: 3, polygon: 8, star: true, ticks: 40, rotate: 90, drawOn: 0.45, intensity: 0.9 },
      { type: 'flash', end: 0.55, radius: 0.08, peak: 1, falloff: 1, grow: 0, ease: 'in' },
      { type: 'beam', start: 0.5, end: 0.95, angle: -90, y: 0.45, from: 'start', length: 0.8, width: 0.06, grow: 0.15, intensity: 1.2, jitter: 0 },
      { type: 'flash', start: 0.52, end: 1, radius: 0.22, peak: 0.05, falloff: 1.5, intensity: 1.4 },
      { type: 'ring', start: 0.52, end: 1, radiusFrom: 0.05, radiusTo: 0.48, count: 2, thickness: 0.016, intensity: 1.4 },
      { type: 'burst', start: 0.52, end: 1, count: 40, speed: 0.5, size: 0.01, gravity: -0.3, streak: 0.6 }
    ] }
  };
  EFFECTS.explosion = {
    label: '爆炸 Explosion', sound: 'explosion',
    palette: { hd: THEMES_EARLY.fire, pixel: THEMES_EARLY.fire.concat(['#570f05']) },
    patch: { frames: 16, fps: 24, layers: [
      { type: 'flash', end: 0.55, radius: 0.24, peak: 0.04, falloff: 1.6, grow: 0.5, intensity: 1.6 },
      { type: 'burst', end: 0.9, count: 40, speed: 0.42, size: 0.03, sizeEnd: 1.4, life: 0.8, intensity: 0.9 },
      { type: 'ring', end: 0.6, radiusFrom: 0.08, radiusTo: 0.5, thickness: 0.02, fade: 2 },
      { type: 'smoke', start: 0.12, count: 14, size: 0.09, expand: 2.4, rise: 0.25, spread: 0.35, opacity: 0.7, tint: '#3d3632' },
      { type: 'debris', end: 1, count: 12, angle: -90, spread: 220, speed: 0.55, gravity: 1.4, size: 0.022 },
      { type: 'sparks', count: 20, speed: 0.5, gravity: 0.5, length: 0.1 }
    ] }
  };
  EFFECTS.aura = {
    label: '光环 Aura (loop)', sound: null,
    palette: { hd: THEMES_EARLY.jade, pixel: THEMES_EARLY.jade.concat(['#06302a']) },
    patch: { frames: 24, fps: 20, loop: true, layers: [
      { type: 'sigil', y: 0.5, radius: 0.4, squash: 0.38, rings: 2, polygon: 6, star: true, ticks: 30, rotate: 60, drawOn: 0, intensity: 0.8, ease: 'linear' },
      { type: 'swirl', y: 0.3, count: 40, radiusFrom: 0.36, radiusTo: 0.2, turns: 0.5, rise: -0.9, size: 0.009, ease: 'linear' },
      { type: 'burst', y: 0.4, angle: -90, spread: 50, count: 18, speed: 0.6, gravity: -0.2, size: 0.007, life: 0.8, emit: 'stream', streak: 0.4, ease: 'linear' }
    ] }
  };

  /* ---------- 色板 ---------- */
  const DEFAULT_PALETTE = { hd: THEMES.ice, pixel: THEMES.ice.concat(['#123070']) };
  function darker(h, k) { const c = hex(h); return '#' + c.map(v => Math.round(v * k * 255).toString(16).padStart(2, '0')).join(''); }
  /** palette: 色板名、4 个颜色的数组，或 { hd: [4 色], pixel: [5 色] }；不给就用 fallback（特效自己的） */
  function resolvePalette(fallback, palette) {
    if (!palette) return (fallback && fallback.palette) || fallback || DEFAULT_PALETTE;
    let four = null;
    if (typeof palette === 'string') {
      four = THEMES[palette];
      if (!four) throw new Error('unknown palette "' + palette + '". Palettes: ' + Object.keys(THEMES).join(', ') + ', or 4 colours like ["#ffffff","#bff4ff","#4fd2ff","#1a5cff"]');
    } else if (Array.isArray(palette)) four = palette;
    else if (palette.hd) return { hd: palette.hd, pixel: palette.pixel || palette.hd.concat([darker(palette.hd[3], 0.45)]) };
    if (!four || four.length !== 4 || !four.every(c => /^#[0-9a-fA-F]{6}$/.test(c))) throw new Error('palette needs 4 colours "#rrggbb": core, light, mid, dark');
    return { hd: four, pixel: four.concat([darker(four[3], 0.45)]) };
  }
  /** 图层颜色：auto = 色板的四档；指定一档或一个颜色 = 由这个颜色往白色过渡的四档 */
  function layerColors(L, C) {
    if (L.color === 'auto') return C;
    const base = L.color[0] === '#' ? hex(L.color) : C[{ core: 0, light: 1, mid: 2, dark: 3 }[L.color]];
    return [mix(base, [1, 1, 1], 0.85), mix(base, [1, 1, 1], 0.45), base, mix(base, [0, 0, 0], 0.4)];
  }

  /* ---------- 显影 ---------- */
  /** 光 + 实体 → RGBA8。hd：平滑色调映射；pixel：光按亮度落到调色板，实体按自己的颜色分三档明暗，都硬边 */
  function develop(cv, style, palette) {
    const S = cv.size, out = new Uint8ClampedArray(S * S * 4), b = cv.buf, m = cv.mat;
    const pal = palette.map(hex);
    /* 贴边的光慢慢收掉：最外 6% 渐隐到 0，并且去掉极淡的雾，保证图块边缘没有硬边 */
    const edge = Math.max(1, S * 0.06), win = new Float32Array(S);
    for (let x = 0; x < S; x++) { const d = Math.min(x + 0.5, S - x - 0.5) / edge; win[x] = d >= 1 ? 1 : d * d * (3 - 2 * d); }
    for (let i = 0, j = 0; i < S * S; i++, j += 4) {
      const w = win[i % S] * win[(i / S) | 0];
      let r = 1 - Math.exp(-b[i * 3] * w), g = 1 - Math.exp(-b[i * 3 + 1] * w), bl = 1 - Math.exp(-b[i * 3 + 2] * w);
      let a = Math.max(r, g, bl);
      if (a < 3 / 255) { r = g = bl = a = 0; }
      const ma = m[i * 4 + 3];
      if (style === 'pixel') {
        if (a >= 0.16) {
          const L = (r + g + bl) / 3 / Math.max(a, 1e-6) * 0.35 + a * 0.65;
          let k = [0.86, 0.66, 0.46, 0.3].findIndex(s => L >= s);
          if (k < 0) k = pal.length - 1;
          k = Math.min(k, pal.length - 1);
          out[j] = pal[k][0] * 255; out[j + 1] = pal[k][1] * 255; out[j + 2] = pal[k][2] * 255; out[j + 3] = 255;
        } else if (ma >= 0.4) {
          const q = v => Math.round(v / ma * 3) / 3 * 255;
          out[j] = q(m[i * 4]); out[j + 1] = q(m[i * 4 + 1]); out[j + 2] = q(m[i * 4 + 2]); out[j + 3] = 255;
        }
        continue;
      }
      if (a < 1 / 255 && ma < 1 / 255) continue;
      /* 光（直通色）叠在实体上面 */
      const ga = a, oa = ga + ma * (1 - ga);
      const gr = a > 0 ? r / a : 0, gg = a > 0 ? g / a : 0, gb = a > 0 ? bl / a : 0;
      out[j] = (gr * ga + m[i * 4] * (1 - ga)) / oa * 255;
      out[j + 1] = (gg * ga + m[i * 4 + 1] * (1 - ga)) / oa * 255;
      out[j + 2] = (gb * ga + m[i * 4 + 2] * (1 - ga)) / oa * 255;
      out[j + 3] = oa * 255;
    }
    return out;
  }

  /* ---------- 渲染 ---------- */
  /**
   * 渲染所有帧。what：预设名，或者 patch 对象。
   * opt: { style: 'hd'|'pixel', size, frames, seed, palette, speed, loop }
   * 返回 { name, size, frames: [RGBA], fps, style, seed, palette, loop, patch }
   */
  function render(what, opt) {
    opt = opt || {};
    let fx = null, raw = what, name = 'custom';
    if (typeof what === 'string') {
      fx = EFFECTS[what];
      if (!fx) throw new Error('unknown effect "' + what + '". Effects: ' + Object.keys(EFFECTS).join(', ') + ' (or pass a patch with layers)');
      raw = fx.patch; name = what;
    } else if (what && what.name) name = String(what.name).replace(/[^A-Za-z0-9_-]+/g, '_') || 'custom';
    const P = normalize(raw);
    const style = opt.style === 'pixel' ? 'pixel' : 'hd';
    const size = opt.size || (style === 'pixel' ? 48 : 128);
    const n = opt.frames || P.frames, seed = opt.seed == null ? 1 : opt.seed, loop = opt.loop != null ? !!opt.loop : P.loop;
    if (size < 8 || size > 1024) throw new Error('size must be 8-1024');
    if (n < 2 || n > 120) throw new Error('frames must be 2-120');
    const pal = resolvePalette(fx || null, opt.palette || P.palette), speed = opt.speed || 1;
    const C = pal.hd.map(hex);
    /* 每层：随机数各自独立（加一层不会改变别的层），jitter 决定新种子对位置、角度、大小、时间的影响 */
    const layers = P.layers.map((L, i) => {
      const R = rng((seed * 7919 + i * 104729) >>> 0), J = L.jitter, j = () => (R() - 0.5) * 2 * J;
      const st = LAYERS[L.type].setup ? LAYERS[L.type].setup(L, R) : null;
      const ang = (L.angle + j() * 25) * DEG, sc = L.scale * (1 + j() * 0.15);
      return { L, st, x: 0.5 + L.x * 0.5 + j() * 0.04, y: 0.5 + L.y * 0.5 + j() * 0.04, cos: Math.cos(ang), sin: Math.sin(ang), sc, col: layerColors(L, C), dt: j() * 0.03 };
    });
    const frames = [];
    for (let f = 0; f < n; f++) {
      const cv = Canvas(size), sub = 3;
      for (let s = 0; s < sub; s++) {
        const t = (f + (s + 0.5) / sub) / n;
        const tmp = Canvas(size);
        layers.forEach(l => {
          const L = l.L, dur = L.end - L.start;
          let u;
          if (loop) u = frac((t - L.start - l.dt) / (dur || 1));
          else { u = (t - L.start - l.dt) / dur; if (u < 0 || u > 1) return; }
          const G = { x: l.x, y: l.y, cos: l.cos, sin: l.sin, sc: l.sc, col: l.col, k: L.intensity, blend: L.blend, loop, e: EASE[L.ease] };
          LAYERS[L.type].draw(tmp, u, L, l.st, G);
        });
        for (let i = 0; i < cv.buf.length; i++) cv.buf[i] += tmp.buf[i] / sub;
        for (let i = 0; i < cv.mat.length; i++) cv.mat[i] += tmp.mat[i] / sub;
      }
      frames.push(develop(cv, style, style === 'pixel' ? pal.pixel : pal.hd));
    }
    /* 帧数改了的话 fps 跟着变，总时长保持原样；speed 再整体加快或放慢 */
    const fps = Math.max(1, Math.round(P.fps * n / P.frames * speed * 10) / 10);
    return { name, size, frames, fps, style, seed, palette: style === 'pixel' ? pal.pixel : pal.hd, loop, patch: P };
  }

  /** 在一个 patch 上随机变一点：数值参数按 amount 浮动，返回新 patch（不改原来的） */
  function mutate(patch, seed, amount) {
    const P = normalize(patch), R = rng(seed || 1), amt = amount == null ? 0.25 : amount;
    const out = JSON.parse(JSON.stringify(patch));
    out.layers = P.layers.map((L, i) => {
      const src = Object.assign({}, patch.layers[i]), spec = LAYERS[L.type].params;
      Object.keys(spec).forEach(k => {
        const [def, a, b] = spec[k];
        if (typeof def !== 'number' || k === 'count' && R() < 0.5) return;
        if (R() > 0.6) return;
        const v = L[k], span = (b - a);
        let nv = v + (R() - 0.5) * 2 * amt * Math.min(span, Math.abs(v) + span * 0.1);
        nv = clamp(nv, a, b);
        src[k] = Number.isInteger(def) && Number.isInteger(v) ? Math.round(nv) : +nv.toPrecision(3);
      });
      return src;
    });
    return out;
  }

  /** 给 Agent / 文档用的说明：所有元素、参数、范围、默认值和示例 */
  function describe() {
    const fmt = spec => { const o = {}; for (const k in spec) { const [d, a, b, doc] = spec[k]; o[k] = Array.isArray(a) ? { default: d, options: a, doc: b } : typeof d === 'number' ? { default: d, min: a, max: b, doc } : { default: d, doc: b }; } return o; };
    const layers = {};
    for (const k in LAYERS) layers[k] = { doc: LAYERS[k].doc, params: fmt(LAYERS[k].params) };
    return {
      coordinates: 'x, y from -1 to 1 with 0 = centre of the frame; sizes and radii are fractions of the frame width (0.5 = half the frame). angle in degrees, 0 = right, 90 = down. Time: each layer lives from start to end (0-1 of the whole effect) and its own animation runs over that span.',
      patch: fmt(PATCH_PARAMS), common: fmt(COMMON), layers,
      palettes: THEMES,
      presets: Object.fromEntries(Object.keys(EFFECTS).map(k => [k, EFFECTS[k].patch]))
    };
  }

  /** 像素风放大：最近邻，每个像素变成 k×k */
  function upscale(r, k) {
    if (!k || k === 1) return r;
    const S = r.size, T = S * k;
    const frames = r.frames.map(f => {
      const o = new Uint8ClampedArray(T * T * 4);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const si = ((y / k | 0) * S + (x / k | 0)) * 4, di = (y * T + x) * 4; o[di] = f[si]; o[di + 1] = f[si + 1]; o[di + 2] = f[si + 2]; o[di + 3] = f[si + 3]; }
      return o;
    });
    return Object.assign({}, r, { size: T, frames });
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

  /** 预览缩略图：挑 n 帧排成一行，铺在深色底上（给能看图的 Agent 检查效果） */
  function contactSheet(r, n) {
    n = Math.min(n || 6, r.frames.length);
    const S = r.size, pick = Array.from({ length: n }, (_, i) => Math.round(i * (r.frames.length - 1) / Math.max(1, n - 1)));
    const W2 = S * n, out = new Uint8ClampedArray(W2 * S * 4);
    pick.forEach((fi, i) => {
      const fr = r.frames[fi];
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const s = (y * S + x) * 4, d = (y * W2 + i * S + x) * 4, a = fr[s + 3] / 255;
        const bg = ((x >> 3) + (y >> 3)) % 2 ? 34 : 26;
        out[d] = fr[s] * a + bg * (1 - a); out[d + 1] = fr[s + 1] * a + bg * (1 - a); out[d + 2] = fr[s + 2] * a + (bg + 10) * (1 - a); out[d + 3] = 255;
      }
    });
    return { width: W2, height: S, data: out, frames: pick };
  }

  const API = { EFFECTS, LIST: Object.keys(EFFECTS), LAYERS, THEMES, resolvePalette, normalize, render, mutate, describe, upscale, sheet, contactSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else window.SFX_VFX = API;
})();
