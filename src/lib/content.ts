import publications from '../data/publications.json';
import news from '../data/news.json';
import manifest from '../../public/media/manifest.json';

type Publication = Omit<(typeof publications)[number], 'researchAreas'> & {
  researchAreas: string[];
};
const publicationRecords: Publication[] = publications;
export const papers = publicationRecords
  .filter((paper) => !paper.duplicateOf)
  .sort((a, b) => b.year - a.year);
export const newsItems = [...news.items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
export const topics: Record<string, string> = {
  multimodal: 'Multimodal intelligence',
  embodied: 'Embodied intelligence',
  'ai-for-science': 'AI for Science (AI4S)',
};
// Retain the meaning of bookmarked topic filters without presenting them as lab directions.
export const legacyTopics: Record<string, string> = {
  generative: 'Generative methods (archive)',
  medical: 'Medical imaging (archive)',
  vision: 'Computer vision (archive)',
};
export function media(path: string | null | undefined): string {
  if (!path) return '';
  const lookup = manifest as Record<string, string>;
  return lookup[path] || lookup[path.replace(/^\//, '')] || path;
}
export function newsTitle(title: string): string {
  return title
    .replace(/\s*Con!\[([^\]]+)\]\.?/g, ' Congratulations to $1.')
    .replace(/Inte11igence/g, 'Intelligence')
    .replace(/\bZishan shu\b/g, 'Zishan Shu')
    .replace(/\bRuochong zheng\b/g, 'Ruochong Zheng')
    .replace(/\bYi an zhao\b/gi, 'Yian Zhao')
    .replace(/\s+/g, ' ')
    .trim();
}
