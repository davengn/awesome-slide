# Specification: Agent and Model Connection Options

## Status

Planning

## Product Vision Alignment

Awesome Slide should work with the user's preferred local agent or hosted model while keeping slide creation inside the app. This spec supplies the connection and settings layer consumed by `specs/005-agent-chat-ui`: users configure execution once from the slide library, slide page quick switcher, or chat recovery flow, then the in-app agent chat can create, update, comment, and theme slides without requiring a separate external agent chat.

## Problem Statement

In-app agent chat and prompt-based slide creation need a reliable way to discover, configure, validate, and switch between available agents and models. Without connection management, users face ambiguous failures, hidden configuration, and insecure credential handling. The first-run slide library experience is especially important: if no agent/model connection exists, users need an obvious settings path to auto-scan safe local locations or manually specify agent paths before prompt-based slide creation appears broken.

## Goals

- Provide connection options for auto-scanned local agents, manually specified agent paths, and API key based model providers.
- Show a first-run setup entry from the slide library page when no usable connection or scan preference exists, with choices for bounded auto-scan and manual agent path setup.
- Expose a connection management UI with validation, status indicators, testing, rescanning, switching, and error recovery.
- Add a slide-page quick switcher for fast agent, provider mode, model, and reasoning changes without leaving the slide workspace.
- Align the connection UI with the supplied Open Design-style settings modal reference: a modal settings shell, left navigation, `Execution & model` section, Local CLI/BYOK tabs, compact local-agent cards, and visible Test/Rescan controls.
- Store non-secret connection settings project-locally or user-locally as appropriate.
- Store API keys securely and avoid writing secrets into project files.
- Define adapter behavior so agent chat and slide creation can use a single active connection abstraction owned by this spec.

## Non-Goals

- Do not implement a full marketplace of agents or model providers in the first release.
- Do not require users to create a cloud account for local agent workflows.
- Do not store raw API keys in git-tracked project files.
- Do not scan the entire filesystem without user consent.
- Do not define provider-specific prompt optimization or slide-authoring workflow selection; `specs/005-agent-chat-ui` owns `packages/core/skills` workflow selection and proposal handling.
- Do not duplicate the entire Open Design settings product; the screenshot is a reference for modal anatomy and interaction clarity, adapted to Awesome Slide tokens.

## User Stories

- US1 (P1): As a first-time user opening the slide library, I want a clear setup modal or banner so I can choose auto-scan, specify an agent path, use BYOK, or do later before trying prompt-based slide creation.
- US2 (P1): As a local-first or power user, I want Awesome Slide to find compatible installed agents after I opt into bounded scanning, and I want to manually point it to an executable, command, or project path when needed.
- US3 (P1): As a hosted-model or security-conscious user, I want to connect an API key to a model provider, select a model, and keep credentials out of project files.
- US4 (P1): As a creator, I want to see and quickly change my selected agent, provider mode, model, and reasoning from the slide page before using agent chat, and I want 005 to use the same safe active connection metadata.
- US5 (P2): As a user who hits connection failures, I want categorized, redacted diagnostics and recovery actions without leaking secrets or blocking the settings UI.
- US6 (P2): As a user with multiple tools, I want to switch between connections per project or per session.

## Functional Requirements

