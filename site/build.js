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
const { SOUNDS, PACKS, UI, MUSIC, STUDIO, CAT_COPY } = require('./data.js');
const CAT = require('../catalog.js');
const ENGINE = require('../engine.js')({});

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
const editorUrl = (lang, hash) => (lang === 'zh' ? '/editor/?lang=zh' : '/editor/') + (hash || '');
const introUrl = lang => (lang === 'zh' ? '/?lang=zh' : '/');
const editHref = (lang, id, patch) => editorUrl(lang, '#' + id + '.' + Buffer.from(JSON.stringify(patch)).toString('base64url'));
const firstSentence = (s, lang) => (lang === 'zh' ? s.split(/(?<=。)/)[0] : s.split(/(?<=\.)\s/)[0]);
/* 分类全部来自 catalog.js */
const catName = (lang, c) => CAT.CATEGORIES.find(x => x.id === c)[lang];
const catUrl = (lang, c) => PREFIX[lang] + 'sounds/c/' + CAT_COPY[c].slug + '/';
const idsIn = c => Object.keys(SOUNDS).filter(id => CAT.catsOf(id).includes(c));
const usedCats = () => CAT.CATEGORIES.map(c => c.id).filter(c => idsIn(c).length);
/* 一个预设的全部标签（含自动算出的长短、来源），形如 ['style:eastern', 'length:short'] */
function tagsOf(id) {
  const e = CAT.ENTRIES[id], p = variant(id, 0), out = [];
  ['style', 'material', 'mood'].forEach(d => (e.tags[d] || []).forEach(v => out.push(d + ':' + v)));
  out.push('length:' + CAT.lengthOf(ENGINE.duration(p)), 'source:' + CAT.sourceOf(p));
  return out;
}
const tagName = (lang, t) => { const [d, v] = t.split(':'); return CAT.TAGS[d].values.find(x => x.id === v)[lang]; };
const fileBase = id => SOUNDS[id].slug.replace('-sound-effect', '');
const soundUrl = (lang, id) => PREFIX[lang] + 'sounds/' + SOUNDS[id].slug + '/';
const packUrl = (lang, slug) => PREFIX[lang] + 'packs/' + slug + '/';

/* ---------------- 全站顶栏（音效库和实验室都用这一份） ---------------- */
function siteBar(lang, active, altPath) {
  const u = UI[lang];
  const tabs = [[editorUrl(lang), u.navEditor, 'editor'], [PREFIX[lang] + 'sounds/', u.navLibrary, 'library'], [PREFIX[lang] + 'lab/', u.navLab, 'lab']]
    .map(([href, label, key]) => '<a href="' + href + '"' + (key === active ? ' class="on" aria-current="page"' : '') + '>' + esc(label) + '</a>').join('');
  return `<header class="bar">
  <a class="bar-brand" href="${introUrl(lang)}"><img src="/favicon.svg" alt=""><span>SFX Brew</span></a>
  <nav class="bar-tabs">${tabs}</nav>
  <span class="bar-spacer"></span>
  <a class="bar-link hide-sm" href="${introUrl(lang)}#agents">${esc(u.navAgents)}</a>
  <a class="bar-link" href="${altPath}" hreflang="${HREFLANG[other(lang)]}" lang="${HTML_LANG[other(lang)]}">${esc(u.switchLang)}</a>
</header>`;
}
function headTags(lang, { title, description, urlPath, altPath }) {
  const alt = (l, p) => '<link rel="alternate" hreflang="' + HREFLANG[l] + '" href="' + SITE + p + '">';
  const paths = { [lang]: urlPath, [other(lang)]: altPath };
  return `<meta charset="utf-8">
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
<meta name="twitter:card" content="summary">`;
}
/* 音效库左侧导航（详情页、音效包页）：全部 / 音效包 / 各大类（当前大类展开列出音效） */
function libSide(lang, current) {
  const u = UI[lang];
  const link = (href, label, key, extra) => '<a href="' + href + '"' + (key === current ? ' class="on" aria-current="page"' : '') + '>' + esc(label) + (extra || '') + '</a>';
  const grp = (label, links) => '<div class="side-g"><p class="sec-h">' + esc(label) + '</p><div class="side-l">' + links + '</div></div>';
  const curCat = current.startsWith('sound:') ? CAT.ENTRIES[current.slice(6)].cat : current.startsWith('cat:') ? current.slice(4) : null;
  let h = '<div class="side-g"><div class="side-l">' + link(PREFIX[lang] + 'sounds/', u.allCats, 'index') + '</div></div>';
  h += grp(u.packs, Object.keys(PACKS).map(k => link(packUrl(lang, k), PACKS[k][lang].name, 'pack:' + k)).join(''));
  h += grp(u.categoriesH, usedCats().map(c => link(catUrl(lang, c), catName(lang, c), 'cat:' + c, ' <i>' + idsIn(c).length + '</i>') +
    (c === curCat ? '<div class="side-sub">' + idsIn(c).map(id => link(soundUrl(lang, id), SOUNDS[id][lang].name, 'sound:' + id)).join('') + '</div>' : '')).join(''));
  const curName = current === 'index' ? u.allCats : current.startsWith('pack:') ? PACKS[current.slice(5)][lang].name : current.startsWith('cat:') ? catName(lang, current.slice(4)) : SOUNDS[current.slice(6)][lang].name;
  return '<button class="lib-side-toggle" aria-expanded="false" onclick="var o=this.parentNode.classList.toggle(\'side-open\');this.setAttribute(\'aria-expanded\',o)">' + esc(u.category) + '：' + esc(curName) + ' <span>▾</span></button>' +
    '<nav class="lib-side" aria-label="' + esc(u.library) + '">' + h + '</nav>';
}

