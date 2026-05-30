# Data Model: Agent and Model Connection Options

## AgentConnectionSettings

Project/user settings aggregate for connection setup.

Fields:

- `projectId: string`
- `connections: AgentConnectionConfig[]`
- `activeConnectionId?: string`
- `projectDefaultConnectionId?: string`
- `scanPreference: AgentScanPreference`
- `firstRunSetup: FirstRunConnectionSetup`
- `updatedAt: string`

Rules:

- Project-shared settings may contain only non-secret metadata.
- Raw API keys, raw environment values, and full command diagnostics are excluded.
- If `activeConnectionId` references a missing or invalid connection, the runtime returns `needs-setup` with recovery actions.

## FirstRunConnectionSetup

State used by the slide library page to decide whether to surface setup.

Fields:

- `hasSeenPrompt: boolean`
- `dismissedAt?: string`
- `dismissReason?: 'do-later' | 'configured' | 'not-needed'`
- `lastPromptedProjectId?: string`

Rules:

- When no valid active connection and no setup preference exists, the slide library shows setup.
- Choosing `Do later` records a local dismissal but does not enable scan.
- A failed or removed active connection may re-enable a smaller recovery prompt.

## AgentScanPreference

User consent and scope for local agent discovery.

Fields:

- `enabled: boolean`
- `approvedDirectories: ScanDirectory[]`
- `includePathCommands: boolean`
- `includeKnownInstallLocations: boolean`
- `lastScanAt?: string`
- `lastScanStatus?: ConnectionStatus`

Rules:

- `enabled` defaults to false.
- Full-disk traversal is invalid.
- Adding a directory requires explicit user action.
- Removing a directory prevents future scans there but does not delete already configured manual connections.

## ScanDirectory

User-approved local directory for bounded scan.

Fields:

- `id: string`
- `pathLabel: string`
- `source: 'user-approved' | 'current-project' | 'known-location'`
- `createdAt: string`

Rules:

- UI may display a readable path label, but diagnostics must redact user names where appropriate.
- `known-location` entries are fixed by the registry and can be disabled as a group.

## LocalAgentCandidate

Agent discovered by bounded scan.

Fields:

- `id: string`
- `provider: LocalAgentProviderId`
- `displayName: string`
- `command?: string`
- `pathLabel?: string`
- `source: 'path' | 'known-location' | 'approved-directory' | 'project-metadata'`
- `version?: string`
- `status: 'installed' | 'not-installed' | 'incompatible' | 'needs-manual-path'`
- `compatibility?: CompatibilityReport`
- `lastSeenAt: string`

Rules:

- Candidates are review-only until the user activates one.
- `not-installed` candidates may appear for known providers to explain available options, but they cannot be activated.
- Candidate diagnostics are redacted before display and persistence.

## AgentConnectionConfig

Persisted non-secret connection metadata.

Fields:

- `id: string`
- `displayName: string`
- `type: 'auto-scanned-local-agent' | 'manual-agent-path' | 'api-key-provider'`
- `provider: LocalAgentProviderId | ApiProviderId`
- `scope: 'session' | 'project-default' | 'user-default'`
- `modelId?: string`
- `reasoningEffort?: string`
- `agentCommandAlias?: string`
- `manualPathRef?: string`
- `credentialRef?: string`
- `capabilities: ConnectionCapabilities`
- `status: ConnectionStatus`
- `lastTestedAt?: string`
- `createdAt: string`
- `updatedAt: string`

Rules:

- `credentialRef` is an opaque reference, not a secret value.
- `manualPathRef` points to a validated local path record and must not include command output.
- Configs remain visible after failures so users can repair them.
- `modelId` and `reasoningEffort` may be changed from the slide-page quick switcher when supported by the active provider.

## ModelExecutionPreference

User-selected execution preference for a configured connection.

Fields:

- `connectionId: string`
- `modelId?: string`
- `reasoningEffort?: string`
- `scope: 'session' | 'project-default' | 'user-default'`
- `updatedAt: string`

Rules:

- Values are non-secret and safe to return to the browser.
- A reasoning value may be omitted when the active provider does not expose reasoning controls.
- Changing preferences updates the active connection snapshot used by 005 for subsequent runs but does not modify existing chat messages.

## ManualAgentPath

Validated user-entered local agent location.

Fields:

- `id: string`
- `input: string`
- `kind: 'executable' | 'command' | 'project-path'`
- `pathLabel: string`
- `provider?: LocalAgentProviderId`
- `validation: ValidationResult`
- `version?: string`
- `protocol?: string`
- `updatedAt: string`

Rules:

- A manual path cannot become an active connection until validation passes or passes with an acknowledged warning.
- Validation must not start broad scans.
- Command stderr/stdout is redacted before display.

## ApiProviderCredential

Secure secret record represented in project settings by reference only.

Fields:

- `ref: string`
- `provider: ApiProviderId`
- `storage: 'os-credential-store' | 'environment-variable'`
- `displayHint: string`
- `createdAt: string`
- `lastVerifiedAt?: string`

Rules:

- The raw key is never serialized into project files, browser history, chat context, diagnostics copy, or audit logs.
- If OS credential storage is unavailable, the UI may save only an environment variable reference; if neither safe storage path is usable, the runtime reports `secure-storage-unavailable`.
- Deleting a connection can optionally delete the credential record.

