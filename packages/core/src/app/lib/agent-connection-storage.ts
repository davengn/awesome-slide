import type {
  AgentConnectionConfig,
  AgentConnectionSettings,
  ConnectionScope,
  FirstRunConnectionSetup,
} from './agent-connection-types.ts';
import { createConnectionStatus, normalizeCapabilities } from './agent-connections.ts';

const STORAGE_PREFIX = 'awesome-slide:agent-connections:settings:';

function storageFor(storage?: Storage): Storage | undefined {
  return storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createDefaultAgentConnectionSettings(
  projectId = 'project_default',
): AgentConnectionSettings {
  return {
    projectId,
    connections: [],
    scanPreference: {
      enabled: false,
      approvedDirectories: [],
      includePathCommands: true,
      includeKnownInstallLocations: true,
    },
    firstRunSetup: {
      hasSeenPrompt: false,
    },
    updatedAt: nowIso(),
  };
}

function normalizeFirstRunSetup(value: unknown): FirstRunConnectionSetup {
  if (!value || typeof value !== 'object') {
    return { hasSeenPrompt: false };
  }
  const raw = value as Partial<FirstRunConnectionSetup>;
  return {
    hasSeenPrompt: raw.hasSeenPrompt === true,
    dismissedAt: typeof raw.dismissedAt === 'string' ? raw.dismissedAt : undefined,
    dismissReason:
      raw.dismissReason === 'do-later' ||
      raw.dismissReason === 'configured' ||
      raw.dismissReason === 'not-needed'
        ? raw.dismissReason
        : undefined,
    lastPromptedProjectId:
      typeof raw.lastPromptedProjectId === 'string' ? raw.lastPromptedProjectId : undefined,
  };
}

export function sanitizeConnectionConfig(value: unknown): AgentConnectionConfig | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<AgentConnectionConfig>;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.displayName !== 'string' ||
    typeof raw.provider !== 'string' ||
    (raw.type !== 'auto-scanned-local-agent' &&
      raw.type !== 'manual-agent-path' &&
      raw.type !== 'api-key-provider')
  ) {
    return null;
  }

  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : nowIso();
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt;
  const status =
    raw.status && typeof raw.status === 'object'
      ? {
          state: raw.status.state ?? 'needs-setup',
          category: raw.status.category,
          message: raw.status.message,
          recoveryActions: Array.isArray(raw.status.recoveryActions)
            ? raw.status.recoveryActions
            : [],
          diagnostics: raw.status.diagnostics,
          checkedAt: raw.status.checkedAt,
        }
      : createConnectionStatus('needs-setup');

  return {
    id: raw.id,
    displayName: raw.displayName,
    type: raw.type,
    provider: raw.provider,
    scope:
      raw.scope === 'project-default' || raw.scope === 'user-default' || raw.scope === 'session'
        ? raw.scope
        : 'session',
    modelId: typeof raw.modelId === 'string' ? raw.modelId : undefined,
    reasoningEffort: typeof raw.reasoningEffort === 'string' ? raw.reasoningEffort : undefined,
    agentCommandAlias:
      typeof raw.agentCommandAlias === 'string' ? raw.agentCommandAlias : undefined,
    manualPathRef: typeof raw.manualPathRef === 'string' ? raw.manualPathRef : undefined,
    credentialRef: typeof raw.credentialRef === 'string' ? raw.credentialRef : undefined,
    capabilities: normalizeCapabilities(raw.capabilities),
    status,
    lastTestedAt: typeof raw.lastTestedAt === 'string' ? raw.lastTestedAt : undefined,
    createdAt,
    updatedAt,
  };
}