/* ---------------- 音效库页面外壳 ---------------- */
function page(lang, { title, description, urlPath, altPath, body, data, side, sideHtml, scripts }) {
  const u = UI[lang];
  return `<!doctype html>
<html lang="${HTML_LANG[lang]}">
<head>
${headTags(lang, { title, description, urlPath, altPath })}
<link rel="stylesheet" href="/style.css">
</head>
<body>
${siteBar(lang, 'library', altPath)}
<div class="lib-shell">
<div class="lib-side-wrap">${sideHtml || libSide(lang, side)}</div>
<main class="lib">
${body}
<footer class="foot">
  <p>${esc(u.footer)}</p>
  <p class="foot-meta"><a href="/samples/CREDITS.md">${esc(u.credits)}</a><a href="https://github.com/2365836149-sketch/sfxbrew">GitHub</a><a href="/llms.txt">llms.txt</a></p>
</footer>
</main>
</div>
${data ? '<script type="application/json" id="lib-data">' + jsonForHtml(Object.assign({ i18n: { rendering: u.js.rendering('{i}', '{n}'), downloaded: u.js.downloaded, copied: u.js.copied, copyFailed: u.js.copyFailed } }, data)) + '</script>' : ''}
<script src="/engine.js"></script>
<script src="/shared.js"></script>
${scripts || '<script src="/library.js"></script>'}
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
  const c0 = CAT.ENTRIES[id].cat;
  const body = `
<nav class="crumbs"><a href="${PREFIX[lang]}sounds/">${esc(u.library)}</a> <span>/</span> <a href="${catUrl(lang, c0)}">${esc(catName(lang, c0))}</a></nav>
<div class="lib-top">
  <h1>${esc(t.title)}</h1><span class="count">${esc(u.nVariants(VARIANTS))}</span>
  <div class="lib-actions">
    <button class="btn primary" data-act="zip">${esc(u.zipAll(VARIANTS))}</button>
    <button class="btn" data-act="code">${esc(u.codeAll(VARIANTS))}</button>
    <a class="btn seal" href="${editorUrl(lang, '#' + id)}">${esc(u.editor)}</a>
  </div>
</div>
<p class="lead">${esc(firstSentence(t.intro, lang))}</p>
${cards(lang, items)}
<h2>${esc(u.related)}</h2>
<div class="related">${related}</div>
<details class="more-info">
  <summary>${esc(u.moreInfo(t.name))}</summary>
  <p class="muted">${esc(t.intro)} ${esc(u.fixedNote(t.name, VARIANTS))}</p>
  <div class="info">
    <div>
      <h3>${esc(u.goodFor)}</h3>
      <ul>${t.uses.map(x => '<li>' + esc(x) + '</li>').join('')}</ul>
      <h3>${esc(u.tipH)}</h3>
      <p>${esc(t.tip + u.tipTail)}</p>
      <h3>${esc(u.licenseH)}</h3>
      <p>${esc(u.licenseP)}</p>
    </div>
    <div>
      <h3>${esc(u.agentH)}</h3>
      <p>${esc(u.agentP1)}</p>
      <pre class="cmd">npx sfxbrew ${id} --count 5 --out assets/sfx/${fileBase(id)}.wav</pre>
      <p>${esc(u.agentP2(t.name))}</p>
      <pre class="cmd">claude mcp add sfxbrew -- npx -y -p sfxbrew sfxbrew-mcp</pre>
      <p>${esc(u.skillP)} <a href="https://www.agensi.io/skills/sfx-brew-game-sound-effects">Agensi</a> · <a href="https://github.com/2365836149-sketch/sfxbrew/tree/main/skills/sfxbrew">GitHub</a></p>
    </div>
  </div>
</details>`;
  return {
    file: PREFIX[lang].slice(1) + 'sounds/' + s.slug + '/index.html',
    html: page(lang, {
      title: u.soundMetaTitle(t.title),
      description: u.soundMetaDesc(firstSentence(t.intro, lang), VARIANTS),
      urlPath: soundUrl(lang, id), altPath: soundUrl(other(lang), id),
      side: 'sound:' + id, body,
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
<nav class="crumbs"><a href="${PREFIX[lang]}sounds/">${esc(u.library)}</a> <span>/</span> ${esc(u.packs)}</nav>
<div class="lib-top">
  <h1>${esc(t.title)}</h1><span class="count">${esc(u.packSounds(items.length))}</span>
  <div class="lib-actions">
    <button class="btn primary" data-act="zip">${esc(u.zipPack(items.length))}</button>
    <button class="btn" data-act="code">${esc(u.codePack)}</button>
  </div>
</div>
<p class="lead">${esc(t.intro)}</p>
${cards(lang, items)}
<h2>${esc(u.morePacks)}</h2>
<div class="related">${others}<a class="tile-sm" href="${PREFIX[lang]}sounds/">${esc(u.allCats)}</a></div>`;
  return {
    file: PREFIX[lang].slice(1) + 'packs/' + slug + '/index.html',
    html: page(lang, {
      title: u.packMetaTitle(t.title, items.length),
      description: u.packMetaDesc(firstSentence(t.intro, lang), items.length),
      urlPath: packUrl(lang, slug), altPath: packUrl(other(lang), slug),
      side: 'pack:' + slug, body,
      data: { zip: slug + '-sfxbrew.zip', sounds: items.map(x => ({ file: x.file, patch: x.patch })) }
    })
  };
}