## ConnectionCapabilities

Normalized behavior flags exposed to 005.

Fields:

- `streaming: boolean`
- `cancellation: boolean`
- `structuredProposals: boolean`
- `toolCalls: boolean`
- `localFileContext: boolean`
- `writeCapable: boolean`
- `maxContextBytes?: number`
- `supportedModalities: Array<'text' | 'image' | 'audio' | 'video'>`

Rules:

- 005 uses these flags to enable, disable, or degrade prompt runs.
- Missing capabilities default to false.
- `writeCapable` means the connection can participate in write-capable slide workflows after 005 proposal validation, not that it may write files directly.

## ConnectionStatus

Current health state.

Fields:

- `state: 'ready' | 'needs-setup' | 'testing' | 'degraded' | 'failed' | 'offline' | 'scan-denied'`
- `category?: ConnectionErrorCategory`
- `message?: string`
- `recoveryActions: ConnectionRecoveryAction[]`
- `diagnostics?: string`
- `checkedAt?: string`

Rules:

- Diagnostics are always redacted.
- `ready` has no blocking category.
- `scan-denied` is not a runtime failure; it means the user declined scan and may still use manual path or BYOK.

## ConnectionErrorCategory

Allowed categories:

- `missing-executable`
- `invalid-path`
- `scan-denied`
- `secure-storage-unavailable`
- `authentication-failed`
- `quota-rate-limit`
- `unsupported-model`
- `incompatible-protocol`
- `provider-offline`
- `timeout`
- `unknown`

## ConnectionRecoveryAction

Allowed actions:

- `open-settings`
- `auto-scan`
- `edit-path`
- `choose-model`
- `test-again`
- `rescan`
- `use-byok`
- `delete-credential`
- `copy-diagnostics`

## ProviderRegistryEntry

Supported local agent or hosted model provider definition.

Fields:

- `id: LocalAgentProviderId | ApiProviderId`
- `displayName: string`
- `type: 'local-agent' | 'api-provider'`
- `knownCommands?: string[]`
- `knownInstallPaths?: string[]`
- `defaultModels?: string[]`
- `keyHint?: string`
- `capabilityDefaults: ConnectionCapabilities`

Rules:

- Registry entries contain no secrets.
- Adding a provider should not require changing 005 chat UI.

## ActiveConnectionSnapshot

Safe metadata returned to the app and 005.

Fields:

- `connectionId: string`
- `displayName: string`
- `type: 'local-agent' | 'manual-agent' | 'api-provider'`
- `provider: string`
- `modelOrAgent: string`
- `modelId?: string`
- `reasoningEffort?: string`
- `availableModels?: string[]`
- `availableReasoningEfforts?: string[]`
- `status: ConnectionStatus['state']`
- `capabilities: ConnectionCapabilities`
- `settingsTarget: 'execution-model'`

Rules:

- No secrets or raw local path contents.
- This snapshot is sufficient for the slide-page quick switcher and 005 to show status, decide whether to start a run, and open settings recovery.

## AgentAdapterRequest

Provider-neutral request sent by 005 through the active connection.

Fields:

- `runId: string`
- `prompt: string`
- `context: unknown`
- `workflows: Array<{ id: string; contentHash: string; instructions: string }>`
- `connectionId: string`
- `capabilities: ConnectionCapabilities`
- `signal: AbortSignal`

Rules:

- 005 assembles `context` and `workflows`.
- 006 resolves credentials, provider transport, local process execution, streaming, and cancellation.
- Adapter output is normalized before 005 proposal parsing and validation.

## SettingsModalState

Client UI state for the settings modal.

Fields:

- `open: boolean`
- `activeSection: 'execution-model' | 'media-providers' | 'connectors' | 'mcp-server' | 'external-mcp' | 'language' | 'appearance' | 'notifications'`
- `executionTab: 'local-cli' | 'byok'`
- `selectedConnectionId?: string`
- `scanState?: 'idle' | 'scanning' | 'cancelled' | 'completed' | 'failed'`
- `validationErrors: Record<string, string>`

Rules:

- The modal opens to `execution-model` from first-run slide library setup and 005 no-connection recovery.
- Form errors have accessible labels and are announced.
- Long-running scan/test actions must not trap focus or disable unrelated navigation.

## QuickConnectionSwitcherState

Client UI state for the slide-page top-right quick switcher.

Fields:

- `open: boolean`
- `activeMode: 'local-cli' | 'byok'`
- `selectedConnectionId?: string`
- `selectedModelId?: string`
- `selectedReasoningEffort?: string`
- `availableConnections: ActiveConnectionSnapshot[]`
- `availableModels: string[]`
- `availableReasoningEfforts: string[]`
- `pendingAction?: 'switch-connection' | 'switch-model' | 'switch-reasoning' | 'rescan-path'`
- `error?: ConnectionStatus`

Rules:

- The trigger is the slide-page top-right settings gear.
- The menu shows only safe display metadata.
- Switching mode, agent, model, or reasoning updates the same active snapshot consumed by 005 for subsequent runs.
- `Rescan PATH` is the only quick switcher action that may start local discovery.
- `Settings` opens the full modal to `Execution & model`; `Back to projects` navigates to the slide library.
