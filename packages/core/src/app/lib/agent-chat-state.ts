import type {
  AgentChatError,
  AgentChatEvent,
  AgentChatMessage,
  AgentChatSession,
  AgentEditProposal,
  ContextPreference,
} from './agent-chat-types.ts';

export type AgentChatAction =
  | { type: 'SET_SESSION'; payload: AgentChatSession }
  | { type: 'START_RUN'; payload: { runId: string; prompt: string } }
  | { type: 'RECEIVE_EVENT'; payload: AgentChatEvent }
  | { type: 'SET_CONTEXT_PREFERENCE'; payload: ContextPreference[] }
  | {
      type: 'APPLY_PROPOSAL';
      payload: { proposalId: string; state: 'applied' | 'partially-applied' };
    }
  | { type: 'REJECT_PROPOSAL'; payload: { proposalId: string } }
  | { type: 'CLEAR_HISTORY' };

export function agentChatReducer(
  state: AgentChatSession,
  action: AgentChatAction,
): AgentChatSession {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'SET_SESSION':
      return action.payload;

    case 'START_RUN': {
      const { runId, prompt } = action.payload;

      // Limit message count to 50 or size to 256KB on session level (will be handled by storage but let's be clean here too)
      const userMessage: AgentChatMessage = {
        id: `msg_u_${runId}_${Date.now()}`,
        sessionId: state.id,
        role: 'user',
        content: [{ type: 'text', text: prompt }],
        runId,
        state: 'completed',
        createdAt: now,
      };

      const assistantMessage: AgentChatMessage = {
        id: `msg_a_${runId}_${Date.now()}`,
        sessionId: state.id,
        role: 'assistant',
        content: [],
        runId,
        state: 'queued',
        createdAt: now,
      };

      return {
        ...state,
        currentRunId: runId,
        messages: [...state.messages, userMessage, assistantMessage],
        updatedAt: now,
      };
    }

    case 'RECEIVE_EVENT': {
      const event = action.payload;
      const { runId, type, payload } = event;
      const lastSequence = state.eventCursors?.[runId] ?? 0;
      if (event.sequence <= lastSequence) {
        return state;
      }

      const messageIndex = state.messages.findIndex(
        (m) => m.runId === runId && m.role === 'assistant',
      );

      if (messageIndex === -1) {
        return state;
      }

      const messages = [...state.messages];
      const message = { ...messages[messageIndex] };

      switch (type) {
        case 'queued':
          message.state = 'queued';
          break;
        case 'started':
        case 'progress':
          message.state = 'loading';
          if (payload && typeof payload === 'string') {
            message.content = [{ type: 'progress', text: payload }];
          }
          break;
        case 'text_delta':
        case 'token':
          message.state = 'streaming';
          if (payload) {
            const text =
              typeof payload === 'string' ? payload : (payload as { text?: string }).text;
            if (!text) {
              break;
            }
            const filteredContent = message.content.filter((p) => p.type !== 'progress');
            const textPartIndex = filteredContent.findIndex((p) => p.type === 'text');
            if (textPartIndex === -1) {
              message.content = [...filteredContent, { type: 'text', text }];
            } else {
              const content = [...filteredContent];
              content[textPartIndex] = {
                ...content[textPartIndex],
                text: (content[textPartIndex].text || '') + text,
              };
              message.content = content;
            }
          }
          break;
        case 'proposal':
          if (['completed', 'cancelled', 'failed'].includes(message.state)) {
            break;
          }
          message.state = 'needs-review';
          if (payload && typeof payload === 'object') {
            const prop = payload as { id: string; summary: string };
            message.proposalId = prop.id;
            message.content = [
              ...message.content.filter((p) => p.type !== 'progress'),
              { type: 'proposal-summary', text: prop.summary, data: prop },
            ];
          }
          break;
        case 'file_summary':
          message.content = [
            ...message.content.filter((p) => p.type !== 'progress'),
            { type: 'file-summary', text: 'Generated files', data: payload },
          ];
          break;
        case 'diagnostic':
        case 'error':
          message.content = [
            ...message.content.filter((p) => p.type !== 'progress'),
            {
              type: 'diagnostic',
              text: typeof payload === 'string' ? payload : undefined,
              data: payload,
            },
          ];
          break;
        case 'completed':
          message.state = 'completed';
          message.completedAt = now;
          message.content = message.content.filter((p) => p.type !== 'progress');
          break;
        case 'cancelled':
          message.state = 'cancelled';
          message.completedAt = now;
          message.content = message.content.filter((p) => p.type !== 'progress');
          break;
        case 'failed':
          message.state = 'failed';
          message.completedAt = now;
          message.error = payload as AgentChatError;
          message.content = message.content.filter((p) => p.type !== 'progress');
          break;
      }

      messages[messageIndex] = message;

      // Clear currentRunId if run is in a terminal state
      const isTerminal = ['completed', 'cancelled', 'failed'].includes(message.state);
      const currentRunId =
        isTerminal && state.currentRunId === runId ? undefined : state.currentRunId;

      return {
        ...state,
        currentRunId,
        eventCursors: {
          ...state.eventCursors,
          [runId]: event.sequence,
        },
        messages,
        updatedAt: now,
      };
    }

    case 'APPLY_PROPOSAL': {
      const { proposalId, state: nextState } = action.payload;
      let appliedRunId: string | undefined;
      const messages = state.messages.map((msg) => {
        if (msg.proposalId === proposalId) {
          appliedRunId = msg.runId;
          const content = msg.content.map((part) => {
            if (part.type === 'proposal-summary' && part.data) {
              const prop = part.data as AgentEditProposal;
              return {
                ...part,
                data: { ...prop, state: nextState },
              };
            }
            return part;
          });
          return {
            ...msg,
            state: 'completed' as const,
            content,
          };
        }
        return msg;
      });
      return {
        ...state,
        currentRunId:
          appliedRunId && state.currentRunId === appliedRunId ? undefined : state.currentRunId,
        messages,
        updatedAt: now,
      };
    }

    case 'REJECT_PROPOSAL': {
      const { proposalId } = action.payload;
      let rejectedRunId: string | undefined;
      const messages = state.messages.map((msg) => {
        if (msg.proposalId === proposalId) {
          rejectedRunId = msg.runId;
          const content = msg.content.map((part) => {
            if (part.type === 'proposal-summary' && part.data) {
              const prop = part.data as AgentEditProposal;
              return {
                ...part,
                data: { ...prop, state: 'rejected' as const },
              };
            }
            return part;
          });
          return {
            ...msg,
            state: 'completed' as const,
            content,
          };
        }
        return msg;
      });
      return {
        ...state,
        currentRunId:
          rejectedRunId && state.currentRunId === rejectedRunId ? undefined : state.currentRunId,
        messages,
        updatedAt: now,
      };
    }

    case 'SET_CONTEXT_PREFERENCE':
      return {
        ...state,
        contextPreferences: action.payload,
        updatedAt: now,
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        messages: [],
        currentRunId: undefined,
        updatedAt: now,
      };

    default:
      return state;
  }
}

export function isTerminalRunState(state: string): boolean {
  return ['completed', 'cancelled', 'failed'].includes(state);
}
