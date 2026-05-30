import { describe, expect, it } from 'vitest';
import type { AgentConnectionSettings } from '../app/lib/agent-connection-types.ts';
import { createConnectionStatus, normalizeCapabilities } from '../app/lib/agent-connections.ts';
import { FIXTURE_CONNECTION_ID, resolveRuntimeConnectionSnapshot } from './connections.ts';

function settings(overrides: Partial<AgentConnectionSettings> = {}): AgentConnectionSettings {
  const now = '2026-05-30T00:00:00.000Z';
  return {
    projectId: 'project_test',
    connections: [],
    scanPreference: {
      enabled: false,
      approvedDirectories: [],
      includeKnownInstallLocations: true,
      includePathCommands: true,
    },
    firstRunSetup: { hasSeenPrompt: false },
    updatedAt: now,
    ...overrides,
  };
}

const readyConnection = {
  id: 'conn_ready',
  displayName: 'Codex CLI',
  type: 'auto-scanned-local-agent' as const,
  provider: 'codex',
  scope: 'project-default' as const,
  modelId: 'gpt-5',
  capabilities: normalizeCapabilities({ streaming: true, writeCapable: true }),
  status: createConnectionStatus('ready'),
  credentialRef: 'cred_should_not_escape',
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

describe('agent-runtime connection snapshots', () => {
  it('fails when the selected connection was deleted', () => {
    const result = resolveRuntimeConnectionSnapshot(
      settings({ activeConnectionId: 'missing', connections: [] }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error.category).toBe('connection-unavailable');
    }
  });

  it('fails invalid or unavailable connections before execution', () => {
    const result = resolveRuntimeConnectionSnapshot(
      settings({
        activeConnectionId: 'conn_failed',
        connections: [
          {
            ...readyConnection,
            id: 'conn_failed',
            status: createConnectionStatus('failed', {
              category: 'incompatible-protocol',
              message: 'Unsupported output protocol.',
              diagnostics: '/Users/ducduy/.config token=secretvalue123',
            }),
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('incompatible-protocol');
      expect(result.error.diagnostics).not.toContain('/Users/ducduy');
      expect(result.error.diagnostics).not.toContain('secretvalue123');
    }
  });

  it('returns safe ready snapshots without secret references', () => {
    const ready = resolveRuntimeConnectionSnapshot(
      settings({ activeConnectionId: 'conn_ready', connections: [readyConnection] }),
    );

    expect(ready.ok).toBe(true);
    if (ready.ok) {
      expect(JSON.stringify(ready.snapshot)).not.toContain('cred_should_not_escape');
      expect(ready.snapshot.type).toBe('local-agent');
      expect(ready.snapshot.capabilities.streaming).toBe(true);
    }
  });

  it('requires explicit opt-in for degraded connection snapshots', () => {
    const degradedSettings = settings({
      activeConnectionId: 'conn_degraded',
      connections: [
        {
          ...readyConnection,
          id: 'conn_degraded',
          status: createConnectionStatus('degraded', { message: 'Limited model list.' }),
        },
      ],
    });
    const blocked = resolveRuntimeConnectionSnapshot(degradedSettings);
    const allowed = resolveRuntimeConnectionSnapshot(degradedSettings, { allowDegraded: true });

    expect(blocked.ok).toBe(false);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) {
      expect(allowed.snapshot.status).toBe('degraded');
    }
  });

  it('normalizes executable connection capabilities and keeps status details secret-free', () => {
    const result = resolveRuntimeConnectionSnapshot(
      settings({
        activeConnectionId: 'conn_ready',
        connections: [
          {
            ...readyConnection,
            capabilities: normalizeCapabilities({ streaming: true }),
            status: createConnectionStatus('ready', {
              message: 'Ready token=secretvalue123',
              diagnostics: 'path=/Users/ducduy/.agent key=supersecret123',
            }),
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.capabilities.streaming).toBe(true);
      expect(result.snapshot.capabilities.supportedModalities).toEqual(['text']);
      expect(result.snapshot.statusDetails?.state).toBe('ready');
      expect(JSON.stringify(result.snapshot)).not.toContain('supersecret123');
      expect(JSON.stringify(result.snapshot)).not.toContain('secretvalue123');
      expect(JSON.stringify(result.snapshot)).not.toContain('/Users/ducduy');
    }
  });

  it('exposes fixture connections only when the E2E flag is active', () => {
    const blocked = resolveRuntimeConnectionSnapshot(settings(), {
      connectionId: FIXTURE_CONNECTION_ID,
      env: {},
    });
    const enabled = resolveRuntimeConnectionSnapshot(settings(), {
      connectionId: FIXTURE_CONNECTION_ID,
      env: { AWESOME_SLIDE_E2E: '1' },
    });

    expect(blocked.ok).toBe(false);
    expect(enabled.ok).toBe(true);
    if (enabled.ok) {
      expect(enabled.snapshot.type).toBe('fixture');
      expect(enabled.snapshot.status).toBe('ready');
    }
  });
});
