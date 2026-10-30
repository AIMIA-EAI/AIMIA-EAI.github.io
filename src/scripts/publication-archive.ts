export {};

const search = document.querySelector<HTMLInputElement>('#paper-search')!;
const year = document.querySelector<HTMLSelectElement>('#paper-year')!;
const topic = document.querySelector<HTMLSelectElement>('#paper-topic')!;
const rows = [...document.querySelectorAll<HTMLElement>('[data-paper]')];
if (location.hash === '#patents')
  document.querySelector<HTMLDetailsElement>('#patents')!.open = true;
const params = new URLSearchParams(location.search);
if (params.has('topic') && [...topic.options].some((o) => o.value === params.get('topic')))
  topic.value = params.get('topic')!;
if (params.has('year') && [...year.options].some((o) => o.value === params.get('year')))
  year.value = params.get('year')!;
if (params.has('q')) search.value = params.get('q')!;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Map<HTMLElement, Animation>();
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) {
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  }
});
function filter(animate = true) {
  const shouldAnimate = animate && !motionPreference.matches;
  const previous = new Map<HTMLElement, DOMRect>();
  if (shouldAnimate) {
    rows
      .filter((row) => !row.hidden)
      .forEach((row) => {
        const bounds = row.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < window.innerHeight) previous.set(row, bounds);
      });
  }
  animations.forEach((animation) => animation.cancel());
  animations.clear();
  const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let count = 0;
  rows.forEach((row) => {
    const show =
      terms.every((term) => row.dataset.search?.includes(term)) &&
      (!year.value || row.dataset.year === year.value) &&
      (!topic.value ||
        (topic.selectedOptions[0]?.dataset.legacy === 'true' ? row.dataset.tags : row.dataset.areas)
          ?.split(' ')
          .includes(topic.value));
    row.hidden = !show;
    if (show) count++;
  });
  document.querySelectorAll<HTMLElement>('[data-output-year]').forEach((group) => {
    const visible = [...group.querySelectorAll<HTMLElement>('[data-paper]')].filter(
      (row) => !row.hidden,
    ).length;
    group.hidden = visible === 0;
    group.querySelector<HTMLElement>('[data-year-count]')!.textContent = String(visible);
    const jump = [...document.querySelectorAll<HTMLAnchorElement>('[data-year-jump]')].find(
      (link) => link.hash === '#' + group.id,
    )!;
    jump.hidden = visible === 0;
    jump.querySelector<HTMLElement>('[data-jump-count]')!.textContent = String(visible);
  });
  if (shouldAnimate) {
    rows
      .filter((row) => !row.hidden)
      .forEach((row) => {
        const next = row.getBoundingClientRect();
        if (next.bottom <= 0 || next.top >= window.innerHeight || typeof row.animate !== 'function')
          return;
        const before = previous.get(row);
        const distance = before ? before.top - next.top : 8;
        const offset = Math.abs(distance) > window.innerHeight ? 8 : distance;
        if (before && Math.abs(offset) < 1) return;
        const animation = row.animate(
          [
            { transform: `translateY(${offset}px)`, opacity: before ? 1 : 0.55 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 260, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
        );
        animations.set(row, animation);
        const finish = () => {
          if (animations.get(row) === animation) animations.delete(row);
        };
        animation.finished.then(finish, finish);
      });
  }
  const countLabel = document.querySelector<HTMLElement>('#paper-count')!;
  countLabel.textContent =
    document.documentElement.lang === 'zh-CN'
      ? `${count === rows.length ? '' : '找到 '}${count} 项成果${count === rows.length ? ` · ${countLabel.dataset.yearRange}` : ''}`
      : `${count} ${count === 1 ? 'research output' : 'research outputs'}${count !== rows.length ? ' found' : ` · ${countLabel.dataset.yearRange}`}`;
  document.querySelector<HTMLElement>('#paper-empty')!.hidden = count > 0;
  const url = new URL(location.href);
  for (const [key, value] of [
    ['q', search.value],
    ['year', year.value],
    ['topic', topic.value],
  ]) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  history.replaceState(null, '', url);
}
search.addEventListener('input', () => filter());
year.addEventListener('change', () => filter());
topic.addEventListener('change', () => filter());
document.querySelector('#publication-filters')?.addEventListener('reset', () => {
  search.value = '';
  year.value = '';
  topic.value = '';
  filter();
});
filter(false);
