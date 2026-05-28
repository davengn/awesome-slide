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

import type { AgentOperation } from '../app/lib/agent-chat-types.ts';
import { classifyRiskLevel, normalizeProposal, validateProposal } from './agent-proposals.ts';

describe('Agent Edit Proposals', () => {
  it('normalizes partial proposals with sensible defaults', () => {
    const partial = {
      id: 'prop_1',
      runId: 'run_1',
      summary: 'Update text',
    };
    const normalized = normalizeProposal(partial);

    expect(normalized.id).toBe('prop_1');
    expect(normalized.scope).toBe('slide');
    expect(normalized.riskLevel).toBe('low');
    expect(normalized.state).toBe('pending-review');
    expect(normalized.operations).toBeDefined();
    expect(normalized.previewArtifacts).toBeDefined();
    expect(normalized.validation.status).toBe('pending');
  });

  it('classifies risk levels based on operations', () => {
    const lowOps: AgentOperation[] = [
      {
        id: 'op_1',
        kind: 'update-speaker-notes',
        target: 'slides/intro',
        description: 'Update notes',
        payload: {},
        requiresConfirmation: false,
        validationState: 'pending',
        reversible: true,
      },
    ];
    expect(classifyRiskLevel(lowOps)).toBe('low');

    const mediumOps: AgentOperation[] = [
      {
        id: 'op_2',
        kind: 'create-slide',
        target: 'slides/new-slide',
        description: 'Create slide',
        payload: {},
        requiresConfirmation: false,
        validationState: 'pending',
        reversible: true,
      },
    ];
    expect(classifyRiskLevel(mediumOps)).toBe('medium');

    const highOps: AgentOperation[] = [
      {
        id: 'op_3',
        kind: 'apply-theme',
        target: 'deck',
        description: 'Apply theme globally',
        payload: { scope: 'deck' },
        requiresConfirmation: true,
        validationState: 'pending',
        reversible: false,
      },
    ];
    expect(classifyRiskLevel(highOps)).toBe('high');
  });

  it('validates proposals and measures timing under 200ms budget', async () => {
    const proposal = normalizeProposal({
      id: 'prop_1',
      runId: 'run_1',
      summary: 'Valid proposal test',
      operations: [
        {
          id: 'op_1',
          kind: 'patch-slide-metadata',
          target: 'intro',
          description: 'Update metadata',
          payload: { patch: { title: 'New title' } },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
    });

    const startTime = performance.now();
    const validation = await validateProposal(proposal);
    const duration = performance.now() - startTime;

    expect(validation.status).toBe('valid');
    expect(validation.checks).toHaveLength(1);
    expect(validation.checks[0].status).toBe('pass');
    expect(duration).toBeLessThan(200); // 200ms budget
  });

  it('fails validation when TSX bracket/tag mismatch or conflict is detected', async () => {
    const bracketMismatch = normalizeProposal({
      id: 'prop_tsx_1',
      operations: [
        {
          id: 'op_tsx_1',
          kind: 'patch-slide-source',
          target: 'intro',
          description: 'Edit code',
          payload: { code: 'const test = {;' }, // missing closing }
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
    });
    const val1 = await validateProposal(bracketMismatch);
    expect(val1.status).toBe('invalid');
    expect(val1.checks.some((c) => c.kind === 'tsx-parse' && c.status === 'fail')).toBe(true);

    const conflictProposal = normalizeProposal({
      id: 'prop_tsx_2',
      operations: [
        {
          id: 'op_tsx_2',
          kind: 'patch-slide-source',
          target: 'intro',
          description: 'Edit code',
          payload: { code: '{}', originalCode: 'CONFLICT' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
    });
    const val2 = await validateProposal(conflictProposal);
    expect(val2.status).toBe('conflict');
    expect(val2.checks.some((c) => c.kind === 'source-conflict' && c.status === 'fail')).toBe(true);
  });

  it('warns when theme does not exist in workspace', async () => {
    const themeProposal = normalizeProposal({
      id: 'prop_theme',
      operations: [
        {
          id: 'op_theme',
          kind: 'apply-theme',
          target: 'deck',
          description: 'Apply non-existent theme',
          payload: { themeId: 'non_existent_theme' },
          requiresConfirmation: true,
          validationState: 'pending',
          reversible: false,
        },
      ],
    });
    const val = await validateProposal(themeProposal);
    expect(val.status).toBe('pending'); // warnings result in pending validation status
    expect(val.checks.some((c) => c.kind === 'theme-exists' && c.status === 'warn')).toBe(true);
  });
});

describe('Deck Operation Validation (US4)', () => {
  it('validates create-slide operations pass with target and payload', async () => {
    const proposal = normalizeProposal({
      id: 'prop_deck_1',
      runId: 'run_1',
      summary: 'Create a new slide in deck',
      scope: 'deck',
      operations: [
        {
          id: 'op_create',
          kind: 'create-slide',
          target: 'deck_intro',
          description: 'Create a related slide',
          payload: { title: 'New Slide', template: 'blank' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
    });
    const val = await validateProposal(proposal);
    expect(val.status).toBe('valid');
    expect(val.checks.some((c) => c.status === 'fail')).toBe(false);
  });

  it('validates update-speaker-notes operations pass with notes payload', async () => {
    const proposal = normalizeProposal({
      id: 'prop_notes_1',
      scope: 'slide',
      operations: [
        {
          id: 'op_notes',
          kind: 'update-speaker-notes',
          target: 'slides/intro',
          description: 'Generate speaker notes',
          payload: { notes: 'Introduce the product here.' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
    });
    const val = await validateProposal(proposal);
    expect(val.status).toBe('valid');
    expect(val.checks.some((c) => c.kind === 'mutation-guard' && c.status === 'pass')).toBe(true);
  });

  it('validates reorder-pages with medium risk classification', async () => {
    const proposal = normalizeProposal({
      id: 'prop_reorder',
      scope: 'deck',
      operations: [
        {
          id: 'op_reorder',
          kind: 'reorder-pages',
          target: 'deck_intro',
          description: 'Reorder slides',
          payload: { slideOrder: ['slide_b', 'slide_a', 'slide_c'] },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
    });
    expect(classifyRiskLevel(proposal.operations)).toBe('medium');
    const val = await validateProposal(proposal);
    expect(val.status).toBe('valid');
  });

  it('validates update-deck operations pass mutation guards', async () => {
    const proposal = normalizeProposal({
      id: 'prop_deck_meta',
      scope: 'deck',
      operations: [
        {
          id: 'op_deck_meta',
          kind: 'update-deck',
          target: 'deck_intro',
          description: 'Tighten deck narrative',
          payload: { name: 'Onboarding v2' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
    });
    expect(classifyRiskLevel(proposal.operations)).toBe('medium');
    const val = await validateProposal(proposal);
    expect(val.status).toBe('valid');
  });
});
