import { describe, expect, it } from 'vitest';
import { assemblePromptPackage } from './prompts.ts';
import {
  createTestConnectionSnapshot,
  createTestContextSnapshot,
  createTestWorkflowRef,
} from './test-helpers.ts';

describe('agent-runtime prompt assembly', () => {
  it('assembles write-capable local-agent prompt packages', () => {
    const prompt = assemblePromptPackage({
      userPrompt: 'Create a stronger intro slide',
      connection: createTestConnectionSnapshot({ type: 'local-agent' }),
      context: createTestContextSnapshot(),
      workflowRefs: [createTestWorkflowRef()],
      now: '2026-05-30T00:00:00.000Z',
    });

    expect(prompt.promptPackageId).toMatch(/^prompt_/);
    expect(prompt.outputContract.kind).toBe('awesome-slide-proposal');
    expect(prompt.outputContract.writeAccess).toBe(true);
    expect(prompt.capabilityInstructions).toContain('awesome-slide-proposal');
    expect(prompt.systemInstructions).toContain('Workflow current-slide');
  });

  it('adds no-tools instructions for provider prompt packages', () => {
    const prompt = assemblePromptPackage({
      userPrompt: 'Improve copy',
      connection: createTestConnectionSnapshot({
        type: 'api-provider',
        provider: 'openai',
        capabilities: {
          streaming: true,
          cancellation: true,
          structuredProposals: true,
          toolCalls: false,
          localFileContext: false,
          writeCapable: true,
          supportedModalities: ['text'],
        },
      }),
      context: createTestContextSnapshot(),
      workflowRefs: [createTestWorkflowRef()],
    });

    expect(prompt.capabilityInstructions).toContain('Do not call tools');
  });

  it('blocks write contracts in read-only prompt packages', () => {
    const prompt = assemblePromptPackage({
      userPrompt: 'Update slide source',
      connection: createTestConnectionSnapshot(),
      context: createTestContextSnapshot(),
      workflowRefs: [createTestWorkflowRef()],
      runtimeMode: 'read-only',
    });

    expect(prompt.outputContract.kind).toBe('text-only');
    expect(prompt.outputContract.writeAccess).toBe(false);
    expect(prompt.outputContract.validationChecks).toContain('read-only-mode');
    expect(prompt.capabilityInstructions).toContain('Read-only mode is active');
  });
});