- FR-001: The app must provide connection controls reachable from agent chat, project settings, slide page top-right quick switcher, slide library first-run setup, and failed-connection states.
- FR-002: The UI must list configured connections with name, type, status, last tested time, default model/agent, scope, and source.
- FR-003: Supported connection types must include auto-scanned local agent, manual agent path, and API key model provider.
- FR-004: Auto-scan must be opt-in and bounded to known safe locations, the current project, configured user directories, and known command locations.
- FR-005: Auto-scan must show discovered candidates before enabling them.
- FR-006: Manual agent path setup must validate path existence, executable permissions or runnable command, expected protocol support, and version when available.
- FR-007: API key setup must validate provider selection, credential presence, and authentication with a cheap privacy-conscious test request that sends no slide source; model listing is optional, manual model IDs remain allowed when listing is unavailable, and rejected models must return a normalized `unsupported-model` result.
- FR-008: API keys must be stored in OS credential storage where available, with documented fallback to environment variable references; when neither safe storage path is available, the app must report `secure-storage-unavailable` and must not persist raw keys in project or user-local plain files.
- FR-009: Project files may store provider name, model ID, connection alias, non-secret preferences, scan consent state, and active connection alias, but must not store raw credentials.
- FR-010: Users must be able to test a connection and see success, warning, or failure diagnostics.
- FR-011: Users must be able to select an active connection for the current session, optionally set a project default, and update supported model/reasoning preferences from the slide page quick switcher.
- FR-012: The app must expose connection status to the slide page quick switcher, agent chat, and prompt-based slide creation before requests start.
- FR-013: The adapter interface must support at least text prompt, contextual slide edit request, streamed response, cancellation, and structured edit proposal output.
- FR-014: The app must handle offline state, missing executable, invalid path, expired key, quota/rate limit, unsupported model, incompatible protocol, scan-denied, secure-storage-unavailable, and timeout errors.
- FR-015: Users must be able to remove a connection and delete stored credentials.
- FR-016: On first open of the slide library page, when no valid active connection and no setup preference exists, the app must surface a non-blocking setup prompt that opens the connection settings modal directly to `Execution & model`.
- FR-017: The first-run setup prompt must offer at least `Auto-scan local agents`, `Specify agent path`, `Use BYOK provider`, and `Do later`; choosing `Do later` records a dismissible local preference without enabling scans.
- FR-018: The settings modal must support user-approved scan directories in addition to known command locations, with add/remove controls and a clear indication that full-disk scanning is never performed.
- FR-019: The settings modal must provide a Rescan action that refreshes local-agent candidates without discarding manually configured agents or stored BYOK settings.
- FR-020: Local-agent candidates must distinguish installed, not installed, incompatible, and needs manual path states.
- FR-021: Settings must expose a route or modal entry that `specs/005-agent-chat-ui` can open from no-connection, degraded, failed, and offline chat states.
- FR-022: Connection metadata returned to 005 must include only safe display fields and capability flags; credential values, raw env values, and hidden path contents must never be returned to browser session history or chat context.
- FR-023: The runtime must normalize connection capabilities so 005 can determine whether a connection supports streaming, cancellation, structured proposals, and write-capable slide workflows.
- FR-024: The runtime must persist the active connection choice across browser reloads, and must detect when the persisted choice is no longer valid.
- FR-025: The slide page must include a top-right settings gear that opens a compact quick switcher without moving the Present and Share controls; the gear must remain visible as the rightmost toolbar control.
- FR-026: The quick switcher must show the current provider mode and summary line, allow switching between Local CLI and API/BYOK where configured, list available code agents, expose model and reasoning selectors when supported, provide `Rescan PATH`, open the full `Execution & model` settings modal, and offer `Back to projects`.
- FR-027: Quick switcher changes must update the same active connection snapshot used by 005, must not expose credentials or raw local paths, and must not start auto-scan except when the user explicitly chooses `Rescan PATH`.

## UX Requirements

