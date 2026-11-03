// Builds the static site into dist/.
// Blog posts live in content/blog/*.md (edited through /admin) and become dist/blog/<url_slug>.html.
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const SITE_URL = (process.env.SITE_URL || 'https://portfolio-of-kazi.vercel.app').replace(/\/$/, '');
const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const POSTS_DIR = path.join(ROOT, 'content', 'blog');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'templates', 'post.html'), 'utf8');
const AUTHOR = 'Kazi MD Arafat Rahaman';

// Category -> portfolio section marker. Anything else goes into the "Blog" section.
const SECTION = { 'Business Inspection BD': 'business-inspection-bd', '10 Studio': '10-studio' };

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = s => String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const abs = u => (!u ? '' : /^https?:\/\//.test(u) ? u : SITE_URL + (u.startsWith('/') ? u : '/' + u));
const rel = u => (!u ? '' : /^https?:\/\//.test(u) ? u : u.startsWith('/') ? '..' + u : '../' + u);

function copy(src, dest) {
  if (!fs.existsSync(src)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dest, f));
  } else fs.copyFileSync(src, dest);
}

function renderBody(md) {
  let html = marked.parse(md || '', { gfm: true });
  const seen = {};
  const toc = [];
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, lvl, inner) => {
    let id = slugify(inner) || 'section';
    seen[id] = (seen[id] || 0) + 1;
    if (seen[id] > 1) id += '-' + seen[id];
    if (lvl === '2') toc.push({ id, text: inner.replace(/<[^>]+>/g, '') });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  // external links open in a new tab
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
  // images: lazy load, fix root-relative paths for /blog/ pages
  html = html.replace(/<img src="([^"]+)"/g, (m, src) => `<img loading="lazy" src="${rel(src)}"`);
  return { html, toc };
}

function headMeta(p, url) {
  const seo = p.seo || {}, social = p.social || {};
  const title = seo.title || `${p.title} | ${AUTHOR}`;
  const desc = seo.description || '';
  const ogTitle = social.title || title;
  const ogDesc = social.description || desc;
  const ogImg = abs(social.image || p.featured_image || '/assets/headshot.jpg');
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="author" content="${AUTHOR}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${esc(ogTitle)}">`,
    `<meta property="og:description" content="${esc(ogDesc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${esc(ogImg)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(ogTitle)}">`,
    `<meta name="twitter:description" content="${esc(ogDesc)}">`,
    `<meta name="twitter:image" content="${esc(ogImg)}">`,
    p.date ? `<meta property="article:published_time" content="${esc(String(p.date).slice(0, 10))}">` : ''
  ].filter(Boolean).join('\n');
}

function linkCard(p) {
  return `<a class="link-card" href="blog/${p.url_slug}.html"><span class="link-card-title">${esc(p.title)}</span><span class="link-card-arrow">&#8594;</span></a>`;
}

// ---------- start ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
for (const f of ['index.html', 'resume.html', 'style.css']) copy(path.join(ROOT, f), path.join(OUT, f));
copy(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
copy(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));

const posts = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).map(f => {
  const { data, content } = matter(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
  data.url_slug = slugify(data.url_slug || f.replace(/\.md$/, ''));
  data.body = content;
  return data;
}).filter(p => !p.draft);

posts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(b.date || '').localeCompare(String(a.date || '')));

for (const p of posts) {
  const url = `${SITE_URL}/blog/${p.url_slug}.html`;
  const { html, toc } = renderBody(p.body);
  const tocHtml = p.show_toc !== false && toc.length
    ? `<nav class="toc" aria-label="Table of contents"><div class="toc-title">Table of Contents</div><ol>${toc.map(t => `<li><a href="#${t.id}">${t.text}</a></li>`).join('')}</ol></nav>`
    : '';
  const featured = p.featured_image
    ? `<figure class="blog-featured"><img src="${esc(rel(p.featured_image))}" alt="${esc(p.featured_image_alt || '')}"></figure>`
    : '';
  const byline = `By ${AUTHOR}` + (p.byline ? ` &nbsp;&middot;&nbsp; ${esc(p.byline)}` : '');
  const out = TEMPLATE
    .replace('{{HEAD}}', headMeta(p, url))
    .replace('{{CATEGORY}}', esc(p.category || 'Blog'))
    .replace('{{TITLE}}', esc(p.title))
    .replace('{{BYLINE}}', byline)
    .replace('{{FEATURED}}', featured)
    .replace('{{TOC}}', tocHtml)
    .replace('{{BODY}}', html);
  fs.writeFileSync(path.join(OUT, 'blog', `${p.url_slug}.html`), out);
}

// ---------- portfolio: inject post lists ----------
let portfolio = fs.readFileSync(path.join(ROOT, 'portfolio.html'), 'utf8');
for (const [cat, key] of Object.entries(SECTION)) {
  const list = posts.filter(p => p.category === cat).map(linkCard).join('');
  portfolio = portfolio.replace(new RegExp(`<!--posts:${key}-->[\\s\\S]*?<!--/posts-->`), `<!--posts:${key}--><div class="link-grid">${list}</div><!--/posts-->`);
}
const other = posts.filter(p => !SECTION[p.category]);
const blogBlock = other.length ? `<div class="cat-block reveal" id="blog">
<div class="cat-head"><div class="cat-title"><span class="cat-num">07</span>Blog</div><div class="cat-meta">${other.length} article${other.length > 1 ? 's' : ''}</div></div>
<p class="cat-intro">New writing, published here first.</p>
<div class="link-grid">${other.map(linkCard).join('')}</div>
</div>` : '';
portfolio = portfolio.replace('<!--posts-block:blog-->', blogBlock);
fs.writeFileSync(path.join(OUT, 'portfolio.html'), portfolio);

// ---------- sitemap + robots ----------
const pages = ['', 'portfolio.html', 'resume.html', ...posts.map(p => `blog/${p.url_slug}.html`)];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map(u => `  <url><loc>${SITE_URL}/${u}</loc></url>`).join('\n') + `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nDisallow: /admin/\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`Built ${posts.length} posts into dist/`);
