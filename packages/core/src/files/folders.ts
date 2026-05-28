import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Folder, FolderIcon, SlideCollectionManifest } from '../app/lib/sdk.ts';

export const FOLDER_ID_RE = /^f-[a-f0-9]{8}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export type { Folder, FolderIcon };
export type FoldersManifest = SlideCollectionManifest;

function emptyManifest(): FoldersManifest {
  return { folders: [], assignments: {}, decks: [], manualOrder: {} };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function normalizeManifest(parsed: Partial<FoldersManifest>): FoldersManifest {
  const folders = Array.isArray(parsed.folders) ? parsed.folders : [];
  const folderIds = new Set(folders.map((folder) => folder.id));
  const assignments: Record<string, string> = {};
  if (parsed.assignments && typeof parsed.assignments === 'object') {
    for (const [slideId, folderId] of Object.entries(parsed.assignments)) {
      if (typeof folderId === 'string' && folderIds.has(folderId)) assignments[slideId] = folderId;
    }
  }
  const decks = Array.isArray(parsed.decks)
    ? parsed.decks.map((deck) => ({ ...deck, slideOrder: stringArray(deck.slideOrder) }))
    : [];
  const manualOrder: Record<string, string[]> = {};
  if (parsed.manualOrder && typeof parsed.manualOrder === 'object') {
    for (const [key, slideIds] of Object.entries(parsed.manualOrder)) {
      manualOrder[key] = stringArray(slideIds);
    }
  }
  return { folders, assignments, decks, manualOrder };
}

export async function readManifest(file: string): Promise<FoldersManifest> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FoldersManifest>;
    return normalizeManifest(parsed);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyManifest();
    throw err;
  }
}

export async function writeManifest(file: string, manifest: FoldersManifest): Promise<void> {
  const normalized = normalizeManifest(manifest);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

export function newFolderId(): string {
  return `f-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export function validateName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed.length < 1 || trimmed.length > 40) return null;
  return trimmed;
}

export function validateIcon(v: unknown): FolderIcon | null {
  if (!v || typeof v !== 'object') return null;
  const icon = v as { type?: unknown; value?: unknown };
  if (icon.type === 'emoji') {
    if (typeof icon.value !== 'string') return null;
    if (icon.value.length < 1 || icon.value.length > 8) return null;
    return { type: 'emoji', value: icon.value };
  }
  if (icon.type === 'color') {
    if (typeof icon.value !== 'string' || !COLOR_RE.test(icon.value)) return null;
    return { type: 'color', value: icon.value };
  }
  return null;
}
