import type {
  PromptPackage,
  RuntimeConnectionSnapshot,
  RuntimeEditProposal,
  RuntimeError,
  RuntimeEvent,
  RuntimeRun,
  RuntimeRunState,
} from './contracts.ts';
import {
  createRuntimeEventSequencer,
  eventsAfter,
  isTerminalRuntimeEventType,
  type RuntimeEventInput,
  runtimeStateForEventType,
} from './events.ts';
import type { AgentRuntimeStorage } from './storage.ts';

export interface CreateRuntimeRunInput {
  conversationId: string;
  prompt: string;
  promptPackage: PromptPackage;
  connectionSnapshot: RuntimeConnectionSnapshot;
  actionId?: string;
  retryOfRunId?: string;
  abortController?: AbortController;
  watchdogTimeoutMs?: number;
}

export interface RuntimeRunSummary {
  runId: string;
  conversationId: string;
  state: RuntimeRunState;
  lastSequence: number;
  startedAt: string;
  finishedAt?: string;
  connection: Pick<RuntimeConnectionSnapshot, 'displayName' | 'type' | 'provider' | 'modelId'>;
}

export type RuntimeRunCreateResult =
  | { ok: true; run: RuntimeRun; queuedEvent: RuntimeEvent }
  | { ok: false; status: number; error: RuntimeError; activeRun: RuntimeRun };

export interface RuntimeRunService {
  createRun: (input: CreateRuntimeRunInput) => RuntimeRunCreateResult;
  registerRun: (
    run: RuntimeRun,
    abortController?: AbortController,
    opts?: { watchdogTimeoutMs?: number },
  ) => void;
  getRun: (runId: string) => RuntimeRun | undefined;
  listRunEvents: (runId: string, afterSequence?: number) => RuntimeEvent[];
  listRuns: (conversationId?: string) => RuntimeRunSummary[];
  getActiveRun: (conversationId: string) => RuntimeRun | undefined;
  emitEvent: (input: RuntimeEventInput) => RuntimeEvent | undefined;
  subscribe: (
    runId: string,
    listener: (event: RuntimeEvent) => void,
    opts?: { afterSequence?: number },
  ) => (() => void) | undefined;
  cancelRun: (runId: string) => RuntimeEvent | undefined;
  failIfNonTerminal: (runId: string, error: RuntimeError) => RuntimeEvent | undefined;
  findProposal: (proposalId: string) => RuntimeEditProposal | undefined;
  startWatchdog: (runId: string, timeoutMs?: number) => void;
  clear: () => void;
}

interface RuntimeRunEntry {
  run: RuntimeRun;
  events: RuntimeEvent[];
  abortController: AbortController;
  listeners: Set<(event: RuntimeEvent) => void>;
  sequencer: (input: RuntimeEventInput) => RuntimeEvent;
  watchdogTimer?: ReturnType<typeof setTimeout>;
  watchdogTimeoutMs: number;
}

export const DEFAULT_RUNTIME_RUN_WATCHDOG_TIMEOUT_MS = 300000;

const TERMINAL_STATES = new Set<RuntimeRunState>(['completed', 'cancelled', 'failed']);

function runtimeRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function activeRunError(activeRun: RuntimeRun): RuntimeRunCreateResult {
  return {
    ok: false,
    status: 409,
    activeRun,
    error: {
      category: 'unknown',
      message: 'A run is already active for this conversation.',
      recoveryActions: ['retry'],
    },
  };
}

function cancellationError(): RuntimeError {
  return {
    category: 'cancelled',
    message: 'Run cancelled.',
    recoveryActions: ['retry', 'edit-prompt'],
  };
}

function watchdogError(): RuntimeError {
  return {
    category: 'timeout',
    message: 'Run timed out.',
    recoveryActions: ['retry', 'copy-diagnostics'],
  };
}

function toSummary(run: RuntimeRun): RuntimeRunSummary {
  return {
    runId: run.runId,
    conversationId: run.conversationId,
    state: run.state,
    lastSequence: run.eventCursor,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    connection: {
      displayName: run.connectionSnapshot.displayName,
      type: run.connectionSnapshot.type,
      provider: run.connectionSnapshot.provider,
      modelId: run.connectionSnapshot.modelId,
    },
  };
}

