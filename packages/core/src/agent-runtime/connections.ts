import type {
  ActiveConnectionSnapshot,
  AgentConnectionSettings,
  ConnectionStatus,
} from '../app/lib/agent-connection-types.ts';
import {
  createConnectionStatus,
  normalizeCapabilities,
  resolveActiveConnection,
  toActiveConnectionSnapshot,
} from '../app/lib/agent-connections.ts';
import type { RuntimeConnectionSnapshot, RuntimeError } from './contracts.ts';
import { redactJsonValue } from './redaction.ts';

export type ResolveRuntimeConnectionSnapshotResult =
  | { ok: true; snapshot: RuntimeConnectionSnapshot }
  | { ok: false; status: number; error: RuntimeError };

export interface ResolveRuntimeConnectionSnapshotOptions {
  connectionId?: string;
  allowDegraded?: boolean;
  fixture?: boolean;
  env?: NodeJS.ProcessEnv;
}

export const FIXTURE_CONNECTION_ID = 'fixture-agent';

export function isRuntimeFixtureEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AWESOME_SLIDE_E2E === '1';
}

function connectionError(input: {
  status: number;
  category: RuntimeError['category'];
  message: string;
  diagnostics?: string;
}): ResolveRuntimeConnectionSnapshotResult {
  return {
    ok: false,
    status: input.status,
    error: {
      category: input.category,
      message: input.message,
      recoveryActions: ['change-connection', 'open-settings'],
      diagnostics: input.diagnostics,
    },
  };
}

function toRuntimeConnectionSnapshot(
  snapshot: ActiveConnectionSnapshot,
  statusDetails?: ConnectionStatus,
): RuntimeConnectionSnapshot {
  return {
    connectionId: snapshot.connectionId,
    displayName: snapshot.displayName,
    type: snapshot.type,
    provider: snapshot.provider,
    modelOrAgent: snapshot.modelOrAgent,
    modelId: snapshot.modelId,
    reasoningEffort: snapshot.reasoningEffort,
    capabilities: normalizeCapabilities(snapshot.capabilities),
    status: snapshot.status,
    statusDetails,
    settingsTarget: 'execution-model',
    isProjectDefault: snapshot.isProjectDefault,
  };
}

function fixtureSnapshot(): RuntimeConnectionSnapshot {
  return {
    connectionId: FIXTURE_CONNECTION_ID,
    displayName: 'Deterministic Fixture',
    type: 'fixture',
    provider: 'fixture',
    modelOrAgent: 'fixture',
    capabilities: normalizeCapabilities({
      streaming: true,
      cancellation: true,
      structuredProposals: true,
      toolCalls: false,
      localFileContext: true,
      writeCapable: true,
      maxContextBytes: 64 * 1024,
      supportedModalities: ['text'],
    }),
    status: 'ready',
    settingsTarget: 'execution-model',
  };
}

export function resolveRuntimeConnectionSnapshot(
  settings: AgentConnectionSettings,
  options: ResolveRuntimeConnectionSnapshotOptions = {},
): ResolveRuntimeConnectionSnapshotResult {
  if (options.fixture || options.connectionId === FIXTURE_CONNECTION_ID) {
    if (!isRuntimeFixtureEnabled(options.env)) {
      return connectionError({
        status: 404,
        category: 'connection-unavailable',
        message: 'The deterministic fixture connection is only available during E2E runs.',
      });
    }
    return { ok: true, snapshot: fixtureSnapshot() };
  }

  const selected = options.connectionId
    ? settings.connections.find((connection) => connection.id === options.connectionId)
    : resolveActiveConnection(settings);

  if (!selected) {
    return connectionError({
      status: 503,
      category: 'connection-unavailable',
      message: 'No active agent connection is configured.',
    });
  }

  const status = selected.status.state;
  const allowDegraded = options.allowDegraded ?? false;
  if (status !== 'ready' && !(allowDegraded && status === 'degraded')) {
    return connectionError({
      status: 503,
      category:
        selected.status.category === 'incompatible-protocol'
          ? 'incompatible-protocol'
          : 'connection-unavailable',
      message: selected.status.message ?? 'The selected agent connection is not executable.',
      diagnostics:
        typeof selected.status.diagnostics === 'string'
          ? (redactJsonValue(selected.status.diagnostics) as string)
          : undefined,
    });
  }

  const safeStatus = {
    ...selected.status,
    message:
      typeof selected.status.message === 'string'
        ? (redactJsonValue(selected.status.message) as string)
        : undefined,
    diagnostics:
      typeof selected.status.diagnostics === 'string'
        ? (redactJsonValue(selected.status.diagnostics) as string)
        : undefined,
  };
  const browserSnapshot = toActiveConnectionSnapshot(
    {
      ...selected,
      status: safeStatus,
    },
    settings.projectDefaultConnectionId === selected.id,
  );
  return { ok: true, snapshot: toRuntimeConnectionSnapshot(browserSnapshot, safeStatus) };
}

export function createMissingConnectionStatus(message: string = 'No connection selected.') {
  return createConnectionStatus('failed', {
    category: 'missing-executable',
    message,
  });
}
