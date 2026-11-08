/* ============================================================================
   SFX Brew 音乐工作室 · 钢琴卷帘 / 鼓网格
   ----------------------------------------------------------------------------
   编辑当前选中片段里的音符。和时间线一样是"滚动容器 + 画布"。
   画布分四块：左边键盘标签（固定）、上面小节标尺（固定）、下面力度条（固定）、中间音符区（跟着滚动）。
   有音高的乐器：五声锁定时只显示音阶内的行（加上已经用到的音），关掉时显示全部半音。
   鼓组：每行一个鼓件，点格子开关一下，按住拖动连续画。
   ==========================================================================*/
(function (root) {
  'use strict';

  function makeRoll(app) {
    const $ = s => document.querySelector(s);
    const panel = $('#st-roll'), scroll = $('#st-roll-scroll'), cv = $('#st-roll-cv'), sizer = $('#st-roll-sizer');
    const KEYW = 84, RUL = 20, VEL = 58;
    const GONG = { gong: 0, shang: 2, jue: 4, zhi: 7, yu: 9 }, JIANPU = { 0: '1', 2: '2', 4: '3', 7: '5', 9: '6' };
    const T = app.T, P = app.P;
    let ppb = 48, q = 0.25, lastLen = 1, rows = [], rowH = 16, drums = false, drag = null, shownRegion = null;
    let selN = new Set();
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function cur() {
      const f = app.sel.region && P.findRegion(app.project, app.sel.region);
      return f ? { p: app.project, t: f.track, r: f.region, inst: app.insts.get(f.track.instrument) } : null;
    }
    function buildRows(c) {
      drums = c.inst.kind === 'drums';
      const used = new Set(c.r.notes.map(n => n.p));
      if (drums) {
        rows = app.insts.DRUM_KIT.map(k => k.p);
        used.forEach(p => { if (!rows.includes(p)) rows.push(p); });
        rowH = 26;
      } else {
        const lo = Math.min(c.inst.range[0], ...used), hi = Math.max(c.inst.range[1], ...used);
        rows = [];
        for (let m = hi; m >= lo; m--) if (!c.p.scaleLock || P.inScale(c.p, m) || used.has(m)) rows.push(m);
        rowH = c.p.scaleLock ? 18 : 13;
      }
    }
    const rowOf = p => rows.indexOf(p);
    function size(c) {
      sizer.style.width = Math.ceil(KEYW + (c.r.length + 16) * ppb) + 'px';
      sizer.style.height = (RUL + rows.length * rowH + VEL) + 'px';
    }

    /* 打开（或刷新）当前片段 */
    function open() {
      const c = cur();
      panel.classList.toggle('empty', !c);
      $('#st-roll-title').textContent = c ? (c.t.name || (app.LANG === 'zh' ? c.inst.zh : c.inst.en)) + ' · ' + fmtBars(c.r) : T.rollEmpty;
      if (!c) { shownRegion = null; selN.clear(); draw(); return; }
      buildRows(c); size(c);
      $('#st-roll-q').value = String(q);
      if (shownRegion !== c.r.id) {
        selN.clear();
        shownRegion = c.r.id;
        if (c.inst.kind === 'drums') q = 0.25, lastLen = 0.5;
        $('#st-roll-q').value = String(q);
        /* 竖直方向滚到音符的平均音高附近 */
        const ps = c.r.notes.map(n => rowOf(n.p)).filter(i => i >= 0);
        const mid = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : rows.length / 2;
        scroll.scrollTop = Math.max(0, RUL + mid * rowH - scroll.clientHeight / 2);
        scroll.scrollLeft = 0;
      }
      draw();
    }
    const fmtBars = r => fmtT('regionAt', { bar: +(r.start / 4 + 1).toFixed(2), len: +(r.length / 4).toFixed(2) });
    const fmtT = (k, o) => String(T[k]).replace(/\{(\w+)\}/g, (m, x) => (o[x] != null ? o[x] : m));
    function reset() { selN.clear(); shownRegion = null; drag = null; }

    function rowLabel(c, m) {
      if (drums) { const k = app.insts.DRUM_KIT.find(x => x.p === m); return k ? (app.LANG === 'zh' ? k.zh : k.en) : app.noteName(m); }
      const rel = (((m - (c.p.root - GONG[c.p.mode])) % 12) + 12) % 12;
      return app.noteName(m) + (app.LANG === 'zh' && JIANPU[rel] && P.inScale(c.p, m) ? '  ' + JIANPU[rel] : '');
    }

    /* ---------- 画 ---------- */
    function draw() {
      const W = scroll.clientWidth, H = scroll.clientHeight;
      if (!W || !H) return;
      const C = app.C(), g = app.fitCanvas(cv, W, H), c = cur();
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      if (!c) return;
      const sx = scroll.scrollLeft, sy = scroll.scrollTop, X = t => KEYW + t * ppb - sx, Y = i => RUL + i * rowH - sy;
      const r = c.r, noteBottom = H - VEL, col = app.color(c.t.instrument);
      g.font = '11px ' + app.FONT; g.textBaseline = 'middle';

      /* 行背景 */
      g.save(); g.beginPath(); g.rect(KEYW, RUL, W - KEYW, noteBottom - RUL); g.clip();
      rows.forEach((m, i) => {
        const y = Y(i); if (y > noteBottom || y + rowH < RUL) return;
        const out = !drums && !P.inScale(c.p, m);
        g.fillStyle = drums ? (i % 2 ? C.rowAlt : C.row) : out ? C.rowAlt : P.isTonic(c.p, m) ? C.rowSel : C.row;
        g.fillRect(KEYW, y, W - KEYW, rowH);
        g.fillStyle = C.line; g.fillRect(KEYW, y + rowH - 1, W - KEYW, 1);
      });
      /* 竖线：量化步长 / 拍 / 小节 */
      const t0 = Math.max(0, Math.floor((sx) / ppb / q) * q), t1 = (sx + W) / ppb;
      for (let t = t0; t <= t1; t = +(t + q).toFixed(6)) {
        const abs = r.start + t, beat = Math.abs(abs - Math.round(abs)) < 1e-6, bar = beat && Math.round(abs) % 4 === 0;
        if (!beat && q * ppb < 7) continue;
        g.fillStyle = bar ? C.ink2 : beat ? C.line2 : C.line;
        g.globalAlpha = bar ? 0.45 : 1;
        g.fillRect(Math.round(X(t)), RUL, 1, noteBottom - RUL);
        g.globalAlpha = 1;
      }
      /* 片段结尾之后变暗 */
      if (X(r.length) < W) { g.fillStyle = C.shade; g.fillRect(Math.max(KEYW, X(r.length)), RUL, W, noteBottom - RUL); g.fillStyle = C.ink2; g.fillRect(Math.round(X(r.length)), RUL, 1.5, noteBottom - RUL); }
      /* 音符 */
      r.notes.forEach(n => {
        const i = rowOf(n.p); if (i < 0) return;
        const x = X(n.t), y = Y(i), w = drums ? Math.max(6, Math.min(n.d, q) * ppb - 2) : Math.max(4, n.d * ppb - 1);
        if (x > W || x + w < KEYW || y > noteBottom || y + rowH < RUL) return;
        const on = selN.has(n);
        g.globalAlpha = (n.t >= r.length ? 0.35 : 1) * (0.45 + 0.55 * n.v);
        app.roundRect(g, x + 0.5, y + 1.5, w, rowH - 3, drums ? 4 : 3);
        g.fillStyle = col; g.fill();
        g.globalAlpha = 1;
        if (on) { g.lineWidth = 2; g.strokeStyle = C.ink; g.stroke(); }
        else if (!drums && c.p.scaleLock && !P.inScale(c.p, n.p)) { g.lineWidth = 1.5; g.strokeStyle = C.out; g.stroke(); }
      });
      if (drag && drag.kind === 'marquee') {
        const ax = X(drag.t0), bx = X(drag.t1), ay = drag.y0 - sy, by = drag.y1 - sy;
        g.fillStyle = app.hexA(C.accent.startsWith('#') ? C.accent : '#0a7d5a', 0.12); g.strokeStyle = C.accent; g.lineWidth = 1;
        g.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
        g.strokeRect(Math.min(ax, bx) + 0.5, Math.min(ay, by) + 0.5, Math.abs(bx - ax), Math.abs(by - ay));
      }
      g.restore();

      /* 左侧键盘 / 鼓件名 */
      g.save(); g.beginPath(); g.rect(0, RUL, KEYW, noteBottom - RUL); g.clip();
      rows.forEach((m, i) => {
        const y = Y(i); if (y > noteBottom || y + rowH < RUL) return;
        const black = !drums && !c.p.scaleLock && [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
        g.fillStyle = black ? C.rowAlt : C.head; g.fillRect(0, y, KEYW, rowH);
        g.fillStyle = C.line; g.fillRect(0, y + rowH - 1, KEYW, 1);
        const tonic = !drums && P.isTonic(c.p, m);
        if (tonic) { g.fillStyle = C.accent; g.fillRect(0, y + 2, 3, rowH - 4); }
        if (rowH >= 12) {
          g.fillStyle = !drums && !P.inScale(c.p, m) ? C.ink2 : C.ink;
          g.font = (tonic ? '600 ' : '') + '11px ' + app.FONT;
          g.fillText(rowLabel(c, m), 8, y + rowH / 2);
        }
      });
      g.restore();
      g.fillStyle = C.line2; g.fillRect(KEYW - 1, RUL, 1, noteBottom - RUL);

      /* 标尺 */
      g.fillStyle = C.head; g.fillRect(0, 0, W, RUL);
      g.font = '11px ' + app.FONT;
      for (let b = Math.ceil(r.start + t0 - 1e-6); b <= r.start + t1; b++) {
        const x = X(b - r.start); if (x < KEYW) continue;
        if (b % 4 === 0) { g.fillStyle = C.line2; g.fillRect(Math.round(x), 0, 1, RUL); g.fillStyle = C.ink2; g.fillText(String(b / 4 + 1), x + 4, RUL / 2 + 1); }
        else if (ppb >= 16) { g.fillStyle = C.line2; g.fillRect(Math.round(x), RUL - 5, 1, 5); }
      }
      g.fillStyle = C.line2; g.fillRect(0, RUL - 1, W, 1);

      /* 力度条 */
      g.fillStyle = C.head; g.fillRect(0, noteBottom, W, VEL);
      g.fillStyle = C.line2; g.fillRect(0, noteBottom, W, 1);
      g.fillStyle = C.ink2; g.fillText(T.velocity, 8, noteBottom + 14);
      g.save(); g.beginPath(); g.rect(KEYW, noteBottom, W - KEYW, VEL); g.clip();
      r.notes.forEach(n => {
        const x = X(n.t); if (x > W || x < KEYW - 8) return;
        const hgt = n.v * (VEL - 12), on = selN.has(n);
        g.fillStyle = on ? C.accent : col; g.globalAlpha = on ? 1 : 0.75;
        g.fillRect(x, noteBottom + VEL - 4 - hgt, 3, hgt);
        g.beginPath(); g.arc(x + 1.5, noteBottom + VEL - 4 - hgt, 3, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      });
      g.restore();

      /* 播放头（只在片段范围内显示） */
      const ph = app.playhead() - r.start, px = X(ph);
      if (ph >= 0 && ph <= r.length + 16 && px >= KEYW && px <= W) {
        g.fillStyle = C.playhead; g.fillRect(Math.round(px) - 0.5, 0, 1.5, noteBottom);
      }
    }

    /* ---------- 坐标 ---------- */
    function at(e) {
      const l = app.local(e, scroll);
      return Object.assign(l, { t: (l.x - KEYW + scroll.scrollLeft) / ppb, cy: l.y + scroll.scrollTop, i: Math.floor((l.y - RUL + scroll.scrollTop) / rowH) });
    }
    function noteAt(c, t, i) {
      const p = rows[i];
      for (let k = c.r.notes.length - 1; k >= 0; k--) {
        const n = c.r.notes[k];
        const w = drums ? Math.max(Math.min(n.d, q), 6 / ppb) : n.d;
        if (n.p === p && t >= n.t && t < n.t + w) return n;
      }
      return null;
    }
    function velNoteAt(c, t) {
      let best = null, bd = 6 / ppb;
      c.r.notes.forEach(n => { const d = Math.abs(t - n.t); if (d < bd || (d === bd && selN.has(n))) { best = n; bd = d; } });
      return best;
    }
    const floorQ = t => Math.floor(t / q + 1e-6) * q, roundQ = t => Math.round(t / q) * q;
    const hear = (c, p, v) => app.audition(c.t.instrument, p, v == null ? 0.8 : v, drums ? 0.5 : Math.min(2, lastLen));
    /* 音符超出片段时自动把片段拉长到整小节 */
    function fitRegion(c) {
      let end = 0; c.r.notes.forEach(n => { end = Math.max(end, n.t + Math.min(n.d, 0.5)); });
      if (end > c.r.length) c.r.length = Math.ceil(end / 4) * 4;
    }

    /* ---------- 鼠标 ---------- */
    scroll.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const c = cur(), a = at(e);
      app.focus('roll');
      if (!c || !a.inside) return;
      const noteBottom = scroll.clientHeight - VEL;
      try { scroll.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
      if (a.y >= noteBottom) {
        if (a.x < KEYW) return;
        drag = { kind: 'vel', moved: false };
        setVel(c, a);
        return;
      }
      if (a.y < RUL) { if (a.x >= KEYW) app.setCursor(c.r.start + Math.max(0, roundQ(a.t))); return; }
      const p = rows[a.i];
      if (p == null) return;
      if (a.x < KEYW) { hear(c, p); return; }
      if (a.t < 0) return;
      if (drums) {
        const cell = floorQ(a.t), hit = c.r.notes.find(n => n.p === p && n.t >= cell - 1e-6 && n.t < cell + q - 1e-6);
        app.begin();
        drag = { kind: 'paint', mode: hit ? 'erase' : 'add', done: new Set() };
        paint(c, cell, p);
        return;
      }
      const hit = noteAt(c, a.t, a.i);
      if (hit) {
        if (e.altKey) { app.begin(); c.r.notes.splice(c.r.notes.indexOf(hit), 1); selN.delete(hit); app.changed(); return; }
        if (e.shiftKey) { if (selN.has(hit)) { selN.delete(hit); draw(); return; } selN.add(hit); }
        else if (!selN.has(hit)) { selN.clear(); selN.add(hit); }
        const edge = (KEYW + (hit.t + hit.d) * ppb - scroll.scrollLeft) - a.x < 7 && hit.d * ppb > 12;
        const orig = new Map(); selN.forEach(n => orig.set(n, { t: n.t, d: n.d, i: rowOf(n.p) }));
        drag = { kind: edge ? 'resize' : 'move', t0: a.t, i0: a.i, orig, anchor: hit, moved: false, lastP: hit.p };
        hear(c, hit.p, hit.v);
        draw();
        return;
      }
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        if (!e.shiftKey) selN.clear();
        drag = { kind: 'marquee', t0: a.t, t1: a.t, y0: a.cy, y1: a.cy, base: new Set(selN) };
        return;
      }
      /* 空白处：加一个音符，按住往右拖调长度 */
      app.begin();
      const n = { t: floorQ(a.t), d: lastLen, p, v: 0.8 };
      c.r.notes.push(n);
      selN.clear(); selN.add(n);
      drag = { kind: 'draw', note: n, moved: true };
      hear(c, p);
      app.changed(true);
    });
    scroll.addEventListener('pointermove', e => {
      const c = cur(), a = at(e);
      if (!drag || !c) {
        if (c && !drums && a.inside && a.x > KEYW && a.y > RUL && a.y < scroll.clientHeight - VEL) {
          const n = noteAt(c, a.t, a.i);
          scroll.style.cursor = n ? ((KEYW + (n.t + n.d) * ppb - scroll.scrollLeft) - a.x < 7 && n.d * ppb > 12 ? 'ew-resize' : 'grab') : '';
        } else scroll.style.cursor = '';
        return;
      }
      if (drag.kind === 'draw') {
        const n = drag.note, d = Math.max(q, Math.ceil((a.t - n.t) / q - 1e-6) * q);
        if (d !== n.d) { n.d = d; lastLen = d; app.changed(true); }
      } else if (drag.kind === 'move') {
        const dt = roundQ(a.t - drag.t0), di = a.i - drag.i0;
        if (!drag.moved && dt === 0 && di === 0) return;
        if (!drag.moved) { app.begin(); drag.moved = true; }
        let minI = Infinity, maxI = -Infinity, minT = Infinity;
        drag.orig.forEach(o => { minI = Math.min(minI, o.i); maxI = Math.max(maxI, o.i); minT = Math.min(minT, o.t); });
        const ddi = clamp(di, -minI, rows.length - 1 - maxI), ddt = Math.max(dt, -minT);
        drag.orig.forEach((o, n) => { n.t = +(o.t + ddt).toFixed(4); n.p = rows[o.i + ddi]; });
        if (drag.anchor.p !== drag.lastP) { drag.lastP = drag.anchor.p; hear(c, drag.anchor.p, drag.anchor.v); }
        scroll.style.cursor = 'grabbing';
        app.changed(true);
      } else if (drag.kind === 'resize') {
        const dd = roundQ(a.t - drag.t0);
        if (!drag.moved && dd === 0) return;
        if (!drag.moved) { app.begin(); drag.moved = true; }
        drag.orig.forEach((o, n) => { n.d = Math.max(q, +(o.d + dd).toFixed(4)); });
        lastLen = drag.anchor.d;
        app.changed(true);
      } else if (drag.kind === 'marquee') {
        drag.t1 = a.t; drag.y1 = a.cy;
        const ta = Math.min(drag.t0, drag.t1), tb = Math.max(drag.t0, drag.t1);
        const ia = Math.floor((Math.min(drag.y0, drag.y1) - RUL) / rowH), ib = Math.floor((Math.max(drag.y0, drag.y1) - RUL) / rowH);
        selN = new Set(drag.base);
        c.r.notes.forEach(n => { const i = rowOf(n.p); if (i >= ia && i <= ib && n.t < tb && n.t + n.d > ta) selN.add(n); });
        draw();
      } else if (drag.kind === 'paint') {
        const p = rows[a.i];
        if (p != null && a.t >= 0) paint(c, floorQ(a.t), p);
      } else if (drag.kind === 'vel') setVel(c, a);
    });
    function endDrag() {
      if (!drag) return;
      const c = cur(), d = drag;
      drag = null; scroll.style.cursor = '';
      if (!c) return;
      if (d.kind === 'draw' || d.moved || d.kind === 'paint') {
        fitRegion(c);
        c.r.notes.sort((x, y) => x.t - y.t || y.p - x.p);
        buildRows(c); size(c);
        app.changed();
      } else if (d.kind === 'move' && !d.moved && !d.orig.size) draw();
      else draw();
    }
    scroll.addEventListener('pointerup', endDrag);
    scroll.addEventListener('pointercancel', endDrag);
    scroll.addEventListener('dblclick', e => {
      const c = cur(), a = at(e);
      if (!c || drums || a.x < KEYW || a.y < RUL || a.y > scroll.clientHeight - VEL) return;
      const n = noteAt(c, a.t, a.i);
      if (!n) return;
      app.begin(); c.r.notes.splice(c.r.notes.indexOf(n), 1); selN.delete(n); app.changed();
    });
    function paint(c, cell, p) {
      const key = cell + '|' + p;
      if (drag.done.has(key)) return;
      drag.done.add(key);
      const i = c.r.notes.findIndex(n => n.p === p && n.t >= cell - 1e-6 && n.t < cell + q - 1e-6);
      if (drag.mode === 'erase') { if (i >= 0) { selN.delete(c.r.notes[i]); c.r.notes.splice(i, 1); } }
      else if (i < 0) { c.r.notes.push({ t: +cell.toFixed(4), d: 0.5, p, v: 0.8 }); hear(c, p); }
      app.changed(true);
    }
    function setVel(c, a) {
      const n = velNoteAt(c, a.t); if (!n) return;
      if (!drag.moved) { app.begin(); drag.moved = true; }
      const v = clamp(1 - (a.y - (scroll.clientHeight - VEL) - 4) / (VEL - 12), 0.05, 1);
      const targets = selN.has(n) && selN.size > 1 && !drag.single ? [...selN] : [n];
      if (targets.length > 1) { const dv = v - n.v; targets.forEach(x => { x.v = clamp(+(x.v + dv).toFixed(2), 0.05, 1); }); }
      else n.v = +v.toFixed(2);
      app.changed(true);
    }
    scroll.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const a = at(e), t = a.t;
      ppb = clamp(ppb * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 8, 240);
      const c = cur(); if (c) size(c);
      scroll.scrollLeft = Math.max(0, t * ppb - (a.x - KEYW));
      draw();
    }, { passive: false });
    scroll.addEventListener('scroll', draw);
    new ResizeObserver(draw).observe(scroll);

    /* ---------- 键盘（焦点在卷帘时） ---------- */
    function key(e) {
      const c = cur(); if (!c) return false;
      const k = e.key, mod = e.metaKey || e.ctrlKey;
      if ((k === 'Delete' || k === 'Backspace') && selN.size) {
        app.begin(); c.r.notes = c.r.notes.filter(n => !selN.has(n)); selN.clear(); app.changed(); return true;
      }
      if (mod && k.toLowerCase() === 'a') { selN = new Set(c.r.notes); draw(); return true; }
      if (k === 'Escape' && selN.size) { selN.clear(); draw(); return true; }
      if ((k === 'ArrowUp' || k === 'ArrowDown') && selN.size) {
        const dir = k === 'ArrowUp' ? 1 : -1;
        app.begin();
        selN.forEach(n => {
          if (e.shiftKey) n.p += 12 * dir;
          else if (drums) { const i = clamp(rowOf(n.p) - dir, 0, rows.length - 1); n.p = rows[i]; }
          else if (c.p.scaleLock) { let m = n.p + dir; while (!P.inScale(c.p, m) && Math.abs(m - n.p) < 12) m += dir; n.p = m; }
          else n.p += dir;
        });
        const a = [...selN][0]; hear(c, a.p, a.v);
        buildRows(c); size(c); app.changed(); return true;
      }
      if ((k === 'ArrowLeft' || k === 'ArrowRight') && selN.size) {
        const dt = (k === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 4 : q);
        app.begin(); selN.forEach(n => { n.t = Math.max(0, +(n.t + dt).toFixed(4)); }); fitRegion(c); app.changed(); return true;
      }
      if (!mod && k.toLowerCase() === 'q') { quantize(); return true; }
      return false;
    }
    function quantize() {
      const c = cur(); if (!c || !c.r.notes.length) return;
      const list = selN.size ? [...selN] : c.r.notes;
      app.begin();
      list.forEach(n => { n.t = Math.max(0, roundQ(n.t)); if (!drums) n.d = Math.max(q, roundQ(n.d)); });
      app.changed();
    }

    /* ---------- 工具栏 ---------- */
    $('#st-roll-q').addEventListener('change', e => { q = +e.target.value; draw(); });
    $('#st-roll-quant').addEventListener('click', quantize);
    $('#st-roll-zin').addEventListener('click', () => { ppb = clamp(ppb * 1.3, 8, 240); const c = cur(); if (c) size(c); draw(); });
    $('#st-roll-zout').addEventListener('click', () => { ppb = clamp(ppb / 1.3, 8, 240); const c = cur(); if (c) size(c); draw(); });
    $('#st-roll-loop').addEventListener('click', () => {
      const c = cur(); if (!c) return;
      app.project.loop = { on: true, start: c.r.start, end: c.r.start + c.r.length };
      app.changed();
    });
    $('#st-roll-close').addEventListener('click', () => show(false));
    /* 拖顶边调高度 */
    const grip = $('#st-roll-grip');
    grip.addEventListener('pointerdown', e => {
      const y0 = e.clientY, h0 = panel.offsetHeight;
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
      const mv = ev => { panel.style.height = clamp(h0 - (ev.clientY - y0), 140, window.innerHeight - 220) + 'px'; draw(); };
      const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); };
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
    });
    function show(on) { panel.hidden = !on; document.body.classList.toggle('st-roll-off', !on); if (on) open(); }
    const visible = () => !panel.hidden;

    return { open, draw, reset, key, show, visible };
  }

  root.Studio = root.Studio || {};
  root.Studio.makeRoll = makeRoll;
})(typeof window !== 'undefined' ? window : globalThis);