function isTerminalRun(run: RuntimeRun): boolean {
  return TERMINAL_STATES.has(run.state);
}

export function createRuntimeRunService(
  opts: {
    storage?: AgentRuntimeStorage;
    now?: () => string;
    runId?: () => string;
    watchdogTimeoutMs?: number;
  } = {},
): RuntimeRunService {
  const entries = new Map<string, RuntimeRunEntry>();
  const now = opts.now ?? (() => new Date().toISOString());
  const nextRunId = opts.runId ?? runtimeRunId;
  const defaultWatchdogTimeoutMs =
    opts.watchdogTimeoutMs ?? DEFAULT_RUNTIME_RUN_WATCHDOG_TIMEOUT_MS;

  function persistRun(run: RuntimeRun): void {
    void opts.storage?.writeRun(run);
  }

  function persistEvent(runId: string, event: RuntimeEvent): void {
    void opts.storage?.appendRunEvent(runId, event);
  }

  function startWatchdog(runId: string, timeoutMs?: number): void {
    const entry = entries.get(runId);
    if (!entry || isTerminalRun(entry.run)) {
      return;
    }
    if (entry.watchdogTimer) {
      clearTimeout(entry.watchdogTimer);
    }
    entry.watchdogTimer = setTimeout(() => {
      const current = entries.get(runId);
      if (!current || isTerminalRun(current.run)) {
        return;
      }
      current.abortController.abort();
      emitEvent({
        runId,
        type: 'failed',
        payload: watchdogError(),
        source: 'runtime',
      });
    }, timeoutMs ?? entry.watchdogTimeoutMs);
  }

  function registerRun(
    run: RuntimeRun,
    abortController: AbortController = new AbortController(),
    options: { watchdogTimeoutMs?: number } = {},
  ): void {
    const existingEvents = entries.get(run.runId)?.events ?? [];
    entries.set(run.runId, {
      run,
      events: existingEvents,
      abortController,
      listeners: new Set(),
      sequencer: createRuntimeEventSequencer(run.eventCursor),
      watchdogTimeoutMs: options.watchdogTimeoutMs ?? defaultWatchdogTimeoutMs,
    });
    persistRun(run);
    if (!isTerminalRun(run)) {
      startWatchdog(run.runId);
    }
  }

  function createRun(input: CreateRuntimeRunInput): RuntimeRunCreateResult {
    const activeRun = getActiveRun(input.conversationId);
    if (activeRun) {
      return activeRunError(activeRun);
    }

    const run: RuntimeRun = {
      runId: nextRunId(),
      conversationId: input.conversationId,
      prompt: input.prompt,
      actionId: input.actionId,
      promptPackageId: input.promptPackage.promptPackageId,
      connectionSnapshot: input.connectionSnapshot,
      contextSnapshotId: input.promptPackage.context.contextSnapshotId,
      state: 'queued',
      eventCursor: 0,
      startedAt: now(),
      retryOfRunId: input.retryOfRunId,
      proposalIds: [],
    };
    registerRun(run, input.abortController, {
      watchdogTimeoutMs: input.watchdogTimeoutMs,
    });
    const queuedEvent = emitEvent({
      runId: run.runId,
      type: 'queued',
      payload: null,
      source: 'runtime',
      createdAt: run.startedAt,
    });

    return { ok: true, run, queuedEvent: queuedEvent as RuntimeEvent };
  }

  function emitEvent(input: RuntimeEventInput): RuntimeEvent | undefined {
    const entry = entries.get(input.runId);
    if (!entry) {
      return undefined;
    }
    if (isTerminalRun(entry.run)) {
      return undefined;
    }

    const event = entry.sequencer(input);
    entry.events.push(event);
    entry.run.eventCursor = event.sequence;
    entry.run.state = runtimeStateForEventType(event.type);

    if (event.type === 'proposal') {
      const proposal = event.payload as Partial<RuntimeEditProposal>;
      const proposalId = proposal.proposalId ?? (proposal as { id?: string }).id;
      if (proposalId && !entry.run.proposalIds.includes(proposalId)) {
        entry.run.proposalIds.push(proposalId);
      }
    }

    if (isTerminalRuntimeEventType(event.type)) {
      entry.run.finishedAt = event.createdAt;
      entry.run.terminalReason =
        event.type === 'failed'
          ? ((event.payload as RuntimeError | undefined)?.category ?? 'unknown')
          : event.type === 'completed'
            ? 'completed'
            : 'cancelled';
      if (entry.watchdogTimer) {
        clearTimeout(entry.watchdogTimer);
        entry.watchdogTimer = undefined;
      }
    } else {
      startWatchdog(input.runId);
    }

    persistEvent(input.runId, event);
    persistRun(entry.run);

    for (const listener of entry.listeners) {
      listener(event);
    }

    if (isTerminalRuntimeEventType(event.type)) {
      setTimeout(() => {
        entry.listeners.clear();
      }, 100);
    }

    return event;
  }

  function getRun(runId: string): RuntimeRun | undefined {
    return entries.get(runId)?.run;
  }

  function listRunEvents(runId: string, afterSequence = 0): RuntimeEvent[] {
    return eventsAfter(entries.get(runId)?.events ?? [], afterSequence);
  }

  function listRuns(conversationId?: string): RuntimeRunSummary[] {
    return [...entries.values()]
      .map((entry) => entry.run)
      .filter((run) => !conversationId || run.conversationId === conversationId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .map(toSummary);
  }

  function getActiveRun(conversationId: string): RuntimeRun | undefined {
    return [...entries.values()]
      .map((entry) => entry.run)
      .find((run) => run.conversationId === conversationId && !isTerminalRun(run));
  }

  function subscribe(
    runId: string,
    listener: (event: RuntimeEvent) => void,
    options: { afterSequence?: number } = {},
  ): (() => void) | undefined {
    const entry = entries.get(runId);
    if (!entry) {
      return undefined;
    }
    for (const event of listRunEvents(runId, options.afterSequence ?? 0)) {
      listener(event);
    }
    if (isTerminalRun(entry.run)) {
      return () => {};
    }
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
    };
  }

  function cancelRun(runId: string): RuntimeEvent | undefined {
    const entry = entries.get(runId);
    if (!entry) {
      return undefined;
    }
    if (isTerminalRun(entry.run)) {
      return entry.events.find((event) => event.type === 'cancelled');
    }
    entry.abortController.abort();
    return emitEvent({
      runId,
      type: 'cancelled',
      payload: cancellationError(),
      source: 'runtime',
    });
  }

  function failIfNonTerminal(runId: string, error: RuntimeError): RuntimeEvent | undefined {
    const entry = entries.get(runId);
    if (!entry || isTerminalRun(entry.run)) {
      return undefined;
    }
    return emitEvent({
      runId,
      type: 'failed',
      payload: error,
      source: 'runtime',
    });
  }

  function findProposal(proposalId: string): RuntimeEditProposal | undefined {
    for (const entry of entries.values()) {
      for (const event of entry.events) {
        if (event.type !== 'proposal' || !event.payload || typeof event.payload !== 'object') {
          continue;
        }
        const proposal = event.payload as RuntimeEditProposal & { id?: string };
        if (proposal.proposalId === proposalId || proposal.id === proposalId) {
          return proposal;
        }
      }
    }
    return undefined;
  }

  function clear(): void {
    for (const entry of entries.values()) {
      if (entry.watchdogTimer) {
        clearTimeout(entry.watchdogTimer);
      }
      entry.listeners.clear();
    }
    entries.clear();
  }

  return {
    createRun,
    registerRun,
    getRun,
    listRunEvents,
    listRuns,
    getActiveRun,
    emitEvent,
    subscribe,
    cancelRun,
    failIfNonTerminal,
    findProposal,
    startWatchdog,
    clear,
  };
}
