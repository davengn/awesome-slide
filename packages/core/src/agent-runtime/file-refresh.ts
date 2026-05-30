import fs from 'node:fs/promises';
import path from 'node:path';
import type { ApiContext } from '../vite/routes/context.ts';

export type FileRefreshKind = 'slide' | 'deck' | 'theme' | 'asset' | 'management-index';

export interface FileRefreshTarget {
  relativePath: string;
  refreshKind: FileRefreshKind;
  sourceVersion: string;
  slideId?: string;
  deckId?: string;
}

export interface RefreshPayload {
  targets: FileRefreshTarget[];
  slides: string[];
  decks: string[];
  themes: string[];
  assets: string[];
  sourceVersions: Record<string, string>;
  managementIndex: boolean;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function safeRelativePath(ctx: ApiContext, writtenFile: string): string {
  if (!path.isAbsolute(writtenFile)) {
    return writtenFile.split(path.sep).join('/');
  }
  const relative = path.relative(ctx.userCwd, writtenFile);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.basename(writtenFile);
  }
  return relative.split(path.sep).join('/');
}

function absolutePathFor(ctx: ApiContext, relativePath: string): string {
  return path.resolve(ctx.userCwd, relativePath);
}

async function sourceVersionFor(ctx: ApiContext, relativePath: string): Promise<string> {
  try {
    const stat = await fs.stat(absolutePathFor(ctx, relativePath));
    return `${Math.round(stat.mtimeMs)}-${stat.size}`;
  } catch {
    return `missing-${Date.now()}`;
  }
}

function classifyRefreshTarget(
  ctx: ApiContext,
  relativePath: string,
): Omit<FileRefreshTarget, 'sourceVersion'> {
  const normalized = relativePath.replace(/\\/g, '/');
  const slidesPrefix = `${ctx.slidesDir.replace(/\\/g, '/')}/`;

  if (normalized === `${slidesPrefix}.folders.json` || normalized.endsWith('/.folders.json')) {
    return { relativePath: normalized, refreshKind: 'management-index' };
  }

  if (normalized.startsWith(slidesPrefix)) {
    const parts = normalized.slice(slidesPrefix.length).split('/');
    const slideId = parts[0];
    if (parts[1] === 'assets') {
      return { relativePath: normalized, refreshKind: 'asset', slideId };
    }
    return { relativePath: normalized, refreshKind: 'slide', slideId };
  }

  if (normalized.startsWith('decks/')) {
    const deckId = normalized.split('/')[1];
    return { relativePath: normalized, refreshKind: 'deck', deckId };
  }

  if (normalized.startsWith('themes/')) {
    return { relativePath: normalized, refreshKind: 'theme' };
  }

  if (normalized.startsWith('assets/')) {
    return { relativePath: normalized, refreshKind: 'asset' };
  }

  return { relativePath: normalized, refreshKind: 'management-index' };
}

export async function deriveRefreshTargets(
  ctx: ApiContext,
  writtenFiles: readonly string[],
): Promise<FileRefreshTarget[]> {
  const targets: FileRefreshTarget[] = [];
  const seen = new Set<string>();

  for (const writtenFile of writtenFiles) {
    const relativePath = safeRelativePath(ctx, writtenFile);
    if (seen.has(relativePath)) continue;
    seen.add(relativePath);
    const classified = classifyRefreshTarget(ctx, relativePath);
    targets.push({
      ...classified,
      sourceVersion: await sourceVersionFor(ctx, relativePath),
    });
  }

  return targets;
}

export function refreshPayloadFromTargets(targets: readonly FileRefreshTarget[]): RefreshPayload {
  return {
    targets: [...targets],
    slides: unique(targets.flatMap((target) => (target.slideId ? [target.slideId] : []))),
    decks: unique(targets.flatMap((target) => (target.deckId ? [target.deckId] : []))),
    themes: unique(
      targets.flatMap((target) =>
        target.refreshKind === 'theme' ? [target.relativePath.split('/').pop() ?? 'theme'] : [],
      ),
    ),
    assets: unique(
      targets.flatMap((target) => (target.refreshKind === 'asset' ? [target.relativePath] : [])),
    ),
    sourceVersions: Object.fromEntries(
      targets.map((target) => [target.relativePath, target.sourceVersion]),
    ),
    managementIndex: targets.some((target) =>
      ['deck', 'management-index'].includes(target.refreshKind),
    ),
  };
}

export async function deriveRefreshPayload(
  ctx: ApiContext,
  writtenFiles: readonly string[],
): Promise<RefreshPayload> {
  return refreshPayloadFromTargets(await deriveRefreshTargets(ctx, writtenFiles));
}
