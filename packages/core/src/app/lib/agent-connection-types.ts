export type LocalAgentProviderId =
  | 'claude-code'
  | 'codex'
  | 'devin'
  | 'gemini-cli'
  | 'opencode'
  | 'hermes'
  | 'kimi-cli'
  | 'cursor-agent'
  | 'qwen-code'
  | 'qoder-cli'
  | 'github-copilot-cli'
  | 'pi'
  | 'kiro-cli'
  | 'kilo'
  | 'mistral-vibe'
  | 'deepseek-tui'
  | (string & {});

export type ApiProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'deepseek'
  | (string & {});

export type AgentProviderId = LocalAgentProviderId | ApiProviderId;

export type AgentConnectionConfigType =
  | 'auto-scanned-local-agent'
  | 'manual-agent-path'
  | 'api-key-provider';

export type ActiveConnectionType = 'local-agent' | 'manual-agent' | 'api-provider';

export type ConnectionScope = 'session' | 'project-default' | 'user-default';

export type ConnectionStatusState =
  | 'ready'
  | 'needs-setup'
  | 'testing'
  | 'degraded'
  | 'failed'
  | 'offline'
  | 'scan-denied';

export type ConnectionErrorCategory =
  | 'missing-executable'
  | 'invalid-path'
  | 'scan-denied'
  | 'secure-storage-unavailable'
  | 'authentication-failed'
  | 'quota-rate-limit'
  | 'unsupported-model'
  | 'incompatible-protocol'
  | 'provider-offline'
  | 'timeout'
  | 'unknown';

export type ConnectionRecoveryAction =
  | 'open-settings'
  | 'auto-scan'
  | 'edit-path'
  | 'choose-model'
  | 'test-again'
  | 'rescan'
  | 'use-byok'
  | 'delete-credential'
  | 'copy-diagnostics';

export interface ConnectionCapabilities {
  streaming: boolean;
  cancellation: boolean;
  structuredProposals: boolean;
  toolCalls: boolean;
  localFileContext: boolean;
  writeCapable: boolean;
  maxContextBytes?: number;
  supportedModalities: Array<'text' | 'image' | 'audio' | 'video'>;
}

export interface ConnectionStatus {
  state: ConnectionStatusState;
  category?: ConnectionErrorCategory;
  message?: string;
  recoveryActions: ConnectionRecoveryAction[];
  diagnostics?: string;
  checkedAt?: string;
}

export interface FirstRunConnectionSetup {
  hasSeenPrompt: boolean;
  dismissedAt?: string;
  dismissReason?: 'do-later' | 'configured' | 'not-needed';
  lastPromptedProjectId?: string;
}

export interface ScanDirectory {
  id: string;
  pathLabel: string;
  source: 'user-approved' | 'current-project' | 'known-location';
  createdAt: string;
}

export interface AgentScanPreference {
  enabled: boolean;
  approvedDirectories: ScanDirectory[];
  includePathCommands: boolean;
  includeKnownInstallLocations: boolean;
  lastScanAt?: string;
  lastScanStatus?: ConnectionStatus;
}

export interface CompatibilityReport {
  status: 'compatible' | 'warning' | 'incompatible';
  protocol?: string;
  message: string;
}

export interface LocalAgentCandidate {
  id: string;
  provider: LocalAgentProviderId;
  displayName: string;
  command?: string;
  pathLabel?: string;
  source: 'path' | 'known-location' | 'approved-directory' | 'project-metadata';
  version?: string;
  status: 'installed' | 'not-installed' | 'incompatible' | 'needs-manual-path';
  compatibility?: CompatibilityReport;
  lastSeenAt: string;
}

