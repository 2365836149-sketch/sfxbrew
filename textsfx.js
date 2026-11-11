/* SFX Brew Lab · 文字生成音效（测试版）
   页面数据在 #ts-data：{ lang, api, sitekey, i18n }。后端是 sfx-pro/server.py（经 Cloudflare Tunnel）。
   每次生成/修改前用 Turnstile 拿一个一次性令牌；后端按 IP 限流、全站每日上限、排队。 */
(function () {
  'use strict';
  const D = JSON.parse(document.getElementById('ts-data').textContent);
  const T = D.i18n;
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = local ? (new URLSearchParams(location.search).get('api') || 'http://localhost:8792') : D.api;   // 本机调试可用 ?api= 指向别的后端
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

  /* ---------- 登录凭证：邮箱登录得到的会话令牌 st_...（旧的 SFXB- 兑换码也还能用），只存在本浏览器 ---------- */
  const store = { get: () => { try { return localStorage.getItem('sfxbrew.key') || ''; } catch (e) { return ''; } },
                  set: v => { try { v ? localStorage.setItem('sfxbrew.key', v) : localStorage.removeItem('sfxbrew.key'); } catch (e) {} } };
  let licenseKey = store.get();
  const signedIn = () => licenseKey.startsWith('st_');
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
  function showCredits(n) { $('#ts-left').innerHTML = esc(T.creditsLeft).replace('{n}', '<b>' + Math.max(0, n | 0) + '</b>'); }

  async function api(path, body) {
    let r;
    try { r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { throw new Error(T.errors.network); }
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error(keyMsg(j.kind)); err.kind = j.kind; throw err; }
    return j;
  }

  /* ---------- 账户：登录状态、点数余额、购买 ---------- */
  let status = {}, pendingPack = null;
  function renderAccount(info) {
    const inn = !!licenseKey;
    $('#ts-who').hidden = !(inn && info && info.email);
    if (inn && info && info.email) $('#ts-who').innerHTML = '<span>' + esc(T.signedAs) + '</span> <b>' + esc(info.email) + '</b>';
    $('#ts-logout').hidden = !inn;
    $('#ts-login-open').hidden = inn || !status.paid;
    if (inn && info) showCredits(info.left); else if (!inn) showLeft(status.left_today);
  }
  function signOut() {
    if (licenseKey) api('/api/logout', { license_key: licenseKey }).catch(() => {});
    licenseKey = ''; store.set(''); renderAccount(null);
  }
  async function refreshAccount() {
    if (!licenseKey) { renderAccount(null); return null; }
    try { const j = await api('/api/credits', { license_key: licenseKey }); renderAccount(j); return j; }
    catch (err) { if (err.kind === 'license_invalid') { licenseKey = ''; store.set(''); renderAccount(null); } else errorBox($('#ts-log'), err.message); return null; }
  }

  /* 登录：邮箱 → 验证码 → 令牌。发验证码要过人机验证（防止被拿来轰炸别人的邮箱） */
  const form = $('#ts-login'), msg = $('#ts-login-msg');
  function openLogin(pack) {
    pendingPack = pack || null;
    form.hidden = false; $('#ts-login-open').hidden = true; msg.textContent = '';
    $('#ts-email').focus();
  }
  function closeLogin() { form.hidden = true; $('#ts-code-row').hidden = true; pendingPack = null; renderAccount(null); }
  $('#ts-login-open').onclick = () => openLogin(null);
  $('#ts-login-cancel').onclick = closeLogin;
  $('#ts-logout').onclick = signOut;
  form.onsubmit = async e => {
    e.preventDefault();
    const email = $('#ts-email').value.trim(), b = $('#ts-send');
    if (!email) return;
    b.disabled = true; b.textContent = T.sending; msg.textContent = '';
    try {
      await api('/api/login', { email, lang: D.lang, turnstile: await token() });
      msg.textContent = T.codeSent.replace('{email}', email);
      $('#ts-code-row').hidden = false; $('#ts-code').value = ''; $('#ts-code').focus();
    } catch (err) { msg.textContent = err.message; }
    b.disabled = false; b.textContent = T.sendCode;
  };
  async function verify() {
    const code = $('#ts-code').value.replace(/\D/g, ''), b = $('#ts-verify');
    if (code.length !== 6) return;
    b.disabled = true;
    try {
      const j = await api('/api/verify', { email: $('#ts-email').value.trim(), code });
      licenseKey = j.token; store.set(j.token);
      const pack = pendingPack;
      form.hidden = true; $('#ts-code-row').hidden = true; pendingPack = null;
      renderAccount(j);
      if (pack) checkout(pack);
    } catch (err) { msg.textContent = err.message; }
    b.disabled = false;
  }
  $('#ts-verify').onclick = verify;
  $('#ts-code').oninput = e => { if (e.target.value.replace(/\D/g, '').length === 6) verify(); };
  $('#ts-code').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); verify(); } };

  async function checkout(p, btn, label, html) {
    if (!signedIn()) { openLogin(p); return; }               // 必须先登录：点数进这个邮箱的账户
    if (btn) { btn.disabled = true; btn.textContent = T.buying; }
    try { const j = await api('/api/checkout', { price: p.id, lang: D.lang, license_key: licenseKey }); location.href = j.url; }
    catch (err) {
      if (err.kind === 'license_invalid' || err.kind === 'login_required') { licenseKey = ''; store.set(''); openLogin(p); }
      else errorBox($('#ts-log'), err.message);
      if (btn) { btn.disabled = false; if (html) btn.innerHTML = html; else btn.textContent = label; }
    }
  }

  function setupAccount(st) {
    status = st;
    if (!st.paid) { licenseKey = ''; return; }               // 后端没开点数包：整块不显示
    const fmt = (amt, cur) => { try { return new Intl.NumberFormat(D.lang === 'zh' ? 'zh-CN' : 'en', { style: 'currency', currency: cur.toUpperCase() }).format(amt / 100); } catch (e) { return (amt / 100) + ' ' + cur.toUpperCase(); } };
    const packs = (st.packs || []).filter(p => p.amount != null);
    if (packs.length) {
      $('#ts-buy').hidden = false;
      const base = packs[0].amount / packs[0].credits;            // 第一档的单价，算后面几档省多少
      packs.forEach((p, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ts-pack';
        const save = Math.round((1 - p.amount / p.credits / base) * 100);
        if (save > 0 && i === packs.length - 1) b.classList.add('best');
        const html = '<span>' + esc(T.packCredits.replace('{n}', p.credits)) + (save > 0 ? ' <em>' + esc(T.save.replace('{p}', save)) + '</em>' : '') + '</span><b>' + esc(fmt(p.amount, p.currency)) + '</b>';
        b.innerHTML = html;
        b.onclick = () => checkout(p, b, null, html);
        $('#ts-packs').append(b);
      });
    }
    /* 从 Stripe 付款页回来：?paid=cs_... → 入账到当前登录的账户，然后把订单号从地址里去掉 */
    const sid = new URLSearchParams(location.search).get('paid');
    if (sid && signedIn()) {
      api('/api/claim', { session_id: sid, license_key: licenseKey })
        .then(j => {
          renderAccount(j);
          const n = j.added || 0;
          if (n) { const p = $('#ts-paid'); p.textContent = T.paidOk.replace('{n}', n); p.hidden = false; }
          const u = new URL(location.href); u.searchParams.delete('paid'); history.replaceState(null, '', u.pathname + u.search + u.hash);
        })
        .catch(err => errorBox($('#ts-log'), err.message));
    } else refreshAccount();
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

  /* 结果的波形：取回 WAV 解码后画成竖条（和首页、音效库的波形一个样子）；已播放的部分用玉绿 */
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let actx = null;
  const peaksCache = {};
  async function peaks(url, n) {
    if (peaksCache[url]) return peaksCache[url];
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const buf = await actx.decodeAudioData(await (await fetch(url)).arrayBuffer());
    const d = buf.getChannelData(0); let end = d.length;
    while (end > 1 && Math.abs(d[end - 1]) < 0.002) end--;              // 去掉结尾的静音
    const step = Math.max(1, Math.floor(end / n)), out = [];
    let max = 0;
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < Math.min(end, (i + 1) * step); j++) m = Math.max(m, Math.abs(d[j])); out.push(m); max = Math.max(max, m); }
    const res = { p: out.map(v => v / (max || 1)), dur: end / buf.sampleRate };
    peaksCache[url] = res; return res;
  }
  function drawBars(cv, p, played) {
    const w = cv.clientWidth, h = cv.clientHeight, r = window.devicePixelRatio || 1;
    cv.width = w * r; cv.height = h * r;
    const g = cv.getContext('2d'); g.scale(r, r); g.clearRect(0, 0, w, h);
    const n = p.length, bw = w / n, on = css('--accent'), off = css('--wave-off');
    for (let i = 0; i < n; i++) {
      const bh = Math.max(2, p[i] * (h - 4));
      g.fillStyle = i / n < played ? on : off;
      g.fillRect(i * bw + bw * 0.15, (h - bh) / 2, Math.max(1, bw * 0.7), bh);
    }
  }
  const ICONS = {
    play: '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    up: '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.5l-2.3 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z"/></svg>',
    down: '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V3"/><path d="M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.5l2.3-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.8a2 2 0 0 0-1.8 1.1L12 22a3.1 3.1 0 0 1-3-3.9z"/></svg>'
  };
  /* 同一时间只有一个结果在播放：播放按钮变暂停，波形按进度染色 */
  let playing = null;
  function stopPlaying() { if (!playing) return; playing.btn.innerHTML = ICONS.play; playing.btn.classList.remove('on'); if (playing.p) drawBars(playing.cv, playing.p.p, 0); playing = null; }
  audio.addEventListener('ended', stopPlaying);
  audio.addEventListener('timeupdate', () => { if (playing && playing.p && audio.duration) drawBars(playing.cv, playing.p.p, audio.currentTime / audio.duration); });
  function playRow(btn, cv, url) {
    if (playing && playing.btn === btn && !audio.paused) { audio.pause(); stopPlaying(); return; }
    stopPlaying();
    playing = { btn, cv, p: peaksCache[url] || null };
    btn.innerHTML = ICONS.pause; btn.classList.add('on');
    audio.src = url; audio.play().catch(stopPlaying);
  }

  const slug = s => (s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sound');

  function addTurn(label, res, isRefine) {
    const d = document.createElement('section'); d.className = 'ts-turn';
    let note = esc(res.notes || '');
    if (res.guard === 'kept_prev') note += ' <b class="ts-warn">' + esc(T.keptPrev) + '</b>';
    else if (res.guard === 'mild') note += ' <b class="ts-warn">' + esc(T.mild) + '</b>';
    d.innerHTML = '<p class="ts-ask"><span>' + esc(isRefine ? T.refineOf : T.you) + '</span> ' + esc(label) + '</p><p class="ts-notes">' + note + '</p>';
    res.results.forEach((r, i) => {
      const url = API + r.url;
      const row = document.createElement('div'); row.className = 'ts-row';
      const cr = (r.credits || []).length
        ? T.recFrom + ': ' + r.credits.map(c => '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.title) + '</a> (' + esc(c.author) + ')').join(', ')
        : (r.tag === 'sa3' ? esc(T.ai) : T.synth);
      row.innerHTML = '<button class="ts-play" aria-label="' + esc(T.play) + '">' + ICONS.play + '</button>' +
        '<div class="ts-info"><canvas class="ts-wave" aria-hidden="true"></canvas><small>' + esc(T.match) + ' ' + Math.round(r.score * 100) + ' · ' + cr + '</small></div>' +
        '<span class="ts-rate"><button class="ts-up" aria-label="' + esc(T.up) + '" title="' + esc(T.up) + '">' + ICONS.up + '</button><button class="ts-down" aria-label="' + esc(T.down) + '" title="' + esc(T.down) + '">' + ICONS.down + '</button></span>' +
        '<button class="btn ts-dl">' + esc(T.download) + '</button><button class="btn ts-pick">' + esc(T.pick) + '</button>';
      const cv = row.querySelector('.ts-wave');
      peaks(url, 72).then(p => drawBars(cv, p.p, 0)).catch(() => {});
      row.querySelector('.ts-play').onclick = e => { playRow(e.currentTarget, cv, url); track(res.gid, r.url, 'play'); };
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
    if (res.results[0]) { const b = d.querySelector('.ts-play'); playRow(b, d.querySelector('.ts-wave'), API + res.results[0].url); }
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

  /* 从首页带过来的描述（?q=）：先填进输入框，再从地址里去掉（刷新不会重复生成） */
  const fromHome = (new URLSearchParams(location.search).get('q') || '').trim().slice(0, 300);
  if (fromHome) {
    $('#ts-q').value = fromHome;
    const u = new URL(location.href); u.searchParams.delete('q'); history.replaceState(null, '', u.pathname + u.search + u.hash);
  }

  /* 后端在不在线 */
  fetch(API + '/api/status').then(r => r.json()).then(j => {
    captchaOn = j.captcha !== false;
    showLeft(j.left_today);
    setupAccount(j);
    if (fromHome && j.global_left > 0) $('#ts-form').requestSubmit();   // 从首页带来的描述：后端在线就直接生成一次
    if (j.global_left <= 0) $('#ts-left').textContent = T.errors.daily_global;
  }).catch(() => {
    $('#ts-offline').hidden = false;
    document.querySelectorAll('.ts-form button, .ts-chip').forEach(x => { x.disabled = true; });
  });
})();
