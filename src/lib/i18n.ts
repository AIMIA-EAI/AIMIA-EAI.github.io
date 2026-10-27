import site from '../data/site.json';
import zh from '../data/zh.json';
import { newsTitle } from './content';
export { localePath, type Locale } from './locale-path';
import type { Locale } from './locale-path';

export function localizeDirections(lang: Locale) {
  const translations = zh.directions as Record<
    string,
    { title: string; short: string; description: string; question: string; keywords: string[] }
  >;
  return site.directions.map((direction) => ({
    ...direction,
    ...(lang === 'zh' ? translations[direction.id] : {}),
  }));
}
export function translateRole(value: string, lang: Locale) {
  return lang === 'zh' ? (zh.roles as Record<string, string>)[value] || value : value;
}
export function translateInterest(value: string, lang: Locale) {
  return lang === 'zh' ? (zh.interests as Record<string, string>)[value] || value : value;
}
type NewsRecord = { id: string; title: string; date: string | null; dateLabel: string };
export function localizedNewsTitle(item: NewsRecord, lang: Locale) {
  return lang === 'zh'
    ? (zh.news as Record<string, { title: string }>)[item.id]?.title || newsTitle(item.title)
    : newsTitle(item.title);
}
export function localizedNewsDate(item: NewsRecord, lang: Locale) {
  return lang === 'zh'
    ? (zh.news as Record<string, { dateLabel: string }>)[item.id]?.dateLabel || item.dateLabel
    : item.dateLabel;
}
export function translateTerm(value: string, lang: Locale) {
  return lang === 'zh' ? (zh.terms as Record<string, string>)[value] || value : value;
}
export function linkLabel(value: string, lang: Locale) {
  return translateTerm(value, lang);
}
export function topicLabels(lang: Locale): Record<string, string> {
  return Object.fromEntries(
    localizeDirections(lang).map((direction) => [direction.tag, direction.title]),
  );
}
