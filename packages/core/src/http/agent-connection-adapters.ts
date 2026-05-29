import type { ConnectionCapabilities } from '../app/lib/agent-connection-types.ts';
import { createConnectionStatus, normalizeCapabilities } from '../app/lib/agent-connections.ts';
import { redactDiagnostics } from './agent-secrets.ts';

export type AgentConnectionEventType =
  | 'progress'
  | 'token'
  | 'tool-call'
  | 'structured-output'
  | 'diagnostic'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface AgentConnectionEvent {
  sequence: number;
  type: AgentConnectionEventType;
  payload: unknown;
  createdAt: string;
}

export interface StartAgentConnectionRunRequest {
  runId: string;
  prompt: string;
  context: unknown;
  workflows: Array<{
    id: string;
    contentHash: string;
    instructions: string;
  }>;
  connectionId: string;
  modelId?: string;
  reasoningEffort?: string;
  capabilities: ConnectionCapabilities;
  signal: AbortSignal;
}

export type RawAgentConnectionEvent = Omit<AgentConnectionEvent, 'sequence' | 'createdAt'> &
  Partial<Pick<AgentConnectionEvent, 'sequence' | 'createdAt'>>;

export type AgentConnectionRunner = (
  request: StartAgentConnectionRunRequest,
) => AsyncIterable<RawAgentConnectionEvent>;

export function createAdapterCapabilities(
  capabilities: Partial<ConnectionCapabilities> = {},
): ConnectionCapabilities {
  return normalizeCapabilities(capabilities);
}

function terminalEvent(type: AgentConnectionEventType): boolean {
  return type === 'completed' || type === 'cancelled' || type === 'failed';
}

function normalizePayload(type: AgentConnectionEventType, payload: unknown): unknown {
  if (type !== 'diagnostic' && type !== 'failed') return payload;
  if (typeof payload === 'string') return redactDiagnostics(payload);
  if (payload && typeof payload === 'object') {
    return JSON.parse(redactDiagnostics(JSON.stringify(payload))) as unknown;
  }
  return payload;
}

export async function* normalizeAgentConnectionEvents(
  events: AsyncIterable<RawAgentConnectionEvent>,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): AsyncIterable<AgentConnectionEvent> {
  let sequence = 0;
  const startedAt = Date.now();

  try {
    for await (const event of events) {
      if (opts.signal?.aborted) {
        yield {
          sequence: ++sequence,
          type: 'cancelled',
          payload: null,
          createdAt: new Date().toISOString(),
        };
        return;
      }
      if (opts.timeoutMs && Date.now() - startedAt > opts.timeoutMs) {
        yield {
          sequence: ++sequence,
          type: 'failed',
          payload: createConnectionStatus('failed', {
            category: 'timeout',
            message: 'Agent connection timed out.',
          }),
          createdAt: new Date().toISOString(),
        };
        return;
      }
      const nextEvent: AgentConnectionEvent = {
        sequence: ++sequence,
        type: event.type,
        payload: normalizePayload(event.type, event.payload),
        createdAt: event.createdAt ?? new Date().toISOString(),
      };
      yield nextEvent;
      if (terminalEvent(event.type)) return;
    }
    yield {
      sequence: ++sequence,
      type: 'completed',
      payload: null,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    yield {
      sequence: ++sequence,
      type: 'failed',
      payload: createConnectionStatus('failed', {
        category: 'unknown',
        message: 'Agent connection failed.',
        diagnostics: redactDiagnostics(raw),
      }),
      createdAt: new Date().toISOString(),
    };
  }
}

export async function* runAgentConnectionAdapter(
  runner: AgentConnectionRunner,
  request: StartAgentConnectionRunRequest,
  opts: { timeoutMs?: number } = {},
): AsyncIterable<AgentConnectionEvent> {
  if (request.signal.aborted) {
    yield {
      sequence: 1,
      type: 'cancelled',
      payload: null,
      createdAt: new Date().toISOString(),
    };
    return;
  }
  yield* normalizeAgentConnectionEvents(runner(request), {
    signal: request.signal,
    timeoutMs: opts.timeoutMs,
  });
}
