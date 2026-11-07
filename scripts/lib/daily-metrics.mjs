import { readFile, writeFile } from 'node:fs/promises';
import { SITE_URL } from '../../site.config.mjs';

const file = new URL('../../src/data/daily-metrics.json', import.meta.url);
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', dateStyle: 'short' });

export async function recordDailyMetric(metric, attemptedAt, snapshot) {
  const history = JSON.parse(await readFile(file, 'utf8'));
  let published;
  try {
    const response = await fetch(new URL('/metrics/daily.json', SITE_URL), {
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) published = await response.json();
    else if (response.status !== 404) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.warn(`Daily metrics snapshot unavailable: ${error.message}`);
    // Avoid publishing an incomplete history when an existing deployment cannot be read.
    if (process.env.GITHUB_ACTIONS === 'true') throw error;
  }
  for (const key of ['stars', 'citations']) {
    const merged = { ...history[key] };
    for (const [date, row] of Object.entries(published?.[key] ?? {})) {
      const local = merged[date];
      if (!local) merged[date] = row;
      else {
        const latest = row.attemptedAt > local.attemptedAt ? row : local;
        const success = (row.fetchedAt || '') > (local.fetchedAt || '') ? row : local;
        merged[date] = { ...success, attemptedAt: latest.attemptedAt };
      }
    }
    history[key] = merged;
  }
  const date = day.format(new Date(attemptedAt));
  const previous = history[metric][date];
  const sample = snapshot ?? previous ?? { value: null, fetchedAt: null };
  history[metric][date] = {
    value: sample.value,
    fetchedAt: sample.fetchedAt,
    attemptedAt,
  };
  await writeFile(file, JSON.stringify(history, null, 2) + '\n');
}
