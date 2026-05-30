import type { AgentChatMessage, AgentChatSession } from './agent-chat-types.ts';

const ACTIVE_MESSAGE_STATES = new Set<AgentChatMessage['state']>([
  'queued',
  'loading',
  'streaming',
]);

const RECOVERED_RUN_ERROR_MESSAGES = new Set([
  'The previous agent run was interrupted before it completed.',
  'The agent response stream disconnected before it completed.',
]);

export function capSession(session: AgentChatSession): AgentChatSession {
  let messages = [...session.messages];

  // Cap to 50 most recent messages first
  if (messages.length > 50) {
    messages = messages.slice(messages.length - 50);
  }

  let cappedSession = { ...session, messages };
  let serialized = JSON.stringify(cappedSession);
  const maxBytes = 256 * 1024; // 256KB

  // Progressively drop oldest messages until within size budget
  while (serialized.length > maxBytes && messages.length > 1) {
    messages = messages.slice(1);
    cappedSession = { ...cappedSession, messages };
    serialized = JSON.stringify(cappedSession);
  }

  return cappedSession;
}

const STORAGE_PREFIX = 'awesome-slide:agent-chat:session:';

export function saveSession(session: AgentChatSession, storage?: Storage): void {
  const activeStorage =
    storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!activeStorage) {
    return;
  }
  const capped = capSession(session);
  const key = `${STORAGE_PREFIX}${capped.projectKey}:${capped.id}`;
  activeStorage.setItem(key, JSON.stringify(capped));
}

export function loadSession(
  id: string,
  projectKey: string,
  storage?: Storage,
): AgentChatSession | null {
  const activeStorage =
    storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!activeStorage) {
    return null;
  }
  const key = `${STORAGE_PREFIX}${projectKey}:${id}`;
  const data = activeStorage.getItem(key);
  if (!data) {
    return null;
  }
  try {
    return recoverInterruptedRun(JSON.parse(data) as AgentChatSession);
  } catch {
    return null;
  }
}

export function recoverInterruptedRun(session: AgentChatSession): AgentChatSession {
  let recovered = false;
  const messagesWithoutRecoveredErrors = session.messages.filter((message) => {
    const isRecoveredError =
      message.role === 'assistant' &&
      message.state === 'failed' &&
      message.error?.message &&
      RECOVERED_RUN_ERROR_MESSAGES.has(message.error.message);

    if (isRecoveredError) {
      recovered = true;
      return false;
    }
    return true;
  });

  if (!session.currentRunId) {
    return recovered
      ? {
          ...session,
          messages: messagesWithoutRecoveredErrors,
          updatedAt: new Date().toISOString(),
        }
      : session;
  }

  const messages = messagesWithoutRecoveredErrors.flatMap((message) => {
    if (
      message.runId === session.currentRunId &&
      message.role === 'assistant' &&
      ACTIVE_MESSAGE_STATES.has(message.state)
    ) {
      recovered = true;
      const content = message.content.filter((part) => part.type !== 'progress');
      if (content.length === 0) {
        return [];
      }
      return {
        ...message,
        state: 'cancelled' as const,
        content,
        completedAt: new Date().toISOString(),
      };
    }
    return [message];
  });

  if (!recovered) {
    return {
      ...session,
      currentRunId: undefined,
      messages,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...session,
    currentRunId: undefined,
    messages,
    updatedAt: new Date().toISOString(),
  };
}
