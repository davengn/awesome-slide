import { describe, expect, it } from 'vitest';
import { createDefaultAgentConnectionSettings } from './agent-connection-storage.ts';
import type { AgentConnectionConfig } from './agent-connection-types.ts';
import {
  createConnectionStatus,
  createSafeBootstrapSnapshot,
  mapErrorCategoryToRecoveryActions,
  normalizeCapabilities,
  shouldShowFirstRunSetup,
  toActiveConnectionSnapshot,
} from './agent-connections.ts';

function readyConnection(patch: Partial<AgentConnectionConfig> = {}): AgentConnectionConfig {
  return {
    id: 'conn_codex',
    displayName: 'Codex CLI',
    type: 'manual-agent-path',
    provider: 'codex',
    scope: 'project-default',
    modelId: 'gpt-5.5',
    reasoningEffort: 'xhigh',
    manualPathRef: 'manual_secret_path_ref',
    credentialRef: 'cred_secret_ref',
    agentCommandAlias: 'codex',
    capabilities: normalizeCapabilities({ streaming: true, cancellation: true }),
    status: createConnectionStatus('ready'),
    createdAt: '2026-05-29T00:00:00.000Z',
    updatedAt: '2026-05-29T00:00:00.000Z',
    ...patch,
  };
}

describe('agent connection helpers', () => {
  it('normalizes missing capabilities to false-safe defaults', () => {
    const capabilities = normalizeCapabilities({ streaming: true });

    expect(capabilities.streaming).toBe(true);
    expect(capabilities.cancellation).toBe(false);
    expect(capabilities.supportedModalities).toEqual(['text']);
  });

  it('maps connection error categories to concrete recovery actions', () => {
    const categories: Array<AgentConnectionConfig['status']['category'] & {}> = [
      'missing-executable',
      'invalid-path',
      'scan-denied',
      'secure-storage-unavailable',
      'authentication-failed',
      'quota-rate-limit',
      'unsupported-model',
      'incompatible-protocol',
      'provider-offline',
      'timeout',
      'unknown',
    ];
    for (const cat of categories) {
      if (cat) {
        const actions = mapErrorCategoryToRecoveryActions(cat);
        expect(actions).toBeDefined();
        expect(actions.length).toBeGreaterThan(0);
      }
    }
    expect(mapErrorCategoryToRecoveryActions('missing-executable')).toEqual([
      'rescan',
      'edit-path',
      'open-settings',
    ]);
    expect(mapErrorCategoryToRecoveryActions('unsupported-model')).toContain('choose-model');
  });

  it('creates safe active snapshots without credential or path references', () => {
    const snapshot = toActiveConnectionSnapshot(readyConnection());
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.connectionId).toBe('conn_codex');
    expect(snapshot.modelId).toBe('gpt-5.5');
    expect(snapshot.reasoningEffort).toBe('xhigh');
    expect(snapshot.settingsTarget).toBe('execution-model');
    expect(serialized).not.toContain('cred_secret_ref');
    expect(serialized).not.toContain('manual_secret_path_ref');
  });

  it('reports first-run setup when no ready active connection exists', () => {
    const settings = createDefaultAgentConnectionSettings('proj');
    expect(shouldShowFirstRunSetup(settings)).toBe(true);

    const withReadyConnection = {
      ...settings,
      connections: [readyConnection()],
      activeConnectionId: 'conn_codex',
    };
    expect(shouldShowFirstRunSetup(withReadyConnection)).toBe(false);
  });

  it('builds a bootstrap snapshot for the active connection and first-run prompt', () => {
    const settings = {
      ...createDefaultAgentConnectionSettings('proj'),
      connections: [readyConnection()],
      activeConnectionId: 'conn_codex',
    };

    const snapshot = createSafeBootstrapSnapshot(settings);

    expect(snapshot.activeConnection?.displayName).toBe('Codex CLI');
    expect(snapshot.connections).toHaveLength(1);
    expect(snapshot.firstRunSetup.shouldShow).toBe(false);
  });
});