/* ---------------- 音效库检索页（/sounds/）和每个大类的页面（/sounds/c/<大类>/） ----------------
   静态 HTML 里就有全部结果卡片（搜索引擎能看到），search.js 负责搜索、筛选、排序、播放。
   检索页：左栏点大类 = 就地筛选；大类页：只含这一类，左栏大类是普通链接。 */
function searchPage(lang, cat) {
  const u = UI[lang], ids = cat ? idsIn(cat) : Object.keys(SOUNDS), data = [];
  /* 默认顺序：按大类，再按目录顺序 */
  const order = id => CAT.CATEGORIES.findIndex(c => c.id === CAT.ENTRIES[id].cat) * 1000 + Object.keys(CAT.ENTRIES).indexOf(id);
  ids.sort((x, y) => order(x) - order(y));
  const cardsHtml = ids.map((id, i) => {
    const t = SOUNDS[id][lang], p = variant(id, 0), tags = tagsOf(id), cats = CAT.catsOf(id);
    data.push({ id, file: fileBase(id), patch: p });
    const hay = [SOUNDS[id].en.name, SOUNDS[id].zh.name, id, CAT.ENTRIES[id].kw, ...cats.map(c => catName('en', c) + ' ' + catName('zh', c)), ...tags.map(x => tagName('en', x) + ' ' + tagName('zh', x))].join(' ').toLowerCase();
    const shown = tags.filter(x => /^(style|material|mood):/.test(x)).slice(0, 3).map(x => tagName(lang, x));
    return `<article class="card sc" data-i="${i}" data-cats="${cats.join(' ')}" data-tags="${tags.join(' ')}" data-hay="${esc(hay)}" data-dur="${ENGINE.duration(p).toFixed(2)}" data-name="${esc(t.name)}">
  <canvas class="card-wave" aria-hidden="true"></canvas>
  <div class="card-row"><button class="play" aria-label="${esc(u.play + ' ' + t.name)}">▶</button><a class="card-name" href="${soundUrl(lang, id)}">${esc(t.name)}</a><span class="card-dur"></span></div>
  <div class="card-tags">${esc([catName(lang, cats[0]), ...shown].join(' · '))}</div>
  <div class="card-links"><button class="reroll">${esc(u.reroll)}</button><button class="wav">WAV</button><a class="edit" href="${editorUrl(lang, '#' + id)}">${esc(u.edit)}</a><a href="${soundUrl(lang, id)}">${esc(u.details)}</a></div>
</article>`;
  }).join('\n');

  /* 左栏：音效包 / 大类 / 各标签维度（数量按本页的音效算） */
  const countTag = t => ids.filter(id => tagsOf(id).includes(t)).length;
  const catLinks = usedCats().map(c => {
    const n = cat ? idsIn(c).length : ids.filter(id => CAT.catsOf(id).includes(c)).length;
    const href = catUrl(lang, c), on = c === cat;
    return `<a href="${href}" data-cat="${c}"${on ? ' class="on" aria-current="page"' : ''}>${esc(catName(lang, c))} <i>${n}</i></a>`;
  }).join('');
  const facets = Object.entries(CAT.TAGS).map(([d, dim]) => {
    const vals = dim.values.map(v => ({ t: d + ':' + v.id, label: v[lang], n: countTag(d + ':' + v.id) })).filter(x => x.n);
    if (!vals.length) return '';
    return `<div class="side-g facet"><p class="sec-h">${esc(dim[lang])}</p><div class="side-l">${vals.map(x => `<label class="fchk"><input type="checkbox" value="${x.t}"> <span>${esc(x.label)}</span> <i>${x.n}</i></label>`).join('')}</div></div>`;
  }).join('');
  const sideHtml = `<button class="lib-side-toggle" aria-expanded="false" onclick="var o=this.parentNode.classList.toggle('side-open');this.setAttribute('aria-expanded',o)">${esc(u.filters)} <span>▾</span></button>
<nav class="lib-side" aria-label="${esc(u.filters)}">
<div class="side-g"><div class="side-l"><a href="${PREFIX[lang]}sounds/" data-cat=""${cat ? '' : ' class="on"'}>${esc(u.allCats)} <i>${Object.keys(SOUNDS).length}</i></a></div></div>
<div class="side-g"><p class="sec-h">${esc(u.categoriesH)}</p><div class="side-l cat-links">${catLinks}</div></div>
${facets}
<div class="side-g"><p class="sec-h">${esc(u.packs)}</p><div class="side-l">${Object.keys(PACKS).map(k => `<a href="${packUrl(lang, k)}">${esc(PACKS[k][lang].name)}</a>`).join('')}</div></div>
</nav>`;
  const cc = cat ? CAT_COPY[cat][lang] : null;
  const body = `
${cat ? `<nav class="crumbs"><a href="${PREFIX[lang]}sounds/">${esc(u.library)}</a> <span>/</span> ${esc(catName(lang, cat))}</nav>` : ''}
<div class="lib-top">
  <h1>${esc(cat ? cc.title : u.libTitle)}</h1>
  <input id="sq" class="search sq" type="search" placeholder="${esc(u.searchPh)}" autocomplete="off" aria-label="${esc(u.searchPh)}">
  <select id="ssort" class="ssort" aria-label="${esc(u.sortDefault)}"><option value="">${esc(u.sortDefault)}</option><option value="name">${esc(u.sortName)}</option><option value="dur">${esc(u.sortDur)}</option></select>
  <span id="scount" class="count"></span>
  <button id="sclear" class="link" hidden>${esc(u.clearAll)}</button>
</div>
${cat ? `<p class="lead">${esc(cc.intro)}</p>` : ''}
<div id="sresults" class="cards">${cardsHtml}</div>
<p id="sempty" class="muted" hidden>${esc(u.noResults)}</p>
${cat ? '' : `<details class="more-info"><summary>${esc(u.aboutLib)}</summary><p class="muted">${esc(u.libLead(Object.keys(SOUNDS).length, VARIANTS))}</p></details>`}`;
  const urlPath = cat ? catUrl(lang, cat) : PREFIX[lang] + 'sounds/', altPath = cat ? catUrl(other(lang), cat) : PREFIX[other(lang)] + 'sounds/';
  return {
    file: urlPath.slice(1) + 'index.html',
    html: page(lang, {
      title: cat ? cc.title + ' — ' + u.nSounds(ids.length) + ' | SFX Brew' : u.libMetaTitle,
      description: cat ? cc.intro + ' ' + u.libMetaTail : u.libMetaDesc,
      urlPath, altPath, sideHtml, body,
      data: { mode: cat ? 'cat' : 'all', i18n2: { showing: u.showing('{n}', '{m}') }, sounds: data },
      scripts: '<script src="/presets.js"></script>\n<script src="/search.js"></script>'
    })
  };
}