- UX-001: Connection status must be visible but not noisy: ready, needs setup, testing, degraded, failed, offline, and scan denied.
- UX-002: Setup flows should use step-by-step validation with clear next actions.
- UX-003: API key inputs must support paste, show/hide, validation, and provider-specific key format hints without exposing full stored keys after save.
- UX-004: Auto-scan results must be reviewable before activation and must explain where each candidate was found.
- UX-005: Manual path fields must support direct path entry everywhere; a browse action is optional and appears only when the current runtime can return a local path safely, otherwise the UI uses direct entry as the fallback.
- UX-006: Switching active connections should be fast and reversible.
- UX-007: Error messages should distinguish user-fixable configuration problems from provider or runtime failures.
- UX-008: Settings must be usable at narrow widths and accessible by keyboard.
- UX-009: Destructive credential removal must require confirmation.
- UX-010: The connection UI should align visually with the Awesome Slide settings system: compact rows, clear status marks, and restrained accent color.
- UX-011: The primary settings experience must be a modal overlay similar to the supplied Open Design reference, with a left navigation rail and a content area focused on `Execution & model`.
- UX-012: The `Execution & model` content must use a Local CLI/BYOK segmented choice and local-agent cards that show provider icon, display name, version or `not installed`, selected state, and compatibility status.
- UX-013: The first-run slide library setup must avoid covering the library permanently; it may be a modal on initial entry or a prominent inline setup panel with a direct modal action, and it must be dismissible.
- UX-014: Auto-scan and manual path controls must use explicit labels, accessible descriptions, visible focus states, and error messages announced with `role="alert"` or equivalent.
- UX-015: The visual direction for implementation should be quiet, dense, developer-tool settings UI: no marketing hero layout, no decorative gradients, no emoji icons, no layout-shifting hover effects, and no low-contrast disabled text.
- UX-016: The slide page quick switcher should visually follow the supplied compact menu reference: status summary at top, Local CLI/API choices, `CODE AGENT` section, `MODEL` section, Rescan PATH, Settings, and Back to projects in a single scannable popover.
- UX-017: The quick switcher must use keyboard-accessible menu items and select controls, keep text inside the popover at 375px width, and avoid covering the settings gear trigger permanently.

## Technical Considerations

- A `ConnectionAdapter` abstraction should isolate 005 agent chat from provider-specific implementations.
- A likely settings split is project-local non-secret config plus user-local secure secret storage. Example non-secret fields: connection ID, display name, type, provider, model, agent path alias, default flag, scan consent state, approved scan directories, and last status.
- Secure storage should prefer OS keychain facilities. If not available, the app should guide users toward environment variable references and surface `secure-storage-unavailable` instead of writing raw keys to local plain files.
- Local agent auto-scan should avoid expensive full-disk traversal. It should check known CLI names, common install paths, configured directories, current project metadata, and user-approved custom directories.
- Manual path execution requires careful process management: timeouts, stdout/stderr capture, cancellation, protocol version checks, and redaction of command output before display.
- Provider adapters must normalize streamed text, structured proposals, tool or action calls if supported, errors, rate limits, and cancellation.
- The connection test request should be cheap and privacy-conscious.
- API provider support must be designed as a registry so future providers can be added without modifying agent chat UI.
- The settings modal can be implemented in `packages/core/src/app/components/settings/` and opened from the slide library, agent chat, failed-connection recovery, and a concrete project/settings entry in the app shell or slide management surface.
- The slide page quick switcher can be implemented in `packages/core/src/app/components/settings/QuickConnectionSwitcher.tsx` and wired into the right side of `packages/core/src/app/routes/slide.tsx` beside the existing Present/Share controls, with the gear as the rightmost trigger.
- The slide library first-run setup should read only safe status metadata on load, then open the settings modal if the user chooses setup. It must not start auto-scan until the user opts in.
- The active connection response consumed by 005 should include capability flags and settings route/modal target but no full credential or provider request payloads.
- Settings storage must be documented so users understand what is project-shared and what remains local.

## Acceptance Criteria

- AC-001: Users can open connection settings from agent chat, project settings, slide page quick switcher, slide library first-run setup, and failed-connection states.
- AC-002: Users can opt into scanning and review discovered local agents before enabling them.
- AC-003: Users can manually add an agent path and receive validation feedback.
- AC-004: Users can add an API key based provider without storing the raw key in project files.
- AC-005: Users can test, rescan, switch, set default, disable, and remove connections.
- AC-006: Agent chat can read the active connection and block requests with clear recovery actions when no valid connection exists.
- AC-007: Common failure modes produce categorized diagnostics.
- AC-008: Credential deletion removes the stored secret and leaves only non-secret history where appropriate.
- AC-009: Connection settings are keyboard accessible and responsive.
- AC-010: Security behavior is documented in user-facing settings help or docs.
- AC-011: On first slide library open with no active connection and no setup preference, users see setup choices for auto-scan, manual path, BYOK, and do later.
- AC-012: Choosing auto-scan starts only bounded, consented discovery and shows candidates before activation.
- AC-013: Choosing manual path opens the settings modal to a path entry state and does not run arbitrary commands before validation.
- AC-014: The settings modal visually follows the supplied Open Design settings anatomy while using Awesome Slide UI tokens and accessible controls.
- AC-015: `specs/005-agent-chat-ui` can use the same active connection metadata for run startup, connection status display, and recovery route/modal opening.
- AC-016: On the slide page, users can open the top-right gear quick switcher, change active Local CLI/API mode, agent, model, and reasoning where supported, and see the change reflected in the next 005 chat run.
- AC-017: The quick switcher keeps the settings gear at the right top corner, includes Settings and Back to projects actions, and does not leak credentials or raw local paths.