export function normalizeAgentConnectionSettings(
  value: unknown,
  projectId = 'project_default',
): AgentConnectionSettings {
  const fallback = createDefaultAgentConnectionSettings(projectId);
  if (!value || typeof value !== 'object') return fallback;

  const raw = value as Partial<AgentConnectionSettings>;
  const connections = Array.isArray(raw.connections)
    ? raw.connections
        .map((connection) => sanitizeConnectionConfig(connection))
        .filter((connection): connection is AgentConnectionConfig => Boolean(connection))
    : [];
  const connectionIds = new Set(connections.map((connection) => connection.id));
  const activeConnectionId =
    typeof raw.activeConnectionId === 'string' && connectionIds.has(raw.activeConnectionId)
      ? raw.activeConnectionId
      : undefined;
  const projectDefaultConnectionId =
    typeof raw.projectDefaultConnectionId === 'string' &&
    connectionIds.has(raw.projectDefaultConnectionId)
      ? raw.projectDefaultConnectionId
      : undefined;

  return {
    projectId: typeof raw.projectId === 'string' ? raw.projectId : projectId,
    connections,
    activeConnectionId,
    projectDefaultConnectionId,
    scanPreference: {
      enabled: raw.scanPreference?.enabled === true,
      approvedDirectories: Array.isArray(raw.scanPreference?.approvedDirectories)
        ? raw.scanPreference.approvedDirectories.filter(
            (directory) =>
              directory &&
              typeof directory.id === 'string' &&
              typeof directory.pathLabel === 'string' &&
              typeof directory.createdAt === 'string',
          )
        : [],
      includePathCommands: raw.scanPreference?.includePathCommands !== false,
      includeKnownInstallLocations: raw.scanPreference?.includeKnownInstallLocations !== false,
      lastScanAt:
        typeof raw.scanPreference?.lastScanAt === 'string'
          ? raw.scanPreference.lastScanAt
          : undefined,
      lastScanStatus: raw.scanPreference?.lastScanStatus,
    },
    firstRunSetup: normalizeFirstRunSetup(raw.firstRunSetup),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso(),
  };
}

export function agentConnectionSettingsKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function saveAgentConnectionSettings(
  settings: AgentConnectionSettings,
  storage?: Storage,
): void {
  const activeStorage = storageFor(storage);
  if (!activeStorage) return;
  const normalized = normalizeAgentConnectionSettings(settings, settings.projectId);
  activeStorage.setItem(agentConnectionSettingsKey(settings.projectId), JSON.stringify(normalized));
}

export function loadAgentConnectionSettings(
  projectId = 'project_default',
  storage?: Storage,
): AgentConnectionSettings {
  const activeStorage = storageFor(storage);
  if (!activeStorage) return createDefaultAgentConnectionSettings(projectId);
  const raw = activeStorage.getItem(agentConnectionSettingsKey(projectId));
  if (!raw) return createDefaultAgentConnectionSettings(projectId);
  try {
    return normalizeAgentConnectionSettings(JSON.parse(raw), projectId);
  } catch {
    return createDefaultAgentConnectionSettings(projectId);
  }
}

export function saveActiveConnectionPreference(
  settings: AgentConnectionSettings,
  connectionId: string,
  scope: ConnectionScope = 'session',
  preferences: { modelId?: string; reasoningEffort?: string } = {},
): AgentConnectionSettings {
  const connections = settings.connections.map((connection) =>
    connection.id === connectionId
      ? {
          ...connection,
          modelId: preferences.modelId ?? connection.modelId,
          reasoningEffort: preferences.reasoningEffort ?? connection.reasoningEffort,
          scope,
          updatedAt: nowIso(),
        }
      : connection,
  );
  const exists = connections.some((connection) => connection.id === connectionId);
  if (!exists) return normalizeAgentConnectionSettings(settings, settings.projectId);
  return normalizeAgentConnectionSettings(
    {
      ...settings,
      connections,
      activeConnectionId: connectionId,
      projectDefaultConnectionId:
        scope === 'project-default' ? connectionId : settings.projectDefaultConnectionId,
      updatedAt: nowIso(),
    },
    settings.projectId,
  );
}

export function dismissFirstRunSetup(
  settings: AgentConnectionSettings,
  reason: FirstRunConnectionSetup['dismissReason'] = 'do-later',
): AgentConnectionSettings {
  return {
    ...settings,
    firstRunSetup: {
      hasSeenPrompt: true,
      dismissedAt: nowIso(),
      dismissReason: reason,
      lastPromptedProjectId: settings.projectId,
    },
    updatedAt: nowIso(),
  };
}
