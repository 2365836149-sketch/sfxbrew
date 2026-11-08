#!/usr/bin/env node
/* ============================================================================
   SFX Brew · 生成音效库静态页面（中英双语）：node site/build.js
   ----------------------------------------------------------------------------
   英文：/sounds/、/sounds/<slug>/、/packs/<slug>/
   中文：/zh/sounds/、/zh/sounds/<slug>/、/zh/packs/<slug>/
   中英页面互相用 hreflang 标注，Google 会分别收录、给对应语言的用户展示。
   ★ 不存任何音频文件：页面里只嵌声音参数，播放和下载都在访问者浏览器里实时合成。
   ★ 每个变体用固定种子生成，每次构建结果一样（网址和内容稳定，利于 SEO）。
   ★ 改了 presets.js 或 data.js 之后重跑一次，再提交。
   ==========================================================================*/
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('../node/lib.js');
const { SOUNDS, PACKS, UI } = require('./data.js');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://sfxbrew.com';
const VARIANTS = 12;
const TODAY = new Date().toISOString().slice(0, 10);
const LANGS = ['en', 'zh'];
const PREFIX = { en: '/', zh: '/zh/' };
const HTML_LANG = { en: 'en', zh: 'zh-CN' };
const HREFLANG = { en: 'en', zh: 'zh-Hans' };
const other = lang => (lang === 'en' ? 'zh' : 'en');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonForHtml = o => JSON.stringify(o).replace(/</g, '\\u003c');
const pad = n => String(n).padStart(2, '0');
function seedFor(id) {
  let h = 2166136261;
  for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 1000000;
}
const variant = (id, i) => lib.generate(id, seedFor(id) + i * 7919).patch;
const editorUrl = (lang, hash) => (lang === 'zh' ? '/?lang=zh' : '/') + (hash || '');
const editHref = (lang, id, patch) => editorUrl(lang, '#' + id + '.' + Buffer.from(JSON.stringify(patch)).toString('base64url'));
const firstSentence = (s, lang) => (lang === 'zh' ? s.split(/(?<=。)/)[0] : s.split(/(?<=\.)\s/)[0]);
const presetGroup = id => lib.PRESETS.find(p => p.id === id).group;
const fileBase = id => SOUNDS[id].slug.replace('-sound-effect', '');
const soundUrl = (lang, id) => PREFIX[lang] + 'sounds/' + SOUNDS[id].slug + '/';
const packUrl = (lang, slug) => PREFIX[lang] + 'packs/' + slug + '/';

/* ---------------- 公共页头页脚 ---------------- */
function page(lang, { title, description, urlPath, altPath, body, data, active }) {
  const u = UI[lang];
  const nav = [[editorUrl(lang), u.navEditor, 'editor'], [PREFIX[lang] + 'sounds/', u.navLibrary, 'library'], [packUrl(lang, 'xianxia-game-sound-pack'), u.navPacks, 'packs'], [editorUrl(lang, '#agents'), u.navAgents, 'agents']]
    .map(([href, label, key]) => '<a href="' + href + '"' + (key === active ? ' class="on" aria-current="page"' : '') + '>' + esc(label) + '</a>').join('');
  const footerLinks = Object.keys(SOUNDS).map(id => '<a href="' + soundUrl(lang, id) + '">' + esc(SOUNDS[id][lang].name) + '</a>').join('');
  const alt = (l, p) => '<link rel="alternate" hreflang="' + HREFLANG[l] + '" href="' + SITE + p + '">';
  const paths = { [lang]: urlPath, [other(lang)]: altPath };
  return `<!doctype html>
<html lang="${HTML_LANG[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE + urlPath}">
${alt('en', paths.en)}
${alt('zh', paths.zh)}
<link rel="alternate" hreflang="x-default" href="${SITE + paths.en}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE + urlPath}">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/style.css">
</head>
<body class="lib-page">
<header class="top">
  <a class="brand" href="${editorUrl(lang)}"><img class="seal" src="/favicon.svg" alt="" width="38" height="38"><span class="name">SFX Brew</span></a>
  <nav class="nav">${nav}</nav>
  <a class="link" href="${altPath}" hreflang="${HREFLANG[other(lang)]}" lang="${HTML_LANG[other(lang)]}">${esc(u.switchLang)}</a>
</header>
<main class="lib">
${body}
</main>
<footer class="foot">
  <div class="foot-links">${footerLinks}</div>
  <p>${esc(u.footer)} SFX Brew · <a href="https://github.com/2365836149-sketch/sfxbrew">GitHub</a> · <a href="/llms.txt">llms.txt</a></p>
</footer>
${data ? '<script type="application/json" id="lib-data">' + jsonForHtml(Object.assign({ i18n: { rendering: u.js.rendering('{i}', '{n}'), downloaded: u.js.downloaded, copied: u.js.copied, copyFailed: u.js.copyFailed } }, data)) + '</script>' : ''}
<script src="/engine.js"></script>
<script src="/shared.js"></script>
<script src="/library.js"></script>
</body>
</html>
`;
}

