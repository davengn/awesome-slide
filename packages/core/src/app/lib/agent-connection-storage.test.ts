import { describe, expect, it } from 'vitest';
import {
  createDefaultAgentConnectionSettings,
  dismissFirstRunSetup,
  loadAgentConnectionSettings,
  normalizeAgentConnectionSettings,
  saveActiveConnectionPreference,
  saveAgentConnectionSettings,
} from './agent-connection-storage.ts';
import type { AgentConnectionConfig } from './agent-connection-types.ts';
import { createConnectionStatus, normalizeCapabilities } from './agent-connections.ts';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function connection(id: string): AgentConnectionConfig {
  return {
    id,
    displayName: 'OpenAI',
    type: 'api-key-provider',
    provider: 'openai',
    scope: 'session',
    credentialRef: 'cred_ref',
    capabilities: normalizeCapabilities({ streaming: true }),
    status: createConnectionStatus('ready'),
    createdAt: '2026-05-29T00:00:00.000Z',
    updatedAt: '2026-05-29T00:00:00.000Z',
  };
}

describe('agent connection storage', () => {
  it('saves and loads project-local non-secret settings', () => {
    const storage = new MemoryStorage();
    const settings = {
      ...createDefaultAgentConnectionSettings('proj'),
      connections: [connection('conn_openai')],
      activeConnectionId: 'conn_openai',
    };

    saveAgentConnectionSettings(settings, storage);
    const loaded = loadAgentConnectionSettings('proj', storage);
    const raw = storage.getItem('awesome-slide:agent-connections:settings:proj') ?? '';

    expect(loaded.activeConnectionId).toBe('conn_openai');
    expect(raw).toContain('cred_ref');
    expect(raw).not.toContain('sk-secret-value');
  });

  it('drops invalid active and default connection references', () => {
    const normalized = normalizeAgentConnectionSettings(
      {
        projectId: 'proj',
        connections: [connection('existing')],
        activeConnectionId: 'missing',
        projectDefaultConnectionId: 'missing',
      },
      'proj',
    );

    expect(normalized.activeConnectionId).toBeUndefined();
    expect(normalized.projectDefaultConnectionId).toBeUndefined();
  });

  it('persists active connection model and reasoning preferences', () => {
    const settings = {
      ...createDefaultAgentConnectionSettings('proj'),
      connections: [connection('conn_openai')],
    };

    const updated = saveActiveConnectionPreference(settings, 'conn_openai', 'project-default', {
      modelId: 'gpt-5.5',
      reasoningEffort: 'xhigh',
    });

    expect(updated.activeConnectionId).toBe('conn_openai');
    expect(updated.projectDefaultConnectionId).toBe('conn_openai');
    expect(updated.connections[0].modelId).toBe('gpt-5.5');
    expect(updated.connections[0].reasoningEffort).toBe('xhigh');
  });

  it('records first-run dismissal without enabling scan', () => {
    const settings = createDefaultAgentConnectionSettings('proj');
    const dismissed = dismissFirstRunSetup(settings, 'do-later');

    expect(dismissed.firstRunSetup.hasSeenPrompt).toBe(true);
    expect(dismissed.firstRunSetup.dismissReason).toBe('do-later');
    expect(dismissed.scanPreference.enabled).toBe(false);
  });
});