export interface AgentConnectionConfig {
  id: string;
  displayName: string;
  type: AgentConnectionConfigType;
  provider: AgentProviderId;
  scope: ConnectionScope;
  modelId?: string;
  reasoningEffort?: string;
  agentCommandAlias?: string;
  manualPathRef?: string;
  credentialRef?: string;
  credentialStorage?: 'os-credential-store' | 'environment-variable';
  credentialDisplayHint?: string;
  capabilities: ConnectionCapabilities;
  status: ConnectionStatus;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelExecutionPreference {
  connectionId: string;
  modelId?: string;
  reasoningEffort?: string;
  scope: ConnectionScope;
  updatedAt: string;
}

export interface ValidationResult {
  status: 'pass' | 'warn' | 'fail';
  provider?: AgentProviderId;
  version?: string;
  protocol?: string;
  message: string;
  diagnostics?: string;
}

export interface ManualAgentPath {
  id: string;
  input: string;
  kind: 'executable' | 'command' | 'project-path';
  pathLabel: string;
  provider?: LocalAgentProviderId;
  validation: ValidationResult;
  version?: string;
  protocol?: string;
  updatedAt: string;
}

export interface ApiProviderCredential {
  ref: string;
  provider: ApiProviderId;
  storage: 'os-credential-store' | 'environment-variable';
  displayHint: string;
  createdAt: string;
  lastVerifiedAt?: string;
}

export interface SafeAgentConnectionCredential {
  storage: ApiProviderCredential['storage'];
  displayHint: string;
}

export type AgentConnectionSettingsConnection = Omit<
  AgentConnectionConfig,
  'credentialRef' | 'credentialStorage' | 'credentialDisplayHint'
> & {
  credential?: SafeAgentConnectionCredential;
  credentialRef?: never;
};

export interface ProviderRegistryEntry {
  id: AgentProviderId;
  displayName: string;
  type: 'local-agent' | 'api-provider';
  knownCommands?: string[];
  knownInstallPaths?: string[];
  defaultModels?: string[];
  keyHint?: string;
  capabilityDefaults: ConnectionCapabilities;
}

export interface ActiveConnectionSnapshot {
  connectionId: string;
  displayName: string;
  type: ActiveConnectionType;
  provider: string;
  modelOrAgent: string;
  modelId?: string;
  reasoningEffort?: string;
  availableModels?: string[];
  availableReasoningEfforts?: string[];
  status: ConnectionStatusState;
  capabilities: ConnectionCapabilities;
  settingsTarget: 'execution-model';
  isProjectDefault?: boolean;
}

export interface AgentConnectionSettings {
  projectId: string;
  connections: AgentConnectionConfig[];
  activeConnectionId?: string;
  projectDefaultConnectionId?: string;
  scanPreference: AgentScanPreference;
  firstRunSetup: FirstRunConnectionSetup;
  updatedAt: string;
}

export type SettingsModalInitialFocus =
  | 'close'
  | 'section-nav'
  | 'local-cli'
  | 'byok-provider'
  | 'auto-scan'
  | 'manual-path';

export type SettingsModalCloseReason = 'escape' | 'close-button' | 'backdrop' | 'programmatic';

export type SettingsModalResponsiveLayout = 'compact' | 'split' | 'wide';

export interface SettingsModalState {
  open: boolean;
  activeSection:
    | 'execution-model'
    | 'media-providers'
    | 'connectors'
    | 'mcp-server'
    | 'external-mcp'
    | 'language'
    | 'appearance'
    | 'notifications';
  executionTab: 'local-cli' | 'byok';
  selectedConnectionId?: string;
  scanState?: 'idle' | 'scanning' | 'cancelled' | 'completed' | 'failed';
  validationErrors: Record<string, string>;
  triggerId?: string;
  returnFocusTo?: string;
  initialFocus?: SettingsModalInitialFocus;
  closeReason?: SettingsModalCloseReason;
  viewportWidth?: number;
  responsiveLayout: SettingsModalResponsiveLayout;
}

export interface QuickConnectionSwitcherState {
  open: boolean;
  activeMode: 'local-cli' | 'byok';
  selectedConnectionId?: string;
  selectedModelId?: string;
  selectedReasoningEffort?: string;
  availableConnections: ActiveConnectionSnapshot[];
  availableModels: string[];
  availableReasoningEfforts: string[];
  pendingAction?: 'switch-connection' | 'switch-model' | 'switch-reasoning' | 'rescan-path';
  error?: ConnectionStatus;
}

export interface AgentConnectionsBootstrapResponse {
  activeConnection: ActiveConnectionSnapshot | null;
  connections: ActiveConnectionSnapshot[];
  firstRunSetup: {
    shouldShow: boolean;
    dismissedAt: string | null;
  };
  runtime: {
    mode: 'interactive' | 'read-only';
    settingsRoute: string;
    settingsModalTarget: 'execution-model';
  };
}

export interface AgentConnectionsSettingsResponse {
  connections: AgentConnectionSettingsConnection[];
  activeConnectionId?: string;
  projectDefaultConnectionId?: string;
  scanPreference: AgentScanPreference;
  firstRunSetup: FirstRunConnectionSetup;
  candidates: LocalAgentCandidate[];
  providers: ProviderRegistryEntry[];
}

export interface DismissFirstRunRequest {
  reason: FirstRunConnectionSetup['dismissReason'];
}

export interface DismissFirstRunResponse {
  ok: true;
}

export interface StartScanRequest {
  includePathCommands?: boolean;
  includeKnownInstallLocations?: boolean;
  approvedDirectoryIds?: string[];
}

export interface StartScanResponse {
  scanId: string;
  state: 'scanning';
  eventUrl: string;
}

export interface ManualPathValidationRequest {
  input: string;
  kind: ManualAgentPath['kind'];
}

export interface ManualPathValidationResponse {
  validation: ValidationResult;
  manualPath?: ManualAgentPath;
}

export interface CreateAgentConnectionRequest {
  source: 'candidate' | 'manual-path' | 'byok';
  displayName: string;
  provider: AgentProviderId;
  candidateId?: string;
  manualPathId?: string;
  credentialRef?: string;
  modelId?: string;
  reasoningEffort?: string;
  scope?: ConnectionScope;
}

export interface CreateAgentConnectionResponse {
  connection: AgentConnectionSettingsConnection;
}

export interface SetActiveConnectionRequest {
  connectionId: string;
  scope?: ConnectionScope;
  modelId?: string;
  reasoningEffort?: string;
}

export interface SetActiveConnectionResponse {
  ok: true;
  activeConnectionId: string;
}

export interface TestConnectionResponse {
  status: ConnectionStatus;
}

export interface DeleteConnectionRequest {
  deleteCredential?: boolean;
}

export interface DeleteConnectionResponse {
  ok: true;
}

export interface AgentConnectionErrorResponse {
  error: string;
  category?: ConnectionErrorCategory;
  recoveryActions: ConnectionRecoveryAction[];
  diagnostics?: string;
}