/* 一组可播放的卡片：静态 HTML 里就有名字和链接，JS 再补上波形和按钮功能 */
function cards(lang, items) {
  const u = UI[lang];
  return '<div class="cards">' + items.map((it, i) =>
    `<article class="card" data-i="${i}">
  <canvas class="card-wave" aria-hidden="true"></canvas>
  <div class="card-row">
    <button class="play" aria-label="${esc(u.play + ' ' + it.label)}">▶</button>
    <span class="card-name">${esc(it.label)}</span>
    <span class="card-dur"></span>
  </div>
  <div class="card-links"><button class="wav">WAV</button><a href="${it.edit}">${esc(u.edit)}</a>${it.category ? '<a href="' + it.category + '">' + esc(u.more) + '</a>' : ''}</div>
</article>`).join('\n') + '</div>';
}

/* ---------------- 每类音效一页 ---------------- */
function soundPage(lang, id) {
  const s = SOUNDS[id], t = s[lang], u = UI[lang];
  const items = [];
  for (let i = 0; i < VARIANTS; i++) {
    const patch = variant(id, i);
    items.push({ label: t.name + ' ' + pad(i + 1), file: fileBase(id) + '-' + pad(i + 1), patch, edit: editHref(lang, id, patch) });
  }
  const related = s.related.map(r => '<a class="tile-sm" href="' + soundUrl(lang, r) + '">' + esc(SOUNDS[r][lang].name) + '</a>').join('');
  const group = presetGroup(id) === 'east' ? u.groupEast : u.groupGeneral;
  const body = `
<nav class="crumbs"><a href="${PREFIX[lang]}sounds/">${esc(u.library)}</a> <span>/</span> ${esc(group)} <span>/</span> ${esc(t.name)}</nav>
<h1>${esc(t.title)}</h1>
<p class="lead">${esc(t.intro)}</p>
<div class="lib-actions">
  <button class="primary" data-act="zip">${esc(u.zipAll(VARIANTS))}</button>
  <button data-act="code">${esc(u.codeAll(VARIANTS))}</button>
  <a class="btn" href="${editorUrl(lang, '#' + id)}">${esc(u.editor)}</a>
</div>
${cards(lang, items)}
<p class="muted small">${esc(u.fixedNote(t.name, VARIANTS))}</p>
<section class="info">
  <div>
    <h2>${esc(u.goodFor)}</h2>
    <ul>${t.uses.map(x => '<li>' + esc(x) + '</li>').join('')}</ul>
    <h2>${esc(u.tipH)}</h2>
    <p>${esc(t.tip + u.tipTail)}</p>
  </div>
  <div>
    <h2>${esc(u.agentH)}</h2>
    <p>${esc(u.agentP1)}</p>
    <pre class="cmd">npx sfxbrew ${id} --count 5 --out assets/sfx/${fileBase(id)}.wav</pre>
    <p>${esc(u.agentP2(t.name))}</p>
    <pre class="cmd">claude mcp add sfxbrew -- npx -y -p sfxbrew sfxbrew-mcp</pre>
    <h2>${esc(u.licenseH)}</h2>
    <p>${esc(u.licenseP)}</p>
  </div>
</section>
<section>
  <h2>${esc(u.related)}</h2>
  <div class="related">${related}</div>
</section>`;
  return {
    file: PREFIX[lang].slice(1) + 'sounds/' + s.slug + '/index.html',
    html: page(lang, {
      title: u.soundMetaTitle(t.title),
      description: u.soundMetaDesc(firstSentence(t.intro, lang), VARIANTS),
      urlPath: soundUrl(lang, id), altPath: soundUrl(other(lang), id),
      active: 'library', body,
      data: { zip: fileBase(id) + '-sfxbrew.zip', sounds: items.map(x => ({ file: x.file, patch: x.patch })) }
    })
  };
}

