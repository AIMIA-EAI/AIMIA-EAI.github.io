import { papers, media } from './content';
import resources from '../data/resources.json';
import zh from '../data/zh.json';
import type { Locale } from './i18n';

export type ResearchOutput = {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  venue: string;
  links: { label: string; url: string }[];
  tags: string[];
  researchAreas: string[];
  aliases?: string[];
  description?: string;
  image?: string;
  dataset?: (typeof resources.datasets)[number];
  searchText?: string;
};

// Connect a project to its paper so one piece of research appears only once.
const projectPapers: Record<string, string> = {
  'virus-evolution':
    '2022-running-ahead-of-evolution-ai-based-simulation-for-predicting-future-high-risk-sars-cov-2-varian',
};
export function researchOutputs(lang: Locale): ResearchOutput[] {
  const isZh = lang === 'zh';
  const translations = zh.projects as Record<string, { title: string; description: string }>;
  const dataTranslations = zh.datasets as Record<string, { subtitle: string; description: string }>;
  const outputs: ResearchOutput[] = papers.map((paper) => ({ ...paper, links: [...paper.links] }));
  for (const project of resources.projects) {
    const existing = outputs.find((item) => item.id === projectPapers[project.id]);
    const description = isZh
      ? translations[project.id]?.description || project.description
      : project.description;
    const image =
      project.id === 'virus-evolution'
        ? '/media/molecule-demo.png'
        : project.id === 'metafold'
          ? '/media/shennong-metafold.jpg'
          : media(project.image);
    const searchText = `${project.title} ${project.titleZh} ${description} ${isZh ? translations[project.id]?.title || '' : ''}`;
    if (existing) {
      existing.links = [...existing.links, ...project.links];
      existing.description = description;
      existing.image = image;
      existing.aliases = [project.id, 'gordon-bell'];
      existing.searchText = searchText;
    } else {
      outputs.push({
        id: project.id,
        title: isZh ? translations[project.id]?.title || project.titleZh : project.title,
        authors: '',
        year: null,
        venue: 'AI4S',
        links: project.links,
        tags: ['ai-for-science'],
        researchAreas: ['ai-for-science'],
        description,
        image,
        searchText,
      });
    }
  }
  for (const data of resources.datasets) {
    outputs.push({
      id: data.id,
      title: `${data.title}: ${isZh ? dataTranslations[data.id]?.subtitle || data.subtitle : data.subtitle}`,
      authors: '',
      year: data.year,
      venue: data.venue,
      links: data.links,
      tags: ['medical'],
      researchAreas: [],
      description: isZh
        ? dataTranslations[data.id]?.description || data.description
        : data.description,
      dataset: data,
      searchText: `${data.title} ${data.subtitle} 细胞检测 计数 cell detection counting`,
    });
  }
  // Keep undated work visible without inventing a publication year.
  return outputs.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}
