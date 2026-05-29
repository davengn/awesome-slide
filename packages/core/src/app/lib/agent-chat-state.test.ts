import { describe, expect, it } from 'vitest';
import { agentChatReducer } from './agent-chat-state.ts';
import type { AgentChatEvent, AgentChatSession, AgentEditProposal } from './agent-chat-types.ts';

const createInitialSession = (): AgentChatSession => ({
  id: 'session_123',
  projectKey: 'proj_abc',
  origin: 'slide-workspace',
  messages: [],
  contextPreferences: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Agent Chat State Reducer', () => {
  it('should transition to queued on START_RUN', () => {
    const session = createInitialSession();
    const nextSession = agentChatReducer(session, {
      type: 'START_RUN',
      payload: {
        runId: 'run_1',
        prompt: 'Test prompt',
      },
    });

    expect(nextSession.currentRunId).toBe('run_1');
    expect(nextSession.messages).toHaveLength(2); // user message + assistant/status placeholder

    const userMsg = nextSession.messages[0];
    expect(userMsg.role).toBe('user');
    expect(userMsg.content[0].text).toBe('Test prompt');

    const runMsg = nextSession.messages[1];
    expect(runMsg.role).toBe('assistant');
    expect(runMsg.state).toBe('queued');
  });

  it('should handle token streaming events', () => {
    let session = createInitialSession();
    session = agentChatReducer(session, {
      type: 'START_RUN',
      payload: { runId: 'run_1', prompt: 'Prompt' },
    });

    const tokenEvent: AgentChatEvent = {
      sequence: 1,
      runId: 'run_1',
      type: 'token',
      payload: 'Hello',
      createdAt: new Date().toISOString(),
    };

    const nextSession = agentChatReducer(session, {
      type: 'RECEIVE_EVENT',
      payload: tokenEvent,
    });

    const assistantMsg = nextSession.messages[1];
    expect(assistantMsg.state).toBe('streaming');
    expect(assistantMsg.content).toHaveLength(1);
    expect(assistantMsg.content[0].text).toBe('Hello');
  });

  it('should accumulate token streaming events', () => {
    let session = createInitialSession();
    session = agentChatReducer(session, {
      type: 'START_RUN',
      payload: { runId: 'run_1', prompt: 'Prompt' },
    });

    session = agentChatReducer(session, {
      type: 'RECEIVE_EVENT',
      payload: {
        sequence: 1,
        runId: 'run_1',
        type: 'token',
        payload: 'Hello',
        createdAt: new Date().toISOString(),
      },
    });

    session = agentChatReducer(session, {
      type: 'RECEIVE_EVENT',
      payload: {
        sequence: 2,
        runId: 'run_1',
        type: 'token',
        payload: ' World',
        createdAt: new Date().toISOString(),
      },
    });

    const assistantMsg = session.messages[1];
    expect(assistantMsg.content[0].text).toBe('Hello World');
  });

  it('should transition to needs-review on proposal event', () => {
    let session = createInitialSession();
    session = agentChatReducer(session, {
      type: 'START_RUN',
      payload: { runId: 'run_1', prompt: 'Prompt' },
    });

    const proposalEvent: AgentChatEvent = {
      sequence: 1,
      runId: 'run_1',
      type: 'proposal',
      payload: {
        id: 'prop_1',
        summary: 'Change layout',
        scope: 'slide',
        riskLevel: 'low',
        operations: [],
        previewArtifacts: [],
        validation: { status: 'valid', checks: [] },
        state: 'pending-review',
      },
      createdAt: new Date().toISOString(),
    };

    const nextSession = agentChatReducer(session, {
      type: 'RECEIVE_EVENT',
      payload: proposalEvent,
    });

    const assistantMsg = nextSession.messages[1];
    expect(assistantMsg.state).toBe('needs-review');
    expect(assistantMsg.proposalId).toBe('prop_1');
  });

  it('should transition to completed and clear currentRunId', () => {
    let session = createInitialSession();
    session = agentChatReducer(session, {
      type: 'START_RUN',
      payload: { runId: 'run_1', prompt: 'Prompt' },
    });

    const nextSession = agentChatReducer(session, {
      type: 'RECEIVE_EVENT',
      payload: {
        sequence: 1,
        runId: 'run_1',
        type: 'completed',
        payload: null,
        createdAt: new Date().toISOString(),
      },
    });

    expect(nextSession.currentRunId).toBeUndefined();
    expect(nextSession.messages[1].state).toBe('completed');
  });

  it('should transition to cancelled and clear currentRunId', () => {
    let session = createInitialSession();
    session = agentChatReducer(session, {
      type: 'START_RUN',
      payload: { runId: 'run_1', prompt: 'Prompt' },
    });

    const nextSession = agentChatReducer(session, {
      type: 'RECEIVE_EVENT',
      payload: {
        sequence: 1,
        runId: 'run_1',
        type: 'cancelled',
        payload: null,
        createdAt: new Date().toISOString(),
      },
    });

    expect(nextSession.currentRunId).toBeUndefined();
    expect(nextSession.messages[1].state).toBe('cancelled');
  });

  it('should transition to failed and attach error info', () => {
    let session = createInitialSession();
    session = agentChatReducer(session, {
      type: 'START_RUN',
      payload: { runId: 'run_1', prompt: 'Prompt' },
    });

    const nextSession = agentChatReducer(session, {
      type: 'RECEIVE_EVENT',
      payload: {
        sequence: 1,
        runId: 'run_1',
        type: 'failed',
        payload: {
          category: 'timeout',
          message: 'Request timed out',
          recoveryActions: ['retry'],
        },
        createdAt: new Date().toISOString(),
      },
    });

    expect(nextSession.currentRunId).toBeUndefined();
    const assistantMsg = nextSession.messages[1];
    expect(assistantMsg.state).toBe('failed');
    expect(assistantMsg.error?.category).toBe('timeout');
  });

  it('should initialize the session with SET_SESSION', () => {
    const session = createInitialSession();
    const newSession: AgentChatSession = {
      ...session,
      id: 'session_new',
      messages: [
        {
          id: 'msg_1',
          sessionId: 'session_new',
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
          state: 'completed',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const nextSession = agentChatReducer(session, {
      type: 'SET_SESSION',
      payload: newSession,
    });

    expect(nextSession.id).toBe('session_new');
    expect(nextSession.messages).toHaveLength(1);
    expect(nextSession.messages[0].content[0].text).toBe('Hello');
  });

  it('should handle APPLY_PROPOSAL action', () => {
    const session = createInitialSession();
    session.messages = [
      {
        id: 'msg_assistant',
        sessionId: session.id,
        role: 'assistant',
        proposalId: 'prop_123',
        content: [
          {
            type: 'proposal-summary',
            text: 'Proposed edits',
            data: { id: 'prop_123', state: 'pending-review' },
          },
        ],
        state: 'needs-review',
        createdAt: new Date().toISOString(),
      },
    ];

    const nextSession = agentChatReducer(session, {
      type: 'APPLY_PROPOSAL',
      payload: { proposalId: 'prop_123', state: 'applied' },
    });

    expect(nextSession.messages[0].state).toBe('completed');
    const summaryPart = nextSession.messages[0].content[0];
    expect((summaryPart.data as AgentEditProposal).state).toBe('applied');
  });

  it('should handle REJECT_PROPOSAL action', () => {
    const session = createInitialSession();
    session.messages = [
      {
        id: 'msg_assistant',
        sessionId: session.id,
        role: 'assistant',
        proposalId: 'prop_123',
        content: [
          {
            type: 'proposal-summary',
            text: 'Proposed edits',
            data: { id: 'prop_123', state: 'pending-review' },
          },
        ],
        state: 'needs-review',
        createdAt: new Date().toISOString(),
      },
    ];

    const nextSession = agentChatReducer(session, {
      type: 'REJECT_PROPOSAL',
      payload: { proposalId: 'prop_123' },
    });

    expect(nextSession.messages[0].state).toBe('completed');
    const summaryPart = nextSession.messages[0].content[0];
    expect((summaryPart.data as AgentEditProposal).state).toBe('rejected');
  });

  it('should handle optimistic queued turns on START_RUN (T082)', () => {
    const session = createInitialSession();
    const nextSession = agentChatReducer(session, {
      type: 'START_RUN',
      payload: { runId: 'run_opt', prompt: 'Hello agent' },
    });
    expect(nextSession.messages).toHaveLength(2);
    expect(nextSession.messages[0].role).toBe('user');
    expect(nextSession.messages[0].state).toBe('completed');
    expect(nextSession.messages[1].role).toBe('assistant');
    expect(nextSession.messages[1].state).toBe('queued');
    expect(nextSession.currentRunId).toBe('run_opt');
  });

  it('should handle failed run creation by updating assistant turn to failed and clearing currentRunId (T082)', () => {
    let session = createInitialSession();
    session = agentChatReducer(session, {
      type: 'START_RUN',
      payload: { runId: 'run_fail', prompt: 'Will fail' },
    });
    expect(session.currentRunId).toBe('run_fail');

    const nextSession = agentChatReducer(session, {
      type: 'RECEIVE_EVENT',
      payload: {
        sequence: 1,
        runId: 'run_fail',
        type: 'failed',
        payload: {
          category: 'connection-unavailable',
          message: 'Connection unavailable',
          recoveryActions: ['retry'],
        },
        createdAt: new Date().toISOString(),
      },
    });

    expect(nextSession.currentRunId).toBeUndefined();
    expect(nextSession.messages[1].state).toBe('failed');
    expect(nextSession.messages[1].error?.category).toBe('connection-unavailable');
  });
});
