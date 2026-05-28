import type {
  AgentChatEvent,
  AgentChatRun,
  AgentEditProposal,
  RunState,
} from '../app/lib/agent-chat-types.ts';

interface RunEntry {
  run: AgentChatRun;
  events: AgentChatEvent[];
  abortController: AbortController;
  listeners: Set<(event: AgentChatEvent) => void>;
}

const activeRuns = new Map<string, RunEntry>();
const EVENT_STATE_MAP: Partial<Record<AgentChatEvent['type'], RunState>> = {
  queued: 'queued',
  progress: 'loading',
  token: 'streaming',
  proposal: 'needs-review',
  completed: 'completed',
  cancelled: 'cancelled',
  failed: 'failed',
};

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

  const nextState = EVENT_STATE_MAP[type];
  if (nextState) {
    entry.run.state = nextState;
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

export function findProposal(proposalId: string): AgentEditProposal | undefined {
  for (const entry of activeRuns.values()) {
    const proposalEvent = entry.events.find(
      (e) => e.type === 'proposal' && (e.payload as AgentEditProposal)?.id === proposalId,
    );
    if (proposalEvent) {
      return proposalEvent.payload as AgentEditProposal;
    }
  }
  return undefined;
}
