import { writeFile } from 'node:fs/promises';

const org = 'AIMIA-EAI';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'AIMIA-website-metrics' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
async function get(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${path}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`Expected array: ${path}`);
  return data;
}
async function pages(path, size, max = 100) {
  const rows = [];
  for (let page = 1; page <= max; page++) {
    const batch = await get(`${path}?per_page=${size}&page=${page}`);
    rows.push(...batch);
    if (batch.length < size) return rows;
  }
  throw new Error(`Pagination limit reached: ${path}`);
}
const repos = (await pages(`/orgs/${org}/repos`, 100)).filter((repo) => !repo.private);
if (!repos.length) throw new Error('No public repositories returned');
const weekly = new Map();
for (const repo of repos) {
  if (!Number.isSafeInteger(repo.stargazers_count) || repo.stargazers_count < 0)
    throw new Error('Invalid star count');
  if (repo.stargazers_count === 0) continue;
  const history = await pages(`/repos/${org}/${repo.name}/stargazers/history`, 30);
  if (!history.length) throw new Error(`No history returned for ${repo.name}`);
  for (const item of history) {
    if (!Number.isSafeInteger(item.week) || !Number.isSafeInteger(item.total) || item.total < 0)
      throw new Error('Invalid star history');
    weekly.set(item.week, (weekly.get(item.week) || 0) + item.total);
  }
}
let cumulative = 0;
const series = [...weekly]
  .sort((a, b) => a[0] - b[0])
  .map(([week, gained]) => {
    cumulative += gained;
    return { date: new Date(week * 1000).toISOString().slice(0, 10), gained, value: cumulative };
  });
const data = {
  organization: org,
  source: `https://github.com/${org}`,
  updatedAt: new Date().toISOString(),
  totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
  repositories: repos
    .map((repo) => ({ name: repo.name, url: repo.html_url, stars: repo.stargazers_count }))
    .sort((a, b) => b.stars - a.stars),
  series,
};
await writeFile(
  new URL('../src/data/github-metrics.json', import.meta.url),
  JSON.stringify(data, null, 2) + '\n',
);
console.log(
  `GitHub metrics: ${repos.length} public repositories, ${data.totalStars} current stars, ${series.length} weekly points, ${cumulative} historical star events`,
);
