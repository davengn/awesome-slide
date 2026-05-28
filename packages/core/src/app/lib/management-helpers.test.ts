import { describe, expect, it, vi } from 'vitest';
import type { Deck, Folder, SlideRecord } from './sdk.ts';

vi.mock('virtual:awesome-slide/folders', () => ({
  default: { folders: [], assignments: {}, decks: [], manualOrder: {} },
}));

vi.mock('virtual:awesome-slide/slides', () => ({
  slideIds: [],
  slideTitles: {},
  slideDescriptions: {},
  slideTags: {},
  slideThemes: {},
  slideStatus: {},
  slideCreatedAt: {},
  slideUpdatedAt: {},
  slideSourceState: {},
  loadSlide: vi.fn(),
}));

import { searchSlides, sortSlides } from './management.ts';

const folders: Folder[] = [
  { id: 'f-story', name: 'Story Arc', icon: { type: 'color', value: '#123456' } },
];

const decks: Deck[] = [{ id: 'd-launch', name: 'Launch Deck', slideOrder: ['intro', 'metrics'] }];

function slide(patch: Partial<SlideRecord> & Pick<SlideRecord, 'id' | 'title'>): SlideRecord {
  return {
    description: undefined,
    tags: [],
    status: 'draft',
    deckIds: [],
    preview: { kind: 'live' },
    sourceState: 'supported',
    readOnly: false,
    ...patch,
  };
}

describe('searchSlides', () => {
  const slides = [
    slide({
      id: 'intro',
      title: 'Opening Story',
      tags: ['keynote'],
      folderId: 'f-story',
      deckIds: ['d-launch'],
    }),
    slide({ id: 'appendix', title: 'Reference', tags: ['backup'] }),
  ];

  it('matches title, stable ID, tag, folder name, and deck name case-insensitively', () => {
    expect(searchSlides(slides, 'opening', folders, decks).map((item) => item.id)).toEqual([
      'intro',
    ]);
    expect(searchSlides(slides, 'APPENDIX', folders, decks).map((item) => item.id)).toEqual([
      'appendix',
    ]);
    expect(searchSlides(slides, 'keynote', folders, decks).map((item) => item.id)).toEqual([
      'intro',
    ]);
    expect(searchSlides(slides, 'story arc', folders, decks).map((item) => item.id)).toEqual([
      'intro',
    ]);
    expect(searchSlides(slides, 'launch', folders, decks).map((item) => item.id)).toEqual([
      'intro',
    ]);
  });
});

describe('sortSlides', () => {
  const slides = [
    slide({
      id: 'missing-date',
      title: 'Bravo',
    }),
    slide({
      id: 'newer',
      title: 'Alpha',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
    }),
    slide({
      id: 'older',
      title: 'Charlie',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
    }),
  ];

  it('sorts by title and preserves input order for manual mode', () => {
    expect(sortSlides(slides, 'manual').map((item) => item.id)).toEqual([
      'missing-date',
      'newer',
      'older',
    ]);
    expect(sortSlides(slides, 'title-asc').map((item) => item.id)).toEqual([
      'newer',
      'missing-date',
      'older',
    ]);
    expect(sortSlides(slides, 'title-desc').map((item) => item.id)).toEqual([
      'older',
      'missing-date',
      'newer',
    ]);
  });

  it('sorts dates in both directions and places missing dates after dated slides', () => {
    expect(sortSlides(slides, 'updated-desc').map((item) => item.id)).toEqual([
      'newer',
      'older',
      'missing-date',
    ]);
    expect(sortSlides(slides, 'updated-asc').map((item) => item.id)).toEqual([
      'older',
      'newer',
      'missing-date',
    ]);
    expect(sortSlides(slides, 'created-desc').map((item) => item.id)).toEqual([
      'newer',
      'older',
      'missing-date',
    ]);
    expect(sortSlides(slides, 'created-asc').map((item) => item.id)).toEqual([
      'older',
      'newer',
      'missing-date',
    ]);
  });
});