/* ---------------- 主题包 ---------------- */
function packPage(lang, slug) {
  const p = PACKS[slug], t = p[lang], u = UI[lang];
  const items = [];
  p.items.forEach(([id, n]) => {
    for (let i = 0; i < n; i++) {
      const patch = variant(id, i);
      items.push({ label: SOUNDS[id][lang].name + (n > 1 ? ' ' + pad(i + 1) : ''), file: fileBase(id) + '-' + pad(i + 1), patch, edit: editHref(lang, id, patch), category: soundUrl(lang, id) });
    }
  });
  const others = Object.keys(PACKS).filter(k => k !== slug).map(k => '<a class="tile-sm" href="' + packUrl(lang, k) + '">' + esc(PACKS[k][lang].name) + '</a>').join('');
  const body = `
<nav class="crumbs"><a href="${PREFIX[lang]}sounds/">${esc(u.library)}</a> <span>/</span> ${esc(u.packs)} <span>/</span> ${esc(t.name)}</nav>
<h1>${esc(t.title)}</h1>
<p class="lead">${esc(t.intro)}</p>
<div class="lib-actions">
  <button class="primary" data-act="zip">${esc(u.zipPack(items.length))}</button>
  <button data-act="code">${esc(u.codePack)}</button>
</div>
${cards(lang, items)}
<section>
  <h2>${esc(u.morePacks)}</h2>
  <div class="related">${others}<a class="tile-sm" href="${PREFIX[lang]}sounds/">${esc(u.allCats)}</a></div>
</section>`;
  return {
    file: PREFIX[lang].slice(1) + 'packs/' + slug + '/index.html',
    html: page(lang, {
      title: u.packMetaTitle(t.title, items.length),
      description: u.packMetaDesc(firstSentence(t.intro, lang), items.length),
      urlPath: packUrl(lang, slug), altPath: packUrl(other(lang), slug),
      active: 'packs', body,
      data: { zip: slug + '-sfxbrew.zip', sounds: items.map(x => ({ file: x.file, patch: x.patch })) }
    })
  };
}

/* ---------------- 音效库首页 ---------------- */
function libraryIndex(lang) {
  const u = UI[lang], tiles = [], data = [];
  [['east', u.groupEast], ['general', u.groupGeneral]].forEach(([g, label]) => {
    const ids = Object.keys(SOUNDS).filter(id => presetGroup(id) === g);
    tiles.push('<h2>' + esc(label) + '</h2><div class="tiles">' + ids.map(id => {
      const t = SOUNDS[id][lang], i = data.length;
      data.push({ file: fileBase(id), patch: variant(id, 0) });
      return `<div class="tile" data-i="${i}"><button class="play" aria-label="${esc(u.play + ' ' + t.name)}">▶</button><div><a href="${soundUrl(lang, id)}"><b>${esc(t.name)}</b></a><p>${esc(firstSentence(t.intro, lang))}</p></div></div>`;
    }).join('') + '</div>');
  });
  const packs = Object.entries(PACKS).map(([slug, p]) => `<a class="pack" href="${packUrl(lang, slug)}"><b>${esc(p[lang].name)}</b><span>${esc(u.packSounds(p.items.reduce((a, x) => a + x[1], 0)))}</span><p>${esc(firstSentence(p[lang].intro, lang))}</p></a>`).join('');
  const body = `
<h1>${esc(u.libTitle)}</h1>
<p class="lead">${esc(u.libLead(Object.keys(SOUNDS).length, VARIANTS))}</p>
<section id="packs"><h2>${esc(u.packs)}</h2><div class="packs">${packs}</div></section>
${tiles.join('\n')}`;
  return {
    file: PREFIX[lang].slice(1) + 'sounds/index.html',
    html: page(lang, {
      title: u.libMetaTitle, description: u.libMetaDesc,
      urlPath: PREFIX[lang] + 'sounds/', altPath: PREFIX[other(lang)] + 'sounds/',
      active: 'library', body, data: { sounds: data }
    })
  };
}

/* ---------------- 写文件 ---------------- */
const missing = lib.PRESETS.filter(p => !SOUNDS[p.id]).map(p => p.id);
if (missing.length) throw new Error('data.js 缺少这些预设的文案: ' + missing.join(', '));
const out = [];
LANGS.forEach(lang => {
  out.push(libraryIndex(lang), ...Object.keys(SOUNDS).map(id => soundPage(lang, id)), ...Object.keys(PACKS).map(slug => packPage(lang, slug)));
});
for (const dir of ['sounds', 'packs', 'zh']) fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
out.forEach(o => { lib.writeFile(path.join(ROOT, o.file), o.html); });

const urls = ['/', ...LANGS.flatMap(l => [PREFIX[l] + 'sounds/', ...Object.keys(SOUNDS).map(id => soundUrl(l, id)), ...Object.keys(PACKS).map(k => packUrl(l, k))]), '/llms.txt'];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => '  <url><loc>' + SITE + u + '</loc><lastmod>' + TODAY + '</lastmod></url>').join('\n') + '\n</urlset>\n');

console.log('wrote ' + out.length + ' pages + sitemap.xml (' + urls.length + ' urls)');
