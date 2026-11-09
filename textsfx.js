/* SFX Brew Lab · 文字生成音效（测试版）
   页面数据在 #ts-data：{ lang, api, sitekey, i18n }。后端是 sfx-pro/server.py（经 Cloudflare Tunnel）。
   每次生成/修改前用 Turnstile 拿一个一次性令牌；后端按 IP 限流、全站每日上限、排队。 */
(function () {
  'use strict';
  const D = JSON.parse(document.getElementById('ts-data').textContent);
  const T = D.i18n;
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = local ? 'http://localhost:8792' : D.api;
  const SITEKEY = (!local && D.sitekey) || '1x00000000000000000000AA';   // Cloudflare 官方测试密钥：总是通过
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const audio = new Audio();
  let current = null, busy = false, captchaOn = true;

  /* ---------- Turnstile：每次请求拿一个新令牌 ---------- */
  let widget = null, pending = null;
  function token() {
    if (!captchaOn) return Promise.resolve('');
    return new Promise((resolve, reject) => {
      const go = () => {
        pending = { resolve, reject };
        if (widget === null) {
          widget = turnstile.render('#ts-cf', {
            sitekey: SITEKEY, execution: 'execute', appearance: 'interaction-only', language: D.lang === 'zh' ? 'zh-cn' : 'en',
            callback: t => { const p = pending; pending = null; p && p.resolve(t); },
            'error-callback': () => { const p = pending; pending = null; p && p.reject(new Error(T.errors.captcha)); return true; },
            'expired-callback': () => {}
          });
        } else turnstile.reset(widget);
        turnstile.execute(widget);
      };
      const wait = n => window.turnstile ? go() : n > 100 ? reject(new Error(T.errors.captcha)) : setTimeout(() => wait(n + 1), 100);
      wait(0);
    });
  }

  async function post(path, body) {
    let r;
    try {
      body.turnstile = await token();
      r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) {
      throw new Error(e.message === T.errors.captcha ? e.message : T.errors.network);
    }
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(T.errors[j.kind] || T.errors.server);
    if (j.left_today != null) showLeft(j.left_today);
    return j;
  }

  function showLeft(n) { $('#ts-left').textContent = T.left.replace('{n}', Math.max(0, n)); }

  function setBusy(b, btn, label) {
    busy = b;
    document.querySelectorAll('.ts-form button, .ts-chip, .ts-pick').forEach(x => { x.disabled = b; });
    if (btn) btn.textContent = label;
  }

  function errorBox(where, msg) {
    const p = document.createElement('p'); p.className = 'ts-err'; p.textContent = msg;
    where.prepend(p); setTimeout(() => p.remove(), 12000);
  }

  async function download(url, name, btn) {
    btn.disabled = true;
    try {
      const b = await (await fetch(url)).blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { alert(T.errors.network); }
    btn.disabled = false;
  }

  const slug = s => (s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sound');

  function addTurn(label, res, isRefine) {
    const d = document.createElement('section'); d.className = 'ts-turn';
    let note = esc(res.notes || '');
    if (res.guard === 'kept_prev') note += ' <b class="ts-warn">' + esc(T.keptPrev) + '</b>';
    else if (res.guard === 'mild') note += ' <b class="ts-warn">' + esc(T.mild) + '</b>';
    d.innerHTML = '<p class="ts-ask"><span>' + esc(isRefine ? T.refineOf : T.you) + '</span> ' + esc(label) + '</p><p class="ts-notes">' + note + '</p>';
    const top = Math.max(...res.results.map(r => r.score), 0.01);
    res.results.forEach((r, i) => {
      const url = API + r.url;
      const row = document.createElement('div'); row.className = 'ts-row';
      const cr = (r.credits || []).length
        ? T.recFrom + ': ' + r.credits.map(c => '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.title) + '</a> (' + esc(c.author) + ')').join(', ')
        : T.synth;
      row.innerHTML = '<button class="play ts-play" aria-label="' + esc(T.play) + '">▶</button>' +
        '<div class="ts-info"><div class="ts-bar"><i style="width:' + Math.max(6, r.score / top * 100) + '%"></i></div><small>' + esc(T.match) + ' ' + Math.round(r.score * 100) + ' · ' + cr + '</small></div>' +
        '<button class="btn ts-dl">' + esc(T.download) + '</button><button class="btn ts-pick">' + esc(T.pick) + '</button>';
      row.querySelector('.ts-play').onclick = () => { audio.src = url; audio.play(); };
      row.querySelector('.ts-dl').onclick = e => download(url, 'sfxbrew-' + slug(res.clap_text || label) + '-' + (i + 1) + '.wav', e.currentTarget);
      row.querySelector('.ts-pick').onclick = () => {
        if (busy) return;
        document.querySelectorAll('.ts-row.on').forEach(x => x.classList.remove('on'));
        row.classList.add('on');
        current = { patch: r.patch, clap_text: res.clap_text };
        showRefine(d);
      };
      d.append(row);
    });
    $('#ts-log').prepend(d);
    if (res.results[0]) { audio.src = API + res.results[0].url; audio.play().catch(() => {}); }
  }

  function showRefine(turn) {
    document.querySelectorAll('.ts-refine').forEach(x => x.remove());
    const f = document.createElement('form'); f.className = 'ts-form ts-refine';
    f.innerHTML = '<input type="text" maxlength="300" placeholder="' + esc(T.refinePh) + '" autocomplete="off"><button class="btn primary big">' + esc(T.refine) + '</button>';
    f.onsubmit = async e => {
      e.preventDefault();
      const t = f.querySelector('input').value.trim(); if (!t || busy) return;
      const b = f.querySelector('button');
      setBusy(true, b, T.refining);
      try { const res = await post('/api/refine', { text: t, patch: current.patch, clap_text: current.clap_text }); f.remove(); addTurn(t, res, true); }
      catch (err) { errorBox(f.parentNode, err.message); }
      setBusy(false, b.isConnected ? b : null, T.refine);
    };
    turn.append(f); f.querySelector('input').focus();
  }

  $('#ts-form').onsubmit = async e => {
    e.preventDefault();
    const t = $('#ts-q').value.trim();
    if (!t) { errorBox($('#ts-log'), T.errors.empty); return; }
    if (busy) return;
    setBusy(true, $('#ts-go'), T.going);
    try { addTurn(t, await post('/api/generate', { text: t }), false); }
    catch (err) { errorBox($('#ts-log'), err.message); }
    setBusy(false, $('#ts-go'), T.go);
  };
  document.querySelectorAll('.ts-chip').forEach(c => { c.onclick = () => { $('#ts-q').value = c.textContent; $('#ts-form').requestSubmit(); }; });

  /* 后端在不在线 */
  fetch(API + '/api/status').then(r => r.json()).then(j => {
    captchaOn = j.captcha !== false;
    showLeft(j.left_today);
    if (j.global_left <= 0) $('#ts-left').textContent = T.errors.daily_global;
  }).catch(() => {
    $('#ts-offline').hidden = false;
    document.querySelectorAll('.ts-form button, .ts-chip').forEach(x => { x.disabled = true; });
  });
})();
