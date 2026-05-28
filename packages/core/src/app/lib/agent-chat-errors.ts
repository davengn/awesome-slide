import type { AgentChatError } from './agent-chat-types.ts';

export const ERROR_RECOVERY_MAP: Record<
  AgentChatError['category'],
  {
    defaultMessage: string;
    recoveryActions: AgentChatError['recoveryActions'];
  }
> = {
  'connection-unavailable': {
    defaultMessage: 'The agent connection is unavailable or not configured.',
    recoveryActions: ['change-connection', 'retry'],
  },
  'authentication-failed': {
    defaultMessage: 'Authentication with the agent provider failed.',
    recoveryActions: ['change-connection', 'retry'],
  },
  'model-failed': {
    defaultMessage: 'The model failed to generate a response.',
    recoveryActions: ['retry', 'edit-prompt', 'copy-diagnostics'],
  },
  timeout: {
    defaultMessage: 'The request to the agent timed out.',
    recoveryActions: ['retry', 'copy-diagnostics'],
  },
  'invalid-agent-output': {
    defaultMessage: 'The agent returned an invalid or unparseable response.',
    recoveryActions: ['retry', 'edit-prompt', 'copy-diagnostics'],
  },
  'patch-conflict': {
    defaultMessage: 'The proposed changes conflict with the current slide source.',
    recoveryActions: ['refresh', 'edit-prompt', 'reject'],
  },
  'validation-failure': {
    defaultMessage: 'The proposed changes failed preflight validation checks.',
    recoveryActions: ['edit-prompt', 'reject', 'copy-diagnostics'],
  },
  'write-failure': {
    defaultMessage: 'Failed to write the proposed changes to the local filesystem.',
    recoveryActions: ['retry', 'refresh', 'copy-diagnostics'],
  },
  cancelled: {
    defaultMessage: 'The run was cancelled.',
    recoveryActions: ['retry', 'edit-prompt'],
  },
};

export function createAgentChatError(
  category: AgentChatError['category'],
  customMessage?: string,
  diagnostics?: string,
): AgentChatError {
  const config = ERROR_RECOVERY_MAP[category];
  return {
    category,
    message: customMessage || config.defaultMessage,
    recoveryActions: config.recoveryActions,
    diagnostics: diagnostics ? redactDiagnostics(diagnostics) : undefined,
  };
}

export function redactDiagnostics(diagnostics: string): string {
  let redacted = diagnostics;
  // Redact Windows/Mac home paths
  redacted = redacted.replace(/\/Users\/[a-zA-Z0-9_-]+/g, '/Users/<user>');
  redacted = redacted.replace(/C:\\Users\\[a-zA-Z0-9_-]+/g, 'C:\\Users\\<user>');
  // Redact potential API keys or tokens in query strings or headers
  redacted = redacted.replace(
    /(api[-_]?key|token|auth|password|secret|key|bearer)\s*[:=]\s*["']?[a-zA-Z0-9_\-./~+\\*=]{8,}["']?/gi,
    '$1=<redacted>',
  );
  return redacted;
}
