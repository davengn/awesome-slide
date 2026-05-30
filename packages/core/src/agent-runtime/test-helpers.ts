import path from 'node:path';
import type {
  ConnectionCapabilities,
  ConnectionStatusState,
} from '../app/lib/agent-connection-types.ts';
import { normalizeCapabilities } from '../app/lib/agent-connections.ts';
import type {
  ContextSnapshot,
  PromptPackage,
  RuntimeConnectionSnapshot,
  RuntimeConversation,
  RuntimeEvent,
  RuntimeEventSource,
  RuntimeEventType,
  RuntimeProject,
  RuntimeRun,
  RuntimeRunState,
  WorkflowRef,
} from './contracts.ts';

export const TEST_NOW = '2026-05-30T00:00:00.000Z';

export function createTestRuntimeProject(overrides: Partial<RuntimeProject> = {}): RuntimeProject {
  const rootPath = overrides.rootPath ?? path.join(process.cwd(), 'demo-project');
  return {
    projectId: 'project_test',
    rootPath,
    rootLabel: path.basename(rootPath),
    runtimeMode: 'interactive',
    storageRoot: path.join(rootPath, '.awesome-slide', 'agent-chat'),
    ...overrides,
  };
}

export function createTestConnectionSnapshot(
  overrides: Partial<RuntimeConnectionSnapshot> = {},
): RuntimeConnectionSnapshot {
  return {
    connectionId: 'conn_test',
    displayName: 'Codex CLI',
    type: 'local-agent',
    provider: 'codex',
    modelOrAgent: 'Codex CLI',
    modelId: 'gpt-5',
    capabilities: normalizeCapabilities({
      streaming: true,
      cancellation: true,
      structuredProposals: true,
      toolCalls: true,
      localFileContext: true,
      writeCapable: true,
      maxContextBytes: 256 * 1024,
      supportedModalities: ['text'],
    }) as ConnectionCapabilities,
    status: 'ready',
    settingsTarget: 'execution-model',
    ...overrides,
  };
}

export function createTestContextSnapshot(
  overrides: Partial<ContextSnapshot> = {},
): ContextSnapshot {
  return {
    contextSnapshotId: 'ctx_test',
    project: { name: 'Test Deck', rootLabel: 'demo-project' },
    slide: { id: 'intro', title: 'Intro', pageIndex: 0, pageCount: 1 },
    source: { excerpts: [], totalBytes: 0, truncated: false },
    limits: { maxBytes: 128 * 1024, generatedAt: TEST_NOW },
    ...overrides,
  };
}

export function createTestWorkflowRef(overrides: Partial<WorkflowRef> = {}): WorkflowRef {
  return {
    workflowId: 'current-slide',
    sourcePath: '/skills/current-slide/SKILL.md',
    contentHash: 'hash_current_slide',
    summary: 'Current slide workflow',
    instructions: 'Edit the current slide.',
    ...overrides,
  };
}

export function createTestPromptPackage(overrides: Partial<PromptPackage> = {}): PromptPackage {
  return {
    promptPackageId: 'prompt_test',
    userPrompt: 'Improve this slide',
    systemInstructions: 'Use Awesome Slide workflows.',
    workflowRefs: [createTestWorkflowRef()],
    context: createTestContextSnapshot(),
    transcript: [],
    capabilityInstructions: 'Write-capable local agent.',
    outputContract: {
      kind: 'awesome-slide-proposal',
      writeAccess: true,
      requiresStructuredEnvelope: true,
      validationChecks: ['mutation-guard'],
    },
    createdAt: TEST_NOW,
    ...overrides,
  };
}

export function createTestConversation(
  overrides: Partial<RuntimeConversation> = {},
): RuntimeConversation {
  return {
    conversationId: 'conv_test',
    projectId: 'project_test',
    origin: 'slide-workspace',
    activeSlideId: 'intro',
    messageIds: [],
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    ...overrides,
  };
}

export function createTestRun(overrides: Partial<RuntimeRun> = {}): RuntimeRun {
  return {
    runId: 'run_test',
    conversationId: 'conv_test',
    prompt: 'Improve this slide',
    promptPackageId: 'prompt_test',
    connectionSnapshot: createTestConnectionSnapshot(),
    contextSnapshotId: 'ctx_test',
    state: 'queued',
    eventCursor: 0,
    startedAt: TEST_NOW,
    proposalIds: [],
    ...overrides,
  };
}

export function createTestEvent(
  overrides: Partial<RuntimeEvent> & {
    type?: RuntimeEventType;
    source?: RuntimeEventSource;
    state?: RuntimeRunState;
    status?: ConnectionStatusState;
  } = {},
): RuntimeEvent {
  return {
    sequence: 1,
    runId: 'run_test',
    type: overrides.type ?? 'queued',
    payload: {},
    createdAt: TEST_NOW,
    source: overrides.source ?? 'runtime',
    ...overrides,
  };
}
