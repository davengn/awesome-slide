import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FoldersManifest } from '../app/lib/sdk.ts';
import {
  addDeck,
  addSlideToDeck,
  cleanupSlideReferences,
  readManifest,
  removeSlideFromDeck,
  setDeckSlideOrder,
  setManualOrder,
  writeManifest,
} from './slide-management.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-manifest-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('slide collection manifest', () => {
  it('defaults missing files and missing fields to the complete manifest shape', async () => {
    const missing = await readManifest(path.join(tempDir, '.folders.json'));
    expect(missing).toEqual({ folders: [], assignments: {}, decks: [], manualOrder: {} });

    const file = path.join(tempDir, 'legacy.json');
    await fs.writeFile(
      file,
      JSON.stringify({
        folders: [{ id: 'f-11111111', name: 'Drafts', icon: { type: 'color', value: '#abcdef' } }],
        assignments: { intro: 'f-11111111' },
      }),
      'utf8',
    );

    await expect(readManifest(file)).resolves.toEqual({
      folders: [{ id: 'f-11111111', name: 'Drafts', icon: { type: 'color', value: '#abcdef' } }],
      assignments: { intro: 'f-11111111' },
      decks: [],
      manualOrder: {},
    });
  });

  it('writes complete JSON and cleans stale folder and duplicate order references', async () => {
    const file = path.join(tempDir, '.folders.json');
    const manifest: FoldersManifest = {
      folders: [{ id: 'f-11111111', name: 'Ready', icon: { type: 'color', value: '#abcdef' } }],
      assignments: { intro: 'f-11111111', stale: 'f-22222222' },
      decks: [{ id: 'd-11111111', name: 'Deck', slideOrder: ['intro', 'intro', 'summary'] }],
      manualOrder: { draft: ['summary', 'summary', 'intro'] },
    };

    await writeManifest(file, manifest);

    await expect(readManifest(file)).resolves.toEqual({
      folders: [{ id: 'f-11111111', name: 'Ready', icon: { type: 'color', value: '#abcdef' } }],
      assignments: { intro: 'f-11111111' },
      decks: [{ id: 'd-11111111', name: 'Deck', slideOrder: ['intro', 'summary'] }],
      manualOrder: { draft: ['summary', 'intro'] },
    });
    await expect(fs.readFile(file, 'utf8')).resolves.toMatch(/\n$/);
  });

  it('supports deck CRUD, deck order, manual order, and slide-reference cleanup helpers', () => {
    const base: FoldersManifest = {
      folders: [{ id: 'f-11111111', name: 'Ready', icon: { type: 'color', value: '#abcdef' } }],
      assignments: { intro: 'f-11111111' },
      decks: [],
      manualOrder: {},
    };

    const withDeck = addDeck(base, { id: 'd-11111111', name: 'Deck', slideOrder: [] });
    const withSlides = addSlideToDeck(withDeck, 'd-11111111', 'intro');
    expect(withSlides?.decks[0]?.slideOrder).toEqual(['intro']);
    expect(
      addSlideToDeck(withSlides ?? withDeck, 'd-11111111', 'intro')?.decks[0]?.slideOrder,
    ).toEqual(['intro']);

    const ordered = setDeckSlideOrder(withSlides ?? withDeck, 'd-11111111', [
      'summary',
      'intro',
      'summary',
    ]);
    expect(ordered?.decks[0]?.slideOrder).toEqual(['summary', 'intro']);

    const withoutSummary = removeSlideFromDeck(ordered ?? withDeck, 'd-11111111', 'summary');
    expect(withoutSummary?.decks[0]?.slideOrder).toEqual(['intro']);

    const manual = setManualOrder(withoutSummary ?? withDeck, 'folder:f-11111111', [
      'intro',
      'intro',
      'summary',
    ]);
    expect(manual.manualOrder['folder:f-11111111']).toEqual(['intro', 'summary']);

    expect(cleanupSlideReferences(manual, 'intro')).toEqual({
      folders: base.folders,
      assignments: {},
      decks: [{ id: 'd-11111111', name: 'Deck', slideOrder: [] }],
      manualOrder: { 'folder:f-11111111': ['summary'] },
    });
  });
});
