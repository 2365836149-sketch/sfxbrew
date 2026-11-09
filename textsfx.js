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
  /* 本次打开页面的一次性编号：只用来把这次访问里的操作串起来（不存、不跨访问） */
  const SID = Array.from(crypto.getRandomValues(new Uint8Array(9)), b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join('') + 'x0';
  const rid = url => (String(url).match(/([0-9a-f]{8}_[0-9a-z_]+)\.wav$/) || [])[1];
  /* 上报播放/下载/选中/赞/踩（用来改进生成效果）；失败不影响使用 */
  function track(gid, url, type) {
    const result = rid(url);
    if (!gid || !result) return;
    try { fetch(API + '/api/event', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ gid, result, type, sid: SID }) }).catch(() => {}); } catch (e) {}
  }
  let current = null, busy = false, captchaOn = true;

  /* ---------- 点数兑换码（Lemon Squeezy license key），只存在本浏览器 ---------- */
  const store = { get: () => { try { return localStorage.getItem('sfxbrew.key') || ''; } catch (e) { return ''; } },
                  set: v => { try { v ? localStorage.setItem('sfxbrew.key', v) : localStorage.removeItem('sfxbrew.key'); } catch (e) {} } };
  let licenseKey = store.get();
  const keyMsg = kind => (T.keyErrors && T.keyErrors[kind]) || T.errors[kind] || T.errors.server;

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
      body.sid = SID; body.lang = D.lang;
      if (licenseKey) body.license_key = licenseKey; else body.turnstile = await token();
      r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) {
      throw new Error(e.message === T.errors.captcha ? e.message : T.errors.network);
    }
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(keyMsg(j.kind));
    if (j.left_today != null) showLeft(j.left_today);
    if (j.credits_left != null) showCredits(j.credits_left);
    return j;
  }

  function showLeft(n) { if (!licenseKey) $('#ts-left').textContent = T.left.replace('{n}', Math.max(0, n)); }
  function showCredits(n) { $('#ts-left').textContent = T.creditsLeft.replace('{n}', Math.max(0, n)); }

  async function checkKey(k) {
    const r = await fetch(API + '/api/credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ license_key: k }) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(keyMsg(j.kind));
    return j;
  }
  function setupKey(status) {
    if (!status.paid) { licenseKey = ''; return; }          // 后端没开点数包：整块不显示
    const box = $('#ts-key'), inp = $('#ts-key-in'), clear = $('#ts-key-clear');
    box.hidden = false;
    const sync = () => { inp.value = licenseKey; clear.hidden = !licenseKey; box.open = !!licenseKey; };
    sync();
    $('#ts-key-form').onsubmit = async e => {
      e.preventDefault();
      const k = inp.value.trim(); if (!k) return;
      try { const j = await checkKey(k); licenseKey = k; store.set(k); sync(); showCredits(j.left); }
      catch (err) { errorBox($('#ts-log'), err.message); }
    };
    clear.onclick = () => { licenseKey = ''; store.set(''); sync(); showLeft(status.left_today); };

    /* 购买按钮：每个档位一个，点了去 Stripe 付款页 */
    const fmt = (amt, cur) => { try { return new Intl.NumberFormat(D.lang === 'zh' ? 'zh-CN' : 'en', { style: 'currency', currency: cur.toUpperCase() }).format(amt / 100); } catch (e) { return (amt / 100) + ' ' + cur.toUpperCase(); } };
    const packs = (status.packs || []).filter(p => p.amount != null);
    if (packs.length) {
      $('#ts-buy').hidden = false;
      packs.forEach(p => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn';
        const label = T.buy.replace('{n}', p.credits).replace('{price}', fmt(p.amount, p.currency));
        b.textContent = label;
        b.onclick = async () => {
          b.disabled = true; b.textContent = T.buying;
          try {
            const r = await fetch(API + '/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price: p.id, lang: D.lang }) });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j.url) throw new Error(keyMsg(j.kind || 'payment_error'));
            location.href = j.url;
          } catch (err) { errorBox($('#ts-log'), err.message); b.disabled = false; b.textContent = label; }
        };
        $('#ts-packs').append(b);
      });
    }

    /* 从 Stripe 付款页回来：?paid=cs_... → 领兑换码 */
    const sid = new URLSearchParams(location.search).get('paid');
    if (sid) {
      fetch(API + '/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sid }) })
        .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(keyMsg(j.kind || 'payment_error')); return j; })
        .then(j => {
          licenseKey = j.key; store.set(j.key); sync(); showCredits(j.left);
          $('#ts-claimed-key').textContent = j.key; $('#ts-claimed').hidden = false;
          $('#ts-copy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(j.key).then(() => { $('#ts-copy').textContent = T.copied; }); };
        })
        .catch(err => errorBox($('#ts-log'), err.message));
      // 兑换码只在付款后的这一页显示；地址里保留订单号，刷新也能再领到同一个码
    } else if (licenseKey) {
      checkKey(licenseKey).then(j => showCredits(j.left)).catch(err => { errorBox($('#ts-log'), err.message); });
    }
  }

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
        '<span class="ts-rate"><button class="ts-up" aria-label="' + esc(T.up) + '" title="' + esc(T.up) + '">👍</button><button class="ts-down" aria-label="' + esc(T.down) + '" title="' + esc(T.down) + '">👎</button></span>' +
        '<button class="btn ts-dl">' + esc(T.download) + '</button><button class="btn ts-pick">' + esc(T.pick) + '</button>';
      row.querySelector('.ts-play').onclick = () => { audio.src = url; audio.play(); track(res.gid, r.url, 'play'); };
      row.querySelector('.ts-dl').onclick = e => { download(url, 'sfxbrew-' + slug(res.clap_text || label) + '-' + (i + 1) + '.wav', e.currentTarget); track(res.gid, r.url, 'download'); };
      ['up', 'down'].forEach(k => {
        const b = row.querySelector('.ts-' + k);
        b.onclick = () => {
          if (row.dataset.rated) return;                 // 每个结果只能评一次
          row.dataset.rated = k; b.classList.add('on'); row.querySelector('.ts-rate').classList.add('done');
          track(res.gid, r.url, k);
        };
      });
      row.querySelector('.ts-pick').onclick = () => {
        if (busy) return;
        document.querySelectorAll('.ts-row.on').forEach(x => x.classList.remove('on'));
        row.classList.add('on');
        current = { patch: r.patch, clap_text: res.clap_text, parent: rid(r.url) ? { gid: res.gid, result: rid(r.url) } : null };
        track(res.gid, r.url, 'pick');
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
      try { const res = await post('/api/refine', { text: t, patch: current.patch, clap_text: current.clap_text, parent: current.parent }); f.remove(); addTurn(t, res, true); }
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
    setupKey(j);
    if (j.global_left <= 0) $('#ts-left').textContent = T.errors.daily_global;
  }).catch(() => {
    $('#ts-offline').hidden = false;
    document.querySelectorAll('.ts-form button, .ts-chip').forEach(x => { x.disabled = true; });
  });
})();
