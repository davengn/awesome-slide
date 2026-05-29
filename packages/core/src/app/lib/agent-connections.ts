import type {
  ActiveConnectionSnapshot,
  AgentConnectionConfig,
  AgentConnectionSettings,
  AgentProviderId,
  ApiProviderId,
  ConnectionCapabilities,
  ConnectionErrorCategory,
  ConnectionRecoveryAction,
  ConnectionStatus,
  ConnectionStatusState,
  LocalAgentProviderId,
  ProviderRegistryEntry,
} from './agent-connection-types.ts';

export const DEFAULT_CONNECTION_CAPABILITIES: ConnectionCapabilities = {
  streaming: false,
  cancellation: false,
  structuredProposals: false,
  toolCalls: false,
  localFileContext: false,
  writeCapable: false,
  supportedModalities: ['text'],
};

const LOCAL_AGENT_CAPABILITIES = normalizeCapabilities({
  streaming: true,
  cancellation: true,
  structuredProposals: true,
  toolCalls: true,
  localFileContext: true,
  writeCapable: true,
  maxContextBytes: 256 * 1024,
  supportedModalities: ['text', 'image'],
});

const API_PROVIDER_CAPABILITIES = normalizeCapabilities({
  streaming: true,
  cancellation: true,
  structuredProposals: true,
  toolCalls: false,
  localFileContext: false,
  writeCapable: true,
  maxContextBytes: 128 * 1024,
  supportedModalities: ['text', 'image'],
});

export const REASONING_EFFORTS = ['low', 'medium', 'high', 'xhigh'];

export const PROVIDER_REGISTRY: ProviderRegistryEntry[] = [
  {
    id: 'claude-code',
    displayName: 'Claude Code',
    type: 'local-agent',
    knownCommands: ['claude'],
    capabilityDefaults: LOCAL_AGENT_CAPABILITIES,
  },
  {
    id: 'codex',
    displayName: 'Codex CLI',
    type: 'local-agent',
    knownCommands: ['codex'],
    defaultModels: ['gpt-5.5', 'gpt-5', 'gpt-4.1'],
    capabilityDefaults: LOCAL_AGENT_CAPABILITIES,
  },
  {
    id: 'gemini-cli',
    displayName: 'Gemini CLI',
    type: 'local-agent',
    knownCommands: ['gemini'],
    capabilityDefaults: LOCAL_AGENT_CAPABILITIES,
  },
  {
    id: 'opencode',
    displayName: 'OpenCode',
    type: 'local-agent',
    knownCommands: ['opencode'],
    capabilityDefaults: LOCAL_AGENT_CAPABILITIES,
  },
  {
    id: 'cursor-agent',
    displayName: 'Cursor Agent',
    type: 'local-agent',
    knownCommands: ['cursor-agent'],
    capabilityDefaults: LOCAL_AGENT_CAPABILITIES,
  },
  {
    id: 'github-copilot-cli',
    displayName: 'GitHub Copilot CLI',
    type: 'local-agent',
    knownCommands: ['gh'],
    capabilityDefaults: LOCAL_AGENT_CAPABILITIES,
  },
  {
    id: 'openai',
    displayName: 'OpenAI',
    type: 'api-provider',
    defaultModels: ['gpt-5.5', 'gpt-5', 'gpt-4.1'],
    keyHint: 'OPENAI_API_KEY',
    capabilityDefaults: API_PROVIDER_CAPABILITIES,
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    type: 'api-provider',
    defaultModels: ['claude-opus-4.1', 'claude-sonnet-4'],
    keyHint: 'ANTHROPIC_API_KEY',
    capabilityDefaults: API_PROVIDER_CAPABILITIES,
  },
  {
    id: 'google',
    displayName: 'Google',
    type: 'api-provider',
    defaultModels: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    keyHint: 'GOOGLE_API_KEY',
    capabilityDefaults: API_PROVIDER_CAPABILITIES,
  },
  {
    id: 'openrouter',
    displayName: 'OpenRouter',
    type: 'api-provider',
    defaultModels: ['openai/gpt-5', 'anthropic/claude-sonnet-4'],
    keyHint: 'OPENROUTER_API_KEY',
    capabilityDefaults: API_PROVIDER_CAPABILITIES,
  },
];

const RECOVERY_MAP: Record<ConnectionErrorCategory, ConnectionRecoveryAction[]> = {
  'missing-executable': ['rescan', 'edit-path', 'open-settings'],
  'invalid-path': ['edit-path', 'open-settings'],
  'scan-denied': ['auto-scan', 'edit-path', 'use-byok'],
  'secure-storage-unavailable': ['use-byok', 'open-settings', 'copy-diagnostics'],
  'authentication-failed': ['use-byok', 'test-again', 'delete-credential'],
  'quota-rate-limit': ['test-again', 'choose-model', 'use-byok'],
  'unsupported-model': ['choose-model', 'test-again'],
  'incompatible-protocol': ['edit-path', 'rescan', 'use-byok'],
  'provider-offline': ['test-again', 'use-byok'],
  timeout: ['test-again', 'copy-diagnostics'],
  unknown: ['open-settings', 'copy-diagnostics'],
};

