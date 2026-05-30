import { createAgentChatError } from '../app/lib/agent-chat-errors.ts';
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
  lastHeartbeatAt?: string;
  watchdogTimer?: NodeJS.Timeout;
  watchdogTimeoutMs: number;
}

export const DEFAULT_RUN_WATCHDOG_TIMEOUT_MS = 300000;
export const LOCAL_AGENT_RUN_WATCHDOG_TIMEOUT_MS = 30 * 60 * 1000;

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

export function startRunWatchdog(runId: string, timeoutMs?: number): void {
  const entry = activeRuns.get(runId);
  if (!entry) return;

  if (entry.watchdogTimer) {
    clearTimeout(entry.watchdogTimer);
  }

  entry.watchdogTimer = setTimeout(() => {
    const currentEntry = activeRuns.get(runId);
    if (!currentEntry) return;
    if (['completed', 'cancelled', 'failed'].includes(currentEntry.run.state)) return;

    const errorPayload = createAgentChatError('timeout', 'Run timed out (watchdog).');
    addRunEvent(runId, 'failed', errorPayload);
    currentEntry.abortController.abort();
  }, timeoutMs ?? entry.watchdogTimeoutMs);
}

export function registerRun(
  run: AgentChatRun,
  abortController: AbortController,
  opts: { watchdogTimeoutMs?: number } = {},
): void {
  activeRuns.set(run.id, {
    run,
    events: [],
    abortController,
    listeners: new Set(),
    watchdogTimeoutMs: opts.watchdogTimeoutMs ?? DEFAULT_RUN_WATCHDOG_TIMEOUT_MS,
  });
  startRunWatchdog(run.id);
}

export function addRunEvent(runId: string, type: AgentChatEvent['type'], payload: unknown): void {
  const entry = activeRuns.get(runId);
  if (!entry) {
    return;
  }

  entry.lastHeartbeatAt = new Date().toISOString();

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

  const isTerminal = ['completed', 'cancelled', 'failed'].includes(type);

  // Set finished time on terminal events
  if (isTerminal) {
    entry.run.finishedAt = event.createdAt;
    if (entry.watchdogTimer) {
      clearTimeout(entry.watchdogTimer);
      entry.watchdogTimer = undefined;
    }
    // Clean up listeners after a short delay to allow delivery
    setTimeout(() => {
      entry.listeners.clear();
    }, 100);
  } else {
    startRunWatchdog(runId);
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

  if (entry.watchdogTimer) {
    clearTimeout(entry.watchdogTimer);
    entry.watchdogTimer = undefined;
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
