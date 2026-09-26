import { LEARN_GUIDES } from './guides-learn';
import { CAREER_GUIDES } from './guides-career';
import { INTERVIEW_GUIDES } from './guides-interview';
import type { GuideArticle } from './guides-types';

export * from './guides-types';
export { LEARN_GUIDES, CAREER_GUIDES, INTERVIEW_GUIDES };

export const ALL_GUIDES: GuideArticle[] = [...LEARN_GUIDES, ...CAREER_GUIDES, ...INTERVIEW_GUIDES];

export function getGuide(id: string): GuideArticle | undefined {
  return ALL_GUIDES.find((g) => g.id === id);
}

export function filterGuides(query: string, cat?: 'learn' | 'career' | 'interview'): GuideArticle[] {
  const q = query.trim().toLowerCase();
  return ALL_GUIDES.filter(
    (g) =>
      (!cat || g.cat === cat) &&
      (!q || g.title.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q) || g.intro.toLowerCase().includes(q)),
  );
}

export function relatedGuides(a: GuideArticle, limit = 3): GuideArticle[] {
  return ALL_GUIDES.filter((g) => g.id !== a.id && (g.tag === a.tag || g.cat === a.cat)).slice(0, limit);
}
