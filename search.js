/* ============================================================================
   SFX Brew · 音效库检索（/sounds/ 和 /sounds/c/<大类>/）
   ----------------------------------------------------------------------------
   结果卡片在静态 HTML 里已经全部生成好（data-cats / data-tags / data-hay / data-dur），
   这里只负责：搜索框、大类、标签勾选、排序 → 显示或隐藏卡片，并把条件写进网址（?q=&cat=&t=&sort=）。
   标签规则：同一维度里多选是"或"，不同维度之间是"且"。搜索词空格分开，每个词都要命中。
   卡片：滚到可见才渲染波形；播放、换一个（现场生成新变体）、WAV、编辑（带上当前变体的参数）。
   ==========================================================================*/
(function () {
  'use strict';

  const DATA = JSON.parse(document.getElementById('lib-data').textContent);
  const T = DATA.i18n2 || {};
  const SFX = makeSfx();
  const $ = s => document.querySelector(s);
  const results = $('#sresults'), cards = Array.from(results.querySelectorAll('.card'));
  const base = cards.slice();               /* 默认顺序 */
  const allMode = DATA.mode === 'all';
  const state = { q: '', cat: '', tags: new Set(), sort: '' };

  /* ---------- 读写网址 ---------- */
  function readUrl() {
    const u = new URLSearchParams(location.search);
    state.q = u.get('q') || '';
    state.cat = allMode ? (u.get('cat') || '') : '';
    state.tags = new Set((u.get('t') || '').split(',').filter(Boolean));
    state.sort = u.get('sort') || '';
  }
  function writeUrl() {
    const u = new URLSearchParams();
    if (state.q) u.set('q', state.q);
    if (state.cat) u.set('cat', state.cat);
    if (state.tags.size) u.set('t', Array.from(state.tags).join(','));
    if (state.sort) u.set('sort', state.sort);
    const qs = u.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* ignore */ }
  }

  /* ---------- 筛选 ---------- */
  function matches(card) {
    if (state.cat && !card.dataset.cats.split(' ').includes(state.cat)) return false;
    if (state.tags.size) {
      const have = card.dataset.tags.split(' '), byDim = {};
      state.tags.forEach(t => { const d = t.split(':')[0]; (byDim[d] = byDim[d] || []).push(t); });
      for (const d in byDim) if (!byDim[d].some(t => have.includes(t))) return false;
    }
    const words = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return words.every(w => card.dataset.hay.includes(w));
  }
  function apply(save) {
    let n = 0;
    cards.forEach(c => { const ok = matches(c); c.hidden = !ok; if (ok) n++; });
    const sorted = state.sort === 'name' ? base.slice().sort((a, b) => a.dataset.name.localeCompare(b.dataset.name, document.documentElement.lang))
      : state.sort === 'dur' ? base.slice().sort((a, b) => a.dataset.dur - b.dataset.dur) : base;
    sorted.forEach(c => results.appendChild(c));
    $('#scount').textContent = (T.showing || '{n} / {m}').replace('{n}', n).replace('{m}', cards.length);
    $('#sempty').hidden = n > 0;
    $('#sclear').hidden = !(state.q || state.cat || state.tags.size);
    $('#sq').value = state.q;
    $('#ssort').value = state.sort;
    document.querySelectorAll('.fchk input').forEach(i => { i.checked = state.tags.has(i.value); });
    if (allMode) document.querySelectorAll('[data-cat]').forEach(a => a.classList.toggle('on', a.dataset.cat === state.cat));
    if (save) writeUrl();
    observeVisible();
  }

  let qTimer = 0;
  $('#sq').addEventListener('input', e => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; apply(true); }, 120); });
  $('#sq').addEventListener('keydown', e => { if (e.key === 'Escape') { state.q = ''; apply(true); } });
  $('#ssort').addEventListener('change', e => { state.sort = e.target.value; apply(true); });
  $('#sclear').addEventListener('click', () => { state.q = ''; state.cat = ''; state.tags.clear(); apply(true); });
  document.querySelectorAll('.fchk input').forEach(i => i.addEventListener('change', () => {
    if (i.checked) state.tags.add(i.value); else state.tags.delete(i.value);
    apply(true);
  }));
  /* 检索页：左栏大类就地筛选（链接本身指向大类页，没有 JS 时照常跳转） */
  if (allMode) document.querySelectorAll('[data-cat]').forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    state.cat = a.dataset.cat && state.cat !== a.dataset.cat ? a.dataset.cat : '';
    apply(true);
  }));

  /* ---------- 卡片：波形、播放、换一个、WAV ---------- */
  const SR = 22050, ver = cards.map(() => 0), cache = new Map();
  function render(i, sr) {
    const key = i + '@' + sr + '#' + ver[i];
    if (!cache.has(key)) cache.set(key, SFX.render(DATA.sounds[i].patch, sr));
    return cache.get(key);
  }
  async function draw(card) {
    const i = +card.dataset.i, buf = await render(i, SR), d = buf.getChannelData(0), n = SFXB.trimLength(d, SR);
    SFXB.drawWave(card.querySelector('.card-wave'), d, n);
    card.querySelector('.card-dur').textContent = (n / SR).toFixed(2) + ' s';
    card.dataset.drawn = '1';
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { io.unobserve(e.target); draw(e.target); }
  }), { rootMargin: '200px' }) : null;
  function observeVisible() { cards.forEach(c => { if (!c.hidden && !c.dataset.drawn) { if (io) io.observe(c); else draw(c); } }); }

  let playing = null;
  async function play(card) {
    const i = +card.dataset.i, btn = card.querySelector('.play');
    SFX.play(DATA.sounds[i].patch);
    if (playing) playing.classList.remove('on');
    playing = btn; btn.classList.add('on');
    const buf = await render(i, SR), ms = SFXB.trimLength(buf.getChannelData(0), SR) / SR * 1000;
    setTimeout(() => { if (playing === btn) { btn.classList.remove('on'); playing = null; } }, Math.max(200, ms));
  }
  cards.forEach(card => {
    const i = +card.dataset.i, s = DATA.sounds[i];
    card.querySelector('.play').addEventListener('click', () => play(card));
    card.querySelector('.card-wave').addEventListener('click', () => play(card));
    card.querySelector('.wav').addEventListener('click', async () => {
      SFXB.download(SFXB.wavBytes(await render(i, 44100)), s.file + (ver[i] ? '-' + ver[i] : '') + '.wav', 'audio/wav');
    });
    card.querySelector('.reroll').addEventListener('click', async () => {
      const pr = (window.SFX_PRESETS || []).find(p => p.id === s.id);
      if (!pr) return;
      s.patch = pr.gen(); ver[i]++;
      const edit = card.querySelector('.edit');
      edit.href = edit.href.split('#')[0] + SFXB.hashFor(s.id, s.patch);
      await draw(card);
      play(card);
    });
  });
  window.addEventListener('resize', () => cards.forEach(c => { if (c.dataset.drawn) draw(c); }));

  readUrl();
  apply(false);
})();
