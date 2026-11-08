/* ============================================================================
   SFX Brew · 音效库页面的交互
   ----------------------------------------------------------------------------
   页面里 #lib-data 存着每个声音的参数（build.js 生成）。
   卡片滚到可见时才离线渲染、画波形（几十个一起渲染会卡）。
   ==========================================================================*/
(function () {
  'use strict';

  const el = document.getElementById('lib-data');
  if (!el) return;
  const DATA = JSON.parse(el.textContent);
  const SFX = makeSfx();
  const PREVIEW_SR = 22050;
  const T = Object.assign({ rendering: 'Rendering {i} / {n}…', downloaded: 'Downloaded ✓', copied: 'Copied ✓', copyFailed: 'Copy failed' }, DATA.i18n || {});

  /* ---- 渲染缓存：同一个声音只渲染一次 ---- */
  const cache = new Map();
  function render(i, sr) {
    const key = i + '@' + sr;
    if (!cache.has(key)) cache.set(key, SFX.render(DATA.sounds[i].patch, sr));
    return cache.get(key);
  }

  /* ---- 播放：按钮短暂高亮，时长按声音实际长度 ---- */
  let playing = null;
  async function play(i, btn) {
    SFX.play(DATA.sounds[i].patch);
    if (playing) playing.classList.remove('on');
    playing = btn; btn.classList.add('on');
    const buf = await render(i, PREVIEW_SR);
    const ms = SFXB.trimLength(buf.getChannelData(0), PREVIEW_SR) / PREVIEW_SR * 1000;
    setTimeout(() => { if (playing === btn) { btn.classList.remove('on'); playing = null; } }, Math.max(200, ms));
  }

  /* ---- 卡片 ---- */
  async function drawCard(card) {
    const i = +card.dataset.i, cv = card.querySelector('.card-wave');
    const buf = await render(i, PREVIEW_SR), d = buf.getChannelData(0), n = SFXB.trimLength(d, PREVIEW_SR);
    if (cv) SFXB.drawWave(cv, d, n);
    const dur = card.querySelector('.card-dur');
    if (dur) dur.textContent = (n / PREVIEW_SR).toFixed(2) + ' s';
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { io.unobserve(e.target); drawCard(e.target); }
  }), { rootMargin: '200px' }) : null;

  document.querySelectorAll('.card, .tile').forEach(card => {
    const i = +card.dataset.i;
    card.querySelector('.play').addEventListener('click', e => play(i, e.currentTarget));
    const wav = card.querySelector('.wav');
    if (wav) wav.addEventListener('click', async () => {
      const buf = await render(i, 44100);
      SFXB.download(SFXB.wavBytes(buf), DATA.sounds[i].file + '.wav', 'audio/wav');
    });
    const cv = card.querySelector('.card-wave');
    if (cv) cv.addEventListener('click', () => play(i, card.querySelector('.play')));
    if (card.classList.contains('card')) { if (io) io.observe(card); else drawCard(card); }
  });

  /* ---- 整页操作 ---- */
  const flash = (btn, text) => { const old = btn.textContent; btn.textContent = text; setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1400); };

  const zipBtn = document.querySelector('[data-act="zip"]');
  if (zipBtn) zipBtn.addEventListener('click', async () => {
    zipBtn.disabled = true;
    const label = zipBtn.textContent, files = [];
    for (let i = 0; i < DATA.sounds.length; i++) {
      zipBtn.textContent = T.rendering.replace('{i}', i + 1).replace('{n}', DATA.sounds.length);
      files.push({ name: DATA.sounds[i].file + '.wav', data: SFXB.wavBytes(await render(i, 44100)) });
    }
    SFXB.downloadBlob(SFXB.zip(files), DATA.zip || 'sfxbrew.zip');
    zipBtn.textContent = label;
    flash(zipBtn, T.downloaded);
  });

  const codeBtn = document.querySelector('[data-act="code"]');
  if (codeBtn) codeBtn.addEventListener('click', async () => {
    codeBtn.disabled = true;
    const ok = await SFXB.copyText(SFXB.jsCode(DATA.sounds.map(s => ({ name: s.file, patch: s.patch }))));
    flash(codeBtn, ok ? T.copied : T.copyFailed);
  });

  window.addEventListener('resize', () => document.querySelectorAll('.card').forEach(c => { if (c.querySelector('.card-dur').textContent) drawCard(c); }));
})();
