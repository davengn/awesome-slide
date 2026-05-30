import os from 'node:os';
import type { RuntimeEvent } from './contracts.ts';

const SECRET_KEY_PATTERN =
  /(?:api[-_]?key|token|auth|authorization|password|secret|credential|bearer|\bkey\b)/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function redactHomePaths(value: string): string {
  let redacted = value;
  const home = os.homedir();
  if (home) {
    redacted = redacted.replace(new RegExp(escapeRegExp(home), 'g'), '<home>');
  }
  redacted = redacted.replace(/\/Users\/[A-Za-z0-9_.-]+/g, '/Users/<user>');
  redacted = redacted.replace(/\/home\/[A-Za-z0-9_.-]+/g, '/home/<user>');
  redacted = redacted.replace(/C:\\Users\\[A-Za-z0-9_.-]+/gi, 'C:\\Users\\<user>');
  return redacted;
}

function redactHiddenPathSegments(value: string): string {
  return value.replace(/(^|[\\/\s=:"'])\.[^\\/\s:=,"']+/g, '$1<hidden>');
}

function redactSecretText(value: string): string {
  let redacted = value;
  redacted = redacted.replace(/\bBearer\s+[A-Za-z0-9_\-./~+*=]{8,}/gi, 'Bearer <redacted>');
  redacted = redacted.replace(/\bsk-[A-Za-z0-9_-]{8,}/g, '<redacted-key>');
  redacted = redacted.replace(
    /(?:["']?(api[-_]?key|token|auth|authorization|password|secret|credential|key)["']?)\s*[:=]\s*["']?[^"'\s,}]{8,}["']?/gi,
    '$1=<redacted>',
  );
  redacted = redacted.replace(
    /\b[A-Z][A-Z0-9_]{2,}\s*=\s*["']?[^"'\s,}]{8,}["']?/g,
    '<env>=<redacted>',
  );
  return redacted;
}

export function redactText(value: string): string {
  return redactSecretText(redactHiddenPathSegments(redactHomePaths(value)));
}

export function redactJsonValue<T>(value: T): T {
  if (typeof value === 'string') {
    return redactText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactJsonValue(entry)) as T;
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (SECRET_KEY_PATTERN.test(key)) {
        return [key, '<redacted>'];
      }
      return [key, redactJsonValue(entry)];
    }),
  ) as T;
}

export function redactDiagnostics(input: unknown): unknown {
  return redactJsonValue(input);
}

export function redactRuntimeEvent(event: RuntimeEvent): RuntimeEvent {
  return {
    ...event,
    payload: redactJsonValue(event.payload),
  };
}
