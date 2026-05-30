import type { RuntimeError, RuntimeEventType } from './contracts.ts';
import { redactText } from './redaction.ts';

export interface LocalAgentParsedEvent {
  type: RuntimeEventType;
  payload: unknown;
  source: 'local-agent';
}

export interface LocalAgentExitResult {
  exitCode: number | null;
  stdoutText: string;
  stderrText: string;
  aborted?: boolean;
}

const JSON_EVENT_TYPES = new Set([
  'progress',
  'text_delta',
  'thinking_delta',
  'tool_call',
  'tool_result',
  'proposal',
  'file_summary',
  'diagnostic',
  'error',
  'completed',
  'cancelled',
  'failed',
  'token',
  'text',
]);

function parserError(message: string, diagnostics?: string): RuntimeError {
  return {
    category: 'parser-error',
    message,
    diagnostics: diagnostics ? redactText(diagnostics) : undefined,
    recoveryActions: ['retry', 'copy-diagnostics'],
  };
}

function failureError(category: RuntimeError['category'], message: string, diagnostics?: string) {
  return {
    category,
    message,
    diagnostics: diagnostics ? redactText(diagnostics) : undefined,
    recoveryActions: ['retry', 'change-connection', 'copy-diagnostics'],
  } satisfies RuntimeError;
}

function normalizeJsonFrame(frame: Record<string, unknown>): LocalAgentParsedEvent | null {
  const rawType = typeof frame.type === 'string' ? frame.type : undefined;
  if (!rawType || !JSON_EVENT_TYPES.has(rawType)) {
    return null;
  }

  const payload = frame.payload ?? frame.text ?? frame.message ?? null;
  if (rawType === 'token' || rawType === 'text') {
    return {
      type: 'text_delta',
      payload: { text: typeof payload === 'string' ? payload : JSON.stringify(payload) },
      source: 'local-agent',
    };
  }
  if (rawType === 'failed') {
    return {
      type: 'failed',
      payload:
        payload && typeof payload === 'object'
          ? payload
          : failureError('unknown', 'Local agent reported a failure.', String(payload ?? '')),
      source: 'local-agent',
    };
  }
  return {
    type: rawType as RuntimeEventType,
    payload,
    source: 'local-agent',
  };
}

export function parseLocalAgentStdoutChunk(chunk: string): LocalAgentParsedEvent[] {
  if (!chunk) {
    return [];
  }
  const events: LocalAgentParsedEvent[] = [];
  const lines = chunk.split(/\r?\n/);

  for (const line of lines) {
    if (!line) {
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        const event = normalizeJsonFrame(parsed);
        if (event) {
          events.push(event);
          continue;
        }
      } catch {
        events.push({
          type: 'error',
          payload: parserError('Malformed local agent JSON frame.', trimmed),
          source: 'local-agent',
        });
        continue;
      }
    }
    events.push({
      type: 'text_delta',
      payload: { text: line },
      source: 'local-agent',
    });
  }

  return events;
}

export function normalizeLocalAgentExit(result: LocalAgentExitResult): LocalAgentParsedEvent[] {
  const events: LocalAgentParsedEvent[] = [];
  const stderrText = result.stderrText.trim();

  if (stderrText) {
    events.push({
      type: 'diagnostic',
      payload: redactText(stderrText),
      source: 'local-agent',
    });
  }

  if (result.aborted) {
    events.push({ type: 'cancelled', payload: null, source: 'local-agent' });
    return events;
  }

  if (result.exitCode !== 0) {
    events.push({
      type: 'failed',
      payload: failureError(
        'incompatible-protocol',
        `Local agent exited with code ${result.exitCode}.`,
        result.stdoutText || result.stderrText,
      ),
      source: 'local-agent',
    });
    return events;
  }

  if (!result.stdoutText.trim()) {
    events.push({
      type: 'failed',
      payload: failureError('model-empty-output', 'Local agent returned empty output.'),
      source: 'local-agent',
    });
    return events;
  }

  events.push({ type: 'completed', payload: null, source: 'local-agent' });
  return events;
}
