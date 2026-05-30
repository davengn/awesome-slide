import type { RuntimeEvent, RuntimeEventSource, RuntimeEventType } from './contracts.ts';
import { redactRuntimeEvent } from './redaction.ts';

export type RuntimeEventInput = {
  runId: string;
  type: RuntimeEventType;
  payload?: unknown;
  source?: RuntimeEventSource;
  createdAt?: string;
};

export const TERMINAL_RUNTIME_EVENT_TYPES = new Set<RuntimeEventType>([
  'completed',
  'cancelled',
  'failed',
]);

const RUNNING_EVENT_TYPES = new Set<RuntimeEventType>([
  'started',
  'progress',
  'text_delta',
  'thinking_delta',
  'tool_call',
  'tool_result',
  'diagnostic',
  'error',
  'file_summary',
]);

export function isTerminalRuntimeEventType(type: RuntimeEventType): boolean {
  return TERMINAL_RUNTIME_EVENT_TYPES.has(type);
}

export function runtimeStateForEventType(
  type: RuntimeEventType,
): 'queued' | 'running' | 'needs-review' | 'completed' | 'cancelled' | 'failed' {
  if (type === 'queued') return 'queued';
  if (type === 'proposal') return 'needs-review';
  if (type === 'completed') return 'completed';
  if (type === 'cancelled') return 'cancelled';
  if (type === 'failed') return 'failed';
  if (RUNNING_EVENT_TYPES.has(type)) return 'running';
  return 'running';
}

export function normalizeRuntimeEvent(input: RuntimeEventInput, sequence: number): RuntimeEvent {
  return redactRuntimeEvent({
    sequence,
    runId: input.runId,
    type: input.type,
    payload: input.payload ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
    source: input.source ?? 'runtime',
  });
}

export function createRuntimeEventSequencer(
  initialSequence = 0,
): (input: RuntimeEventInput) => RuntimeEvent {
  let sequence = initialSequence;
  return (input) => {
    sequence += 1;
    return normalizeRuntimeEvent(input, sequence);
  };
}

export function eventsAfter(events: RuntimeEvent[], afterSequence: number): RuntimeEvent[] {
  return events.filter((event) => event.sequence > afterSequence);
}

export function parseReplayCursor(input: {
  after?: string | null;
  lastEventId?: string | null;
}): number {
  const raw = input.after?.trim() || input.lastEventId?.trim() || '';
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function serializeSseEvent(event: RuntimeEvent): string {
  return `id: ${event.sequence}\nevent: message\ndata: ${JSON.stringify(redactRuntimeEvent(event))}\n\n`;
}