/* ---------------- 配乐页 = 编曲工作室（满屏工具，说明文字在下面） ---------------- */
function labPage(lang) {
  const st = STUDIO[lang], u = UI[lang], m = MUSIC[lang];
  const urlPath = PREFIX[lang] + 'lab/', altPath = PREFIX[other(lang)] + 'lab/';
  const alt = (l, p) => '<link rel="alternate" hreflang="' + HREFLANG[l] + '" href="' + SITE + p + '">';
  const paths = { [lang]: urlPath, [other(lang)]: altPath };
  const btn = (id, label, icon, extra) => `<button id="${id}" class="st-ib${extra ? ' ' + extra : ''}" title="${esc(label)}" aria-label="${esc(label)}">${icon}</button>`;
  const ICON = {
    home: '<svg viewBox="0 0 16 16"><path d="M3 3v10M13 3 6 8l7 5z"/></svg>',
    play: '<svg viewBox="0 0 16 16" class="i-play"><path d="M4 2.5v11l9-5.5z"/></svg><svg viewBox="0 0 16 16" class="i-stop"><rect x="3.5" y="3.5" width="9" height="9" rx="1"/></svg>',
    loop: '<svg viewBox="0 0 16 16"><path d="M3 7V6a2 2 0 0 1 2-2h7l-2-2M13 9v1a2 2 0 0 1-2 2H4l2 2" fill="none"/></svg>',
    metro: '<svg viewBox="0 0 16 16"><path d="M6 2h4l3 12H3zM8 10l4-6" fill="none"/></svg>',
    undo: '<svg viewBox="0 0 16 16"><path d="M5 3 2 6l3 3M2 6h8a4 4 0 0 1 0 8H7" fill="none"/></svg>',
    redo: '<svg viewBox="0 0 16 16"><path d="m11 3 3 3-3 3M14 6H6a4 4 0 0 0 0 8h3" fill="none"/></svg>',
    zin: '<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" fill="none"/></svg>',
    zout: '<svg viewBox="0 0 16 16"><path d="M3 8h10" fill="none"/></svg>'
  };
  const moods = Object.entries(m.moods).map(([id, [name, desc]]) => `<button class="st-mood" data-mood="${id}"><b>${esc(name)}</b><span>${esc(desc)}</span></button>`).join('');
  const qOpts = Object.entries(st.q).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
  const appData = { lang, i18n: st.i18n };
  const html = `<!doctype html>
<html lang="${HTML_LANG[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(st.title)} | SFX Brew</title>
<meta name="description" content="${esc(st.metaDesc)}">
<link rel="canonical" href="${SITE + urlPath}">
${alt('en', paths.en)}
${alt('zh', paths.zh)}
<link rel="alternate" hreflang="x-default" href="${SITE + paths.en}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(st.title)}">
<meta property="og:description" content="${esc(st.metaDesc)}">
<meta property="og:url" content="${SITE + urlPath}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/studio/studio.css">
</head>
<body class="st-page">
${siteBar(lang, 'lab', altPath)}
<div class="st-app">
<header class="st-top">
  <select id="st-exp" class="st-exp" aria-label="${esc(u.navLab)}"><option>${esc(st.expStudio)}</option><option disabled>${esc(st.expText)}</option></select>
  <input id="st-title" class="st-title" placeholder="${esc(st.untitled)}" spellcheck="false" aria-label="${esc(st.untitled)}">
  <div class="st-group">${btn('st-home', st.toStart, ICON.home)}${btn('st-play', st.play, ICON.play, 'st-playbtn')}${btn('st-loop', st.loop, ICON.loop)}${btn('st-metro', st.metronome, ICON.metro)}</div>
  <div class="st-lcd" aria-live="off"><b id="st-bar">1.1</b><span id="st-time">0:00.0</span></div>
  <div class="st-group st-proj">
    <label class="st-mini"><span>${esc(st.tempo)}</span><input id="st-tempo" type="number" min="30" max="240" step="1"></label>
    <label class="st-mini"><span>${esc(st.key)}</span><select id="st-root"></select></label>
    <label class="st-mini"><span>${esc(st.mode)}</span><select id="st-mode"></select></label>
    <button id="st-lock" class="st-tb" title="${esc(st.scaleLockTip)}">${esc(st.scaleLock)}</button>
  </div>
  <div class="st-group">${btn('st-undo', st.undo, ICON.undo)}${btn('st-redo', st.redo, ICON.redo)}</div>
  <div class="st-group st-zoomg">${btn('st-zout', st.zoomOut, ICON.zout)}${btn('st-zin', st.zoomIn, ICON.zin)}</div>
  <div class="st-spacer"></div>
  <button id="st-new" class="st-tb">${esc(st.newProject)}</button>
  <button id="st-export" class="st-tb primary" data-pop>${esc(st.exportBtn)} ▾</button>
</header>
<p class="st-mobile">${esc(st.mobile)}</p>
<main class="st-main">
  <aside id="st-heads" class="st-heads">
    <div id="st-heads-in">
      <div class="st-lanes"><span style="height:14px">${esc(st.loopLane)}</span><span style="height:20px">${esc(st.barsLane)}</span><span style="height:18px">${esc(st.secLane)}</span><span style="height:20px">${esc(st.chordLane)}</span></div>
      <div id="st-heads-list"></div>
      <div class="st-addrow"><button id="st-add" class="st-tb" data-pop>${esc(st.addTrack)}</button></div>
    </div>
  </aside>
  <section class="st-tl-wrap"><div id="st-tl" class="st-scroll"><div id="st-tl-sizer"></div></div><canvas id="st-tl-cv" aria-hidden="true"></canvas></section>
  <aside id="st-insp" class="st-insp"></aside>
</main>
<section id="st-roll" class="st-roll">
  <div id="st-roll-grip" class="st-grip" aria-hidden="true"></div>
  <div class="st-roll-bar">
    <b id="st-roll-title"></b>
    <label class="st-mini"><span>${esc(st.quantGrid)}</span><select id="st-roll-q">${qOpts}</select></label>
    <button id="st-roll-quant" class="st-tb">${esc(st.quantize)}</button>
    <button id="st-roll-loop" class="st-tb">${esc(st.loopThis)}</button>
    ${btn('st-roll-zout', st.zoomOut, ICON.zout)}${btn('st-roll-zin', st.zoomIn, ICON.zin)}
    <span class="st-roll-hint">${esc(st.rollHint)}</span>
    <button id="st-roll-close" class="st-ib" title="${esc(st.close)}" aria-label="${esc(st.close)}">✕</button>
  </div>
  <div class="st-roll-body"><div id="st-roll-scroll" class="st-scroll"><div id="st-roll-sizer"></div></div><canvas id="st-roll-cv" aria-hidden="true"></canvas></div>
</section>
<footer class="st-status"><span id="st-status-msg" role="status"></span></footer>
</div>

<div id="st-add-menu" class="st-pop" hidden></div>
<div id="st-export-menu" class="st-pop" hidden>
  <button id="x-song">${esc(st.xSong)}</button><button id="x-loop">${esc(st.xLoop)}</button><button id="x-stems">${esc(st.xStems)}</button>
  <hr><button id="x-save">${esc(st.xSave)}</button><button id="x-open">${esc(st.xOpen)}</button>
</div>
<input id="st-file" type="file" accept=".json,application/json" hidden>

<div id="st-start" class="st-start" hidden>
  <div class="st-start-box" role="dialog" aria-labelledby="st-start-h">
    <button id="st-start-close" class="st-ib st-x" aria-label="${esc(st.close)}">✕</button>
    <h2 id="st-start-h">${esc(st.startH)}</h2>
    <p>${esc(st.startP)}</p>
    <h3>${esc(st.moodsH)}</h3>
    <div class="st-moods">${moods}</div>
    <div class="st-start-row">
      <button id="st-blank" class="st-mood"><b>${esc(st.blank)}</b><span>${esc(st.blankP)}</span></button>
      <button id="st-start-open" class="st-tb">${esc(st.openFile)}</button>
      <button id="st-start-resume" class="st-tb primary" hidden>${esc(st.resume)}</button>
    </div>
  </div>
</div>

<section class="st-about">
  <h1>${esc(st.aboutH)}</h1>
  ${st.aboutP.map(p => '<p>' + esc(p) + '</p>').join('\n  ')}
  <p class="foot-meta"><a href="${PREFIX[lang]}sounds/">${esc(u.navLibrary)}</a><a href="/samples/CREDITS.md">${esc(u.credits)}</a><a href="https://github.com/2365836149-sketch/sfxbrew">GitHub</a></p>
</section>
<script type="application/json" id="studio-data">${jsonForHtml(appData)}</script>
<script src="/engine.js"></script>
<script src="/shared.js"></script>
<script src="/music.js"></script>
<script src="/studio/project.js"></script>
<script src="/studio/instruments.js"></script>
<script src="/studio/player.js"></script>
<script src="/studio/smart.js"></script>
<script src="/studio/roll.js"></script>
<script src="/studio/app.js"></script>
</body>
</html>
`;
  return { file: PREFIX[lang].slice(1) + 'lab/index.html', html };
}

