import { describe, expect, it } from 'vitest';
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
});
