import { readFile, writeFile } from 'node:fs/promises';
import { SITE_URL } from '../site.config.mjs';
import { parseScholarProfile, validateScholarMetrics } from './lib/scholar-metrics.mjs';
const file = new URL('../src/data/scholar-metrics.json', import.meta.url);
let best = validateScholarMetrics(JSON.parse(await readFile(file, 'utf8')));
// The deployed snapshot retains successful daily updates without granting Git write access.
try {
  const response = await fetch(new URL('/metrics/scholar.json', SITE_URL), {
    signal: AbortSignal.timeout(12000),
  });
  if (response.ok) {
    const published = validateScholarMetrics(await response.json());
    if (
      Date.parse(published.fetchedAt || published.verifiedAt) >
      Date.parse(best.fetchedAt || best.verifiedAt)
    )
      best = published;
  }
} catch {
  console.log('Published Scholar snapshot unavailable; retaining committed snapshot.');
}
try {
  const response = await fetch(best.source, {
    headers: { 'User-Agent': 'AIMIA-website-metrics' },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  best = parseScholarProfile(await response.text(), best);
  console.log(
    `Scholar refreshed: ${best.total} citations, h-index ${best.hIndex}, ${best.annual.length} years, verified ${best.verifiedAt}`,
  );
} catch (error) {
  console.warn(
    `::warning::Scholar refresh unavailable (${error.message}); keeping verified data from ${best.verifiedAt}.`,
  );
}
await writeFile(file, JSON.stringify(best, null, 2) + '\n');
