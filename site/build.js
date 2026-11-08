#!/usr/bin/env node
/* ============================================================================
   SFX Brew · 生成音效库静态页面：node site/build.js
   ----------------------------------------------------------------------------
   产出：sounds/index.html（音效库首页）、sounds/<slug>/index.html（每类一页）、
         packs/<slug>/index.html（主题包）、sitemap.xml。
   ★ 不存任何音频文件：页面里只嵌声音参数，播放和下载都在访问者浏览器里实时合成。
   ★ 每个变体用固定种子生成，所以每次构建结果一样（网址和内容稳定，利于 SEO）。
   ★ 改了 presets.js 或 data.js 之后重跑一次，再提交。
   ==========================================================================*/
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('../node/lib.js');
const { SOUNDS, PACKS } = require('./data.js');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://sfxbrew.com/';
const VARIANTS = 12;
const TODAY = new Date().toISOString().slice(0, 10);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonForHtml = o => JSON.stringify(o).replace(/</g, '\\u003c');
const pad = n => String(n).padStart(2, '0');
function seedFor(id) {
  let h = 2166136261;
  for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 1000000;
}
const variant = (id, i) => lib.generate(id, seedFor(id) + i * 7919).patch;
const editHref = (id, patch) => '/#' + id + '.' + Buffer.from(JSON.stringify(patch)).toString('base64url');
const firstSentence = s => s.split(/(?<=\.)\s/)[0];
const groups = { east: 'Eastern & Xianxia', general: 'General Game Sounds' };
const presetGroup = id => lib.PRESETS.find(p => p.id === id).group;

