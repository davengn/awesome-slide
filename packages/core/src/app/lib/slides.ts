import {
  slideCreatedAt as createdAt,
  slideDescriptions as descriptions,
  slideIds as ids,
  loadSlide as load,
  slideSourceState as sourceState,
  slideStatus as status,
  slideTags as tags,
  slideThemes as themes,
  slideTitles as titles,
  slideUpdatedAt as updatedAt,
} from 'virtual:awesome-slide/slides';
import type { SlideModule, SourceState } from './sdk';

export const slideIds: string[] = ids;
export const slideTitles: Record<string, string> = titles;
export const slideDescriptions: Record<string, string> = descriptions;
export const slideTags: Record<string, string[]> = tags;
export const slideThemes: Record<string, string> = themes;
export const slideStatus: Record<string, 'draft' | 'ready' | 'archived'> = status;
export const slideCreatedAt: Record<string, number> = createdAt;
export const slideUpdatedAt: Record<string, number> = updatedAt;
export const slideSourceState: Record<string, SourceState> = sourceState;

export function slidesByTheme(themeId: string): string[] {
  return slideIds.filter((id) => slideThemes[id] === themeId);
}

export async function loadSlide(id: string): Promise<SlideModule> {
  return load(id);
}

export function slideChangeIncludes(data: unknown, slideId: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const payload = data as { slideId?: unknown; slideIds?: unknown };
  if (payload.slideId === slideId) return true;
  return Array.isArray(payload.slideIds) && payload.slideIds.includes(slideId);
}