export function normalizeCapabilities(
  capabilities: Partial<ConnectionCapabilities> = {},
): ConnectionCapabilities {
  return {
    ...DEFAULT_CONNECTION_CAPABILITIES,
    ...capabilities,
    supportedModalities:
      capabilities.supportedModalities ?? DEFAULT_CONNECTION_CAPABILITIES.supportedModalities,
  };
}

export function getProviderRegistry(): ProviderRegistryEntry[] {
  return PROVIDER_REGISTRY.map((entry) => ({
    ...entry,
    capabilityDefaults: normalizeCapabilities(entry.capabilityDefaults),
    knownCommands: entry.knownCommands ? [...entry.knownCommands] : undefined,
    knownInstallPaths: entry.knownInstallPaths ? [...entry.knownInstallPaths] : undefined,
    defaultModels: entry.defaultModels ? [...entry.defaultModels] : undefined,
  }));
}

export function getProviderEntry(provider: AgentProviderId): ProviderRegistryEntry | undefined {
  return getProviderRegistry().find((entry) => entry.id === provider);
}

export function mapErrorCategoryToRecoveryActions(
  category: ConnectionErrorCategory,
): ConnectionRecoveryAction[] {
  return [...RECOVERY_MAP[category]];
}

export function createConnectionStatus(
  state: ConnectionStatusState,
  opts: {
    category?: ConnectionErrorCategory;
    message?: string;
    diagnostics?: string;
    checkedAt?: string;
  } = {},
): ConnectionStatus {
  return {
    state,
    category: opts.category,
    message: opts.message,
    diagnostics: opts.diagnostics,
    checkedAt: opts.checkedAt,
    recoveryActions: opts.category ? mapErrorCategoryToRecoveryActions(opts.category) : [],
  };
}

export function isApiProviderId(provider: AgentProviderId): provider is ApiProviderId {
  return getProviderEntry(provider)?.type === 'api-provider';
}

export function isLocalAgentProviderId(
  provider: AgentProviderId,
): provider is LocalAgentProviderId {
  return getProviderEntry(provider)?.type === 'local-agent';
}

export function toActiveConnectionSnapshot(
  connection: AgentConnectionConfig,
): ActiveConnectionSnapshot {
  const provider = getProviderEntry(connection.provider);
  const activeType: ActiveConnectionSnapshot['type'] =
    connection.type === 'api-key-provider'
      ? 'api-provider'
      : connection.type === 'manual-agent-path'
        ? 'manual-agent'
        : 'local-agent';
  const modelOrAgent =
    connection.modelId ||
    connection.agentCommandAlias ||
    provider?.displayName ||
    connection.displayName;

  return {
    connectionId: connection.id,
    displayName: connection.displayName,
    type: activeType,
    provider: String(connection.provider),
    modelOrAgent,
    modelId: connection.modelId,
    reasoningEffort: connection.reasoningEffort,
    availableModels: provider?.defaultModels ? [...provider.defaultModels] : undefined,
    availableReasoningEfforts:
      provider?.defaultModels || connection.reasoningEffort ? [...REASONING_EFFORTS] : undefined,
    status: connection.status.state,
    capabilities: normalizeCapabilities(connection.capabilities),
    settingsTarget: 'execution-model',
  };
}

export function resolveActiveConnection(
  settings: AgentConnectionSettings,
): AgentConnectionConfig | null {
  const explicit = settings.activeConnectionId
    ? settings.connections.find((connection) => connection.id === settings.activeConnectionId)
    : undefined;
  if (explicit) return explicit;

  const projectDefault = settings.projectDefaultConnectionId
    ? settings.connections.find(
        (connection) => connection.id === settings.projectDefaultConnectionId,
      )
    : undefined;
  return projectDefault ?? null;
}

export function shouldShowFirstRunSetup(settings: AgentConnectionSettings): boolean {
  const activeConnection = resolveActiveConnection(settings);
  if (activeConnection?.status.state === 'ready') return false;
  return !settings.firstRunSetup.hasSeenPrompt;
}

export function createSafeBootstrapSnapshot(settings: AgentConnectionSettings): {
  activeConnection: ActiveConnectionSnapshot | null;
  connections: ActiveConnectionSnapshot[];
  firstRunSetup: { shouldShow: boolean; dismissedAt: string | null };
} {
  return {
    activeConnection: resolveActiveConnection(settings)
      ? toActiveConnectionSnapshot(resolveActiveConnection(settings) as AgentConnectionConfig)
      : null,
    connections: settings.connections.map(toActiveConnectionSnapshot),
    firstRunSetup: {
      shouldShow: shouldShowFirstRunSetup(settings),
      dismissedAt: settings.firstRunSetup.dismissedAt ?? null,
    },
  };
}
