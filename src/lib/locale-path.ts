export type Locale = 'en' | 'zh';

/** Localize site routes while keeping shared assets and external destinations intact. */
export function localePath(path: string, lang: Locale): string {
  if (!path || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(path)) return path;
  const url = new URL(path, 'https://local.test');
  if (
    /^\/(?:assets|media|_astro)\//.test(url.pathname) ||
    /^\/(?:favicon|robots|sitemap)\./.test(url.pathname)
  )
    return path;
  let pathname = url.pathname.replace(/^\/(?:zh|en)(?=\/|$)/, '') || '/';
  if (pathname === '/404.html' || pathname === '/404/')
    return `${lang === 'zh' ? '/zh/404/' : '/404.html'}${url.search}${url.hash}`;
  const aliases: Record<string, string> = {
    '/Publications.html': '/publications/',
    '/page3.html': '/research/',
    '/page6.html': '/research/',
    '/register.html': '/events/nt-vlu-2021/',
    '/page2.html': '/events/nt-vlu-2021/',
    '/page4.html': '/events/nt-vlu-2021/',
  };
  if (pathname === '/Publications.html' && url.hash === '#video4-44') {
    pathname = '/research/';
    url.hash = '#gordon-bell';
  } else if (aliases[pathname]) {
    if (pathname === '/page3.html') url.hash = '#projects';
    if (pathname === '/page6.html') url.hash = '#bcdata';
    pathname = aliases[pathname];
  }
  if (pathname === '/publications/' || pathname === '/publications') {
    pathname = '/research/';
    if (!url.hash) url.hash = '#publications';
  } else if (pathname === '/news/' || pathname === '/news') {
    pathname = '/research/';
    if (!url.hash) url.hash = '#updates';
  }
  if (lang === 'en' && pathname === '/') pathname = '/en/';
  return `${lang === 'zh' ? '/zh' : ''}${pathname}${url.search}${url.hash}`;
}
