/* ============================================================================
   SFX Brew 音乐工作室 · 项目数据
   ----------------------------------------------------------------------------
   一首曲子 = 一个 project（纯 JSON）。时间单位全部用"拍"（四分音符），4 拍一小节。
     tracks[].regions[]：片段，start/length 以拍计；notes[].t 是相对片段开头的拍数，d 是时值（拍），
     p 是 MIDI 音高（60 = 中央 C），v 是力度 0–1。
   五声锁定只影响编辑时能点哪些音；数据里存的是 MIDI 音高，导入的半音也能保留。
   撤销/重做：每次修改前存一份 JSON 快照（最多 120 步）。自动保存到 localStorage。
   ==========================================================================*/
(function (root) {
  'use strict';

  const MODES = { gong: [0, 2, 4, 7, 9], shang: [0, 2, 5, 7, 10], jue: [0, 3, 5, 8, 10], zhi: [0, 2, 5, 7, 9], yu: [0, 3, 5, 7, 10] };
  const STORE_KEY = 'sfxbrew-studio-project';
  let seq = 0;
  const uid = p => p + Date.now().toString(36) + (seq++).toString(36);

  function newProject() {
    return {
      v: 1, title: '', tempo: 90, root: 50, mode: 'gong', scaleLock: true, bars: 16,
      loop: { on: false, start: 0, end: 16 },
      sections: [], chords: [], tracks: []
    };
  }

  function newTrack(instrument, name) {
    return { id: uid('t'), name: name || '', instrument, volume: 0.8, pan: 0, mute: false, solo: false, reverb: 0.3, smart: null, drummer: null, regions: [] };
  }
  function newRegion(start, length, notes) {
    return { id: uid('r'), start, length, notes: notes || [] };
  }

  /* ---------- 音阶 ---------- */
  function scaleOf(p) { return MODES[p.mode] || MODES.gong; }
  function inScale(p, midi) { return scaleOf(p).includes((((midi - p.root) % 12) + 12) % 12); }
  function isTonic(p, midi) { return (((midi - p.root) % 12) + 12) % 12 === 0; }
  /* 把一个音高吸附到最近的音阶音（五声锁定时画音符用） */
  function snapToScale(p, midi) {
    for (let k = 0; k < 7; k++) { if (inScale(p, midi - k)) return midi - k; if (inScale(p, midi + k)) return midi + k; }
    return midi;
  }

  /* ---------- 查询 ---------- */
  function findTrack(p, id) { return p.tracks.find(t => t.id === id) || null; }
  function findRegion(p, id) {
    for (const t of p.tracks) { const r = t.regions.find(x => x.id === id); if (r) return { track: t, region: r }; }
    return null;
  }
  /* 项目实际长度（拍）：最后一个片段的结尾，至少 bars 小节 */
  function lengthBeats(p) {
    let end = p.bars * 4;
    p.tracks.forEach(t => t.regions.forEach(r => { end = Math.max(end, r.start + r.length); }));
    return Math.ceil(end / 4) * 4;
  }

  /* ---------- 校验（打开文件时用） ---------- */
  function sanitize(raw) {
    const p = Object.assign(newProject(), raw || {});
    p.tempo = Math.max(30, Math.min(240, +p.tempo || 90));
    p.root = Math.max(36, Math.min(72, Math.round(+p.root || 50)));
    if (!MODES[p.mode]) p.mode = 'gong';
    p.bars = Math.max(1, Math.min(512, Math.round(+p.bars || 16)));
    p.loop = Object.assign({ on: false, start: 0, end: 16 }, p.loop || {});
    p.sections = Array.isArray(p.sections) ? p.sections : [];
    p.chords = Array.isArray(p.chords) ? p.chords : [];
    p.tracks = (Array.isArray(p.tracks) ? p.tracks : []).map(t => {
      const tr = Object.assign(newTrack(t.instrument || 'guqin'), t);
      tr.regions = (Array.isArray(t.regions) ? t.regions : []).map(r => {
        const rg = Object.assign(newRegion(0, 4), r);
        rg.notes = (Array.isArray(r.notes) ? r.notes : []).filter(n => isFinite(n.t) && isFinite(n.d) && isFinite(n.p))
          .map(n => ({ t: +n.t, d: Math.max(0.0625, +n.d), p: Math.round(+n.p), v: Math.max(0.05, Math.min(1, n.v == null ? 0.8 : +n.v)) }));
        return rg;
      });
      return tr;
    });
    return p;
  }

  /* ---------- 撤销 / 重做 ---------- */
  function makeHistory(get, set) {
    const undo = [], redo = [];
    return {
      /* 在修改之前调用 */
      push() { undo.push(JSON.stringify(get())); if (undo.length > 120) undo.shift(); redo.length = 0; },
      undo() { if (!undo.length) return false; redo.push(JSON.stringify(get())); set(JSON.parse(undo.pop())); return true; },
      redo() { if (!redo.length) return false; undo.push(JSON.stringify(get())); set(JSON.parse(redo.pop())); return true; },
      canUndo: () => undo.length > 0, canRedo: () => redo.length > 0,
      clear() { undo.length = 0; redo.length = 0; }
    };
  }

  /* ---------- 自动保存 ---------- */
  function save(p) { try { root.localStorage && root.localStorage.setItem(STORE_KEY, JSON.stringify(p)); return true; } catch (e) { return false; } }
  function load() {
    try { const s = root.localStorage && root.localStorage.getItem(STORE_KEY); return s ? sanitize(JSON.parse(s)) : null; } catch (e) { return null; }
  }

  const api = { MODES, uid, newProject, newTrack, newRegion, scaleOf, inScale, isTonic, snapToScale, findTrack, findRegion, lengthBeats, sanitize, makeHistory, save, load };
  root.Studio = root.Studio || {};
  root.Studio.project = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