## Non-Functional Requirements

- NFR-001: Loading first-run connection status on the slide library page should complete within 200ms after the local dev server has finished initial compilation.
- NFR-002: Bounded auto-scan should return initial known-command results within 2 seconds and continue longer directory checks with cancellable progress.
- NFR-003: Manual path validation should return a visible success, warning, or failure within 1 second for existing local paths unless the agent protocol version check requires process startup.
- NFR-004: The settings modal must remain keyboard responsive while testing or scanning, and long-running scans must be cancellable.
- NFR-005: Diagnostics, logs, settings export, and chat bootstrap data must redact API keys, credential references, environment values, hidden-file contents, and raw command output that resembles secrets.
- NFR-006: The modal must be responsive at 375px, 768px, 1024px, and 1440px without clipped labels, hidden primary controls, or horizontal page scroll.
- NFR-007: Opening the slide page quick switcher from a warm slide page should use cached bootstrap/settings metadata and render within 150ms; applying an active connection or model change should show visible feedback within 500ms.

## Dependencies and Assumptions

- `specs/005-agent-chat-ui` consumes active connection metadata, capability flags, and a provider-neutral streaming adapter from this spec.
- 005 owns prompt context, `packages/core/skills` workflow selection, proposal validation, preview/apply, and audit behavior.
- The implementation reuses existing Awesome Slide React, Tailwind, shadcn/ui primitives, lucide-react icons, slide management route, and Vite middleware patterns in `packages/core`.
- Implementation changes to `@awesome-slide/core` require a patch changeset before completion.
- No new runtime dependency is planned for the settings modal or scan registry unless implementation proves the existing platform APIs are insufficient.
- The supplied screenshot is treated as interaction and layout reference, not a source of brand assets.

## Implementation Phases

### Phase 1: Connection Data Model and Adapter Contract

- Define connection config schema, secret references, status model, provider registry, scan preference model, capability flags, and adapter methods.
- Define local and project settings locations.
- Define threat model and redaction rules.

### Phase 2: Settings Modal and First-Run Entry

- Build the settings modal shell, left navigation, `Execution & model` content, Local CLI/BYOK segmented control, local-agent cards, Test and Rescan actions, and manual path setup state.
- Add first-run slide library setup prompt that opens the settings modal and records dismiss preferences.
- Add the slide-page top-right settings gear quick switcher shell with current status summary, Local CLI/API mode choices, Settings, and Back to projects actions.
- Add no-connection and failed-connection entry points from agent chat.

### Phase 3: Local Agent Discovery

- Implement opt-in bounded scan for known agents and user-approved directories.
- Present candidates with source path, detected type, version, status, and compatibility.
- Add activation, disable, and rescan flows.

### Phase 4: Provider and Runtime Integration

- Implement initial provider adapters and local process adapter.
- Normalize streaming, cancellation, structured proposals, capability flags, model/reasoning preference support, and error categories.
- Connect active connection selection to the slide page quick switcher, agent chat, and prompt-based slide creation.

### Phase 5: Security and Reliability Validation

- Test secret storage behavior, redaction, connection removal, timeout handling, scan cancellation, and offline failures.
- Verify settings persistence across app restarts and project switches.
- Document credential handling, scan boundaries, and fallback modes.
