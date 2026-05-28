import { createAgentChatError } from './agent-chat-errors.ts';
import type { AgentChatMessage, AgentChatSession } from './agent-chat-types.ts';

const ACTIVE_MESSAGE_STATES = new Set<AgentChatMessage['state']>([
  'queued',
  'loading',
  'streaming',
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
  if (!session.currentRunId) {
    return session;
  }

  let recovered = false;
  const messages = session.messages.map((message) => {
    if (
      message.runId === session.currentRunId &&
      message.role === 'assistant' &&
      ACTIVE_MESSAGE_STATES.has(message.state)
    ) {
      recovered = true;
      return {
        ...message,
        state: 'failed' as const,
        completedAt: new Date().toISOString(),
        error: createAgentChatError(
          'timeout',
          'The previous agent run was interrupted before it completed.',
        ),
      };
    }
    return message;
  });

  if (!recovered) {
    return session;
  }

  return {
    ...session,
    currentRunId: undefined,
    messages,
    updatedAt: new Date().toISOString(),
  };
}
