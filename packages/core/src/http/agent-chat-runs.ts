import type { AgentChatEvent, AgentChatRun, RunState } from '../app/lib/agent-chat-types.ts';

interface RunEntry {
  run: AgentChatRun;
  events: AgentChatEvent[];
  abortController: AbortController;
  listeners: Set<(event: AgentChatEvent) => void>;
}

const activeRuns = new Map<string, RunEntry>();

export function getRun(runId: string): AgentChatRun | undefined {
  return activeRuns.get(runId)?.run;
}

export function getRunEvents(runId: string): AgentChatEvent[] {
  return activeRuns.get(runId)?.events || [];
}

export function registerRun(run: AgentChatRun, abortController: AbortController): void {
  activeRuns.set(run.id, {
    run,
    events: [],
    abortController,
    listeners: new Set(),
  });
}

export function addRunEvent(runId: string, type: AgentChatEvent['type'], payload: unknown): void {
  const entry = activeRuns.get(runId);
  if (!entry) {
    return;
  }

  const event: AgentChatEvent = {
    sequence: entry.events.length + 1,
    runId,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };

  entry.events.push(event);

  // Update run state
  if (
    ['queued', 'loading', 'streaming', 'needs-review', 'completed', 'cancelled', 'failed'].includes(
      type,
    )
  ) {
    entry.run.state = type as RunState;
  }

  // Notify listeners
  for (const listener of entry.listeners) {
    listener(event);
  }

  // Set finished time on terminal events
  if (['completed', 'cancelled', 'failed'].includes(type)) {
    entry.run.finishedAt = event.createdAt;
  }
}

export function subscribeRunEvents(
  runId: string,
  listener: (event: AgentChatEvent) => void,
): (() => void) | undefined {
  const entry = activeRuns.get(runId);
  if (!entry) {
    return undefined;
  }

  entry.listeners.add(listener);

  // Replay existing events for reconnection
  for (const event of entry.events) {
    listener(event);
  }

  return () => {
    entry.listeners.delete(listener);
  };
}

export function abortRun(runId: string): boolean {
  const entry = activeRuns.get(runId);
  if (!entry) {
    return false;
  }

  if (['completed', 'cancelled', 'failed'].includes(entry.run.state)) {
    return false;
  }

  entry.abortController.abort();
  addRunEvent(runId, 'cancelled', null);
  return true;
}
