/* ============================================================================
   SFX Brew · 网页共用工具（编辑器首页和音效库页面都用）
   ----------------------------------------------------------------------------
   WAV 编码、zip 打包、下载、生成 JS 代码、画波形、分享链接编码。
   挂在 window.SFXB 上。依赖 engine.js 的 makeSfx。
   ==========================================================================*/
(function () {
  'use strict';

  function trimLength(d, sr) {
    let end = d.length - 1;
    while (end > 0 && Math.abs(d[end]) < 0.0008) end--;
    return Math.min(d.length, end + Math.floor(sr * 0.02));
  }

  /** AudioBuffer → 16 位单声道 WAV，去掉尾部静音，峰值超过 0.98 才压一下 */
  function wavBytes(buf) {
    const sr = buf.sampleRate, src = buf.getChannelData(0), n = trimLength(src, sr);
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(src[i]));
    const k = peak > 0.98 ? 0.98 / peak : 1;
    const out = new DataView(new ArrayBuffer(44 + n * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
    str(36, 'data'); out.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, src[i] * k)) * 0x7fff, true);
    return new Uint8Array(out.buffer);
  }

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const download = (bytes, name, type) => downloadBlob(new Blob([bytes], { type }), name);

  /* zip：只存不压（WAV 本来也压不了多少），够用 */
  const CRC = (() => { const tb = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } return tb; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let off = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true);
      h.setUint32(18, sz, true); h.setUint32(22, sz, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true);
      c.setUint32(20, sz, true); c.setUint32(24, sz, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + sz;
    });
    const cSize = central.reduce((s, b) => s + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cSize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }

  function round(p) {
    return JSON.parse(JSON.stringify(p, (k, v) => typeof v === 'number' ? +v.toPrecision(4) : v));
  }

  /** 一段独立 JS：引擎一份 + 每个声音一个 playXxx()。sounds: [{name, patch}] */
  function jsCode(sounds) {
    const engine = makeSfx.toString().split('\n').map(s => s.replace(/\s+$/, '')).join('\n');
    let out = '// Sound effects made with SFX Brew — https://sfxbrew.com (free for commercial use)\n' +
      '// Call a play function after a user click/tap (browsers block audio before the first gesture).\n' +
      'const sfxBrew = (' + engine + ')();\n';
    sounds.forEach(s => {
      const id = s.name.replace(/[^A-Za-z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^[^A-Za-z_]/, '_$&');
      const fn = 'play' + id.charAt(0).toUpperCase() + id.slice(1);
      out += 'const SOUND_' + id.toUpperCase() + ' = ' + JSON.stringify(round(s.patch)) + ';\n' +
        'function ' + fn + '() { sfxBrew.play(SOUND_' + id.toUpperCase() + '); }\n';
    });
    return out;
  }

  function drawWave(cv, d, n, color) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    g.fillStyle = color || getComputedStyle(document.documentElement).getPropertyValue('--wave').trim();
    const mid = h / 2, per = Math.max(1, n / w);
    for (let x = 0; x < w; x++) {
      let lo = 0, hi = 0;
      const a = Math.floor(x * per), b = Math.min(n, Math.floor((x + 1) * per));
      for (let i = a; i < b; i++) { const v = d[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const y1 = mid - hi * mid * 0.95, y2 = mid - lo * mid * 0.95;
      g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }

  /** 编辑器分享链接的 # 部分：presetId.base64url(参数) */
  function hashFor(presetId, patch) {
    const s = btoa(unescape(encodeURIComponent(JSON.stringify(round(patch))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return '#' + presetId + '.' + s;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  window.SFXB = { trimLength, wavBytes, download, downloadBlob, zip, round, jsCode, drawWave, hashFor, copyText };
})();
