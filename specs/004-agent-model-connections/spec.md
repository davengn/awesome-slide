# Specification: Agent and Model Connection Options

## Status

Planning

## Product Vision Alignment

Awesome Slide should work with the user's preferred agent or model setup. It should support local-first workflows for power users, manual agent path configuration for custom tools, and API key connections for hosted model providers, while keeping credentials secure and connection status understandable.

## Problem Statement

In-app agent chat and prompt-based slide creation require a reliable way to discover, configure, validate, and switch between available agents and models. Without connection management, users face ambiguous failures, hidden configuration, and insecure credential handling.

## Goals

- Provide connection options for auto-scanned local agents, manually specified agent paths, and API key based model providers.
- Expose a connection management UI with validation, status indicators, testing, switching, and error recovery.
- Store non-secret connection settings project-locally or user-locally as appropriate.
- Store API keys securely and avoid writing secrets into project files.
- Define adapter behavior so agent chat and slide creation can use a single active connection abstraction.

## Non-Goals

- Do not implement a full marketplace of agents or model providers in the first release.
- Do not require users to create a cloud account for local agent workflows.
- Do not store raw API keys in git-tracked project files.
- Do not scan the entire filesystem without user consent.
- Do not define provider-specific prompt optimization in this spec.

## User Stories

- As a local-first user, I want Awesome Slide to find compatible agents already installed on my computer.
- As a power user, I want to manually point Awesome Slide to an agent executable or project path.
- As a hosted-model user, I want to connect an API key to a model provider and select a model.
- As a creator, I want to see whether my selected connection is ready before using agent chat.
- As a security-conscious user, I want API keys handled by secure storage and never committed to the project.
- As a user with multiple tools, I want to switch between connections per project or per session.

## Functional Requirements

- FR-001: The app must provide a connection settings UI reachable from agent chat, project settings, and failed-connection states.
- FR-002: The UI must list configured connections with name, type, status, last tested time, default model/agent, and scope.
- FR-003: Supported connection types must include auto-scanned local agent, manual agent path, and API key model provider.
- FR-004: Auto-scan must be opt-in and bounded to known safe locations, the current project, configured user directories, and known command locations.
- FR-005: Auto-scan must show discovered candidates before enabling them.
- FR-006: Manual agent path setup must validate path existence, executable permissions or runnable command, expected protocol support, and version when available.
- FR-007: API key setup must validate provider, credential presence, model availability where possible, and request permissions through a test request.
- FR-008: API keys must be stored in OS credential storage where available, with documented fallback to environment variables or encrypted user-local storage.
- FR-009: Project files may store provider name, model ID, connection alias, and non-secret preferences, but must not store raw credentials.
- FR-010: Users must be able to test a connection and see success, warning, or failure diagnostics.
- FR-011: Users must be able to select an active connection for the current session and optionally set a project default.
- FR-012: The app must expose connection status to agent chat and prompt-based slide creation before requests start.
- FR-013: The adapter interface must support at least text prompt, contextual slide edit request, streamed response, cancellation, and structured edit proposal output.
- FR-014: The app must handle offline state, missing executable, invalid path, expired key, quota/rate limit, unsupported model, incompatible protocol, and timeout errors.
- FR-015: Users must be able to remove a connection and delete stored credentials.

## UX Requirements

- UX-001: Connection status must be visible but not noisy: ready, needs setup, testing, degraded, failed, and offline.
- UX-002: Setup flows should use step-by-step validation with clear next actions.
- UX-003: API key inputs must support paste, show/hide, validation, and provider-specific key format hints without exposing full stored keys after save.
- UX-004: Auto-scan results must be reviewable before activation and must explain where each candidate was found.
- UX-005: Manual path fields must support browsing where platform capabilities allow and direct path entry everywhere.
- UX-006: Switching active connections should be fast and reversible.
- UX-007: Error messages should distinguish user-fixable configuration problems from provider or runtime failures.
- UX-008: Settings must be usable at narrow widths and accessible by keyboard.
- UX-009: Destructive credential removal must require confirmation.
- UX-010: The connection UI should align visually with the Awesome Slide settings system: compact rows, clear status marks, and restrained accent color.

## Technical Considerations

- A `ConnectionAdapter` abstraction should isolate the UI and agent chat from provider-specific implementations.
- A likely settings split is project-local non-secret config plus user-local secure secret storage. Example non-secret fields: connection ID, display name, type, provider, model, agent path alias, default flag, and last status.
- Secure storage should prefer OS keychain facilities. If not available, the app should guide users toward environment variables and clearly mark less secure fallback modes.
- Local agent auto-scan should avoid expensive full-disk traversal. It should check known CLI names, common install paths, configured directories, current project metadata, and user-approved custom directories.
- Manual path execution requires careful process management: timeouts, stdout/stderr capture, cancellation, and protocol version checks.
- Provider adapters must normalize streamed text, structured proposals, tool or action calls if supported, errors, rate limits, and cancellation.
- The connection test request should be cheap and privacy-conscious.
- API provider support must be designed as a registry so future providers can be added without modifying agent chat UI.
- Settings storage must be documented so users understand what is project-shared and what remains local.

## Acceptance Criteria

- AC-001: Users can open connection settings and see all configured connections with status.
- AC-002: Users can opt into scanning and review discovered local agents before enabling them.
- AC-003: Users can manually add an agent path and receive validation feedback.
- AC-004: Users can add an API key based provider without storing the raw key in project files.
- AC-005: Users can test, switch, set default, disable, and remove connections.
- AC-006: Agent chat can read the active connection and block requests with clear recovery actions when no valid connection exists.
- AC-007: Common failure modes produce categorized diagnostics.
- AC-008: Credential deletion removes the stored secret and leaves only non-secret history where appropriate.
- AC-009: Connection settings are keyboard accessible and responsive.
- AC-010: Security behavior is documented in user-facing settings help or docs.

## Implementation Phases

### Phase 1: Connection Data Model and Adapter Contract

- Define connection config schema, secret references, status model, provider registry, and adapter methods.
- Define local and project settings locations.
- Define threat model and redaction rules.

### Phase 2: Settings UI and Validation

- Build connection list, add connection flows, status indicators, and test connection action.
- Implement manual path validation and API key entry behavior.
- Add no-connection and failed-connection entry points from agent chat.

### Phase 3: Local Agent Discovery

- Implement opt-in bounded scan for known agents and user-approved directories.
- Present candidates with source path, detected type, version, and compatibility.
- Add activation and disable flows.

### Phase 4: Provider and Runtime Integration

- Implement initial provider adapters and local process adapter.
- Normalize streaming, cancellation, structured proposals, and error categories.
- Connect active connection selection to agent chat and prompt-based slide creation.

### Phase 5: Security and Reliability Validation

- Test secret storage behavior, redaction, connection removal, timeout handling, and offline failures.
- Verify settings persistence across app restarts and project switches.
- Document credential handling and fallback modes.