/* ---------------- 公共页头页脚 ---------------- */
function page({ title, description, canonical, body, data, active }) {
  const nav = [['/', 'Editor', 'editor'], ['/sounds/', 'Sound Library', 'library'], ['/packs/xianxia-game-sound-pack/', 'Packs', 'packs'], ['/#agents', 'For AI Agents', 'agents']]
    .map(([href, label, key]) => '<a href="' + href + '"' + (key === active ? ' class="on" aria-current="page"' : '') + '>' + label + '</a>').join('');
  const footerLinks = Object.entries(SOUNDS).map(([, s]) => '<a href="/sounds/' + s.slug + '/">' + esc(s.name) + '</a>').join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/style.css">
</head>
<body class="lib-page">
<header class="top">
  <a class="brand" href="/"><img class="seal" src="/favicon.svg" alt="" width="38" height="38"><span class="name">SFX Brew</span></a>
  <nav class="nav">${nav}</nav>
</header>
<main class="lib">
${body}
</main>
<footer class="foot">
  <div class="foot-links">${footerLinks}</div>
  <p>Every sound on this site is synthesized in your browser and free for commercial use, no attribution required. Made by SFX Brew · <a href="https://github.com/2365836149-sketch/sfxbrew">GitHub</a> · <a href="/llms.txt">llms.txt</a></p>
</footer>
${data ? '<script type="application/json" id="lib-data">' + jsonForHtml(data) + '</script>' : ''}
<script src="/engine.js"></script>
<script src="/shared.js"></script>
<script src="/library.js"></script>
</body>
</html>
`;
}

/* 一组可播放的卡片：静态 HTML 里就有名字和链接，JS 再补上波形和按钮功能 */
function cards(items) {
  return '<div class="cards">' + items.map((it, i) =>
    `<article class="card" data-i="${i}">
  <canvas class="card-wave" aria-hidden="true"></canvas>
  <div class="card-row">
    <button class="play" aria-label="Play ${esc(it.label)}">▶</button>
    <span class="card-name">${esc(it.label)}</span>
    <span class="card-dur"></span>
  </div>
  <div class="card-links"><button class="wav">WAV</button><a href="${it.edit}">Edit</a>${it.category ? '<a href="' + it.category + '">More</a>' : ''}</div>
</article>`).join('\n') + '</div>';
}

function cliBlock(id, slug) {
  return `<pre class="cmd">npx sfxbrew ${id} --count 5 --out assets/sfx/${slug.replace('-sound-effect', '')}.wav</pre>`;
}

/* ---------------- 每类音效一页 ---------------- */
function soundPage(id) {
  const s = SOUNDS[id];
  const items = [];
  for (let i = 0; i < VARIANTS; i++) {
    const patch = variant(id, i);
    items.push({ label: s.name + ' ' + pad(i + 1), file: s.slug.replace('-sound-effect', '') + '-' + pad(i + 1), patch, edit: editHref(id, patch) });
  }
  const related = s.related.map(r => '<a class="tile-sm" href="/sounds/' + SOUNDS[r].slug + '/">' + esc(SOUNDS[r].name) + '</a>').join('');
  const body = `
<nav class="crumbs"><a href="/sounds/">Sound Library</a> <span>/</span> ${esc(groups[presetGroup(id)])} <span>/</span> ${esc(s.name)}</nav>
<h1>${esc(s.title)}</h1>
<p class="lead">${esc(s.intro)}</p>
<div class="lib-actions">
  <button class="primary" data-act="zip">Download all ${VARIANTS} as ZIP</button>
  <button data-act="code">Copy JavaScript for all ${VARIANTS}</button>
  <a class="btn" href="/#${id}">Brew your own in the editor</a>
</div>
${cards(items)}
<p class="muted small">Every press of <a href="/#${id}">New</a> in the editor brews a different ${esc(s.name.toLowerCase())}; these ${VARIANTS} are a fixed selection so the links stay the same.</p>
<section class="info">
  <div>
    <h2>Good for</h2>
    <ul>${s.uses.map(u => '<li>' + esc(u) + '</li>').join('')}</ul>
    <h2>Tweaking tip</h2>
    <p>${esc(s.tip)} Open any variant with <b>Edit</b> to change it with sliders.</p>
  </div>
  <div>
    <h2>Generate them from code or an AI agent</h2>
    <p>The same sounds are available from the command line:</p>
    ${cliBlock(id, s.slug)}
    <p>Or let Claude Code, Cursor or any MCP client add them to your project: <code>claude mcp add sfxbrew -- npx -y -p sfxbrew sfxbrew-mcp</code>, then ask for "${esc(s.name.toLowerCase())} sounds".</p>
    <h2>License</h2>
    <p>Free for commercial and non-commercial use. No attribution, no sign-up. The sounds are synthesized from scratch, not recorded, so there are no third-party rights attached.</p>
  </div>
</section>
<section>
  <h2>Related sounds</h2>
  <div class="related">${related}</div>
</section>`;
  return {
    file: 'sounds/' + s.slug + '/index.html',
    html: page({
      title: s.title + ' — WAV & JS, Royalty-Free | SFX Brew',
      description: s.intro.split('. ')[0] + '. ' + VARIANTS + ' free variations to play, download as WAV or copy as JavaScript. Free for commercial use.',
      canonical: SITE + 'sounds/' + s.slug + '/',
      active: 'library',
      body,
      data: { zip: s.slug.replace('-sound-effect', '') + '-sfxbrew.zip', sounds: items.map(x => ({ file: x.file, patch: x.patch })) }
    })
  };
}

/* ---------------- 主题包 ---------------- */
function packPage(slug) {
  const p = PACKS[slug];
  const items = [];
  p.items.forEach(([id, n]) => {
    for (let i = 0; i < n; i++) {
      const patch = variant(id, i);
      const s = SOUNDS[id];
      items.push({ label: s.name + (n > 1 ? ' ' + pad(i + 1) : ''), file: s.slug.replace('-sound-effect', '') + '-' + pad(i + 1), patch, edit: editHref(id, patch), category: '/sounds/' + s.slug + '/' });
    }
  });
  const other = Object.keys(PACKS).filter(k => k !== slug).map(k => '<a class="tile-sm" href="/packs/' + k + '/">' + esc(PACKS[k].name) + '</a>').join('');
  const body = `
<nav class="crumbs"><a href="/sounds/">Sound Library</a> <span>/</span> Packs <span>/</span> ${esc(p.name)}</nav>
<h1>${esc(p.title)}</h1>
<p class="lead">${esc(p.intro)}</p>
<div class="lib-actions">
  <button class="primary" data-act="zip">Download all ${items.length} sounds as ZIP</button>
  <button data-act="code">Copy JavaScript for the whole pack</button>
</div>
${cards(items)}
<section>
  <h2>More packs</h2>
  <div class="related">${other}<a class="tile-sm" href="/sounds/">All sound categories</a></div>
</section>`;
  return {
    file: 'packs/' + slug + '/index.html',
    html: page({
      title: p.title + ' — ' + items.length + ' Royalty-Free Sounds | SFX Brew',
      description: p.intro.split('. ')[0] + '. ' + items.length + ' sounds, free download as WAV or JavaScript.',
      canonical: SITE + 'packs/' + slug + '/',
      active: 'packs',
      body,
      data: { zip: slug + '-sfxbrew.zip', sounds: items.map(x => ({ file: x.file, patch: x.patch })) }
    })
  };
}

/* ---------------- 音效库首页 ---------------- */
function libraryIndex() {
  const tiles = [], data = [];
  ['east', 'general'].forEach(g => {
    const ids = Object.keys(SOUNDS).filter(id => presetGroup(id) === g);
    tiles.push('<h2>' + groups[g] + '</h2><div class="tiles">' + ids.map(id => {
      const s = SOUNDS[id], i = data.length;
      data.push({ file: s.slug, patch: variant(id, 0) });
      return `<div class="tile" data-i="${i}"><button class="play" aria-label="Play ${esc(s.name)}">▶</button><div><a href="/sounds/${s.slug}/"><b>${esc(s.name)}</b></a><p>${esc(firstSentence(s.intro))}</p></div></div>`;
    }).join('') + '</div>');
  });
  const packs = Object.entries(PACKS).map(([slug, p]) => `<a class="pack" href="/packs/${slug}/"><b>${esc(p.name)}</b><span>${p.items.reduce((a, x) => a + x[1], 0)} sounds</span><p>${esc(firstSentence(p.intro))}</p></a>`).join('');
  const body = `
<h1>Free Game Sound Effects Library</h1>
<p class="lead">${Object.keys(SOUNDS).length} kinds of sound effects for games, each with ${VARIANTS} ready-made variations. Press play to listen, download WAV files, or copy a JavaScript snippet that plays them with no audio files at all. Everything is synthesized in your browser and free for commercial use.</p>
<section id="packs"><h2>Sound packs</h2><div class="packs">${packs}</div></section>
${tiles.join('\n')}`;
  return {
    file: 'sounds/index.html',
    html: page({
      title: 'Free Game Sound Effects Library — Eastern & Classic SFX | SFX Brew',
      description: 'Royalty-free game sound effects: sword slashes, guqin, bells, gongs, thunder, coins, clicks, jumps, hits, explosions and more. Download WAV or copy JavaScript, free for commercial use.',
      canonical: SITE + 'sounds/',
      active: 'library',
      body,
      data: { sounds: data }
    })
  };
}

/* ---------------- 写文件 ---------------- */
const out = [libraryIndex(), ...Object.keys(SOUNDS).map(soundPage), ...Object.keys(PACKS).map(packPage)];
const missing = lib.PRESETS.filter(p => !SOUNDS[p.id]).map(p => p.id);
if (missing.length) throw new Error('data.js 缺少这些预设的文案: ' + missing.join(', '));
for (const dir of ['sounds', 'packs']) fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
out.forEach(o => { lib.writeFile(path.join(ROOT, o.file), o.html); });

const urls = ['', 'sounds/', ...Object.values(SOUNDS).map(s => 'sounds/' + s.slug + '/'), ...Object.keys(PACKS).map(k => 'packs/' + k + '/'), 'llms.txt'];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => '  <url><loc>' + SITE + u + '</loc><lastmod>' + TODAY + '</lastmod></url>').join('\n') + '\n</urlset>\n');

console.log('wrote ' + out.length + ' pages + sitemap.xml (' + urls.length + ' urls)');
