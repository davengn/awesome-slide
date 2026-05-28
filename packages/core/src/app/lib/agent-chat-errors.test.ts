import { describe, expect, it } from 'vitest';
import { createAgentChatError, redactDiagnostics } from './agent-chat-errors.ts';

describe('Agent Chat Error Categories', () => {
  it('maps connection-unavailable to change-connection and retry recovery actions', () => {
    const error = createAgentChatError('connection-unavailable');
    expect(error.category).toBe('connection-unavailable');
    expect(error.recoveryActions).toContain('change-connection');
    expect(error.recoveryActions).toContain('retry');
  });

  it('maps authentication-failed to change-connection and retry', () => {
    const error = createAgentChatError('authentication-failed');
    expect(error.recoveryActions).toContain('change-connection');
    expect(error.recoveryActions).toContain('retry');
  });

  it('maps model-failed to retry, edit-prompt, and copy-diagnostics', () => {
    const error = createAgentChatError('model-failed');
    expect(error.recoveryActions).toContain('retry');
    expect(error.recoveryActions).toContain('edit-prompt');
    expect(error.recoveryActions).toContain('copy-diagnostics');
  });

  it('maps timeout to retry and copy-diagnostics', () => {
    const error = createAgentChatError('timeout');
    expect(error.recoveryActions).toContain('retry');
    expect(error.recoveryActions).toContain('copy-diagnostics');
  });

  it('maps invalid-agent-output to retry, edit-prompt, copy-diagnostics', () => {
    const error = createAgentChatError('invalid-agent-output');
    expect(error.recoveryActions).toContain('retry');
    expect(error.recoveryActions).toContain('edit-prompt');
    expect(error.recoveryActions).toContain('copy-diagnostics');
  });

  it('maps patch-conflict to refresh, edit-prompt, and reject', () => {
    const error = createAgentChatError('patch-conflict');
    expect(error.recoveryActions).toContain('refresh');
    expect(error.recoveryActions).toContain('edit-prompt');
    expect(error.recoveryActions).toContain('reject');
  });

  it('maps validation-failure to edit-prompt, reject, and copy-diagnostics', () => {
    const error = createAgentChatError('validation-failure');
    expect(error.recoveryActions).toContain('edit-prompt');
    expect(error.recoveryActions).toContain('reject');
    expect(error.recoveryActions).toContain('copy-diagnostics');
  });

  it('maps write-failure to retry, refresh, and copy-diagnostics', () => {
    const error = createAgentChatError('write-failure');
    expect(error.recoveryActions).toContain('retry');
    expect(error.recoveryActions).toContain('refresh');
    expect(error.recoveryActions).toContain('copy-diagnostics');
  });

  it('maps cancelled to retry and edit-prompt', () => {
    const error = createAgentChatError('cancelled');
    expect(error.recoveryActions).toContain('retry');
    expect(error.recoveryActions).toContain('edit-prompt');
  });

  it('accepts a custom error message override', () => {
    const error = createAgentChatError('model-failed', 'Custom failure message');
    expect(error.message).toBe('Custom failure message');
  });

  it('attaches and redacts diagnostics', () => {
    const rawDiagnostics = 'Error at /Users/johndoe/Projects/app/index.ts: api_key=supersecret123';
    const error = createAgentChatError('model-failed', undefined, rawDiagnostics);
    expect(error.diagnostics).toBeDefined();
    expect(error.diagnostics).not.toContain('johndoe');
    expect(error.diagnostics).not.toContain('supersecret123');
  });
});

describe('Diagnostics Redaction', () => {
  it('redacts macOS user paths', () => {
    const result = redactDiagnostics('/Users/alice/Projects/slide-app');
    expect(result).not.toContain('alice');
    expect(result).toContain('/Users/<user>');
  });

  it('redacts Windows user paths', () => {
    const result = redactDiagnostics('C:\\Users\\bobsmith\\Desktop\\project');
    expect(result).not.toContain('bobsmith');
    expect(result).toContain('C:\\Users\\<user>');
  });

  it('redacts API key values in diagnostic strings', () => {
    const result = redactDiagnostics('Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.abc123xyz');
    expect(result).toContain('Bearer <redacted>');
    expect(result).not.toContain('eyJhbGciOiJSUzI1NiJ9');
  });

  it('preserves non-sensitive content', () => {
    const result = redactDiagnostics('Timeout after 30000ms connecting to model endpoint');
    expect(result).toBe('Timeout after 30000ms connecting to model endpoint');
  });
});
