/** Validate editable source content before Astro builds. Uses only Node built-ins. */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const totals = {};
const validTags = new Set(['multimodal', 'generative', 'ai-for-science', 'medical', 'vision']);
const validResearchAreas = new Set(['multimodal', 'embodied', 'ai-for-science']);
const error = (where, message) => errors.push(`${where}: ${message}`);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function readJSON(path) {
  try {
    return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  } catch (cause) {
    error(path, cause.message);
    return null;
  }
}
function record(value, where) {
  if (!object(value)) {
    error(where, 'must be an object');
    return false;
  }
  return true;
}
function text(value, where) {
  if (typeof value !== 'string' || !value.trim()) {
    error(where, 'must be a nonempty string');
    return false;
  }
  return true;
}
function array(value, where) {
  if (!Array.isArray(value)) {
    error(where, 'must be an array');
    return [];
  }
  return value;
}
function uniqueRecords(values, where, required = ['id']) {
  const rows = array(values, where);
  const ids = new Set();
  rows.forEach((entry, index) => {
    const path = `${where}[${index}]`;
    if (!record(entry, path)) return;
    for (const key of required) text(entry[key], `${path}.${key}`);
    if (typeof entry.id === 'string') {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id))
        error(`${path}.id`, 'use a lowercase, hyphenated identifier');
      if (ids.has(entry.id)) error(`${path}.id`, `duplicate identifier ${entry.id}`);
      ids.add(entry.id);
    }
  });
  return rows.filter(object);
}
function year(value, where, nullable = false) {
  if (nullable && value == null) return;
  if (!Number.isInteger(value) || value < 1800 || value > 9999)
    error(where, 'must be a four-digit year');
}
function date(value, where, nullable = false) {
  if (nullable && value == null) return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) {
    error(where, 'must be YYYY-MM or YYYY-MM-DD');
    return;
  }
  const [y, m, d = 1] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (
    y < 1800 ||
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d
  )
    error(where, 'invalid calendar date');
}
function inside(path, parent) {
  const rel = relative(parent, path);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('/'));
}
function file(path, where) {
  if (!text(path, where)) return;
  const absolute = resolve(root, path.replace(/^\//, ''));
  if (!inside(absolute, root)) {
    error(where, 'path must stay within this repository');
    return;
  }
  const publicFile = resolve(root, 'public', path.replace(/^\//, ''));
  const mapped = manifest?.[path.replace(/^\//, '')];
  const candidates = [absolute, publicFile];
  if (typeof mapped === 'string' && mapped.startsWith('/media/'))
    candidates.push(resolve(root, 'public', mapped.slice(1)));
  if (!candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile()))
    error(where, `local file does not exist: ${path}`);
}
function link(value, where, { nullable = false, asset = false } = {}) {
  if (nullable && value == null) return;
  if (!text(value, where)) return;
  if (/\s|\\/.test(value)) {
    error(where, 'URL must not contain whitespace or backslashes');
    return;
  }
  if (value.startsWith('/') && !value.startsWith('//')) {
    let path;
    try {
      path = decodeURIComponent(value.split(/[?#]/)[0]);
    } catch {
      error(where, 'invalid percent encoding');
      return;
    }
    if (path.split('/').includes('..')) error(where, 'URL path must not traverse directories');
    if (
      asset ||
      path.startsWith('/assets/') ||
      path.startsWith('/media/') ||
      /\.(?:pdf|png|jpe?g|gif|svg|webp|avif|mp4|woff2?)$/i.test(path)
    )
      file(path, where);
    return;
  }
  if (asset) {
    error(where, 'local media must use a root-relative URL');
    return;
  }
  if (/^mailto:/i.test(value)) {
    if (!/^mailto:[^@\s?]+@[^@\s?]+\.[^@\s?]+(?:\?.*)?$/i.test(value))
      error(where, 'invalid mailto URL');
    return;
  }
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      error(where, 'use http, https, mailto or a root-relative URL without credentials');
  } catch {
    error(where, 'use http, https, mailto or a root-relative URL');
  }
}
function links(values, where) {
  array(values, where).forEach((entry, index) => {
    const path = `${where}[${index}]`;
    if (!record(entry, path)) return;
    text(entry.label, `${path}.label`);
    link(entry.url, `${path}.url`);
  });
}
function tags(values, where) {
  const items = array(values, where);
  const seen = new Set();
  items.forEach((tag, index) => {
    if (!validTags.has(tag))
      error(
        `${where}[${index}]`,
        `unknown tag ${JSON.stringify(tag)}; allowed: ${[...validTags].join(', ')}`,
      );
    if (seen.has(tag)) error(where, `duplicate tag ${tag}`);
    seen.add(tag);
  });
}

// Legacy image paths are aliases; originals live in the independent migration backup.
const manifest = readJSON('public/media/manifest.json');

const publications = uniqueRecords(readJSON('src/data/publications.json'), 'publications', [
  'id',
  'title',
  'authors',
  'venue',
]);
totals.publications = publications.length;
const paperIds = new Map(publications.map((paper) => [paper.id, paper]));
for (const paper of publications) {
  const where = `publications.${paper.id}`;
  year(paper.year, `${where}.year`);
  tags(paper.tags, `${where}.tags`);
  const areas = array(paper.researchAreas, `${where}.researchAreas`);
  if (new Set(areas).size !== areas.length)
    error(`${where}.researchAreas`, 'duplicate research area');
  areas.forEach((area) => {
    if (!validResearchAreas.has(area))
      error(`${where}.researchAreas`, `unknown research area ${area}`);
  });
  links(paper.links, `${where}.links`);
  if (typeof paper.featured !== 'boolean') error(`${where}.featured`, 'must be true or false');
  if (paper.duplicateOf != null) {
    if (!text(paper.duplicateOf, `${where}.duplicateOf`)) continue;
    if (!paperIds.has(paper.duplicateOf))
      error(`${where}.duplicateOf`, 'target publication does not exist');
    const visited = new Set([paper.id]);
    let target = paper.duplicateOf;
    while (target && paperIds.has(target)) {
      if (visited.has(target)) {
        error(`${where}.duplicateOf`, 'duplicate references form a cycle');
        break;
      }
      visited.add(target);
      target = paperIds.get(target).duplicateOf;
    }
  }
}

const people = readJSON('src/data/people.json');
if (record(people, 'people')) {
  const rows = ['faculty', 'phd', 'masters', 'alumni'].flatMap((group) =>
    array(people[group], `people.${group}`),
  );
  uniqueRecords(rows, 'people.all', ['id', 'name', 'role']).forEach((person) => {
    const where = `people.${person.id}`;
    year(person.cohort, `${where}.cohort`, true);
    link(person.homepage, `${where}.homepage`, { nullable: true });
    link(person.scholar, `${where}.scholar`, { nullable: true });
    link(person.image, `${where}.image`, { nullable: true, asset: true });
    array(person.interests, `${where}.interests`).forEach((interest, index) =>
      text(interest, `${where}.interests[${index}]`),
    );
  });
  date(people.sourceDate, 'people.sourceDate');
  totals.people = rows.length;
}

const news = readJSON('src/data/news.json');
if (record(news, 'news')) {
  const rows = uniqueRecords(news.items, 'news.items', ['id', 'title']);
  rows.forEach((entry) => {
    date(entry.date, `news.${entry.id}.date`, true);
    text(entry.dateLabel, `news.${entry.id}.dateLabel`);
    links(entry.links, `news.${entry.id}.links`);
    if (entry.homepageFeatured != null && typeof entry.homepageFeatured !== 'boolean')
      error(`news.${entry.id}.homepageFeatured`, 'must be a boolean');
    if (entry.homepageFeatured && !entry.date)
      error(`news.${entry.id}.date`, 'homepage updates need a recorded date');
  });
  totals.news = rows.length;
}

const lab = readJSON('src/data/lab.json');
if (record(lab, 'lab')) {
  ['name', 'acronym', 'institution', 'school', 'center'].forEach((key) =>
    text(lab[key], `lab.${key}`),
  );
  date(lab.sourceDate, 'lab.sourceDate');
  array(lab.about, 'lab.about').forEach((paragraph, index) =>
    text(paragraph, `lab.about[${index}]`),
  );
  const research = uniqueRecords(lab.research, 'lab.research', ['id', 'title', 'description']);
  totals.researchDirections = research.length;
  if (record(lab.contact, 'lab.contact')) {
    array(lab.contact.emails, 'lab.contact.emails').forEach((entry, index) => {
      if (record(entry, `lab.contact.emails[${index}]`))
        link(`mailto:${entry.address}`, `lab.contact.emails[${index}].address`);
    });
    array(lab.contact.address, 'lab.contact.address').forEach((line, index) =>
      text(line, `lab.contact.address[${index}]`),
    );
  }
  if (record(lab.openings, 'lab.openings')) {
    text(lab.openings.text, 'lab.openings.text');
    link(lab.openings.admissionUrl, 'lab.openings.admissionUrl');
    year(lab.openings.documentYear, 'lab.openings.documentYear');
  }
  const honors = uniqueRecords(lab.honors, 'lab.honors', ['id', 'text']);
  honors.forEach((honor, index) => {
    if (!record(honor, `lab.honors[${index}]`)) return;
    text(honor.text, `lab.honors[${index}].text`);
    year(honor.year, `lab.honors[${index}].year`, true);
    if (typeof honor.homepageFeatured !== 'boolean')
      error(`lab.honors[${index}].homepageFeatured`, 'must be a boolean');
    if (honor.url != null) link(honor.url, `lab.honors[${index}].url`);
  });
  totals.honors = honors.length;
  array(lab.teamPhotos, 'lab.teamPhotos').forEach((photo, index) => {
    if (!record(photo, `lab.teamPhotos[${index}]`)) return;
    link(photo.src, `lab.teamPhotos[${index}].src`, { asset: true });
    text(photo.alt, `lab.teamPhotos[${index}].alt`);
  });
}

const resources = readJSON('src/data/resources.json');
if (record(resources, 'resources')) {
  link(resources.scholarlyProfileUrl, 'resources.scholarlyProfileUrl');
  const groups = ['projects', 'datasets', 'patents'];
  const rows = groups.flatMap((group) => array(resources[group], `resources.${group}`));
  uniqueRecords(rows, 'resources.all', ['id', 'title']);
  for (const group of groups) {
    const entries = array(resources[group], `resources.${group}`).filter(object);
    totals[group] = entries.length;
    entries.forEach((entry) => {
      const where = `resources.${group}.${entry.id}`;
      if (entry.links != null) links(entry.links, `${where}.links`);
      if (entry.image != null) link(entry.image, `${where}.image`, { asset: true });
      if (entry.year != null) year(entry.year, `${where}.year`);
    });
  }
}

const site = readJSON('src/data/site.json');
if (record(site, 'site')) {
  array(site.headline, 'site.headline').forEach((line, index) =>
    text(line, `site.headline[${index}]`),
  );
  text(site.intro, 'site.intro');
  uniqueRecords(site.directions, 'site.directions', [
    'id',
    'title',
    'description',
    'question',
  ]).forEach((direction) => {
    if (!validResearchAreas.has(direction.tag))
      error(`site.directions.${direction.id}.tag`, 'unknown research area');
  });
}

// Validate translation coverage against the current source data, rather than fixed totals.
// Publication titles and people's names intentionally keep their original official forms.
const zh = readJSON('src/data/zh.json');
if (record(zh, 'zh')) {
  function translationsFor(value, entries, where, check) {
    if (!record(value, where)) return;
    entries.filter(object).forEach((entry) => {
      if (typeof entry.id !== 'string') return;
      const path = `${where}.${entry.id}`;
      const translated = value[entry.id];
      if (!record(translated, path)) return;
      check(translated, entry, path);
    });
  }
  const sourceDirections = object(site) && Array.isArray(site.directions) ? site.directions : [];
  translationsFor(zh.directions, sourceDirections, 'zh.directions', (translated, source, where) => {
    ['title', 'short', 'description', 'question'].forEach((key) =>
      text(translated[key], `${where}.${key}`),
    );
    const keywords = array(translated.keywords, `${where}.keywords`);
    if (!keywords.length)
      error(`${where}.keywords`, 'must contain at least one translated keyword');
    keywords.forEach((keyword, index) => text(keyword, `${where}.keywords[${index}]`));
  });

  if (record(zh.lab, 'zh.lab')) {
    ['name', 'institution', 'school', 'center', 'intro'].forEach((key) =>
      text(zh.lab[key], `zh.lab.${key}`),
    );
    for (const key of ['contactAddress', 'about']) {
      const values = array(zh.lab[key], `zh.lab.${key}`);
      if (!values.length) error(`zh.lab.${key}`, 'must contain translated text');
      values.forEach((value, index) => text(value, `zh.lab.${key}[${index}]`));
    }
  }

  const sourcePeople = object(people)
    ? ['faculty', 'phd', 'masters', 'alumni'].flatMap((group) =>
        Array.isArray(people[group]) ? people[group].filter(object) : [],
      )
    : [];
  const roleNames = new Set(sourcePeople.flatMap((person) => [person.role, person.group]));
  if (record(zh.roles, 'zh.roles')) {
    for (const role of roleNames)
      if (typeof role === 'string') text(zh.roles[role], `zh.roles.${role}`);
  }
  const interestNames = new Set(
    sourcePeople.flatMap((person) => (Array.isArray(person.interests) ? person.interests : [])),
  );
  if (record(zh.interests, 'zh.interests')) {
    for (const interest of interestNames)
      if (typeof interest === 'string') text(zh.interests[interest], `zh.interests.${interest}`);
  }

  const sourceNews = object(news) && Array.isArray(news.items) ? news.items : [];
  translationsFor(zh.news, sourceNews, 'zh.news', (translated, source, where) => {
    text(translated.title, `${where}.title`);
    text(translated.dateLabel, `${where}.dateLabel`);
  });
  for (const group of ['projects', 'datasets']) {
    const sourceEntries =
      object(resources) && Array.isArray(resources[group]) ? resources[group] : [];
    translationsFor(zh[group], sourceEntries, `zh.${group}`, (translated, source, where) => {
      text(
        translated[group === 'projects' ? 'title' : 'subtitle'],
        `${where}.${group === 'projects' ? 'title' : 'subtitle'}`,
      );
      text(translated.description, `${where}.description`);
    });
  }

  const sourceHonors = object(lab) && Array.isArray(lab.honors) ? lab.honors : [];
  const translatedHonors = array(zh.honors, 'zh.honors');
  if (translatedHonors.length !== sourceHonors.length)
    error('zh.honors', 'must cover every source honor in the same order');
  sourceHonors.forEach((honor, index) => {
    if (!object(honor)) return;
    const where = `zh.honors[${index}]`;
    const translated = translatedHonors[index];
    if (!record(translated, where)) return;
    text(translated.text, `${where}.text`);
    if (translated.id !== honor.id) error(`${where}.id`, `must match source honor ${honor.id}`);
    if (translated.homepageFeatured !== honor.homepageFeatured)
      error(`${where}.homepageFeatured`, 'must match source honor selection');
    if (translated.url != null) link(translated.url, `${where}.url`);
    if (translated.year !== honor.year)
      error(`${where}.year`, `must match source year ${honor.year} at this position`);
  });
  totals.translatedDirections = sourceDirections.length;
  totals.translatedNews = sourceNews.length;
}

const gallery = readJSON('src/data/gallery.json');
if (record(gallery, 'gallery')) {
  const slides = uniqueRecords(gallery.slides, 'gallery.slides');
  for (const slide of slides) {
    link(slide.image, `gallery.${slide.id}.image`, { asset: true });
    for (const lang of ['en', 'zh']) {
      text(slide.title?.[lang], `gallery.${slide.id}.title.${lang}`);
      text(slide.alt?.[lang], `gallery.${slide.id}.alt.${lang}`);
    }
  }
  totals.galleryPhotos = slides.length;
}

if (record(manifest, 'media manifest')) {
  for (const [source, output] of Object.entries(manifest)) {
    if (!source.startsWith('assets/images/') || source.includes('..'))
      error(`media manifest source ${source}`, 'must be a legacy image URL');
    link(output, `media manifest target for ${source}`, { asset: true });
  }
  totals.mediaMappings = Object.keys(manifest).length;
}

if (errors.length) {
  console.error(
    `Content validation failed (${errors.length} ${errors.length === 1 ? 'error' : 'errors'}):`,
  );
  for (const message of errors) console.error(`  - ${message}`);
  process.exitCode = 1;
} else {
  console.log(
    `Content validation passed: ${Object.entries(totals)
      .map(([key, count]) => `${count} ${key}`)
      .join(', ')}.`,
  );
}
