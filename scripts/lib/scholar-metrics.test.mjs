import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScholarProfile, validateScholarMetrics } from './scholar-metrics.mjs';
const previous = {
  profileId: 'ZAZFfwwAAAAJ',
  name: 'Jie Chen',
  source: 'https://scholar.google.com/citations?user=ZAZFfwwAAAAJ&hl=en',
  verifiedAt: '2025-12-31',
  total: 12,
  hIndex: 2,
  annual: [
    { year: 2023, citations: 2 },
    { year: 2024, citations: 10 },
  ],
};
const now = new Date('2026-10-28T18:00:00Z');
const html = `<div id="gsc_prf_in">Jie Chen</div><div id="gsc_rsb_cit"><table id="gsc_rsb_st"><tbody>
<tr><td>citations</td><td class="gsc_rsb_std">29,723</td><td class="gsc_rsb_std">25,296</td></tr>
<tr><td>h-index</td><td class="gsc_rsb_std">64</td><td class="gsc_rsb_std">60</td></tr>
<tr><td>i10-index</td><td class="gsc_rsb_std">201</td><td class="gsc_rsb_std">173</td></tr></tbody></table>
<span class="gsc_g_t">2024</span><span class="gsc_g_t">2025</span>
<span class="gsc_g_al">14</span><span class="gsc_g_al">30</span></div><div id="gsc_rsb_mnd"></div>`;
test('reads totals, preserves older years, replaces revised annual counts and uses Beijing date', () => {
  const result = parseScholarProfile(html, previous, now);
  assert.equal(result.total, 29723);
  assert.equal(result.hIndex, 64);
  assert.equal(result.verifiedAt, '2026-10-29');
  assert.deepEqual(result.annual, [
    { year: 2023, citations: 2 },
    { year: 2024, citations: 14 },
    { year: 2025, citations: 30 },
  ]);
  assert.deepEqual(previous.annual, [
    { year: 2023, citations: 2 },
    { year: 2024, citations: 10 },
  ]);
});
test('rejects blocked pages and other profiles instead of replacing good data', () => {
  assert.throws(() => parseScholarProfile('<title>Sorry</title>', previous, now));
  assert.throws(() =>
    parseScholarProfile(html.replace('>Jie Chen<', '>Other Person<'), previous, now),
  );
  assert.equal(previous.verifiedAt, '2025-12-31');
});
test('rejects incomplete and duplicate year charts', () => {
  assert.throws(() =>
    parseScholarProfile(html.replace('<span class="gsc_g_al">30</span>', ''), previous, now),
  );
  assert.throws(() => parseScholarProfile(html.replace('>2025<', '>2024<'), previous, now));
});
test('rejects zero totals, malformed numbers and annual sums over total', () => {
  for (const replacement of ['0', 'bad', '1'])
    assert.throws(() => parseScholarProfile(html.replace('29,723', replacement), previous, now));
});
test('validates published snapshot identity, origin and year order before retaining it', () => {
  assert.throws(() => validateScholarMetrics({ ...previous, profileId: 'wrong' }));
  assert.throws(() =>
    validateScholarMetrics({
      ...previous,
      source: 'https://example.com/citations?user=ZAZFfwwAAAAJ',
    }),
  );
  assert.throws(() =>
    validateScholarMetrics({ ...previous, annual: [...previous.annual].reverse() }),
  );
});
