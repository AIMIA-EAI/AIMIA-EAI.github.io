import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL } from '../site.config.mjs';

// PDFs are maintained once in public/assets/files; keep their existing URLs.
await mkdir('public', { recursive: true });
const aliases = {
  'Publications.html': '/research/#publications',
  'page3.html': '/research/#projects',
  'page6.html': '/research/#bcdata',
  'register.html': '/events/nt-vlu-2021/',
  'page2.html': '/events/nt-vlu-2021/',
  'page4.html': '/events/nt-vlu-2021/',
};
for (const [file, target] of Object.entries(aliases)) {
  const script =
    file === 'Publications.html'
      ? 'const h=location.hash;const map={"#video4-44":"/research/#gordon-bell","#content6-52":"/research/?year=2024#publications","#content9-53":"/research/?year=2024#publications","#content6-45":"/research/?year=2023#publications","#content9-46":"/research/?year=2023#publications","#content6-3t":"/research/?year=2022#publications","#content9-3r":"/research/?year=2022#publications","#content6-3w":"/research/?year=2021#publications","#content9-3x":"/research/?year=2021#publications","#content6-47":"/research/#patents","#content9-48":"/research/#patents"};location.replace(map[h]||"/research/"+(h||"#publications"));'
      : `location.replace(${JSON.stringify(target)});`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${SITE_URL}${target.split('#')[0]}"><meta name="robots" content="noindex"><title>Page moved — AIMIA</title></head><body><p>This page has moved. <a href="${target}">Continue to AIMIA</a>.</p><script>${script}</script></body></html>`;
  await writeFile(path.join('public', file), html);
}
await writeFile('public/.nojekyll', '');
const urls = ['/', '/research/', '/people/', '/join/'];
const localizedUrls = urls.flatMap((url) => [url, `/zh${url}`]);
await writeFile(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${localizedUrls.map((url) => `<url><loc>${SITE_URL}${url}</loc></url>`).join('')}</urlset>`,
);
await writeFile('public/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
console.log(`Prepared ${Object.keys(aliases).length} legacy routes and kept public PDF URLs.`);
