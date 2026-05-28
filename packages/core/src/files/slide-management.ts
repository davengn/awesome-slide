import { randomUUID } from 'node:crypto';
import type { Deck, FoldersManifest } from '../app/lib/sdk.ts';
import { newFolderId, readManifest, writeManifest } from './folders.ts';

export const DECK_ID_RE = /^d-[a-f0-9]{8}$/;

export { newFolderId, readManifest, writeManifest };

export function newDeckId(): string {
  return `d-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export function validateDeckName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed.length < 1 || trimmed.length > 60) return null;
  return trimmed;
}

export function validateDeckDescription(v: unknown): string | null {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return null;
  if (v.length > 280) return null;
  return v;
}

export function addDeck(manifest: FoldersManifest, deck: Deck): FoldersManifest {
  return { ...manifest, decks: [...manifest.decks, deck] };
}

export function updateDeck(
  manifest: FoldersManifest,
  deckId: string,
  patch: Partial<Pick<Deck, 'name' | 'description' | 'theme' | 'slideOrder'>>,
): FoldersManifest | null {
  const idx = manifest.decks.findIndex((d) => d.id === deckId);
  if (idx === -1) return null;
  const current = manifest.decks[idx];
  if (!current) return null;
  const updated = {
    ...current,
    ...patch,
    id: current.id,
    slideOrder: patch.slideOrder ? uniqueStrings(patch.slideOrder) : current.slideOrder,
  };
  const decks = manifest.decks.slice();
  decks[idx] = updated;
  return { ...manifest, decks };
}

export function removeDeck(manifest: FoldersManifest, deckId: string): FoldersManifest {
  const decks = manifest.decks.filter((d) => d.id !== deckId);
  return { ...manifest, decks };
}

export function setDeckSlideOrder(
  manifest: FoldersManifest,
  deckId: string,
  slideIds: string[],
): FoldersManifest | null {
  return updateDeck(manifest, deckId, { slideOrder: slideIds });
}

export function addSlideToDeck(
  manifest: FoldersManifest,
  deckId: string,
  slideId: string,
): FoldersManifest | null {
  const idx = manifest.decks.findIndex((d) => d.id === deckId);
  if (idx === -1) return null;
  const deck = manifest.decks[idx];
  if (!deck) return null;
  if (deck.slideOrder.includes(slideId)) return manifest;
  const updated = { ...deck, slideOrder: [...deck.slideOrder, slideId] };
  const decks = manifest.decks.slice();
  decks[idx] = updated;
  return { ...manifest, decks };
}

export function removeSlideFromDeck(
  manifest: FoldersManifest,
  deckId: string,
  slideId: string,
): FoldersManifest | null {
  const idx = manifest.decks.findIndex((d) => d.id === deckId);
  if (idx === -1) return null;
  const deck = manifest.decks[idx];
  if (!deck) return null;
  const updated = { ...deck, slideOrder: deck.slideOrder.filter((id) => id !== slideId) };
  const decks = manifest.decks.slice();
  decks[idx] = updated;
  return { ...manifest, decks };
}

export function removeSlideFromAllDecks(
  manifest: FoldersManifest,
  slideId: string,
): FoldersManifest {
  const decks = manifest.decks.map((d) => ({
    ...d,
    slideOrder: d.slideOrder.filter((id) => id !== slideId),
  }));
  return { ...manifest, decks };
}

export function slideDeckIds(manifest: FoldersManifest, slideId: string): string[] {
  return manifest.decks.filter((d) => d.slideOrder.includes(slideId)).map((d) => d.id);
}

export function setManualOrder(
  manifest: FoldersManifest,
  key: string,
  slideIds: string[],
): FoldersManifest {
  return { ...manifest, manualOrder: { ...manifest.manualOrder, [key]: uniqueStrings(slideIds) } };
}

export function removeManualOrderEntry(
  manifest: FoldersManifest,
  slideId: string,
): FoldersManifest {
  const manualOrder: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(manifest.manualOrder)) {
    const filtered = ids.filter((id) => id !== slideId);
    if (filtered.length > 0) manualOrder[key] = filtered;
  }
  return { ...manifest, manualOrder };
}

export function cleanupStaleReferences(manifest: FoldersManifest): FoldersManifest {
  const validFolderIds = new Set(manifest.folders.map((f) => f.id));
  const assignments: Record<string, string> = {};
  for (const [slideId, folderId] of Object.entries(manifest.assignments)) {
    if (validFolderIds.has(folderId)) assignments[slideId] = folderId;
  }
  const decks = manifest.decks.map((d) => ({
    ...d,
    slideOrder: uniqueStrings(d.slideOrder),
  }));
  const manualOrder: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(manifest.manualOrder)) {
    manualOrder[key] = uniqueStrings(ids);
  }
  return { ...manifest, assignments, decks, manualOrder };
}

export function cleanupSlideReferences(
  manifest: FoldersManifest,
  slideId: string,
): FoldersManifest {
  const assignments = { ...manifest.assignments };
  delete assignments[slideId];
  const decks = manifest.decks.map((d) => ({
    ...d,
    slideOrder: d.slideOrder.filter((id) => id !== slideId),
  }));
  const manualOrder: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(manifest.manualOrder)) {
    const filtered = ids.filter((id) => id !== slideId);
    if (filtered.length > 0) manualOrder[key] = filtered;
  }
  return { ...manifest, assignments, decks, manualOrder };
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
