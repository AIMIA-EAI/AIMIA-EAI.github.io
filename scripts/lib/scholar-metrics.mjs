const integer = (value) => {
  const text = String(value).trim().replaceAll(',', '');
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)))
    throw new Error('Invalid Scholar count');
  return Number(text);
};
export function validateScholarMetrics(data) {
  if (data?.profileId !== 'ZAZFfwwAAAAJ' || data?.name !== 'Jie Chen')
    throw new Error('Unexpected Scholar identity');
  const source = new URL(data.source);
  if (
    source.origin !== 'https://scholar.google.com' ||
    source.pathname !== '/citations' ||
    source.searchParams.get('user') !== data.profileId
  )
    throw new Error('Unexpected Scholar source');
  const date = data.verifiedAt;
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error('Invalid verification date');
  if (
    data.total !== integer(data.total) ||
    data.hIndex !== integer(data.hIndex) ||
    data.total === 0
  )
    throw new Error('Invalid profile totals');
  if (!Array.isArray(data.annual) || !data.annual.length)
    throw new Error('Missing annual citations');
  let previousYear = 0,
    sum = 0;
  for (const item of data.annual) {
    if (
      !Number.isInteger(item.year) ||
      item.year < 1800 ||
      item.year <= previousYear ||
      item.year > Number(date.slice(0, 4))
    )
      throw new Error('Invalid citation years');
    if (item.citations !== integer(item.citations)) throw new Error('Invalid annual count');
    sum += item.citations;
    previousYear = item.year;
  }
  if (sum > data.total) throw new Error('Annual citation sum exceeds total');
  return data;
}
export function parseScholarProfile(html, previous, fetchedAt = new Date()) {
  validateScholarMetrics(previous);
  const name = html
    .match(/<[^>]+\bid=["']gsc_prf_in["'][^>]*>([\s\S]*?)<\//)?.[1]
    ?.replace(/<[^>]*>/g, '')
    .trim();
  if (name !== 'Jie Chen') throw new Error('Profile identity could not be verified');
  const table = html.match(/<table\b[^>]*\bid=["']gsc_rsb_st["'][^>]*>([\s\S]*?)<\/table>/)?.[1];
  if (!table) throw new Error('Scholar statistics table missing');
  const metrics = [
    ...table.matchAll(/<td\b[^>]*class=["'][^"']*\bgsc_rsb_std\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/g),
  ].map((m) => integer(m[1].replace(/<[^>]*>/g, '')));
  if (metrics.length !== 6) throw new Error('Unexpected Scholar statistics layout');
  const chart = html.match(
    /<div\b[^>]*\bid=["']gsc_rsb_cit["'][^>]*>([\s\S]*?)(?=<div\b[^>]*\bid=["']gsc_rsb_mnd["'])/,
  )?.[1];
  if (!chart) throw new Error('Scholar annual chart missing');
  const years = [
    ...chart.matchAll(/<span\b[^>]*class=["'][^"']*\bgsc_g_t\b[^"']*["'][^>]*>(\d{4})<\/span>/g),
  ].map((m) => Number(m[1]));
  const counts = [
    ...chart.matchAll(
      /<span\b[^>]*class=["'][^"']*\bgsc_g_al\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/g,
    ),
  ].map((m) => integer(m[1]));
  if (years.length < 2 || years.length !== counts.length || new Set(years).size !== years.length)
    throw new Error('Incomplete annual citation chart');
  const annual = new Map(previous.annual.map((p) => [p.year, p.citations]));
  years.forEach((year, i) => annual.set(year, counts[i]));
  const verifiedAt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fetchedAt);
  return validateScholarMetrics({
    ...previous,
    total: metrics[0],
    hIndex: metrics[2],
    verifiedAt,
    fetchedAt: fetchedAt.toISOString(),
    annual: [...annual]
      .sort((a, b) => a[0] - b[0])
      .map(([year, citations]) => ({ year, citations })),
  });
}