/* 旧地址 /music/ 搬到 /lab/：留一个跳转页（canonical 指向新地址） */
function musicRedirect(lang) {
  const to = PREFIX[lang] + 'lab/';
  return { file: PREFIX[lang].slice(1) + 'music/index.html', html: `<!doctype html>
<html lang="${HTML_LANG[lang]}"><head><meta charset="utf-8"><title>SFX Brew Lab</title>
<link rel="canonical" href="${SITE + to}"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${to}"><script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script>
</head><body><a href="${to}">${to}</a></body></html>
` };
}

/* ---------------- 写文件 ---------------- */
const missing = lib.PRESETS.filter(p => !SOUNDS[p.id]).map(p => p.id);
if (missing.length) throw new Error('data.js 缺少这些预设的文案: ' + missing.join(', '));
const out = [];
LANGS.forEach(lang => {
  out.push(searchPage(lang, null), ...usedCats().map(c => searchPage(lang, c)), labPage(lang), musicRedirect(lang), ...Object.keys(SOUNDS).map(id => soundPage(lang, id)), ...Object.keys(PACKS).map(slug => packPage(lang, slug)));
});
for (const dir of ['sounds', 'packs', 'zh', 'music', 'lab']) fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
out.forEach(o => { lib.writeFile(path.join(ROOT, o.file), o.html); });

const urls = ['/', '/editor/', ...LANGS.flatMap(l => [PREFIX[l] + 'sounds/', ...usedCats().map(c => catUrl(l, c)), PREFIX[l] + 'lab/', ...Object.keys(SOUNDS).map(id => soundUrl(l, id)), ...Object.keys(PACKS).map(k => packUrl(l, k))]), '/llms.txt'];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => '  <url><loc>' + SITE + u + '</loc><lastmod>' + TODAY + '</lastmod></url>').join('\n') + '\n</urlset>\n');

console.log('wrote ' + out.length + ' pages + sitemap.xml (' + urls.length + ' urls)');
