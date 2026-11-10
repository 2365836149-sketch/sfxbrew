/* ============================================================================
   SFX Brew 音乐工作室 · 主界面
   ----------------------------------------------------------------------------
   布局：顶栏（走带、速度、调、撤销、导出）/ 左：音轨头 / 中：时间线（画布）/ 右：检查器 / 下：钢琴卷帘或鼓网格。
   时间线和卷帘都是"滚动容器 + 盖在上面的画布"：滚动容器只负责滚动条和尺寸，画布按滚动位置重画。
   所有修改都走 edit()/begin()+changed()：修改前存一份撤销快照，修改后通知播放器、自动保存、重画。
   ==========================================================================*/
(function () {
  'use strict';

  const DATA = JSON.parse(document.getElementById('studio-data').textContent);
  const T = DATA.i18n, LANG = DATA.lang;
  const S = window.Studio, P = S.project, Smart = S.smart;
  const sfx = makeSfx(), music = makeMusic(sfx);
  const insts = S.instruments.makeInstruments(music), player = S.player.makePlayer(sfx, insts);
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const NOTE = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteName = m => NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const pcName = m => NOTE[((m % 12) + 12) % 12];
  const instName = id => { const i = insts.get(id); return LANG === 'zh' ? i.zh : i.en; };
  const COLORS = { guqin: '#b5833a', pipa: '#b5523f', flute: '#3f7f9a', erhu: '#9a4a6a', bass: '#5f5a9a', violin: '#a8553a', viola: '#96633a', cello: '#7a4a2e', spic: '#8f5a4a', strings: '#a06a4e', pad: '#3d8a6e', drone: '#5d6b80', bell: '#b08d2e', chime: '#4f9aa5', drums: '#8a6440' };
  const color = id => COLORS[id] || '#8a8a8e';
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  const FONT = getComputedStyle(document.body).fontFamily;

  /* ---------- 状态 ---------- */
  let project = P.load();
  const hadSaved = !!(project && project.tracks.length);
  if (!project) project = P.newProject();
  const sel = { track: null, region: null };
  let cursor = 0, playPos = null, ppb = 20, focusArea = 'tl', drag = null;
  const hist = P.makeHistory(() => project, v => { project = P.sanitize(v); fixSel(); roll.reset(); refreshAll(); });

  /* ---------- 修改入口 ---------- */
  let saveTimer = 0, drawPending = false;
  function begin() { hist.push(); }
  function edit(fn) { hist.push(); fn(); changed(); }
  function changed(light) {
    player.update(project);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { setStatus(P.save(project) ? T.saved : T.saveFailed); }, 500);
    if (!light) { renderHeads(); renderInspector(); syncTop(); }
    drawSoon();
    updateUndo();
  }
  function drawSoon() {
    if (drawPending) return;
    drawPending = true;
    requestAnimationFrame(() => { drawPending = false; tlSize(); tlDraw(); roll.draw(); showTime(); });
  }
  function refreshAll() { renderHeads(); renderInspector(); syncTop(); roll.open(); drawSoon(); updateUndo(); }
  function fixSel() {
    if (sel.track && !P.findTrack(project, sel.track)) sel.track = null;
    if (sel.region && !P.findRegion(project, sel.region)) sel.region = null;
  }
  function select(trackId, regionId) {
    const changedSel = sel.track !== trackId || sel.region !== regionId;
    sel.track = trackId; sel.region = regionId;
    if (changedSel) { renderHeads(); renderInspector(); roll.open(); }
    drawSoon();
  }
  const anySolo = () => project.tracks.some(t => t.solo);
  const audible = t => !t.mute && (!anySolo() || t.solo);
  let statusTimer = 0;
  function setStatus(s) { const el = $('#st-status-msg'); el.textContent = s; clearTimeout(statusTimer); statusTimer = setTimeout(() => { el.textContent = ''; }, 2500); }

  /* ---------- 颜色（深浅色切换时重读） ---------- */
  let C = {};
  function readColors() {
    const cs = getComputedStyle(document.body), g = n => cs.getPropertyValue(n).trim();
    C = { bg: g('--st-bg'), head: g('--st-head'), row: g('--st-row'), rowAlt: g('--st-row-alt'), rowSel: g('--st-row-sel'), line: g('--st-line'), line2: g('--st-line-2'),
      ink: g('--ink'), ink2: g('--ink-2'), accent: g('--accent'), shade: g('--st-shade'), loop: g('--st-loop'), loopOff: g('--st-loop-off'), loopShade: g('--st-loop-shade'),
      playhead: g('--st-playhead'), sec: g('--st-sec'), out: g('--st-out') };
  }
  readColors();
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); drawSoon(); });
  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fitCanvas(cv, W, H) {
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g;
  }

  /* ---------- 走带 ---------- */
  const spb = () => 60 / project.tempo;
  const playhead = () => (player.isPlaying() && playPos != null ? playPos : cursor);
  function setCursor(b) {
    cursor = clamp(b, 0, P.lengthBeats(project));
    if (player.isPlaying()) play(); else drawSoon();
  }
  function play() {
    playPos = null;
    player.play(project, cursor);
    $('#st-play').classList.add('on'); $('#st-play').setAttribute('aria-label', T.stop);
    requestAnimationFrame(frame);
  }
  function stop() {
    const pos = player.position();
    player.stop();
    if (pos != null) cursor = pos;
    stopped();
  }
  function stopped() { playPos = null; $('#st-play').classList.remove('on'); $('#st-play').setAttribute('aria-label', T.play); drawSoon(); }
  player.onEnd(() => { cursor = 0; stopped(); });
  const toggle = () => (player.isPlaying() ? stop() : play());
  function frame() {
    if (!player.isPlaying()) return;
    const pos = player.position();
    if (pos != null) {
      playPos = pos;
      const x = pos * ppb - tlScroll.scrollLeft, W = tlScroll.clientWidth;
      if (x > W * 0.92 || x < 0) tlScroll.scrollLeft = Math.max(0, pos * ppb - W * 0.15);
    }
    tlDraw(); roll.draw(); showTime();
    requestAnimationFrame(frame);
  }
  function showTime() {
    const b = playhead(), sec = b * spb();
    $('#st-bar').textContent = (Math.floor(b / 4) + 1) + '.' + (Math.floor(b % 4) + 1);
    $('#st-time').textContent = Math.floor(sec / 60) + ':' + (sec % 60).toFixed(1).padStart(4, '0');
  }

  /* ============================================================================
     时间线
     ==========================================================================*/
  const ROW = 56, LOOP_H = 14, BARS_H = 20, SEC_H = 18, CHORD_H = 20, TOP = LOOP_H + BARS_H + SEC_H + CHORD_H;
  const tlScroll = $('#st-tl'), tlCv = $('#st-tl-cv'), tlSizer = $('#st-tl-sizer');
  const snapStep = e => (e && e.shiftKey ? 0.25 : ppb >= 14 ? 1 : 4);
  const snap = (b, step) => Math.round(b / step) * step;
  function tlSize() {
    tlSizer.style.width = Math.ceil((P.lengthBeats(project) + 64) * ppb) + 'px';
    tlSizer.style.height = (TOP + (project.tracks.length + 1) * ROW) + 'px';
  }
  const SEC_NAME = n => (T.sections[n] || n);
  function chordSpans() {
    const end = P.lengthBeats(project), cs = project.chords.slice().sort((a, b) => a.beat - b.beat);
    return cs.map((c, i) => ({ beat: c.beat, end: i + 1 < cs.length ? cs[i + 1].beat : end, degree: c.degree }));
  }
  /* 和弦标签：根音名 + 性质（m 小三、° 减三）；五声叠置和弦只写根音 */
  function chordLabel(deg) {
    const q = Smart.chordQuality(project, deg);
    return pcName(Smart.chordMidi(project, deg)[0]) + (q === 'dim' ? '°' : q);
  }

  function tlDraw() {
    const W = tlScroll.clientWidth, H = tlScroll.clientHeight;
    if (!W || !H) return;
    const g = fitCanvas(tlCv, W, H), sx = tlScroll.scrollLeft, sy = tlScroll.scrollTop, X = b => b * ppb - sx;
    const b0 = Math.max(0, Math.floor(sx / ppb)), b1 = Math.ceil((sx + W) / ppb), end = P.lengthBeats(project), L = project.loop;
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);

    /* 音轨行 */
    g.save(); g.beginPath(); g.rect(0, TOP, W, H - TOP); g.clip();
    project.tracks.forEach((t, i) => {
      const y = TOP + i * ROW - sy; if (y > H || y + ROW < TOP) return;
      g.fillStyle = t.id === sel.track ? C.rowSel : i % 2 ? C.rowAlt : C.row; g.fillRect(0, y, W, ROW);
      g.fillStyle = C.line; g.fillRect(0, y + ROW - 1, W, 1);
    });
    if (X(end) < W) { g.fillStyle = C.shade; g.fillRect(Math.max(0, X(end)), TOP, W, H - TOP); }
    for (let b = b0; b <= b1; b++) {
      const bar = b % 4 === 0;
      if (!bar && ppb < 10) continue;
      if (bar && ppb < 5 && (b / 4) % 4) continue;
      g.fillStyle = bar ? C.line2 : C.line; g.fillRect(Math.round(X(b)), TOP, 1, H - TOP);
    }
    if (L.on && L.end > L.start) { g.fillStyle = C.loopShade; g.fillRect(X(L.start), TOP, (L.end - L.start) * ppb, H - TOP); }
    project.tracks.forEach((t, i) => {
      const y = TOP + i * ROW - sy; if (y > H || y + ROW < TOP) return;
      t.regions.forEach(r => drawRegion(g, t, r, X(r.start), y + 3, r.length * ppb, ROW - 7, W));
    });
    g.restore();

    /* 标尺：循环条 / 小节号 / 段落 / 和弦 */
    g.fillStyle = C.head; g.fillRect(0, 0, W, TOP);
    if (L.end > L.start) {
      g.fillStyle = L.on ? C.loop : C.loopOff;
      roundRect(g, X(L.start) + 0.5, 3, (L.end - L.start) * ppb - 1, LOOP_H - 6, 3); g.fill();
    }
    g.font = '11px ' + FONT; g.textBaseline = 'middle';
    const every = ppb * 4 >= 34 ? 1 : ppb * 4 >= 16 ? 2 : 4;
    for (let b = b0 - (b0 % 4); b <= b1; b += 4) {
      const x = Math.round(X(b)), bar = b / 4;
      g.fillStyle = C.line2; g.fillRect(x, LOOP_H, 1, BARS_H);
      if (bar % every === 0) { g.fillStyle = C.ink2; g.fillText(String(bar + 1), x + 4, LOOP_H + BARS_H / 2 + 1); }
      if (ppb >= 10) for (let k = 1; k < 4; k++) { g.fillStyle = C.line2; g.fillRect(Math.round(X(b + k)), LOOP_H + BARS_H - 5, 1, 5); }
    }
    const ySec = LOOP_H + BARS_H;
    project.sections.forEach(s => {
      const x = X(s.bar * 4), w = s.bars * 4 * ppb;
      if (x > W || x + w < 0) return;
      g.fillStyle = C.sec; roundRect(g, x + 1, ySec + 2, w - 2, SEC_H - 4, 3); g.fill();
      g.save(); g.beginPath(); g.rect(x + 1, ySec, w - 2, SEC_H); g.clip();
      g.fillStyle = C.ink; g.fillText(SEC_NAME(s.name), Math.max(x, 0) + 6, ySec + SEC_H / 2 + 1); g.restore();
    });
    const yCh = ySec + SEC_H;
    chordSpans().forEach(c => {
      const x = X(c.beat), w = (c.end - c.beat) * ppb;
      if (x > W || x + w < 0) return;
      g.fillStyle = C.line2; g.fillRect(Math.round(x), yCh + 3, 1, CHORD_H - 6);
      if (w > 14) { g.fillStyle = C.ink2; g.fillText(chordLabel(c.degree), x + 5, yCh + CHORD_H / 2 + 1); }
    });
    g.fillStyle = C.line2; g.fillRect(0, TOP - 1, W, 1);
    g.fillRect(0, LOOP_H - 0.5, W, 0.5);

    /* 播放头 */
    const ph = X(playhead());
    if (ph >= -1 && ph <= W + 1) {
      g.fillStyle = C.playhead; g.fillRect(Math.round(ph) - 0.5, LOOP_H, 1.5, H);
      g.beginPath(); g.moveTo(ph - 5, LOOP_H); g.lineTo(ph + 5, LOOP_H); g.lineTo(ph, LOOP_H + 7); g.closePath(); g.fill();
    }
  }
  function drawRegion(g, t, r, x, y, w, h, W) {
    if (x > W || x + w < 0) return;
    const col = color(t.instrument), on = r.id === sel.region;
    g.globalAlpha = audible(t) ? 1 : 0.4;
    roundRect(g, x + 0.5, y + 0.5, w - 1, h - 1, 5);
    g.fillStyle = hexA(col, on ? 0.5 : 0.3); g.fill();
    g.lineWidth = on ? 2 : 1; g.strokeStyle = on ? C.ink : hexA(col, 0.95); g.stroke();
    g.save(); roundRect(g, x + 1, y + 1, w - 2, h - 2, 5); g.clip();
    g.fillStyle = C.ink; g.font = '600 11px ' + FONT; g.textBaseline = 'middle';
    g.fillText(t.name || instName(t.instrument), Math.max(x, 0) + 6, y + 9);
    const ns = r.notes;
    if (ns.length) {
      let lo = 127, hi = 0;
      ns.forEach(n => { lo = Math.min(lo, n.p); hi = Math.max(hi, n.p); });
      const span = Math.max(10, hi - lo), top = y + 18, hh = h - 23;
      g.fillStyle = C.ink; g.globalAlpha *= 0.7;
      ns.forEach(n => {
        if (n.t >= r.length) return;
        const nx = x + n.t * ppb, nw = Math.max(1.5, Math.min(n.d, r.length - n.t) * ppb - 1);
        if (nx > W || nx + nw < 0) return;
        g.fillRect(nx, top + ((hi - n.p) / span) * hh, nw, 2.5);
      });
    }
    g.restore();
    g.globalAlpha = 1;
  }

  /* ---------- 时间线鼠标操作 ---------- */
  function local(e, el) {
    const rc = el.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
    return { x, y, inside: x >= 0 && y >= 0 && x < el.clientWidth && y < el.clientHeight };
  }
  function regionAt(t, beat) {
    for (let i = t.regions.length - 1; i >= 0; i--) { const r = t.regions[i]; if (beat >= r.start && beat < r.start + r.length) return r; }
    return null;
  }
  const rowAt = y => Math.floor((y - TOP + tlScroll.scrollTop) / ROW);
  tlScroll.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const { x, y, inside } = local(e, tlScroll);
    if (!inside) return;
    focusArea = 'tl';
    const beat = (x + tlScroll.scrollLeft) / ppb;
    if (y < LOOP_H) drag = { kind: 'loop', a: snap(beat, 4), moved: false };
    else if (y < TOP) { drag = { kind: 'scrub' }; setCursor(snap(beat, snapStep(e))); }
    else {
      const t = project.tracks[rowAt(y)];
      if (!t) { select(null, null); return; }
      const r = regionAt(t, beat);
      if (r) {
        const right = (r.start + r.length) * ppb - tlScroll.scrollLeft;
        drag = { kind: x > right - 8 && r.length * ppb > 16 ? 'resize' : 'move', region: r, track: t, startBeat: beat, start: r.start, length: r.length, copy: e.altKey, moved: false };
        select(t.id, r.id);
      } else { drag = null; select(t.id, null); }
    }
    try { tlScroll.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
  });
  tlScroll.addEventListener('pointermove', e => {
    const { x, y } = local(e, tlScroll), beat = Math.max(0, (x + tlScroll.scrollLeft) / ppb);
    if (!drag) {
      /* 光标形状：片段右边缘显示"拉伸" */
      let cur = '';
      if (y >= TOP) {
        const t = project.tracks[rowAt(y)], r = t && regionAt(t, beat);
        if (r) cur = x > (r.start + r.length) * ppb - tlScroll.scrollLeft - 8 ? 'ew-resize' : 'grab';
      }
      tlScroll.style.cursor = cur;
      return;
    }
    if (drag.kind === 'loop') {
      const b = snap(beat, 4);
      if (b === drag.a && !drag.moved) return;
      drag.moved = true;
      const L = project.loop;
      L.start = Math.min(drag.a, b); L.end = Math.max(drag.a, b); if (L.end === L.start) L.end = L.start + 4;
      L.on = true; changed(true); syncTop();
    } else if (drag.kind === 'scrub') setCursor(snap(beat, snapStep(e)));
    else if (drag.kind === 'move') {
      const d = snap(beat - drag.startBeat, snapStep(e)), row = clamp(rowAt(y), 0, project.tracks.length - 1), target = project.tracks[row];
      if (!drag.moved && d === 0 && target === drag.track) return;
      if (!drag.moved) {
        begin(); drag.moved = true;
        if (drag.copy) drag.track.regions.push(P.newRegion(drag.start, drag.length, JSON.parse(JSON.stringify(drag.region.notes))));
      }
      drag.region.start = Math.max(0, drag.start + d);
      if (target !== drag.track) {
        drag.track.regions.splice(drag.track.regions.indexOf(drag.region), 1);
        target.regions.push(drag.region); drag.track = target; sel.track = target.id;
      }
      tlScroll.style.cursor = 'grabbing';
      changed(true);
    } else if (drag.kind === 'resize') {
      const len = Math.max(1, drag.length + snap(beat - drag.startBeat, snapStep(e)));
      if (len === drag.region.length) return;
      if (!drag.moved) { begin(); drag.moved = true; }
      drag.region.length = len; changed(true);
    }
  });
  function endDrag() {
    if (!drag) return;
    if (drag.kind === 'loop' && !drag.moved) { project.loop.on = !project.loop.on; changed(true); syncTop(); }
    else if (drag.moved) { changed(); roll.open(); }
    drag = null; tlScroll.style.cursor = '';
  }
  tlScroll.addEventListener('pointerup', endDrag);
  tlScroll.addEventListener('pointercancel', endDrag);
  tlScroll.addEventListener('dblclick', e => {
    const { x, y, inside } = local(e, tlScroll);
    if (!inside || y < TOP) return;
    const t = project.tracks[rowAt(y)];
    if (!t) return;
    const beat = (x + tlScroll.scrollLeft) / ppb;
    if (regionAt(t, beat)) { roll.show(true); return; }
    let r;
    edit(() => { r = P.newRegion(Math.floor(beat / 4) * 4, 16, []); t.regions.push(r); });
    select(t.id, r.id); roll.show(true);
  });
  tlScroll.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const { x } = local(e, tlScroll), beat = (x + tlScroll.scrollLeft) / ppb;
    zoomTo(ppb * (e.deltaY < 0 ? 1.15 : 1 / 1.15), beat, x);
  }, { passive: false });
  function zoomTo(v, beat, x) {
    ppb = clamp(v, 3, 120);
    tlSize();
    if (beat != null) tlScroll.scrollLeft = Math.max(0, beat * ppb - x);
    drawSoon();
  }
  tlScroll.addEventListener('scroll', () => { $('#st-heads-in').style.transform = 'translateY(' + (-tlScroll.scrollTop) + 'px)'; drawSoon(); });
  $('#st-heads').addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 0) { tlScroll.scrollTop += e.deltaY; } }, { passive: true });

  /* ============================================================================
     音轨头
     ==========================================================================*/
  function renderHeads() {
    const box = $('#st-heads-list');
    box.innerHTML = project.tracks.map(t => `<div class="st-th${t.id === sel.track ? ' sel' : ''}${audible(t) ? '' : ' off'}" data-id="${t.id}" style="--c:${color(t.instrument)}">
  <div class="st-th-top"><input class="st-th-name" value="${esc(t.name)}" placeholder="${esc(instName(t.instrument))}" spellcheck="false" aria-label="${esc(T.trackName)}">
  <button class="st-ms m${t.mute ? ' on' : ''}" title="${esc(T.mute)}" aria-pressed="${t.mute}">M</button><button class="st-ms s${t.solo ? ' on' : ''}" title="${esc(T.solo)}" aria-pressed="${t.solo}">S</button></div>
  <div class="st-th-bot"><span class="st-th-inst">${esc(instName(t.instrument))}</span>
  <input type="range" class="st-vol" min="0" max="1" step="0.01" value="${t.volume}" title="${esc(T.volume)}" aria-label="${esc(T.volume)}">
  <input type="range" class="st-pan" min="-1" max="1" step="0.05" value="${t.pan}" title="${esc(T.pan)}" aria-label="${esc(T.pan)}"></div>
</div>`).join('');
    $$('.st-th', box).forEach(el => {
      const t = P.findTrack(project, el.dataset.id);
      el.addEventListener('pointerdown', e => { if (!e.target.closest('input,button')) { focusArea = 'tl'; select(t.id, null); } });
      $('.st-th-name', el).addEventListener('focus', () => { if (sel.track !== t.id) { sel.track = t.id; sel.region = null; renderInspector(); roll.open(); drawSoon(); $$('.st-th', box).forEach(x => x.classList.toggle('sel', x === el)); } });
      $('.st-th-name', el).addEventListener('change', e => edit(() => { t.name = e.target.value.trim(); }));
      $('.m', el).addEventListener('click', () => { t.mute = !t.mute; changed(); });
      $('.s', el).addEventListener('click', () => { t.solo = !t.solo; changed(); });
      $('.st-vol', el).addEventListener('input', e => { t.volume = +e.target.value; changed(true); syncInspector(); });
      $('.st-pan', el).addEventListener('input', e => { t.pan = +e.target.value; changed(true); syncInspector(); });
      $('.st-pan', el).addEventListener('dblclick', e => { t.pan = 0; e.target.value = 0; changed(true); });
    });
  }
  /* 添加音轨 */
  const addMenu = $('#st-add-menu');
  addMenu.innerHTML = insts.list.map(i => `<button data-inst="${i.id}" style="--c:${color(i.id)}"><i></i>${esc(LANG === 'zh' ? i.zh : i.en)}</button>`).join('');
  $('#st-add').addEventListener('click', e => { e.stopPropagation(); togglePop(addMenu, $('#st-add')); });
  $$('button', addMenu).forEach(b => b.addEventListener('click', () => {
    closePops();
    const t = P.newTrack(b.dataset.inst, ''), r = P.newRegion(Math.floor(cursor / 4) * 4, 16, []);
    const mx = insts.mixOf(b.dataset.inst);          /* 新音轨先放在这件乐器惯常的位置上 */
    t.pan = mx.pan; t.reverb = mx.reverb;
    t.regions.push(r);
    if (b.dataset.inst === 'drums') t.drummer = null;
    edit(() => { project.tracks.push(t); });
    select(t.id, r.id); roll.show(true);
    tlScroll.scrollTop = tlScroll.scrollHeight;
  }));

  /* ============================================================================
     检查器
     ==========================================================================*/
  function renderInspector() {
    const box = $('#st-insp'), t = sel.track && P.findTrack(project, sel.track), f = sel.region && P.findRegion(project, sel.region);
    if (!t) {
      box.innerHTML = `<h3>${esc(T.project)}</h3>
<label class="st-f"><span>${esc(T.songBars)}</span><input id="i-bars" type="number" min="1" max="512" value="${project.bars}"></label>
<p class="st-hint">${esc(T.inspEmpty)}</p>
<h3>${esc(T.shortcuts)}</h3><dl class="st-keys">${T.keys.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
      $('#i-bars').addEventListener('change', e => edit(() => { project.bars = clamp(Math.round(+e.target.value || 1), 1, 512); }));
      return;
    }
    const opts = insts.list.map(i => `<option value="${i.id}"${i.id === t.instrument ? ' selected' : ''}>${esc(LANG === 'zh' ? i.zh : i.en)}</option>`).join('');
    const nNotes = t.regions.reduce((a, r) => a + r.notes.length, 0);
    let html = `<h3><i class="st-dot" style="--c:${color(t.instrument)}"></i>${esc(t.name || instName(t.instrument))}</h3>
<label class="st-f"><span>${esc(T.instrument)}</span><select id="i-inst">${opts}</select></label>
<label class="st-f"><span>${esc(T.volume)} <b id="i-vol-v">${Math.round(t.volume * 100)}</b></span><input id="i-vol" type="range" min="0" max="1" step="0.01" value="${t.volume}"></label>
<label class="st-f"><span>${esc(T.pan)} <b id="i-pan-v">${panText(t.pan)}</b></span><input id="i-pan" type="range" min="-1" max="1" step="0.05" value="${t.pan}"></label>
<label class="st-f"><span>${esc(T.reverb)} <b id="i-rev-v">${Math.round(t.reverb * 100)}</b></span><input id="i-rev" type="range" min="0" max="1" step="0.01" value="${t.reverb}"></label>
<p class="st-hint">${esc(fmt(T.trackInfo, { regions: t.regions.length, notes: nNotes }))}</p>
<div class="st-btns"><button id="i-dup-t" class="st-btn">${esc(T.dupTrack)}</button><button id="i-del-t" class="st-btn danger">${esc(T.delTrack)}</button></div>`;
    if (f) {
      const r = f.region;
      html += `<h3>${esc(T.region)}</h3>
<div class="st-row2"><label class="st-f"><span>${esc(T.regionStart)}</span><input id="i-rs" type="number" min="1" step="1" value="${+(r.start / 4 + 1).toFixed(2)}"></label>
<label class="st-f"><span>${esc(T.regionLen)}</span><input id="i-rl" type="number" min="0.25" step="1" value="${+(r.length / 4).toFixed(2)}"></label></div>
<p class="st-hint">${esc(fmt(T.regionInfo, { notes: r.notes.length }))}</p>
<div class="st-btns"><button id="i-dup-r" class="st-btn">${esc(T.dupRegion)}</button><button id="i-loop-r" class="st-btn">${esc(T.loopRegion)}</button><button id="i-del-r" class="st-btn danger">${esc(T.delRegion)}</button></div>`;
    }
    box.innerHTML = html;
    $('#i-inst').addEventListener('change', e => { edit(() => { t.instrument = e.target.value; }); roll.open(); });
    const slide = (id, key, show) => {
      $(id).addEventListener('input', e => { t[key] = +e.target.value; $(id + '-v').textContent = show(t[key]); changed(true); syncHeads(); });
    };
    slide('#i-vol', 'volume', v => Math.round(v * 100));
    slide('#i-pan', 'pan', panText);
    slide('#i-rev', 'reverb', v => Math.round(v * 100));
    $('#i-dup-t').addEventListener('click', duplicateTrack);
    $('#i-del-t').addEventListener('click', deleteTrack);
    if (f) {
      const r = f.region;
      $('#i-rs').addEventListener('change', e => edit(() => { r.start = Math.max(0, (+e.target.value - 1) * 4); }));
      $('#i-rl').addEventListener('change', e => edit(() => { r.length = Math.max(1, +e.target.value * 4); }));
      $('#i-dup-r').addEventListener('click', duplicateRegion);
      $('#i-del-r').addEventListener('click', deleteRegion);
      $('#i-loop-r').addEventListener('click', loopRegion);
    }
  }
  const panText = v => (Math.abs(v) < 0.03 ? T.center : (v < 0 ? T.left : T.right) + ' ' + Math.round(Math.abs(v) * 100));
  function syncInspector() {
    const t = sel.track && P.findTrack(project, sel.track);
    if (!t || !$('#i-vol')) return;
    $('#i-vol').value = t.volume; $('#i-vol-v').textContent = Math.round(t.volume * 100);
    $('#i-pan').value = t.pan; $('#i-pan-v').textContent = panText(t.pan);
  }
  function syncHeads() {
    $$('.st-th').forEach(el => {
      const t = P.findTrack(project, el.dataset.id); if (!t) return;
      $('.st-vol', el).value = t.volume; $('.st-pan', el).value = t.pan;
    });
  }

  /* ---------- 轨道 / 片段操作 ---------- */
  function deleteTrack() {
    const t = sel.track && P.findTrack(project, sel.track); if (!t) return;
    edit(() => { project.tracks.splice(project.tracks.indexOf(t), 1); });
    select(null, null);
  }
  function duplicateTrack() {
    const t = sel.track && P.findTrack(project, sel.track); if (!t) return;
    const c = JSON.parse(JSON.stringify(t));
    c.id = P.uid('t'); c.name = (t.name || instName(t.instrument)) + ' 2'; c.solo = false;
    c.regions.forEach(r => { r.id = P.uid('r'); });
    edit(() => { project.tracks.splice(project.tracks.indexOf(t) + 1, 0, c); });
    select(c.id, null);
  }
  function deleteRegion() {
    const f = sel.region && P.findRegion(project, sel.region); if (!f) return;
    edit(() => { f.track.regions.splice(f.track.regions.indexOf(f.region), 1); });
    select(f.track.id, null);
  }
  function duplicateRegion() {
    const f = sel.region && P.findRegion(project, sel.region); if (!f) return;
    const r = f.region, c = P.newRegion(r.start + r.length, r.length, JSON.parse(JSON.stringify(r.notes)));
    edit(() => { f.track.regions.push(c); });
    select(f.track.id, c.id);
  }
  function loopRegion() {
    const f = sel.region && P.findRegion(project, sel.region); if (!f) return;
    project.loop = { on: true, start: f.region.start, end: f.region.start + f.region.length };
    changed(); syncTop();
  }

  /* ============================================================================
     顶栏
     ==========================================================================*/
  const ROOTS = [[48, 'C'], [49, 'C♯'], [50, 'D'], [51, 'E♭'], [52, 'E'], [53, 'F'], [54, 'F♯'], [55, 'G'], [44, 'A♭'], [45, 'A'], [46, 'B♭'], [47, 'B']];
  $('#st-root').innerHTML = ROOTS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  $('#st-mode').innerHTML = Object.keys(P.MODES).map(m => `<option value="${m}">${esc(T.modes[m])}</option>`).join('');
  function syncTop() {
    $('#st-title').value = project.title || '';
    $('#st-tempo').value = project.tempo;
    const rootPc = ((project.root % 12) + 12) % 12;
    $('#st-root').value = String(ROOTS.find(r => r[0] % 12 === rootPc)[0]);
    $('#st-mode').value = project.mode;
    $('#st-lock').classList.toggle('on', !!project.scaleLock); $('#st-lock').setAttribute('aria-pressed', !!project.scaleLock);
    $('#st-loop').classList.toggle('on', !!project.loop.on); $('#st-loop').setAttribute('aria-pressed', !!project.loop.on);
  }
  function updateUndo() { $('#st-undo').disabled = !hist.canUndo(); $('#st-redo').disabled = !hist.canRedo(); }
  const melodic = t => insts.get(t.instrument).kind !== 'drums';
  $('#st-title').addEventListener('change', e => edit(() => { project.title = e.target.value.trim(); }));
  $('#st-tempo').addEventListener('change', e => edit(() => { project.tempo = clamp(Math.round(+e.target.value || 90), 30, 240); }));
  /* 换主音：有音高的轨整体移调（取最近的方向） */
  $('#st-root').addEventListener('change', e => {
    const newPc = +e.target.value % 12, oldPc = ((project.root % 12) + 12) % 12;
    let d = (newPc - oldPc + 12) % 12; if (d > 6) d -= 12;
    edit(() => {
      project.root += d;
      project.tracks.filter(melodic).forEach(t => t.regions.forEach(r => r.notes.forEach(n => { n.p += d; })));
    });
  });
  /* 换调式：音阶内的音按级数换到新调式的同一级（不在音阶里的音不动） */
  $('#st-mode').addEventListener('change', e => {
    const from = P.scaleOf(project), to = P.MODES[e.target.value];
    edit(() => {
      project.tracks.filter(melodic).forEach(t => t.regions.forEach(r => r.notes.forEach(n => {
        const rel = n.p - project.root, o = Math.floor(rel / 12), i = from.indexOf(((rel % 12) + 12) % 12);
        if (i >= 0) n.p = project.root + o * 12 + to[i];
      })));
      project.mode = e.target.value;
    });
    roll.open();
  });
  $('#st-lock').addEventListener('click', () => { project.scaleLock = !project.scaleLock; changed(); roll.open(); });
  $('#st-loop').addEventListener('click', () => {
    const L = project.loop;
    if (!(L.end > L.start)) { L.start = 0; L.end = Math.min(16, P.lengthBeats(project)); }
    L.on = !L.on; changed(); syncTop();
  });
  $('#st-play').addEventListener('click', toggle);
  $('#st-home').addEventListener('click', () => setCursor(0));
  $('#st-metro').addEventListener('click', e => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', on); player.setMetronome(on); });
  $('#st-undo').addEventListener('click', () => hist.undo());
  $('#st-redo').addEventListener('click', () => hist.redo());
  $('#st-zin').addEventListener('click', () => zoomTo(ppb * 1.3, playhead(), playhead() * ppb - tlScroll.scrollLeft));
  $('#st-zout').addEventListener('click', () => zoomTo(ppb / 1.3, playhead(), playhead() * ppb - tlScroll.scrollLeft));

  /* ---------- 弹出菜单 ---------- */
  function togglePop(pop, anchor) {
    const open = pop.hidden;
    closePops();
    if (!open) return;
    pop.hidden = false;
    const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth;
    pop.style.left = clamp(r.left, 8, window.innerWidth - pw - 8) + 'px';
    pop.style.top = (r.bottom + 4) + 'px';
  }
  function closePops() { $$('.st-pop').forEach(p => { p.hidden = true; }); }
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.st-pop, [data-pop]')) closePops(); });

  /* ============================================================================
     导出 / 打开
     ==========================================================================*/
  const fileBase = () => (project.title || 'sfxbrew-song').replace(/[\\/:*?"<>|]+/g, '').trim() || 'sfxbrew-song';
  let busy = false;
  async function withBusy(fn) {
    if (busy) return;
    busy = true; closePops(); setStatus(T.rendering); document.body.classList.add('st-busy');
    try { await fn(); setStatus(T.exported); } catch (err) { console.error(err); setStatus(T.exportFailed); } finally { busy = false; document.body.classList.remove('st-busy'); }
  }
  const hasNotes = () => project.tracks.some(t => t.regions.some(r => r.notes.length));
  $('#st-export').addEventListener('click', e => { e.stopPropagation(); togglePop($('#st-export-menu'), $('#st-export')); $('#x-loop').disabled = !(project.loop.end > project.loop.start); });
  $('#x-song').addEventListener('click', () => withBusy(async () => {
    if (!hasNotes()) throw new Error('empty');
    const r = await player.render(project, { sampleRate: 44100, tail: 4 });
    SFXB.download(SFXB.wavMulti(SFXB.trimChannels(r.channels, r.sampleRate), r.sampleRate), fileBase() + '.wav', 'audio/wav');
  }));
  /* 循环区：多渲染一段尾音，再把尾音叠回开头，循环播放就没有断口 */
  $('#x-loop').addEventListener('click', () => withBusy(async () => {
    const L = project.loop, r = await player.render(project, { from: L.start, to: L.end, sampleRate: 44100, tail: 4 });
    const n = Math.round((L.end - L.start) * spb() * r.sampleRate);
    const out = r.channels.map(c => { const o = new Float32Array(n); for (let i = 0; i < c.length; i++) o[i % n] += c[i]; return o; });
    SFXB.download(SFXB.wavMulti(out, r.sampleRate), fileBase() + '-loop-bars' + (L.start / 4 + 1) + '-' + (L.end / 4) + '.wav', 'audio/wav');
  }));
  $('#x-stems').addEventListener('click', () => withBusy(async () => {
    const files = [], used = {};
    for (let i = 0; i < project.tracks.length; i++) {
      const t = project.tracks[i];
      if (!t.regions.some(r => r.notes.length)) continue;
      setStatus(fmt(T.renderingStem, { i: i + 1, n: project.tracks.length }));
      const r = await player.render(project, { sampleRate: 44100, tail: 4, tracks: [t.id] });
      let name = String(i + 1).padStart(2, '0') + '-' + (t.name || instName(t.instrument)).replace(/[\\/:*?"<>|]+/g, '');
      if (used[name]) name += '-' + i; used[name] = 1;
      files.push({ name: name + '.wav', data: SFXB.wavMulti(r.channels, r.sampleRate, false) });
    }
    if (!files.length) throw new Error('empty');
    SFXB.downloadBlob(SFXB.zip(files), fileBase() + '-stems.zip');
  }));
  $('#x-save').addEventListener('click', () => {
    closePops();
    SFXB.download(new TextEncoder().encode(JSON.stringify(project, null, 1)), fileBase() + '.sfxbrew.json', 'application/json');
  });
  $('#x-open').addEventListener('click', () => { closePops(); $('#st-file').click(); });
  $('#st-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const p = P.sanitize(JSON.parse(await f.text()));
      loadProject(p);
      setStatus(fmt(T.opened, { name: f.name }));
    } catch (err) { setStatus(T.openFailed); }
  });
  function loadProject(p) {
    if (player.isPlaying()) stop();
    if (project.tracks.length) hist.push(); else hist.clear();
    project = p; cursor = 0; sel.track = null; sel.region = null;
    roll.reset(); tlScroll.scrollLeft = 0; tlScroll.scrollTop = 0;
    hideStart(); changed();
    roll.open();
  }

  /* ============================================================================
     开始面板：按情绪生成 / 空白项目 / 打开文件
     ==========================================================================*/
  const start = $('#st-start');
  function showStart() { $('#st-start-resume').hidden = !project.tracks.length; start.hidden = false; }
  function hideStart() { start.hidden = true; }
  $('#st-new').addEventListener('click', showStart);
  $$('[data-mood]', start).forEach(b => b.addEventListener('click', () => {
    const p = Smart.fromMood(music, b.dataset.mood, 1 + Math.floor(Math.random() * 99999), LANG);
    p.title = b.querySelector('b').textContent;
    loadProject(p);
    const f = p.tracks[0] && p.tracks[0].regions[0];
    if (f) select(p.tracks[0].id, f.id);
    play();
  }));
  $('#st-blank').addEventListener('click', () => {
    const p = P.newProject(), t = P.newTrack('guqin', ''), r = P.newRegion(0, 16, []);
    t.regions.push(r); p.tracks.push(t);
    loadProject(p); select(t.id, r.id); roll.show(true);
  });
  $('#st-start-open').addEventListener('click', () => $('#st-file').click());
  $('#st-start-resume').addEventListener('click', hideStart);
  $('#st-start-close').addEventListener('click', hideStart);

  /* ============================================================================
     键盘快捷键
     ==========================================================================*/
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' && !['range', 'checkbox', 'button'].includes(e.target.type) || tag === 'textarea' || tag === 'select') return;
    const mod = e.metaKey || e.ctrlKey, k = e.key;
    if (k === 'Escape') { closePops(); if (!start.hidden && project.tracks.length) hideStart(); }
    if (!start.hidden) return;
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) hist.redo(); else hist.undo(); return; }
    if (mod && k.toLowerCase() === 'y') { e.preventDefault(); hist.redo(); return; }
    if (focusArea === 'roll' && roll.key(e)) { e.preventDefault(); return; }
    if (k === ' ') { e.preventDefault(); toggle(); }
    else if (k === 'Enter' || k === 'Home') { e.preventDefault(); setCursor(0); }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); if (sel.region) deleteRegion(); else if (sel.track) deleteTrack(); }
    else if (mod && k.toLowerCase() === 'd') { e.preventDefault(); duplicateRegion(); }
    else if (!mod && k.toLowerCase() === 'c') $('#st-loop').click();
    else if (!mod && k.toLowerCase() === 'k') $('#st-metro').click();
    else if (!mod && k.toLowerCase() === 'e') roll.show(!roll.visible());
    else if (!mod && (k === '=' || k === '+')) $('#st-zin').click();
    else if (!mod && k === '-') $('#st-zout').click();
  });

  /* ============================================================================
     卷帘 / 鼓网格（studio/roll.js）
     ==========================================================================*/
  const roll = S.makeRoll({
    get project() { return project; }, sel, insts, P, T, LANG, C: () => C, color, hexA, roundRect, fitCanvas, noteName, FONT,
    begin, changed, playhead, setCursor, local,
    focus: a => { focusArea = a; },
    audition: (inst, p, v, beats) => player.audition(inst, p, v, beats)
  });

  /* ---------- 启动 ---------- */
  new ResizeObserver(drawSoon).observe(tlScroll);
  refreshAll();
  if (!hadSaved) showStart();
  else setStatus(T.restored);
  window.addEventListener('beforeunload', () => { P.save(project); });
  window.SFXStudio = { get project() { return project; }, player, sel, select, edit, hist, roll };
})();
