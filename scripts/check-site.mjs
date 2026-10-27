import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL } from '../site.config.mjs';

const root = path.resolve('dist');
if (!(await stat(root).catch(() => null))) {
  console.error('Build output is missing. Run pnpm build first.');
  process.exit(1);
}
async function walk(dir) {
  const found = [];
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, file.name);
    if (file.isDirectory()) found.push(...(await walk(p)));
    else found.push(p);
  }
  return found;
}
const files = await walk(root),
  htmlFiles = files.filter((f) => f.endsWith('.html'));
const html = new Map(await Promise.all(htmlFiles.map(async (f) => [f, await readFile(f, 'utf8')])));
const errors = [];
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
for (const [file, source] of html) {
  const label = path.relative(root, file);
  if (!/<title>[^<]+<\/title>/.test(source)) errors.push(`${label}: missing title`);
  if (!/<html[^>]+lang=/.test(source)) errors.push(`${label}: missing language`);
  if (label.startsWith('zh/') && !/<html[^>]+lang="zh-CN"/.test(source))
    errors.push(`${label}: Chinese page must use zh-CN`);
  const canonical = source.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  if (!canonical || new URL(decode(canonical[1])).origin !== SITE_URL)
    errors.push(`${label}: canonical origin does not match ${SITE_URL}`);
  for (const tag of source.matchAll(/<link\b[^>]*>/g)) {
    if (!/\bhreflang=/.test(tag[0])) continue;
    const href = tag[0].match(/\bhref="([^"]+)"/)?.[1];
    if (!href) continue;
    const alternate = new URL(decode(href), SITE_URL);
    let alternateFile = path.join(root, decodeURIComponent(alternate.pathname));
    if ((await stat(alternateFile).catch(() => null))?.isDirectory())
      alternateFile = path.join(alternateFile, 'index.html');
    if (!(await stat(alternateFile).catch(() => null)))
      errors.push(`${label}: missing language alternate ${href}`);
  }
  if (label.startsWith('zh/')) {
    for (const tag of source.matchAll(/<a\b[^>]*>/g)) {
      const href = decode(tag[0].match(/\bhref="([^"]+)"/)?.[1] || '');
      if (
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !/^\/(?:zh|assets|media|_astro)\//.test(href) &&
        !/data-language-switch/.test(tag[0])
      )
        errors.push(`${label}: navigation leaves Chinese site: ${href}`);
    }
  }
  if (/mobiri\.se|mobirise\.com|www\.baidu\.com|fonts\.googleapis/.test(source))
    errors.push(`${label}: leftover template or remote font dependency`);
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of new Set(ids.filter((id, index) => ids.indexOf(id) !== index)))
    errors.push(`${label}: duplicate ID ${id}`);
  for (const img of source.matchAll(/<img\b[^>]*>/g))
    if (!/\balt=/.test(img[0])) errors.push(`${label}: image missing alt`);
  for (const match of source.matchAll(/\b(href|src)="([^"]+)"/g)) {
    const value = decode(match[2]);
    if (!value || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(value)) continue;
    const url = new URL(value, `https://local.test/${label}`);
    let target = path.join(root, decodeURIComponent(url.pathname));
    const meta = await stat(target).catch(() => null);
    if (meta?.isDirectory()) target = path.join(target, 'index.html');
    if (!(await stat(target).catch(() => null))) {
      errors.push(`${label}: missing ${value}`);
      continue;
    }
    if (url.hash && target.endsWith('.html')) {
      const body = html.get(target) || (await readFile(target, 'utf8'));
      const anchor = decodeURIComponent(url.hash.slice(1));
      if (!new RegExp(`\\bid=["']${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(body))
        errors.push(`${label}: missing anchor ${value}`);
    }
  }
}
for (const name of ['sitemap.xml', 'robots.txt']) {
  const source = await readFile(path.join(root, name), 'utf8');
  if (!source.includes(SITE_URL) || source.includes('https://aimia-pku.github.io'))
    errors.push(`${name}: incorrect site origin`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Site check passed: ${htmlFiles.length} HTML pages; local links, anchors, assets, image labels and metadata verified.`,
);
