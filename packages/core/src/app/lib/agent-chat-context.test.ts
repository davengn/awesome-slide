import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:awesome-slide/themes', () => {
  return {
    themes: [
      {
        id: 'theme_default',
        name: 'Default',
        description: 'Default Theme',
        body: '',
        hasDemo: false,
      },
    ],
    loadThemeDemo: async () => ({ default: [] }),
  };
});

vi.mock('virtual:awesome-slide/slides', () => {
  return {
    slideIds: [],
    slideTitles: {},
    slideDescriptions: {},
    slideTags: {},
    slideThemes: {},
    slideStatus: {},
    slideCreatedAt: {},
    slideUpdatedAt: {},
    slideSourceState: { intro: 'supported', slide_1: 'supported' },
    loadSlide: async () => ({}),
  };
});

import {
  buildAgentChatContext,
  isSecretContent,
  isSecretFile,
  redactSecrets,
} from './agent-chat-context.ts';

describe('Agent Chat Context Redaction & Filtering', () => {
  it('detects secret files correctly', () => {
    expect(isSecretFile('.env')).toBe(true);
    expect(isSecretFile('.env.local')).toBe(true);
    expect(isSecretFile('id_rsa')).toBe(true);
    expect(isSecretFile('key.pem')).toBe(true);
    expect(isSecretFile('slides/intro/index.tsx')).toBe(false);
  });

  it('detects secret content correctly', () => {
    expect(isSecretContent('const api_key = "abc";')).toBe(true);
    expect(isSecretContent('password=1234')).toBe(true);
    expect(isSecretContent('const title = "Welcome";')).toBe(false);
  });

  it('redacts secrets from content', () => {
    const content = 'const API_KEY = "super-secret-token";\nconst port = 3000;';
    const redacted = redactSecrets(content);
    expect(redacted).toContain('API_KEY = "<redacted>"');
    expect(redacted).toContain('port = 3000');
  });

  it('builds chat context and honors limits', async () => {
    const context = await buildAgentChatContext({
      project: { name: 'Demo Project' },
      slide: { id: 'intro', title: 'Intro Slide', pageIndex: 0, pageCount: 5 },
      source: {
        excerpts: [
          { filePath: 'slides/intro/index.tsx', content: 'export default () => <div>Hello</div>' },
          { filePath: '.env', content: 'SECRET=123' }, // should be ignored
        ],
      },
    });

    expect(context.project.name).toBe('Demo Project');
    expect(context.slide?.id).toBe('intro');
    expect(context.source?.excerpts).toHaveLength(1);
    expect(context.source?.excerpts[0].filePath).toBe('slides/intro/index.tsx');
  });

  it('collects deck, folder, theme, notes, and selected elements context correctly', async () => {
    const context = await buildAgentChatContext({
      project: { name: 'Demo' },
      slide: { id: 'slide_1', title: 'Slide 1' },
      selection: [
        {
          slideId: 'slide_1',
          pageIndex: 0,
          tagName: 'Heading',
          textPreview: 'Main Title',
          editableProperties: ['text', 'color'],
        },
      ],
      collection: { folderId: 'folder_abc', deckId: 'deck_xyz', slideIds: ['slide_1'] },
      theme: {
        activeThemeId: 'dark',
        availableThemeIds: ['light', 'dark'],
        summaries: [{ themeId: 'dark', name: 'Dark Theme', colors: { bg: '#000' } }],
      },
      notes: { included: true, currentPage: 'Some slide notes', deckSummary: 'Overview' },
    });

    expect(context.selection).toHaveLength(1);
    expect(context.selection?.[0].tagName).toBe('Heading');
    expect(context.collection?.folderId).toBe('folder_abc');
    expect(context.collection?.deckId).toBe('deck_xyz');
    expect(context.theme?.activeThemeId).toBe('dark');
    expect(context.notes?.currentPage).toBe('Some slide notes');
  });

  it('truncates context size gracefully when budget limits are exceeded', async () => {
    const context = await buildAgentChatContext({
      project: { name: 'Demo' },
      source: {
        excerpts: [
          { filePath: 'slide1.tsx', content: 'A'.repeat(500) },
          { filePath: 'slide2.tsx', content: 'B'.repeat(500) },
          { filePath: 'slide3.tsx', content: 'C'.repeat(500) },
        ],
      },
      limits: { maxBytes: 800 },
    });

    expect(context.source?.truncated).toBe(true);
    expect(context.source?.excerpts.length).toBeLessThan(3);
  });
});

describe('Deck Narrative Context (US4)', () => {
  it('collects deck and folder scoped context with ordered slide IDs', async () => {
    const context = await buildAgentChatContext({
      project: { name: 'Deck Narrative Project' },
      collection: {
        folderId: 'folder_main',
        deckId: 'deck_intro',
        slideIds: ['slide_a', 'slide_b', 'slide_c'],
      },
      notes: {
        included: true,
        deckSummary: 'This deck covers onboarding flow from login to dashboard.',
      },
    });

    expect(context.collection?.folderId).toBe('folder_main');
    expect(context.collection?.deckId).toBe('deck_intro');
    expect(context.collection?.slideIds).toEqual(['slide_a', 'slide_b', 'slide_c']);
    expect(context.notes?.deckSummary).toBe(
      'This deck covers onboarding flow from login to dashboard.',
    );
    expect(context.notes?.included).toBe(true);
  });

  it('includes speaker notes for the current page in deck context', async () => {
    const context = await buildAgentChatContext({
      project: { name: 'Notes Test' },
      slide: { id: 'slide_b', title: 'Slide B', pageIndex: 1, pageCount: 3 },
      collection: { deckId: 'deck_intro', slideIds: ['slide_a', 'slide_b', 'slide_c'] },
      notes: {
        included: true,
        currentPage: 'Speak to the login flow UX improvements here.',
        deckSummary: 'Onboarding deck overview',
      },
    });

    expect(context.slide?.id).toBe('slide_b');
    expect(context.notes?.currentPage).toBe('Speak to the login flow UX improvements here.');
    expect(context.notes?.included).toBe(true);
  });

  it('respects budget limits when deck context payload is large', async () => {
    const context = await buildAgentChatContext({
      project: { name: 'Budget Test' },
      collection: {
        deckId: 'deck_big',
        slideIds: Array.from({ length: 50 }, (_, i) => `slide_${i}`),
      },
      source: {
        excerpts: [
          { filePath: 'a.tsx', content: 'X'.repeat(600) },
          { filePath: 'b.tsx', content: 'Y'.repeat(600) },
        ],
      },
      limits: { maxBytes: 900 },
    });

    expect(context.source?.truncated).toBe(true);
    expect(context.limits.maxBytes).toBe(900);
  });

  it('excludes hidden files from deck context source excerpts', async () => {
    const context = await buildAgentChatContext({
      project: { name: 'Hidden File Test' },
      collection: { deckId: 'deck_q' },
      source: {
        excerpts: [
          { filePath: 'slides/intro/index.tsx', content: 'export default () => <div />' },
          { filePath: '.env.production', content: 'DB_PASSWORD=secret123' },
          { filePath: 'slides/outro/index.tsx', content: 'export default () => <section />' },
        ],
      },
    });

    const paths = context.source?.excerpts.map((e) => e.filePath) ?? [];
    expect(paths).not.toContain('.env.production');
    expect(paths).toContain('slides/intro/index.tsx');
    expect(paths).toContain('slides/outro/index.tsx');
  });
});
