import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AgentChatRouteError,
  applyProposal,
  getSession,
  listRuns,
  startRun,
  streamRunEvents,
} from './agent-chat-client.ts';
import type { AgentChatEvent } from './agent-chat-types.ts';

describe('Agent Chat Client - streamRunEvents', () => {
  // biome-ignore lint/suspicious/noExplicitAny: mock EventSource
  let mockEventSourceInstance: any;
  // biome-ignore lint/suspicious/noExplicitAny: mock EventSource
  let originalEventSource: any;

  beforeEach(() => {
    mockEventSourceInstance = {
      close: vi.fn(),
      onmessage: null,
      onerror: null,
    };

    // biome-ignore lint/suspicious/noExplicitAny: mock global EventSource
    originalEventSource = (global as any).EventSource;
    // biome-ignore lint/suspicious/noExplicitAny: mock global EventSource
    (global as any).EventSource = vi.fn().mockImplementation(() => mockEventSourceInstance);
  });

  afterEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: mock global EventSource
    (global as any).EventSource = originalEventSource;
  });

  it('subscribes to EventSource and triggers onEvent (T083)', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();

    const { abort } = streamRunEvents('run_test_1', onEvent, onError);

    expect(global.EventSource).toHaveBeenCalledWith('/__agent-chat/runs/run_test_1/events');

    // Simulate event
    const eventData: AgentChatEvent = {
      sequence: 1,
      runId: 'run_test_1',
      type: 'token',
      payload: 'hello',
      createdAt: new Date().toISOString(),
    };

    mockEventSourceInstance.onmessage({ data: JSON.stringify(eventData) });

    expect(onEvent).toHaveBeenCalledWith(eventData);
    expect(mockEventSourceInstance.close).not.toHaveBeenCalled();

    abort();
    expect(mockEventSourceInstance.close).toHaveBeenCalled();
  });

  it('uses replay cursors when subscribing to runtime events', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();

    streamRunEvents('run_test_1', onEvent, onError, { afterSequence: 7 });

    expect(global.EventSource).toHaveBeenCalledWith('/__agent-chat/runs/run_test_1/events?after=7');
  });

  it('closes EventSource automatically on terminal completed event (T083)', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();

    streamRunEvents('run_test_1', onEvent, onError);

    const eventData: AgentChatEvent = {
      sequence: 1,
      runId: 'run_test_1',
      type: 'completed',
      payload: null,
      createdAt: new Date().toISOString(),
    };

    mockEventSourceInstance.onmessage({ data: JSON.stringify(eventData) });

    expect(onEvent).toHaveBeenCalledWith(eventData);
    expect(mockEventSourceInstance.close).toHaveBeenCalled();
  });

  it('triggers onError and closes EventSource on error (T083)', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();

    streamRunEvents('run_test_1', onEvent, onError);

    mockEventSourceInstance.onerror();

    expect(mockEventSourceInstance.close).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});

describe('Agent Chat Client - route errors and run listing', () => {
  it('preserves categorized blocked connection failures', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({
        error: 'No active agent connection is configured.',
        category: 'connection-unavailable',
        recoveryActions: ['change-connection'],
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      await expect(startRun('session_1', 'Keep my prompt')).rejects.toMatchObject({
        status: 503,
        category: 'connection-unavailable',
      } satisfies Partial<AgentChatRouteError>);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('lists active runs for reattach', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ runs: [{ runId: 'run_1', lastSequence: 3 }] }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const response = await listRuns('session_slide_intro');
      expect(mockFetch).toHaveBeenCalledWith(
        '/__agent-chat/runs?conversationId=session_slide_intro',
      );
      expect(response.runs[0]?.runId).toBe('run_1');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sends high-risk confirmation when applying a proposal', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        transactionId: 'tx_1',
        proposalId: 'prop_1',
        state: 'applied',
        writtenFiles: [],
        refresh: {
          targets: [],
          slides: [],
          decks: [],
          themes: [],
          assets: [],
          sourceVersions: {},
          managementIndex: false,
        },
        auditEntryId: 'audit_1',
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      await applyProposal('prop_1', ['op_1'], { acceptedRiskLevel: 'high' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/__agent-chat/proposals/prop_1/apply',
        expect.objectContaining({
          body: JSON.stringify({
            operationIds: ['op_1'],
            confirmation: { acceptedRiskLevel: 'high' },
            confirmedHighRisk: true,
          }),
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Agent Chat Client - getSession', () => {
  it('passes the active slide id when bootstrapping a slide chat session', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: {
          id: 'session_slide_intro',
          projectKey: 'project_default',
          origin: 'slide-workspace',
          activeSlideId: 'intro',
          messages: [],
          contextPreferences: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        activeConnection: {
          connectionId: 'none',
          displayName: 'No Connection',
          type: 'local-agent',
          modelOrAgent: 'None',
          status: 'needs-setup',
        },
        runtime: { mode: 'interactive', settingsRoute: '/settings/connections' },
        suggestedActions: [],
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      await getSession({ slideId: 'intro' });
      expect(mockFetch).toHaveBeenCalledWith('/__agent-chat/session?slideId=intro');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
