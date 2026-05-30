import { describe, expect, it } from 'vitest';
import { parseProposalOutput } from './proposal-output.ts';

describe('proposal output parser', () => {
  it('parses valid structured proposal envelopes', () => {
    const result = parseProposalOutput(
      JSON.stringify({
        kind: 'awesome-slide-proposal',
        summary: 'Create an intro slide',
        scope: 'deck',
        operations: [
          {
            kind: 'create-slide',
            target: 'deck_1',
            description: 'Create product intro slide',
            payload: {
              slideId: 'product-intro',
              title: 'Product Intro',
              code: 'export default [() => <div>Product Intro</div>];',
            },
          },
        ],
      }),
      { runId: 'run_1', proposalId: 'prop_1' },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.id).toBe('prop_1');
    expect(result.proposal.summary).toBe('Create an intro slide');
    expect(result.proposal.operations[0]?.id).toBe('op_1');
    expect(result.proposal.riskLevel).toBe('medium');
    expect(result.fileSummary.files[0]?.path).toBe('slides/product-intro/index.tsx');
  });

  it('rejects invalid prose without a structured envelope', () => {
    const result = parseProposalOutput('I changed the slide in my imagination.', {
      runId: 'run_1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe('invalid-agent-output');
  });

  it('rejects unsupported operation kinds', () => {
    const result = parseProposalOutput(
      {
        kind: 'awesome-slide-proposal',
        summary: 'Delete everything',
        operations: [
          {
            kind: 'delete-project',
            target: 'project',
            description: 'Unsupported destructive operation',
            payload: {},
          },
        ],
      },
      { runId: 'run_1' },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe('invalid-agent-output');
  });

  it('preserves high risk and generated file summaries from operation metadata', () => {
    const result = parseProposalOutput(
      {
        kind: 'awesome-slide-proposal',
        summary: 'Apply deck theme',
        riskLevel: 'high',
        operations: [
          {
            id: 'op_theme',
            kind: 'apply-theme',
            target: 'intro',
            description: 'Apply global deck theme',
            payload: { themeId: 'theme_launch', scope: 'deck' },
            requiresConfirmation: true,
          },
        ],
      },
      { runId: 'run_1' },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.riskLevel).toBe('high');
    expect(result.proposal.operations[0]?.requiresConfirmation).toBe(true);
    expect(result.fileSummary.files).toEqual([
      expect.objectContaining({
        operationId: 'op_theme',
        path: 'slides/intro/index.tsx',
      }),
    ]);
  });

  it('parses fenced JSON envelopes embedded in assistant text', () => {
    const result = parseProposalOutput(
      [
        'Here is the proposal:',
        '```json',
        JSON.stringify({
          kind: 'awesome-slide-proposal',
          summary: 'Patch intro',
          operations: [
            {
              kind: 'patch-slide-source',
              target: 'intro',
              description: 'Patch intro source',
              payload: { code: 'export default [() => <div>Intro</div>];' },
            },
          ],
        }),
        '```',
      ].join('\n'),
      { runId: 'run_1' },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.proposal.previewArtifacts.some((artifact) => artifact.kind === 'source-diff'),
    ).toBe(true);
  });
});
